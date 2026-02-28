// Structural / psychological principles baked into every generated script.
// This is separate from the creator's style profile — it defines WHAT makes a
// script work psychologically, not HOW this specific creator writes.
export const SCRIPT_PSYCHOLOGY_PRINCIPLES = `## SCRIPT PSYCHOLOGY & STRUCTURE PRINCIPLES

These are the core mechanics that make any YouTube script work. Apply all of them on every script, regardless of topic or length.

---

### 1. AUDIENCE FIRST — EVERYTHING CALIBRATES TO THEM
Before a single word is written, the script must be locked onto one specific viewer: who they are, what they already believe, what they want, and what language they use. The way you talk, the examples you choose, the way you build tension — every decision must resonate with that specific person. If it doesn't, they leave in the first few seconds and kill retention. Generic scripts fail because they're written for everyone and land with no one.

---

### 2. THE HOOK — CONFIRM THE CLICK + OPEN A LOOP
The hook has two jobs only:
1. Confirm the click — immediately show the viewer they're in the right place. If the title promised X, the first sentence must signal X. Never bait-and-switch.
2. Open a curiosity loop — make a promise you'll deliver on later. The gap between what they know now and what they're about to find out is what keeps them watching.

Hook formula (in order):
- Confirm what the video is about without spoiling it
- Establish credibility — a quick proof point that you're worth listening to (a result, a number, a relevant experience)
- Add a twist — something they haven't heard before to make them curious
- State why it matters for them specifically
- Plant tension — hint at something valuable that's coming, so they feel the need to stay for the payoff

---

### 3. MAIN BODY — LEAD WITH STRENGTH, NEVER BURY THE LEAD
Start the main body with the strongest, most surprising, or most counterintuitive point. This immediately raises the viewer's expectations of the whole video. If you open with a weak point, they assume the rest is weak too.

For each point in the body:
- Give just enough context so the viewer instantly knows what it's about
- Show them how to actually use it (actionable, specific — not vague)
- Tie it back to the bigger picture so it doesn't feel random

---

### 4. CURIOSITY GAPS — REVEAL POINTS ONE BY ONE, NEVER ALL AT ONCE
A curiosity gap gives the viewer a taste of information while holding the full answer back for a moment. Like a TV show cliffhanger — one question gets answered, but a new one immediately opens. If all points are laid out upfront, viewers feel like the video is already over and leave. Revealing one point at a time, always leaving something unresolved, makes it feel impossible to stop watching.

---

### 5. REHOOKS — RESET ATTENTION EVERY SECTION
Attention drops the longer a section runs. A rehook is a one-line pattern interrupt that resets curiosity right before it falls off. Place a rehook at the start of every new section. Examples of rehook structure: tease what's coming in this section, hint that it's the most important part, or frame what happens if the viewer skips it. One line is enough to pull attention back up.

Every 30–40 seconds, change something: a new example, a question, a contrast, a surprising stat — anything to break the monotony and prevent viewer drift.

---

### 5a. NEVER ANNOUNCE A SECTION — CURIOSITY DIES THE MOMENT YOU LABEL IT
The single biggest retention killer in section transitions is announcing exactly what the next section is about.

BAD: "Next, we're going to talk about autofocus." — This kills all curiosity. The viewer now knows what's coming, feels no need to stay, and the loop is dead before it opens.

GOOD options instead:
1. Just start talking about it — no announcement, no label. Move directly into the content. "The autofocus on this camera does something no one talks about..." — you're already in it.
2. Use a vague/general tease instead of the specific term — "camera quality" instead of "autofocus performance". General enough to maintain curiosity, specific enough to signal value. "But what really separates this camera is the quality you get out of it — and not where most people think."
3. Use a re-hook that creates tension before the reveal — frame what's at stake if they miss this, or hint at a surprising take, before naming the topic. "And this is the part where most people buying this camera get it completely wrong."

The rule: never give the viewer the answer in the transition. The transition's job is to make them need the answer, not to tell them what it is.

A viewer who knows what's coming has no reason to keep watching. A viewer who is slightly unsure, slightly curious, slightly tense — stays.

---

### 6. EMOTIONAL VARIETY — SCRIPT IN WAVES, NOT A FLAT LINE
A script that reads like a lecture loses people. The emotional register must move: from urgency to relief, from surprise to understanding, from tension to payoff. Think in waves — zoom into a specific detail, then zoom back out to the big picture, then zoom in again. Mix fear, surprise, curiosity, and moments of clarity. Emotional monotony is the silent killer of watch time.

---

### 7. THE OUTRO / CTA — CLOSE WELL, THEN MOVE THEM
The outro does two things:
1. Give closure — summarize what they learned so they feel the video was worth their time ("So now you know...", "Here's what this means...")
2. Visualize the outcome — don't just state what they learned, help them see what they can do with it. "Now you know how to X" is weak. "And with that, you'll be able to Y without Z" is strong — it makes the result feel real and personal.
3. Frame the next problem — identify the next roadblock they'll hit, expand on it just enough to make them feel it, then point them toward the solution (next video, link, offer). The action should feel like the natural next step, not a hard sell.

---

### 8. TENSION IS THE ENGINE
Tension is not a technique — it is the engine of the entire script. It is created by the gap between what the viewer knows now and what they're waiting to find out. Every section should plant a seed of tension early and pay it off before closing. Scripts without tension feel flat because the viewer has no emotional reason to keep watching. Build, hold, release — repeat.`;

