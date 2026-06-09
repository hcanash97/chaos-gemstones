// Shared Shopify sync types — importable in both server and client code.
// Do NOT import this file from shopify.server.ts (it's already defined there).
// Client components import from here; server code uses the locally defined versions.

export type SyncErrorEntry = {
  stone_id: string;
  cert_number: string | null;
  action: "create" | "update" | "archive";
  http_status: number | null;
  error: string;
};

export type SyncProgress = {
  phase: "preparing" | "upsert" | "archive" | "done";
  batch_current: number;
  batch_total: number;
  stones_processed: number;
  stones_total: number;
  added: number;
  updated: number;
  archived: number;
  errors: number;
};

export type SyncResult = {
  added: number;
  updated: number;
  archived: number;
  errors: string[];
  error_manifest: SyncErrorEntry[];
  total_stones: number;
  session_id: string;
};
