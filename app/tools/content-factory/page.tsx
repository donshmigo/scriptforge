"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface Script { [key: string]: string; }

interface PlanDayPreview {
  day: number;
  type: string;
  topic: string;
  primaryHook: string;
  secondaryHooks: string[];
  fullScript: string | Script;
  caption: string;
}

interface PlanDayCalendar {
  day: number;
  type: string;
  topic: string;
}

interface FullPlan {
  preview: PlanDayPreview[];
  calendar: PlanDayCalendar[];
}

const TYPE_COLORS: Record<string, string> = {
  "Educational":             "rgba(92,252,160,0.15)",
  "Myth":                    "rgba(252,92,124,0.12)",
  "Comparison":              "rgba(124,92,252,0.15)",
  "List":                    "rgba(92,180,252,0.15)",
  "Step-by-step / Tutorial": "rgba(252,200,92,0.15)",
  "Storytelling":            "rgba(252,140,92,0.15)",
  "Case Study / Results":    "rgba(160,92,252,0.15)",
  "Common Mistake":          "rgba(252,92,92,0.12)",
  "Authority / FAQ / Quick Tip": "rgba(92,252,252,0.12)",
  "Selling":                 "rgba(252,92,200,0.12)",
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  "Educational":             "#5cfca0",
  "Myth":                    "#fc5c7c",
  "Comparison":              "#7c5cfc",
  "List":                    "#5cb4fc",
  "Step-by-step / Tutorial": "#fcc85c",
  "Storytelling":            "#fc8c5c",
  "Case Study / Results":    "#a05cfc",
  "Common Mistake":          "#fc5c5c",
  "Authority / FAQ / Quick Tip": "#5cfcfc",
  "Selling":                 "#fc5cc8",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{
        background: TYPE_COLORS[type] ?? "rgba(255,78,80,0.12)",
        color: TYPE_TEXT_COLORS[type] ?? "var(--accent)",
      }}
    >
      {type}
    </span>
  );
}

