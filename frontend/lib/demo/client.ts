// An in-memory stand-in for the Supabase client, for the demo only. It answers
// the handful of read queries the dashboard pages make (select / eq / gte / lt
// / is / not / in / order / limit / single, plus count-only heads) from the
// sample rows. There is no network and no writes: it has no insert, update or
// delete at all.
import type { DemoData } from "./dataset";

type Row = Record<string, unknown>;
type Result = { data: unknown; count: number | null; error: { message: string } | null };

class DemoQuery implements PromiseLike<Result> {
  private filters: ((r: Row) => boolean)[] = [];
  private sort?: { col: string; asc: boolean };
  private max?: number;
  private head = false;
  private wantCount = false;
  private one = false;

  constructor(private rows: Row[]) {}

  select(_columns?: string, opts?: { count?: string; head?: boolean }) {
    this.wantCount = !!opts?.count;
    this.head = !!opts?.head;
    return this;
  }
  private add(f: (r: Row) => boolean) { this.filters.push(f); return this; }
  eq(col: string, v: unknown) { return this.add((r) => String(r[col]) === String(v)); }
  gte(col: string, v: unknown) { return this.add((r) => r[col] != null && String(r[col]) >= String(v)); }
  gt(col: string, v: unknown) { return this.add((r) => r[col] != null && String(r[col]) > String(v)); }
  lte(col: string, v: unknown) { return this.add((r) => r[col] != null && String(r[col]) <= String(v)); }
  lt(col: string, v: unknown) { return this.add((r) => r[col] != null && String(r[col]) < String(v)); }
  is(col: string, v: unknown) { return this.add((r) => (v === null ? r[col] == null : r[col] === v)); }
  not(col: string, op: string, v: unknown) { return this.add((r) => !(op === "is" && v === null ? r[col] == null : String(r[col]) === String(v))); }
  in(col: string, vals: unknown[]) { const set = new Set(vals.map(String)); return this.add((r) => set.has(String(r[col]))); }
  order(col: string, opts?: { ascending?: boolean }) { this.sort = { col, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }

  private run(): Result {
    let out = this.rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.sort) {
      const { col, asc } = this.sort;
      out = out.slice().sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (asc ? 1 : -1));
    }
    const total = out.length;
    if (this.max != null) out = out.slice(0, this.max);
    const count = this.wantCount ? total : null;
    if (this.head) return { data: null, count, error: null };
    if (this.one) return { data: out[0] ?? null, count, error: out[0] ? null : { message: "No rows" } };
    return { data: out, count, error: null };
  }
  then<A = Result, B = never>(onF?: ((v: Result) => A | PromiseLike<A>) | null, onR?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.run()).then(onF, onR);
  }
}

export function demoClient(data: DemoData) {
  const tables: Record<string, Row[]> = { calls: data.calls, bookings: data.bookings, businesses: [data.business] };
  return {
    from: (table: string) => new DemoQuery(tables[table] ?? []),
    auth: {
      getUser: async () => ({ data: { user: { id: data.userId, email: String(data.business.notification_email ?? "") } }, error: null }),
    },
  };
}
