"use client";

import { useState } from "react";
import {
  validateBriefJson,
  type BriefValidationResult,
  type JDWCampaignBrief
} from "@/lib/brief-schema";

type AiBriefPanelProps = {
  onGenerated: (
    json: string,
    validation: Extract<BriefValidationResult, { ok: true }>,
    message: string
  ) => void;
};

type AiTokenUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type AiModelAttempt = {
  model: string;
  ok: boolean;
  note: string;
};

type AiApiResult =
  | {
      ok: true;
      generated: unknown;
      isBatch: boolean;
      briefCount: number;
      missingFields: string[];
      message: string;
      tokenUsage?: AiTokenUsage | null;
      provider?: string;
      model?: string;
      attempts?: AiModelAttempt[];
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

export function AiBriefPanel({ onGenerated }: AiBriefPanelProps) {
  const [rawBrief, setRawBrief] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<AiTokenUsage | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [modelAttempts, setModelAttempts] = useState<AiModelAttempt[]>([]);
  const characterCount = rawBrief.trim().length;

  function loadBrief(brief: JDWCampaignBrief, message: string) {
    const validation = validationForSingleBrief(brief);
    onGenerated(JSON.stringify(brief, null, 2), validation, message);
    setSuccess(message);
  }

  async function generateBrief() {
    const cleanBrief = rawBrief.trim();
    setError(null);
    setSuccess(null);
    setTokenUsage(null);
    setModelUsed(null);
    setModelAttempts([]);

    if (!cleanBrief) {
      setError("Paste a raw brief first.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/brief", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rawBrief: cleanBrief })
      });
      const result = (await response.json()) as AiApiResult;

      if (!response.ok || !result.ok) {
        throw new Error(
          result.ok
            ? "AI could not generate this brief."
            : [result.message, ...(result.issues || []).slice(0, 6)].join("\n")
        );
      }

      setTokenUsage(result.tokenUsage || null);
      setModelUsed(result.model || null);
      setModelAttempts(result.attempts || []);

      const validation = validateGeneratedPayload(result.generated);
      if (validation.briefs.length > 1) {
        onGenerated(
          JSON.stringify(result.generated, null, 2),
          validation,
          `${validation.briefs.length} AI campaigns queued. Review one at a time.`
        );
        setSuccess(`${validation.briefs.length} AI campaigns queued. Review one at a time.`);
        return;
      }

      loadBrief(validation.briefs[0].brief, "Groq brief mapped into builder");
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
            Paste the messy brief. Groq structures it.
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold pixel-muted">
            Groq reads this through the backend and loads the result into the builder for review. Nothing saves until you confirm it.
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
          <span className="mode-pill mode-pill-active">Groq model ladder</span>
          <span className="mode-pill">Manual edit after import</span>
          <span className="mode-pill">Ask James what is missing</span>
        </div>
        <div className={`ai-pipeline ${isGenerating ? "ai-pipeline-active" : ""}`}>
          {(modelAttempts.length > 0
            ? modelAttempts
            : [
                { model: "openai/gpt-oss-120b", ok: false, note: "Primary parser" },
                { model: "qwen/qwen3-32b", ok: false, note: "JSON stability fallback" },
                { model: "openai/gpt-oss-20b", ok: false, note: "Fast final fallback" }
              ]).map((attempt, index) => (
            <span
              key={`${attempt.model}-${index}`}
              className={`ai-pipeline-step ${
                attempt.ok ? "ai-pipeline-step-done" : modelAttempts.length ? "ai-pipeline-step-failed" : ""
              }`}
              title={attempt.note}
            >
              <span>{index + 1}</span>
              {attempt.model.replace("openai/", "").replace("qwen/", "")}
            </span>
          ))}
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


        {error ? (
          <p className="pixel-alert whitespace-pre-wrap p-3 text-sm font-bold" role="alert">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="pixel-ready p-3 text-sm font-black" aria-live="polite">
            {success}
            {modelUsed ? (
              <span className="mt-1 block text-xs">
                Model used: {modelUsed}
              </span>
            ) : null}
            {tokenUsage?.totalTokenCount ? (
              <span className="mt-1 block text-xs">
                Groq usage: {tokenUsage.promptTokenCount?.toLocaleString() || "?"} in / {tokenUsage.candidatesTokenCount?.toLocaleString() || "?"} out / {tokenUsage.totalTokenCount.toLocaleString()} total tokens
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}
