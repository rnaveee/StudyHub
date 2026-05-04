"use server";

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { upsertChatroom, upsertChatroomMember, upsertCourse, upsertCurrentUser } from "../utils/chatroomHelper";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

export async function createChatroom(formData: FormData){
    const profile = await upsertCurrentUser();
    const supabaseAdmin = getSupabaseAdmin();

    const classID = String(formData.get("classId") ?? "").trim();
    const className = String(formData.get("className") ?? "").trim();
    const professor = String(formData.get("professor") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const finalExamDate = String(formData.get("finalExamDate") ?? "").trim() || null;

    if (!classID || !className || !school) {
    redirect("/dashboard?error=Missing%20required%20class%20fields.");
    }


    const { data: existingCourse, error: existingCourseError } = await supabaseAdmin
        .from("courses")
        .select("id")
        .eq("class_id", classID)
        .eq("school", school)
        .maybeSingle();

    if (existingCourseError) {
        redirect("/dashboard?error=Unable%20to%20check%20for%20existing%20chatrooms.");
    }

    if (existingCourse) {
        redirect("/dashboard?error=A%20chatroom%20already%20exists%20for%20that%20class%20and%20school.%20Try%20searching%20for%20it!");
    }

    const course = await upsertCourse(
        classID,
        className,
        professor,
        school,
        finalExamDate,
        profile.id
    )

    const chatroom = await upsertChatroom(course.id, profile.id);
    const member = await upsertChatroomMember(chatroom.id, profile.id);

    revalidatePath("/dashboard");
    redirect(`/chatrooms/${chatroom.id}`);
}