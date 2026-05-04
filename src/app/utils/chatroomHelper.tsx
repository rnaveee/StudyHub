import { currentUser } from "@clerk/nextjs/server"
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { redirect } from "next/navigation";


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

    const { data: existingProfile, error: selectError } = await supabaseAdmin
        .from("profiles")
        .select()
        .eq("id", user.id)
        .maybeSingle();

    if (selectError) {
        throw selectError;
    }

    if (existingProfile) {
        return existingProfile;
    }

    const { data, error } = await supabaseAdmin
        .from("profiles")
        .insert({
            id: user.id,
            username: user.username ?? user.fullName,
            email: user.primaryEmailAddress?.emailAddress ?? null,
            school: 'Not set yet.',
            major: 'Not set yet.',
            year: 0,
            
        })
    .select()
    .single();

    if (error) {
        throw error;
    }

    return data;
}
