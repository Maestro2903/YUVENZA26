"use server";

/**
 * Payment-operations actions. Resending the confirmation email is gated on
 * payments.manage (super_admin by default; grant it to other roles in
 * Admin -> Roles & permissions if gate staff need it).
 */
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/guards";
import { getServiceSupabase } from "@/lib/supabase/server";
import { sendConfirmationEmail } from "@/lib/email/notify";
import { getEmailFunctionConfig } from "@/lib/env";
import { errorMessage, str, withFlash } from "./helpers";

export async function resendConfirmationEmailAction(formData: FormData): Promise<void> {
  const back = str(formData, "back") || "/admin/payments";
  let dest: string;
  try {
    await requirePermission("payments.manage");
    const orderId = str(formData, "order_id");
    if (!orderId) throw new Error("Missing order id.");

    // Check sendability BEFORE touching the sent-marker: a resend attempt on
    // an unconfigured deployment must not erase the record that the original
    // email went out.
    if (!getEmailFunctionConfig()) {
      throw new Error(
        "Email service is not configured (EMAIL_FUNCTION_URL / EMAIL_FUNCTION_SECRET)."
      );
    }

    const service = getServiceSupabase();
    if (!service) throw new Error("Supabase is not configured.");

    const { data: order, error } = await service
      .from("orders")
      .select("id, status, customer_email")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error("Order not found.");
    if (order.status !== "paid") throw new Error("Only paid orders get confirmation emails.");

    // Release any previous claim, then send (sendConfirmationEmail re-claims
    // atomically and never throws).
    const { error: clearError } = await service
      .from("orders")
      .update({ confirmation_email_sent_at: null })
      .eq("id", orderId);
    if (clearError) throw clearError;

    const sent = await sendConfirmationEmail(orderId);
    dest = withFlash(
      back,
      sent ? "ok" : "err",
      sent
        ? `Confirmation email resent to ${order.customer_email}.`
        : "Could not send - check EMAIL_FUNCTION_URL/SECRET configuration and the function logs."
    );
  } catch (err) {
    dest = withFlash(back, "err", errorMessage(err));
  }
  redirect(dest);
}
