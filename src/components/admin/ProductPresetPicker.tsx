"use client";
import { useState } from "react";
import type { ProductRow } from "./ProductCatalogManager";
export function ProductPresetPicker({
  onSelect,
}: {
  onSelect: (product: ProductRow) => void;
}) {
  const [products, setProducts] = useState<ProductRow[] | null>(null),
    [error, setError] = useState("");
  return (
    <div className="space-y-2">
      {products === null ? (
        <button
          type="button"
          className="admin-button-secondary min-h-11 px-4 py-2"
          onClick={() => {
            setError("");
            fetch("/api/admin/products")
              .then(async (r) => {
                if (!r.ok) throw new Error();
                setProducts((await r.json()).products);
              })
              .catch(() =>
                setError("Could not load preset products. Try again."),
              );
          }}
        >
          Add a preset product
        </button>
      ) : (
        <label className="block text-sm">
          Preset product
          <select
            className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
            value=""
            onChange={(e) => {
              const p = products.find((p) => p.id === e.target.value);
              if (p) onSelect(p);
            }}
          >
            <option value="">
              {products.length ? "Choose a product" : "No preset products yet"}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <a
        href="/settings/products"
        className="block text-xs text-white/60 underline"
      >
        Manage products and preset values
      </a>
      {error ? (
        <p role="alert" className="text-xs text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
