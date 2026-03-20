import { buildLogoutCookie } from "@/lib/server/auth";

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildLogoutCookie(),
      "Cache-Control": "no-store",
    },
  });
}
