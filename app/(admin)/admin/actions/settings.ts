"use server";

/**
 * Settings actions.
 *
 * General settings live in the (publicly readable) site_settings table.
 * Razorpay credentials are different: they are encrypted with AES-256-GCM
 * using APP_ENCRYPTION_KEY and stored in app_secrets, a table with RLS on and
 * zero policies - only the service role can touch it, and the values are only
 * ever decrypted server-side. Saved secrets are never sent back to the
 * browser; the UI shows just "configured" status and a masked key id.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/guards";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";
import { encryptWithAppKey, isEncryptionConfigured } from "@/lib/security/crypto";
import { SECRET_KEYS } from "@/lib/razorpay/server";
import { bool, errorMessage, str, withFlash } from "./helpers";

const SETTINGS = "/admin/settings";

export async function saveGeneralSettingsAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    await requirePermission("settings.manage");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const contactEmail = str(formData, "contactEmail");
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      throw new Error("Contact email doesn't look like an email address.");
    }
    const value = {
      siteName: str(formData, "siteName"),
      siteDescription: str(formData, "siteDescription"),
      instagramUrl: str(formData, "instagramUrl"),
      linkedinUrl: str(formData, "linkedinUrl"),
      locationLabel: str(formData, "locationLabel"),
      contactEmail,
    };
    for (const url of [value.instagramUrl, value.linkedinUrl]) {
      if (url && !/^https:\/\//.test(url)) throw new Error("Social links must start with https://");
    }

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "general", value }, { onConflict: "key" });
    if (error) throw error;

    revalidatePath("/", "layout");
    dest = withFlash(SETTINGS, "ok", "General settings saved.");
  } catch (err) {
    dest = withFlash(SETTINGS, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function saveRegistrationSettingsAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    await requirePermission("settings.manage");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const rawDomain = str(formData, "allowedEmailDomain").replace(/^@+/, "").toLowerCase();
    if (rawDomain !== "*" && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(rawDomain)) {
      throw new Error('Enter a domain like "citchennai.net", or "*" to allow any Google account.');
    }
    const closesAtRaw = str(formData, "closesAt");
    let closesAt = "";
    if (closesAtRaw) {
      const t = new Date(closesAtRaw);
      if (Number.isNaN(t.getTime())) throw new Error("Close date/time is not valid.");
      closesAt = t.toISOString();
    }
    const value = {
      allowedEmailDomain: rawDomain,
      requireLogin: bool(formData, "requireLogin"),
      closesAt,
    };

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "registration", value }, { onConflict: "key" });
    if (error) throw error;

    revalidatePath("/", "layout");
    dest = withFlash(SETTINGS, "ok", "Registration settings saved.");
  } catch (err) {
    dest = withFlash(SETTINGS, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function savePaymentSettingsAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    const identity = await requirePermission("payments.manage");
    const supabase = await getServerSupabase();
    const service = getServiceSupabase();
    if (!supabase || !service) throw new Error("Supabase is not configured.");

    // The "registration open" switch lives in public settings (not secret).
    const { error: settingsError } = await supabase
      .from("site_settings")
      .upsert({ key: "payments", value: { enabled: bool(formData, "enabled") } }, { onConflict: "key" });
    if (settingsError) throw settingsError;

    const keyId = str(formData, "keyId");
    const keySecret = str(formData, "keySecret");
    const webhookSecret = str(formData, "webhookSecret");
    const clearCredentials = bool(formData, "clearCredentials");

    if (clearCredentials) {
      const { error } = await service
        .from("app_secrets")
        .delete()
        .in("key", [SECRET_KEYS.keyId, SECRET_KEYS.keySecret, SECRET_KEYS.webhookSecret]);
      if (error) throw error;
      revalidatePath(SETTINGS);
      dest = withFlash(SETTINGS, "ok", "Stored Razorpay credentials cleared.");
    } else {
      const updates: { key: string; plaintext: string }[] = [];
      if (keyId) {
        if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) {
          throw new Error("That doesn't look like a Razorpay key id (rzp_test_… or rzp_live_…).");
        }
        updates.push({ key: SECRET_KEYS.keyId, plaintext: keyId });
      }
      if (keySecret) updates.push({ key: SECRET_KEYS.keySecret, plaintext: keySecret });
      if (webhookSecret) updates.push({ key: SECRET_KEYS.webhookSecret, plaintext: webhookSecret });

      if (updates.length > 0) {
        if (!isEncryptionConfigured()) {
          throw new Error(
            "APP_ENCRYPTION_KEY is not set on the server - credentials can't be stored securely. " +
              "Generate one with `openssl rand -base64 32` and add it to the environment."
          );
        }
        const rows = updates.map((u) => ({
          key: u.key,
          value: encryptWithAppKey(u.plaintext),
          updated_by: identity.userId,
        }));
        const { error } = await service.from("app_secrets").upsert(rows, { onConflict: "key" });
        if (error) throw error;
      }

      revalidatePath(SETTINGS);
      dest = withFlash(
        SETTINGS,
        "ok",
        updates.length > 0 ? "Payment settings saved and encrypted." : "Payment settings saved."
      );
    }
  } catch (err) {
    dest = withFlash(SETTINGS, "err", errorMessage(err));
  }
  redirect(dest);
}
