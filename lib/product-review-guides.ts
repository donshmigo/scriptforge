// ─────────────────────────────────────────────────────────────────────────────
// Product Review — 4-Document Scripting System
// For single-product YouTube review videos.
// Each document owns exactly one domain; no document overrides another's scope.
//
// CONFLICT RESOLUTION:
//   Language / tone / word choice          → Input 1  (STYLE GUIDE)
//   Proof points / stories / audience      → Input 2  (WHO AM I / HOST BRIEF)
//   Intro beats / modes / USP              → Input 3  (INTRO GUIDE)
//   Body / rehooks / story flow / outro    → Input 4  (SCRIPT GUIDE)
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_REVIEW_STYLE_GUIDE = `
## PRODUCT REVIEW — STYLE GUIDE (Input 1)
### Governs: Language, tone, word choice, sentence structure, review-specific language rules. Nothing else.

---

### DOCUMENT SYSTEM
Four documents work together. Load in order. Each governs exactly one area.
- INPUT 1 ► STYLE GUIDE — Language, tone, word choice, sentence structure
- INPUT 2 — HOST BRIEF — All topic expertise, proof points, audience, and content brief
- INPUT 3 — HOW TO WRITE AN INTRODUCTION — Intro beats, opening modes, USP
- INPUT 4 — HOW TO WRITE A SCRIPT — Body structure, rehooks, story flow, outro, CTAs

CONFLICT RESOLUTION: Language → Input 1. Topic expertise → Input 2. Intro structure → Input 3. Script architecture → Input 4.

---

### VOICE IN ONE SENTENCE
"Write like a knowledgeable friend who has bought and used this product — and explains what's actually worth knowing, directly, without wasting a word."

The writing is conversational but not casual. Confident but not arrogant. Direct without being cold. Think: a trusted peer who has already made this purchase decision and is telling you what they actually think — not a marketing brochure, not a teardown spec sheet, and not a performance. The sophistication comes from the clarity of the ideas, not the complexity of the language. Any product, no matter how technical, can be reviewed in plain sentences.

---

### SENTENCE STRUCTURE & LENGTH

THE CORE RULE: One idea per sentence. Short sentences land harder. Medium sentences explain. Long sentences are rare — and only used to build momentum before a payoff.

SENTENCE RHYTHM: The most effective rhythm in a review is a three-part pattern: a short punchy statement, a medium expansion, then a short payoff. This creates a natural read-aloud pace and prevents listener fatigue.

RHYTHM IN PRACTICE:
"The camera is technically impressive on paper."
"But in medium light — where most people actually shoot — it falls apart."
"That's the part the spec sheet won't tell you."

SENTENCE STARTERS: Starting sentences with conjunctions — And, But, So — is intentional. It makes the writing feel spoken, not written.

✓ WRITE THIS:
- And that's the trade-off that matters.
- But here's what you only find out after a week.
- So the real question is whether it's worth the extra cost.
- Now let's look at performance under load.
- The thing is — it works, just not for everyone.

✕ NEVER WRITE THIS:
- Furthermore, it is important to note...
- However, one must consider...
- Therefore, the conclusion is...
- In addition to this...
- It should be mentioned that...

Fragments are fine when used deliberately for emphasis — sparingly, and only when it makes a finding land harder.

---

### PARAGRAPH LENGTH

2 to 3 sentences per paragraph. One clear finding stated, briefly expanded, then a new paragraph begins. If a paragraph is doing two jobs, split it.

✓ WRITE THIS: 2–3 sentences. One finding. Done. New paragraph = new aspect of the product. Leave white space. Let the read breathe.
✕ NEVER WRITE THIS: 4+ sentences in a row on the same spec. Multiple claims stacked in one block. Wall-of-text paragraphs that explain everything at once.

---

### SCRIPT FORMATTING

SCRIPTS ARE WRITTEN TO BE READ WORD FOR WORD. Every review script is a word-for-word document. The host reads it exactly as written. This means every sentence must work when spoken aloud — not just on the page. Write for the ear, not the eye.

SECTION SUBHEADINGS: Use bold subheadings to mark the start of each new review section. The body is written in prose — not bullets, not numbered items — with a clean section header followed by paragraphs. Subheadings are navigational only; they do not appear in the spoken script.

Example subheadings: Section 1: Battery Life | Section 2: Camera System | Section 3: Build Quality & Durability | Section 4: Software & Daily Use | Section 5: Verdict

PROSE ONLY — NO BULLET POINTS, EVER. There are no bullet points in a review script. Not in the body, not in the verdict, not in the outro. Bullets fragment findings that should flow as connected reasoning. Every finding is a sentence in a paragraph.

PRODUCTION NOTES: Stage directions for recording appear mid-script as bracketed notes. Spoken lines are plain text. Everything else is in square brackets.
Example: "Here's what that looks like in practice." [Show product in use — real conditions] "You can see how it handles this kind of scene." [Show footage]

---

### TRANSITIONS & SECTION MOVES

BETWEEN SECTIONS:
- "Now..." — Most common. Opens almost every new section.
- "Next..." / "Next up..." — Moving through a sequential review category.
- "From there..." — One aspect of the product leads naturally to the next.
- "At this point..." — Shift in evaluation stage.
- "Now that you understand..." — Close a foundational section before going deeper.

WITHIN A SECTION:
- "Here is what I mean." — Before a demonstration or real-world example.
- "The thing is..." — Before reframing a common assumption about the product.
- "This does two things." — Before explaining a dual benefit or trade-off.
- "The reason this matters is..." — Before explaining why a spec or finding is significant.
- "The bottom line here is..." — Direct summary before closing a section.

OBJECTION HANDLING: Pre-empt objections with a rhetorical question followed immediately by a short, direct answer. No hedging.
"Does this actually hold up after six months?" / "In my experience — yes. The build hasn't shown any signs of wear worth worrying about."

---

### REVIEW VOICE & SPECIFICITY

THE EVALUATION SEQUENCE:
1. Name the spec, feature, or category being evaluated.
2. State what it actually performs like in real-world use — one or two sentences, no more.
3. Identify who this matters to and who it doesn't.
4. Show it in concrete terms — a specific comparison, scenario, or measurement.
5. Give the viewer the bottom line: is this a strength, a weakness, or a trade-off.

SPECIFICITY RULE: Name the specific scenario, not the general category.
Not 'the battery is good' but 'I finished a full day of heavy use with 22% left.'
Not 'the camera struggles in low light' but 'anything below roughly 200 lux and the noise becomes noticeable in the shadows.'

✓ WRITE THIS: "Here is exactly what happened when I tested this." | "What I found after [X] days of actual use is..."
✕ NEVER WRITE THIS: "There are lots of great features to explore." | "Results will vary depending on how you use it."

---

### REVIEW-SPECIFIC LANGUAGE PATTERNS

THE THREE REVIEWER POSTURES: Every section of a review lives in one of three postures. Switch between them — never stay in one for more than 60 seconds.

POSTURE 1 — THE EXPERT: State a finding with authority. Draw on specific experience or testing.
"After two weeks of daily use, the stabilisation holds at walking pace but breaks down in a jog."

POSTURE 2 — THE ADVOCATE: Champion what the product does well. Be specific. No hyperbole.
"For the buyer who needs [specific use case], this is genuinely the best option at this price. Here's why."

POSTURE 3 — THE HONEST CRITIC: State the limitation directly. No hedging. No apology for honesty.
"The one thing that will frustrate people is [specific limitation]. It's not a dealbreaker for everyone, but if [condition], it will matter."

DEMONSTRATION BOUNDARY — PROCESS VS SPECIFIC OUTPUT: During any usage demonstration or walkthrough, describe the process of using the product, not the specific output it produced. General quality impressions are grounded in the experience of using the product, not in specific outputs it produced.
✓ PERMITTED: "In general use, the output is clean and detailed." | "The tool responds quickly and the workflow is smooth."
✕ NOT PERMITTED: "You can see this specific output looks really clean." | "Look at how well this one turned out."

---

### VOCABULARY & TONE

VOCABULARY LEVEL: Plain words. The sophistication comes from the precision of the evaluation, not the complexity of the language.

✓ USE: use, show, test, find, build, works well for
✕ AVOID: utilize, demonstrate, ascertain, acquire, is optimised for the purpose of

PHRASES THAT WORK:
- "Here is what I mean." — Before a concrete real-world example
- "What actually happens is..." — Grounding a claim in observed behaviour
- "The thing you only find out after a week of use is..." — Earned counterintuition
- "In practice, this looks like..." — Moving from spec to experience
- "The part most reviews don't mention is..." — Naming the non-obvious finding
- "The dealbreaker for some people will be..." — Honest limitation framing

---

### WHAT TO NEVER WRITE

OPENINGS THAT SHOULD NEVER APPEAR:
- "Hey guys, welcome back to the channel" — no greeting, ever.
- "In today's video, we're going to be talking about..." — no topic announcement in place of a hook.
- "Before we get started, make sure you hit subscribe" — no admin before value.

LANGUAGE THAT SHOULD NEVER APPEAR:
- Hype words: incredible, amazing, insane, mind-blowing, game-changing
- Outcome inflation: This will change everything, life-changing
- Filler: basically, literally, honestly, you know what I mean
- Vague quality claims: it's really good, works really well, looks great
- Begging: smash that like button, don't forget to subscribe

TONE THAT SHOULD NEVER APPEAR: Performative excitement — over-enthusiastic, CAPS-heavy, exclamation-heavy. Condescension. Vague endorsement — calling a product good without naming why.

---

### CALL TO ACTION STYLE

End with a soft, direct CTA pointing to the next logical step. Frame it as value continuation, not a demand.

CTA PATTERN: "If you want to go further with this, check out [resource] where I break down exactly [specific benefit]."

Rules: one CTA per video maximum. Always frame as the natural next step. Never say 'like and subscribe' as a standalone CTA. Never stack multiple asks.
`.trim();

