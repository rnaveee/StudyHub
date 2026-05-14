import { connection } from "next/server";
import ChatroomCard from "../components/ChatroomCard";
import ClassSearch from "../components/ClassSearch";
import CreateClass from "../components/CreateClass";
import type { Chatroom } from "../data";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import ErrorMsg from "../components/ErrorMsg";
import { redirect } from "next/navigation";


export default async function Dashboard({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}){
    await connection();
    const user = await currentUser();
    const errorMessage = (await searchParams).error;

    if(!user){
        redirect("/signin");
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: memberships, error: membershipsError } = await supabaseAdmin
        .from("chatroom_members")
        .select("chatroom_id")
        .eq("user_id", user.id);

    if (membershipsError) {
        throw membershipsError;
    }

    const { data: schools, error: schoolsError } = await supabaseAdmin
        .from("schools")
        .select("id, name")
        .order("name");

    if (schoolsError) {
        throw schoolsError;
    }

    const joinedChatroomIds = memberships.map((membership) => membership.chatroom_id);

    const { data, error } = await supabaseAdmin
        .from("chatrooms")
        .select(`
            id,
            ongoing,
            chatroom_members (
                user_id
            ),
            courses (
                id,
                class_id,
                class_name,
                professor,
                final_exam_date,
                schools (
                    id,
                    name,
                    color
                )
            )
        `)
    .in("id", joinedChatroomIds);

    if(error){
        throw error;
    }

    const chatrooms: Chatroom[] = data
        .map((row) => {
            const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;

            if (!course) {
                return null;
            }

            const schoolRow = Array.isArray(course.schools)
                ? course.schools[0]
                : course.schools;

            if (!schoolRow) {
                return null;
            }

            return {
                id: row.id,
                joinedUsers: row.chatroom_members?.length ?? 0,
                onGoing: row.ongoing,
                course: {
                    id: course.id,
                    classID: course.class_id,
                    className: course.class_name,
                    professor: course.professor ?? "Professor not listed",
                    school: {
                        id: schoolRow.id,
                        name: schoolRow.name,
                        color: schoolRow.color,
                    },
                    finalsDate: course.final_exam_date ?? "",
                },
            };
        })
        .filter((chatroom): chatroom is Chatroom => chatroom !== null);

    return(
        <section className="px-4 py-6 sm:px-6 lg:px-8">
            <ErrorMsg message={errorMessage} />
            <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-2xl">Welcome, {user.firstName}</h1>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="flex w-full max-w-2xl flex-col gap-3">
                        {chatrooms.map((chatroom) => (
                            <ChatroomCard key={chatroom.id} chatroom={chatroom} />
                        ))}
                    </div>
                    <div className="w-full flex flex-col gap-4">
                        <ClassSearch schools={schools} />
                        <CreateClass />
                    </div>
                </div>
            </div>
        </section>
    );
}
