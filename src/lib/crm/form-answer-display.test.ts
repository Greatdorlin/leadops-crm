import assert from "node:assert/strict";
import test from "node:test";
import { displaySavedFormAnswers } from "./form-answer-display";
import { canOpenPublicForm } from "./public-form";

test("saved answers retain enquiry text, zero and false while excluding unknown metadata", () => {
  const fields = [{id:"question",label:"How can we help?"},{id:"count",label:"Count"},{id:"consent",label:"Consent"}];
  assert.deepEqual(displaySavedFormAnswers(fields, {question:"Need a CRM",count:0,consent:false, ip:"private", token:"secret"}), [
    {label:"How can we help?",value:"Need a CRM"}, {label:"Count",value:"0"}, {label:"Consent",value:"No"},
  ]);
  assert.deepEqual(displaySavedFormAnswers(fields, {question:{unsafe:"object"}}), []);
});

test("form view requires active public access and at least one supported visible field", () => {
  const active = {status:"active",isActive:true,isPublic:true};
  assert.equal(canOpenPublicForm(active, 1), true);
  assert.equal(canOpenPublicForm(active, 0), false);
  for (const patch of [{status:"draft"},{status:"archived"},{isActive:false},{isPublic:false}]) {
    assert.equal(canOpenPublicForm({...active,...patch}, 2), false);
  }
});
