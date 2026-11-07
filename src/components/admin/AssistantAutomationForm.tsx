"use client";

import {useEffect,useRef,useState} from "react";
import {send} from "./assistant-client";

type Option={id:string;label:string|null};
type Choices={owners:Option[];stages:Option[];sources:Option[]};
const priorities=["low","medium","high","urgent"].map(id=>({id,label:id[0].toUpperCase()+id.slice(1)}));
const types=[{id:"direct",label:"Individual"},{id:"business",label:"Company"}];
export function AssistantAutomationForm({onPrepared,onClose}:{onPrepared:()=>Promise<void>;onClose:()=>void}) {
  const [choices,setChoices]=useState<Choices|null>(null);
  const [field,setField]=useState("priority"),[value,setValue]=useState("high");
  const [action,setAction]=useState("set_priority"),[target,setTarget]=useState("urgent");
  const [error,setError]=useState(""),[busy,setBusy]=useState(false);
  const requestId=useRef<string|null>(null);
  useEffect(()=>{let active=true;send({op:"automation_context"}).then(data=>{if(active)setChoices(data)}).catch(()=>{if(active)setError("Could not load automation options. Close this form and try again.")});return()=>{active=false}},[]);
  if(!choices)return <div className="rounded-2xl border border-white/10 p-4"><p role="status">{error||"Loading automation options…"}</p><button onClick={onClose} className="mt-3 underline">Close</button></div>;
  const conditions=field==="source"?choices.sources:field==="stage"?choices.stages:field==="customer_type"?types:priorities;
  const targets=action==="assign_owner"?choices.owners:action==="set_stage"?choices.stages:priorities;
  const conditionLabel=field==="country"?value:conditions.find(item=>item.id===value)?.label;
  const actionLabel=action==="assign_owner"?"Assign to":action==="set_stage"?"Move to":"Set priority to";
  const targetLabel=targets.find(item=>item.id===target)?.label;
  const summary=`When ${field.replaceAll("_"," ")} is ${conditionLabel||"…"}, ${actionLabel.toLowerCase()} ${targetLabel||"…"}.`;
  return <form className="space-y-4 rounded-2xl border border-white/10 p-4 sm:p-5" onSubmit={async event=>{
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    try{requestId.current??=crypto.randomUUID();await send({op:"propose",requestId:requestId.current,action:{kind:"automation",rule:{name:summary.slice(0,100),conditionField:field,conditionOperator:"equals",conditionValue:value,actionType:action,actionValue:target,isActive:true,sortOrder:0}}});await onPrepared();onClose()}catch(e){setError(e instanceof Error?e.message:"Could not prepare this rule.")}finally{setBusy(false)}
  }}>
    <h2 className="text-lg font-semibold">Create an automation</h2>
    <p className="text-sm text-white/60">This rule will run when a new lead is created. Review it below before it is saved.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">When<select className="admin-input mt-2 min-h-11 w-full px-3" value={field} onChange={e=>{setField(e.target.value);setValue("");requestId.current=null}}><option value="priority">Priority</option><option value="source">Source</option><option value="stage">Stage</option><option value="country">Country</option><option value="customer_type">Lead type</option></select></label>
      <label className="text-sm">Is{field==="country"?<input required maxLength={160} className="admin-input mt-2 min-h-11 w-full px-3" value={value} onChange={e=>{setValue(e.target.value);requestId.current=null}} placeholder="Nigeria"/>:<select required className="admin-input mt-2 min-h-11 w-full px-3" value={value} onChange={e=>{setValue(e.target.value);requestId.current=null}}><option value="">Choose…</option>{conditions.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>}</label>
      <label className="text-sm">Then<select className="admin-input mt-2 min-h-11 w-full px-3" value={action} onChange={e=>{setAction(e.target.value);setTarget("");requestId.current=null}}><option value="assign_owner">Assign owner</option><option value="set_stage">Move to stage</option><option value="set_priority">Set priority</option></select></label>
      <label className="text-sm">{actionLabel}<select required className="admin-input mt-2 min-h-11 w-full px-3" value={target} onChange={e=>{setTarget(e.target.value);requestId.current=null}}><option value="">Choose…</option>{targets.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    </div>
    <p className="text-sm">{summary}</p>
    {error?<p role="alert" className="text-sm text-rose-200">{error}</p>:null}
    <div className="flex flex-wrap gap-3"><button disabled={busy||!value||!target} className="admin-button-primary min-h-11 px-4 text-sm">{busy?"Preparing…":"Review automation"}</button><button disabled={busy} type="button" onClick={onClose} className="admin-button-secondary min-h-11 px-4 text-sm">Cancel</button></div>
  </form>;
}
