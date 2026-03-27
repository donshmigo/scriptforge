"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const FONT = "var(--font-syne), system-ui, sans-serif";

function useVisible(ref: React.RefObject<HTMLElement | null>, rootMargin = "0px") {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { rootMargin, threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, rootMargin]);
  return visible;
}

const SCRIPT_LINES = [
  { label: "HOOK", text: "Most creators waste 2+ hours on a script that never gets filmed — here's how I cut that to 4 minutes." },
  { label: "REHOOK", text: "By the end of this video you'll have a complete framework ready to record today." },
  { label: "MAIN POINT", text: "Lead with your biggest proof point — not your intro. Hook viewers with results, not your name." },
];

function ScriptMockup() {
  const [phase, setPhase] = useState(0);
  const [chars, setChars] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => { setPhase(0); setChars(0); setDone(false); }, 2800);
      return () => clearTimeout(t);
    }
    const line = SCRIPT_LINES[phase];
    if (chars < line.text.length) {
      const t = setTimeout(() => setChars(c => c + 1), 20);
      return () => clearTimeout(t);
    } else if (phase < SCRIPT_LINES.length - 1) {
      const t = setTimeout(() => { setPhase(p => p + 1); setChars(0); }, 380);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setDone(true), 750);
      return () => clearTimeout(t);
    }
  }, [phase, chars, done]);

  const progress = done
    ? 100
    : Math.round(((phase + chars / SCRIPT_LINES[phase].text.length) / SCRIPT_LINES.length) * 100);

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-lg)"
    }}>
      {/* macOS titlebar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
        <div className="flex gap-1.5">
          {["#FF5F57", "#FEBC2E", "#28C840"].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[11px] font-medium mx-auto" style={{ color: "var(--muted)", fontFamily: FONT }}>
          {done ? "✓ Script ready to film" : "⟳ Generating your script..."}
        </span>
        <div style={{ width: 42 }} />
      </div>
      {/* Topic chip */}
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>YouTube</span>
        <span className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>10 Ways to Grow Your Channel in 2025</span>
      </div>
      {/* Lines */}
      <div className="px-4 py-4 space-y-4" style={{ minHeight: 220 }}>
        {SCRIPT_LINES.slice(0, phase + 1).map((line, i) => (
          <div key={i} className="animate-fade-in">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] mb-1.5" style={{ color: "var(--accent)" }}>{line.label}</div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--foreground)" }}>
              {i < phase ? line.text : line.text.slice(0, chars)}
              {i === phase && !done && (
                <span className="inline-block w-[2px] h-3.5 ml-0.5 align-middle rounded-sm" style={{ background: "var(--accent)", animation: "fadeIn 0.6s ease infinite alternate" }} />
              )}
            </p>
          </div>
        ))}
      </div>
      {/* Progress footer */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
            <div className="h-full rounded-full transition-all duration-150" style={{
              width: `${Math.min(done ? 100 : progress, 100)}%`,
              background: "linear-gradient(90deg, var(--accent), #FF7B35)"
            }} />
          </div>
          <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: done ? "var(--green)" : "var(--muted)" }}>
            {done ? "Done ✓" : "Writing..."}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const problemRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const proofRef = useRef<HTMLElement>(null);
  const diffRef = useRef<HTMLElement>(null);
  const toolsRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const heroVisible = useVisible(heroRef, "80px");
  const problemVisible = useVisible(problemRef, "80px");
  const howVisible = useVisible(howRef, "80px");
  const featuresVisible = useVisible(featuresRef, "80px");
  const proofVisible = useVisible(proofRef, "80px");
  const diffVisible = useVisible(diffRef, "80px");
  const toolsVisible = useVisible(toolsRef, "80px");
  const faqVisible = useVisible(faqRef, "80px");
  const ctaVisible = useVisible(ctaRef, "80px");

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How is this different from ChatGPT?",
      a: "ScriptForge uses fixed structures (hooks, rehooks, CTAs) and writing-style guides so every script follows the same formulas that keep viewers watching. You add your proof points and audience once; the AI sticks to them and doesn't invent stats or a generic tone.",
    },
    {
      q: "Do I need to pay?",
      a: "You use your own OpenAI or Anthropic API key. ScriptForge doesn't store it or charge a subscription. The app and free tools run in your browser and hit the APIs you configure.",
    },
    {
      q: "What are \u201cwriting styles\u201d?",
      a: "Pre-built frameworks (e.g. Thomas Graham for education, Best Of for product roundups, Product Review) that define tone, structure, and rules. You can also use a custom style and feed in your own intro and script guides.",
    },
    {
      q: "Can I use this for Reels and TikTok?",
      a: "Yes. Switch to Reels mode, pick a format (educational, myth, list, step-by-step, selling), and set your length (20–30 sec up to 60–90 sec). Scripts follow short-form rules: hook → value → CTA, no wasted words.",
    },
    {
      q: "Where do the hooks come from?",
      a: "Hook Lab and the Content Planner use a library of 900+ hook templates. You choose a category; the tool picks the best-fitting hooks for your topic and customises them. No made-up hooks.",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--background)" }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b" style={{
        background: "rgba(250,249,246,0.92)",
        borderColor: "var(--border)",
        backdropFilter: "blur(12px)",
        boxShadow: "var(--shadow-sm)"
      }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #FF7B35 100%)", color: "#fff", fontFamily: FONT }}>✦</div>
          <span className="text-base font-bold tracking-tight" style={{ color: "var(--foreground)", fontFamily: FONT }}>ScriptForge</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/tools/hook-lab" className="text-sm font-medium hidden sm:inline transition-opacity hover:opacity-60" style={{ color: "var(--muted)" }}>Hook Lab</Link>
          <Link href="/tools/content-factory" className="text-sm font-medium hidden sm:inline transition-opacity hover:opacity-60" style={{ color: "var(--muted)" }}>Content Planner</Link>
          <Link href="/writer" className="btn-press text-sm font-bold px-4 py-2 rounded-xl" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #FF7B35 100%)", color: "#fff", boxShadow: "var(--shadow-accent)" }}>Open App</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <header ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-24">
        {/* Dot grid */}
        <div className="absolute inset-0 z-0" style={{
          backgroundImage: "radial-gradient(circle, rgba(26,26,46,0.055) 1px, transparent 1px)",
          backgroundSize: "26px 26px"
        }} />
        {/* Coral glow */}
        <div className="absolute inset-0 z-0" style={{
          background: "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(255,78,80,0.07) 0%, transparent 65%)"
        }} />

        <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 transition-all duration-500 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`} style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(255,78,80,0.2)" }}>
              <span>✦</span>
              <span>AI YouTube Script Generator</span>
            </div>
            <h1 className={`text-[2.8rem] sm:text-5xl lg:text-[3rem] xl:text-[3.5rem] font-extrabold tracking-tight mb-6 transition-all duration-600 delay-75 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT, lineHeight: 1.06 }}>
              Stop staring at a blank page.
              <br />
              <span style={{ color: "var(--accent)" }}>Get a script in 60 seconds.</span>
            </h1>
            <p className={`text-lg max-w-md mb-8 leading-relaxed transition-all duration-600 delay-150 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
              YouTube and Reels scripts that follow proven structures and your voice. Add your proof points once, generate ready-to-film scripts on demand.
            </p>
            <div className={`flex flex-col sm:flex-row gap-3 mb-6 transition-all duration-600 delay-200 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
              <Link href="/writer" className="btn-press inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #FF7B35 100%)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: FONT }}>
                Start writing — it&apos;s free
                <span>→</span>
              </Link>
              <Link href="#how" className="btn-press inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold border" style={{ color: "var(--foreground)", borderColor: "var(--border)", background: "var(--surface)" }}>
                See how it works
              </Link>
            </div>
            <p className={`text-xs transition-all duration-500 delay-300 ${heroVisible ? "opacity-50" : "opacity-0"}`} style={{ color: "var(--muted)" }}>
              Your API key stays in your browser. We don&apos;t store it.
            </p>
          </div>

          {/* Right: animated mockup */}
          <div className={`transition-all duration-700 delay-300 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <ScriptMockup />
            <div className="flex items-center gap-2 mt-3 justify-end">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", color: "var(--foreground)" }}>
                <span style={{ color: "var(--green)" }}>●</span>
                Generated in ~47 seconds
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Stats bar ───────────────────────────────────────────────── */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-3 gap-6 text-center">
          {[
            { num: "< 1 min", label: "avg. script generation" },
            { num: "900+", label: "hook templates built-in" },
            { num: "4", label: "writing styles & formats" },
          ].map((stat) => (
            <div key={stat.num}>
              <div className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ color: "var(--accent)", fontFamily: FONT }}>{stat.num}</div>
              <div className="text-xs sm:text-sm" style={{ color: "var(--muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem ─────────────────────────────────────────────────── */}
      <section ref={problemRef} className="relative py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <p className={`text-center text-xs font-bold uppercase tracking-[0.22em] mb-3 transition-all duration-500 ${problemVisible ? "opacity-100" : "opacity-0"}`} style={{ color: "var(--accent)" }}>The problem</p>
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-4 transition-all duration-600 delay-75 ${problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT }}>
            Generic AI gives you generic scripts
          </h2>
          <p className={`text-center max-w-xl mx-auto mb-14 transition-all duration-600 delay-100 ${problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
            Most AI tools dump a wall of text. ScriptForge gives you a proven structure with your voice — not invented stats and filler advice.
          </p>
          <div className={`grid md:grid-cols-2 gap-6 transition-all duration-600 delay-150 ${problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            {/* Before */}
            <div className="rounded-2xl p-6 border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-lg">😐</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Other AI — generic output</span>
              </div>
              <div className="text-xs leading-relaxed p-4 rounded-xl italic" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                &ldquo;In this comprehensive guide, we will explore many important tips and strategies that content creators can use to grow their YouTube channel. Consistency is key, and you should post regularly. Also, engage with your audience in the comments section...&rdquo;
              </div>
              <div className="mt-4 space-y-1.5">
                {["No proven structure", "Invented advice & filler", "Sounds like every other creator", "Restarts from scratch every time"].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <span>✗</span> {item}
                  </div>
                ))}
              </div>
            </div>
            {/* After */}
            <div className="rounded-2xl p-6 border" style={{ background: "var(--surface)", borderColor: "rgba(255,78,80,0.2)", boxShadow: "var(--shadow)" }}>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-lg">✨</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>ScriptForge — structured output</span>
              </div>
              <div className="text-xs leading-relaxed p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="text-[9px] font-black uppercase tracking-[0.22em] mb-1.5" style={{ color: "var(--accent)" }}>HOOK</div>
                <p className="mb-3" style={{ color: "var(--foreground)" }}>Most creators never talk about this — but I grew from 0 to 10k subs in 4 months using one simple framework.</p>
                <div className="text-[9px] font-black uppercase tracking-[0.22em] mb-1.5" style={{ color: "var(--accent)" }}>PROOF POINT</div>
                <p style={{ color: "var(--foreground)" }}>I tested this across 3 niches — fitness, finance, and cooking — and it worked in all three.</p>
              </div>
              <div className="mt-4 space-y-1.5">
                {["Hook → rehook → CTA structure", "Only your proof points, no inventions", "Matches your tone & writing style", "Revise without starting over"].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--foreground)" }}>
                    <span style={{ color: "var(--accent)" }}>✓</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how" ref={howRef} className="relative py-24 md:py-32 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-5xl mx-auto">
          <p className={`text-center text-xs font-bold uppercase tracking-[0.22em] mb-3 transition-all duration-500 ${howVisible ? "opacity-100" : "opacity-0"}`} style={{ color: "var(--accent)" }}>How it works</p>
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-16 transition-all duration-600 delay-75 ${howVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT }}>
            Four steps to a script you can film today
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: "01", title: "Pick a writing style", body: "Education, Best Of, Product Review, or your own custom style. Each has its own proven tone and rules." },
              { n: "02", title: "Set your identity once", body: "Credibility stack, unique method, who you're for. The AI only uses what you add — never invents stats." },
              { n: "03", title: "Enter your topic", body: "Video title and angle. Optionally paste a hook or reference notes. Choose your target length." },
              { n: "04", title: "Generate & refine", body: "Get a full script. Use feedback to revise in-place. Swap hooks from alternatives if you want a different opener." },
            ].map((item, i) => (
              <div key={item.n} className={`card-lift rounded-2xl p-6 border transition-all duration-600 ${howVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ borderColor: "var(--border)", background: "var(--surface-2)", transitionDelay: `${120 * i}ms` }}>
                <div className="text-3xl font-extrabold mb-4" style={{ color: "var(--accent)", fontFamily: FONT, opacity: 0.25 }}>{item.n}</div>
                <h3 className="text-base font-bold mb-2" style={{ color: "var(--foreground)" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="relative py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-4 transition-all duration-600 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT }}>
            Built for the format — not a wall of text
          </h2>
          <p className={`text-center max-w-xl mx-auto mb-14 transition-all duration-600 delay-75 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
            Templates and word counts matched to how people actually watch.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: "Long-form", title: "YouTube", desc: "Intro beats (proof → promise → bridge), rehooks at section breaks, ascending value order. 6–8 min up to 15–20 min. Bold subheadings and one CTA.", icon: "▶", bg: "rgba(255,78,80,0.07)", color: "var(--accent)" },
              { label: "Short-form", title: "Reels & TikTok", desc: "Hook → value → CTA. No wasted words, 6th-grade reading level. Pick format: educational, myth, list, step-by-step. 20 sec to 90 sec.", icon: "⚡", bg: "rgba(124,92,252,0.07)", color: "var(--accent-2)" },
              { label: "No fabrications", title: "Your voice only", desc: "Fixed inputs for proof points, method, and audience. Optionally upload scripts to extract your style. We never invent numbers or stories.", icon: "🎯", bg: "rgba(0,201,167,0.07)", color: "var(--green)" },
            ].map((item, i) => (
              <div key={item.title} className={`card-lift rounded-2xl border overflow-hidden transition-all duration-600 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ background: "var(--surface)", borderColor: "var(--border)", transitionDelay: `${100 * (i + 1)}ms` }}>
                <div className="px-6 pt-7 pb-6" style={{ background: item.bg }}>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <div className="px-6 py-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: item.color }}>{item.label}</span>
                  <h3 className="text-xl font-bold mt-1 mb-3" style={{ color: "var(--foreground)" }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ────────────────────────────────────────────── */}
      <section ref={proofRef} className="relative py-24 md:py-32 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className={`text-6xl font-black mb-2 transition-all duration-500 ${proofVisible ? "opacity-100" : "opacity-0"}`} style={{ color: "var(--accent)", fontFamily: FONT, lineHeight: 0.9 }}>&ldquo;</div>
          <blockquote className={`transition-all duration-600 delay-75 ${proofVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <p className="text-xl sm:text-2xl font-medium leading-relaxed mb-6" style={{ color: "var(--foreground)" }}>
              I was spending 45 minutes on a script before. Now I get a solid first draft in under a minute and just tweak the bits that need my voice.
            </p>
            <footer className="text-sm" style={{ color: "var(--muted)" }}>
              — Creator using ScriptForge for YouTube and Reels
            </footer>
          </blockquote>
          {/* Metric badges */}
          <div className={`flex flex-wrap items-center justify-center gap-3 mt-10 transition-all duration-600 delay-150 ${proofVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            {[
              { label: "45 min → 4 min", sub: "script time" },
              { label: "900+ hooks", sub: "in the library" },
              { label: "0 invented stats", sub: "guaranteed" },
            ].map((b) => (
              <div key={b.label} className="px-4 py-2.5 rounded-2xl text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="text-sm font-bold" style={{ color: "var(--foreground)", fontFamily: FONT }}>{b.label}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{b.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why different ───────────────────────────────────────────── */}
      <section ref={diffRef} className="relative py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-4 transition-all duration-600 ${diffVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT }}>
            Not another &ldquo;paste and pray&rdquo; AI writer
          </h2>
          <p className={`text-center max-w-xl mx-auto mb-14 transition-all duration-600 delay-75 ${diffVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
            See what actually makes ScriptForge different from a generic AI prompt.
          </p>
          <div className={`grid md:grid-cols-2 gap-6 transition-all duration-600 delay-100 ${diffVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <div className="rounded-2xl p-6 border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
              <div className="text-sm font-bold pb-3 mb-4 border-b" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>Other AI Writers</div>
              {[
                "Generates a generic wall of text",
                "Invents stats and credibility",
                "No hook → rehook → CTA structure",
                "Forgets your profile each time",
                "Restart from scratch to revise",
              ].map(item => (
                <div key={item} className="flex items-start gap-2 py-2 text-sm" style={{ color: "var(--muted)" }}>
                  <span className="mt-0.5 flex-shrink-0">✗</span> {item}
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-6 border" style={{ background: "var(--surface)", borderColor: "rgba(255,78,80,0.2)", boxShadow: "var(--shadow)" }}>
              <div className="text-sm font-bold pb-3 mb-4 border-b" style={{ color: "var(--accent)", borderColor: "rgba(255,78,80,0.12)" }}>ScriptForge</div>
              {[
                "Proven template: hook, rehooks, CTA",
                "Only your facts and proof points",
                "Structure matched to video length",
                "Saves your identity — use it every time",
                "Revise the existing script, not from zero",
              ].map(item => (
                <div key={item} className="flex items-start gap-2 py-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }}>✓</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Free tools ──────────────────────────────────────────────── */}
      <section ref={toolsRef} className="relative py-24 md:py-32 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-5xl mx-auto">
          <p className={`text-center text-xs font-bold uppercase tracking-[0.22em] mb-3 transition-all duration-500 ${toolsVisible ? "opacity-100" : "opacity-0"}`} style={{ color: "var(--accent)" }}>Free to use</p>
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-4 transition-all duration-600 delay-75 ${toolsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT }}>
            Hooks and a content plan before you open the app
          </h2>
          <p className={`text-center max-w-xl mx-auto mb-14 transition-all duration-600 delay-100 ${toolsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
            No signup. Test the quality before you commit.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/tools/hook-lab" className={`group card-lift block rounded-2xl border overflow-hidden transition-all duration-600 ${toolsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ background: "var(--surface-2)", borderColor: "var(--border)", transitionDelay: "150ms" }}>
              <div className="px-7 pt-7 pb-5 border-b" style={{ borderColor: "var(--border)", background: "rgba(255,78,80,0.04)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: "var(--accent-glow)", border: "1px solid rgba(255,78,80,0.15)" }}>⚡</div>
                <div className="space-y-2">
                  {[
                    "Most creators never talk about this...",
                    "The #1 mistake I see beginners make...",
                    "I tested this for 30 days straight and...",
                  ].map(h => (
                    <div key={h} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>{h}</div>
                  ))}
                </div>
              </div>
              <div className="p-7">
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Hook Lab</h3>
                <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
                  10 scroll-stopping hooks for your next Reel. Enter your topic, pick a type — hooks pulled from a 900+ library and customised.
                </p>
                <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>Use Hook Lab →</span>
              </div>
            </Link>
            <Link href="/tools/content-factory" className={`group card-lift block rounded-2xl border overflow-hidden transition-all duration-600 ${toolsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ background: "var(--surface-2)", borderColor: "var(--border)", transitionDelay: "200ms" }}>
              <div className="px-7 pt-7 pb-5 border-b" style={{ borderColor: "var(--border)", background: "rgba(124,92,252,0.04)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: "rgba(124,92,252,0.1)", border: "1px solid rgba(124,92,252,0.15)" }}>📅</div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 21 }).map((_, i) => (
                    <div key={i} className="h-6 rounded-md flex items-center justify-center font-bold" style={{
                      background: i < 3 ? "rgba(255,78,80,0.12)" : "var(--surface)",
                      border: "1px solid var(--border)",
                      fontSize: 8,
                      color: i < 3 ? "var(--accent)" : "var(--muted)"
                    }}>
                      {i < 3 ? "✦" : i + 1}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-7">
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Content Planner</h3>
                <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
                  30-day Reels calendar plus full scripts for Day 1–3. Same short-form rules as the main app. Enter your niche and go.
                </p>
                <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>Use Content Planner →</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section ref={faqRef} className="relative py-24 md:py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className={`text-center text-3xl font-bold mb-12 transition-all duration-600 ${faqVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT }}>
            Common questions
          </h2>
          <div className="space-y-2">
            {faqs.map((item, i) => (
              <div key={i} className={`rounded-xl border overflow-hidden transition-all duration-600 ${faqVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ borderColor: "var(--border)", background: "var(--surface)", transitionDelay: `${50 * i}ms` }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="btn-press w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  style={{ color: "var(--foreground)" }}
                >
                  <span className="font-semibold text-sm">{item.q}</span>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all" style={{ background: openFaq === i ? "var(--accent)" : "var(--surface-2)", color: openFaq === i ? "#fff" : "var(--muted)" }}>
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 pt-0 animate-fade-in">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section ref={ctaRef} className="relative py-16 md:py-20 px-6">
        <div className={`relative max-w-3xl mx-auto text-center rounded-3xl p-10 md:p-16 overflow-hidden transition-all duration-600 ${ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ background: "linear-gradient(135deg, rgba(255,78,80,0.1) 0%, rgba(255,123,53,0.07) 100%)", border: "1px solid rgba(255,78,80,0.18)" }}>
          {/* Dot grid overlay */}
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,78,80,0.09) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }} />
          <div className="relative z-10">
            <div className="text-3xl mb-4" style={{ fontFamily: FONT, color: "var(--accent)" }}>✦</div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--foreground)", fontFamily: FONT }}>Get your first script in under a minute</h2>
            <p className="text-base mb-8 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
              Open the app, pick a style, add your topic. No credit card, no account — just your API key in your browser.
            </p>
            <Link href="/writer" className="btn-press inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #FF7B35 100%)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: FONT }}>
              Open ScriptForge
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #FF7B35 100%)", color: "#fff", fontFamily: FONT }}>✦</div>
            <span className="font-bold" style={{ color: "var(--foreground)", fontFamily: FONT }}>ScriptForge</span>
          </Link>
          <p className="text-xs text-center" style={{ color: "var(--muted)" }}>Scripts that sound like you. Built for creators.</p>
          <div className="flex items-center gap-6">
            <Link href="/writer" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>App</Link>
            <Link href="/tools/hook-lab" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>Hook Lab</Link>
            <Link href="/tools/content-factory" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>Content Planner</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
