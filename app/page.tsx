"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0" />,
});

// ─── Custom cursor ────────────────────────────────────────────────────────────

function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const [hovered, setHovered] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    const onEnter = () => setHovered(true);
    const onLeave = () => setHovered(false);

    window.addEventListener("mousemove", onMove);

    const update = () => {
      const dot = dotRef.current;
      const r = ringRef.current;
      if (dot && r) {
        dot.style.transform = `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`;
        ring.current.x += (pos.current.x - ring.current.x) * 0.35;
        ring.current.y += (pos.current.y - ring.current.y) * 0.35;
        r.style.transform = `translate(${ring.current.x - 16}px, ${ring.current.y - 16}px)`;
      }
      raf.current = requestAnimationFrame(update);
    };
    raf.current = requestAnimationFrame(update);

    const links = document.querySelectorAll("a, button");
    links.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-[#7c5cfc] pointer-events-none z-[9999] transition-opacity duration-300"
        style={{ willChange: "transform" }}
      />
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 w-8 h-8 rounded-full border pointer-events-none z-[9999] ${
          hovered
            ? "border-white opacity-80"
            : "border-[#7c5cfc]/50 opacity-60"
        }`}
        style={{ willChange: "transform" }}
      />
    </>
  );
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#09090f]/90 backdrop-blur-xl border-b border-white/[0.06]"
          : ""
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-8 h-[64px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" fill="#7c5cfc" opacity="0.2" />
            <path d="M7 8h10M7 12h10M7 16h6" stroke="#7c5cfc" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="text-white font-semibold text-[15px] tracking-[-0.3px]">ScriptForge</span>
        </div>

        <div className="hidden md:flex items-center gap-9">
          {[["Features", "#features"], ["Process", "#process"], ["Pricing", "#pricing"]].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-[#666] hover:text-white text-[13px] font-medium transition-colors duration-200 tracking-wide"
            >
              {label}
            </a>
          ))}
        </div>

        <Link
          href="/studio"
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-[#09090f] text-[13px] font-semibold hover:bg-white/90 transition-all duration-150 hover:scale-[1.03]"
        >
          Open App
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}

// ─── Animated script terminal mockup ─────────────────────────────────────────

const SCRIPT_SEGMENTS = [
  {
    hook: `"Most creators spend 40 hours a month writing scripts.\n\nThey still don't sound like themselves."`,
    action: "[Beat. Direct to camera.]",
    body: `"In the next 8 minutes, I'll show you the exact system\nthat changed how I write — and how my channel grew\n3× in 90 days without posting more often."`,
  },
  {
    hook: `"Everyone tells you to post consistently.\n\nHere's why that advice is keeping you stuck."`,
    action: "[Pause. Let it breathe.]",
    body: `"The channels that blow up aren't posting more —\nthey're engineering their scripts differently.\nAnd today you're getting the full framework."`,
  },
  {
    hook: `"I used to spend a full Sunday writing one video.\n\nNow it takes 20 minutes. The results are better."`,
    action: "[Look away. Then back.]",
    body: `"What changed wasn't my writing ability.\nIt was the system underneath the script.\nHere's exactly how it works..."`,
  },
];

function ScriptTerminal() {
  const [seg, setSeg] = useState(0);
  const [phase, setPhase] = useState<"typing" | "hold" | "fade">("typing");
  const [displayed, setDisplayed] = useState("");
  const [charIdx, setCharIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const fullText = `${SCRIPT_SEGMENTS[seg].hook}\n\n${SCRIPT_SEGMENTS[seg].action}\n\n${SCRIPT_SEGMENTS[seg].body}`;

  useEffect(() => {
    if (phase === "typing") {
      if (charIdx < fullText.length) {
        const delay = fullText[charIdx] === "\n" ? 60 : 18 + Math.random() * 16;
        const t = setTimeout(() => {
          setDisplayed(fullText.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        }, delay);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("hold"), 2800);
        return () => clearTimeout(t);
      }
    }
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("fade"), 600);
      return () => clearTimeout(t);
    }
    if (phase === "fade") {
      setVisible(false);
      const t = setTimeout(() => {
        setSeg((s) => (s + 1) % SCRIPT_SEGMENTS.length);
        setDisplayed("");
        setCharIdx(0);
        setPhase("typing");
        setVisible(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [phase, charIdx, fullText]);

  const lines = displayed.split("\n");

  return (
    <div className="relative w-full max-w-[480px] rounded-[16px] overflow-hidden border border-white/[0.08] bg-[#0d0d14] shadow-[0_0_80px_rgba(124,92,252,0.15),0_0_0_1px_rgba(255,255,255,0.04)]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-white/[0.06] bg-[#111119]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] text-[#444] font-mono tracking-wide">scriptforge — thomas graham style</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cfc] animate-pulse" />
          <span className="text-[10px] text-[#7c5cfc] font-semibold">LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div
        className={`px-5 py-5 min-h-[280px] transition-opacity duration-400 font-mono text-[13px] leading-[1.8]`}
        style={{ opacity: visible ? 1 : 0 }}
      >
        {/* Labels */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7c5cfc]/15 text-[#a78bfa] tracking-widest">HOOK</span>
          <span className="text-[#333] text-[10px] font-mono">— youtube long-form</span>
        </div>

        {lines.map((line, i) => {
          const isAction = line.startsWith("[");
          const isEmpty = line === "";
          const isBodyStart = displayed.includes(SCRIPT_SEGMENTS[seg].action) &&
            i > displayed.split("\n").findIndex(l => l.startsWith("[")) + 1;

          if (isEmpty) return <div key={i} className="h-3" />;
          if (isAction) {
            return (
              <div key={i} className="text-[#4a4a6a] italic text-[11px] my-2">
                {line}
              </div>
            );
          }
          if (isBodyStart) {
            return (
              <p key={i} className="text-[#8888a4] text-[12px]">
                {line}
              </p>
            );
          }
          return (
            <p key={i} className={`text-[#e8e8f0] ${i === 0 ? "font-medium" : ""}`}>
              {line}
            </p>
          );
        })}

        {/* Blinking cursor */}
        {phase === "typing" && (
          <span className="inline-block w-[2px] h-[14px] bg-[#7c5cfc] align-middle animate-pulse ml-px" />
        )}
      </div>

      {/* Footer bar */}
      <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
        <div className="flex gap-1.5">
          {SCRIPT_SEGMENTS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === seg ? "20px" : "6px",
                backgroundColor: i === seg ? "#7c5cfc" : "#2a2a3a",
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-[#2a2a3a] font-mono">
          generated in 8s
        </span>
      </div>
    </div>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  "Style DNA Extraction",
  "YouTube Long-Form",
  "Instagram Reels",
  "Hook Engineering",
  "Thomas Graham System",
  "Alex Hormozi Framework",
  "Rehook Architecture",
  "Curiosity Gap Mechanics",
  "Voice Matching",
  "Retention Optimization",
  "Script Export",
  "Channel Scraping",
];

function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-[#09090f] py-4 select-none">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#09090f] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#09090f] to-transparent pointer-events-none" />
      <div className="flex animate-marquee whitespace-nowrap">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <div key={i} className="flex items-center gap-4 mx-4 flex-shrink-0">
            <span className="text-[12px] text-[#444] font-medium tracking-[0.08em] uppercase">
              {item}
            </span>
            <span className="w-1 h-1 rounded-full bg-[#7c5cfc]/50 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#09090f]">
      <HeroScene />

      {/* Vignette */}
      <div className="absolute inset-0 bg-radial-[ellipse_at_30%_50%] from-transparent via-transparent to-[#09090f]/70 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#09090f]/80 via-[#09090f]/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#09090f] pointer-events-none" />

      <div className="relative z-10 flex-1 flex items-center">
        <div className="max-w-[1200px] mx-auto w-full px-8 pt-28 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-16 items-center">

            {/* Left */}
            <div className="max-w-[560px]">
              <div
                className={`flex items-center gap-3 mb-8 transition-all duration-700 ${ready ? "opacity-100" : "opacity-0 -translate-y-2"}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7c5cfc]">
                  <span className="w-4 h-px bg-[#7c5cfc]" />
                  AI Script Generation
                </div>
              </div>

              <h1
                className={`font-black tracking-[-3px] leading-[0.92] text-white mb-7 transition-all duration-700 delay-100 ${ready ? "opacity-100" : "opacity-0 translate-y-4"}`}
                style={{ fontSize: "clamp(52px, 7vw, 88px)" }}
              >
                Your next<br />
                script.<br />
                <em className="not-italic text-[#7c5cfc]">Already<br />written.</em>
              </h1>

              <p
                className={`text-[#666] text-[17px] leading-[1.7] mb-10 max-w-[440px] transition-all duration-700 delay-200 ${ready ? "opacity-100" : "opacity-0 translate-y-4"}`}
              >
                Upload your existing scripts. ScriptForge extracts your writing
                DNA and generates YouTube scripts in your exact voice — in under
                60 seconds.
              </p>

              <div
                className={`flex items-center gap-4 flex-wrap transition-all duration-700 delay-300 ${ready ? "opacity-100" : "opacity-0 translate-y-4"}`}
              >
                <Link
                  href="/studio"
                  className="group flex items-center gap-2.5 h-12 px-6 rounded-xl bg-[#7c5cfc] hover:bg-[#6b4eeb] text-white font-bold text-[15px] transition-all duration-200 hover:shadow-[0_0_40px_rgba(124,92,252,0.5)] hover:scale-[1.03] active:scale-[0.98]"
                >
                  Generate My First Script
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-0.5 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <div className="flex items-center gap-2 text-[#444] text-[13px]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#7c5cfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  No credit card required
                </div>
              </div>

              {/* Social proof row */}
              <div
                className={`mt-12 pt-8 border-t border-white/[0.06] flex items-center gap-8 transition-all duration-700 delay-[400ms] ${ready ? "opacity-100" : "opacity-0 translate-y-4"}`}
              >
                {[
                  ["847", "Creators"],
                  ["12K+", "Scripts"],
                  ["94%", "Style Match"],
                ].map(([val, label]) => (
                  <div key={label}>
                    <div className="text-white font-black text-[22px] tracking-[-0.5px]">{val}</div>
                    <div className="text-[#444] text-[12px] font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — terminal */}
            <div
              className={`hidden lg:block transition-all duration-1000 delay-500 ${ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <ScriptTerminal />
            </div>

          </div>
        </div>
      </div>

      <Marquee />
    </section>
  );
}

// ─── Feature sections ─────────────────────────────────────────────────────────

const FEATURE_SECTIONS = [
  {
    num: "01",
    tag: "Style DNA",
    title: "It learns how\nyou write.",
    body: "Upload 2–5 of your existing scripts. ScriptForge performs a forensic analysis — extracting your vocabulary range, sentence rhythm, structural patterns, tonal palette, and rhetorical fingerprints. Every generated script is built on that foundation.",
    detail: [
      "Vocabulary & word-choice mapping",
      "Sentence length distribution",
      "Structural DNA extraction",
      "Tonal fingerprint analysis",
    ],
    visual: (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d14] p-6 font-mono text-[12px] leading-[1.9] w-full max-w-[380px]">
        <div className="text-[10px] text-[#7c5cfc] font-bold tracking-widest mb-4">STYLE DNA REPORT</div>
        {[
          ["Avg. sentence length", "14–18 words"],
          ["Tone", "Calm authority"],
          ["Vocabulary tier", "Accessible + precise"],
          ["Hook archetype", "Counter-intuitive claim"],
          ["Transition style", "Rapid-cut + beat pauses"],
          ["CTA pattern", "Logical consequence"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-1 border-b border-white/[0.04]">
            <span className="text-[#444]">{k}</span>
            <span className="text-[#a78bfa] font-medium">{v}</span>
          </div>
        ))}
        <div className="mt-4 text-[10px] text-[#333]">Analysis confidence: 97.3%</div>
      </div>
    ),
    flip: false,
  },
  {
    num: "02",
    tag: "Script Engine",
    title: "Full scripts.\nYour voice.",
    body: "Enter your video topic. Choose YouTube long-form (5–20+ min) or Instagram Reels. The engine combines your Style DNA with proven psychological frameworks — hook mechanics, curiosity gaps, rehooks, emotional variety — to produce a complete, ready-to-record script.",
    detail: [
      "YouTube: short, medium, long-form",
      "6 Instagram Reels templates",
      "Hook alternatives on demand",
      "One-click HTML export",
    ],
    visual: (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d14] overflow-hidden w-full max-w-[380px]">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#7c5cfc] tracking-widest">GENERATED SCRIPT</span>
          <span className="text-[10px] text-[#333]">YouTube · Medium · 12 min</span>
        </div>
        <div className="px-5 py-4 font-mono text-[12px] leading-[1.85] space-y-3">
          <div>
            <div className="text-[9px] text-[#7c5cfc] tracking-widest mb-1 font-bold">HOOK — 0:00</div>
            <p className="text-[#ccc]">&quot;The productivity advice you&apos;ve been following is designed for a different era. Here&apos;s what works now.&quot;</p>
          </div>
          <div className="text-[#2a2a3a] italic text-[11px]">[Beat. Camera tight on face.]</div>
          <div>
            <div className="text-[9px] text-[#7c5cfc] tracking-widest mb-1 font-bold">REHOOK — 0:35</div>
            <p className="text-[#888]">&quot;Stay with me, because what I&apos;m about to show you changed how I get more done in 4 hours than most people...&quot;</p>
          </div>
        </div>
      </div>
    ),
    flip: true,
  },
  {
    num: "03",
    tag: "Persona System",
    title: "Write like the\nbest in your field.",
    body: "ScriptForge ships with complete scripting frameworks from proven creators. Thomas Graham's calm, proof-backed style. Alex Hormozi's dense value delivery. Apply their system to your content — their framework, your story, your voice.",
    detail: [
      "Thomas Graham: calm authority",
      "Alex Hormozi: dense value (coming soon)",
      "Custom personas: upload your guides",
      "Framework + DNA blending",
    ],
    visual: (
      <div className="space-y-3 w-full max-w-[380px]">
        {[
          {
            name: "Thomas Graham",
            tag: "Available",
            desc: "Calm authority. Proof-backed claims. Zero hype. Educational depth with surgical precision.",
            color: "#7c5cfc",
          },
          {
            name: "Alex Hormozi",
            tag: "Coming soon",
            desc: "Dense value delivery. Bold claims. Math-backed frameworks. No-fluff monetization.",
            color: "#f59e0b",
          },
        ].map((p) => (
          <div
            key={p.name}
            className="rounded-xl border border-white/[0.06] bg-[#0d0d14] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold text-[14px]">{p.name}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${p.color}20`, color: p.color }}
              >
                {p.tag}
              </span>
            </div>
            <p className="text-[#555] text-[12px] leading-[1.6]">{p.desc}</p>
          </div>
        ))}
      </div>
    ),
    flip: false,
  },
];

