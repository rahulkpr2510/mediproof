import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - MediProof",
  description: "Sign in to your MediProof account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
