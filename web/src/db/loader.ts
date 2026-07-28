import initSqlJs, { type Database } from "sql.js";
import catalogUrl from "../assets/catalog.db?url";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

let dbPromise: Promise<Database> | null = null;

export function openDb(): Promise<Database> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    const [SQL, buf] = await Promise.all([
      initSqlJs({ locateFile: () => wasmUrl }),
      fetch(catalogUrl).then((r) => {
        if (!r.ok) throw new Error(`catalog.db fetch failed: ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);
    return new SQL.Database(new Uint8Array(buf));
  })();
  return dbPromise;
}

/** Convert a sql.js result row array + column names into an object. */
export function rowsToObjects<T = Record<string, unknown>>(
  db: Database,
  sql: string,
  params?: unknown[],
): T[] {
  const stmt = db.prepare(sql);
  try {
    if (params) stmt.bind(params as never);
    const out: T[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as T);
    return out;
  } finally {
    stmt.free();
  }
}
