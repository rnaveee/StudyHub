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
    school: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
    major: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
    bio: z.preprocess(emptyToUndef, z.string().trim().max(500).optional()),
    year: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(8).optional()),
});

export async function updateProfile(formData: FormData) {
    const parsed = ProfileUpdateSchema.safeParse({
        username: formData.get("username"),
        school: formData.get("school"),
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

    const { username, school, major, bio, year } = parsed.data;

    const profile = await upsertCurrentUser();

    const { error } = await getSupabaseAdmin()
        .from("profiles")
        .update({
            username: username ?? null,
            school: school ?? null,
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
