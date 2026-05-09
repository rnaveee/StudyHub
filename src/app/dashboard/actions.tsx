"use server";

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { upsertChatroom, upsertChatroomMember, upsertCourse, upsertCurrentUser } from "../utils/uploadHelpers";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import type { SearchResult } from "../data";

export type CreateChatroomState = { error: string | null };

export async function createChatroom(
    prevState: CreateChatroomState,
    formData: FormData
): Promise<CreateChatroomState> {
    const profile = await upsertCurrentUser();
    const supabaseAdmin = getSupabaseAdmin();

    const classID = String(formData.get("classId") ?? "").trim();
    const className = String(formData.get("className") ?? "").trim();
    const professor = String(formData.get("professor") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const finalExamDate = String(formData.get("finalExamDate") ?? "").trim() || null;

    if (!classID || !className || !school) {
        return { error: "Missing required class fields." };
    }

    const { data: existingCourse, error: existingCourseError } = await supabaseAdmin
        .from("courses")
        .select("id")
        .eq("class_id", classID)
        .eq("school", school)
        .maybeSingle();

    if (existingCourseError) {
        return { error: "Unable to check for existing chatrooms." };
    }

    if (existingCourse) {
        return { error: "A chatroom already exists for that class and school. Try searching for it!" };
    }

    let chatroomId: string;
    try {
        const course = await upsertCourse(
            classID,
            className,
            professor,
            school,
            finalExamDate,
            profile.id
        );
        const chatroom = await upsertChatroom(course.id, profile.id);
        await upsertChatroomMember(chatroom.id, profile.id);
        chatroomId = chatroom.id;
    } catch (err) {
        console.error("createChatroom failed:", err);
        return { error: "Couldn't create chatroom. Please try again." };
    }

    revalidatePath("/dashboard");
    redirect(`/chatrooms/${chatroomId}`);
}

export async function joinChatroom(formData: FormData) {
    const chatroomId = String(formData.get("chatroomId") ?? "").trim();

    if (!chatroomId) {
        redirect("/dashboard?error=Missing%20chatroom%20id.");
    }

    const profile = await upsertCurrentUser();

    try {
        await upsertChatroomMember(chatroomId, profile.id);
    } catch (err) {
        console.error("joinChatroom failed:", err);
        redirect("/dashboard?error=Couldn%27t%20join%20chatroom.%20Please%20try%20again.");
    }

    revalidatePath("/dashboard");
    redirect(`/chatrooms/${chatroomId}`);
}

export async function searchChatrooms(formData: FormData): Promise<SearchResult[]> {
    const query = String(formData.get("query") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const normalizedQuery = query.toLowerCase();
    const normalizedSchool = school.toLowerCase();

    if(normalizedQuery === "" && normalizedSchool === ""){
        return [];
    }

    const profile = await upsertCurrentUser();
    const supabaseAdmin = getSupabaseAdmin();

    let q = supabaseAdmin
        .from("chatrooms")
        .select(`
            id,
            ongoing,
            chatroom_members(
                user_id
            ),
            courses!inner(
                id,
                class_id,
                class_name,
                professor,
                school,
                created_by
            )
        `)
        .limit(20);
    
    if(normalizedQuery){
        q = q.or(
            `class_id.ilike.%${normalizedQuery}%,class_name.ilike.%${normalizedQuery}%`,
            { foreignTable: "courses" }
        );
    }
    if(normalizedSchool){
        q = q.ilike("courses.school", `%${normalizedSchool}%`)
    }
    
    const {data: chatrooms, error: queryError} = await q;

    if (queryError) {
        throw queryError;
    }

    return chatrooms.map((chatroom) => {
        const course = Array.isArray(chatroom.courses)
            ? chatroom.courses[0]
            : chatroom.courses;

        if (!course) {
            throw new Error("Filtered chatroom unexpectedly has no course.");
        }

        const joinedUsers = chatroom.chatroom_members?.length ?? 0;

        const isJoined =
            chatroom.chatroom_members?.some(
                (member) => member.user_id === profile.id
            ) ?? false;

        return {
            chatroomId: chatroom.id,
            classId: course.class_id,
            className: course.class_name,
            professor: course.professor,
            school: course.school,
            joinedUsers,
            isJoined,
        };
    });
}