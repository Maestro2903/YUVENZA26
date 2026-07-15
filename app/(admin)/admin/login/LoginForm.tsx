"use client";

import { useActionState } from "react";
import { signInAction, type AuthFormState } from "@/app/(admin)/admin/actions/auth";

const initialState: AuthFormState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="adm-form">
      <input type="hidden" name="next" value={next} />
      <div className="adm-field">
        <label htmlFor="adm-email">Email</label>
        <input
          id="adm-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="adm-field">
        <label htmlFor="adm-password">Password</label>
        <input
          id="adm-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>
      {state.error && (
        <p className="adm-flash err" style={{ margin: 0 }} role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="adm-btn" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
