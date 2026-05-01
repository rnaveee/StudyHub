import ClassCard from "../components/ClassCard";
import ClassSearch from "../components/ClassSearch";
import type { Chatroom, Course } from "../data";

const alg: Course = {
    id: "mock-course-math251",
    classID: "math251",
    className: "Linear Algebra",
    professor: "dr tungtungtung",
    school: "SFU",
    finalsDate: "may 20, 2027"
}

const chattest: Chatroom = {
    id: "mock-chatroom-math251",
    course: alg,
    joinedUsers: 24,
    onGoing: true,
}


export default function Dashboard(){
    return(
        <section className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-2xl">Welcome, Ryan</h1>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="flex w-full max-w-2xl flex-col gap-3">
                        <ClassCard chatroom={chattest}/>
                        <ClassCard chatroom={chattest}/>
                        <ClassCard chatroom={chattest}/>
                        <ClassCard chatroom={chattest}/>
                        <ClassCard chatroom={chattest}/>
                    </div>
                    <ClassSearch />
                </div>
            </div>
        </section>
    );
}
