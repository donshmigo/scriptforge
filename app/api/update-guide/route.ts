import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  try {
    const { guideType, currentContent, feedback, personaId } = await request.json();

    if (!feedback?.trim()) {
      return NextResponse.json({ error: "Feedback is required." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const guideLabel =
      guideType === "introGuide"
        ? "intro writing guide"
        : guideType === "scriptGuide"
        ? "script writing guide"
        : "creator identity / Who Am I document";

    const isJson = guideType === "whoAmI";

    const systemPrompt = isJson
      ? `You are updating a creator's identity profile for the "${personaId}" writing persona. The profile is a JSON object. Apply the user's requested changes and return ONLY the updated JSON object — no markdown, no explanation.`
      : `You are updating a ${guideLabel} for the "${personaId}" writing persona. Apply the user's requested changes to the document below. Keep everything not mentioned. Return ONLY the updated document text — no preamble, no explanation.`;

    const userMessage = isJson
      ? `CURRENT PROFILE (JSON):\n${typeof currentContent === "string" ? currentContent : JSON.stringify(currentContent, null, 2)}\n\nREQUESTED CHANGES:\n${feedback}`
      : `CURRENT CONTENT:\n${currentContent}\n\nREQUESTED CHANGES:\n${feedback}`;

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();

    if (isJson) {
      try {
        const parsed = JSON.parse(raw);
        return NextResponse.json({ updatedContent: parsed });
      } catch {
        return NextResponse.json({ updatedContent: raw });
      }
    }

    return NextResponse.json({ updatedContent: raw });
  } catch (e: unknown) {
    console.error("[update-guide]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Guide update failed." },
      { status: 500 }
    );
  }
}
