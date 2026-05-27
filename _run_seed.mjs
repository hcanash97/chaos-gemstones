import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const dummyIds = [
 '11111111-1111-1111-1111-111111111111',
 '22222222-2222-2222-2222-222222222222',
 '33333333-3333-3333-3333-333333333333',
 '44444444-4444-4444-4444-444444444444',
 '55555555-5555-5555-5555-555555555555',
 '66666666-6666-6666-6666-666666666666',
];
// Clean up dummies first
const cleanup = `
DELETE FROM public.stone_images WHERE stone_id IN (SELECT id FROM public.stones WHERE dealer_id = ANY(ARRAY['${dummyIds.join("','")}']::uuid[]));
DELETE FROM public.stones WHERE dealer_id = ANY(ARRAY['${dummyIds.join("','")}']::uuid[]);
DELETE FROM public.dealer_profiles WHERE id = ANY(ARRAY['${dummyIds.join("','")}']::uuid[]);
DELETE FROM public.profiles WHERE id = ANY(ARRAY['${dummyIds.join("','")}']::uuid[]);
`;
let { error } = await sb.rpc('_tmp_exec_seed', { sql: cleanup });
if (error) { console.error('cleanup ERROR', error); process.exit(1); }
console.log('cleanup OK');

let sql = fs.readFileSync('/tmp/seed2.sql','utf8');
sql = sql.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
({ error } = await sb.rpc('_tmp_exec_seed', { sql }));
if (error) { console.error('seed ERROR', error); process.exit(1); }
console.log('seed OK');
const { count: stoneCount } = await sb.from('stones').select('*', { count:'exact', head:true });
const { count: imgCount } = await sb.from('stone_images').select('*', { count:'exact', head:true });
const { count: dealerCount } = await sb.from('dealer_profiles').select('*', { count:'exact', head:true });
console.log({ stoneCount, imgCount, dealerCount });
