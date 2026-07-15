import LoginForm from "./LoginForm";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <div className="adm-auth">
      <div className="adm-auth-card">
        <div>
          <h1>Yuvenza Admin</h1>
          <p className="adm-help">Sign in with your admin account.</p>
        </div>
        {error === "inactive" && (
          <p className="adm-flash err" style={{ margin: 0 }}>
            Your account has been deactivated. Contact an administrator.
          </p>
        )}
        {configured ? (
          <LoginForm next={next ?? ""} />
        ) : (
          <p className="adm-flash err" style={{ margin: 0 }}>
            Supabase is not configured. Copy <code>.env.example</code> to{" "}
            <code>.env.local</code> and fill in the Supabase values, then restart the dev server.
          </p>
        )}
      </div>
    </div>
  );
}
