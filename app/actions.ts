"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { validateBriefJson } from "@/lib/brief-schema";
import {
  createBrief,
  deleteBrief,
  updateBrief,
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
      ids: string[];
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
    const savedBriefs = [];

    for (const validatedBrief of validation.briefs) {
      const brief = await createBrief({
        brief: validatedBrief.brief,
        missingFields: validatedBrief.missingFields,
        submittedBy: role
      });

      savedBriefs.push(brief);
    }

    revalidatePath("/inbox");

    return {
      ok: true,
      id: savedBriefs[0].id,
      ids: savedBriefs.map((brief) => brief.id)
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to save brief."
    };
  }
}


export async function updateBriefAction(briefId: string, rawJson: string): Promise<SubmitBriefResult> {
  assertSameOriginRequest();
  requireUser();
  assertUuid(briefId);

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

  if (validation.briefs.length !== 1) {
    return {
      ok: false,
      message: "Editing only supports one brief at a time."
    };
  }

  try {
    const validatedBrief = validation.briefs[0];
    const brief = await updateBrief({
      id: briefId,
      brief: validatedBrief.brief,
      missingFields: validatedBrief.missingFields
    });

    revalidatePath("/inbox");
    revalidatePath(`/brief/${briefId}`);

    return {
      ok: true,
      id: brief.id,
      ids: [brief.id]
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to update brief."
    };
  }
}

export async function updateBriefStatusAction(id: string, status: BriefStatus): Promise<void> {
  assertSameOriginRequest();
  requireUser();
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
  requireUser();
  assertUuid(briefId);
  assertUuid(checklistItemId);
  await updateChecklistItem(checklistItemId, completed);
  revalidatePath(`/brief/${briefId}`);
}

export async function updateInternalNotesAction(briefId: string, internalNotes: string): Promise<void> {
  assertSameOriginRequest();
  requireUser();
  assertUuid(briefId);

  if (internalNotes.length > MAX_INTERNAL_NOTES_LENGTH) {
    throw new Error("Internal notes are too long.");
  }

  await updateInternalNotes(briefId, internalNotes);
  revalidatePath(`/brief/${briefId}`);
}

export async function deleteBriefAction(briefId: string): Promise<void> {
  assertSameOriginRequest();
  requireUser();
  assertUuid(briefId);
  await deleteBrief(briefId);
  revalidatePath("/inbox");
  redirect("/inbox");
}
