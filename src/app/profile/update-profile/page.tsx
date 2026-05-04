
import { upsertCurrentUser } from "../../utils/chatroomHelper";
import { updateProfile } from "./actions";


export default async function UpdateProfile(){
    const profile = await upsertCurrentUser();

    if(!profile){
        return;
    }

    return(
        
        <section className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <form action={updateProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Username
                        </span>
                        <input
                            name="username"
                            defaultValue={profile.username ?? ""}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                        />
                    </label>

                    <label className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            School
                        </span>
                        <input
                            name="school"
                            defaultValue={profile.school ?? ""}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                        />
                    </label>

                    <label className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Year
                        </span>
                        <input
                            name="year"
                            defaultValue={profile.year ?? ""}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                        />
                    </label>

                    <label className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Major
                        </span>
                        <input
                            name="major"
                            defaultValue={profile.major ?? ""}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                        />
                    </label>

                    <label className="rounded-md border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Bio
                        </span>
                        <textarea
                            name="bio"
                            defaultValue={profile.bio ?? ""}
                            rows={4}
                            className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                        />
                    </label>

                    <button
                        type="submit"
                        className="w-fit cursor-pointer rounded-md bg-purple-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-800"
                    >
                        Save
                    </button>
                </form>
            </div>
        </section>
    );
}
