"use client";

import { useState, useCallback, useEffect, FormEvent } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const VIDEO_TYPES = [
  "General",
  "Educational",
  "Comparison",
  "Myth",
  "Story-Telling",
  "Authority",
  "Day in the Life",
];

const DAILY_LIMIT = 5;
const STORAGE_KEY = "hookLabUsage";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getUsage(): { count: number; date: string } {
  if (typeof window === "undefined") return { count: 0, date: getToday() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: getToday() };
    const parsed = JSON.parse(raw);
    if (parsed.date !== getToday()) return { count: 0, date: getToday() };
    return { count: Number(parsed.count) || 0, date: getToday() };
  } catch {
    return { count: 0, date: getToday() };
  }
}

function saveUsage(count: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, date: getToday() }));
}

export default function HookLabPage() {
  const [topic, setTopic] = useState("");
  const [videoType, setVideoType] = useState(VIDEO_TYPES[0]);
  const [hooks, setHooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    const usage = getUsage();
    setUsageCount(usage.count);
    if (usage.count >= DAILY_LIMIT) setLimitReached(true);
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || limitReached) return;

    setLoading(true);
    setError("");
    setHooks([]);

    try {
      const res = await fetch("/api/hook-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), videoType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");

      setHooks(data.hooks ?? []);
      const newCount = usageCount + 1;
      saveUsage(newCount);
      setUsageCount(newCount);
      if (newCount >= DAILY_LIMIT) setLimitReached(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [topic, videoType, usageCount, limitReached]);

  const copyHook = useCallback(async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  const copyAll = useCallback(async () => {
    const text = hooks.map((h, i) => `${i + 1}. ${h}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }, [hooks]);

  const remaining = Math.max(0, DAILY_LIMIT - usageCount);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header Nav */}
      <nav className="border-b sticky top-0 z-10 backdrop-blur-md" style={{ borderColor: "var(--border)", background: "rgba(250,249,246,0.92)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-sm)" }}>
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/tools/content-factory"
                className="btn-press text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <span>📅</span> Content Calendar
              </Link>
              <Link
                href="/writer"
                className="btn-press text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <span>✦</span> Script Writer
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)", boxShadow: "var(--shadow-sm)" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: limitReached ? "var(--red)" : "var(--green)" }} />
            {limitReached ? "Daily limit reached" : `${remaining} / ${DAILY_LIMIT} free today`}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-wider" style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(255,78,80,0.2)" }}>
            Free Tool
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
            Hook Lab
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
            Generate 10 scroll-stopping hooks for your next Instagram Reel in seconds.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border p-6 md:p-8 mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {limitReached ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Daily limit reached</h2>
              <p style={{ color: "var(--muted)" }}>You&apos;ve used all {DAILY_LIMIT} free generations for today. Come back tomorrow — or try ScriptForge for unlimited scripts.</p>
              <Link
                href="/writer"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Try ScriptForge →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
                  What is your Reel idea or topic?
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. How to get your first 1,000 Instagram followers"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", outline: "none" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
                  Video type
                </label>
                <div className="relative">
                  <select
                    value={videoType}
                    onChange={(e) => setVideoType(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm appearance-none pr-10"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", outline: "none" }}
                  >
                    {VIDEO_TYPES.map((t) => (
                      <option key={t} value={t}>{t === "General" ? "General (any type)" : t}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center" style={{ color: "var(--muted)" }}>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="w-full rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "var(--accent)", color: "#fff", boxShadow: loading ? "none" : "0 0 28px var(--accent-glow)" }}
              >
                {loading ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />Generating hooks…</>
                ) : (
                  <><span>⚡</span> Generate 10 Hooks</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Results */}
        {hooks.length > 0 && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div>
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Your Hooks</span>
                <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>— {videoType} · {topic}</span>
              </div>
              <button
                onClick={copyAll}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: copiedAll ? "var(--accent-glow)" : "var(--surface)", color: copiedAll ? "var(--accent)" : "var(--muted)", border: "1px solid var(--border-light)" }}
              >
                {copiedAll ? "✓ Copied all!" : "Copy all"}
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {hooks.map((hook, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4 group">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{hook}</p>
                  <button
                    onClick={() => copyHook(hook, i)}
                    className="opacity-0 group-hover:opacity-100 text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0 transition-all"
                    style={{ background: copiedIdx === i ? "var(--accent-glow)" : "var(--surface-2)", color: copiedIdx === i ? "var(--accent)" : "var(--muted)", border: "1px solid var(--border-light)" }}
                  >
                    {copiedIdx === i ? "✓" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Want more?</p>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Turn your hooks into full scripts</h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
            ScriptForge generates complete YouTube and Reel scripts matched to your exact writing style — not just hooks.
          </p>
          <Link
            href="/writer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 0 28px var(--accent-glow)" }}
          >
            <span>▶</span> Open ScriptForge →
          </Link>
        </div>
      </main>
    </div>
  );
}
