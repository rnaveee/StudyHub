"use server";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { z } from "zod";

const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

const messageSchema = z.object({
    chatroomId: z.uuid(),
    message: z.preprocess(emptyToUndef, z.string().trim().max(2000))
});

export async function sendMessage(chatroomId: string, formData: FormData){
    const parsed = messageSchema.safeParse({
        chatroomId: chatroomId,
        message: formData.get("message"),
    });

    if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(`${first.path.join(".") || "input"}: ${first.message}`);
    }

    const { message } = parsed.data;

    const { userId } = await auth();
    if(!userId){
        throw new Error("You must be signed in to send messages.");
    }

    const supabaseAdmin = getSupabaseAdmin();

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
