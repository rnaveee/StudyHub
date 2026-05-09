"use client";

import { useState, useTransition } from "react";
import SearchedChatroomCard from "./SearchedChatroomCard";
import { searchChatrooms } from "../dashboard/actions";
import type { SearchResult } from "../data";

export default function ClassSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSearch(formData: FormData) {
    startTransition(async () => {
      try {
        const foundChatrooms = await searchChatrooms(formData);
        setResults(foundChatrooms);
        setHasSearched(true);
        setError(null);
      } catch (err) {
        console.error("searchChatrooms failed:", err);
        setError("Couldn't search. Please try again.");
      }
    });
  }

  return (
    <section className="w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold tracking-tight text-slate-950">Search classrooms</h2>

      <form action={handleSearch}>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Class</span>
            <input
              type="text"
              placeholder="MATH251 or Linear Algebra"
              name="query"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">School</span>
            <input
              type="text"
              placeholder="SFU"
              name="school"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-3 w-fit rounded-md bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 min-h-24 rounded-md border border-dashed border-slate-200 bg-slate-50 p-3">
        {results.length > 0 ? (
          <div className="flex flex-col gap-2">
            {results.map((result) => (
              <SearchedChatroomCard
                key={result.chatroomId}
                chatroomId={result.chatroomId}
                classId={result.classId}
                className={result.className}
                professor={result.professor}
                school={result.school}
                joinedUsers={result.joinedUsers}
                isJoined={result.isJoined}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {hasSearched ? "No chatrooms matched." : "No results yet — try a search."}
          </p>
        )}
      </div>
    </section>
  );
}
