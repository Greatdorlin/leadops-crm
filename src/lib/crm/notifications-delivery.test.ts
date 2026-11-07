import test from "node:test";
import assert from "node:assert/strict";
import {notifyCrmEvent} from "./notifications";

test("notification webhooks have a deadline and cannot forward a payload through redirects",async()=>{
  const originalFetch=globalThis.fetch,previous=process.env.CRM_NOTIFICATION_WEBHOOK_URL;
  process.env.CRM_NOTIFICATION_WEBHOOK_URL="https://notifications.example.invalid/events";
  let called=false;
  globalThis.fetch=async(_input,options)=>{
    called=true;assert.equal(options?.redirect,"error");assert.ok(options?.signal instanceof AbortSignal);
    throw new Error("Expected provider failure");
  };
  try{await notifyCrmEvent("verification",{reference:"synthetic"});assert.ok(called)}
  finally{globalThis.fetch=originalFetch;if(previous===undefined)delete process.env.CRM_NOTIFICATION_WEBHOOK_URL;else process.env.CRM_NOTIFICATION_WEBHOOK_URL=previous}
});
