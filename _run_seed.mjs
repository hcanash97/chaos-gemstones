import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
let sql = fs.readFileSync('/tmp/seed2.sql','utf8');
// strip BEGIN/COMMIT
sql = sql.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
const { data, error } = await sb.rpc('_tmp_exec_seed', { sql });
if (error) { console.error('ERROR', error); process.exit(1); }
console.log('OK');
// Verify
const { count: stoneCount } = await sb.from('stones').select('*', { count:'exact', head:true });
const { count: imgCount } = await sb.from('stone_images').select('*', { count:'exact', head:true });
console.log('stones:', stoneCount, 'images:', imgCount);
