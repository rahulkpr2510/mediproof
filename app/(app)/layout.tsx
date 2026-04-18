import { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Protect all /app routes - require authentication
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
