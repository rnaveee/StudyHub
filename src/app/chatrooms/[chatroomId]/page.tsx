export default async function ChatroomPage({
  params,
}: {
  params: Promise<{ chatroomId: string }>;
}) {
  const { chatroomId } = await params;

  return (
    <section className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-purple-700">
              {chatroomId}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Chatroom unavailable
            </h1>
            <p className="mt-2 text-slate-600">This room is not available right now.</p>
            <p className="text-sm font-semibold text-slate-500">StudyHub</p>
          </div>
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            0 joined users
          </span>
        </div>
      </div>
    </section>
  );
}
