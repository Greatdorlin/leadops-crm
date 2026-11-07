import postgres from 'postgres';

// Run with the application's runtime DATABASE_URL, never the migration role.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required.');
const db = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
try {
  const report = await db.begin('read only', async tx => {
    const [role] = await tx`select current_user as role, rolsuper as superuser, rolbypassrls as bypass_rls, rolcreaterole as create_role from pg_roles where rolname = current_user`;
    const tables = await tx`select c.relname as table, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls, pg_get_userbyid(c.relowner) = current_user as owned_by_runtime, row_security_active(c.oid) as enforced_for_runtime, (select count(*)::integer from pg_policy p where p.polrelid=c.oid) as policies from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname`;
    return {role, tables};
  });
  const failures = [];
  if (report.role.superuser || report.role.bypass_rls || report.role.create_role) failures.push('Runtime role has privileged capabilities.');
  for (const table of report.tables) {
    if (!table.enforced_for_runtime || table.policies === 0) failures.push(`${table.table}: row security is not enforced with policies for this connection.`);
  }
  if (!report.tables.length) failures.push('No application tables were found.');
  console.log(JSON.stringify({...report, passed: failures.length===0, failures}, null, 2));
  if (failures.length) process.exitCode=1;
} catch {
  console.error('Database security audit could not connect or read metadata. Check database access; no security certification was produced.');
  process.exitCode=1;
} finally { await db.end({timeout:5}); }
