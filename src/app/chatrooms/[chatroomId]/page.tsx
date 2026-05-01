import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

type CourseRow = {
  class_id: string;
  class_name: string;
  professor: string;
  school: string;
  final_exam_date: string | null;
};

type ChatroomRow = {
  id: string;
  joined_users: number;
  ongoing: boolean;
  courses: CourseRow | CourseRow[] | null;
};

type ChatroomMembershipRow = {
  chatrooms: ChatroomRow | ChatroomRow[] | null;
};

export default async function ChatroomPage({
  params,
}: {
  params: Promise<{ chatroomId: string }>;
}) {
  const { chatroomId } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("chatroom_members")
    .select(`
      chatrooms (
        id,
        joined_users,
        ongoing,
        courses (
          class_id,
          class_name,
          professor,
          school,
          final_exam_date
        )
      )
    `)
    .eq("chatroom_id", chatroomId)
    .eq("clerk_user_id", userId)
    .single();

  if (error || !data) {
    notFound();
  }

  const membership = data as unknown as ChatroomMembershipRow;
  const chatroom = Array.isArray(membership.chatrooms)
    ? membership.chatrooms[0]
    : membership.chatrooms;

  if (!chatroom) {
    notFound();
  }

  const course = Array.isArray(chatroom.courses)
    ? chatroom.courses[0]
    : chatroom.courses;

  if (!course) {
    notFound();
  }

  return (
    <section className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-purple-700">
              {course.class_id}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {course.class_name}
            </h1>
            <p className="mt-2 text-slate-600">{course.professor}</p>
            <p className="text-sm font-semibold text-slate-500">{course.school}</p>
          </div>
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            {chatroom.joined_users} joined users
          </span>
        </div>

        {course.final_exam_date ? (
          <p className="mt-4 text-sm font-medium text-slate-600">
            Final exam: {course.final_exam_date}
          </p>
        ) : null}
      </div>
    </section>
  );
}
