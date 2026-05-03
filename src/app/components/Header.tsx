"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs"

export default function Header() {
  const {isSignedIn, user, isLoaded} = useUser();

  if(!isLoaded) {
    return null;
  }

  return (
    <header className="flex w-full items-center justify-between border-b border-slate-300 bg-white px-3 py-3 text-slate-950">
      <Link href="/" className="flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-700 text-base font-bold text-white">
          SH
        </span>
        <span>
          <span className="block text-2xl font-bold leading-tight tracking-tight">StudyHub</span>
          <span className="block text-sm font-medium text-slate-500">Online study rooms</span>
        </span>
      </Link>
      <nav className="lg:mr-5">
        {isSignedIn ? (
          <div className="flex rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700">
            <UserButton/>
            <Link href="/profile" className="rounded-md px-3 py-2 text-sm hover:text-purple-700">{user.firstName}</Link>
          </div>
        ) : (
          <Link
          href="/signin"
          className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
          >Sign in</Link>
        )}
      </nav>
    </header>
  );
}
