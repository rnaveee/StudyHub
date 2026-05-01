
import Link from "next/link";

export default function Hero() {
  return (
    <section className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Chat with your classmates.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Join class-based rooms, trade notes, share files, and keep every study group organized
              around the course you are actually taking.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signin"
                className="rounded-md bg-purple-700 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-purple-800"
              >
                Find your class
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-purple-700">MATH101</p>
                  <p className="mt-1 font-bold text-slate-950">Calculus 1</p>
                </div>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                  24 online
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-lg bg-slate-100 p-3">
                  <p className="text-xs font-bold text-slate-500">Joe</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Does anyone have the review sheet from section?
                  </p>
                </div>
                <div className="ml-8 rounded-lg bg-purple-50 p-3">
                  <p className="text-xs font-bold text-purple-700">Jessica</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Yep, uploading the PDF now.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <span className="h-2 w-2 rounded-full bg-purple-500"/>
                Chat with your peers!
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
