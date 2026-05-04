import { createChatroom } from "../dashboard/actions";


export default function CreateClass(){
    
    return(
        <section className="w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Can&apos;t find your class? Create one!</h2>
            <p className="text-sm text-slate-500">StudyHub will automatically generate a link for this chatroom.</p>

            <div className="mt-4">
                <form className="grid gap-3" action={createChatroom}>
                    <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">Class ID</span>
                            <input
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                type="text"
                                name="classId"
                                placeholder="MATH101"
                                required
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">Class Name</span>
                            <input
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                type="text"
                                name="className"
                                placeholder="Calculus 1"
                                required
                            />
                        </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">School</span>
                            <input
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                type="text"
                                name="school"
                                placeholder="SFU"
                                required
                            />
                        </label>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-950">Other details</h2>
                        <p className="text-sm text-slate-500">You can add these later.</p>
                    </div>
                    <label className="block max-w-xs">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">Professor</span>
                            <input
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                type="text"
                                name="professor"
                                placeholder="Dr. Mark"
                            />
                        </label>
                        <span className="mb-1 block text-sm font-semibold text-slate-700">Final exam date</span>
                        <input
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                            type="date"
                            name="finalExamDate"
                            placeholder="MATH101"
                        />
                    </label>

                    <button
                        type="submit"
                        className="w-fit rounded-md bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-800"
                    >
                        Create class
                    </button>
                </form>
            </div>

            
        </section>
    );
}
