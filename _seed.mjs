import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const sql = fs.readFileSync('/tmp/seed2.sql','utf8');
// Split by ; at line ends; skip BEGIN/COMMIT
const stmts = sql.split(/;\s*\n/).map(s=>s.trim()).filter(s=>s && !/^(BEGIN|COMMIT)$/i.test(s));
console.log('statements:', stmts.length);
// Use rpc not available; use direct via PostgREST? No. Use pg via fetch to Supabase? No.
// Easier: write a SECURITY DEFINER function. Skip — just run via http to /rest? Not for arbitrary SQL.
// Use postgres-meta? Not available. Fall back: psql via service role connection string? PGPASSWORD is service-role DB password.
// Actually try using supabase pg connection with service-role-style perms — psql already failed because PGUSER lacks privilege.
// SOLUTION: run as supabase_admin via DB URL. SUPABASE_DB_URL secret should be present.
