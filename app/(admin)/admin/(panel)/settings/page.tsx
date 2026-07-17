import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import {
  saveGeneralSettingsAction,
  savePaymentSettingsAction,
  saveRegistrationSettingsAction,
} from "@/app/(admin)/admin/actions/settings";
import { DEFAULT_REGISTRATION_SETTINGS } from "@/lib/content/fallback";
import { identityHasPermission, requireAdminUser } from "@/lib/rbac/guards";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";
import { getRazorpayEnvConfig } from "@/lib/env";
import { decryptWithAppKey, isEncryptionConfigured } from "@/lib/security/crypto";
import { SECRET_KEYS } from "@/lib/razorpay/server";
import { DEFAULT_GENERAL_SETTINGS } from "@/lib/content/fallback";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function maskKeyId(keyId: string): string {
  return keyId.length <= 12 ? keyId : `${keyId.slice(0, 12)}…${keyId.slice(-3)}`;
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const identity = await requireAdminUser();
  const canSettings = identityHasPermission(identity, "settings.manage");
  const canPayments = identityHasPermission(identity, "payments.manage");
  if (!canSettings && !canPayments) redirect("/admin?error=forbidden");

  const { ok, err } = await searchParams;
  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  // ----- General settings -----
  const { data: generalRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "general")
    .maybeSingle();
  const general = {
    ...DEFAULT_GENERAL_SETTINGS,
    ...((generalRow?.value as object | null) ?? {}),
  };

  // ----- Registration / Google sign-in settings -----
  const { data: registrationRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "registration")
    .maybeSingle();
  const registration = {
    ...DEFAULT_REGISTRATION_SETTINGS,
    ...((registrationRow?.value as object | null) ?? {}),
  };

  // ----- Payment configuration status (secrets never leave the server) -----
  let paymentsEnabled = true;
  let storedKeyIdMasked: string | null = null;
  let hasStoredSecret = false;
  let hasStoredWebhook = false;
  if (canPayments) {
    const { data: payRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "payments")
      .maybeSingle();
    paymentsEnabled = ((payRow?.value as { enabled?: boolean } | null)?.enabled ?? true) !== false;

    const service = getServiceSupabase();
    if (service && isEncryptionConfigured()) {
      const { data: secrets } = await service
        .from("app_secrets")
        .select("key, value")
        .in("key", [SECRET_KEYS.keyId, SECRET_KEYS.keySecret, SECRET_KEYS.webhookSecret]);
      for (const s of secrets ?? []) {
        if (s.key === SECRET_KEYS.keySecret) hasStoredSecret = true;
        if (s.key === SECRET_KEYS.webhookSecret) hasStoredWebhook = true;
        if (s.key === SECRET_KEYS.keyId) {
          try {
            storedKeyIdMasked = maskKeyId(decryptWithAppKey(s.value));
          } catch {
            storedKeyIdMasked = "(stored, cannot decrypt - check APP_ENCRYPTION_KEY)";
          }
        }
      }
    }
  }
  const envConfig = getRazorpayEnvConfig();

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Settings</h1>
          <p className="adm-sub">Application-wide configuration.</p>
        </div>
      </header>
      <Flash ok={ok} err={err} />

      {canSettings && (
        <div className="adm-card">
          <h2 className="adm-card-title">General</h2>
          <form action={saveGeneralSettingsAction} className="adm-form">
            <div className="adm-field">
              <label htmlFor="st-name">Site name</label>
              <input id="st-name" name="siteName" defaultValue={general.siteName} maxLength={120} />
            </div>
            <div className="adm-field">
              <label htmlFor="st-desc">Site description</label>
              <textarea id="st-desc" name="siteDescription" defaultValue={general.siteDescription} maxLength={400} />
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label htmlFor="st-ig">Instagram URL</label>
                <input id="st-ig" name="instagramUrl" type="url" defaultValue={general.instagramUrl} />
              </div>
              <div className="adm-field">
                <label htmlFor="st-li">LinkedIn URL</label>
                <input id="st-li" name="linkedinUrl" type="url" defaultValue={general.linkedinUrl} />
              </div>
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label htmlFor="st-loc">Location label (nav)</label>
                <input id="st-loc" name="locationLabel" defaultValue={general.locationLabel} maxLength={60} />
              </div>
              <div className="adm-field">
                <label htmlFor="st-contact">Contact email (footer & support copy)</label>
                <input id="st-contact" name="contactEmail" type="email" defaultValue={general.contactEmail} maxLength={120} />
              </div>
            </div>
            <div className="adm-form-actions">
              <SubmitButton>Save general settings</SubmitButton>
            </div>
          </form>
        </div>
      )}

      {canSettings && (
        <div className="adm-card" id="registration">
          <h2 className="adm-card-title">Registration &amp; Google sign-in</h2>
          <form action={saveRegistrationSettingsAction} className="adm-form">
            <label className="adm-check">
              <input type="checkbox" name="requireLogin" defaultChecked={registration.requireLogin} />
              Visitors must sign in with Google before registering
            </label>
            <div className="adm-field">
              <label htmlFor="rg-closes">Registration closes at (optional)</label>
              <input
                id="rg-closes"
                name="closesAt"
                type="datetime-local"
                defaultValue={
                  registration.closesAt
                    ? new Date(
                        new Date(registration.closesAt).getTime() -
                          new Date().getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
              <p className="adm-help">
                Checkout refuses new registrations after this moment (your local time) - no one
                needs to flip the switch at midnight. Leave empty for no deadline.
              </p>
            </div>
            <div className="adm-field">
              <label htmlFor="rg-domain">Allowed Google email domain</label>
              <input
                id="rg-domain"
                name="allowedEmailDomain"
                defaultValue={registration.allowedEmailDomain}
                placeholder="citchennai.net"
                maxLength={100}
              />
              <p className="adm-help">
                Only Google accounts on this domain can sign in (enforced in the database, not just
                the UI). Enter <code>*</code> to allow any Google account. Admin email/password
                logins are never affected.
              </p>
            </div>
            <div className="adm-form-actions">
              <SubmitButton>Save registration settings</SubmitButton>
            </div>
          </form>
        </div>
      )}

      {canPayments && (
        <div className="adm-card" id="payments">
          <h2 className="adm-card-title">Razorpay payments</h2>
          <dl className="adm-kv" style={{ marginBottom: "1rem" }}>
            <dt>Stored key id</dt>
            <dd>{storedKeyIdMasked ?? "not stored"}</dd>
            <dt>Stored key secret</dt>
            <dd>{hasStoredSecret ? "configured (encrypted, write-only)" : "not stored"}</dd>
            <dt>Stored webhook secret</dt>
            <dd>{hasStoredWebhook ? "configured (encrypted, write-only)" : "not stored"}</dd>
            <dt>Environment fallback</dt>
            <dd>{envConfig.keyId && envConfig.keySecret ? `active (${maskKeyId(envConfig.keyId)})` : "not set"}</dd>
            <dt>Encryption</dt>
            <dd>
              {isEncryptionConfigured()
                ? "APP_ENCRYPTION_KEY configured"
                : "APP_ENCRYPTION_KEY missing - credentials can't be stored until it is set"}
            </dd>
          </dl>

          <form action={savePaymentSettingsAction} className="adm-form">
            <label className="adm-check">
              <input type="checkbox" name="enabled" defaultChecked={paymentsEnabled} />
              Registration / checkout open
            </label>
            <div className="adm-field">
              <label htmlFor="pz-keyid">Key id</label>
              <input id="pz-keyid" name="keyId" placeholder="rzp_live_… (leave blank to keep current)" autoComplete="off" />
            </div>
            <div className="adm-field">
              <label htmlFor="pz-secret">Key secret</label>
              <input
                id="pz-secret"
                name="keySecret"
                type="password"
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
              />
              <p className="adm-help">
                Write-only: stored AES-256-GCM encrypted, decrypted only on the server at charge
                time, never shown again.
              </p>
            </div>
            <div className="adm-field">
              <label htmlFor="pz-webhook">Webhook secret</label>
              <input
                id="pz-webhook"
                name="webhookSecret"
                type="password"
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
              />
              <p className="adm-help">
                Set the same value in the Razorpay dashboard webhook pointing at
                /api/webhooks/razorpay (events: payment.captured, payment.failed, order.paid).
              </p>
            </div>
            <label className="adm-check">
              <input type="checkbox" name="clearCredentials" />
              Clear all stored credentials (falls back to environment variables, or demo mode)
            </label>
            <div className="adm-form-actions">
              <SubmitButton>Save payment settings</SubmitButton>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