export const PRODUCT_REVIEW_INTRO_GUIDE = `
## PRODUCT REVIEW — INTRO GUIDE (Input 3)
### Governs: Intro beats, opening modes, structure. Nothing else.

---

### WHAT AN INTRO MUST DO

The introduction is not a warmup. It is the entire decision. By the time 15 seconds have passed, a viewer has already decided whether to keep watching or leave. Nothing downstream recovers a failed intro.

An introduction has exactly two jobs. Everything else is decoration.

JOB 1 — TOPIC CLARITY: The viewer knows within the first 2 seconds exactly what this review is about and whether it is for them. Clarity must be immediate, not eventual.

JOB 2 — ON-TARGET CURIOSITY: The viewer feels a gap open between what they currently know about the product and what they are about to discover. That gap must feel urgent and relevant to a purchase decision they're already considering.

THE CORE CONSTRAINT: 15 to 30 seconds. 50 to 80 words maximum. Every word must earn its place. Start with a result, a problem, or a counterintuitive fact. Never with context, background, or setup.

---

### THE FOUR INTRO MISTAKES

MISTAKE 1 — DELAY: The topic is delayed behind context, a greeting, or a vague hook.
✕ WRONG: "This has been a huge year for AI tools. In today's video, I want to talk about some of the options that are out there..."
✓ RIGHT: "I've spent the last six months testing 40 different AI writing tools. Here are the five that are actually worth using."

MISTAKE 2 — CONFUSION: The words are unclear, the sentence structure is complex, or the hook can be interpreted multiple ways.
✕ WRONG: "The multi-modal capability set that distinguishes enterprise-grade AI solutions from consumer-facing implementations..."
✓ RIGHT: "Most AI tools do the same three things. This one does something different — and it's the difference that matters."

MISTAKE 3 — IRRELEVANCE: The intro stays in the reviewer's frame without switching to the viewer's frame.
✕ WRONG: "I figured out a better way to use this tool. In this video, I'll walk through my approach."
✓ RIGHT: "I've tested every setting in this tool. In this video, you get the exact configuration that produces the best output — so you can skip the weeks of trial and error."

MISTAKE 4 — DISINTEREST: The intro is clear and relevant, but there is no contrast — no gap between what the viewer currently believes and what they are about to discover.
✕ WRONG: "In this video, I'm going to share some tips for using AI in your workflow."
✓ RIGHT: "Most people use AI to speed up the task they're already doing. The smarter use is to eliminate the task entirely. Here's how."

---

### THE FOUR BEATS

Every intro is built from the same four beats in the same order. Two are conditional. All others are required on every intro.

BEAT 1 — PROOF [ALWAYS REQUIRED]
Open with the reviewer's first-hand experience with this specific product. Establishes the right to review. Draw only from the Host Brief. Never invent.
FORMULA: I [what the reviewer has done / tested / bought / used], in [timeframe or context], without [assumption the viewer holds].
EXAMPLE: "I've been using this [product] for [timeframe]. What I found contradicts almost everything the marketing says."

BEAT 1B — CONTRARIAN INSERT [CONDITIONAL — contrarian-first mode only]
Insert immediately after Beat 1 when the review is specifically dismantling a misconception. Names the belief, then challenges it in one sentence. Skip entirely in proof-first mode.
FORMULA: Most [viewers] think [specific belief that is holding them back]. [One-sentence direct contradiction.]

BEAT 2 — PROMISE [ALWAYS REQUIRED]
Switch to YOU. Tell the viewer exactly what they will receive — a specific deliverable, not a topic description.
FORMULA: In this video, I'm going to [give/break down/show] the exact [findings/verdict/breakdown] so that you can [specific outcome — make the right purchase decision, avoid the mistake, etc.].
EXAMPLE: "In this video, you get the honest verdict on whether it lives up to the price — so you can decide before you spend the money."

BEAT 3 — BRIDGE [ALWAYS REQUIRED]
One sentence. Signals that the content is beginning. Points toward the central tension of the review.
PRIMARY FORMULA: "And that starts with understanding [FIRST CONCEPT / FIRST EVALUATION CATEGORY]."
VARIANTS: "But that starts with understanding [FIRST CONCEPT]." (contrarian-mode) | "And that starts with [FIRST CONCEPT]." (compact form)

BEAT 4 — STAKES EXPANSION [CONDITIONAL — only when urgency isn't established by Beat 1]
Prove why this product matters or why getting this decision wrong is costly. Use contrast, a number, or a counterintuitive fact. Appears after the Bridge, before Section 1. Maximum 3 sentences. Skip entirely if Beat 1 already makes the stakes obvious.

---

### THE TWO OPENING MODES

MODE A — PROOF-FIRST: Use when the reviewer's result or experience is counterintuitive enough to create the curiosity gap on its own.
Beat order: Beat 1 → Beat 2 → Beat 3 → [Beat 4 if needed]
Default mode — use when no specific misconception needs naming.

MODE B — CONTRARIAN-FIRST: Use when the review is specifically dismantling a widely-held belief about this product.
Beat order: Beat 1 → Beat 1B → Beat 2 → Beat 3
Use the 'But that starts with...' Bridge variant in this mode.

---

### ALTERNATIVE OPENING MECHANISMS

These are proven opening angles — not templates to copy. The beat structure always governs. These mechanisms determine the emotional entry point.

INVESTMENT MECHANISM: Open by naming the cost paid to earn the insight — time spent, tests run, money spent.
Best when: The reviewer has documented, specific testing experience with this product.
"I've been using this [product] every day for [X weeks/months] and in that time I've run [specific tests or scenarios]."

RESULT-CONTRAST MECHANISM: Open with a personal result that directly contradicts what the viewer assumed was true about this product.
Best when: The reviewer's finding is counterintuitive on its face.
"I expected [product] to [common expectation]. It [contradicts expectation] — and the reason is something the spec sheet won't tell you."

COMMON-BELIEF CHALLENGE MECHANISM: State what most viewers currently believe about this product, name it clearly, then position the review as the honest alternative.
Best when: The review is directly correcting a specific, widespread misconception.
"Most people think [product] is [common belief]. Here's what actually happens when you use it."

PAIN-FIRST MECHANISM: Open by naming the frustration the viewer is trying to solve with this purchase.
Best when: The video topic maps to a specific, named frustration.
"If you're trying to [specific goal] and you're wondering whether [product] will actually do it, here's the honest answer."

COUNTERINTUITIVE-OUTCOME MECHANISM: Open with a finding or recommendation that sounds wrong on first hearing.
Best when: The reviewer genuinely has a counterintuitive position on this product.
"[Surprising finding or recommendation]. I know that sounds wrong. Here's exactly why it isn't."

---

### PRE-SUBMISSION CHECKLIST — INTRO ONLY

☐ Opening mode selected — Mode A or Mode B
☐ Opening mechanism chosen and appropriate for this specific product and audience
☐ Starts with the reviewer's first-hand experience or a specific result — no greeting, no context, no warmup
☐ Contains at least one specific detail that grounds the claim (from Host Brief only — never invented)
☐ Contains contrast — either a 'without' clause or an implied gap vs the viewer's assumed baseline
☐ Beat 1B only present if Mode B — absent in Mode A
☐ Beat 2 switches to YOU — names what the viewer specifically receives
☐ Beat 2 frames a deliverable, not a topic
☐ Beat 3 uses the fixed bridge phrase or a direct approved variant. One sentence only.
☐ Beat 4 only present if the stakes are not already obvious from Beat 1
☐ Total word count: 50–80 words
☐ At least one contrast (stated or implied) is present
☐ No sentence starts with 'Today', 'Hey guys', 'In this video I'll cover', 'Welcome back'
☐ No hype language — no 'incredible', 'insane', 'game-changing', 'mind-blowing'

"The intro doesn't introduce the video. It earns the right to continue it."
`.trim();

