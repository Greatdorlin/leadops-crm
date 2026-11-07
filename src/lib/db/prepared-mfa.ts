import type {MigrationSession} from "./migrations";

const columns: Record<string,{type:string;nullable:string;defaultToken?:string}> = {
  mfa_secret_cipher:{type:"text",nullable:"YES"},
  mfa_pending_cipher:{type:"text",nullable:"YES"},
  mfa_pending_expires_at:{type:"timestamp with time zone",nullable:"YES"},
  mfa_enabled_at:{type:"timestamp with time zone",nullable:"YES"},
  mfa_last_step:{type:"integer",nullable:"NO",defaultToken:"-1"},
  mfa_failed_count:{type:"integer",nullable:"NO",defaultToken:"0"},
  mfa_locked_until:{type:"timestamp with time zone",nullable:"YES"},
  mfa_recovery_hashes:{type:"jsonb",nullable:"NO",defaultToken:"[]"},
  mfa_changed_at:{type:"timestamp with time zone",nullable:"YES"},
};

/** Explicit operator-only reconciliation of the previously prepared additive MFA schema.
 * Existing journal hashes never change. No general "ignore existing DDL" option exists.
 */
export async function preparedMfaExists(session:MigrationSession, version:32|33) {
  const result = await session.execute("SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='user_credentials' AND column_name LIKE 'mfa_%'");
  type Column={column_name:string;data_type:string;is_nullable:string;column_default:string|null};
  const rows=(Array.isArray(result)?result:(result as {rows:Column[]}).rows) as Column[];
  const names=version===33?["mfa_changed_at"]:Object.keys(columns).filter(name=>name!=="mfa_changed_at");
  const present=rows.filter(row=>names.includes(row.column_name));
  if(!present.length)return false;
  if(present.length!==names.length)throw new Error("Prepared MFA schema is incomplete. Reconciliation refused.");
  for(const row of present){
    const expected=columns[row.column_name];
    if(row.data_type!==expected.type||row.is_nullable!==expected.nullable||
      (expected.defaultToken && row.column_default?.replace(/::.*$/, "").replace(/[()'"\s]/g, "") !== expected.defaultToken)) {
      throw new Error("Prepared MFA schema differs from the release. Reconciliation refused.");
    }
  }
  return true;
}
