"use client";

import { useState } from "react";
import {
  validateBriefJson,
  type BriefValidationResult,
  type JDWCampaignBrief
} from "@/lib/brief-schema";

type GeminiBriefPanelProps = {
  onGenerated: (
    json: string,
    validation: Extract<BriefValidationResult, { ok: true }>,
    message: string
  ) => void;
};

type GeminiApiResult =
  | {
      ok: true;
      generated: unknown;
      isBatch: boolean;
      briefCount: number;
      missingFields: string[];
      message: string;
    }
  | {
      ok: false;
      message: string;
      issues?: string[];
    };

function briefLabel(brief: JDWCampaignBrief, index: number): string {
  return [
    brief.campaign.artist,
    brief.campaign.release_title,
    brief.campaign.platform
  ]
    .filter(Boolean)
    .join(" / ") || `Brief ${index + 1}`;
}

function validateGeneratedPayload(payload: unknown): Extract<BriefValidationResult, { ok: true }> {
  const validation = validateBriefJson(JSON.stringify(payload));
  if (!validation.ok) {
    throw new Error(validation.issues?.join("\n") || validation.message);
  }

  return validation;
}

function validationForSingleBrief(brief: JDWCampaignBrief): Extract<BriefValidationResult, { ok: true }> {
  return validateGeneratedPayload(brief);
}

export function GeminiBriefPanel({ onGenerated }: GeminiBriefPanelProps) {
  const [rawBrief, setRawBrief] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [batchBriefs, setBatchBriefs] = useState<JDWCampaignBrief[]>([]);
  const characterCount = rawBrief.trim().length;

  function loadBrief(brief: JDWCampaignBrief, message: string) {
    const validation = validationForSingleBrief(brief);
    onGenerated(JSON.stringify(brief, null, 2), validation, message);
    setSuccess(message);
    setBatchBriefs([]);
  }

  async function generateBrief() {
    const cleanBrief = rawBrief.trim();
    setError(null);
    setSuccess(null);
    setBatchBriefs([]);

    if (!cleanBrief) {
      setError("Paste a raw brief first.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/gemini/brief", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rawBrief: cleanBrief })
      });
      const result = (await response.json()) as GeminiApiResult;

      if (!response.ok || !result.ok) {
        throw new Error(
          result.ok
            ? "Gemini could not generate this brief."
            : [result.message, ...(result.issues || []).slice(0, 6)].join("\n")
        );
      }

      const validation = validateGeneratedPayload(result.generated);
      if (validation.briefs.length > 1) {
        const briefs = validation.briefs.map((brief) => brief.brief);
        setBatchBriefs(briefs);
        setSuccess(`${briefs.length} briefs generated. Pick one to review.`);
        return;
      }

      loadBrief(validation.briefs[0].brief, "Gemini brief mapped into builder");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to generate a brief.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="gemini-import-panel pixel-window p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="pixel-label">James Talk Import</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Paste the messy brief. Gemini structures it.
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold pixel-muted">
            It loads into the builder for review first. Nothing saves until you confirm it.
          </p>
        </div>
        <button
          type="button"
          onClick={generateBrief}
          disabled={isGenerating}
          className="pixel-button px-5 py-3 text-xs disabled:opacity-60"
        >
          {isGenerating ? "Reading..." : "Generate brief"}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="import-mode-row">
          <span className="mode-pill mode-pill-active">Gemini auto-build</span>
          <span className="mode-pill">Manual edit after import</span>
          <span className="mode-pill">Ask James what is missing</span>
        </div>
        <textarea
          value={rawBrief}
          onChange={(event) => setRawBrief(event.target.value)}
          className="field import-textarea min-h-44 resize-y text-sm"
          placeholder="Paste James' WhatsApp, email, notes, asset links, budgets, dates, ACID, pixel, targeting notes..."
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.12em] pixel-muted">
          <span>{characterCount ? `${characterCount.toLocaleString()} characters ready` : "Waiting for brief text"}</span>
          <span>Server-side API key only</span>
        </div>

        {batchBriefs.length > 0 ? (
          <div className="pixel-card p-3">
            <p className="pixel-label">Multiple briefs detected</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {batchBriefs.map((brief, index) => (
                <button
                  key={`${briefLabel(brief, index)}-${index}`}
                  type="button"
                  onClick={() =>
                    loadBrief(
                      brief,
                      `Loaded Gemini brief ${index + 1} of ${batchBriefs.length}`
                    )
                  }
                  className="mini-button"
                >
                  {briefLabel(brief, index)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="pixel-alert whitespace-pre-wrap p-3 text-sm font-bold" role="alert">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="pixel-ready p-3 text-sm font-black" aria-live="polite">
            {success}
          </p>
        ) : null}
      </div>
    </section>
  );
}
