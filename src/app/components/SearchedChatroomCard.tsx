import { joinChatroom } from "../dashboard/actions";

export type SearchedChatroomCardProps = {
    chatroomId: string;
    classId: string;
    className: string;
    professor: string | null;
    school: {
        id: string;
        name: string;
        color: string;
    };
    joinedUsers: number;
    isJoined: boolean;
}

export default function SearchedChatroomCard({
    chatroomId,
    classId,
    className,
    professor,
    school,
    joinedUsers,
    isJoined,
}: SearchedChatroomCardProps){
    return(
        <div className="flex w-full flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-purple-50 px-2.5 py-1 text-sm font-bold uppercase tracking-wide text-purple-700">
                        {classId}
                    </span>
                    <span
                        className="rounded-md border px-2.5 py-1 text-sm font-semibold"
                        style={{ borderColor: school.color, color: school.color }}
                    >
                        {school.name}
                    </span>
                    <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        {joinedUsers} joined users
                    </span>
                </div>
                <h3 className="truncate text-lg font-bold text-slate-950">
                    {className}
                </h3>
                <p className="truncate text-sm font-medium text-slate-600">
                    {professor}
                </p>
            </div>

            <form action={joinChatroom} className="shrink-0">
                <input type="hidden" name="chatroomId" value={chatroomId} />
                <button
                    type="submit"
                    className="h-10 rounded-md bg-purple-600 px-4 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={isJoined}
                >
                    {isJoined ? "Joined" : "Join"}
                </button>
            </form>
        </div>
    );
}
