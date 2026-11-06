import test,{before,after} from "node:test";
import assert from "node:assert/strict";
import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import {eq} from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import {applyMigrations,type MigrationSession} from "@/lib/db/migrations";
import {changeWorkspaceCurrency, getExchangeRateQuote, resolveExchangeRate} from "./currency-exchange";
const client=new PGlite();
const db=drizzle(client,{schema});
function session(c:PGlite):MigrationSession{return {execute:(q,p=[])=>c.query(q,p),applied:async()=>(await c.query<{hash:string;created_at:string}>("select hash,created_at from drizzle.__drizzle_migrations order by created_at")).rows,transaction:work=>c.transaction(t=>work(session(t as unknown as PGlite))) };}
before(async()=>{await applyMigrations(session(client));Object.assign(globalThis,{__leadsDeskDb:db});});
after(async()=>{Reflect.deleteProperty(globalThis,"__leadsDeskDb");await client.close();});
test("changing reporting currency converts lead totals and offer rates while preserving original amounts",async()=>{
 await db.delete(schema.companySettings);
 await db.insert(schema.companySettings).values({globalCurrency:"USD"});
 const [lead]=await db.insert(schema.leads).values({firstName:"Currency",source:"manual_entry",estimatedValue:"100.00",expectedValue:"50.00",wonValue:"0.00"}).returning();
 await db.insert(schema.leadOpportunities).values([{leadId:lead.id,offerLabel:"USD offer",status:"qualified",estimatedValue:"100.00",expectedValue:"50.00",currency:"USD",closeProbability:50},{leadId:lead.id,offerLabel:"EUR offer",status:"active",estimatedValue:"200.00",expectedValue:"100.00",currency:"EUR",closeProbability:50,exchangeRateToGlobal:"1.20000000"}]);
 await db.insert(schema.productCatalog).values({name:"Original product",value:"1000.00",currency:"USD"});
 await changeWorkspaceCurrency({nextCurrency:"GBP",exchangeRate:0.8});
 const [converted]=await db.select().from(schema.leads).where(eq(schema.leads.id,lead.id));
 assert.equal(Number(converted.estimatedValue),80);assert.equal(Number(converted.expectedValue),40);
 const offers=await db.select().from(schema.leadOpportunities).where(eq(schema.leadOpportunities.leadId,lead.id));
 assert.equal(Number(offers.find(o=>o.currency==="USD")?.estimatedValue),100);
 assert.equal(Number(offers.find(o=>o.currency==="USD")?.exchangeRateToGlobal),0.8);
 assert.equal(Number(offers.find(o=>o.currency==="EUR")?.exchangeRateToGlobal),0.96);
 assert.equal((await db.select().from(schema.companySettings))[0].globalCurrency,"GBP");
 assert.equal((await db.select().from(schema.productCatalog))[0].currency,"USD");
 await changeWorkspaceCurrency({nextCurrency:"USD",exchangeRate:1.25});
 assert.equal(Number((await db.select().from(schema.leads).where(eq(schema.leads.id,lead.id)))[0].expectedValue),50);
 assert.equal((await db.select().from(schema.leadOpportunities).where(eq(schema.leadOpportunities.leadId,lead.id))).find(o=>o.currency==="USD")?.exchangeRateToGlobal,null);
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error("provider unavailable");};
 try { await assert.rejects(()=>changeWorkspaceCurrency({nextCurrency:"JPY"}),/rate/); }
 finally {globalThis.fetch=originalFetch;}
 assert.equal((await db.select().from(schema.companySettings))[0].globalCurrency,"USD");
 assert.equal(Number((await db.select().from(schema.leads).where(eq(schema.leads.id,lead.id)))[0].estimatedValue),100);
});

test("automatic rates are fetched, persisted, reused and can replace an explicit override",async()=>{
 const originalFetch=globalThis.fetch; let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({base:"USD",quote:"CAD",date:new Date().toISOString().slice(0,10),rate:1.35});};
 try {
  const first=await getExchangeRateQuote("USD","CAD");assert.equal(first?.rate,1.35);assert.equal(first?.source,"automatic");
  assert.equal(await resolveExchangeRate("USD","CAD"),1.35);assert.equal(calls,1);
  await db.update(schema.currencyExchangeRates).set({rate:"1.40000000",source:"manual"}).where(eq(schema.currencyExchangeRates.quoteCurrency,"CAD"));
  assert.equal(await resolveExchangeRate("USD","CAD"),1.4);assert.equal(calls,1);
  assert.equal((await getExchangeRateQuote("USD","CAD",undefined,true))?.rate,1.35);assert.equal(calls,2);
  await db.update(schema.currencyExchangeRates).set({updatedAt:new Date(0)}).where(eq(schema.currencyExchangeRates.quoteCurrency,"CAD"));
  globalThis.fetch=async()=>{throw new Error("offline");};
  assert.equal(await resolveExchangeRate("USD","CAD"),1.35);
  assert.equal(await getExchangeRateQuote("USD","CAD",undefined,true),null);
  await db.update(schema.currencyExchangeRates).set({fetchedAt:new Date(0)}).where(eq(schema.currencyExchangeRates.quoteCurrency,"CAD"));
  assert.equal(await resolveExchangeRate("USD","CAD"),null);
 } finally {globalThis.fetch=originalFetch;}
});
