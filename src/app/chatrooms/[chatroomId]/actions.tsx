"use server";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";


export default async function sendMessage(chatroomId: string, formData: FormData){
    const supabaseAdmin = getSupabaseAdmin();
    const { userId } = await auth();

    if(!userId){
        throw new Error("You must be signed in to send messages.");
    }

    const message = String(formData.get("message") ?? "").trim();

    if(!message){
        return;
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
        .from("chatroom_members")
        .select("user_id")
        .eq("chatroom_id", chatroomId)
        .eq("user_id", userId)
        .maybeSingle();

    if(membershipError){
        throw membershipError;
    }

    if(!membership){
        throw new Error("You are not a member of this chatroom.");
    }

    const { error } = await supabaseAdmin
        .from("messages")
        .insert({
            chatroom_id: chatroomId,
            user_id: userId,
            body: message
        })
    
    if(error){
        throw error;
    }
}
