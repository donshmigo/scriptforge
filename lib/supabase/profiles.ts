import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonaProfile, WhoAmI } from "@/lib/types";

const EMPTY_WHO_AM_I: WhoAmI = {
  name: "",
  channelUrl: "",
  credibilityStack: "",
  uniqueMethod: "",
  contraryBelief: "",
  targetPerson: "",
  contentStyle: "talking-head",
  profileDoc: "",
};

function rowToProfile(row: Record<string, unknown>): PersonaProfile {
  const whoAmI = (row.who_am_i as WhoAmI) ?? { ...EMPTY_WHO_AM_I };

  // profile_doc TEXT column takes precedence over the JSONB field (handles large docs better)
  const profileDocText = (row.profile_doc as string) ?? whoAmI.profileDoc ?? "";
  const mergedWhoAmI: WhoAmI = { ...whoAmI, profileDoc: profileDocText };

  // style_doc TEXT column takes precedence over analysis inside style_profile JSONB
  const baseStyleProfile = (row.style_profile as PersonaProfile["styleProfile"]) ?? null;
  const styleDocText = (row.style_doc as string) ?? "";
  const mergedStyleProfile = baseStyleProfile
    ? { ...baseStyleProfile, analysis: styleDocText || baseStyleProfile.analysis }
    : styleDocText
    ? { scripts: [], analysis: styleDocText, analyzedAt: Date.now(), isDoc: true }
    : null;

  return {
    whoAmI: mergedWhoAmI,
    styleProfile: mergedStyleProfile,
    introGuide: (row.intro_guide as string) ?? "",
    scriptGuide: (row.script_guide as string) ?? "",
  };
}

export async function getPersonaProfile(
  supabase: SupabaseClient,
  userId: string,
  personaId: string
): Promise<PersonaProfile | null> {
  const { data } = await supabase
    .from("user_persona_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .single();

  if (!data) return null;
  return rowToProfile(data);
}

export async function upsertPersonaProfile(
  supabase: SupabaseClient,
  userId: string,
  personaId: string,
  profile: Partial<PersonaProfile>
): Promise<void> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    persona_id: personaId,
    updated_at: new Date().toISOString(),
  };

  if (profile.whoAmI !== undefined) {
    // Store structured fields in JSONB, but profileDoc in its own TEXT column
    const { profileDoc, ...structuredFields } = profile.whoAmI;
    payload.who_am_i = structuredFields;
    payload.profile_doc = profileDoc ?? "";
  }

  if (profile.styleProfile !== undefined) {
    if (profile.styleProfile === null) {
      payload.style_profile = null;
      payload.style_doc = "";
    } else {
      // Store analysis in its own TEXT column, keep metadata in JSONB
      const { analysis, ...meta } = profile.styleProfile;
      payload.style_profile = meta;
      payload.style_doc = analysis ?? "";
    }
  }

  if (profile.introGuide !== undefined) payload.intro_guide = profile.introGuide;
  if (profile.scriptGuide !== undefined) payload.script_guide = profile.scriptGuide;

  const { error } = await supabase
    .from("user_persona_profiles")
    .upsert(payload, { onConflict: "user_id,persona_id" });

  if (error) throw new Error(error.message);
}

export async function getAllPersonaProfiles(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, PersonaProfile>> {
  const { data } = await supabase
    .from("user_persona_profiles")
    .select("*")
    .eq("user_id", userId);

  const result: Record<string, PersonaProfile> = {};
  for (const row of data ?? []) {
    result[row.persona_id as string] = rowToProfile(row);
  }
  return result;
}
