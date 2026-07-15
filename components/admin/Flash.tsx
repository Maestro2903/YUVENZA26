/**
 * Server-rendered flash message driven by ?ok= / ?err= query params - the
 * feedback channel used by redirecting server actions.
 */
export default function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (err) {
    return (
      <p className="adm-flash err" role="alert">
        {err}
      </p>
    );
  }
  if (ok) {
    return (
      <p className="adm-flash ok" role="status">
        {ok}
      </p>
    );
  }
  return null;
}
