import test from "node:test";
import assert from "node:assert/strict";
import { CORE_PIPELINE_STAGE_KEYS, PRODUCT_QUALIFICATION_ACTION, partitionPipelineStageOptions } from "./pipeline-stage-options";
test("major stages and product qualification stay concise while configured stages remain available", () => {
  const options = [...CORE_PIPELINE_STAGE_KEYS.map(key => ({value: key, key, label: key})), {value: "legacy", key:"property_viewing", label:"Property viewing"}, {value:PRODUCT_QUALIFICATION_ACTION,key:"unqualified",label:"Unqualified"}];
  const result=partitionPipelineStageOptions(options);
  assert.equal(result.primary.length,7);
  assert.equal(result.primary.at(-1)?.value,PRODUCT_QUALIFICATION_ACTION);
  assert.deepEqual(result.additional.map(o=>o.value),["legacy"]);
  assert.equal(options.length,8);
});
test("the current configured stage stays visible without losing its saved identifier",()=>{
  const stage={value:"legacy-id",key:"quoted",label:"Quoted"};
  assert.deepEqual(partitionPipelineStageOptions([stage],"legacy-id").primary,[stage]);
});
