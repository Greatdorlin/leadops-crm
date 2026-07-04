"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { GlassSurface } from "./ui/GlassSurface";
import { SmoothButton } from "./ui/SmoothButton";

export function FormEmbedCode({ formId }: { formId: string }) {
  const [codes, setCodes] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function loadEmbedCode() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/forms/${formId}/embed`);
      const data = await res.json();
      setCodes({
        iframe: data.iframeCode || "",
        script: data.scriptCode || "",
        wordpress: data.wordpressCode || "",
      });
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (!codes) {
    return (
      <GlassSurface intensity="soft" border className="p-5">
        <p className="text-sm text-white/70">Generate embed code for WordPress, custom websites, and more.</p>
        <SmoothButton variant="primary" size="sm" className="mt-3" onClick={loadEmbedCode} disabled={loading}>
          {loading ? "Loading..." : "Get embed code"}
        </SmoothButton>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface intensity="soft" border className="p-5 space-y-4">
      <h3 className="text-base font-semibold text-white">Embed this form</h3>
      
      {([
        { key: "iframe", label: "Iframe (any website)", code: codes.iframe },
        { key: "script", label: "Script tag (custom HTML)", code: codes.script },
        { key: "wordpress", label: "WordPress shortcode", code: codes.wordpress },
      ] as const).map(({ key, label, code }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">{label}</p>
            <SmoothButton
              variant="ghost"
              size="sm"
              onClick={() => copy(code, key)}
              icon={copied === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            >
              {copied === key ? "Copied" : "Copy"}
            </SmoothButton>
          </div>
          <pre className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/70 overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      ))}
    </GlassSurface>
  );
}
