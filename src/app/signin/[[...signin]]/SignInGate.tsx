"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function SignInGate() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    redirect("/dashboard");
  }

  return <SignIn fallbackRedirectUrl="/dashboard" path="/signin" routing="path" />;
}
