import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import { upsertCurrentUser } from "../dashboard/actions";

function getInitials(name: string | null) {
    if (!name) {
        return "SH";
    }

    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export default async function ProfilePage() {
    const user = await currentUser();
    const profile = await upsertCurrentUser();

    const avatarUrl = user?.imageUrl;

    const username = profile.username ?? "StudyHub student";
    const initials = getInitials(username);
    const bio = profile.bio;
    const memberSince = profile.created_at
        ? new Intl.DateTimeFormat("en", {
            month: "long",
            day: "numeric",
            year: "numeric",
        }).format(new Date(profile.created_at))
        : "Today";

    const profileRows = [
        { label: "Email", value: profile.email ?? "No email connected" },
        { label: "School", value: profile.school ?? "Not set yet" },
        { label: "Major", value: profile.major ?? "Not set yet" },
        { label: "Member since", value: memberSince },
    ];

    return(
        <section className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt={`${username} avatar`}
                                width={80}
                                height={80}
                                priority
                                className="h-20 w-20 shrink-0 rounded-full object-cover"
                            />
                            ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-purple-700 text-2xl font-bold text-white">
                                {initials}
                            </div>
                            )}

                            <div>
                                <p className="text-sm font-bold uppercase tracking-wide text-purple-700">
                                    Profile
                                </p>
                                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                                    {username}
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    {bio}
                                </p>
                            </div>
                        </div>

                        <span className="w-fit rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                            Active student
                        </span>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold tracking-tight text-slate-950">
                            Account information
                        </h2>

                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                            {profileRows.map((row) => (
                                <div
                                    key={row.label}
                                    className="rounded-md border border-slate-200 bg-slate-50 p-3"
                                >
                                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        {row.label}
                                    </dt>
                                    <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                                        {row.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold tracking-tight text-slate-950">
                            Study activity
                        </h2>

                        <div className="mt-4 grid gap-3">
                            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Joined rooms
                                </p>
                                <p className="mt-1 text-2xl font-bold text-slate-950">WORK ON THIS</p>
                            </div>

                            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Created rooms
                                </p>
                                <p className="mt-1 text-2xl font-bold text-slate-950">WORK ON THIS</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}
