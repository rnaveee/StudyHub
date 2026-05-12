"use client";

import { useEffect, useState } from "react";
import { sendMessage } from "../chatrooms/[chatroomId]/actions";
import type { Message } from "../data";
import UserMessage from "./UserMessage";
import OtherUserMessage from "./OtherUserMessage";
import { supabase } from "../lib/supabase";

type ChatMessagesProps = {
    chatroomId: string;
    currentUserId: string;
    currentUserAvatarUrl?: string | null;
    initialMessages: Message[];
};

export default function ChatMessages({ chatroomId, currentUserId, initialMessages, currentUserAvatarUrl }: ChatMessagesProps){
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const channel = supabase
            .channel(`chatroom:${chatroomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `chatroom_id=eq.${chatroomId}`,
            },
            async (payload) => {
                const newMessage = payload.new as Message;

                if(newMessage.user_id === currentUserId){
                    return;
                }

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("avatar_url")
                    .eq("id", newMessage.user_id)
                    .maybeSingle();

                const messageWithProfile: Message = {
                    ...newMessage,
                    profiles: profile,
                };

                setMessages((current) => {
                    const alreadyExists = current.some(
                        (message) => message.id === messageWithProfile.id
                    );

                    if(alreadyExists){
                        return current;
                    }

                    return [...current, messageWithProfile];
                });
            }
        )
        .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }

    }, [chatroomId, currentUserId]);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const body = text.trim();

        if(!body){
            return;
        }

        const formData = new FormData();
        formData.set("message", body);

        const tempMessage: Message = {
            id: crypto.randomUUID(),
            user_id: currentUserId,
            body: body,
            created_at: new Date().toISOString(),
            profiles: {
                avatar_url: currentUserAvatarUrl ?? null,
            },
        };

        setMessages((current) => [...current, tempMessage]);
        setText("");
        setError(null);

        sendMessage(chatroomId, formData).catch((err) => {
            console.error("sendMessage failed:", err);
            setMessages((current) => current.filter((m) => m.id !== tempMessage.id));
            setText(body);
            setError("Couldn't send your message. Please try again.");
        });
    }

    return(
        <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-200 p-3 flex flex-col">
            <div className="flex flex-col gap-1 mb-2">
              {messages?.map((message) => {
                const profile = Array.isArray(message.profiles)
                  ? message.profiles[0]
                  : message.profiles;
                const avatarUrl = profile?.avatar_url ?? null;

                return message.user_id === currentUserId ? (
                  <UserMessage message={message.body ?? ""} key={message.id} avatarUrl={avatarUrl} />
                ) : (
                  <OtherUserMessage message={message.body ?? ""} key={message.id} avatarUrl={avatarUrl} />
                );
              })}
              
            </div>
            {error && (
              <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <input
              type="text"
              name="message"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Message.."
              className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-purple-400 focus:ring-2 bg-slate-300 focus:ring-purple-100"
              />
            </form>
        </div>
    );
}
