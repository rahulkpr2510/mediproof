import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900">
            <span className="font-display text-lg font-semibold italic text-zinc-200">
              M
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to access your MediProof dashboard
          </p>
        </div>

        <SignIn
          appearance={{
            elements: {
              formButtonPrimary:
                "bg-zinc-100 hover:bg-white text-zinc-900 font-medium",
              card: "bg-zinc-900 border border-zinc-800 shadow-xl",
              headerTitle: "text-zinc-100",
              headerSubtitle: "text-zinc-400",
              socialButtonsBlockButton:
                "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700",
              socialButtonsBlockButtonText: "text-zinc-100 font-medium",
              dividerLine: "bg-zinc-700",
              dividerText: "text-zinc-500",
              formFieldLabel: "text-zinc-300",
              formFieldInput:
                "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500",
              footerActionLink: "text-zinc-300 hover:text-zinc-100",
              identityPreviewText: "text-zinc-100",
              identityPreviewEditButton: "text-zinc-400 hover:text-zinc-100",
            },
          }}
          signUpUrl="/sign-up"
          forceRedirectUrl="/onboarding"
        />
      </div>
    </div>
  );
}
