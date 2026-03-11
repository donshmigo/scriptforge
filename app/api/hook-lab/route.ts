import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { HOOK_LIBRARY } from "@/lib/hook-library";

export async function POST(req: NextRequest) {
  try {
    const { niche, topic, videoType } = await req.json();

    if (!niche?.trim() || !topic?.trim()) {
      return NextResponse.json({ error: "Niche and topic are required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API not configured." }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const systemInstruction = `You are Hook Lab, an expert in creating viral Instagram Reel hooks. Your job is to give users 10 customized hook options for their Instagram Reel.

You will be given a user's niche, their Reel topic, a chosen video type, and a large library of hook templates organized by category (e.g., # Educational Hooks, # Myth Hooks).

Your task is to perform these steps:
1. Find Category: Locate the section in the HOOK_LIBRARY that corresponds to the user's chosen "Video Type". For example, if the type is "Educational", use the "# Educational Hooks" section.
2. Select: From that specific category ONLY, randomly select 10 unique hook templates.
3. Customize & Filter: For each of the 10 selected templates:
   a. Intelligently replace all placeholders (e.g., (insert niche), (insert goal), (insert action)) with specific words and short phrases derived from the user's "Niche" and "Reel Topic".
   b. Crucially, check if the customized hook makes sense. The tone and content must be appropriate for the topic. If a selected hook is a bad fit, discard it and randomly select a different one from the same category to replace it. Ensure you still provide 10 hooks in total.
   c. If a hook template has no placeholders, you can use it as is, but still check if it's a good contextual fit.

The final hooks you provide must be ready for the user to post and should not contain any placeholders.

Your final output MUST be ONLY a numbered list of the 10 finalized, customized hooks. Do not include any other text, explanations, or the original templates.`;

    const userPrompt = `HOOK_LIBRARY_START
${HOOK_LIBRARY}
HOOK_LIBRARY_END

USER INPUT:
- Niche: "${niche}"
- Reel idea or topic: "${topic}"
- Video Type: "${videoType}"

Based on the user's input and the provided library, find the correct category, then randomly select, customize, and filter 10 hooks now.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const hooks = raw
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((line) => line.length > 0);

    return NextResponse.json({ hooks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
