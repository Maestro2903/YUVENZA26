import Link from "next/link";

/**
 * Simple prev/next pagination driven by URL search params (server-rendered).
 */
export default function Pagination({
  basePath,
  page,
  pageSize,
  total,
  params = {},
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  params?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams({ ...params, page: String(p) });
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <nav className="adm-pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)}>← Prev</Link>
      ) : (
        <span className="pg disabled">← Prev</span>
      )}
      <span>
        Page {page} of {pages} · {total} total
      </span>
      {page < pages ? (
        <Link href={href(page + 1)}>Next →</Link>
      ) : (
        <span className="pg disabled">Next →</span>
      )}
    </nav>
  );
}
