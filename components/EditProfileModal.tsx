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

type Tab = "identity" | "style" | "introguide" | "scriptguide";

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs mt-1.5 leading-4" style={{ color: "var(--muted)" }}>{children}</p>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0">
      <Label>{label}</Label>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

const INPUT_STYLE = {
  background: "var(--surface-2)",
  color: "var(--foreground)",
  border: "1.5px solid var(--border)",
} as const;

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
  const [tab, setTab] = useState<Tab>("identity");
  const safeTab: Tab = tab;

  // Identity fields
  const [name, setName] = useState(profile.name);
  const [channelUrl, setChannelUrl] = useState(profile.channelUrl);
  const [credibilityStack, setCredibilityStack] = useState(profile.credibilityStack);
  const [uniqueMethod, setUniqueMethod] = useState(profile.uniqueMethod);
  const [contraryBelief, setContraryBelief] = useState(profile.contraryBelief);
  const [targetPerson, setTargetPerson] = useState(profile.targetPerson);
  const [contentStyle, setContentStyle] = useState(profile.contentStyle);

  // Style profile
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(initialStyle);
  const [styleMode, setStyleMode] = useState<"scripts" | "document">(
    initialStyle?.isDoc ? "document" : "scripts"
  );
  const [pendingScripts, setPendingScripts] = useState<SampleScript[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [styleError, setStyleError] = useState("");
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleDocRef = useRef<HTMLInputElement>(null);
  const [styleDocLoading, setStyleDocLoading] = useState(false);

  // Channel scrape
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState("");

  // Transcript import
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState("");

  // API keys — not shown in UI, passed through unchanged
  const apiKey = initialKey;
  const anthropicApiKey = initialAnthropicKey;

  // Guide documents
  const [introGuide, setIntroGuide] = useState(initialIntroGuide);
  const [scriptGuide, setScriptGuide] = useState(initialScriptGuide);
  const [introGuideUploading, setIntroGuideUploading] = useState(false);
  const [scriptGuideUploading, setScriptGuideUploading] = useState(false);
  const introGuideFileRef = useRef<HTMLInputElement>(null);
  const scriptGuideFileRef = useRef<HTMLInputElement>(null);

  // AI feedback state (per guide + identity)
  const [introFeedback, setIntroFeedback] = useState("");
  const [scriptFeedback, setScriptFeedback] = useState("");
  const [identityFeedback, setIdentityFeedback] = useState("");
  const [introAiLoading, setIntroAiLoading] = useState(false);
  const [scriptAiLoading, setScriptAiLoading] = useState(false);
  const [identityAiLoading, setIdentityAiLoading] = useState(false);
  const [introAiError, setIntroAiError] = useState("");
  const [scriptAiError, setScriptAiError] = useState("");
  const [identityAiError, setIdentityAiError] = useState("");

  // Profile document (Route B)
  const [identityMode, setIdentityMode] = useState<"manual" | "document">(
    profile.profileDoc?.trim() ? "document" : "manual"
  );
  const [profileDoc, setProfileDoc] = useState(profile.profileDoc ?? "");
  const [profileDocName, setProfileDocName] = useState("");
  const [profileDocLoading, setProfileDocLoading] = useState(false);
  const profileDocFileRef = useRef<HTMLInputElement>(null);

  // YouTube import for Who Am I
  const [ytIdentityLoading, setYtIdentityLoading] = useState(false);
  const [ytIdentityStatus, setYtIdentityStatus] = useState("");
  const [showYtIdentityInput, setShowYtIdentityInput] = useState(false);
  const [ytIdentityUrl, setYtIdentityUrl] = useState(channelUrl);

  // YouTube import for My Style
  const [ytStyleLoading, setYtStyleLoading] = useState(false);
  const [ytStyleStatus, setYtStyleStatus] = useState("");
  const [showYtStyleInput, setShowYtStyleInput] = useState(false);
  const [ytStyleUrl, setYtStyleUrl] = useState(channelUrl);

  // Upload errors (per-tab)
  const [whoAmIUploadError, setWhoAmIUploadError] = useState("");
  const [styleUploadError, setStyleUploadError] = useState("");

  // Style tab — editable text
  const [styleText, setStyleText] = useState(initialStyle?.analysis ?? "");
  const [styleUploadLoading, setStyleUploadLoading] = useState(false);
  const styleTextFileRef = useRef<HTMLInputElement>(null);
  const [styleAiFeedback, setStyleAiFeedback] = useState("");
  const [styleAiLoading, setStyleAiLoading] = useState(false);
  const [styleAiError, setStyleAiError] = useState("");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadLoading(true);
    setStyleError("");
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Upload request timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Upload failed.");
      const newScripts: SampleScript[] = (data.scripts as { name: string; text: string }[]).map(
        (s: { name: string; text: string }) => ({ name: s.name, text: s.text })
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

  const handleStyleDocUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStyleDocLoading(true);
    setStyleError("");
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Upload timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Upload failed.");

      const scripts = data.scripts as { name: string; text: string; wordCount: number }[];
      if (!scripts?.length) throw new Error("No readable content found.");

      // Load doc directly as the style profile analysis — no AI analysis step needed
      const newProfile: StyleProfile = {
        scripts: scripts.map((s) => ({
          name: s.name,
          preview: s.text.slice(0, 120),
          sample: s.text.split(/\s+/).slice(0, 500).join(" "),
          wordCount: s.wordCount,
        })),
        analysis: scripts.map((s) => s.text).join("\n\n"),
        analyzedAt: Date.now(),
        isDoc: true,
      };
      setStyleProfile(newProfile);
      setAnalyzeSuccess(true);
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setStyleDocLoading(false);
    }
  }, []);

  const handleImportTranscripts = useCallback(async () => {
    if (!channelUrl.trim()) return;
    setTranscriptLoading(true);
    setTranscriptStatus("Fetching channel videos…");
    setStyleError("");
    try {
      // First, get video IDs from the channel
      const scrapeRes = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, apiKey }),
      });
      let scrapeData: any;
      try { scrapeData = await scrapeRes.json(); } catch { throw new Error("Channel request timed out — try again."); }
      if (!scrapeRes.ok) throw new Error((scrapeData.error as string) || "Could not scrape channel.");

      const videos = (scrapeData.videos ?? []) as { id: string; title: string }[];
      if (videos.length === 0) {
        setTranscriptStatus("No videos found on this channel.");
        return;
      }

      setTranscriptStatus(`Fetching transcripts for ${videos.length} videos…`);

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
        setTranscriptStatus(
          `Imported ${imported.length} transcript${imported.length !== 1 ? "s" : ""}${failCount > 0 ? ` · ${failCount} unavailable` : ""}`
        );
      }
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Transcript import failed.");
      setTranscriptStatus("");
    } finally {
      setTranscriptLoading(false);
    }
  }, [channelUrl, apiKey]);

  const handleAnalyze = useCallback(async () => {
    if (!apiKey.trim()) { setStyleError("Add your API key first (API Key tab)."); return; }
    if (pendingScripts.length === 0) { setStyleError("Add scripts before analyzing."); return; }
    setAnalyzeLoading(true);
    setStyleError("");
    setAnalyzeSuccess(false);
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scripts: pendingScripts.map((s) => ({ name: s.name, text: s.text })),
          apiKey,
        }),
      });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Analysis request timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Analysis failed.");
      const newProfile: StyleProfile = {
        scripts: pendingScripts.map((s) => ({
          name: s.name,
          preview: s.text.slice(0, 120),
          sample: s.text.split(/\s+/).slice(0, 500).join(" "),
          wordCount: s.text.split(/\s+/).filter(Boolean).length,
        })),
        analysis: data.analysis,
        analyzedAt: Date.now(),
      };
      setStyleProfile(newProfile);
      setPendingScripts([]);
      setAnalyzeSuccess(true);
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzeLoading(false);
    }
  }, [apiKey, pendingScripts]);

  const loadIdentityFromPersona = useCallback(() => {
    const persona = getWritingStyle(personaId);
    const id = persona.identity;
    if (id.name)              setName(id.name);
    if (id.channelUrl)        setChannelUrl(id.channelUrl);
    if (id.credibilityStack)  setCredibilityStack(id.credibilityStack);
    if (id.uniqueMethod)      setUniqueMethod(id.uniqueMethod);
    if (id.contraryBelief)    setContraryBelief(id.contraryBelief);
    if (id.targetPerson)      setTargetPerson(id.targetPerson);
    if (id.contentStyle)      setContentStyle(id.contentStyle);
  }, [personaId]);

  const loadThomasIdentity = useCallback(() => {
    const thomas = getWritingStyle("thomas");
    const id = thomas.identity;
    if (id.name)              setName(id.name);
    if (id.channelUrl)        setChannelUrl(id.channelUrl);
    if (id.credibilityStack)  setCredibilityStack(id.credibilityStack);
    if (id.uniqueMethod)      setUniqueMethod(id.uniqueMethod);
    if (id.contraryBelief)    setContraryBelief(id.contraryBelief);
    if (id.targetPerson)      setTargetPerson(id.targetPerson);
    if (id.contentStyle)      setContentStyle(id.contentStyle);
  }, []);

const handleProfileDocUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProfileDocLoading(true);
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
      const docName = scripts.map((s) => s.name).join(", ");
      setProfileDoc(fullText);
      setProfileDocName(docName);
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Upload failed.");
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
      if (!res.ok) {
        setScrapeStatus((data.error as string) || "Could not reach channel. Check the URL and try again.");
        return;
      }
      if (data.identityExtract) {
        const { credibilityStack: cs, uniqueMethod: um, contraryBelief: cb, targetPerson: tp } = data.identityExtract;
        if (cs) setCredibilityStack(cs);
        if (um) setUniqueMethod(um);
        if (cb) setContraryBelief(cb);
        if (tp) setTargetPerson(tp);
        setScrapeStatus(`✓ Pre-filled from channel${data.videos?.length ? ` · ${data.videos.length} videos found` : ""}`);
      } else {
        setScrapeStatus("Channel found but no identity data extracted. Fill in fields manually.");
      }
    } catch {
      setScrapeStatus("Network error — check your connection and try again.");
    } finally {
      setScrapeLoading(false);
    }
  }, [channelUrl]);

  const handleGuideFileUpload = useCallback(async (
    files: FileList | null,
    setter: (text: string) => void,
    setLoading: (v: boolean) => void,
    setError?: (msg: string) => void,
  ) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    setError?.("");
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Upload timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Upload failed.");
      const texts: string[] = (data.scripts as { text: string }[]).map((s) => s.text);
      setter(texts.join("\n\n"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setError ? setError(msg) : setStyleError(msg);
    } finally {
      setLoading(false);
    }
  }, [setStyleError]);

  // ── YouTube → Who Am I: scrape channel + transcripts → analyze identity ──
  const handleYouTubeIdentity = useCallback(async () => {
    const url = ytIdentityUrl.trim();
    if (!url) return;
    setYtIdentityLoading(true);
    setYtIdentityStatus("Scraping channel…");
    setWhoAmIUploadError("");
    try {
      // 1. Scrape channel
      const scrapeRes = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: url, apiKey: "" }),
      });
      let scrapeData: any;
      try { scrapeData = await scrapeRes.json(); } catch { throw new Error("Channel request timed out."); }
      if (!scrapeRes.ok) throw new Error(scrapeData.error || "Could not scrape channel.");

      const videos = (scrapeData.videos ?? []) as { id: string; title: string }[];
      if (videos.length === 0) throw new Error("No videos found on this channel.");

      // 2. Fetch transcripts
      setYtIdentityStatus(`Fetching transcripts from ${videos.length} videos…`);
      const transRes = await fetch("/api/fetch-transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos }),
      });
      let transData: any;
      try { transData = await transRes.json(); } catch { throw new Error("Transcript request timed out."); }
      if (!transRes.ok) throw new Error(transData.error || "Transcript fetch failed.");

      const transcripts = transData.transcripts ?? [];
      if (transcripts.length === 0) {
        const reasons = (transData.failed ?? []).map((f: any) => `${f.title || f.id}: ${f.reason}`).join("\n");
        throw new Error(`No transcripts available.${reasons ? `\n${reasons}` : ""}`);
      }

      // 3. Analyze identity from transcripts
      setYtIdentityStatus("Analyzing creator identity…");
      const analyzeRes = await fetch("/api/analyze-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcripts }),
      });
      let analyzeData: any;
      try { analyzeData = await analyzeRes.json(); } catch { throw new Error("Analysis timed out."); }
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analysis failed.");

      // 4. Format identity as a readable document
      const id = analyzeData.identity ?? {};
      const parts: string[] = [];
      if (id.name) parts.push(`# ${id.name}`);
      if (id.credibilityStack) parts.push(`## Credentials & Proof\n${id.credibilityStack}`);
      if (id.uniqueMethod) parts.push(`## Unique Method\n${id.uniqueMethod}`);
      if (id.contraryBelief) parts.push(`## Contrarian Belief\n${id.contraryBelief}`);
      if (id.targetPerson) parts.push(`## Target Audience\n${id.targetPerson}`);
      if (id.contentStyle) parts.push(`## Content Style\n${id.contentStyle}`);

      const doc = parts.join("\n\n");
      setProfileDoc(doc);

      // Also update the structured fields
      if (id.name) setName(id.name);
      if (id.credibilityStack) setCredibilityStack(id.credibilityStack);
      if (id.uniqueMethod) setUniqueMethod(id.uniqueMethod);
      if (id.contraryBelief) setContraryBelief(id.contraryBelief);
      if (id.targetPerson) setTargetPerson(id.targetPerson);
      if (id.contentStyle) setContentStyle(id.contentStyle);
      setChannelUrl(url);

      setYtIdentityStatus(`Done — identity extracted from ${transcripts.length} transcript${transcripts.length !== 1 ? "s" : ""}`);
      setShowYtIdentityInput(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "YouTube import failed.";
      setWhoAmIUploadError(msg);
      setYtIdentityStatus("");
    } finally {
      setYtIdentityLoading(false);
    }
  }, [ytIdentityUrl]);

  // ── YouTube → My Style: scrape channel + transcripts → forensic analysis ──
  const handleYouTubeStyle = useCallback(async () => {
    const url = ytStyleUrl.trim();
    if (!url) return;
    setYtStyleLoading(true);
    setYtStyleStatus("Scraping channel…");
    setStyleUploadError("");
    try {
      // 1. Scrape channel
      const scrapeRes = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: url, apiKey: "" }),
      });
      let scrapeData: any;
      try { scrapeData = await scrapeRes.json(); } catch { throw new Error("Channel request timed out."); }
      if (!scrapeRes.ok) throw new Error(scrapeData.error || "Could not scrape channel.");

      const videos = (scrapeData.videos ?? []) as { id: string; title: string }[];
      if (videos.length === 0) throw new Error("No videos found on this channel.");

      // 2. Fetch transcripts
      setYtStyleStatus(`Fetching transcripts from ${videos.length} videos…`);
      const transRes = await fetch("/api/fetch-transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos }),
      });
      let transData: any;
      try { transData = await transRes.json(); } catch { throw new Error("Transcript request timed out."); }
      if (!transRes.ok) throw new Error(transData.error || "Transcript fetch failed.");

      const transcripts = transData.transcripts ?? [];
      if (transcripts.length === 0) {
        const reasons = (transData.failed ?? []).map((f: any) => `${f.title || f.id}: ${f.reason}`).join("\n");
        throw new Error(`No transcripts available.${reasons ? `\n${reasons}` : ""}`);
      }

      // 3. Run forensic style analysis
      setYtStyleStatus(`Analyzing writing style from ${transcripts.length} transcript${transcripts.length !== 1 ? "s" : ""}…`);
      const analyzeRes = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scripts: transcripts.map((t: any) => ({ name: t.title, text: t.text })),
          apiKey,
        }),
      });
      let analyzeData: any;
      try { analyzeData = await analyzeRes.json(); } catch { throw new Error("Analysis timed out."); }
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Style analysis failed.");

      setStyleText(analyzeData.analysis ?? "");
      setChannelUrl(url);

      setYtStyleStatus(`Done — style extracted from ${transcripts.length} transcript${transcripts.length !== 1 ? "s" : ""}`);
      setShowYtStyleInput(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "YouTube import failed.";
      setStyleUploadError(msg);
      setYtStyleStatus("");
    } finally {
      setYtStyleLoading(false);
    }
  }, [ytStyleUrl, apiKey]);

  const handleAiUpdate = useCallback(async (
    guideType: "introGuide" | "scriptGuide" | "whoAmI" | "whoAmIDoc" | "styleDoc",
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
    // Build styleProfile from editable styleText
    const savedStyleProfile: StyleProfile | null = styleText.trim()
      ? {
          scripts: styleProfile?.scripts ?? [],
          analysis: styleText,
          analyzedAt: styleProfile?.analyzedAt ?? Date.now(),
          isDoc: true,
        }
      : styleProfile;

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

    // Save to Supabase if userId is present
    if (userId) {
      const supabase = createClient();
      await upsertPersonaProfile(supabase, userId, personaId, {
        whoAmI: { name, channelUrl, credibilityStack, uniqueMethod, contraryBelief, targetPerson, contentStyle, profileDoc },
        styleProfile: savedStyleProfile,
        introGuide,
        scriptGuide,
      });
    }

    onSave(updatedProfile, savedStyleProfile, apiKey, anthropicApiKey, introGuide, scriptGuide);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "identity",    label: "Who Am I" },
    { id: "style",       label: "My Style" },
    { id: "introguide",  label: "Intro Guide" },
    { id: "scriptguide", label: "Script Guide" },
  ];

  const contentStyles = [
    { id: "talking-head", label: "Talking Head", icon: "🎙️" },
    { id: "educational-breakdown", label: "Educational", icon: "📋" },
    { id: "story-driven", label: "Story-Driven", icon: "📖" },
    { id: "fast-lists", label: "Fast Lists", icon: "⚡" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(26,26,46,0.6)", backdropFilter: "blur(16px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl flex flex-col overflow-hidden animate-scale-in"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "90vh", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div>
            <p className="text-sm font-bold tracking-tight" style={{ color: "var(--foreground)", fontFamily: "var(--font-syne)" }}>Edit Profile</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {profile.name || "Your creator profile"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-press w-7 h-7 flex items-center justify-center rounded-xl text-sm font-bold"
            style={{ color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1.5 mx-6 my-3 rounded-xl flex-shrink-0" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="btn-press flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={{
                color: safeTab === t.id ? "var(--foreground)" : "var(--muted)",
                background: safeTab === t.id ? "var(--surface)" : "transparent",
                boxShadow: safeTab === t.id ? "var(--shadow-sm)" : "none",
                fontFamily: "var(--font-syne)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {safeTab === "identity" && (
            <div className="flex flex-col gap-5">

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Who Am I</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      Governs: name, credentials, method, beliefs, audience
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {profileDoc && (
                      <button
                        type="button"
                        onClick={() => { setProfileDoc(""); setProfileDocName(""); }}
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => profileDocFileRef.current?.click()}
                      disabled={profileDocLoading || ytIdentityLoading}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      style={{ background: "rgba(255,78,80,0.08)", color: "var(--accent)", border: "1px solid rgba(255,78,80,0.25)" }}
                    >
                      {profileDocLoading ? "Uploading…" : "Upload"}
                    </button>
                    <input
                      ref={profileDocFileRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      className="hidden"
                      onChange={(e) => handleGuideFileUpload(e.target.files, setProfileDoc, setProfileDocLoading, setWhoAmIUploadError)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowYtIdentityInput(!showYtIdentityInput)}
                      disabled={ytIdentityLoading || profileDocLoading}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      style={{ background: "rgba(255,0,0,0.06)", color: "#c00", border: "1px solid rgba(255,0,0,0.2)" }}
                    >
                      {ytIdentityLoading ? "Importing…" : "From YouTube"}
                    </button>
                  </div>
                </div>
              </div>

              {/* YouTube channel URL input for Who Am I */}
              {(showYtIdentityInput || ytIdentityLoading) && (
                <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.15)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                    Import identity from YouTube channel
                  </p>
                  <p className="text-xs leading-4" style={{ color: "var(--muted)" }}>
                    We'll fetch recent video transcripts and extract your creator identity automatically.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ytIdentityUrl}
                      onChange={(e) => setYtIdentityUrl(e.target.value)}
                      placeholder="youtube.com/@yourchannel"
                      disabled={ytIdentityLoading}
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      onKeyDown={(e) => { if (e.key === "Enter" && !ytIdentityLoading) handleYouTubeIdentity(); }}
                    />
                    <button
                      type="button"
                      onClick={handleYouTubeIdentity}
                      disabled={ytIdentityLoading || !ytIdentityUrl.trim()}
                      className="text-xs px-4 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2"
                      style={{ background: "#c00", color: "#fff" }}
                    >
                      {ytIdentityLoading
                        ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Importing…</>
                        : "Import"}
                    </button>
                  </div>
                  {ytIdentityStatus && (
                    <p className="text-xs" style={{ color: ytIdentityStatus.startsWith("Done") ? "var(--green)" : "var(--muted)" }}>
                      {ytIdentityStatus}
                    </p>
                  )}
                </div>
              )}

              <textarea
                value={profileDoc}
                onChange={(e) => setProfileDoc(e.target.value)}
                placeholder={"Describe who you are — your credentials, unique approach, contrarian beliefs, and who your content is for.\n\nUpload a document to auto-fill this, or type directly. The AI uses this as your identity context when generating every script."}
                rows={18}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6 font-mono"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 300 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />

              {whoAmIUploadError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>
                  {whoAmIUploadError}
                </p>
              )}

              {profileDoc ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
                  {profileDoc.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
                  <span style={{ color: "var(--border-light)" }}>·</span>
                  <span>AI will use this as your identity for every script</span>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-3 text-xs leading-5" style={{ background: "rgba(124,92,252,0.06)", color: "var(--muted)", border: "1px solid rgba(124,92,252,0.15)" }}>
                  <strong style={{ color: "var(--accent)" }}>No identity document.</strong> Type directly or upload a file to populate this.
                </div>
              )}

              {/* AI refine panel */}
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(124,92,252,0.05)", border: "1px solid rgba(124,92,252,0.2)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Refine with AI</p>
                <p className="text-xs leading-4" style={{ color: "var(--muted)" }}>
                  Describe what to change and the AI will update your identity document automatically.
                </p>
                <textarea
                  value={identityFeedback}
                  onChange={(e) => { setIdentityFeedback(e.target.value); setIdentityAiError(""); }}
                  placeholder={`e.g. "Update my credentials — I've now helped 600 clients and hit $3M revenue" or "Add a section about my contrarian belief on pricing"`}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                {identityAiError && <p className="text-xs" style={{ color: "var(--red)" }}>{identityAiError}</p>}
                <button
                  type="button"
                  disabled={identityAiLoading || !identityFeedback.trim()}
                  onClick={() => handleAiUpdate(
                    "whoAmIDoc",
                    profileDoc,
                    identityFeedback,
                    setIdentityAiLoading,
                    setIdentityAiError,
                    (updated) => setProfileDoc(updated as string),
                    () => setIdentityFeedback(""),
                  )}
                  className="w-full rounded-lg py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {identityAiLoading
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating…</>
                    : "✦ Update with AI"}
                </button>
              </div>
            </div>
          )}

          {safeTab === "style" && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>My Style</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      Governs: vocabulary, tone, sentence rhythm, hooks, transitions
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {styleText && (
                      <button
                        type="button"
                        onClick={() => setStyleText("")}
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => styleTextFileRef.current?.click()}
                      disabled={styleUploadLoading || ytStyleLoading}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      style={{ background: "rgba(255,78,80,0.08)", color: "var(--accent)", border: "1px solid rgba(255,78,80,0.25)" }}
                    >
                      {styleUploadLoading ? "Uploading…" : "Upload"}
                    </button>
                    <input
                      ref={styleTextFileRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      className="hidden"
                      onChange={(e) => handleGuideFileUpload(e.target.files, setStyleText, setStyleUploadLoading, setStyleUploadError)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowYtStyleInput(!showYtStyleInput)}
                      disabled={ytStyleLoading || styleUploadLoading}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      style={{ background: "rgba(255,0,0,0.06)", color: "#c00", border: "1px solid rgba(255,0,0,0.2)" }}
                    >
                      {ytStyleLoading ? "Importing…" : "From YouTube"}
                    </button>
                  </div>
                </div>
              </div>

              {/* YouTube channel URL input for My Style */}
              {(showYtStyleInput || ytStyleLoading) && (
                <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.15)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                    Import writing style from YouTube channel
                  </p>
                  <p className="text-xs leading-4" style={{ color: "var(--muted)" }}>
                    We'll fetch recent video transcripts and run a forensic style analysis to extract your writing DNA.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ytStyleUrl}
                      onChange={(e) => setYtStyleUrl(e.target.value)}
                      placeholder="youtube.com/@yourchannel"
                      disabled={ytStyleLoading}
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      onKeyDown={(e) => { if (e.key === "Enter" && !ytStyleLoading) handleYouTubeStyle(); }}
                    />
                    <button
                      type="button"
                      onClick={handleYouTubeStyle}
                      disabled={ytStyleLoading || !ytStyleUrl.trim()}
                      className="text-xs px-4 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2"
                      style={{ background: "#c00", color: "#fff" }}
                    >
                      {ytStyleLoading
                        ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Analyzing…</>
                        : "Analyze"}
                    </button>
                  </div>
                  {ytStyleStatus && (
                    <p className="text-xs" style={{ color: ytStyleStatus.startsWith("Done") ? "var(--green)" : "var(--muted)" }}>
                      {ytStyleStatus}
                    </p>
                  )}
                </div>
              )}

              <textarea
                value={styleText}
                onChange={(e) => setStyleText(e.target.value)}
                placeholder={"Describe your writing style — vocabulary, tone, sentence structure, how you open videos, transitions, pacing, rhetorical devices.\n\nUpload a style guide document to auto-fill this, or type directly. The AI mirrors this style in every script it writes for you."}
                rows={18}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6 font-mono"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 300 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />

              {styleUploadError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>
                  {styleUploadError}
                </p>
              )}

              {styleText ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
                  {styleText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
                  <span style={{ color: "var(--border-light)" }}>·</span>
                  <span>AI will mirror this style for every script</span>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-3 text-xs leading-5" style={{ background: "rgba(124,92,252,0.06)", color: "var(--muted)", border: "1px solid rgba(124,92,252,0.15)" }}>
                  <strong style={{ color: "var(--accent)" }}>No style guide.</strong> Upload a document or type your style notes directly.
                </div>
              )}

              {/* AI refine panel */}
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(124,92,252,0.05)", border: "1px solid rgba(124,92,252,0.2)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Refine with AI</p>
                <p className="text-xs leading-4" style={{ color: "var(--muted)" }}>
                  Describe what to change and the AI will update your style guide automatically.
                </p>
                <textarea
                  value={styleAiFeedback}
                  onChange={(e) => { setStyleAiFeedback(e.target.value); setStyleAiError(""); }}
                  placeholder={`e.g. "Add a rule: always use short punchy sentences in the hook" or "Remove the formal tone notes — I'm actually very casual and conversational"`}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                {styleAiError && <p className="text-xs" style={{ color: "var(--red)" }}>{styleAiError}</p>}
                <button
                  type="button"
                  disabled={styleAiLoading || !styleAiFeedback.trim()}
                  onClick={() => handleAiUpdate(
                    "styleDoc",
                    styleText,
                    styleAiFeedback,
                    setStyleAiLoading,
                    setStyleAiError,
                    (updated) => setStyleText(updated as string),
                    () => setStyleAiFeedback(""),
                  )}
                  className="w-full rounded-lg py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {styleAiLoading
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating…</>
                    : "✦ Update with AI"}
                </button>
              </div>
            </div>
          )}

          {(safeTab === "introguide" || safeTab === "scriptguide") && (() => {
            const isIntro = safeTab === "introguide";
            const guideText = isIntro ? introGuide : scriptGuide;
            const setGuide = isIntro ? setIntroGuide : setScriptGuide;
            const uploading = isIntro ? introGuideUploading : scriptGuideUploading;
            const setUploading = isIntro ? setIntroGuideUploading : setScriptGuideUploading;
            const fileRef = isIntro ? introGuideFileRef : scriptGuideFileRef;
            const isCustomStyle = personaId === "custom";
            const docName = isIntro ? "Thomas_Graham_How_To_Write_An_Introduction.docx" : "Thomas_Graham_How_To_Write_A_Script.docx";
            const placeholder = isIntro
              ? isCustomStyle
                ? "Write your intro guide here.\n\nTell the AI exactly how you want every introduction structured — beats, opening approach, length, what to always/never include."
                : "Paste your intro writing guide here, or upload the .docx file.\n\nThis tells the AI exactly how to structure every introduction — beats, modes, USP stacking, and what to never write."
              : isCustomStyle
                ? "Write your script guide here.\n\nTell the AI how to structure the body, where to place re-hooks, how to handle story flow, write the outro, and embed CTAs."
                : "Paste your script writing guide here, or upload the .docx file.\n\nThis tells the AI how to structure the body, place rehooks, handle story flow, write the outro, and embed CTAs.";
            const governs = isIntro ? "Intro beats, modes, USP" : "Body, rehooks, story flow, outro, CTAs";

            return (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        {isIntro ? "How To Write An Introduction" : "How To Write A Script"}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        Governs: {governs}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {guideText && (
                        <button
                          type="button"
                          onClick={() => setGuide("")}
                          className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                        style={{ background: "rgba(255,78,80,0.08)", color: "var(--accent)", border: "1px solid rgba(255,78,80,0.25)" }}
                      >
                        {uploading ? "Uploading…" : "Upload .docx / .txt"}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        multiple
                        className="hidden"
                        onChange={(e) => handleGuideFileUpload(e.target.files, setGuide, setUploading)}
                      />
                    </div>
                  </div>
                </div>

                <textarea
                  value={guideText}
                  onChange={(e) => setGuide(e.target.value)}
                  placeholder={placeholder}
                  rows={18}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6 font-mono"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 300 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />

                {guideText ? (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
                    {guideText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
                    <span style={{ color: "var(--border-light)" }}>·</span>
                    <span>AI will use this guide for every script</span>
                  </div>
                ) : isCustomStyle ? (
                  <div className="rounded-xl px-4 py-3 text-xs leading-5" style={{ background: "var(--accent-glow)", color: "var(--muted)", border: "1px solid rgba(255,78,80,0.2)" }}>
                    <strong style={{ color: "var(--accent)" }}>No guide yet.</strong> This is your blank canvas — write your own {isIntro ? "intro structure" : "script structure"} above. The AI will follow it for every script you generate.
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-3 text-xs leading-5" style={{ background: "var(--accent-glow)", color: "var(--muted)", border: "1px solid rgba(255,78,80,0.2)" }}>
                    <strong style={{ color: "var(--accent)" }}>Using default framework.</strong> Upload <code style={{ background: "var(--surface)", padding: "0 3px", borderRadius: 3 }}>{docName}</code> to override with your custom guide.
                  </div>
                )}

                {/* AI feedback panel */}
                <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,78,80,0.04)", border: "1px solid rgba(255,78,80,0.15)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Refine with AI</p>
                  <p className="text-xs leading-4" style={{ color: "var(--muted)" }}>
                    Describe what to change and the AI will update the guide document automatically.
                  </p>
                  <textarea
                    value={isIntro ? introFeedback : scriptFeedback}
                    onChange={(e) => {
                      if (isIntro) { setIntroFeedback(e.target.value); setIntroAiError(""); }
                      else { setScriptFeedback(e.target.value); setScriptAiError(""); }
                    }}
                    placeholder={isIntro
                      ? `e.g. "Add a rule: never start the intro with a question" or "Remove section 3 and replace it with a 2-beat proof stack"`
                      : `e.g. "Add a rule about always using a bridge sentence before each section" or "Update the CTA instructions to mention a free guide first"`}
                    rows={3}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                  {(isIntro ? introAiError : scriptAiError) && (
                    <p className="text-xs" style={{ color: "var(--red)" }}>
                      {isIntro ? introAiError : scriptAiError}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={(isIntro ? introAiLoading : scriptAiLoading) || !(isIntro ? introFeedback : scriptFeedback).trim()}
                    onClick={() => handleAiUpdate(
                      isIntro ? "introGuide" : "scriptGuide",
                      guideText,
                      isIntro ? introFeedback : scriptFeedback,
                      isIntro ? setIntroAiLoading : setScriptAiLoading,
                      isIntro ? setIntroAiError : setScriptAiError,
                      (updated) => setGuide(updated as string),
                      () => isIntro ? setIntroFeedback("") : setScriptFeedback(""),
                    )}
                    className="w-full rounded-lg py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {(isIntro ? introAiLoading : scriptAiLoading)
                      ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating guide…</>
                      : "✦ Update with AI"}
                  </button>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <button
            onClick={onClose}
            className="btn-press text-sm font-medium px-4 py-2 rounded-xl"
            style={{ color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { void handleSave(); }}
            className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2"
            style={{
              background: saved ? "rgba(0,201,167,0.1)" : "linear-gradient(135deg, var(--accent), #FF7B35)",
              color: saved ? "var(--green)" : "#fff",
              border: saved ? "1px solid rgba(0,201,167,0.3)" : "none",
              boxShadow: saved ? "none" : "var(--shadow-accent)",
              fontFamily: "var(--font-syne)",
            }}
          >
            {saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
