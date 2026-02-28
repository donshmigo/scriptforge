// ─────────────────────────────────────────────────────────────────────────────
// Viral Hook Library — curated from "1000 Viral Hooks" for Thomas's niche
// (personal brand, authority, Instagram growth for professionals & consultants)
//
// Usage: inject getHooksForReelType(reelType) into the Reels prompt as
// structural inspiration for writing the opening hook sentence.
//
// Rules for the AI using these:
//   - Use these as structural patterns only — never copy verbatim
//   - Adapt to Thomas's calm, direct, zero-hype voice (Input 1 always governs)
//   - Fill in the [insert X] blanks with the creator's actual credibility/topic
//   - Anti-fabrication rules still apply — no invented numbers or claims
// ─────────────────────────────────────────────────────────────────────────────

const EDUCATIONAL_HOOKS = `
EDUCATIONAL HOOKS — use as structural inspiration for the opening hook sentence:

It took me [X] years to learn this but I'll teach it to you in less than 1 minute.
If I woke up [pain point] tomorrow and wanted to [dream result] by [time], here's exactly what I would do.
Here are some slightly unethical [niche] hacks that you should know if you're [target audience].
I think I just found the biggest [niche] cheat code.
Not to flex, but I'm pretty good at [skill/niche].
In 60 seconds I'm going to teach you more about [thing] than you've learned in your entire life.
If you're a [target audience] and you want [dream result] by [avenue], then listen to this video.
This is the same exact [thing] but the first got [result] and the second got [different result].
If you want to end up [pain point], skip this video.
Everyone tells you to [action] but nobody actually shows you how to do it.
There is one thing above all that sets the top [title] apart from the rest.
This is how I would [action] if I were starting from scratch.
The reason you can't [dream result] is because…
If I had 90 days to go from [current state] to [dream result], here's exactly what I would do.
If you're trying to [dream result] and you haven't got a clue what to do on a daily basis, I am going to show you an example.
Here's exactly how you're going to lock in if you want to [dream result].
What I wish I knew at [age] instead of [later age].
Things that are damaging your [noun] without you even realizing it.
After over a decade of [action], here is what I wish someone would have told me from the start.
[X] things I'd do if I were to re-start [industry/niche].
30 seconds of [industry] advice I'd give my best friend if they were starting from scratch.
If you told me [X] years ago I'd be [dream result], I wouldn't have believed you.
Here's the difference between [title], [title], and [title].
Here's every [noun] you actually need to know.
If I could suggest any one tip to any [person] out there, it would be this.
The most important things I will teach my [clients/students] as a [job title].
[X] things I'd do before quitting your job.
If you have [pain point], [pain point], and [pain point], you might be doing [thing] wrong.
You don't have [pain point] — you just need to [solution], and I'm going to tell you how.
`.trim();

const MYTH_HOOKS = `
MYTH BUSTING HOOKS — use as structural inspiration for the opening hook sentence:

More [target audience] need to hear this: [common belief] will not [result].
They said, "[famous cliché]." That's a lie.
Just because you do [action] doesn't make you a good [label].
[Action] does not mean you're [negative adjective], it means you're just [adjective].
Stop using [item] for [result].
Let me de-influence you from [action].
I haven't done [common action] in over [X] years, and it's healed [noun].
If you [action] like this, then you're doing it wrong.
You are not [bad label], you are not [bad label] — you just can't [adjective] yet.
Everyone on the internet is going to tell you [thing] is impossible. Let me show you how to do it.
You are not bad at [action] — you probably were just never taught how.
The reason your [noun] sucks is because you have no [adjective].
If you're really a [dream result], why aren't you doing [common belief]?
Don't [action] until you've done this one thing.
This is how we think we [pain point], but you'd have to [action] on top of [action] [X] times for that to happen.
I said it before and I'm going to say it again: [mind blowing fact].
There is absolutely no reason for you to be [pain point] every single day just because you're trying to [dream result].
[X] things I would never do in my [age range] if I wanted to [dream result] by [age range].
Don't make the mistake of [action], [action], [action].
My biggest regret in [life event] was [accomplishment].
I can't believe it took me [X] years to realize I've been [action] wrong this entire time.
If you [action] this [noun], yes I'm judging you.
I have never met a single person who [action], [action], [action], and still has time to [dream result].
`.trim();

const COMPARISON_HOOKS = `
COMPARISON HOOKS — use as structural inspiration for the opening hook sentence:

A lot of people ask me: what's better — [option 1] or [option 2] for [dream result]? I achieved [dream result] doing one of these, and it's not even close.
This [option 1] has [noun] and [option 2] has [noun].
This group didn't [action] and this group did.
For this [noun], you could have all of these [noun].
How long would it take you to go from [before state] like this to [dream result] with [desire]?
Both these [noun] are exactly the same. I have not changed a single thing. But this one is [metric] and this one is [metric].
This is [noun] before you [action], this is [noun] after you [action].
These two groups [similar result] but this group [different result].
Cheap vs. expensive [noun].
You will [result] a week if you [action] on a [journey]. But you will only [result] this much a week if you [action] differently.
This is what your [noun] looks like when you don't [action]. And this is what it looks like when you do.
One [noun], and [X] of my [noun] have the same [metric].
Can you tell the difference between these two [options]? They are different — but you're not supposed to be able to.
If you're between the ages [X] and [X] and you want to become [dream result] — you have to do these [X] things.
`.trim();

