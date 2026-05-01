export default function ClassSearch() {
  return (
    <section className="w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold tracking-tight text-slate-950">Search classrooms</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Class</span>
          <input
            type="text"
            placeholder="MATH251 or Linear Algebra"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">School</span>
          <input
            type="text"
            placeholder="SFU"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
        </label>
      </div>

      <div className="mt-4 min-h-24 rounded-md border border-dashed border-slate-200 bg-slate-50 p-3" />
    </section>
  );
}
