"""A small in-memory stand-in for the Supabase client, enough for the call path:
table().select/insert/update/eq/is_/not_.is_/order/limit/execute, with the unique
index on calls.retell_call_id that migration 014 adds."""
import copy
import itertools
from types import SimpleNamespace

_ids = itertools.count(1)


class FakeSupabase:
    def __init__(self, unique=(("calls", "retell_call_id"),)):
        self.tables: dict[str, list[dict]] = {"calls": [], "bookings": [], "businesses": []}
        self.unique = unique
        self.fail_inserts_on: set[str] = set()

    def table(self, name):
        return _Query(self, name)

    # convenience for assertions
    def rows(self, name):
        return self.tables[name]


class _Not:
    def __init__(self, q):
        self.q = q

    def is_(self, col, value):
        self.q.filters.append(lambda r: (r.get(col) is not None) if value == "null" else r.get(col) != value)
        return self.q


class _Query:
    def __init__(self, db, name):
        self.db, self.name = db, name
        self.op = "select"
        self.payload = None
        self.filters = []
        self.max = None
        self.sort = None

    @property
    def not_(self):
        return _Not(self)

    def select(self, *_a, **_k):
        self.op = "select"
        return self

    def insert(self, row):
        self.op, self.payload = "insert", row
        return self

    def update(self, patch):
        self.op, self.payload = "update", patch
        return self

    def eq(self, col, value):
        self.filters.append(lambda r: r.get(col) == value)
        return self

    def is_(self, col, value):
        self.filters.append(lambda r: (r.get(col) is None) if value == "null" else r.get(col) == value)
        return self

    def order(self, col, desc=False, **_k):
        self.sort = (col, desc)
        return self

    def limit(self, n):
        self.max = n
        return self

    def execute(self):
        rows = self.db.tables[self.name]
        if self.op == "insert":
            if self.name in self.db.fail_inserts_on:
                raise RuntimeError("database down")
            for table, col in self.db.unique:
                if table == self.name and self.payload.get(col) is not None and any(r.get(col) == self.payload[col] for r in rows):
                    raise RuntimeError(f"duplicate key value violates unique constraint on {col}")
            row = copy.deepcopy(self.payload)
            row.setdefault("id", f"{self.name[:1]}{next(_ids)}")
            rows.append(row)
            return SimpleNamespace(data=[copy.deepcopy(row)])
        hit = [r for r in rows if all(f(r) for f in self.filters)]
        if self.sort:
            col, desc = self.sort
            hit.sort(key=lambda r: str(r.get(col)), reverse=desc)
        if self.op == "update":
            for r in hit:
                r.update(copy.deepcopy(self.payload))
            return SimpleNamespace(data=[{"id": r["id"]} for r in hit])
        if self.max is not None:
            hit = hit[: self.max]
        return SimpleNamespace(data=[copy.deepcopy(r) for r in hit])
