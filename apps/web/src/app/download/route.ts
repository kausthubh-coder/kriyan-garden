import { NextResponse } from "next/server";
import { KRIYAN_RELEASES } from "@/lib/origins";
export function GET() { return NextResponse.redirect(KRIYAN_RELEASES, 307); }
