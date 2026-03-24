import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { text, apiKey } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    const resolvedKey = apiKey?.trim() || process.env.OPENAI_API_KEY || "";
    if (!resolvedKey) {
      return NextResponse.json({ error: "OpenAI API key required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: resolvedKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract creator identity info from the document. Fill every field you can. Leave fields as empty string "" if genuinely not mentioned. Return ONLY valid JSON.`,
        },
        {
          role: "user",
          content: `Extract identity fields from this document. Fill in as much as possible — partial info is fine.

Return this JSON (all fields required, use "" if not found):
{
  "name": "creator name or handle",
  "credibilityStack": "all proof points, results, credentials, numbers — anything establishing authority",
  "uniqueMethod": "their specific system, framework, approach, or methodology",
  "contraryBelief": "what they believe that contradicts conventional wisdom in their space",
  "targetPerson": "who this content is for — their situation, problem, desired outcome"
}

DOCUMENT:
${text.slice(0, 10000)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      identity: {
        name: parsed.name ?? "",
        credibilityStack: parsed.credibilityStack ?? "",
        uniqueMethod: parsed.uniqueMethod ?? "",
        contraryBelief: parsed.contraryBelief ?? "",
        targetPerson: parsed.targetPerson ?? "",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) {
      return NextResponse.json({ error: "Invalid OpenAI API key." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