function FeatureSections() {
  return (
    <section id="features" className="bg-[#09090f]">
      {FEATURE_SECTIONS.map((feat, i) => (
        <FeaturePanel key={feat.num} feat={feat} index={i} />
      ))}
    </section>
  );
}

function FeaturePanel({
  feat,
  index,
}: {
  feat: (typeof FEATURE_SECTIONS)[number];
  index: number;
}) {
  const { ref, inView } = useInView(0.12);
  const isLast = index === FEATURE_SECTIONS.length - 1;

  return (
    <div
      className={`border-t border-white/[0.05] ${isLast ? "border-b" : ""}`}
    >
      <div
        ref={ref}
        className={`max-w-[1200px] mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center transition-all duration-700 ${
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        {/* Text side */}
        <div className={feat.flip ? "lg:order-2" : ""}>
          <div className="flex items-baseline gap-4 mb-5">
            <span className="text-[80px] font-black text-white/[0.04] leading-none tracking-[-4px] select-none">
              {feat.num}
            </span>
            <span className="text-[11px] font-bold text-[#7c5cfc] tracking-[0.15em] uppercase">
              {feat.tag}
            </span>
          </div>

          <h2 className="text-[42px] md:text-[52px] font-black text-white tracking-[-2px] leading-[0.95] mb-6 whitespace-pre-line">
            {feat.title}
          </h2>

          <p className="text-[#666] text-[16px] leading-[1.75] mb-8 max-w-[440px]">
            {feat.body}
          </p>

          <ul className="space-y-3">
            {feat.detail.map((d) => (
              <li key={d} className="flex items-center gap-3 text-[14px] text-[#555]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#7c5cfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {d}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual side */}
        <div className={`flex ${feat.flip ? "lg:order-1 lg:justify-start" : "lg:justify-end"}`}>
          {feat.visual}
        </div>
      </div>
    </div>
  );
}

// ─── Process ──────────────────────────────────────────────────────────────────

function Process() {
  const { ref, inView } = useInView();

  return (
    <section id="process" className="bg-[#09090f] py-28">
      <div className="max-w-[1200px] mx-auto px-8">
        <div
          ref={ref}
          className={`mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <p className="text-[11px] font-bold text-[#7c5cfc] tracking-[0.15em] uppercase mb-4 flex items-center gap-3">
            <span className="w-6 h-px bg-[#7c5cfc]" /> How it works
          </p>
          <h2 className="text-[48px] md:text-[60px] font-black text-white tracking-[-2.5px] leading-[0.92]">
            Blank page to<br />
            record-ready.<br />
            <span className="text-[#444]">In three steps.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/[0.06] rounded-2xl overflow-hidden">
          {[
            {
              n: "1",
              title: "Upload Your Scripts",
              desc: "Drop in 2–5 existing scripts. We run a deep forensic analysis to extract your writing fingerprint — vocabulary, rhythm, structure, tone.",
              note: "Supports .docx, .txt, .md",
            },
            {
              n: "2",
              title: "Define Your Positioning",
              desc: "Add your channel context, audience, credibility stack, and reference videos. Optionally scrape a competitor's channel to incorporate their positioning.",
              note: "YouTube channel scraping included",
            },
            {
              n: "3",
              title: "Generate & Record",
              desc: "Type your topic. Hit generate. Get a complete, production-ready script that sounds exactly like you wrote it on your best day.",
              note: "Export as formatted HTML",
            },
          ].map((step, i) => (
            <StepBlock key={step.n} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepBlock({
  step,
  index,
}: {
  step: { n: string; title: string; desc: string; note: string };
  index: number;
}) {
  const { ref, inView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={`p-8 border-r border-white/[0.06] last:border-r-0 transition-all duration-700 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className="text-[56px] font-black text-white/[0.04] leading-none mb-6 select-none">
        {step.n}
      </div>
      <h3 className="text-white font-bold text-[18px] tracking-[-0.3px] mb-3">
        {step.title}
      </h3>
      <p className="text-[#555] text-[14px] leading-[1.7] mb-5">{step.desc}</p>
      <p className="text-[11px] font-semibold text-[#7c5cfc] tracking-wide">
        → {step.note}
      </p>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "I uploaded three old scripts on a Tuesday night. By Wednesday morning I had a new video script that my editor said read better than anything I'd written myself. My watch time is up 40% this month.",
    name: "Marcus Reid",
    role: "Fitness & Nutrition Creator",
    handle: "@marcusreidfitness",
    metric: "+40% watch time",
  },
  {
    quote: "The Thomas Graham style mode is insane. I've been trying to nail that calm, proof-backed tone for 2 years. ScriptForge got it on the first try. My comments are full of people asking how I changed my delivery.",
    name: "James Okafor",
    role: "Software & Tech Creator",
    handle: "@jamesbuildstech",
    metric: "2× comment rate",
  },
  {
    quote: "I was skeptical about 'voice matching'. I am not skeptical anymore. It captured how I talk, the words I use, even how long my sentences run. Six months in and I've never written a script from scratch since.",
    name: "Priya Sharma",
    role: "Personal Finance Creator",
    handle: "@priyamoneymatters",
    metric: "3.8× subscriber growth",
  },
];

function Testimonials() {
  const { ref, inView } = useInView();

  return (
    <section className="bg-[#09090f] border-t border-white/[0.05] py-28">
      <div className="max-w-[1200px] mx-auto px-8">
        <div
          ref={ref}
          className={`flex items-end justify-between mb-14 gap-8 flex-wrap transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-[48px] md:text-[56px] font-black text-white tracking-[-2.5px] leading-[0.92]">
            What creators<br />
            are saying.
          </h2>
          <p className="text-[#444] text-[14px] max-w-[280px] leading-[1.7]">
            847 creators trust ScriptForge to generate scripts that actually sound like them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.handle} t={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({
  t,
  index,
}: {
  t: (typeof TESTIMONIALS)[number];
  index: number;
}) {
  const { ref, inView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={`rounded-2xl bg-[#0d0d14] border border-white/[0.06] p-7 flex flex-col gap-5 hover:border-white/[0.12] transition-all duration-500 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Quote mark */}
      <svg width="24" height="18" viewBox="0 0 24 18" fill="#7c5cfc" opacity="0.3">
        <path d="M0 18V10.8C0 7.6 .8 5 2.4 3 4 1 6.2 0 9 0l1.5 2.4C8.7 2.8 7.3 3.6 6.3 5c-1 1.3-1.5 2.8-1.5 4.5H9V18H0zm13.5 0V10.8c0-3.2.8-5.8 2.4-7.8C17.5 1 19.7 0 22.5 0L24 2.4c-1.8.4-3.2 1.2-4.2 2.6-1 1.3-1.5 2.8-1.5 4.5h4.2V18H13.5z" />
      </svg>

      <p className="text-[#aaa] text-[14px] leading-[1.8] flex-1">{t.quote}</p>

      <div className="border-t border-white/[0.05] pt-5 flex items-center justify-between">
        <div>
          <div className="text-white font-semibold text-[14px]">{t.name}</div>
          <div className="text-[#444] text-[12px] mt-0.5">{t.role}</div>
        </div>
        <div className="text-right">
          <div className="text-[#7c5cfc] font-bold text-[13px]">{t.metric}</div>
          <div className="text-[#333] text-[11px] mt-0.5">{t.handle}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Starter",
    price: 49,
    desc: "For creators testing a new approach.",
    features: ["25 scripts / month", "YouTube + Reels", "Style DNA", "Persona frameworks", "HTML export"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Creator",
    price: 99,
    desc: "For creators who publish consistently.",
    features: ["Unlimited scripts", "All platforms", "Advanced Style DNA", "All personas", "Hook alternatives", "Channel scraping", "Priority generation"],
    cta: "Start Creating",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Studio",
    price: 249,
    desc: "For agencies managing multiple creators.",
    features: ["Everything in Creator", "10 creator profiles", "Team access", "White-label export", "Custom personas", "API access", "Account manager"],
    cta: "Contact Sales",
    highlight: false,
  },
];

function Pricing() {
  const { ref, inView } = useInView();

  return (
    <section id="pricing" className="bg-[#09090f] border-t border-white/[0.05] py-28">
      <div className="max-w-[1200px] mx-auto px-8">
        <div
          ref={ref}
          className={`mb-14 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <p className="text-[11px] font-bold text-[#7c5cfc] tracking-[0.15em] uppercase mb-4 flex items-center gap-3">
            <span className="w-6 h-px bg-[#7c5cfc]" /> Pricing
          </p>
          <h2 className="text-[48px] md:text-[56px] font-black text-white tracking-[-2.5px] leading-[0.92]">
            One video that lands<br />
            <span className="text-[#444]">pays for years.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>

        <p className="text-center text-[#333] text-[13px] mt-8">
          All plans include a 14-day free trial. Cancel any time.
        </p>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  index,
}: {
  plan: (typeof PLANS)[number];
  index: number;
}) {
  const { ref, inView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={`relative rounded-2xl p-7 transition-all duration-700 hover:scale-[1.01] ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${
        plan.highlight
          ? "bg-[#0f0d1f] border-2 border-[#7c5cfc]/40 shadow-[0_0_60px_rgba(124,92,252,0.12)]"
          : "bg-[#0d0d14] border border-white/[0.06]"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {plan.highlight && (
        <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#7c5cfc] to-transparent" />
      )}

      {"badge" in plan && plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#7c5cfc] text-white text-[11px] font-bold">
          {plan.badge}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-white font-bold text-[16px] mb-1">{plan.name}</h3>
        <p className="text-[#444] text-[13px]">{plan.desc}</p>
      </div>

      <div className="flex items-baseline gap-1 mb-7">
        <span className="text-white font-black text-[48px] tracking-[-2px] leading-none">
          ${plan.price}
        </span>
        <span className="text-[#444] text-[14px]">/mo</span>
      </div>

      <Link
        href="/studio"
        className={`block w-full h-11 rounded-xl text-center font-bold text-[14px] leading-[44px] transition-all duration-200 mb-7 ${
          plan.highlight
            ? "bg-[#7c5cfc] text-white hover:bg-[#6b4eeb] hover:shadow-[0_0_24px_rgba(124,92,252,0.45)]"
            : "bg-white/[0.05] text-white border border-white/[0.08] hover:bg-white/[0.09]"
        }`}
      >
        {plan.cta}
      </Link>

      <ul className="space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-3 text-[13px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke={plan.highlight ? "#7c5cfc" : "#444"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={plan.highlight ? "text-[#bbb]" : "text-[#555]"}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  const { ref, inView } = useInView();

  return (
    <section className="bg-[#09090f] border-t border-white/[0.05] py-28 relative overflow-hidden">
      {/* Grid bg */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #7c5cfc 1px, transparent 0)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,92,252,0.07)_0%,transparent_65%)] pointer-events-none" />

      <div
        ref={ref}
        className={`max-w-[800px] mx-auto px-8 text-center transition-all duration-700 ${
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <p className="text-[11px] font-bold text-[#7c5cfc] tracking-[0.15em] uppercase mb-6 flex items-center justify-center gap-3">
          <span className="w-6 h-px bg-[#7c5cfc]" /> Get started today
          <span className="w-6 h-px bg-[#7c5cfc]" />
        </p>
        <h2
          className="font-black text-white leading-[0.9] tracking-[-3px] mb-8"
          style={{ fontSize: "clamp(52px, 7vw, 86px)" }}
        >
          Stop staring at<br />
          a blank page.
        </h2>
        <p className="text-[#555] text-[17px] leading-[1.7] mb-10 max-w-[480px] mx-auto">
          Your next script is one click away. Sounds like you. Converts like it was engineered for your audience.
        </p>
        <Link
          href="/studio"
          className="inline-flex items-center gap-3 h-14 px-8 rounded-2xl bg-white text-[#09090f] font-black text-[15px] hover:bg-white/90 transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_0_60px_rgba(255,255,255,0.15)] active:scale-[0.98]"
        >
          Generate My First Script
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <p className="text-[#333] text-[13px] mt-5">
          Free to start · No credit card · Your first script in 60 seconds
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-[#09090f] py-8">
      <div className="max-w-[1200px] mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" fill="#7c5cfc" opacity="0.2" />
            <path d="M7 8h10M7 12h10M7 16h6" stroke="#7c5cfc" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="text-[#444] font-semibold text-[13px]">ScriptForge</span>
        </div>
        <div className="flex items-center gap-8">
          {[["Features", "#features"], ["Process", "#process"], ["Pricing", "#pricing"]].map(([l, h]) => (
            <a key={l} href={h} className="text-[#333] hover:text-white text-[13px] transition-colors">
              {l}
            </a>
          ))}
          <Link href="/studio" className="text-[#7c5cfc] hover:text-[#a78bfa] text-[13px] font-semibold transition-colors">
            App →
          </Link>
        </div>
        <p className="text-[#2a2a3a] text-[12px]">
          © {new Date().getFullYear()} ScriptForge
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[9997] opacity-[0.028]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <Cursor />

      <main className="bg-[#09090f] overflow-x-hidden">
        <Navbar />
        <Hero />
        <FeatureSections />
        <Process />
        <Testimonials />
        <Pricing />
        <CTA />
        <Footer />
      </main>
    </>
  );
}
