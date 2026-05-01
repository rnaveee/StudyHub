
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatroomCard from "../components/ChatroomCard";
import ClassSearch from "../components/ClassSearch";
import CreateClass from "../components/CreateClass";
import type { Chatroom } from "../data";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

type CourseRow = {
    id: string;
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
    chatroom_id: string;
    chatrooms: ChatroomRow | ChatroomRow[] | null;
};


export default async function Dashboard(){
    const { userId } = await auth();

    if(!userId){
        redirect("/signin");
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from("chatroom_members")
        .select(`
        chatroom_id,
        chatrooms (
            id,
            joined_users,
            ongoing,
            courses (
            id,
            class_id,
            class_name,
            professor,
            school,
            final_exam_date
            )
        )
        `)
        .eq("clerk_user_id", userId);
    
    if(error){
        throw new Error(error.message);
    }

    const memberships = (data ?? []) as ChatroomMembershipRow[];
    const chatrooms: Chatroom[] = memberships.flatMap((membership) => {
        const chatroom = Array.isArray(membership.chatrooms)
            ? membership.chatrooms[0]
            : membership.chatrooms;
        const course = Array.isArray(chatroom?.courses)
            ? chatroom.courses[0]
            : chatroom?.courses;

        if (!chatroom || !course) {
            return [];
        }

        return [{
            id: chatroom.id,
            joinedUsers: chatroom.joined_users,
            onGoing: chatroom.ongoing,
            course: {
                id: course.id,
                classID: course.class_id,
                className: course.class_name,
                professor: course.professor,
                school: course.school,
                finalsDate: course.final_exam_date ?? "",
            },
        }];
    });

    return(
        <section className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-2xl">Welcome, Ryan</h1>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="flex w-full max-w-2xl flex-col gap-3">
                        {chatrooms.map((chatroom) => (
                            <ChatroomCard key={chatroom.id} chatroom={chatroom} />
                        ))}
                    </div>
                    <div className="w-full flex flex-col gap-4">
                        <ClassSearch />
                        <CreateClass />
                    </div>
                </div>
            </div>
        </section>
    );
}
