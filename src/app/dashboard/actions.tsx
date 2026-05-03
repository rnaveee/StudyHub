"use server";

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

export async function createChatroom(formData: FormData){
    const profile = await upsertCurrentUser();

    const classID = String(formData.get("classId") ?? "").trim();
    const className = String(formData.get("className") ?? "").trim();
    const professor = String(formData.get("professor") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const finalExamDate = String(formData.get("finalsDate") ?? "").trim() || null;

    if (!classID || !className || !school) {
        throw new Error("Missing required class fields.");
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

export async function upsertChatroomMember(chatroomID: string, userID: string){
    const supabaseAdmin = getSupabaseAdmin();

    const { data: member, error } = await supabaseAdmin
        .from("chatroom_members")
        .upsert({
            chatroom_id: chatroomID,
            user_id: userID,
        },
        { onConflict: "chatroom_id,user_id" })
        .select()
        .single();

    if(error){
        throw error;
    }

    return member;
}

export async function upsertChatroom(courseID: string, createdBy: string){
    const supabaseAdmin = getSupabaseAdmin();

    const { data: chatroom, error } = await supabaseAdmin
        .from("chatrooms")
        .upsert({
            course_id: courseID,
            created_by: createdBy,
        },
        { onConflict: "course_id"})
        .select()
        .single();
    
    if(error){
        throw error;
    }

    return chatroom;
}

export async function upsertCourse(
    classID: string,
    className: string,
    professor: string | null,
    school: string,
    finalExamDate: string | null,
    createdBy: string,
    ){
        const supabaseAdmin = getSupabaseAdmin();
    
        const { data: course, error } = await supabaseAdmin
            .from("courses")
            .upsert({
                class_id: classID,
                class_name: className,
                professor: professor,
                school: school,
                final_exam_date: finalExamDate,
                created_by: createdBy,
            },
            { onConflict: "school,class_id", })
            .select()
            .single();
        
        if(error){
            throw error;
        }
        return course;
    
    
}

export async function upsertCurrentUser(){
    const supabaseAdmin = getSupabaseAdmin();
    const user = await currentUser();

    if(!user){
        redirect("/signin");
    }

    const { data, error } = await supabaseAdmin
        .from("profiles")
        .upsert({
            id: user.id,
            username: user.username ?? user.fullName,
            email: user.primaryEmailAddress?.emailAddress ?? null,
            school: 'TESTSCHOOL',
            major: 'TESTMAJOR',
            
        },
        { onConflict: "id" }
    )
    .select()
    .single();

    if (error) {
        throw error;
    }

    return data;
}
