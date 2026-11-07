import {randomBytes,randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
import postgres from "postgres";
import {encryptMessage,decryptMessage} from "@/lib/inbox/crypto";

function isolated(value:string|undefined){
  if(!value)throw new Error("Both isolated database URLs are required.");
  const u=new URL(value);
  if(!["127.0.0.1","localhost","[::1]"].includes(u.hostname)||!/^\/leads_(review|restore|test)[a-z0-9_]*$/.test(u.pathname))throw new Error("Recovery verification accepts only explicitly named local test databases.");
  return u;
}
const source=isolated(process.env.DATABASE_URL),target=isolated(process.env.RESTORE_DATABASE_URL);
assert.notEqual(source.pathname,target.pathname,"Source and restore databases must differ.");
const db=postgres(source.toString(),{max:1,prepare:false}),restored=postgres(target.toString(),{max:1,prepare:false});
const keyBefore=process.env.CRM_INBOX_DATA_KEY;
const key=randomBytes(32).toString("base64");process.env.CRM_INBOX_DATA_KEY=key;
const tables=["crm_users","user_credentials","leads","lead_notes","lead_tasks","lead_opportunities","lead_events","workspace_audit_logs","inbox_threads","inbox_participants","inbox_messages"];
async function fingerprint(connection:ReturnType<typeof postgres>){const result:Record<string,unknown>={};for(const table of tables){const rows=await connection.unsafe(`select count(*)::int as records,md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb)::text) as digest from ${table} t`);result[table]=rows[0]}return result}
function pgEnv(u:URL){return {...process.env,PGHOST:u.hostname,PGPORT:u.port||"5432",PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:u.pathname.slice(1)}}
function command(name:string,args:string[],u:URL){const r=spawnSync(name,args,{env:pgEnv(u),encoding:"utf8"});if(r.status!==0)throw new Error(`${name} failed; restore verification stopped.`);return r.stdout.trim()}
try{
 const [empty]=await restored`select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`;assert.equal(empty.n,0,"Restore target must be empty.");
 const u=randomUUID(),lead=randomUUID(),thread=randomUUID(),message=randomUUID();
 await db.begin(async tx=>{
  await tx`insert into crm_users(id,email,full_name,role,is_active) values(${u},${`recovery-${u}@example.invalid`},'Isolated recovery fixture','sales_rep',true)`;
  await tx`insert into user_credentials(user_id,password_hash) values(${u},'isolated-non-login-fixture')`;
  await tx`insert into leads(id,first_name,email,assigned_user_id,estimated_value) values(${lead},'Isolated restore',${`lead-${lead}@example.invalid`},${u},12500)`;
  await tx`insert into lead_notes(lead_id,note,created_by) values(${lead},'Recovery note','isolated-review')`;
  await tx`insert into lead_tasks(lead_id,title,created_by) values(${lead},'Recovery follow-up','isolated-review')`;
  await tx`insert into lead_opportunities(lead_id,offer_label,estimated_value,currency) values(${lead},'Recovery opportunity',12500,'NGN')`;
  await tx`insert into lead_events(lead_id,event_type,event_data) values(${lead},'lead_created',${tx.json({source:"isolated-recovery"})})`;
  await tx`insert into workspace_audit_logs(event_type,actor_email,target_type,target_id) values('recovery.fixture','isolated@example.invalid','lead',${lead})`;
  await tx`insert into inbox_threads(id,channel,subject_cipher,created_by) values(${thread},'team',${encryptMessage("Restore conversation",`thread:${thread}`)},${u})`;
  await tx`insert into inbox_participants(thread_id,user_id) values(${thread},${u})`;
  await tx`insert into inbox_messages(id,thread_id,request_id,sender_user_id,content_cipher) values(${message},${thread},${randomUUID()},${u},${encryptMessage({text:"Encrypted restore fixture"},`message:${message}`)})`;
 });
 const before=await fingerprint(db);
 command("pg_dump",["--format=custom","--no-owner","--file=/tmp/leads-isolated-recovery.dump"],source);
 command("pg_restore",["--exit-on-error","--no-owner","--dbname",target.pathname.slice(1),"/tmp/leads-isolated-recovery.dump"],target);
 assert.deepEqual(await fingerprint(restored),before);
 const [row]=await restored`select content_cipher from inbox_messages where id=${message}`;
 assert.deepEqual(decryptMessage(row.content_cipher,`message:${message}`),{text:"Encrypted restore fixture"});
 process.env.CRM_INBOX_DATA_KEY=randomBytes(32).toString("base64");delete process.env.CRM_INBOX_PREVIOUS_ENCRYPTION_KEYS;
 assert.throws(()=>decryptMessage(row.content_cipher,`message:${message}`));
 process.env.CRM_INBOX_DATA_KEY=key;
 assert.deepEqual(decryptMessage(row.content_cipher,`message:${message}`),{text:"Encrypted restore fixture"});
 console.log(JSON.stringify({passed:true,node:process.version,postgres:(await db`show server_version`)[0].server_version,pgDump:command("pg_dump",["--version"],source),tables:before,encryptedMessageAccessible:true,wrongKeyRejected:true,productionAccessed:false},null,2));
}finally{if(keyBefore===undefined)delete process.env.CRM_INBOX_DATA_KEY;else process.env.CRM_INBOX_DATA_KEY=keyBefore;await db.end();await restored.end()}
