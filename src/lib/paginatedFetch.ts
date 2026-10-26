/**
 * Paginated fetch of every row a member owns, for self-service data exports.
 *
 * PostgREST silently caps a single response at its configured max-rows
 * (1,000 here), so a plain `.select()` truncates large histories without any
 * error. This helper pages with `.range()` until a short page arrives and
 * fails closed: any page error throws, and a hard ceiling stops runaway
 * loops instead of returning a silently incomplete export.
 */

export const EXPORT_PAGE_SIZE = 1000;
export const EXPORT_ROW_CEILING = 100_000;

interface RangeCapable {
  range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
}

/**
 * Pages `queryFactory(from, to)` until a short page arrives.
 * `queryFactory` must return a fresh query each call (supabase builders are
 * single-use once awaited).
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  queryFactory: (from: number, to: number) => RangeCapable,
  label = 'export',
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + EXPORT_PAGE_SIZE - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw new Error(`${label} export failed: ${error.message}`);
    const page = (data as T[] | null) ?? [];
    rows.push(...page);
    if (page.length < EXPORT_PAGE_SIZE) return rows;
    from += EXPORT_PAGE_SIZE;
    if (from >= EXPORT_ROW_CEILING) {
      throw new Error(`${label} export exceeded ${EXPORT_ROW_CEILING} rows; refusing to return a partial file`);
    }
  }
}
