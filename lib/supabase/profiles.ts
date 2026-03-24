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
  return {
    whoAmI: (row.who_am_i as WhoAmI) ?? { ...EMPTY_WHO_AM_I },
    styleProfile: (row.style_profile as PersonaProfile["styleProfile"]) ?? null,
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
  if (profile.whoAmI !== undefined) payload.who_am_i = profile.whoAmI;
  if (profile.styleProfile !== undefined) payload.style_profile = profile.styleProfile;
  if (profile.introGuide !== undefined) payload.intro_guide = profile.introGuide;
  if (profile.scriptGuide !== undefined) payload.script_guide = profile.scriptGuide;

  await supabase
    .from("user_persona_profiles")
    .upsert(payload, { onConflict: "user_id,persona_id" });
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
