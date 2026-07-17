"use client";

 

/**
 * The visitor's profile: Google account details, sign in/out, and every
 * registration with its QR entry pass and PDF download. Auth state and
 * orders are client-fetched (the page shell stays static); RLS guarantees
 * a visitor only ever sees their own orders.
 */
import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/lib/hooks/useSupabaseUser";
import { normalizeDomain } from "@/lib/auth/allowedDomain";
import MyRegistrations from "@/components/MyRegistrations";
import type { EventItem } from "@/lib/content/types";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.16 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.77l3.98-3.11z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l3.98 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

export default function ProfileClient({
  events,
  allowedEmailDomain = "citchennai.net",
}: {
  events: EventItem[];
  allowedEmailDomain?: string;
}) {
  const { user, loading, signInWithGoogle, signOut } = useSupabaseUser();
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const domain = normalizeDomain(allowedEmailDomain);

  // Surface ?authError=... from the OAuth callback, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("authError");
    if (err) {
      setAuthError(err);
      params.delete("authError");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  const startSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    const error = await signInWithGoogle(domain);
    if (error) {
      setSigningIn(false);
      setAuthError(error);
    }
  };

  if (loading) {
    return <p className="ev-qr-caption">Loading your profile…</p>;
  }

  if (!user) {
    return (
      <div className="pf-signin">
        <p className="ev-lead">
          Sign in with your college Google account to see your registrations, entry passes and
          ticket downloads.
        </p>
        <div className="ev-signin-row">
          <button
            type="button"
            className="ev-signin-btn"
            onClick={() => void startSignIn()}
            disabled={signingIn}
          >
            <GoogleMark />
            {signingIn ? "Opening Google…" : "Sign in with Google"}
          </button>
          <span className="ev-signin-note">
            {domain === "*" ? "Any Google account works." : `Use your @${domain} account.`}
          </span>
        </div>
        {authError && (
          <p className="ev-status error" role="alert">
            {authError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="pf-body">
      <div className="ev-user pf-user">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="ev-user-avatar" referrerPolicy="no-referrer" />
        ) : (
          <span className="ev-user-avatar ev-user-initial" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="ev-user-info">
          <span className="ev-user-name">{user.name}</span>
          <span className="ev-user-email">{user.email}</span>
        </span>
        <button type="button" className="ev-user-signout" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      <MyRegistrations user={user} events={events} />

      <div className="pf-links">
        <a href="/events" className="ho-cta ghost">
          Browse events <span aria-hidden="true">↗</span>
        </a>
        <a href="/registration" className="ho-cta primary">
          Register <span aria-hidden="true">↗</span>
        </a>
      </div>

      <p className="pf-note">
        Your name, email and phone come from your registration and your Google account. Need a
        detail corrected? Reach us via the contact links in the footer.
      </p>
    </div>
  );
}
