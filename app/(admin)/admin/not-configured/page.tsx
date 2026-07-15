export const dynamic = "force-dynamic";

/**
 * Shown (via middleware rewrite) when the admin panel is opened without
 * Supabase environment variables. Local dev keeps working - the public site
 * falls back to static content - but the panel needs a backend.
 */
export default function NotConfiguredPage() {
  return (
    <div className="adm-auth">
      <div className="adm-auth-card" style={{ maxWidth: 560 }}>
        <h1>Admin panel not configured</h1>
        <p>
          The admin panel needs Supabase. The public site keeps working without it (it falls back
          to the built-in content), but managing content requires a database.
        </p>
        <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          <li>
            Create a project at <strong>supabase.com</strong>.
          </li>
          <li>
            Apply <code>supabase/migrations/0001_initial_schema.sql</code>, then{" "}
            <code>supabase/seed.sql</code> (SQL editor or <code>supabase db push</code>).
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and fill in the Supabase
            values.
          </li>
          <li>Restart the dev server and open /admin again.</li>
        </ol>
        <p className="adm-help">
          Full instructions: <code>docs/SETUP.md</code> in the repository.
        </p>
      </div>
    </div>
  );
}
