
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { upsertCurrentUser } from "../../utils/uploadHelpers";
import ChatMessages from "../../components/ChatMessages";

export default async function ChatroomPage({params,}: {params: Promise<{ chatroomId: string }>; }) {
  const { chatroomId } = await params;

  const supabaseAdmin = getSupabaseAdmin();
  const user = await upsertCurrentUser();

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("chatroom_members")
    .select("chatroom_id, user_id")
    .eq("chatroom_id", chatroomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    redirect("/dashboard?error=You%20are%20not%20a%20member%20of%20this%20chatroom.");
  }

  const { data: chatroom, error: chatroomError } = await supabaseAdmin
    .from("chatrooms")
    .select(`
        id,
        ongoing,
        chatroom_members(
          user_id
        ),
        courses(
          id,
          class_id,
          class_name,
          professor,
          school,
          final_exam_date
        )
      `)
      .eq("id", chatroomId)
      .single();
  
  if (chatroomError || !chatroom) {
    redirect("/dashboard?error=Chatroom%20not%20found.");
  }
  
  const course = Array.isArray(chatroom.courses)
  ? chatroom.courses[0]
  : chatroom.courses;

  if (!course) {
    redirect("/dashboard?error=Chatroom%20course%20error.");
  }

  const { data: messages, error: messageError } = await supabaseAdmin
    .from("messages")
    .select(`id, 
      user_id, 
      body, 
      created_at,
      profiles (
        avatar_url
      )
    `)
    .eq("chatroom_id", chatroomId)
    .order("created_at", { ascending: false })
    .limit(50)
  if(messageError){
    redirect("/dashboard?error=Chatroom%20error.");
  }

  const orderedMessages = [...(messages ?? [])].reverse();

  const chatName = course.class_name ?? "New groupchat";
  const classID = course.class_id ?? "Unknown class";
  const joinedUsers = chatroom.chatroom_members?.length ?? 0;

  return (
    <section className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex gap-3 items-center">
              <p className="text-lg font-bold uppercase tracking-wide text-purple-700">
                {classID}
              </p>
              <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                SFU
              </div>
            </div>
            <h1 className="mt-1 text-2xl sm:text-lg font-bold tracking-tight text-slate-950">
              {chatName}
            </h1>
          </div>
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            {joinedUsers} joined users
          </span>
        </div>
          <ChatMessages chatroomId={chatroomId} currentUserId={user.id} initialMessages={orderedMessages} currentUserAvatarUrl={user.avatar_url}/>
      </div>
    </section>
  );
}
