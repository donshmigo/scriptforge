import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `You extract structured identity information from a creator's document. Return ONLY valid JSON — no markdown, no explanation.`,
      messages: [
        {
          role: "user",
          content: `Read this document and extract the creator's identity info. Fill in every field you can find — leave a field as an empty string if the document doesn't mention it.

Return ONLY this JSON shape:
{
  "name": "creator's name or handle",
  "credibilityStack": "their proof points, results, credentials, numbers — everything that establishes their authority",
  "uniqueMethod": "their specific system, framework, or approach — what they teach and how",
  "contraryBelief": "what they believe that contradicts conventional wisdom in their space",
  "targetPerson": "who their content is specifically for — their situation, problem, and goal"
}

DOCUMENT:
${text.slice(0, 8000)}`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json({ identity: parsed });
    } catch {
      // If JSON parse fails, return the raw text so the caller can see what happened
      return NextResponse.json({ error: "Could not parse AI response.", raw }, { status: 500 });
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to parse document." },
      { status: 500 }
    );
  }
}