const LIST_HOOKS = `
LIST HOOKS — use as structural inspiration for the opening hook sentence:

[X] [niche] hacks you can use to [dream result].
[X] things I would never do as a [title].
[X] pricing mistakes I made when starting my [business].
Here are [X] things every [person] should keep in their [noun].
[X] things you should never do when trying to [dream result].
[X] lessons, [X] [persons], in [X] days.
Here are [X] questions I ask before [verb].
[X] books to [dream result] better than 99% of [target audience].
Here's every [noun] you actually need to know.
[X] things everyone needs to know how to do in [niche].
The [X] most common mistakes I see when people are trying to [action].
[X] ways to [dream result] without [pain point].
[X] things you've been putting off that you can fix in [X] minutes.
Did you know these [X] things get [dream result] — and most people don't use any of them.
Here are [X] [nouns] from the top [title/niche] I'd never own.
`.trim();

const STEP_BY_STEP_HOOKS = `
STEP-BY-STEP HOOKS — use as structural inspiration for the opening hook sentence:

I don't care how good you think your [noun] is. You're still missing this one thing.
The missing piece to your [noun] is the exact same thing the biggest [title] are using right now.
Here's exactly how you're going to [dream result] if you want to [action].
If I had [timeframe] to get [dream result], here's exactly what I would do — step by step.
This is the program I would follow if I was trying to [dream result] from scratch.
Here's a [X]-second step-by-step tutorial you can save for later.
Everyone tells you to [action] but no one actually shows you how to do it.
This is the same system that took my client from [before] to [after] in [timeframe].
If you gave me [timeframe] to go from [current state] to [dream result], here's the exact plan.
I built this [result] from scratch. Here's the complete breakdown.
The [noun] I [action] every day that took me from this to this.
After [X] years of [action], here's what I wish I had known from day one.
There's one step above all that separates the [title] who [succeed] from those who don't.
What I would do in the first [X] days of [action] if I were starting from zero.
Here's my exact [X]-step system — the same one I've used [X] times.
`.trim();

const SELLING_HOOKS = `
SELLING HOOKS — use as structural inspiration for the opening hook sentence:

[Common pain point] — I found the exact thing that fixes it, and it's not what anyone is telling you.
My client was [pain point]. Here's the [X]-step process that changed everything.
I wasted [time/money] on [common solution] before I found this.
Here's the one shift that took my [noun] from [before] to [after] — without [pain point].
If you're a [target audience] and you want [dream result], this is the only [noun] you'll ever need.
I've helped [X] [target audience] do [result]. Here's the system they all used.
The reason most [target audience] never [dream result] isn't [common belief]. It's this.
Stop [common solution]. Here's what actually works.
[Dream result] is not as complicated as [industry] makes it look. Here's proof.
If you're still [pain point] every day, it's because no one has showed you this.
This one thing added [metric] to my [result] in [timeframe]. Here's how to use it.
[X] ways to [dream result] — ranked from least to most effective.
If you're [target audience] who [pain point] and wants [dream result], this is the simplest path.
`.trim();

const AUTHORITY_HOOKS = `
AUTHORITY HOOKS — use for any reel where credibility is the lead:

[X] YEARS it took me from [before state] to [after state].
Over the past [time] I grew my [thing] from [before] to [after].
My client got [dream result] without [pain point], and here's how.
I became a [achievement] at [age] — and if I could give you [X] pieces of advice it would be…
When I was [before state] I was constantly [pain point]. Here's the one thing that changed it.
Here's how my [student/client] went from [before result] to [after result] in [timeframe].
In [year] my [business/thing] [result]. Here's what I did.
After [dream result], here's one thing I learned the hard way so you don't have to.
I [result] in the past [timeframe]. Here's proof — and the exact steps.
Things I wish I knew before [noun] that took me from [before] to [after].
Just [X] [actions] took my client from [before] to [after] — in [timeframe].
Nobody believes me when I say I went from [before] to [after]. So let me show you.
How I took [person/thing] from 0 to [result] in [timeframe].
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// Map reel template types to their primary (and optional secondary) hook banks
// ─────────────────────────────────────────────────────────────────────────────

const REEL_TYPE_HOOK_MAP: Record<string, string[]> = {
  "educational":  [EDUCATIONAL_HOOKS, AUTHORITY_HOOKS],
  "myth":         [MYTH_HOOKS, EDUCATIONAL_HOOKS],
  "comparison":   [COMPARISON_HOOKS, EDUCATIONAL_HOOKS],
  "list":         [LIST_HOOKS, EDUCATIONAL_HOOKS],
  "step-by-step": [STEP_BY_STEP_HOOKS, AUTHORITY_HOOKS],
  "selling":      [SELLING_HOOKS, AUTHORITY_HOOKS],
};

/**
 * Returns a curated hook inspiration block for the given reel type.
 * Used in the generate route when platform === "reels".
 */
export function getHooksForReelType(reelType: string): string {
  const banks = REEL_TYPE_HOOK_MAP[reelType] ?? [EDUCATIONAL_HOOKS, AUTHORITY_HOOKS];
  return banks.join("\n\n---\n\n");
}
