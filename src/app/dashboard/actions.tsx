"use server";

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSupabaseAdmin } from "../lib/supabaseAdmin"

export async function createChatroom(formData: FormData){
    const { userId } = await auth();

    if(!userId){
        redirect("/signin");
    }

    const supabaseAdmin = getSupabaseAdmin();

    const classId = String(formData.get("classId") ?? "").trim();
    const className = String(formData.get("className") ?? "").trim();
    const professor = String(formData.get("professor") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const finalsDate = String(formData.get("finalsDate") ?? "").trim();

    if (!classId || !className || !professor || !school) {
        throw new Error("Missing required class fields.");
    }

    const { data: existingProfiles, error: profileLookupError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", userId)
        .limit(1);

    if(profileLookupError){
        throw new Error(profileLookupError.message);
    }

    if(!existingProfiles?.length){
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({
                clerk_user_id: userId,
            });

        if(profileError){
            throw new Error(profileError.message);
        }
    }

    const { data: course, error: courseError } = await supabaseAdmin
        .from("courses")
        .insert({
            class_id: classId,
            class_name: className,
            professor: professor,
            school: school,
            final_exam_date: finalsDate || null,
            created_by: userId,
        })
        .select("id")
        .single();

    if(courseError || !course){
        throw new Error(courseError?.message ?? "Failed to create course.");
    }

    const { data: chatroom, error: chatroomError } = await supabaseAdmin
        .from("chatrooms")
        .insert({
            course_id: course.id,
            created_by: userId,
            ongoing: true,
            joined_users: 1,
        })
        .select("id, joined_users")
        .single();
    
    if(chatroomError || !chatroom){
        await supabaseAdmin.from("courses").delete().eq("id", course.id);
        throw new Error(chatroomError?.message ?? "Failed to create chatroom.");
    }

    const { error: memberError } = await supabaseAdmin
        .from("chatroom_members")
        .insert({
            chatroom_id: chatroom.id,
            clerk_user_id: userId,
        })

    if(memberError){
        await supabaseAdmin.from("chatrooms").delete().eq("id", chatroom.id);
        await supabaseAdmin.from("courses").delete().eq("id", course.id);
        throw new Error(memberError.message);
    }
    
    revalidatePath("/dashboard");
    redirect(`/chatrooms/${chatroom.id}`);

}
