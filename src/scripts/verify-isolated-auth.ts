import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import {totp} from "@/lib/security/totp";

async function main(){
 const url=new URL(process.env.DATABASE_URL||"");
 const base=process.env.SMOKE_BASE_URL||"http://127.0.0.1:3000";
 assert.ok(["127.0.0.1","localhost"].includes(url.hostname)&&/^\/leads_(review|test)/.test(url.pathname),"Use an isolated local test database.");
 assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base),"Use the isolated local app origin.");
 const db=postgres(url.toString(),{max:1,prepare:false});
 const email=`security-${randomBytes(8).toString("hex")}@example.invalid`,password=randomBytes(24).toString("base64url")+"7a";
 function client(){const cookies=new Map<string,string>();return async(path:string,options:RequestInit={})=>{
  const r=await fetch(base+path,{redirect:"manual",...options,signal:AbortSignal.timeout(60000),headers:{cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join("; "),...options.headers}});
  for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(";")[0],i=pair.indexOf("=");cookies.set(pair.slice(0,i),pair.slice(i+1))}return r;
 }}
 async function login(code=""){const request=client();const csrf=await (await request("/api/auth/csrf")).json();assert.ok(csrf.csrfToken);const response=await request("/api/auth/callback/credentials",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",origin:base},body:new URLSearchParams({csrfToken:csrf.csrfToken,email,password,code,json:"true",callbackUrl:base+"/profile"})});const result=await response.json();return {request,accepted:!String(result.url).includes("error=")}}
 async function post(request:ReturnType<typeof client>,body:unknown){return request("/api/auth/mfa",{method:"POST",headers:{"content-type":"application/json",origin:base},body:JSON.stringify(body)})}
 try{
  assert.equal((await client()("/api/admin/forms")).status,401);
  const hash=await bcrypt.hash(password,12);
  const [user]=await db`insert into crm_users(email,full_name,role,is_active) values(${email},'Isolated owner verification','admin',true) returning id`;
  await db`insert into user_credentials(user_id,password_hash) values(${user.id},${hash})`;
  const initial=await login();assert.ok(initial.accepted,"Owner password login");
  assert.equal((await initial.request("/api/admin/forms")).status,200,"Owner authorized API");
  const status=await initial.request("/api/auth/mfa");assert.equal(status.status,200);assert.ok((await status.json()).available);
  const setup=await post(initial.request,{op:"begin",password});assert.equal(setup.status,200);const {secret}=await setup.json();assert.ok(secret);
  const enabled=await post(initial.request,{op:"enable",code:totp(secret,Math.floor(Date.now()/30000))});assert.equal(enabled.status,200);const {recoveryCodes}=await enabled.json();assert.equal(recoveryCodes.length,10);
  assert.equal((await initial.request("/api/auth/mfa")).status,401,"Prior session revoked");
  assert.equal((await login("incorrect")).accepted,false,"Wrong factor rejected");
  const recovery=await login(recoveryCodes[0]);assert.ok(recovery.accepted,"Recovery login");
  assert.equal((await login(recoveryCodes[0])).accepted,false,"Recovery cannot be reused");
  const disabled=await post(recovery.request,{op:"disable",password,code:recoveryCodes[1]});assert.equal(disabled.status,200);
  assert.equal((await recovery.request("/api/auth/mfa")).status,401,"Factor removal revokes session");
  const final=await login();assert.ok(final.accepted);
  const csrf=await (await final.request("/api/auth/csrf")).json();
  await final.request("/api/auth/signout",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",origin:base},body:new URLSearchParams({csrfToken:csrf.csrfToken,json:"true"})});
  assert.equal((await final.request("/api/admin/forms")).status,401,"Logout revokes access");
  console.log(JSON.stringify({passed:true,checks:["anonymous_api_denied","owner_password_login","owner_authorized_api","mfa_enrollment","ten_recovery_codes","prior_session_revocation","wrong_factor_rejection","recovery_login","recovery_replay_rejection","mfa_disable","session_revocation_after_disable","logout"],productionAccessed:false}));
 }finally{await db.end()}
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Isolated authentication verification failed.");process.exitCode=1});