export const PRODUCT_REVIEW_SCRIPT_GUIDE = `
## PRODUCT REVIEW — SCRIPT GUIDE (Input 4)
### Governs: Body structure, rehooks, story flow, outro, CTAs. Nothing else.

---

### DOCUMENT SYSTEM
INPUT 1 — STYLE GUIDE — Language, tone, word choice, sentence structure
INPUT 2 — HOST BRIEF — All topic expertise, proof points, audience, and content brief
INPUT 3 — HOW TO WRITE AN INTRODUCTION — Intro beats, opening modes, USP
INPUT 4 ► HOW TO WRITE A SCRIPT — Body structure, rehooks, story flow, outro, CTAs

---

### THE MASTER PRINCIPLE — EXPECTATIONS VS REALITY

Every decision in a review script serves one specific outcome: reality exceeding expectations.

When a viewer clicks on a review, they arrive with expectations built by the title, thumbnail, and whatever they've already read about the product. From that moment, every sentence either confirms, exceeds, or fails those expectations. Exceeding is the only win condition. Confirming is neutral. Failing is permanent loss.

THE CORE PRINCIPLE: If the review delivers more insight than the viewer expected — they stay, learn, share, return. If the review delivers less than the viewer expected — they bounce, never to return.

Applied to reviews: the viewer arrives believing they know roughly what a product does. The script's job is to show them what they didn't know — the real-world behaviour, the counterintuitive trade-off, the finding that only comes from actually using it.

---

### THE CENTRAL TENSION OF EVERY REVIEW

Every review worth watching is built around a central tension: the gap between what the product promises (or appears to offer based on specs and marketing) and what it actually delivers in real-world use. This tension is the through-line. It should be named in the intro (governed by Input 3), explored through each evaluation category, and resolved in the verdict.

A review without a named central tension is just a list of observations.

FINDING THE CENTRAL TENSION:
- Spec vs Reality: "On paper, this is the most [X] product in its class. In practice, that number means something different."
- Premium Pricing vs Value: "At this price, the question is whether it is worth the premium."
- Overkill vs Practical Use: "They packed in [feature]. But who actually needs that — and does it make the thing better for everyone else?"
- Trade-off: "They made it [strength] by sacrificing [weakness]. Whether that trade-off works depends on how you use it."
- Category Upset: "This product was not supposed to be the best in its class. It is anyway — and that is the story."

---

### WHAT THE VIEWER ACTUALLY WANTS TO KNOW

Most review scripts fail because they describe a product instead of demonstrating it. The viewer is not watching to hear what a product can do — they already know that from the spec sheet. They are watching to find out what it is actually like to use it, whether it does what it claims in real conditions, and whether it is right for them specifically.

THE FIVE THINGS VIEWERS MOST WANT FROM A REVIEW:
1 — DOES IT ACTUALLY WORK? Not on paper. In real conditions, with real tasks, at the level of detail the spec sheet skips over.
2 — WHAT WILL FRUSTRATE ME? The honest answer to the question the buyer is afraid to ask. The thing that won't show up in the marketing.
3 — IS IT WORTH THE MONEY? Not just whether it's good — whether it's good at its price, relative to what else they could buy. Give a direct answer, not a hedge.
4 — IS IT FOR SOMEONE LIKE ME? Segment the verdict. A product can be excellent for one buyer and wrong for another.
5 — WHAT DOES USING IT ACTUALLY FEEL LIKE? The practical experience that no spec sheet captures. The speed. The workflow. The friction points.

Every evaluation category should be written with these five questions in mind. If a section finishes without clearly answering at least one of them, it either isn't doing its job or belongs in a different video.

---

### SCRIPT ARCHITECTURE — THE FULL SEQUENCE

THE INTRO IS GOVERNED BY INPUT 3. Write the intro using Input 3 before building the body. Return to this document for everything from the first body section onwards.

SECTION → PRIMARY FUNCTION:
- INTRO: Write using Input 3. Proof, promise, bridge. 50–80 words. Names the central tension.
- BODY — FIRST EVALUATION CATEGORY (second-most important): Deliver the first genuine insight. Must beat what the viewer expected from marketing. Sets the ascending pattern.
- REHOOK: Partially close the current category. Immediately open the next in a way that makes stopping feel costly. Every 2–3 minutes.
- BODY — SECOND EVALUATION CATEGORY (most important): The most counterintuitive or significant finding. Where expectations are most exceeded.
- ADDITIONAL EVALUATION CATEGORIES: Continue ascending value order. Each section more surprising or decisive than the last.
- VERDICT: Direct. Segmented by buyer type. Names the one or two things that will make or break this product for each audience.
- OUTRO: Summarise. Visualise what the viewer now knows. Frame the next decision. Point to the solution.

KEY DEPENDENCY: If the intro names the central tension as 'the trade-off between build quality and price,' every evaluation category must connect back to that tension. The body must always deliver what the intro promised — in form, not just in spirit.

---

### THE BODY — ASCENDING ORDER & THE EVALUATION LOOP

RULE 1 — ASCENDING VALUE ORDER: Never lead with the most important finding. Put the second-most important category first, the most important second. This creates an ascending pattern — each section feels slightly more decisive than the last.

RIGHT ORDER: Second-most important → Most important → Supporting categories
"First section was great. Second was even more critical. What's the third?" — Viewer stays.

WRONG ORDER: Most important → second → supporting
"First section was the peak. This one is slightly less. Might skim the rest." — Viewer leaves.

RULE 2 — THE EVALUATION LOOP (per category): Every evaluation category follows the same four-part structure. Each part should feel natural and conversational, written word-for-word to be read aloud.

PART 1 — CONTEXT: State what this category is and what the product claims or appears to do. Establish the expectation the viewer arrives with. One idea. Short sentences. Do not describe features — name the real-world task or need this category addresses.

PART 2 — DEMONSTRATION: Walk through how the product is used for this task — the interface, the workflow, the steps the user takes. Show the experience of using the product, not the specific result it produced. Production notes point to footage of the product in use, not to a specific output created during testing.

PART 3 — REALITY: State what the reviewer found in real-world use. Be specific. Use the concrete figure, scenario, or test result from the brief. Name the gap between spec and reality — and whether reality was better or worse than expected.

PART 4 — VERDICT: Make the direct judgement: is this a strength, a weakness, or a trade-off? Name who it matters to and who it doesn't. Connect back to the central tension named in the intro.

THE USAGE DEMONSTRATION — WHAT THIS LOOKS LIKE IN PRACTICE: A usage demonstration shows the reviewer interacting with the product. It describes the process — what the reviewer does, what the product shows, what choices appear. It does not narrate whether the specific visible result is good or bad.

✓ WRITE THIS: "Here you can see the main interface. I navigate to [section] and select [option]. The process runs in [time] and the output appears here." [Show product in use — real conditions, natural workflow]
✕ NEVER WRITE THIS: "You can see this specific output looks really clean." [Show specific produced output and evaluate it]

THE DEMONSTRATION BOUNDARY — PROCESS VS SPECIFIC OUTPUT: Every usage demonstration must stay on the right side of this boundary. Process: permitted. Specific output evaluation: not permitted. General quality impressions based on the product's known, documented characteristics: permitted.

---

### VERDICT DELIVERY

THE VERDICT IS NOT AN OPINION — IT'S A DECISION TOOL. The verdict exists to answer one question for the viewer: should I buy this, or not? That question only has meaning in context: for what purpose, compared to what alternative, at what price.

A verdict that doesn't segment by buyer type is not a verdict — it's a hedge.

VERDICT STRUCTURE:
BEAT 1 — THE CALL: State directly who this product is right for. Be specific about the buyer type, the use case, and the price/value relationship.
BEAT 2 — THE DISQUALIFIER: State directly who this product is NOT right for. One sentence. No softening.
BEAT 3 — THE DECISIVE FINDING: Name the one or two things that make this product succeed or fail for each buyer type. These should connect back to the central tension named in the intro.

✓ WRITE THIS:
- "If you're [specific buyer type] who needs [specific outcome], this is the right choice."
- "If you're [different buyer type], it's not — and here's the specific reason why."
✕ NEVER WRITE THIS:
- Verdict that applies to 'most people' without segmenting.
- Verdict that contradicts what the evidence showed.
- Hedged verdict: "it depends on your needs" without specifying which needs.

---

### REHOOKS — RESETTING ATTENTION BETWEEN CATEGORIES

A rehook is not a transition sentence. It is a mini-hook between evaluation categories. Its job: close the current category enough that the viewer feels partial resolution, and immediately open the next in a way that makes stopping feel costly.

THE REHOOK FORMULA: [Acknowledge what was just covered — one sentence.] + [Name what's coming next in a way that makes it feel essential — one sentence.]

The second sentence must make the viewer feel that without the next category, the picture is incomplete. The mechanic: 'That's significant — but if you don't also understand [X], none of it matters for the buying decision.'

EXAMPLES:
- BASIC: "The battery is excellent for most use cases. But whether the camera lives up to the same standard is where it gets complicated."
- CONTRAST: "Most reviews stop at the specs. The part almost no one tests is how it performs after three months of daily use."
- STAKES: "What I just covered is the foundation. What comes next determines whether this is the right choice for you."
- CURIOSITY: "The [category] is what you would expect. The next category is the opposite of what the marketing suggests."

Placement: every 2 to 3 minutes. A review with 4 evaluation categories has 3 rehooks.

✓ WRITE THIS: Placed at a natural category boundary. Uses contrast or stakes. One to two sentences maximum.
✕ NEVER WRITE THIS: 'Moving on to...' or 'Next, we're going to talk about...' (no pull). Summary of the previous category without opening the next loop.

---

### STORY FLOW — THE THROUGH-LINE RULE

Every review script has a through-line — the central tension named in the intro, explored through each category, resolved in the verdict.

THE THROUGH-LINE AUDIT: After the first draft, read every line and ask: is this a necessary part of the buying decision? Or is it an interesting detail that is not required to reach the verdict? If it's necessary: keep it. If it's interesting but not necessary: cut it.

The test is not 'is this interesting?' The test is 'does the verdict become harder to reach if this is missing?'

---

### COMPREHENSION — THE 5 CLARITY RULES

1. SIMPLER WORDS: Target plain vocabulary. When a technical term is necessary, immediately follow it with a plain-language restatement.
2. SHORTER SENTENCES: Short sentences reduce cognitive load. One finding per sentence. Two if they're short. Never three.
3. ACTIVE VOICE: Active voice is easier to process. The product performs the action — or the reviewer performs the test. Flag every passive construction and rewrite it active.
4. RESTATE COMPLEX FINDINGS TWICE: When a finding is genuinely counterintuitive or technical, state it — then immediately restate it in the simplest possible form. Signal the restate with 'in other words' or 'put simply.'
5. NAME YOUR FRAMEWORKS: Give memorable names to recurring evaluations and trade-off categories. A named trade-off is easier to remember and share.

---

### THE OUTRO — THREE STEPS

STEP 1 — SUMMARISE: Distil the core finding into one or two sentences. The viewer should feel they got a real answer. Remind them what the central tension was and how it resolved.
Example: "So the short version is this: if [central finding], this is the product for you. If [opposite], it isn't."

STEP 2 — VISUALISE THE OUTCOME: Help the viewer picture what changes in their actual life if they act on what they learned. Not generic encouragement — a specific image of the buying decision made correctly.
Example: "If this is the right product for you, you will know within the first week. If you are on the fence, the [key factor] will be the thing that decides it."

STEP 3 — FRAME THE NEXT DECISION: Name the next question the viewer will likely have after this review. Then point to the resource, video, or comparison that answers it. The action should feel like the obvious next step.
Example: "If you are now wondering how this compares to [obvious alternative], I have covered that in [resource] — link is below."

OUTRO LANGUAGE THAT NEVER APPEARS: "I hope you enjoyed this video!" | "Don't forget to like and subscribe." | "That's all for today, guys — see you in the next one!"

---

### NATIVE EMBED CTAs

A CTA that feels like an ad break interrupts the through-line. A native embed is a CTA that appears inside the natural content flow — at the point where the viewer's next question is freshest.

NATIVE EMBED POSITIONS:
POSITION 1 — After a significant finding: Viewer just heard something that changes their assessment. Offer a resource that goes deeper.
POSITION 2 — After naming a weakness: The reviewer has identified a real trade-off. Offer the resource as the continuation.
POSITION 3 — In the outro: After the verdict, the next question naturally arises. Frame it and point to the answer.

✓ WRITE THIS: CTA placed right after the highest-engagement moment. Offered as an answer to a question the viewer now has. One CTA maximum.
✕ NEVER WRITE THIS: 'By the way, check out my [thing] in the description' (mid-sentence, no context). Multiple CTAs that conflict with each other.

---

### PRE-SUBMISSION CHECKLIST — BODY ONWARDS

☐ Script is written word-for-word throughout — no bullet points anywhere in the document
☐ Intro written and checked using Input 3 checklist — run separately before this checklist
☐ Body delivers exactly what the intro promised — in form, not just in spirit
☐ Central tension named in the intro is present throughout every evaluation category
☐ Every category follows the evaluation loop: Context → Demonstration → Reality → Verdict
☐ Every major category includes a usage demonstration — the process shown, not a specific output evaluated
☐ First body category is the second-most important — not the most important, not the least
☐ Each subsequent category is more counterintuitive or decisive than the previous
☐ Verdict is segmented by buyer type — not written for a single universal buyer
☐ Verdict names the one or two decisive findings explicitly
☐ Verdict does not hedge a clear weakness
☐ Verdict connects back to the central tension named in the intro
☐ Rehook placed at every major category boundary (~every 2–3 minutes)
☐ Each rehook partially closes the current category and immediately opens the next
☐ Each rehook uses contrast, stakes, or curiosity — not 'moving on to...'
☐ Through-line audit completed — every line tested for necessity vs distraction
☐ All sentences at plain-vocabulary level — no technical jargon without restatement
☐ Active voice used throughout — passive constructions rewritten
☐ Summary gives the viewer a clear sense of what they learned
☐ Outcome visualised — viewer can picture the buying decision made correctly
☐ Next decision framed and resource pointed to — natural, not forced
☐ CTA is a native embed — framed as natural next step, not an ad break
☐ One CTA maximum — no stacked asks
☐ No specific produced outputs referenced as evidence — demonstrations show process, not specific results
☐ No hype language — no 'incredible', 'insane', 'game-changing'
☐ No invented proof points — every specific number is documented in Input 2
☐ Every sentence either advances the through-line or gets cut

"The review script is not a transcript of what you tested. It is a path that leads the viewer from what they believe the product is, to what you can prove it actually does — and who it's actually for."
`.trim();
