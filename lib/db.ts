import { DEFAULT_CHECKLIST_ITEMS } from "@/lib/checklist";
import type { JDWCampaignBrief } from "@/lib/brief-schema";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { BriefStatus } from "@/lib/status";
import { defaultStatusForBrief } from "@/lib/status";
import type { UserRole } from "@/lib/auth";

export type BriefRow = {
  id: string;
  title: string;
  status: BriefStatus;
  artist: string | null;
  release_title: string | null;
  acid: string | null;
  platform: string | null;
  account: string | null;
  objective: string | null;
  raw_json: JDWCampaignBrief;
  missing_required_fields: string[];
  internal_notes: string;
  submitted_by: UserRole;
  created_at: string;
  updated_at: string;
};

export type ChecklistItemRow = {
  id: string;
  brief_id: string;
  label: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
};

export type BriefWithChecklist = BriefRow & {
  checklist_items: ChecklistItemRow[];
};

function titleForBrief(brief: JDWCampaignBrief): string {
  const artist = brief.campaign.artist?.trim() || "Untitled artist";
  const release = brief.campaign.release_title?.trim();

  return release ? `${artist} - ${release}` : artist;
}

function missingInfoNotes(missingFields: string[]): string {
  if (missingFields.length === 0) {
    return "";
  }

  return ["Missing info to fill later:", ...missingFields.map((field) => `- ${field}:`)].join("\n");
}

function mapBriefRow(row: Record<string, unknown>): BriefRow {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as BriefStatus,
    artist: (row.artist as string | null) ?? null,
    release_title: (row.release_title as string | null) ?? null,
    acid: (row.acid as string | null) ?? null,
    platform: (row.platform as string | null) ?? null,
    account: (row.account as string | null) ?? null,
    objective: (row.objective as string | null) ?? null,
    raw_json: row.raw_json as JDWCampaignBrief,
    missing_required_fields: (row.missing_required_fields as string[] | null) ?? [],
    internal_notes: (row.internal_notes as string | null) ?? "",
    submitted_by: ((row.submitted_by as string | null) || "james") as UserRole,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapChecklistItem(row: Record<string, unknown>): ChecklistItemRow {
  return {
    id: String(row.id),
    brief_id: String(row.brief_id),
    label: String(row.label),
    completed: Boolean(row.completed),
    sort_order: Number(row.sort_order),
    created_at: String(row.created_at)
  };
}

export async function getBriefs(status?: BriefStatus): Promise<BriefRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("briefs").select("*").order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapBriefRow(row));
}

export async function getBriefWithChecklist(id: string): Promise<BriefWithChecklist | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("briefs")
    .select("*, checklist_items(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return {
    ...mapBriefRow(data),
    checklist_items: ((data.checklist_items as Record<string, unknown>[] | null) || [])
      .map(mapChecklistItem)
      .sort((a, b) => a.sort_order - b.sort_order)
  };
}

export async function createBrief(params: {
  brief: JDWCampaignBrief;
  missingFields: string[];
  submittedBy: UserRole;
}): Promise<BriefRow> {
  const supabase = getSupabaseAdmin();
  const { brief, missingFields, submittedBy } = params;
  const status = defaultStatusForBrief(brief, missingFields);

  const { data, error } = await supabase
    .from("briefs")
    .insert({
      title: titleForBrief(brief),
      status,
      artist: brief.campaign.artist,
      release_title: brief.campaign.release_title,
      acid: brief.campaign.acid,
      platform: brief.campaign.platform,
      account: brief.campaign.account,
      objective: brief.campaign.objective,
      raw_json: brief,
      missing_required_fields: missingFields,
      internal_notes: missingInfoNotes(missingFields),
      submitted_by: submittedBy
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const checklistRows = DEFAULT_CHECKLIST_ITEMS.map((label, index) => ({
    brief_id: data.id,
    label,
    sort_order: index
  }));

  const { error: checklistError } = await supabase.from("checklist_items").insert(checklistRows);
  if (checklistError) {
    await supabase.from("briefs").delete().eq("id", data.id);
    throw checklistError;
  }

  return mapBriefRow(data);
}

export async function updateBriefStatus(id: string, status: BriefStatus): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("briefs").update({ status }).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updateChecklistItem(id: string, completed: boolean): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("checklist_items").update({ completed }).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updateInternalNotes(id: string, internalNotes: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("briefs").update({ internal_notes: internalNotes }).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteBrief(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("briefs").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
