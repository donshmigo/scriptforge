// Feature flags
// Set via environment variables. NEXT_PUBLIC_ prefix makes them available in the browser.
//
// NEXT_PUBLIC_ENABLE_REELS:
//   "true"  — show the Reels / short-form platform toggle in the writer (dev / preview)
//   "false" — hide it, long-form YouTube only (production)
//
// Vercel dashboard:  Production → false  |  Preview → true
// Local dev:         .env.local → NEXT_PUBLIC_ENABLE_REELS=true

export const ENABLE_REELS = process.env.NEXT_PUBLIC_ENABLE_REELS === "true";
