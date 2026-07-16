import "server-only";

/**
 * Fetch ALL rows of a filtered query by paging with .range().
 *
 * Why: Supabase/PostgREST silently clamps every response to the project's
 * "Max Rows" setting (default 1000) - a single .limit(10000) call quietly
 * returns a subset with HTTP 200. Paging with a fresh query per window is
 * the only reliable way to aggregate or export beyond the cap, whatever the
 * server clamp is (the loop stops on the first empty page).
 */
export async function fetchAllRows<T>(
  buildPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  { pageSize = 1000, maxRows = 10000 }: { pageSize?: number; maxRows?: number } = {}
): Promise<{ rows: T[]; truncated: boolean; error: string | null }> {
  const rows: T[] = [];
  let from = 0;
  while (rows.length < maxRows) {
    const { data, error } = await buildPage(from, from + pageSize - 1);
    if (error) return { rows, truncated: false, error: error.message };
    const page = data ?? [];
    if (page.length === 0) return { rows, truncated: false, error: null };
    rows.push(...page.slice(0, maxRows - rows.length));
    from += page.length;
  }
  // Cap reached - there may be more rows (callers should surface this).
  return { rows, truncated: true, error: null };
}
