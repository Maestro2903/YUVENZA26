import Link from "next/link";

export default function NotFound() {
  return (
    <main className="err-page">
      <p className="err-kicker">404 · Not Found</p>
      <h1 className="err-title">
        L<span className="f-span">o</span>st?
      </h1>
      <p className="err-body">
        This page doesn&#x27;t exist (or it moved on to a better cause). Let&#x27;s get you back.
      </p>
      <Link href="/" className="ho-cta primary err-cta">
        Back home <span aria-hidden="true">↗</span>
      </Link>
    </main>
  );
}