/**
 * Hook-specific framework. Injected into the generate prompt as explicit
 * rules for writing the hook — separate from the general structure principles.
 */
export const HOOK_PRINCIPLES = `## HOOK FRAMEWORK — NON-NEGOTIABLE RULES

A hook has exactly two jobs: topic clarity and on-target curiosity.
Topic clarity = the viewer immediately knows what the video is about.
On-target curiosity = they believe the video is for them and they want what comes next.
If the hook doesn't deliver both, viewers leave in the first 2 seconds. Every rule below serves one of these two jobs.

---

### THE FOUR HOOK MISTAKES (avoid all of them)

**Mistake 1 — DELAY**
The topic introduction is delayed by fluff at the start. Fix: get to the topic in the very first sentence, in as few words as possible. Zero warmup. Zero preamble. No "Hey guys" or "Today I want to talk about" before the actual topic lands. Speed to value. Every second without clarity loses viewers exponentially.

**Mistake 2 — CONFUSION**
The words are unclear or hard to parse. Fix: use a sixth-grade reading level. Short words. Direct active voice ("the dog jumped" not "the jump was made by the dog"). One possible interpretation only — if the hook could mean two different things, rewrite it until it can only mean one.

**Mistake 3 — IRRELEVANCE**
The viewer doesn't feel like the video is for them. Fix: frame hooks using "you/your" not "I/me". Don't say "I struggled with this for years" — say "If you've been struggling with this." Agitate a pain point the viewer already knows they have. Frame around expected value: need-to-have, not nice-to-have.

**Mistake 4 — DISINTEREST**
The viewer understands the topic and knows it's for them, but still isn't curious enough. Fix: create contrast. Contrast is the distance between A (what the viewer currently believes or does) and B (your contrarian or surprising alternative). This gap creates a curiosity loop — the viewer needs to know how B is possible.

---

### CONTRAST — THE ENGINE OF CURIOSITY

Two types of contrast:

**Stated contrast** — explicitly name both A and B. "Most people do X. I do Y and get 3x the result." Impossible to miss. Use this when B might seem unbelievable without context.

**Implied contrast** — only state B. The viewer's existing knowledge of A is assumed. "This one change doubled my results in 2 weeks." You don't need to say what they were doing before — they know. Cleaner and faster.

In both cases, B should: solve the viewer's problem faster / better / cheaper / more simply than they expected.

---

### HOOK STRUCTURE

A hook is 2–3 sentences. Not one massive run-on. Not five sentences of build-up.

- Sentence 1: topic clarity — what is this video about, stated directly
- Sentence 2–3: contrast + curiosity — the surprising angle, the pain point agitated, the promise of value

If you can deliver both clarity and contrast in one sentence, that is the strongest possible hook. Reuse that formula.

---

### HARD RULES

- Never open with vague suspense hooks ("You won't believe what I found" / "This changed everything for me") — they give zero context and lose viewers immediately
- Never open with credentials or backstory before the topic — credibility comes AFTER the hook, not before
- Never use "In this video I'm going to show you" — it wastes the first sentence on process instead of value
- The hook is not the place for nuance — be direct, be specific, be immediate`;

