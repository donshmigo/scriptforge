import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export interface ParsedScript {
  name: string;
  text: string;
  wordCount: number;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse reads all text content regardless of visual formatting/banners
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfMod: any = await import("pdf-parse");
    const pdfParse = pdfMod.default ?? pdfMod;
    const result = await pdfParse(buffer);
    return result.text?.trim() ?? "";
  } catch {
    return "";
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  // Try mammoth first
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    if (result.value?.trim()) return result.value.trim();
  } catch { /* fall through */ }

  // Fallback: docx is a ZIP — extract text nodes from word/document.xml
  // ZIP local file headers start with PK\x03\x04, we scan for the XML content
  try {
    const str = buffer.toString("binary");
    // Find word/document.xml content between ZIP entries
    const xmlStart = str.indexOf("word/document.xml");
    if (xmlStart !== -1) {
      const chunk = str.slice(xmlStart, xmlStart + 500000);
      // Extract all <w:t> text nodes
      const nodes = [...chunk.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g)];
      if (nodes.length > 0) {
        return nodes.map((m) => m[1]).join(" ").replace(/\s+/g, " ").trim();
      }
    }
  } catch { /* fall through */ }

  // Last resort: pull any readable ASCII text from the buffer
  const ascii = buffer
    .toString("utf-8")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\s{3,}/g, "\n")
    .trim();
  return ascii;
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

      const lower = name.toLowerCase();
      if (lower.endsWith(".pdf")) {
        text = await extractPdf(buffer);
      } else if (lower.endsWith(".docx")) {
        text = await extractDocx(buffer);
      } else {
        // .txt, .md, anything else — read as UTF-8
        text = buffer.toString("utf-8").trim();
      }

      // Strip null bytes and excessive whitespace
      text = text.replace(/\0/g, "").replace(/[ \t]+/g, " ").replace(/\n{4,}/g, "\n\n").trim();

      if (text.length < 20) continue;

      parsed.push({
        name,
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      });
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No readable content found. Try saving the file as .txt and uploading again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ scripts: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse files.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
