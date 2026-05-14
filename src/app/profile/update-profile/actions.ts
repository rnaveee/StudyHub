"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { upsertCurrentUser } from "../../utils/uploadHelpers";

const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

const ProfileUpdateSchema = z.object({
    username: z.preprocess(emptyToUndef, z.string().trim().min(3).max(30).optional()),
    schoolName: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
    major: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
    bio: z.preprocess(emptyToUndef, z.string().trim().max(500).optional()),
    year: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(8).optional()),
});

export async function updateProfile(formData: FormData) {
    const parsed = ProfileUpdateSchema.safeParse({
        username: formData.get("username"),
        schoolName: formData.get("schoolName"),
        major: formData.get("major"),
        bio: formData.get("bio"),
        year: formData.get("year"),
    });

    if (!parsed.success) {
        const first = parsed.error.issues[0];
        const field = first.path.join(".") || "input";
        const message = `${field}: ${first.message}`;
        redirect(`/profile/update-profile?error=${encodeURIComponent(message)}`);
    }

    const { username, schoolName, major, bio, year } = parsed.data;

    const supabaseAdmin = getSupabaseAdmin();

    let schoolId: string | null = null;
    if (schoolName) {
        const { data: school, error: schoolError } = await supabaseAdmin
            .from("schools")
            .select("id")
            .ilike("name", schoolName)
            .maybeSingle();

        if (schoolError) {
            throw schoolError;
        }

        if (!school) {
            redirect(
                `/profile/update-profile?error=${encodeURIComponent(
                    "Pick a school from the suggestions."
                )}`
            );
        }

        schoolId = school.id;
    }

    const profile = await upsertCurrentUser();

    const { error } = await supabaseAdmin
        .from("profiles")
        .update({
            username: username ?? null,
            school_id: schoolId,
            major: major ?? null,
            bio: bio ?? null,
            year: year ?? null,
        })
        .eq("id", profile.id);

    if (error) {
        throw error;
    }

    revalidatePath("/profile");
    redirect("/profile");
}
