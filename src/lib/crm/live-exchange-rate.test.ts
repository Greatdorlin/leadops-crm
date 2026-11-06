import test from "node:test";
import assert from "node:assert/strict";
import { fetchLiveExchangeRate } from "./live-exchange-rate";
test("live reference rates validate pair, date, amount and provider responses",async()=>{
 const old=globalThis.fetch;
 try {
  globalThis.fetch=async()=>Response.json({base:"USD",quote:"GBP",date:new Date().toISOString().slice(0,10),rate:.75});
  assert.equal((await fetchLiveExchangeRate("USD","GBP")).rate,.75);
  for(const change of [{rate:0},{rate:"0.75"},{base:"EUR"},{date:"2000-01-01"},{date:"2099-01-01"}]) {
   globalThis.fetch=async()=>Response.json({base:"USD",quote:"GBP",date:new Date().toISOString().slice(0,10),rate:.75,...change});
   await assert.rejects(()=>fetchLiveExchangeRate("USD","GBP"));
  }
  globalThis.fetch=async()=>new Response(null,{status:503});
  await assert.rejects(()=>fetchLiveExchangeRate("USD","GBP"));
  await assert.rejects(()=>fetchLiveExchangeRate("BAD","GBP"));
 } finally {globalThis.fetch=old;}
});
