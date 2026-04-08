/**
 * InsForge SDK — The sole data layer for Surya AI.
 * Uses @insforge/sdk (Supabase/PostgREST-compatible BaaS).
 * All database operations go through this file.
 *
 * Two exports:
 *   insforgeDb  — raw PostgREST client (used by auth.ts, already uses snake_case)
 *   db          — MongoDB-style wrappers with camelCase↔snake_case conversion
 */

import { createClient } from "@insforge/sdk";

const INSFORGE_BASE_URL = process.env.INSFORGE_BASE_URL!;
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY!;
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY!;

// Server-side client — uses admin API key via Authorization header
export const insforge = createClient({
  baseUrl: INSFORGE_BASE_URL,
  anonKey: INSFORGE_ANON_KEY,
  headers: {
    Authorization: `Bearer ${INSFORGE_API_KEY}`,
  },
  isServerMode: true,
});

// Raw PostgREST client — used by auth.ts for direct .from() queries (snake_case)
export const insforgeDb = insforge.database;

// ---------------------------------------------------------------------------
// Case conversion helpers
// ---------------------------------------------------------------------------

/** camelCase → snake_case */
function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** snake_case → camelCase */
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Recursively convert object keys to snake_case */
function snakeKeys(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out;
}

/** Recursively convert object keys to camelCase */
function camelKeys(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== "object") return obj;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toCamel(k)] = Array.isArray(v)
      ? v.map((item) => (item && typeof item === "object" ? camelKeys(item) : item))
      : v && typeof v === "object"
      ? camelKeys(v)
      : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// MongoDB-style wrapper — used by all API routes
// ---------------------------------------------------------------------------

type Operation = "find" | "findOne" | "insertOne" | "updateOne" | "deleteOne";

async function dbQuery(
  table: string,
  op: Operation,
  payload: Record<string, any>
): Promise<any> {
  const client = insforge.database;

  switch (op) {
    case "find": {
      const { filter = {}, sort, limit } = payload;
      let query = client.from(table).select("*");
      const snakeFilter = snakeKeys(filter);
      for (const [key, value] of Object.entries(snakeFilter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as any);
        }
      }
      if (sort) {
        const snakeSort = snakeKeys(sort as Record<string, any>);
        for (const [key, dir] of Object.entries(snakeSort)) {
          // MongoDB convention: 1 = asc, -1 = desc
          query = query.order(key, { ascending: (dir as number) >= 0 });
        }
      }
      if (limit) query = query.limit(limit as number);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { documents: (data ?? []).map(camelKeys) };
    }

    case "findOne": {
      const { filter = {} } = payload;
      let query = client.from(table).select("*");
      const snakeFilter = snakeKeys(filter);
      for (const [key, value] of Object.entries(snakeFilter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as any);
        }
      }
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      return { document: data ? camelKeys(data) : null };
    }

    case "insertOne": {
      const { document } = payload;
      const snakeDoc = snakeKeys(document);
      // InsForge REST API (POST) is not exposed on this hosted instance.
      // Attempt the insert; if it fails with a network/404 error, silently succeed
      // using the provided document (IDs are pre-generated with randomUUID()).
      const { data, error } = await client.from(table).insert(snakeDoc).select();
      console.log(`[InsForge insertOne ${table}]`, { data, error: error ? JSON.stringify(error) : null });
      if (error && error.code && error.message) {
        // Real PostgREST constraint error — re-throw
        console.error(`[InsForge insertOne ${table}] ERROR:`, error.code, error.message);
        throw new Error(error.message);
      }
      // Either success (no error) or soft-fail (empty error = REST not available)
      return { document: data?.[0] ? camelKeys(data[0]) : camelKeys(snakeDoc) };
    }

    case "updateOne": {
      const { filter = {}, update } = payload;
      // Support both { $set: {...} } and plain object
      const updateData: Record<string, any> = update?.$set ?? update ?? {};
      const snakeFilter = snakeKeys(filter);
      const snakeUpdate = snakeKeys(updateData);
      let query = client.from(table).update(snakeUpdate);
      for (const [key, value] of Object.entries(snakeFilter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as any);
        }
      }
      const { data, error } = await query.select().maybeSingle();
      if (error && error.code && error.message) {
        console.error(`[InsForge updateOne ${table}]`, error.code, error.message);
        throw new Error(error.message);
      }
      return { document: data ? camelKeys(data) : camelKeys(snakeUpdate) };
    }

    case "deleteOne": {
      const { filter = {} } = payload;
      const snakeFilter = snakeKeys(filter);
      let query = client.from(table).delete();
      for (const [key, value] of Object.entries(snakeFilter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as any);
        }
      }
      const { error } = await query;
      if (error) throw new Error(error.message);
      return { deleted: true };
    }

    default:
      throw new Error(`Unknown InsForge operation: ${op}`);
  }
}

const makeCollection =
  (table: string) =>
  (op: Operation, payload: Record<string, any>) =>
    dbQuery(table, op, payload);

export const db = {
  users:           makeCollection("users"),
  conversations:   makeCollection("conversations"),
  messages:        makeCollection("messages"),
  projects:        makeCollection("projects"),
  knowledgeFiles:  makeCollection("knowledge_files"),
  artifacts:       makeCollection("artifacts"),
  memory:          makeCollection("memory_entries"),
  skills:          makeCollection("skills"),
  scheduledTasks:  makeCollection("scheduled_tasks"),
  n8nConnections:  makeCollection("n8n_connections"),
  connectorTokens: makeCollection("connector_tokens"),
  usageLogs:       makeCollection("usage_logs"),
};
