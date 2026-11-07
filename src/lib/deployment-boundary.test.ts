import assert from "node:assert/strict";
import test from "node:test";
import {isProtectedLoginRedirect} from "../../scripts/deployment-boundary.mjs";

test("deployment smoke recognizes explicit streaming redirects without accepting a normal successful page",()=>{
 const base="https://crm.example.test";
 assert.equal(isProtectedLoginRedirect(307,"/login?callbackUrl=%2Fdashboard","",base),true);
 assert.equal(isProtectedLoginRedirect(200,null,'<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/login?callbackUrl=%2Fdashboard"/>',base),true);
 for(const [status,location,html] of [[200,null,'<a href="/login">Login</a>'],[200,null,'<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=https://evil.example/login"/>'],[500,null,'NEXT_REDIRECT /login'],[307,"https://evil.example/login",""]] as const)assert.equal(isProtectedLoginRedirect(status,location,html,base),false);
});
