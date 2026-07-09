"use client";

import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBriefAction } from "@/app/actions";
import { validateBriefJson, type BriefValidationResult } from "@/lib/brief-schema";
import { STATUS_LABELS } from "@/lib/status";

const MAX_JSON_FILE_LENGTH = 250_000;

type Platform = "" | "Meta" | "TikTok" | "YouTube" | "Other";
type BudgetType = "" | "daily" | "lifetime" | "campaign_total" | "ad_set_level" | "unknown";
type Currency = "" | "GBP" | "EUR" | "USD" | "AUD" | "CAD" | "unknown";
type Gender = "all" | "male" | "female" | "unknown";
type TargetingType = "broad" | "interest" | "lookalike" | "retargeting" | "advantage_plus" | "unknown";
type AssetType = "" | "video" | "image" | "carousel" | "spark_ad" | "unknown";

type WizardAd = {
  id: string;
  label: string;
  release_title: string;
  asset_type: AssetType;
  asset_links: string;
  post_url: string;
  boost_code: string;
  destination_url: string;
  copy: string;
  notes: string;
};

type WizardAdSet = {
  id: string;
  label: string;
  locations: string;
  age_min: string;
  age_max: string;
  gender: Gender;
  placements: string;
  budget_amount: string;
  budget_type: "" | "daily" | "lifetime" | "campaign_total" | "unknown";
  targeting_type: TargetingType;
  targeting_details: string;
  exclusions: string;
  notes: string;
  ads: WizardAd[];
};

type CampaignSetup = {
  artist: string;
  release_title: string;
  platform: Platform;
  account: string;
  acid: string;
  asid: string;
  objective: string;
  campaign_type: string;
  conversion_location: string;
  optimisation_event: string;
  pixel: string;
  budget_type: BudgetType;
  budget_amount: string;
  currency: Currency;
  start_date: string;
  end_date: string;
  territory_summary: string;
  campaign_notes: string;
  approval_required: boolean;
  hold_for_james: boolean;
};

const PLATFORM_OPTIONS = ["Meta", "TikTok", "YouTube", "Other"] as const;
const CURRENCY_OPTIONS = ["GBP", "EUR", "USD", "AUD", "CAD", "unknown"] as const;
const BUDGET_OPTIONS = ["daily", "lifetime", "campaign_total", "ad_set_level", "unknown"] as const;
const AD_SET_BUDGET_OPTIONS = ["daily", "lifetime", "campaign_total", "unknown"] as const;
const TARGETING_OPTIONS = ["broad", "interest", "lookalike", "retargeting", "advantage_plus", "unknown"] as const;
const GENDER_OPTIONS = ["all", "male", "female", "unknown"] as const;
const ASSET_OPTIONS = ["video", "image", "carousel", "spark_ad", "unknown"] as const;

const OBJECTIVE_PRESETS = [
  "Streaming Conversions",
  "Sales",
  "Traffic / LPV",
  "Video Views / ThruPlay",
  "Awareness",
  "Followers",
  "Engagement"
];

const CAMPAIGN_TYPE_PRESETS = ["Engagement", "Sales", "Traffic", "Video Views", "Boost", "Awareness", "Other"];
const CONVERSION_LOCATION_PRESETS = ["Website", "Instagram profile", "TikTok profile", "App", "None", "Unknown"];
const OPTIMISATION_PRESETS = ["ViewContent", "FeatureFM_click", "Purchase", "Landing Page View", "ThruPlay", "15-sec engaged view", "Unknown"];
const PLACEMENT_PRESETS = ["Instagram", "Facebook", "Instagram, Facebook", "TikTok", "YouTube", "Manual notes"];
const STEPS = [
  { number: 1, label: "Campaign setup", sub: "known details" },
  { number: 2, label: "Ad sets + ads", sub: "nested build" },
  { number: 3, label: "Review", sub: "missing + checklist" }
] as const;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function blankToNull(value: string | undefined): string | null {
  const clean = (value || "").trim();
  return clean.length > 0 ? clean : null;
}

function blankToEnum<T extends string>(value: T | ""): T | null {
  return value === "" ? null : value;
}

