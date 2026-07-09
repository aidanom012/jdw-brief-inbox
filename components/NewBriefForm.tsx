"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBriefAction } from "@/app/actions";
import { validateBriefJson, type BriefValidationResult } from "@/lib/brief-schema";
import { STATUS_LABELS } from "@/lib/status";

const SAMPLE_BRIEF = `{
  "brief_version": "JDW_CAMPAIGN_BRIEF_V1",
  "campaign": {
    "artist": "Nemzzz",
    "release_title": "Geekin",
    "acid": "80JPUI",
    "asid": null,
    "platform": "Meta",
    "account": "Atlantic Records UK",
    "objective": "Streaming Conversions",
    "campaign_type": "Engagement",
    "conversion_location": "Website",
    "optimisation_event": "View Content",
    "pixel": "swiiiiim | Atlantic UK in-house",
    "territory_summary": "UK",
    "start_date": null,
    "end_date": null
  },
  "budget": {
    "type": "lifetime",
    "amount": 500,
    "currency": "GBP",
    "notes": null
  },
  "ad_sets": [
    {
      "label": "UK",
      "locations": ["United Kingdom"],
      "age_min": 18,
      "age_max": 34,
      "gender": "all",
      "placements": ["Instagram", "Facebook"],
      "targeting_type": "unknown",
      "targeting_details": "Same as previous Nemzzz streaming campaigns",
      "exclusions": null,
      "budget_amount": null,
      "budget_type": null
    }
  ],
  "ads": [
    {
      "label": "Geekin main ad",
      "release_title": "Geekin",
      "asset_type": "video",
      "asset_links": ["https://example.com/geekin-assets"],
      "destination_url": "https://swiiiiim.song.so/geekin-feat-lil-yachty",
      "copy": "GEEKIN. OUT NOW. 🔒",
      "notes": "Use Geekin cuts from supplied folder"
    }
  ],
  "special_notes": ["Use standard Nemzzz streaming setup"],
  "missing_required_fields": []
}`;

export function NewBriefForm() {
  const router = useRouter();
  const [rawJson, setRawJson] = useState("");
  const [validation, setValidation] = useState<BriefValidationResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedPreview = useMemo(() => {
    if (!validation?.ok) {
      return null;
    }

    return validation.brief;
  }, [validation]);

  function validateCurrentBrief(): BriefValidationResult {
    const nextValidation = validateBriefJson(rawJson);
    setValidation(nextValidation);
    setSubmitError(null);
    return nextValidation;
  }

  function submitBrief() {
    const nextValidation = validateCurrentBrief();

    if (!nextValidation.ok) {
      return;
    }

    startTransition(async () => {
      const result = await submitBriefAction(rawJson);

      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }

      router.push(`/brief/${result.id}`);
    });
  }

  return (
    <div className="grid gap-5">
      <label className="block">
        <span className="text-sm font-medium text-zinc-200">Paste Claude JSON brief here</span>
        <textarea
          value={rawJson}
          onChange={(event) => setRawJson(event.target.value)}
          className="focus-ring mt-2 min-h-[420px] w-full resize-y rounded-lg border border-white/10 bg-ink p-4 font-mono text-sm leading-6 text-zinc-100 placeholder:text-zinc-600"
          spellCheck={false}
          placeholder='{"brief_version":"JDW_CAMPAIGN_BRIEF_V1", ...}'
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={validateCurrentBrief}
          className="focus-ring rounded-md border border-white/10 px-4 py-3 font-semibold text-white hover:bg-white/10"
        >
          Validate Brief
        </button>
        <button
          type="button"
          onClick={submitBrief}
          disabled={isPending || rawJson.trim().length === 0}
          className="focus-ring rounded-md bg-teal-300 px-4 py-3 font-semibold text-ink hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Submit Brief"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRawJson(SAMPLE_BRIEF);
            setValidation(null);
            setSubmitError(null);
          }}
          className="focus-ring rounded-md border border-white/10 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/10"
        >
          Load Seed Example
        </button>
      </div>

      {validation ? (
        validation.ok ? (
          <section
            className={`rounded-lg border p-4 ${
              validation.missingFields.length > 0
                ? "border-red-400/30 bg-red-500/10"
                : "border-emerald-400/30 bg-emerald-500/10"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                {validation.missingFields.length > 0 ? "Brief incomplete" : "Brief valid"}
              </h2>
              <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-100">
                Default status: {STATUS_LABELS[validation.defaultStatus]}
              </span>
            </div>
            {validation.missingFields.length > 0 ? (
              <ul className="mt-4 grid gap-2 text-sm text-red-100 sm:grid-cols-2">
                {validation.missingFields.map((field) => (
                  <li key={field} className="rounded-md border border-red-300/20 bg-red-950/30 px-3 py-2 font-mono">
                    {field}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-emerald-100">No missing required fields found.</p>
            )}
          </section>
        ) : (
          <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4">
            <h2 className="text-lg font-semibold text-red-50">{validation.message}</h2>
            {validation.issues && validation.issues.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm text-red-100">
                {validation.issues.map((issue) => (
                  <li key={issue} className="rounded-md border border-red-300/20 bg-red-950/30 px-3 py-2 font-mono">
                    {issue}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )
      ) : null}

      {submitError ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{submitError}</p>
      ) : null}

      {parsedPreview ? (
        <section className="rounded-lg border border-white/10 bg-panel p-4">
          <h2 className="text-lg font-semibold text-white">Parsed preview</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-zinc-500">Artist</dt>
              <dd className="font-medium text-zinc-100">{parsedPreview.campaign.artist || "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Song / release</dt>
              <dd className="font-medium text-zinc-100">{parsedPreview.campaign.release_title || "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Platform</dt>
              <dd className="font-medium text-zinc-100">{parsedPreview.campaign.platform || "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Account</dt>
              <dd className="font-medium text-zinc-100">{parsedPreview.campaign.account || "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Objective</dt>
              <dd className="font-medium text-zinc-100">{parsedPreview.campaign.objective || "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">ACID</dt>
              <dd className="font-medium text-zinc-100">{parsedPreview.campaign.acid || "Unknown"}</dd>
            </div>
          </dl>
          <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-white/10 bg-ink p-4 text-xs leading-6 text-zinc-300">
            {JSON.stringify(parsedPreview, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
