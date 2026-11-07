import { NextResponse } from 'next/server';
import { getAdminRequestContext } from '@/lib/admin';
import { verifyUserPassword } from '@/lib/auth-credentials';
import { mfaStatus, startMfa, checkMfa } from '@/lib/security/mfa';
import { readBoundedJsonObject } from '@/lib/http/bounded-body';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET() { const c = await getAdminRequestContext(); if (!c?.crmUser || c.requestedAccessLevel)
    return NextResponse.json({ error: 'Sign in as yourself.' }, { status: 401, headers }); return NextResponse.json(await mfaStatus(c.crmUser.id), { headers }); }
export async function POST(request: Request) {
    if (request.headers.get('origin') !== new URL(request.url).origin)
        return NextResponse.json({ error: 'Open this action from your workspace.' }, { status: 403, headers });
    const c = await getAdminRequestContext();
    if (!c?.crmUser || c.requestedAccessLevel)
        return NextResponse.json({ error: 'Sign in as yourself.' }, { status: 401, headers });
    const body = await readBoundedJsonObject(request, 4096);
    if (!body.ok)
        return NextResponse.json({ error: body.error }, { status: body.status, headers });
    const p = body.value;
    const code = typeof p.code === 'string' ? p.code.trim().slice(0, 32) : '';
    try {
        if (p.op === 'begin' || p.op === 'disable') {
            if (typeof p.password !== 'string' || p.password.length > 128 || !(await verifyUserPassword(c.crmUser.email, p.password)))
                return NextResponse.json({ error: 'Check your password and try again.' }, { status: 400, headers });
        }
        if (p.op === 'begin')
            return NextResponse.json({ secret: await startMfa(c.crmUser.id) }, { headers });
        if (p.op === 'enable' || p.op === 'disable') {
            const result = await checkMfa(c.crmUser.id, code, p.op);
            if (!result.ok)
                return NextResponse.json({ error: 'Code not accepted. Use a fresh code. Repeated attempts are locked for 15 minutes.' }, { status: 400, headers });
            return NextResponse.json({ ok: true, recoveryCodes: result.recoveryCodes }, { headers });
        }
        return NextResponse.json({ error: 'Choose a valid action.' }, { status: 400, headers });
    }
    catch {
        return NextResponse.json({ error: 'Two-factor setup is unavailable. Check the workspace encryption configuration.' }, { status: 503, headers });
    }
}
