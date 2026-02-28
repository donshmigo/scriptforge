import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export interface ParsedScript {
  name: string;
  text: string;
  wordCount: number;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    const parsed: ParsedScript[] = [];

    for (const file of files) {
      const name = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      let text = "";

      if (name.toLowerCase().endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value.trim();
      } else if (
        name.toLowerCase().endsWith(".txt") ||
        name.toLowerCase().endsWith(".md")
      ) {
        text = buffer.toString("utf-8").trim();
      } else {
        // Try plain text as fallback
        text = buffer.toString("utf-8").trim();
      }

      if (text.length < 50) {
        // Skip empty or nearly-empty files
        continue;
      }

      const wordCount = text.split(/\s+/).filter(Boolean).length;

      parsed.push({ name, text, wordCount });
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No readable content found in uploaded files." },
        { status: 400 }
      );
    }

    return NextResponse.json({ scripts: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse files.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
