import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SignInGate from "./SignInGate";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <SignInGate />
    </main>
  );
}
