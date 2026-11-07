"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Search, ArrowRight, LayoutTemplate } from "lucide-react";
import { buildIndustryPresetFieldKey, type IndustryPreset } from "@/lib/crm/industry-presets";

export function IndustryPresetManager({ presets }: { presets: IndustryPreset[] }) {
  const router = useRouter();
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState(presets[0]?.id ?? "");
  const [fields,setFields] = useState<string[]>(()=>presets[0]?.customFields.map(buildIndustryPresetFieldKey)??[]);
  const [existing,setExisting] = useState<{key:string;type:string;archived:boolean}[]>([]);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [applied,setApplied] = useState("");
  const preset = presets.find(p=>p.id===selected);
  const visible = useMemo(()=>presets.filter(p=>(p.name+" "+p.description).toLowerCase().includes(query.toLowerCase())),[presets,query]);
  useEffect(()=>{let active=true; fetch('/api/admin/settings/industry-preset',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error("Current settings could not be loaded. Refresh before applying a preset.");return r.json()}).then(d=>{if(active){setExisting(d.fields);setApplied(d.presetId??"")}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
  function choose(id:string){setSelected(id);setFields(presets.find(p=>p.id===id)?.customFields.map(buildIndustryPresetFieldKey)??[]);setMessage("");setError("")}
  async function apply(){if(busy||!preset)return;setBusy(true);setError("");setMessage("");try{const r=await fetch('/api/admin/settings/industry-preset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({presetId:preset.id,fieldKeys:fields})});const d=await r.json();if(!r.ok)throw Error(d.error??"The preset could not be saved.");setApplied(preset.id);setMessage(`${preset.name} is ready. ${d.created.customFields} fields, ${d.created.sources} sources and ${d.created.stages} stages added. Existing records and field rules were kept.`);router.refresh()}catch(e){setError(e instanceof Error?e.message:"Please try again.")}finally{setBusy(false)}}
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="max-w-2xl"><h2 className="text-2xl font-semibold">Set up for your business</h2><p className="mt-2 text-sm leading-6 text-white/65">Choose an industry, then pick the fields your team needs. New fields start as optional, so staff can keep working while you finish setup.</p></div>
    {error?<p role="alert" className="rounded-xl border border-rose-400/30 p-4 text-sm">{error}</p>:null}
    {message?<p role="status" className="rounded-xl border border-emerald-400/30 p-4 text-sm">{message} <Link href="/settings/fields" className="underline">Review fields</Link></p>:null}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]">
      <section className="min-w-0 space-y-3" aria-label="Choose industry">
        <label className="admin-input flex min-h-12 items-center gap-3 px-4"><Search className="size-4 shrink-0"/><input aria-label="Search industries" className="min-w-0 w-full bg-transparent py-3 outline-none" placeholder="Search industries" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1">{visible.map(p=><button disabled={busy} key={p.id} aria-pressed={selected===p.id} onClick={()=>choose(p.id)} className={`ld-focus-ring flex min-h-16 items-center gap-3 rounded-xl border p-4 text-left ${selected===p.id?'border-[var(--ld-color-primary)] bg-white/10':'border-white/10 hover:bg-white/5'}`}><LayoutTemplate className="size-5 shrink-0 text-white/50"/><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{p.name}</span>{applied===p.id?<span className="mt-1 block text-xs text-emerald-300">Applied to this workspace</span>:null}</span>{selected===p.id?<Check className="size-4 shrink-0"/>:<ArrowRight className="size-4 shrink-0 text-white/30"/>}</button>)}{!visible.length?<p role="status" className="p-4 text-sm text-white/60">No industry matches “{query}”. Try another name.</p>:null}</div>
      </section>
      {preset?<section className="admin-surface min-w-0 rounded-2xl p-5 sm:p-6" aria-label="Industry setup preview"><h3 className="text-xl font-semibold">{preset.name}</h3><p className="mt-2 text-sm text-white/60">{preset.description}</p>
        <h4 className="mt-6 text-sm font-semibold">Your pipeline</h4><ol className="mt-3 flex flex-wrap gap-2">{preset.stages.map(s=><li key={s.value} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs"><span className="size-2 rounded-full" style={{background:s.color}}/>{s.label}</li>)}</ol><p className="mt-3 text-xs leading-5 text-white/60">Unqualified stays a separate product decision on the lead. Your existing stages remain available.</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Fields to add</h4><button className="min-h-11 text-xs underline" disabled={busy} onClick={()=>setFields(fields.length?[]:preset.customFields.map(buildIndustryPresetFieldKey))}>{fields.length?'Clear selection':'Select all'}</button></div>
        <div className="divide-y divide-white/10">{preset.customFields.map(f=>{const key=buildIndustryPresetFieldKey(f);const old=existing.find(e=>e.key===key);return <label key={key} className="flex min-h-16 items-start gap-3 py-4"><input className="mt-1 size-4 shrink-0" type="checkbox" disabled={busy||!!old} checked={!!old||fields.includes(key)} onChange={e=>setFields(v=>e.target.checked?[...v,key]:v.filter(k=>k!==key))}/><span className="min-w-0"><span className="block text-sm font-medium">{f.label}</span><span className="mt-1 block text-xs leading-5 text-white/55">{old?(old.archived?'Already exists, archived. Manage it in Fields.':`Already exists. Its ${old.type} type and rules will stay.`):(f.helpText||f.placeholder||`Optional ${f.fieldType.replace('_',' ')} field`)}</span>{f.options?.length?<span className="mt-1 block text-xs text-white/45">{f.options.map(o=>o.label).join(' · ')}</span>:null}</span></label>})}</div>
        <details className="mt-4 border-t border-white/10 py-4"><summary className="cursor-pointer text-sm">Lead sources ({preset.sources.length})</summary><p className="mt-3 text-sm leading-6 text-white/60">{preset.sources.map(s=>s.label).join(' · ')}</p></details>
        <button disabled={busy} onClick={()=>void apply()} className="admin-button-primary min-h-12 w-full px-5">{busy?'Saving industry setup…':`Apply ${preset.name}`}</button><p className="mt-3 text-xs leading-5 text-white/50">You can apply this again safely. Use Settings → Fields to make a field required or archive one you no longer use.</p>
      </section>:null}
    </div>
  </div>
}
