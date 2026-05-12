import { ClerkProvider } from "@clerk/nextjs";
import Header from "./components/Header";
import "./globals.css";
import { publicEnv } from "./lib/env";

const publishableKey = publicEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const metadata = {
  title: "StudyHub",
  description: "Class chatrooms and student profiles for campus study groups.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body>
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
