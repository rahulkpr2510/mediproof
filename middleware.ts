import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/api/onboarding(.*)",
  "/api/admin(.*)",
  "/api/orders(.*)",
  "/api/suppliers(.*)",
]);

// Routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  "/",
  "/verify(.*)",
  "/contact",
  "/report",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/verify(.*)",
  "/api/contact(.*)",
  "/api/reports(.*)",
  "/api/auth(.*)",
  "/api/roles(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // If it's a protected route, require authentication
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    
    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
