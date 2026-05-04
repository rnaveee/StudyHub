import Link from "next/link";
import type { Chatroom } from "../data";

export type ChatroomCardProps = {
  chatroom: Chatroom;
};

export default function ChatroomCard({ chatroom }: ChatroomCardProps) {


  return (
    <Link
      href={`/chatrooms/${chatroom.id}`}
      className="block w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:bg-purple-50"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-purple-50 px-2.5 py-1 text-sm font-bold uppercase tracking-wide text-purple-700">
            {chatroom.course.classID}
          </span>
          <span className="rounded-md border border-red-200 px-2.5 py-1 text-sm font-semibold text-red-600">
            {chatroom.course.school}
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
          {chatroom.joinedUsers} joined users
        </span>
      </div>
      <div className="text-xl font-bold text-slate-950">{chatroom.course.className}</div>
      <div className="text-md text-slate-600">{chatroom.course.professor}</div>
    </Link>
  );
}
