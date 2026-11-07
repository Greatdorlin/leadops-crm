import assert from "node:assert/strict";
import test from "node:test";
import {isSameWorkspaceOrigin} from "./same-origin";

test("workspace writes use the configured public origin behind a proxy",()=>{
 const make=(origin?:string)=>new Request("http://localhost:3000/api/action",{headers:origin?{origin}:undefined});
 const environment={NEXTAUTH_URL:"https://crm.example.test"};
 assert.equal(isSameWorkspaceOrigin(make("https://crm.example.test"),environment),true);
 for(const bad of [undefined,"null","https://evil.example.test","https://crm.example.test/","https://crm.example.test.evil.test","https://user@crm.example.test"]){assert.equal(isSameWorkspaceOrigin(make(bad),environment),false)}
 assert.equal(isSameWorkspaceOrigin(make("http://localhost:3000"),{}),true);
 assert.equal(isSameWorkspaceOrigin(make("https://evil.example.test"),{}),false);
});
