"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { type SampleScript } from "@/lib/scripts";
import type { CreatorProfile, StyleProfile } from "@/lib/types";
import { getWritingStyle } from "@/lib/personas";
import { createClient } from "@/lib/supabase/client";
import { upsertPersonaProfile } from "@/lib/supabase/profiles";

interface EditProfileModalProps {
  profile: CreatorProfile;
  styleProfile: StyleProfile | null;
  apiKey: string;
  anthropicApiKey?: string;
  introGuide?: string;
  scriptGuide?: string;
  personaId?: string;
  userId?: string;
  onSave: (profile: CreatorProfile, styleProfile: StyleProfile | null, apiKey: string, anthropicApiKey: string, introGuide: string, scriptGuide: string) => void;
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

const INPUT_STYLE = {
  background: "var(--surface-2)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
} as const;

function SectionLabel({ n, children }: { n: number; children: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        {n}
      </span>
      <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{children}</h2>
    </div>
  );
}

export default function EditProfileModal({
  profile,
  styleProfile: initialStyle,
  apiKey: initialKey,
  anthropicApiKey: initialAnthropicKey = "",
  introGuide: initialIntroGuide = "",
  scriptGuide: initialScriptGuide = "",
  personaId = "thomas",
  userId = "",
  onSave,
  onClose,
}: EditProfileModalProps) {

  // ── Identity ───────────────────────────────────────────────────────────────
  const [identityMode, setIdentityMode] = useState<"manual" | "document">(
    profile.profileDoc?.trim() ? "document" : "manual"
  );
  const [profileDoc, setProfileDoc] = useState(profile.profileDoc ?? "");
  const [profileDocName, setProfileDocName] = useState(
    profile.profileDoc ? "Document loaded" : ""
  );
  const [profileDocLoading, setProfileDocLoading] = useState(false);
  const [profileDocError, setProfileDocError] = useState("");
  const profileDocFileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile.name);
  const [channelUrl, setChannelUrl] = useState(profile.channelUrl);
  const [credibilityStack, setCredibilityStack] = useState(profile.credibilityStack);
  const [uniqueMethod, setUniqueMethod] = useState(profile.uniqueMethod);
  const [contraryBelief, setContraryBelief] = useState(profile.contraryBelief);
  const [targetPerson, setTargetPerson] = useState(profile.targetPerson);
  const [contentStyle, setContentStyle] = useState(profile.contentStyle);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [identityFeedback, setIdentityFeedback] = useState("");
  const [identityAiLoading, setIdentityAiLoading] = useState(false);
  const [identityAiError, setIdentityAiError] = useState("");

