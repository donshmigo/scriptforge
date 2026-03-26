import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export interface ParsedScript {
  name: string;
  text: string;
  wordCount: number;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Use unpdf (PDF.js-based) — handles rich PDFs including banners and tables
  const { extractText } = await import("unpdf");
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
  // mergePages:true returns { text: string }, otherwise { text: string[] }
  const raw = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  return (raw ?? "").trim();
}

async function extractDocx(buffer: Buffer): Promise<string> {
  // mammoth.extractRawText pulls all text including table cells
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value?.trim() ?? "";
  if (text.length > 20) return text;

  // Fallback: get HTML and strip tags (better table/list handling in edge cases)
  const html = await mammoth.convertToHtml({ buffer });
  return html.value
    .replace(/<\/?(td|th|li|br|p|div|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    const parsed: ParsedScript[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const name = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      let text = "";

      try {
        const lower = name.toLowerCase();
        if (lower.endsWith(".pdf")) {
          text = await extractPdf(buffer);
        } else if (lower.endsWith(".docx")) {
          text = await extractDocx(buffer);
        } else {
          // .txt / .md — plain UTF-8
          text = buffer.toString("utf-8").trim();
        }
      } catch (e: unknown) {
        errors.push(`${name}: ${e instanceof Error ? e.message : "parse failed"}`);
        continue;
      }

      // Clean up whitespace
      text = text
        .replace(/\0/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{4,}/g, "\n\n")
        .trim();

      if (text.length < 20) {
        errors.push(`${name}: no readable text found — try saving as .txt`);
        continue;
      }

      parsed.push({
        name,
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      });
    }

    if (parsed.length === 0) {
      const detail = errors.length > 0 ? `: ${errors[0]}` : "";
      return NextResponse.json(
        { error: `Could not read the file${detail}. Try saving it as a .txt file and uploading again.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ scripts: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