export default function ContentFactoryPage() {
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<FullPlan | null>(null);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<PlanDayPreview | PlanDayCalendar | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim()) return;

    setLoading(true);
    setError("");
    setPlan(null);

    try {
      const res = await fetch("/api/content-factory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setPlan(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [niche]);

  const handleSelectDay = useCallback((day: PlanDayCalendar) => {
    const fullDay = plan?.preview.find((p) => p.day === day.day) ?? day;
    setSelectedDay(fullDay);
  }, [plan]);

  const handleDownloadCsv = useCallback(() => {
    if (!plan) return;
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows: string[] = [["Day", "Type", "Topic", "Primary Hook", "Secondary Hooks", "Full Script", "Caption"].join(",")];

    plan.preview.forEach((day) => {
      rows.push([
        day.day,
        day.type,
        escape(day.topic),
        escape(day.primaryHook),
        escape(day.secondaryHooks.join("; ")),
        escape(typeof day.fullScript === "string" ? day.fullScript : JSON.stringify(day.fullScript)),
        escape(day.caption),
      ].join(","));
    });

    plan.calendar.slice(plan.preview.length).forEach((day) => {
      rows.push([day.day, day.type, escape(day.topic), "", "", "", ""].join(","));
    });

    const uri = "data:text/csv;charset=utf-8," + encodeURI(rows.join("\r\n"));
    const a = document.createElement("a");
    a.href = uri;
    a.download = `${niche.toLowerCase().replace(/\s+/g, "_")}_30day_plan.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [plan, niche]);

  const handleCopyCaption = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const isPreviewDay = (day: PlanDayPreview | PlanDayCalendar): day is PlanDayPreview =>
    "primaryHook" in day && !!day.primaryHook;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Nav */}
      <nav className="border-b sticky top-0 z-10 backdrop-blur-md" style={{ borderColor: "var(--border)", background: "rgba(250,249,246,0.92)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-sm)" }}>
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #FF7B35 100%)", boxShadow: "0 4px 12px rgba(255,78,80,0.3)" }}>✦</div>
              <span className="text-sm font-bold tracking-tight" style={{ color: "var(--foreground)" }}>ScriptForge</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/tools/hook-lab"
                className="btn-press text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <span>⚡</span> Hook Lab
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
          {plan && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCsv}
                className="btn-press text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                ↓ Download CSV
              </button>
              <button
                onClick={() => { setPlan(null); setError(""); setSelectedDay(null); }}
                className="btn-press text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                ↺ New Plan
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Hero (hidden after plan is generated) */}
        {!plan && (
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-wider" style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(255,78,80,0.2)" }}>
              Free Tool
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
              Content Factory
            </h1>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
              Turn your niche into a complete 30-day Instagram content plan — with hooks, full scripts, and captions.
            </p>
          </div>
        )}

        {/* Form */}
        {!plan && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border p-6 md:p-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <form onSubmit={handleGenerate} className="flex flex-col gap-5">
                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>What&apos;s your niche?</label>
                    <input
                      type="text"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g. Real Estate, Instagram Growth, Personal Finance"
                      required
                      disabled={loading}
                      className="w-full rounded-xl px-4 py-3 text-sm"
                      style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", outline: "none" }}
                    />
                  </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !niche.trim()}
                  className="w-full rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff", boxShadow: loading ? "none" : "0 0 28px var(--accent-glow)" }}
                >
                  {loading ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />Building your 30-day plan… (30–60 sec)</>
                  ) : (
                    <><span>🗓</span> Generate 30-Day Plan</>
                  )}
                </button>
              </form>
            </div>

            {loading && (
              <div className="mt-8 text-center">
                <p className="text-sm" style={{ color: "var(--muted)" }}>Generating your full plan with hooks, scripts, and captions. This takes around 30–60 seconds…</p>
                <div className="mt-4 flex justify-center gap-1.5">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plan Output */}
        {plan && (
          <div>
            {/* Plan Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Your 30-Day Content Plan</h1>
              <p style={{ color: "var(--muted)" }}>
                Niche: <span style={{ color: "var(--foreground)" }}>{niche}</span>
              </p>
            </div>

            {/* 3-Day Preview */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>Days 1–3 — Full Scripts</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>Click to expand</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plan.preview.map((day) => (
                  <button
                    key={day.day}
                    onClick={() => setSelectedDay(day)}
                    className="rounded-xl border p-5 text-left transition-all hover:scale-[1.01]"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>Day {day.day}</span>
                      <TypeBadge type={day.type} />
                    </div>
                    <p className="text-sm font-semibold mb-2 leading-snug" style={{ color: "var(--foreground)" }}>{day.topic}</p>
                    <p className="text-xs italic line-clamp-2" style={{ color: "var(--muted)" }}>&ldquo;{day.primaryHook}&rdquo;</p>
                    <p className="text-xs mt-3" style={{ color: "var(--accent)" }}>View full script →</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 30-Day Calendar */}
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--foreground)" }}>Full 30-Day Calendar</h2>
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                {/* Day-of-week header */}
                <div className="grid grid-cols-5 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                    <div key={d} className="px-3 py-2.5 text-center" style={{ color: "var(--muted)" }}>{d}</div>
                  ))}
                </div>
                {/* Calendar grid: 6 rows × 5 cols = 30 days */}
                {Array.from({ length: 6 }, (_, row) => (
                  <div key={row} className={`grid grid-cols-5 ${row < 5 ? "border-b" : ""}`} style={{ borderColor: "var(--border)" }}>
                    {Array.from({ length: 5 }, (_, col) => {
                      const dayNum = row * 5 + col + 1;
                      const dayData = plan.calendar[dayNum - 1];
                      if (!dayData) return <div key={col} />;
                      const isPreview = dayNum <= 3;
                      return (
                        <button
                          key={col}
                          onClick={() => handleSelectDay(dayData)}
                          className={`p-3 text-left transition-all hover:brightness-110 ${col < 4 ? "border-r" : ""}`}
                          style={{
                            borderColor: "var(--border)",
                            background: isPreview ? "rgba(255,78,80,0.05)" : "var(--surface)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className="text-xs font-bold" style={{ color: isPreview ? "var(--accent)" : "var(--muted)" }}>
                              {dayNum}
                            </span>
                            {isPreview && (
                              <span className="text-xs" style={{ color: "var(--accent)" }}>★</span>
                            )}
                          </div>
                          <div
                            className="text-xs font-semibold mb-1 px-1.5 py-0.5 rounded inline-block"
                            style={{
                              background: TYPE_COLORS[dayData.type] ?? "rgba(255,78,80,0.12)",
                              color: TYPE_TEXT_COLORS[dayData.type] ?? "var(--accent)",
                            }}
                          >
                            {dayData.type.split(" ")[0]}
                          </div>
                          <p className="text-xs leading-tight mt-1 line-clamp-2" style={{ color: "var(--foreground)" }}>
                            {dayData.topic}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                <span style={{ color: "var(--accent)" }}>★</span> Days 1–3 have full scripts. Click any day for details.
              </p>
            </div>

            {/* Download + CTA */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Your plan is ready.</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Download as CSV to import into Notion, Google Sheets, or your planner.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadCsv}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border-light)" }}
                >
                  ↓ Download CSV
                </button>
                <Link
                  href="/writer"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  Try ScriptForge →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CTA (when no plan) */}
        {!plan && !loading && (
          <div className="mt-12 max-w-2xl mx-auto rounded-2xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Want full scripts?</p>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>ScriptForge writes your full videos</h2>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
              The Content Factory plans your ideas. ScriptForge writes the complete YouTube and Reel scripts — matched to your voice and writing style.
            </p>
            <Link
              href="/writer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 0 28px var(--accent-glow)" }}
            >
              <span>▶</span> Open ScriptForge →
            </Link>
          </div>
        )}
      </main>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="rounded-2xl border w-full max-w-2xl max-h-[90vh] flex flex-col"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="text-xs font-bold mr-2" style={{ color: "var(--muted)" }}>Day {selectedDay.day}</span>
                <TypeBadge type={selectedDay.type} />
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ color: "var(--muted)" }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{selectedDay.topic}</h2>
              </div>

              {isPreviewDay(selectedDay) ? (
                <>
                  {/* Primary Hook */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Primary Hook</p>
                    <p className="text-sm italic" style={{ color: "var(--foreground)" }}>&ldquo;{selectedDay.primaryHook}&rdquo;</p>
                  </div>

                  {/* Secondary Hooks */}
                  {selectedDay.secondaryHooks?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Alternative Hooks</p>
                      <div className="flex flex-col gap-2">
                        {selectedDay.secondaryHooks.map((h, i) => (
                          <p key={i} className="text-sm italic" style={{ color: "var(--muted)" }}>&ldquo;{h}&rdquo;</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Script */}
                  {selectedDay.fullScript && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>Full Script</p>
                      <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                        {typeof selectedDay.fullScript === "string" ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>{selectedDay.fullScript}</p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {Object.entries(selectedDay.fullScript).map(([key, val]) => (
                              <div key={key}>
                                <p className="text-xs font-bold mb-1 capitalize" style={{ color: "var(--accent)" }}>{key.replace(/([A-Z])/g, " $1").trim()}</p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>{String(val)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Caption */}
                  {selectedDay.caption && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Caption</p>
                        <button
                          onClick={() => handleCopyCaption(selectedDay.caption)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                          style={{ background: copied ? "var(--accent-glow)" : "var(--surface)", color: copied ? "var(--accent)" : "var(--muted)", border: "1px solid var(--border-light)" }}
                        >
                          {copied ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                        {selectedDay.caption}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* Calendar-only day */
                <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>Content Type: {selectedDay.type}</p>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>Full scripts are generated for Days 1–3. Use this topic and content type as a brief to write your own script — or open ScriptForge to generate it automatically.</p>
                  <Link
                    href="/writer"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(255,78,80,0.2)" }}
                  >
                    <span>▶</span> Write this in ScriptForge
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