  // ── Style ──────────────────────────────────────────────────────────────────
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(initialStyle);
  const [pendingScripts, setPendingScripts] = useState<SampleScript[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false);
  const [styleError, setStyleError] = useState("");
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Advanced (guides) ──────────────────────────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [introGuide, setIntroGuide] = useState(initialIntroGuide);
  const [scriptGuide, setScriptGuide] = useState(initialScriptGuide);
  const [introGuideUploading, setIntroGuideUploading] = useState(false);
  const [scriptGuideUploading, setScriptGuideUploading] = useState(false);
  const introGuideFileRef = useRef<HTMLInputElement>(null);
  const scriptGuideFileRef = useRef<HTMLInputElement>(null);
  const [introFeedback, setIntroFeedback] = useState("");
  const [scriptFeedback, setScriptFeedback] = useState("");
  const [introAiLoading, setIntroAiLoading] = useState(false);
  const [scriptAiLoading, setScriptAiLoading] = useState(false);
  const [introAiError, setIntroAiError] = useState("");
  const [scriptAiError, setScriptAiError] = useState("");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleProfileDocUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProfileDocLoading(true);
    setProfileDocError("");
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Upload timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Upload failed.");
      const scripts = data.scripts as { name: string; text: string; wordCount: number }[];
      if (!scripts?.length) throw new Error("No readable content found.");
      const fullText = scripts.map((s) => s.text).join("\n\n");
      setProfileDoc(fullText);
      setProfileDocName(scripts.map((s) => s.name).join(", "));
      // Same doc sets style profile — one upload does both
      setStyleProfile({
        scripts: scripts.map((s) => ({
          name: s.name,
          preview: s.text.slice(0, 120),
          sample: s.text.split(/\s+/).slice(0, 500).join(" "),
          wordCount: s.wordCount,
        })),
        analysis: fullText,
        analyzedAt: Date.now(),
        isDoc: true,
      });
    } catch (e: unknown) {
      setProfileDocError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProfileDocLoading(false);
    }
  }, []);

  const handleScrapeChannel = useCallback(async () => {
    if (!channelUrl.trim()) return;
    setScrapeLoading(true);
    setScrapeStatus("Fetching channel…");
    try {
      const res = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: channelUrl.trim(), apiKey: "" }),
      });
      let data: any;
      try { data = await res.json(); } catch { setScrapeStatus("Request timed out — try again."); return; }
      if (!res.ok) { setScrapeStatus((data.error as string) || "Could not reach channel."); return; }
      if (data.identityExtract) {
        const { credibilityStack: cs, uniqueMethod: um, contraryBelief: cb, targetPerson: tp } = data.identityExtract;
        if (cs) setCredibilityStack(cs);
        if (um) setUniqueMethod(um);
        if (cb) setContraryBelief(cb);
        if (tp) setTargetPerson(tp);
        setScrapeStatus(`✓ Pre-filled from channel${data.videos?.length ? ` · ${data.videos.length} videos found` : ""}`);
      } else {
        setScrapeStatus("Channel found but couldn't extract info — fill fields manually.");
      }
    } catch {
      setScrapeStatus("Network error — check your connection.");
    } finally {
      setScrapeLoading(false);
    }
  }, [channelUrl]);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadLoading(true);
    setStyleError("");
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Upload timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Upload failed.");
      const newScripts: SampleScript[] = (data.scripts as { name: string; text: string }[]).map(
        (s) => ({ name: s.name, text: s.text })
      );
      setPendingScripts((prev) => {
        const names = new Set(prev.map((s) => s.name));
        return [...prev, ...newScripts.filter((s) => !names.has(s.name))];
      });
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const handleImportTranscripts = useCallback(async () => {
    if (!channelUrl.trim()) return;
    setTranscriptLoading(true);
    setTranscriptStatus("Fetching channel videos…");
    setStyleError("");
    try {
      const scrapeRes = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, apiKey: "" }),
      });
      let scrapeData: any;
      try { scrapeData = await scrapeRes.json(); } catch { throw new Error("Channel request timed out — try again."); }
      if (!scrapeRes.ok) throw new Error((scrapeData.error as string) || "Could not scrape channel.");
      const videos = (scrapeData.videos ?? []) as { id: string; title: string }[];
      if (videos.length === 0) { setTranscriptStatus("No videos found on this channel."); return; }
      setTranscriptStatus(`Found ${videos.length} videos — fetching transcripts…`);
      const transcriptRes = await fetch("/api/fetch-transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos }),
      });
      let transcriptData: any;
      try { transcriptData = await transcriptRes.json(); } catch { throw new Error("Transcript request timed out — try again."); }
      if (!transcriptRes.ok) throw new Error((transcriptData.error as string) || "Transcript fetch failed.");
      const imported: SampleScript[] = (transcriptData.transcripts ?? []).map(
        (t: { title: string; text: string }) => ({ name: t.title, text: t.text })
      );
      if (imported.length === 0) {
        setTranscriptStatus("No transcripts available for these videos.");
      } else {
        setPendingScripts((prev) => {
          const existing = new Set(prev.map((s) => s.name));
          return [...prev, ...imported.filter((s) => !existing.has(s.name))];
        });
        const failCount = (transcriptData.failed ?? []).length;
        setTranscriptStatus(`✓ Imported ${imported.length} transcript${imported.length !== 1 ? "s" : ""}${failCount > 0 ? ` · ${failCount} unavailable` : ""}`);
      }
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Transcript import failed.");
      setTranscriptStatus("");
    } finally {
      setTranscriptLoading(false);
    }
  }, [channelUrl]);

  const handleAnalyze = useCallback(async () => {
    if (pendingScripts.length === 0) { setStyleError("Add scripts before analyzing."); return; }
    setAnalyzeLoading(true);
    setStyleError("");
    setAnalyzeSuccess(false);
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scripts: pendingScripts.map((s) => ({ name: s.name, text: s.text })), apiKey: "" }),
      });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Analysis timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Analysis failed.");
      setStyleProfile({
        scripts: pendingScripts.map((s) => ({
          name: s.name,
          preview: s.text.slice(0, 120),
          sample: s.text.split(/\s+/).slice(0, 500).join(" "),
          wordCount: s.text.split(/\s+/).filter(Boolean).length,
        })),
        analysis: data.analysis,
        analyzedAt: Date.now(),
      });
      setPendingScripts([]);
      setAnalyzeSuccess(true);
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzeLoading(false);
    }
  }, [pendingScripts]);

  const handleGuideFileUpload = useCallback(async (
    files: FileList | null,
    setter: (text: string) => void,
    setLoading: (v: boolean) => void
  ) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Upload timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Upload failed.");
      setter((data.scripts as { text: string }[]).map((s) => s.text).join("\n\n---\n\n"));
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAiUpdate = useCallback(async (
    guideType: "introGuide" | "scriptGuide" | "whoAmI",
    currentContent: unknown,
    feedback: string,
    setLoading: (v: boolean) => void,
    setError: (v: string) => void,
    onSuccess: (updated: unknown) => void,
    clearFeedback: () => void,
  ) => {
    if (!feedback.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/update-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideType, currentContent, feedback, personaId }),
      });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Request timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Update failed.");
      onSuccess(data.updatedContent);
      clearFeedback();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI update failed.");
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  const handleSave = async () => {
    const updatedProfile: CreatorProfile = {
      ...profile,
      name,
      channelUrl,
      credibilityStack,
      uniqueMethod,
      contraryBelief,
      targetPerson,
      contentStyle,
      completedAt: profile.completedAt,
      profileDoc,
    };
    if (userId) {
      const supabase = createClient();
      await upsertPersonaProfile(supabase, userId, personaId, {
        whoAmI: { name, channelUrl, credibilityStack, uniqueMethod, contraryBelief, targetPerson, contentStyle, profileDoc },
        styleProfile,
        introGuide,
        scriptGuide,
      });
    }
    onSave(updatedProfile, styleProfile, initialKey, initialAnthropicKey, introGuide, scriptGuide);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const contentStyles = [
    { id: "talking-head", label: "Talking Head", icon: "🎙️" },
    { id: "educational-breakdown", label: "Educational", icon: "📋" },
    { id: "story-driven", label: "Story-Driven", icon: "📖" },
    { id: "fast-lists", label: "Fast Lists", icon: "⚡" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,10,14,0.95)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Creator Profile</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{profile.name || "Your profile"}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm"
            style={{ color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-8">

          {/* ── SECTION 1: WHO YOU ARE ─────────────────────────────────────── */}
          <section>
            <SectionLabel n={1}>Who you are</SectionLabel>

            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden border mb-5" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => setIdentityMode("manual")}
                className="flex-1 py-2.5 text-xs font-semibold transition-colors"
                style={{
                  background: identityMode === "manual" ? "var(--accent)" : "var(--surface-2)",
                  color: identityMode === "manual" ? "#fff" : "var(--muted)",
                }}
              >
                Fill manually
              </button>
              <button
                type="button"
                onClick={() => setIdentityMode("document")}
                className="flex-1 py-2.5 text-xs font-semibold transition-colors"
                style={{
                  background: identityMode === "document" ? "var(--accent)" : "var(--surface-2)",
                  color: identityMode === "document" ? "#fff" : "var(--muted)",
                }}
              >
                Upload document
              </button>
            </div>

            {identityMode === "document" ? (
              /* ── Upload document ── */
              <div className="flex flex-col gap-3">
                {profileDoc ? (
                  <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(92,252,160,0.06)", border: "1px solid rgba(92,252,160,0.2)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span style={{ color: "var(--green)" }}>✓</span>
                          <p className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>{profileDocName}</p>
                        </div>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {profileDoc.split(/\s+/).filter(Boolean).length.toLocaleString()} words · Used for both identity and style
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setProfileDoc(""); setProfileDocName(""); setStyleProfile(null); }}
                        className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
                      >Remove</button>
                    </div>
                    <div
                      className="rounded-lg p-3 text-xs leading-5 font-mono overflow-y-auto"
                      style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", maxHeight: 120, whiteSpace: "pre-wrap" }}
                    >
                      {profileDoc.slice(0, 400)}{profileDoc.length > 400 ? "…" : ""}
                    </div>
                    <button
                      type="button"
                      onClick={() => profileDocFileRef.current?.click()}
                      disabled={profileDocLoading}
                      className="w-full rounded-lg py-2 text-xs font-medium disabled:opacity-50"
                      style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      {profileDocLoading ? "Uploading…" : "Replace document"}
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => profileDocFileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleProfileDocUpload(e.dataTransfer.files); }}
                    className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-12 gap-3 cursor-pointer"
                    style={{ borderColor: "var(--border-light)", background: "var(--surface-2)" }}
                  >
                    {profileDocLoading ? (
                      <span className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    ) : (
                      <>
                        <span className="text-3xl">📄</span>
                        <div className="text-center">
                          <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Drop your document here</p>
                          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Brand guide, bio, style doc — anything · .docx or .txt</p>
                        </div>
                        <span className="text-xs font-medium px-3 py-1.5 rounded-lg pointer-events-none" style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                          Browse files
                        </span>
                      </>
                    )}
                  </div>
                )}
                <input ref={profileDocFileRef} type="file" accept=".docx,.txt,.md" className="hidden" onChange={(e) => handleProfileDocUpload(e.target.files)} />
                {profileDocError && (
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
                    {profileDocError}
                  </p>
                )}
              </div>
            ) : (
              /* ── Manual fields ── */
              <div className="flex flex-col gap-5">
                {personaId === "thomas" && (
                  <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Load Thomas Graham&apos;s identity</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Pre-fill all fields from the Thomas Graham style document</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const id = getWritingStyle("thomas").identity;
                        if (id.name) setName(id.name);
                        if (id.channelUrl) setChannelUrl(id.channelUrl);
                        if (id.credibilityStack) setCredibilityStack(id.credibilityStack);
                        if (id.uniqueMethod) setUniqueMethod(id.uniqueMethod);
                        if (id.contraryBelief) setContraryBelief(id.contraryBelief);
                        if (id.targetPerson) setTargetPerson(id.targetPerson);
                        if (id.contentStyle) setContentStyle(id.contentStyle);
                      }}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)" }}
                    >Load →</button>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Name or handle</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Branden Moio"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>

                {/* Channel URL */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Channel URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text" value={channelUrl}
                      onChange={(e) => { setChannelUrl(e.target.value); setScrapeStatus(""); }}
                      placeholder="https://youtube.com/@yourhandle"
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none min-w-0"
                      style={INPUT_STYLE}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      onKeyDown={(e) => e.key === "Enter" && handleScrapeChannel()}
                    />
                    <button
                      type="button" onClick={handleScrapeChannel}
                      disabled={scrapeLoading || !channelUrl.trim()}
                      className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)", whiteSpace: "nowrap" }}
                    >
                      {scrapeLoading
                        ? <><span className="w-3 h-3 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />Fetching…</>
                        : "Fetch & pre-fill →"}
                    </button>
                  </div>
                  {scrapeStatus && (
                    <p className="text-xs mt-1.5" style={{ color: scrapeStatus.startsWith("✓") ? "var(--green)" : "var(--muted)" }}>{scrapeStatus}</p>
                  )}
                </div>

                {/* Credibility Stack */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Credibility Stack</label>
                  <textarea
                    value={credibilityStack} onChange={(e) => setCredibilityStack(e.target.value)} rows={4}
                    placeholder={"Specific results, numbers, proof points.\n\ne.g. 10 years in the industry. Grew revenue from $0 to $2M. Trained 400+ clients."}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>

                {/* Unique Method */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Unique Method / Framework</label>
                  <textarea
                    value={uniqueMethod} onChange={(e) => setUniqueMethod(e.target.value)} rows={3}
                    placeholder={"Your specific system or approach.\n\ne.g. The 3-Phase Protocol: fix the habit loop first, then environment, then execution."}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>

                {/* Contrarian Belief */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Contrarian Belief</label>
                  <textarea
                    value={contraryBelief} onChange={(e) => setContraryBelief(e.target.value)} rows={3}
                    placeholder={"What you believe that most in your space get wrong.\n\ne.g. Most people optimise for reach. The real lever is trust."}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>

                {/* Who You're For */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Who You're For</label>
                  <input
                    type="text" value={targetPerson} onChange={(e) => setTargetPerson(e.target.value)}
                    placeholder="The specific person this content is for — their situation, problem, and goal."
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>

                {/* Content Style */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Content Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {contentStyles.map((cs) => {
                      const active = contentStyle === cs.id;
                      return (
                        <button key={cs.id} onClick={() => setContentStyle(cs.id)}
                          className="rounded-xl px-3 py-2.5 text-left text-xs font-medium flex items-center gap-2 transition-all"
                          style={{ background: active ? "var(--accent-glow)" : "var(--surface-2)", color: active ? "var(--accent)" : "var(--muted)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}` }}
                        >
                          <span>{cs.icon}</span>{cs.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AI Refine */}
                <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(124,92,252,0.05)", border: "1px solid rgba(124,92,252,0.2)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Refine with AI</p>
                  <textarea
                    value={identityFeedback}
                    onChange={(e) => { setIdentityFeedback(e.target.value); setIdentityAiError(""); }}
                    placeholder={`e.g. "Update my credibility stack — I've now helped 600 clients and hit $3M revenue"`}
                    rows={2}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                  {identityAiError && <p className="text-xs" style={{ color: "var(--red)" }}>{identityAiError}</p>}
                  <button
                    type="button"
                    disabled={identityAiLoading || !identityFeedback.trim()}
                    onClick={() => handleAiUpdate("whoAmI", { name, channelUrl, credibilityStack, uniqueMethod, contraryBelief, targetPerson, contentStyle }, identityFeedback, setIdentityAiLoading, setIdentityAiError,
                      (updated) => {
                        const u = updated as Record<string, string>;
                        if (u.name !== undefined) setName(u.name);
                        if (u.credibilityStack !== undefined) setCredibilityStack(u.credibilityStack);
                        if (u.uniqueMethod !== undefined) setUniqueMethod(u.uniqueMethod);
                        if (u.contraryBelief !== undefined) setContraryBelief(u.contraryBelief);
                        if (u.targetPerson !== undefined) setTargetPerson(u.targetPerson);
                      }, () => setIdentityFeedback("")
                    )}
                    className="w-full rounded-lg py-2.5 text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {identityAiLoading ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating…</> : "✦ Update with AI"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── SECTION 2: HOW YOU WRITE ───────────────────────────────────── */}
          <section>
            <SectionLabel n={2}>How you write</SectionLabel>

            {/* If doc is loaded, show status */}
            {profileDoc && (
              <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3" style={{ background: "rgba(92,252,160,0.06)", border: "1px solid rgba(92,252,160,0.2)" }}>
                <span style={{ color: "var(--green)" }}>✓</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Style set from your document</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Optionally add scripts below for deeper style matching</p>
                </div>
              </div>
            )}

            {/* Current style profile */}
            {styleProfile && !styleProfile.isDoc && (
              <div className="rounded-xl p-4 mb-4 flex flex-col gap-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Current Style Profile</p>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{styleProfile.scripts.length} scripts · {timeAgo(styleProfile.analyzedAt)}</span>
                </div>
                {styleProfile.scripts.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <span className="text-xs" style={{ color: "var(--green)" }}>✓</span>
                    <span className="text-xs truncate flex-1" style={{ color: "var(--muted)" }}>{s.name}</span>
                    <span className="text-xs" style={{ color: "var(--border-light)" }}>{s.wordCount.toLocaleString()}w</span>
                    <button type="button" onClick={() => {
                      const updated = styleProfile.scripts.filter((_, j) => j !== i);
                      setStyleProfile(updated.length ? { ...styleProfile, scripts: updated } : null);
                    }} className="w-5 h-5 rounded flex items-center justify-center text-xs opacity-0 group-hover:opacity-100" style={{ background: "rgba(252,92,124,0.12)", color: "var(--red)" }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {analyzeSuccess && (
              <p className="text-xs px-3 py-2 rounded-lg mb-4" style={{ background: "rgba(92,252,160,0.08)", color: "var(--green)", border: "1px solid rgba(92,252,160,0.2)" }}>
                ✓ Style profile updated from {styleProfile?.scripts.length} scripts
              </p>
            )}

            {/* YouTube import */}
            {channelUrl.trim() && (
              <div className="mb-3">
                <button
                  onClick={handleImportTranscripts}
                  disabled={transcriptLoading || analyzeLoading}
                  className="w-full rounded-xl py-3 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "rgba(255,0,0,0.08)", color: "#ff4444", border: "1px solid rgba(255,80,80,0.25)" }}
                >
                  {transcriptLoading
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />{transcriptStatus}</>
                    : "▶ Import transcripts from YouTube"}
                </button>
                {transcriptStatus && !transcriptLoading && (
                  <p className="text-xs mt-1.5 text-center" style={{ color: transcriptStatus.startsWith("✓") ? "var(--green)" : "var(--muted)" }}>{transcriptStatus}</p>
                )}
              </div>
            )}

            {/* Script upload drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-7 gap-2 cursor-pointer mb-3"
              style={{ borderColor: "var(--border-light)", background: "var(--surface-2)" }}
            >
              {uploadLoading ? <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : (
                <>
                  <span className="text-2xl">📂</span>
                  <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Drop scripts or click to browse</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>.docx or .txt</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".docx,.txt,.md" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />

            {pendingScripts.length > 0 && (
              <div className="flex flex-col gap-1 mb-4">
                <p className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>{pendingScripts.length} scripts queued</p>
                {pendingScripts.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                    <span className="text-xs" style={{ color: "var(--accent)" }}>◉</span>
                    <p className="text-xs flex-1 truncate" style={{ color: "var(--foreground)" }}>{s.name}</p>
                    <button onClick={() => setPendingScripts((p) => p.filter((_, j) => j !== i))} className="text-xs" style={{ color: "var(--muted)" }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {styleError && (
              <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
                {styleError}
              </p>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzeLoading || pendingScripts.length === 0}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {analyzeLoading
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Analyzing… (~60s)</>
                : `✦ Analyze ${pendingScripts.length > 0 ? pendingScripts.length + " " : ""}Scripts`}
            </button>
          </section>

          {/* ── ADVANCED (collapsed) ───────────────────────────────────────── */}
          <section>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium w-full text-left"
              style={{ color: "var(--muted)" }}
            >
              <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span>Advanced {showAdvanced ? "▴" : "▾"}</span>
              <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-6 mt-5">
                {(["introguide", "scriptguide"] as const).map((type) => {
                  const isIntro = type === "introguide";
                  const guideText = isIntro ? introGuide : scriptGuide;
                  const setGuide = isIntro ? setIntroGuide : setScriptGuide;
                  const uploading = isIntro ? introGuideUploading : scriptGuideUploading;
                  const setUploading = isIntro ? setIntroGuideUploading : setScriptGuideUploading;
                  const fileRef = isIntro ? introGuideFileRef : scriptGuideFileRef;
                  const feedback = isIntro ? introFeedback : scriptFeedback;
                  const setFeedback = isIntro ? setIntroFeedback : setScriptFeedback;
                  const aiLoading = isIntro ? introAiLoading : scriptAiLoading;
                  const setAiLoading = isIntro ? setIntroAiLoading : setScriptAiLoading;
                  const aiError = isIntro ? introAiError : scriptAiError;
                  const setAiError = isIntro ? setIntroAiError : setScriptAiError;

                  return (
                    <div key={type} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            {isIntro ? "Intro Guide" : "Script Guide"}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                            {isIntro ? "Controls intro beats, modes, and USP structure" : "Controls body, rehooks, story flow, outro, CTAs"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {guideText && (
                            <button type="button" onClick={() => setGuide("")} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                              Clear
                            </button>
                          )}
                          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50" style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                            {uploading ? "Uploading…" : "Upload .docx"}
                          </button>
                          <input ref={fileRef} type="file" accept=".docx,.txt,.md" multiple className="hidden" onChange={(e) => handleGuideFileUpload(e.target.files, setGuide, setUploading)} />
                        </div>
                      </div>
                      <textarea
                        value={guideText} onChange={(e) => setGuide(e.target.value)}
                        placeholder={isIntro ? "Paste your intro writing guide here, or upload the .docx file." : "Paste your script writing guide here, or upload the .docx file."}
                        rows={12}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6 font-mono"
                        style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 200 }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      />
                      {guideText ? (
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {guideText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
                        </p>
                      ) : (
                        <p className="text-xs" style={{ color: "var(--muted)" }}>Using default guide. Upload to override.</p>
                      )}
                      {/* AI refine */}
                      <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "rgba(124,92,252,0.05)", border: "1px solid rgba(124,92,252,0.2)" }}>
                        <textarea
                          value={feedback}
                          onChange={(e) => { setFeedback(e.target.value); setAiError(""); }}
                          placeholder={`Describe what to change in this guide…`}
                          rows={2}
                          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                          style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                        />
                        {aiError && <p className="text-xs" style={{ color: "var(--red)" }}>{aiError}</p>}
                        <button
                          type="button"
                          disabled={aiLoading || !feedback.trim()}
                          onClick={() => handleAiUpdate(isIntro ? "introGuide" : "scriptGuide", guideText, feedback, setAiLoading, setAiError, (updated) => setGuide(updated as string), () => setFeedback(""))}
                          className="w-full rounded-lg py-2 text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                          style={{ background: "var(--accent)", color: "#fff" }}
                        >
                          {aiLoading ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating…</> : "✦ Update with AI"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg" style={{ color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button
            onClick={() => { void handleSave(); }}
            className="text-sm font-semibold px-6 py-2 rounded-lg flex items-center gap-2"
            style={{ background: saved ? "rgba(92,252,160,0.15)" : "var(--accent)", color: saved ? "var(--green)" : "#fff", border: saved ? "1px solid rgba(92,252,160,0.3)" : "none" }}
          >
            {saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
