
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

export default async function ChatroomPage({params,}: {params: Promise<{ chatroomId: string }>; }) {
  const { chatroomId } = await params;

  const supabaseAdmin = getSupabaseAdmin();

  const { data: chatroom, error } = await supabaseAdmin
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
  
  if (error || !chatroom) {
    redirect("/dashboard?error=Chatroom%20not%20found.");
  }
  
  const course = Array.isArray(chatroom.courses)
  ? chatroom.courses[0]
  : chatroom.courses;

  if (!course) {
    redirect("/dashboard?error=Chatroom%20course%20error.");
  }

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
        <div className="mt-4 min-h-24 rounded-md border border-dashed border-slate-200 bg-slate-50 p-3">
            <div>message</div>
            <div>message</div>
            <form>
              <input
              type="text"
              placeholder="Message.."
              className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-purple-400 focus:ring-2 bg-slate-300 focus:ring-purple-100"
              />
            </form>
        </div>
      </div>
    </section>
  );
}
