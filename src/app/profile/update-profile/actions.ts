"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { upsertCurrentUser } from "../../utils/chatroomHelper";

export async function updateProfile(formData: FormData) {
    const profile = await upsertCurrentUser();
    const supabaseAdmin = getSupabaseAdmin();

    const username = String(formData.get("username") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const major = String(formData.get("major") ?? "").trim();
    const year = Number(formData.get("year") ?? 0);
    const bio = String(formData.get("bio") ?? "").trim();

    const { error } = await supabaseAdmin
        .from("profiles")
        .update({
            school: school || null,
            major: major || null,
            username: username || null,
            year: Number.isFinite(year) ? year : 0,
            bio: bio || null,
        })
        .eq("id", profile.id);

    if (error) {
        throw error;
    }

    revalidatePath("/profile");
    redirect("/profile");
}
