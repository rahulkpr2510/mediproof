import { NextResponse } from "next/server";
import { chainHealthCheck } from "@/lib/server/blockchain";

export async function GET() {
  const result = await chainHealthCheck();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
