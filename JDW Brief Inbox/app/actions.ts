"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAidan, requireUser } from "@/lib/auth";
import { validateBriefJson } from "@/lib/brief-schema";
import {
  createBrief,
  deleteBrief,
  updateBriefStatus,
  updateChecklistItem,
  updateInternalNotes
} from "@/lib/db";
import {
  assertSameOriginRequest,
  assertUuid,
  MAX_BRIEF_JSON_LENGTH,
  MAX_INTERNAL_NOTES_LENGTH
} from "@/lib/security";
import { isBriefStatus, type BriefStatus } from "@/lib/status";

export type SubmitBriefResult =
  | {
      ok: true;
      id: string;
    }
  | {
      ok: false;
      message: string;
      issues?: string[];
    };

export async function submitBriefAction(rawJson: string): Promise<SubmitBriefResult> {
  assertSameOriginRequest();
  const role = requireUser();

  if (rawJson.length > MAX_BRIEF_JSON_LENGTH) {
    return {
      ok: false,
      message: "Brief JSON is too large."
    };
  }

  const validation = validateBriefJson(rawJson);

  if (!validation.ok) {
    return {
      ok: false,
      message: validation.message,
      issues: validation.issues
    };
  }

  try {
    const brief = await createBrief({
      brief: validation.brief,
      missingFields: validation.missingFields,
      submittedBy: role
    });

    revalidatePath("/inbox");

    return {
      ok: true,
      id: brief.id
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to save brief."
    };
  }
}

export async function updateBriefStatusAction(id: string, status: BriefStatus): Promise<void> {
  assertSameOriginRequest();
  requireAidan();
  assertUuid(id);

  if (!isBriefStatus(status)) {
    throw new Error("Unsupported status.");
  }

  await updateBriefStatus(id, status);
  revalidatePath("/inbox");
  revalidatePath(`/brief/${id}`);
}

export async function toggleChecklistItemAction(
  briefId: string,
  checklistItemId: string,
  completed: boolean
): Promise<void> {
  assertSameOriginRequest();
  requireAidan();
  assertUuid(briefId);
  assertUuid(checklistItemId);
  await updateChecklistItem(checklistItemId, completed);
  revalidatePath(`/brief/${briefId}`);
}

export async function updateInternalNotesAction(briefId: string, internalNotes: string): Promise<void> {
  assertSameOriginRequest();
  requireAidan();
  assertUuid(briefId);

  if (internalNotes.length > MAX_INTERNAL_NOTES_LENGTH) {
    throw new Error("Internal notes are too long.");
  }

  await updateInternalNotes(briefId, internalNotes);
  revalidatePath(`/brief/${briefId}`);
}

export async function deleteBriefAction(briefId: string): Promise<void> {
  assertSameOriginRequest();
  requireAidan();
  assertUuid(briefId);
  await deleteBrief(briefId);
  revalidatePath("/inbox");
  redirect("/inbox");
}