function numberOrNull(value: string): number | null {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function newAd(label = ""): WizardAd {
  return {
    id: uid("ad"),
    label,
    release_title: "",
    asset_type: "video",
    asset_links: "",
    post_url: "",
    boost_code: "",
    destination_url: "",
    copy: "",
    notes: ""
  };
}

function newAdSet(label = ""): WizardAdSet {
  return {
    id: uid("adset"),
    label,
    locations: "",
    age_min: "",
    age_max: "",
    gender: "all",
    placements: "Instagram",
    budget_amount: "",
    budget_type: "",
    targeting_type: "unknown",
    targeting_details: "",
    exclusions: "",
    notes: "",
    ads: [newAd()]
  };
}

const EMPTY_SETUP: CampaignSetup = {
  artist: "",
  release_title: "",
  platform: "",
  account: "",
  acid: "",
  asid: "",
  objective: "",
  campaign_type: "",
  conversion_location: "",
  optimisation_event: "",
  pixel: "",
  budget_type: "",
  budget_amount: "",
  currency: "GBP",
  start_date: "",
  end_date: "",
  territory_summary: "",
  campaign_notes: "",
  approval_required: false,
  hold_for_james: false
};

function buildBrief(setup: CampaignSetup, adSets: WizardAdSet[]) {
  const nestedAdSets = adSets.map((adSet) => ({
    label: blankToNull(adSet.label),
    locations: splitList(adSet.locations),
    age_min: numberOrNull(adSet.age_min),
    age_max: numberOrNull(adSet.age_max),
    gender: adSet.gender,
    placements: splitList(adSet.placements),
    targeting_type: adSet.targeting_type,
    targeting_details: blankToNull(adSet.targeting_details),
    exclusions: blankToNull(adSet.exclusions),
    budget_amount: numberOrNull(adSet.budget_amount),
    budget_type: blankToEnum(adSet.budget_type),
    notes: blankToNull(adSet.notes),
    ads: adSet.ads.map((ad) => ({
      label: blankToNull(ad.label),
      release_title: blankToNull(ad.release_title),
      asset_type: blankToEnum(ad.asset_type),
      asset_links: splitList(ad.asset_links),
      post_url: blankToNull(ad.post_url),
      boost_code: blankToNull(ad.boost_code),
      destination_url: blankToNull(ad.destination_url),
      copy: blankToNull(ad.copy),
      notes: blankToNull(ad.notes)
    }))
  }));

  const flatAds = nestedAdSets.flatMap((adSet) => adSet.ads);

  return {
    brief_version: "JDW_CAMPAIGN_BRIEF_V1",
    source: {
      source_type: "quick_note",
      source_title: "Manual brief builder",
      source_date: null,
      original_item_label: null,
      source_notes: []
    },
    build: {
      action: setup.hold_for_james ? "hold" : "new_campaign",
      existing_campaign_name: null,
      approval_required: setup.approval_required || setup.hold_for_james,
      launch_instruction: setup.hold_for_james ? "Hold for James confirmation before launch." : null,
      priority: setup.hold_for_james ? "hold" : "normal"
    },
    campaign: {
      artist: blankToNull(setup.artist),
      release_title: blankToNull(setup.release_title),
      acid: blankToNull(setup.acid),
      asid: blankToNull(setup.asid),
      platform: blankToEnum(setup.platform),
      account: blankToNull(setup.account),
      objective: blankToNull(setup.objective),
      campaign_type: blankToNull(setup.campaign_type),
      conversion_location: blankToNull(setup.conversion_location),
      optimisation_event: blankToNull(setup.optimisation_event),
      pixel: blankToNull(setup.pixel),
      territory_summary: blankToNull(setup.territory_summary),
      start_date: blankToNull(setup.start_date),
      end_date: blankToNull(setup.end_date),
      campaign_notes: blankToNull(setup.campaign_notes)
    },
    budget: {
      type: blankToEnum(setup.budget_type),
      amount: numberOrNull(setup.budget_amount),
      currency: blankToEnum(setup.currency),
      notes: null
    },
    ad_sets: nestedAdSets,
    ads: flatAds,
    special_notes: setup.campaign_notes.trim() ? [setup.campaign_notes.trim()] : [],
    missing_required_fields: []
  };
}

function FieldShell({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className || ""}`} />;
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field min-h-24 resize-y ${props.className || ""}`} />;
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className || ""}`} />;
}

function DataList({ id, options }: { id: string; options: string[] }) {
  return (
    <datalist id={id}>
      {options.map((option) => (
        <option key={option} value={option} />
      ))}
    </datalist>
  );
}

function JsonImportPanel({ onImported }: { onImported: (json: string, validation: BriefValidationResult) => void }) {
  const [open, setOpen] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function validateAndImport(value: string) {
    const validation = validateBriefJson(value);
    if (!validation.ok) {
      setMessage(validation.message);
      return;
    }
    onImported(value, validation);
    setMessage("JSON validated. Submit it from the review step or keep using the manual builder.");
  }

  async function importJsonFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_JSON_FILE_LENGTH) {
      setMessage("JSON file is too large.");
      return;
    }
    const importedJson = await file.text();
    setRawJson(importedJson);
    validateAndImport(importedJson);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Optional Claude import</span>
          <span className="mt-1 block text-sm text-zinc-400">Paste JSON only if Claude already made one. The form builder is the main flow.</span>
        </span>
        <span className="rounded-lg border border-white/10 px-3 py-2 font-mono text-xs text-zinc-300">{open ? "close" : "open"}</span>
      </button>
      {open ? (
        <div className="mt-4 grid gap-3">
          <textarea
            value={rawJson}
            onChange={(event) => setRawJson(event.target.value)}
            className="field min-h-52 font-mono text-xs"
            spellCheck={false}
            placeholder='{"brief_version":"JDW_CAMPAIGN_BRIEF_V1", ...}'
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => validateAndImport(rawJson)} className="pixel-button px-4 py-3 text-xs">
              Validate JSON
            </button>
            <label className="focus-ring cursor-pointer rounded-xl border border-white/10 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-zinc-200 hover:bg-white/10">
              Import file
              <input type="file" accept=".json,application/json" className="sr-only" onChange={importJsonFile} />
            </label>
          </div>
          {message ? <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export function NewBriefForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [setup, setSetup] = useState<CampaignSetup>(EMPTY_SETUP);
  const [adSets, setAdSets] = useState<WizardAdSet[]>([newAdSet("Main ad set")]);
  const [importedJson, setImportedJson] = useState<string | null>(null);
  const [importedValidation, setImportedValidation] = useState<BriefValidationResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const manualJson = useMemo(() => JSON.stringify(buildBrief(setup, adSets), null, 2), [setup, adSets]);
  const manualValidation = useMemo(() => validateBriefJson(manualJson), [manualJson]);
  const activeValidation = importedValidation?.ok ? importedValidation : manualValidation;
  const missingFields = activeValidation.ok
    ? activeValidation.briefs.reduce((fields, brief) => [...fields, ...brief.missingFields], [] as string[])
    : [];

  const activeJson = importedValidation?.ok && importedJson ? importedJson : manualJson;

  function updateSetup<K extends keyof CampaignSetup>(key: K, value: CampaignSetup[K]) {
    setImportedJson(null);
    setImportedValidation(null);
    setSetup((current) => ({ ...current, [key]: value }));
  }

  function updateAdSet(id: string, changes: Partial<WizardAdSet>) {
    setImportedJson(null);
    setImportedValidation(null);
    setAdSets((current) => current.map((adSet) => (adSet.id === id ? { ...adSet, ...changes } : adSet)));
  }

  function updateAd(adSetId: string, adId: string, changes: Partial<WizardAd>) {
    setImportedJson(null);
    setImportedValidation(null);
    setAdSets((current) =>
      current.map((adSet) =>
        adSet.id === adSetId
          ? { ...adSet, ads: adSet.ads.map((ad) => (ad.id === adId ? { ...ad, ...changes } : ad)) }
          : adSet
      )
    );
  }

  function duplicateAdSet(adSet: WizardAdSet) {
    setAdSets((current) => [
      ...current,
      { ...adSet, id: uid("adset"), label: `${adSet.label || "Ad set"} copy`, ads: adSet.ads.map((ad) => ({ ...ad, id: uid("ad") })) }
    ]);
  }

  function submitBrief() {
    setSubmitError(null);
    const validation = validateBriefJson(activeJson);
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    startTransition(async () => {
      const result = await submitBriefAction(activeJson);
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      router.push(result.ids.length === 1 ? `/brief/${result.id}` : "/inbox");
    });
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-cyan-300/20 bg-panel/75 p-3 shadow-neon backdrop-blur-xl">
        <div className="grid gap-2 sm:grid-cols-3">
          {STEPS.map((item) => (
            <button
              key={item.number}
              type="button"
              onClick={() => setStep(item.number)}
              className={`rounded-xl border px-4 py-3 text-left transition duration-200 ${
                step === item.number
                  ? "border-cyan-300/40 bg-cyan-300/15 text-white shadow-[0_0_24px_rgba(34,211,238,.12)]"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}
            >
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">0{item.number}</span>
              <span className="mt-1 block font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="animate-rise rounded-2xl border border-white/10 bg-panel/82 p-4 shadow-glow backdrop-blur-xl sm:p-6">
        {step === 1 ? (
          <section className="grid gap-5">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Step 1</p>
              <h2 className="mt-2 text-2xl font-black text-white">Campaign setup</h2>
              <p className="mt-2 text-sm text-zinc-400">Fill what James knows. Blank fields stay blank and appear as missing info.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FieldShell label="Artist"><TextInput value={setup.artist} onChange={(e) => updateSetup("artist", e.target.value)} /></FieldShell>
              <FieldShell label="Release / project"><TextInput value={setup.release_title} onChange={(e) => updateSetup("release_title", e.target.value)} /></FieldShell>
              <FieldShell label="Platform">
                <SelectInput value={setup.platform} onChange={(e) => updateSetup("platform", e.target.value as Platform)}>
                  <option value="">Unknown</option>
                  {PLATFORM_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectInput>
              </FieldShell>
              <FieldShell label="Account"><TextInput value={setup.account} onChange={(e) => updateSetup("account", e.target.value)} placeholder="Atlantic Records UK" /></FieldShell>
              <FieldShell label="ACID"><TextInput value={setup.acid} onChange={(e) => updateSetup("acid", e.target.value)} /></FieldShell>
              <FieldShell label="ASID"><TextInput value={setup.asid} onChange={(e) => updateSetup("asid", e.target.value)} /></FieldShell>
              <FieldShell label="Objective">
                <TextInput list="objective-presets" value={setup.objective} onChange={(e) => updateSetup("objective", e.target.value)} />
                <DataList id="objective-presets" options={OBJECTIVE_PRESETS} />
              </FieldShell>
              <FieldShell label="Campaign type">
                <TextInput list="campaign-type-presets" value={setup.campaign_type} onChange={(e) => updateSetup("campaign_type", e.target.value)} />
                <DataList id="campaign-type-presets" options={CAMPAIGN_TYPE_PRESETS} />
              </FieldShell>
              <FieldShell label="Conversion location">
                <TextInput list="conversion-presets" value={setup.conversion_location} onChange={(e) => updateSetup("conversion_location", e.target.value)} />
                <DataList id="conversion-presets" options={CONVERSION_LOCATION_PRESETS} />
              </FieldShell>
              <FieldShell label="Optimisation event">
                <TextInput list="optimisation-presets" value={setup.optimisation_event} onChange={(e) => updateSetup("optimisation_event", e.target.value)} />
                <DataList id="optimisation-presets" options={OPTIMISATION_PRESETS} />
              </FieldShell>
              <FieldShell label="Pixel"><TextInput value={setup.pixel} onChange={(e) => updateSetup("pixel", e.target.value)} /></FieldShell>
              <FieldShell label="Territory summary"><TextInput value={setup.territory_summary} onChange={(e) => updateSetup("territory_summary", e.target.value)} placeholder="UK / International / DACH" /></FieldShell>
              <FieldShell label="Budget type">
                <SelectInput value={setup.budget_type} onChange={(e) => updateSetup("budget_type", e.target.value as BudgetType)}>
                  <option value="">Unknown</option>
                  {BUDGET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectInput>
              </FieldShell>
              <FieldShell label="Budget amount"><TextInput inputMode="decimal" value={setup.budget_amount} onChange={(e) => updateSetup("budget_amount", e.target.value)} /></FieldShell>
              <FieldShell label="Currency">
                <SelectInput value={setup.currency} onChange={(e) => updateSetup("currency", e.target.value as Currency)}>
                  <option value="">Unknown</option>
                  {CURRENCY_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectInput>
              </FieldShell>
              <FieldShell label="Start date"><TextInput type="date" value={setup.start_date} onChange={(e) => updateSetup("start_date", e.target.value)} /></FieldShell>
              <FieldShell label="End date"><TextInput type="date" value={setup.end_date} onChange={(e) => updateSetup("end_date", e.target.value)} /></FieldShell>
            </div>

            <FieldShell label="Campaign notes">
              <TextArea value={setup.campaign_notes} onChange={(e) => updateSetup("campaign_notes", e.target.value)} placeholder="Same as previous, waiting on link, budget split notes, launch instructions..." />
            </FieldShell>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <input type="checkbox" checked={setup.approval_required} onChange={(e) => updateSetup("approval_required", e.target.checked)} className="h-5 w-5 rounded border-white/20 bg-ink text-cyan-300" />
                <span><span className="block font-semibold text-white">Approval required</span><span className="text-sm text-zinc-400">Use when James/JD needs to sign off.</span></span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <input type="checkbox" checked={setup.hold_for_james} onChange={(e) => updateSetup("hold_for_james", e.target.checked)} className="h-5 w-5 rounded border-white/20 bg-ink text-cyan-300" />
                <span><span className="block font-semibold text-white">Hold for James</span><span className="text-sm text-zinc-400">Defaults the brief to Needs James if complete.</span></span>
              </label>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="grid gap-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Step 2</p>
                <h2 className="mt-2 text-2xl font-black text-white">Ad sets + nested ads</h2>
                <p className="mt-2 text-sm text-zinc-400">Each ad sits directly under its parent ad set, like Ads Manager.</p>
              </div>
              <button type="button" onClick={() => setAdSets((current) => [...current, newAdSet(`Ad set ${current.length + 1}`)])} className="pixel-button px-4 py-3 text-xs">
                + Add ad set
              </button>
            </div>

            <div className="grid gap-5">
              {adSets.map((adSet, adSetIndex) => (
                <article key={adSet.id} className="rounded-2xl border border-cyan-300/15 bg-black/25 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.03)] sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Ad set {adSetIndex + 1}</p>
                      <h3 className="mt-1 text-xl font-black text-white">{adSet.label || "Untitled ad set"}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => duplicateAdSet(adSet)} className="mini-button">Duplicate</button>
                      <button type="button" onClick={() => setAdSets((current) => current.filter((item) => item.id !== adSet.id))} className="mini-button border-red-400/30 text-red-100">Delete</button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <FieldShell label="Label"><TextInput value={adSet.label} onChange={(e) => updateAdSet(adSet.id, { label: e.target.value })} /></FieldShell>
                    <FieldShell label="Locations" hint="Comma or line separated"><TextInput value={adSet.locations} onChange={(e) => updateAdSet(adSet.id, { locations: e.target.value })} placeholder="UK, FR, DE" /></FieldShell>
                    <FieldShell label="Placements" hint="Comma or line separated">
                      <TextInput list="placement-presets" value={adSet.placements} onChange={(e) => updateAdSet(adSet.id, { placements: e.target.value })} />
                      <DataList id="placement-presets" options={PLACEMENT_PRESETS} />
                    </FieldShell>
                    <FieldShell label="Age min"><TextInput inputMode="numeric" value={adSet.age_min} onChange={(e) => updateAdSet(adSet.id, { age_min: e.target.value })} /></FieldShell>
                    <FieldShell label="Age max"><TextInput inputMode="numeric" value={adSet.age_max} onChange={(e) => updateAdSet(adSet.id, { age_max: e.target.value })} /></FieldShell>
                    <FieldShell label="Gender">
                      <SelectInput value={adSet.gender} onChange={(e) => updateAdSet(adSet.id, { gender: e.target.value as Gender })}>
                        {GENDER_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                      </SelectInput>
                    </FieldShell>
                    <FieldShell label="Ad set budget"><TextInput inputMode="decimal" value={adSet.budget_amount} onChange={(e) => updateAdSet(adSet.id, { budget_amount: e.target.value })} /></FieldShell>
                    <FieldShell label="Budget type">
                      <SelectInput value={adSet.budget_type} onChange={(e) => updateAdSet(adSet.id, { budget_type: e.target.value as WizardAdSet["budget_type"] })}>
                        <option value="">Campaign level / unknown</option>
                        {AD_SET_BUDGET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                      </SelectInput>
                    </FieldShell>
                    <FieldShell label="Targeting type">
                      <SelectInput value={adSet.targeting_type} onChange={(e) => updateAdSet(adSet.id, { targeting_type: e.target.value as TargetingType })}>
                        {TARGETING_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                      </SelectInput>
                    </FieldShell>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2"><FieldShell label="Targeting notes"><TextArea value={adSet.targeting_details} onChange={(e) => updateAdSet(adSet.id, { targeting_details: e.target.value })} placeholder="Stormzy, Skepta, no expansion, warm engagers..." /></FieldShell></div>
                    <FieldShell label="Exclusions"><TextArea value={adSet.exclusions} onChange={(e) => updateAdSet(adSet.id, { exclusions: e.target.value })} /></FieldShell>
                    <div className="md:col-span-3"><FieldShell label="Ad set notes"><TextArea value={adSet.notes} onChange={(e) => updateAdSet(adSet.id, { notes: e.target.value })} /></FieldShell></div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h4 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-white">Ads inside this ad set</h4>
                      <button type="button" onClick={() => updateAdSet(adSet.id, { ads: [...adSet.ads, newAd(`Ad ${adSet.ads.length + 1}`)] })} className="mini-button border-lime-300/30 text-lime-100">
                        + Add ad
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {adSet.ads.map((ad, adIndex) => (
                        <article key={ad.id} className="rounded-xl border border-white/10 bg-ink/65 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold text-white">Ad {adIndex + 1}: {ad.label || "Untitled ad"}</p>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => updateAdSet(adSet.id, { ads: [...adSet.ads, { ...ad, id: uid("ad"), label: `${ad.label || "Ad"} copy` }] })} className="mini-button">Duplicate</button>
                              <button type="button" onClick={() => updateAdSet(adSet.id, { ads: adSet.ads.filter((item) => item.id !== ad.id) })} className="mini-button border-red-400/30 text-red-100">Delete</button>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <FieldShell label="Ad label"><TextInput value={ad.label} onChange={(e) => updateAd(adSet.id, ad.id, { label: e.target.value })} /></FieldShell>
                            <FieldShell label="Song / release"><TextInput value={ad.release_title} onChange={(e) => updateAd(adSet.id, ad.id, { release_title: e.target.value })} /></FieldShell>
                            <FieldShell label="Asset type">
                              <SelectInput value={ad.asset_type} onChange={(e) => updateAd(adSet.id, ad.id, { asset_type: e.target.value as AssetType })}>
                                <option value="">Unknown</option>
                                {ASSET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                              </SelectInput>
                            </FieldShell>
                            <FieldShell label="Destination URL"><TextInput value={ad.destination_url} onChange={(e) => updateAd(adSet.id, ad.id, { destination_url: e.target.value })} /></FieldShell>
                            <FieldShell label="Post URL"><TextInput value={ad.post_url} onChange={(e) => updateAd(adSet.id, ad.id, { post_url: e.target.value })} /></FieldShell>
                            <FieldShell label="Spark / boost code"><TextInput value={ad.boost_code} onChange={(e) => updateAd(adSet.id, ad.id, { boost_code: e.target.value })} /></FieldShell>
                            <div className="lg:col-span-2"><FieldShell label="Asset links" hint="One per line, or comma separated"><TextArea value={ad.asset_links} onChange={(e) => updateAd(adSet.id, ad.id, { asset_links: e.target.value })} /></FieldShell></div>
                            <FieldShell label="Copy"><TextArea value={ad.copy} onChange={(e) => updateAd(adSet.id, ad.id, { copy: e.target.value })} /></FieldShell>
                            <div className="lg:col-span-3"><FieldShell label="Ad notes"><TextArea value={ad.notes} onChange={(e) => updateAd(adSet.id, ad.id, { notes: e.target.value })} /></FieldShell></div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="grid gap-5">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Step 3</p>
              <h2 className="mt-2 text-2xl font-black text-white">Review + build checklist</h2>
              <p className="mt-2 text-sm text-zinc-400">Check missing info before it goes into the inbox.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 lg:col-span-2">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Summary</p>
                <h3 className="mt-2 text-2xl font-black text-white">{setup.artist || "Untitled artist"}</h3>
                <p className="mt-1 text-zinc-300">{setup.release_title || "Untitled release"}</p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p><span className="block text-zinc-500">Platform</span><span className="font-semibold text-zinc-100">{setup.platform || "Unknown"}</span></p>
                  <p><span className="block text-zinc-500">Objective</span><span className="font-semibold text-zinc-100">{setup.objective || "Unknown"}</span></p>
                  <p><span className="block text-zinc-500">Ad sets</span><span className="font-semibold text-zinc-100">{adSets.length}</span></p>
                  <p><span className="block text-zinc-500">Ads</span><span className="font-semibold text-zinc-100">{adSets.reduce((count, adSet) => count + adSet.ads.length, 0)}</span></p>
                </div>
              </div>
              <div className={`rounded-2xl border p-4 ${missingFields.length > 0 ? "border-red-400/30 bg-red-500/10" : "border-lime-300/30 bg-lime-300/10"}`}>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Validation</p>
                <p className="mt-2 text-3xl font-black text-white">{missingFields.length}</p>
                <p className="text-sm text-zinc-300">missing required fields</p>
                {activeValidation.ok ? (
                  <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
                    Status after save: {STATUS_LABELS[activeValidation.briefs[0].defaultStatus]}
                  </p>
                ) : null}
              </div>
            </div>

            {missingFields.length > 0 ? (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4">
                <h3 className="font-semibold text-red-100">Missing info</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {missingFields.map((field) => (
                    <span key={field} className="rounded-lg border border-red-400/20 bg-black/20 px-3 py-2 font-mono text-xs text-red-100">{field}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-lime-300/25 bg-lime-300/10 p-4 text-lime-100">Looks ready. Save it to the inbox and build from the checklist.</div>
            )}

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <h3 className="font-semibold text-white">Build checklist preview</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {["Confirm account", "Confirm budget", "Confirm pixel/event", "Build campaign", "Add ad sets", "Add ads under parent ad sets", "Check links/copy", "Send screenshot if unclear"].map((item) => (
                  <span key={item} className="rounded-lg border border-white/10 bg-ink/60 px-3 py-2 text-sm text-zinc-200">□ {item}</span>
                ))}
              </div>
            </div>

            <JsonImportPanel onImported={(json, validation) => { setImportedJson(json); setImportedValidation(validation); }} />

            {submitError ? <p className="rounded-xl border border-red-400/30 bg-red-500/12 p-4 text-red-100">{submitError}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(2)} className="mini-button px-4 py-3">Back to ad sets</button>
              <button type="button" onClick={submitBrief} disabled={isPending} className="pixel-button px-5 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                {isPending ? "Saving..." : "Save brief to inbox"}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))} className="mini-button px-4 py-3 disabled:cursor-not-allowed disabled:opacity-40">
          Previous
        </button>
        <button type="button" disabled={step === 3} onClick={() => setStep((current) => Math.min(3, current + 1))} className="pixel-button px-4 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-40">
          Next step
        </button>
      </div>
    </div>
  );
}
