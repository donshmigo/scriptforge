import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export interface ParsedScript {
  name: string;
  text: string;
  wordCount: number;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("unpdf");
  const { extractText } = mod.default ?? mod;
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n") : (result.text ?? "");
  return text.trim();
}

async function extractDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("mammoth");
  const mammoth = mod.default ?? mod;
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
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
          // .txt, .md — read as UTF-8
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
      const detail = errors.length > 0 ? ` (${errors[0]})` : "";
      return NextResponse.json(
        { error: `Could not extract text from the file${detail}. Try saving it as a .txt file and uploading again.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ scripts: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
