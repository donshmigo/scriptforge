export interface StoredScript {
  name: string;
  preview: string;  // first 120 chars (UI display only)
  sample: string;   // first 500 words (passed to generator for pattern-matching)
  wordCount: number;
}

export interface StyleProfile {
  scripts: StoredScript[];
  analysis: string;
  analyzedAt: number;
}

export interface CreatorProfile {
  path: "experienced" | "new";
  name: string;
  channelUrl: string;
  credibilityStack: string;
  uniqueMethod: string;
  contraryBelief: string;
  targetPerson: string;
  contentStyle: string;
  completedAt: number;
}

export type ContentStyle =
  | "talking-head"
  | "educational-breakdown"
  | "story-driven"
  | "fast-lists";
