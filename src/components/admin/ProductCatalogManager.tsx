"use client";
import { useState, useRef } from "react";
import { useAdminWorkspaceSettings } from "./AdminWorkspaceSettingsProvider";
import { SUPPORTED_CURRENCIES, formatCurrencyValue } from "@/lib/currency";
export type ProductRow = {
  id: string;
  name: string;
  description: string;
  value: string | null;
  currency: string;
  probability: number;
};
export function ProductCatalogManager({ initial }: { initial: ProductRow[] }) {
  const settings = useAdminWorkspaceSettings();
  const [products, setProducts] = useState(initial);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [value, setValue] = useState(""),
    [currency, setCurrency] = useState(settings.globalCurrency),
    [probability, setProbability] = useState("50"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const guard = useRef(false);
  function edit(p: ProductRow | null) {
    setEditing(p);
    setName(p?.name ?? "");
    setDescription(p?.description ?? "");
    setValue(p?.value ?? "");
    setCurrency(p?.currency ?? settings.globalCurrency);
    setProbability(String(p?.probability ?? 50));
  }
  async function save(payload: unknown) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save.");
      setProducts(d.products);
      edit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="admin-surface rounded-3xl p-5">
        <h2 className="text-xl font-semibold">Products and offers</h2>
        <p className="mt-2 text-sm text-white/65">
          Preset values are suggestions when adding a product to a lead.
          Changing a preset never rewrites existing deals.
        </p>
        {products.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-white/5 p-4">
            <p className="text-sm">
              Start with your own products, or add three editable examples in
              your workspace currency.
            </p>
            <button
              disabled={busy}
              className="admin-button-secondary min-h-11 px-4 py-2 mt-3"
              onClick={() => void save({ preset: true })}
            >
              Add example products
            </button>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <article
              key={p.id}
              className="min-w-0 rounded-2xl border border-white/10 p-4"
            >
              <h3 className="break-words font-semibold">{p.name}</h3>
              <p className="mt-2 text-lg">
                {p.value === null
                  ? "Value not set"
                  : formatCurrencyValue(Number(p.value), p.currency)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {p.probability}% default probability
              </p>
              <p className="mt-2 break-words text-sm text-white/60">
                {p.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="admin-button-secondary min-h-11 px-4 py-2"
                  disabled={busy}
                  onClick={() => edit(p)}
                >
                  Edit product
                </button>
                <button
                  className="admin-button-secondary min-h-11 px-4 py-2"
                  disabled={busy}
                  onClick={() =>
                    void save({
                      ...p,
                      value: p.value === null ? null : Number(p.value),
                      archived: true,
                    })
                  }
                >
                  Archive
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-surface rounded-3xl p-5">
        <h2 className="text-xl font-semibold">
          {editing ? "Edit product" : "Add a product"}
        </h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save({
              ...(editing ? { id: editing.id } : {}),
              name,
              description,
              value: value === "" ? null : Number(value),
              currency,
              probability: Number(probability),
            });
          }}
        >
          <label className="text-sm sm:col-span-2">
            Product name
            <input
              className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label className="text-sm">
            Potential value
            <input
              type="number"
              min="0"
              max="1000000000000"
              step="0.01"
              className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="text-sm">
            Currency
            <select
              className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Default probability (%)
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
              required
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Description
            <textarea
              className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button
              disabled={busy}
              className="admin-button-primary min-h-11 px-4 py-2"
            >
              {busy ? "Saving…" : "Save product"}
            </button>
            {editing ? (
              <button
                type="button"
                disabled={busy}
                className="admin-button-secondary min-h-11 px-4 py-2"
                onClick={() => edit(null)}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
