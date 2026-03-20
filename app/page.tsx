"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Scene from "@/components/landing/Scene";

const FONT_DISPLAY = "var(--font-syne), system-ui, sans-serif";

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
      a: "ScriptForge uses fixed structures (hooks, rehooks, CTAs) and writing-style guides so every script follows the same formulas that keep viewers watching. You add your proof points and audience once; the AI sticks to them and doesn’t invent stats or a generic tone.",
    },
    {
      q: "Do I need to pay?",
      a: "You use your own OpenAI or Anthropic API key. ScriptForge doesn’t store it or charge a subscription. The app and free tools (Hook Lab, Content Planner) run in your browser and hit the APIs you configure.",
    },
    {
      q: "What are “writing styles”?",
      a: "Pre-built frameworks (e.g. Thomas Graham for education, Best Of for product roundups, Product Review) that define tone, structure, and rules. You can also use a custom style and feed in your own intro and script guides.",
    },
    {
      q: "Can I use this for Reels and TikTok?",
      a: "Yes. Switch to Reels mode, pick a format (educational, myth, list, step-by-step, selling), and set your length (20–30 sec up to 60–90 sec). Scripts follow short-form rules: hook → value → CTA, no wasted words, 6th-grade reading level.",
    },
    {
      q: "Where do the hooks come from?",
      a: "Hook Lab and the Content Planner use a library of 900+ hook templates (from a 1000 Viral Hooks–style doc). You choose a category; the tool picks the best-fitting hooks for your topic and customises them. No made-up hooks.",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b border-transparent bg-[#0f0f13]/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: "var(--accent)", color: "#fff" }}>▶</div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>ScriptForge</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/tools/hook-lab" className="text-sm font-medium hidden sm:inline" style={{ color: "var(--muted)" }}>Hook Lab</Link>
          <Link href="/tools/content-factory" className="text-sm font-medium hidden sm:inline" style={{ color: "var(--muted)" }}>Content Planner</Link>
          <Link href="/writer" className="text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>Open App</Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <header ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-40">
        <div className="absolute inset-0 z-0">
          <Scene />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 45%, rgba(124, 92, 252, 0.07) 0%, transparent 55%)" }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className={`text-xs font-semibold uppercase tracking-[0.25em] mb-5 transition-all duration-600 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`} style={{ color: "var(--accent)" }}>
            For creators who want scripts that sound like them
          </p>
          <h1 className={`text-5xl sm:text-6xl md:text-[3.5rem] lg:text-[4rem] font-extrabold tracking-tight mb-6 transition-all duration-600 delay-75 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", lineHeight: 1.08, fontFamily: FONT_DISPLAY }}>
            Stop staring at a blank page.
            <br />
            <span style={{ color: "var(--accent)" }}>Get a full script in under a minute.</span>
          </h1>
          <p className={`text-lg sm:text-xl max-w-xl mx-auto mb-10 transition-all duration-600 delay-150 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
            YouTube and Reels scripts that follow proven structures and your voice. Pick a style, add your proof points once, and generate ready-to-film scripts on demand.
          </p>
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-600 delay-200 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <Link href="/writer" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 0 40px var(--accent-glow)" }}>
              Start writing — it’s free
              <span className="text-lg">→</span>
            </Link>
            <Link href="#how" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold transition-colors border" style={{ background: "transparent", color: "var(--foreground)", borderColor: "var(--border)" }}>
              See how it works
            </Link>
          </div>
          <p className={`mt-8 text-xs transition-all duration-600 delay-300 ${heroVisible ? "opacity-70" : "opacity-0"}`} style={{ color: "var(--muted)" }}>
            Your API key stays in your browser. We don’t store it.
          </p>
        </div>
        <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-700 delay-400 ${heroVisible ? "opacity-50" : "opacity-0"}`} style={{ color: "var(--muted)" }}>
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <div className="w-px h-6 rounded-full animate-bounce" style={{ background: "var(--border)" }} />
        </div>
      </header>

      {/* ── Problem ────────────────────────────────────────────────────── */}
      <section ref={problemRef} className="relative py-24 md:py-32 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-2xl sm:text-3xl font-bold mb-6 transition-all duration-600 ${problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>
            Your ideas are good. Your first draft doesn’t have to take an hour.
          </h2>
          <p className={`text-base sm:text-lg transition-all duration-600 delay-100 ${problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
            Most AI script tools give you a generic blob of text. ScriptForge gives you a structure: hook that stops the scroll, rehooks that keep people watching, and a CTA that actually converts. You bring the credibility and the topic; we handle the format.
          </p>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" ref={howRef} className="relative py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <p className={`text-center text-xs font-semibold uppercase tracking-[0.2em] mb-3 transition-all duration-600 ${howVisible ? "opacity-100" : "opacity-0"}`} style={{ color: "var(--accent)" }}>How it works</p>
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-16 transition-all duration-600 delay-75 ${howVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>
            Four steps to a script you can film today
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Pick a writing style", body: "Education (Thomas Graham), Best Of, Product Review, or your own. Each style has its own tone and rules." },
              { step: "2", title: "Set your identity once", body: "Credibility stack, unique method, who you’re for. The AI only uses what you add — no invented stats." },
              { step: "3", title: "Enter your topic", body: "Video title and angle. Optional: paste a hook or reference notes. Choose length (e.g. 10–12 min or 60–90 sec Reel)." },
              { step: "4", title: "Generate & refine", body: "Get a full script. Use feedback to revise in place. Swap the hook from alternatives if you want a different opener." },
            ].map((item, i) => (
              <div key={item.step} className={`relative transition-all duration-600 ${howVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ transitionDelay: `${120 * i}ms` }}>
                <div className="text-4xl font-extrabold mb-4 opacity-20" style={{ color: "var(--accent)", fontFamily: FONT_DISPLAY }}>{item.step}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (pillars) ─────────────────────────────────────────── */}
      <section ref={featuresRef} className="relative py-24 md:py-32 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-4 transition-all duration-600 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>
            Built so the script actually fits the format
          </h2>
          <p className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-600 delay-75 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
            Not a wall of text. Templates and word counts that match how people watch.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "YouTube", desc: "Intro beats (proof → promise → bridge), rehooks at section breaks, ascending value order. 6–8 min up to 15–20 min. Bold subheadings and one CTA.", label: "Long-form" },
              { title: "Reels & TikTok", desc: "Hook → value → CTA. No wasted words, 6th-grade reading level. Pick format: educational, myth, list, step-by-step, selling. 20 sec to 90 sec.", label: "Short-form" },
              { title: "Your voice only", desc: "Fixed inputs for proof points, method, and audience. Optional: upload scripts to extract your style. We never invent numbers or stories.", label: "No fabrications" },
            ].map((item, i) => (
              <div key={item.title} className={`rounded-2xl p-7 border transition-all duration-600 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ background: "var(--surface-2)", borderColor: "var(--border)", transitionDelay: `${100 * (i + 1)}ms` }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>{item.label}</span>
                <h3 className="text-xl font-bold mt-2 mb-3" style={{ color: "var(--foreground)" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof / quote ────────────────────────────────────────── */}
      <section ref={proofRef} className="relative py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <blockquote className={`text-center transition-all duration-600 ${proofVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <p className="text-xl sm:text-2xl font-medium leading-relaxed mb-6" style={{ color: "var(--foreground)" }}>
              “I was spending 45 minutes on a script before. Now I get a solid first draft in under a minute and just tweak the bits that need my voice.”
            </p>
            <footer className="text-sm" style={{ color: "var(--muted)" }}>
              — Creator using ScriptForge for YouTube and Reels
            </footer>
          </blockquote>
          <div className={`flex flex-wrap items-center justify-center gap-8 mt-12 transition-all duration-600 delay-150 ${proofVisible ? "opacity-100" : "opacity-0"}`} style={{ color: "var(--muted)" }}>
            <span className="text-xs uppercase tracking-wider">Used for</span>
            <span>YouTube scripts</span>
            <span>•</span>
            <span>Instagram Reels</span>
            <span>•</span>
            <span>Product reviews</span>
            <span>•</span>
            <span>Educational content</span>
          </div>
        </div>
      </section>

      {/* ── Why different ───────────────────────────────────────────────── */}
      <section ref={diffRef} className="relative py-24 md:py-32 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-12 transition-all duration-600 ${diffVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>
            Not another “paste and pray” AI writer
          </h2>
          <div className="space-y-6">
            {[
              { title: "Structures, not just prompts", body: "Every script follows a chosen template (e.g. hook → reinforce → main point → contrast → CTA). You get a consistent shape, not a random essay." },
              { title: "Your proof points only", body: "You add credibility and audience once in Fixed Inputs. The AI is instructed to never invent stats, client results, or years of experience." },
              { title: "Revisions without starting over", body: "Got a script but want to change one part? Use the feedback box to ask for edits. We revise the existing script instead of regenerating from scratch." },
            ].map((item, i) => (
              <div key={item.title} className={`flex gap-4 rounded-xl p-5 border transition-all duration-600 ${diffVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ borderColor: "var(--border)", background: "var(--surface-2)", transitionDelay: `${80 * i}ms` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>✓</div>
                <div>
                  <h3 className="font-bold mb-1" style={{ color: "var(--foreground)" }}>{item.title}</h3>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Free tools ─────────────────────────────────────────────────── */}
      <section ref={toolsRef} className="relative py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <p className={`text-center text-xs font-semibold uppercase tracking-[0.2em] mb-3 transition-all duration-600 ${toolsVisible ? "opacity-100" : "opacity-0"}`} style={{ color: "var(--accent)" }}>Free to use</p>
          <h2 className={`text-center text-3xl md:text-4xl font-bold mb-4 transition-all duration-600 delay-75 ${toolsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>
            Hooks and a content plan before you open the app
          </h2>
          <p className={`text-center max-w-xl mx-auto mb-14 transition-all duration-600 delay-100 ${toolsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--muted)" }}>
            No signup. Use them to test the quality of our output, then move into the full writer when you’re ready.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/tools/hook-lab" className={`group block rounded-2xl p-8 border transition-all duration-600 hover:border-[var(--accent)] ${toolsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ background: "var(--surface)", borderColor: "var(--border)", transitionDelay: "150ms" }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>⚡</span>
                <h3 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Hook Lab</h3>
              </div>
              <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
                10 scroll-stopping hooks for your next Reel. Pick a video type (educational, myth, comparison, etc.), enter your topic. Hooks are pulled from a 900+ library and customised — no made-up lines.
              </p>
              <span className="text-sm font-semibold group-hover:underline" style={{ color: "var(--accent)" }}>Use Hook Lab →</span>
            </Link>
            <Link href="/tools/content-factory" className={`group block rounded-2xl p-8 border transition-all duration-600 hover:border-[var(--accent)] ${toolsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ background: "var(--surface)", borderColor: "var(--border)", transitionDelay: "200ms" }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>📅</span>
                <h3 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Content Planner</h3>
              </div>
              <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
                30-day Reels calendar plus full scripts for Day 1–3. Same short-form rules as the main app (word counts, 6th-grade reading level, hooks from the library). Enter your niche and go.
              </p>
              <span className="text-sm font-semibold group-hover:underline" style={{ color: "var(--accent)" }}>Use Content Planner →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section ref={faqRef} className="relative py-24 md:py-32 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className={`text-center text-3xl font-bold mb-12 transition-all duration-600 ${faqVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>
            Common questions
          </h2>
          <div className="space-y-2">
            {faqs.map((item, i) => (
              <div
                key={i}
                className={`rounded-xl border overflow-hidden transition-all duration-600 ${faqVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
                style={{ borderColor: "var(--border)", background: "var(--surface-2)", transitionDelay: `${50 * i}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  style={{ color: "var(--foreground)" }}
                >
                  <span className="font-semibold text-sm">{item.q}</span>
                  <span className="text-lg flex-shrink-0" style={{ color: "var(--muted)" }}>{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 pt-0">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section ref={ctaRef} className="relative py-24 md:py-32 px-6">
        <div className={`max-w-2xl mx-auto text-center rounded-3xl p-10 md:p-14 transition-all duration-600 ${ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`} style={{ background: "linear-gradient(145deg, rgba(124, 92, 252, 0.14) 0%, rgba(124, 92, 252, 0.04) 100%)", border: "1px solid rgba(124, 92, 252, 0.25)" }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>Get your first script in under a minute</h2>
          <p className="text-base mb-8" style={{ color: "var(--muted)" }}>Open the app, pick a style, add your topic. No credit card, no account — just your API key in your browser.</p>
          <Link href="/writer" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 0 40px var(--accent-glow)" }}>
            Open ScriptForge
            <span className="text-lg">→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>▶</div>
            <span className="font-semibold" style={{ color: "var(--foreground)", fontFamily: FONT_DISPLAY }}>ScriptForge</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/writer" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>App</Link>
            <Link href="/tools/hook-lab" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>Hook Lab</Link>
            <Link href="/tools/content-factory" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>Content Planner</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
