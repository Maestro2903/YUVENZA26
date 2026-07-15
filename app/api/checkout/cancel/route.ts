import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/cancel
 * Marks an order cancelled (user dismissed the payment sheet) or failed
 * (gateway reported a failure). Only pending orders can transition - a paid
 * order can never be downgraded through this route, and the authoritative
 * status still comes from the Razorpay webhook.
 */
export async function POST(req: Request) {
  let body: { orderId?: string; failed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { orderId, failed } = body;
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ ok: false, error: "Missing order id." }, { status: 400 });
  }

  const service = getServiceSupabase();
  if (!service) return NextResponse.json({ ok: true });

  const { error } = await service
    .from("orders")
    .update({ status: failed ? "failed" : "cancelled" })
    .eq("id", orderId)
    .in("status", ["created", "pending"]);

  if (error) {
    console.error("[checkout] Failed to mark order cancelled:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
