"use client";

import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBriefAction } from "@/app/actions";
import { validateBriefJson, type BriefValidationResult } from "@/lib/brief-schema";

const MAX_JSON_FILE_LENGTH = 250_000;

// The form stays deliberately simple. The JSON still keeps the full data shape,
// but James/Aidan only have to fill the things that matter for building.
type Platform = "" | "Meta" | "TikTok" | "YouTube" | "Other";
type BudgetType = "" | "daily" | "lifetime" | "campaign_total" | "ad_set_level" | "unknown";
type Currency = "" | "GBP" | "EUR" | "USD" | "AUD" | "CAD" | "unknown";
type AssetType = "" | "video" | "image" | "carousel" | "spark_ad" | "unknown";

type WizardAd = {
  id: string;
  label: string;
  asset_type: AssetType;
  asset_links: string;
  destination_url: string;
  copy: string;
  notes: string;
};

type WizardAdSet = {
  id: string;
  label: string;
  notes: string;
  budget_enabled: boolean;
  budget_amount: string;
  budget_type: "" | "daily" | "lifetime" | "campaign_total" | "unknown";
  ads: WizardAd[];
};

type CampaignSetup = {
  artist: string;
  release_title: string;
  platform: Platform;
  account: string;
  acid: string;
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

const STEPS = [
  { number: 1, label: "Campaign", sub: "known stuff" },
  { number: 2, label: "Ad sets", sub: "notes + ads" },
  { number: 3, label: "Review", sub: "missing bits" }
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
    asset_type: "video",
    asset_links: "",
    destination_url: "",
    copy: "",
    notes: ""
  };
}

function newAdSet(label = ""): WizardAdSet {
  return {
    id: uid("adset"),
    label,
    notes: "",
    budget_enabled: false,
    budget_amount: "",
    budget_type: "",
    ads: [newAd("Ad 1")]
  };
}

const EMPTY_SETUP: CampaignSetup = {
  artist: "",
  release_title: "",
  platform: "",
  account: "",
  acid: "",
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
    locations: [],
    age_min: null,
    age_max: null,
    gender: "all",
    placements: [],
    targeting_type: "unknown",
    targeting_details: blankToNull(adSet.notes),
    exclusions: null,
    budget_amount: adSet.budget_enabled ? numberOrNull(adSet.budget_amount) : null,
    budget_type: adSet.budget_enabled ? blankToEnum(adSet.budget_type) : null,
    notes: blankToNull(adSet.notes),
    ads: adSet.ads.map((ad) => ({
      label: blankToNull(ad.label),
      release_title: blankToNull(ad.label || setup.release_title),
      asset_type: blankToEnum(ad.asset_type),
      asset_links: splitList(ad.asset_links),
      post_url: null,
      boost_code: null,
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
      asid: null,
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
      <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#6d5428]">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <span className="mt-1 block text-xs font-semibold text-[#806a42]">{hint}</span> : null}
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
    setMessage("JSON validated. Submit from review, or keep building manually.");
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
    <section className="pixel-window p-4">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block font-mono text-xs font-black uppercase tracking-[0.18em] text-[#33240d]">Optional Claude import</span>
          <span className="mt-1 block text-sm font-medium text-[#6b593a]">Paste JSON only when Claude already made one. Manual builder is the main flow.</span>
        </span>
        <span className="mini-button">{open ? "close" : "open"}</span>
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
            <label className="mini-button cursor-pointer px-4 py-3">
              Import file
              <input type="file" accept=".json,application/json" className="sr-only" onChange={importJsonFile} />
            </label>
          </div>
          {message ? <p className="pixel-alert p-3 text-sm">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function fitAdSetCount(current: WizardAdSet[], count: number): WizardAdSet[] {
  const safeCount = Math.max(1, Math.min(24, count || 1));
  if (safeCount === current.length) return current;
  if (safeCount < current.length) return current.slice(0, safeCount);
  return [
    ...current,
    ...Array.from({ length: safeCount - current.length }, (_, index) => newAdSet(`Ad set ${current.length + index + 1}`))
  ];
}

export function NewBriefForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [setup, setSetup] = useState<CampaignSetup>(EMPTY_SETUP);
  const [adSets, setAdSets] = useState<WizardAdSet[]>([newAdSet("Ad set 1")]);
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
      <div className="pixel-window p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {STEPS.map((item) => (
            <button
              key={item.number}
              type="button"
              onClick={() => setStep(item.number)}
              className={`pixel-tab text-left ${step === item.number ? "pixel-tab-active" : ""}`}
            >
              <span className="font-mono text-xs font-black uppercase tracking-[0.18em]">0{item.number}</span>
              <span className="mt-1 block text-lg font-black">{item.label}</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-[0.12em]">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="animate-rise pixel-window p-4 sm:p-6">
        {step === 1 ? (
          <section className="grid gap-5">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-[#d34f1f]">Step 1</p>
              <h2 className="mt-2 text-3xl font-black text-[#201203]">Campaign setup</h2>
              <p className="mt-2 text-sm font-semibold text-[#6b593a]">Fill the known things. Anything blank stays blank and gets flagged.</p>
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
              <FieldShell label="Account"><TextInput value={setup.account} onChange={(e) => updateSetup("account", e.target.value)} /></FieldShell>
              <FieldShell label="ACID"><TextInput value={setup.acid} onChange={(e) => updateSetup("acid", e.target.value)} /></FieldShell>
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
              <FieldShell label="Budget amount"><TextInput inputMode="decimal" value={setup.budget_amount} onChange={(e) => updateSetup("budget_amount", e.target.value)} /></FieldShell>
              <FieldShell label="Budget type">
                <SelectInput value={setup.budget_type} onChange={(e) => updateSetup("budget_type", e.target.value as BudgetType)}>
                  <option value="">Unknown</option>
                  {BUDGET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectInput>
              </FieldShell>
              <FieldShell label="Currency">
                <SelectInput value={setup.currency} onChange={(e) => updateSetup("currency", e.target.value as Currency)}>
                  <option value="">Unknown</option>
                  {CURRENCY_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectInput>
              </FieldShell>
              <FieldShell label="Start date"><TextInput type="date" value={setup.start_date} onChange={(e) => updateSetup("start_date", e.target.value)} /></FieldShell>
              <FieldShell label="End date"><TextInput type="date" value={setup.end_date} onChange={(e) => updateSetup("end_date", e.target.value)} /></FieldShell>
              <div className="lg:col-span-3"><FieldShell label="Territory summary"><TextInput value={setup.territory_summary} onChange={(e) => updateSetup("territory_summary", e.target.value)} placeholder="UK / FR, NL, BE / global" /></FieldShell></div>
              <div className="lg:col-span-3"><FieldShell label="Campaign notes"><TextArea value={setup.campaign_notes} onChange={(e) => updateSetup("campaign_notes", e.target.value)} placeholder="Any weird instructions, same-as-previous notes, hold notes, etc." /></FieldShell></div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="pixel-card flex items-center gap-3 p-4">
                <input type="checkbox" checked={setup.approval_required} onChange={(e) => updateSetup("approval_required", e.target.checked)} className="h-5 w-5" />
                <span><span className="block font-black text-[#201203]">Approval required</span><span className="text-sm font-semibold text-[#6b593a]">Use when James/JD needs to sign off.</span></span>
              </label>
              <label className="pixel-card flex items-center gap-3 p-4">
                <input type="checkbox" checked={setup.hold_for_james} onChange={(e) => updateSetup("hold_for_james", e.target.checked)} className="h-5 w-5" />
                <span><span className="block font-black text-[#201203]">Hold for James</span><span className="text-sm font-semibold text-[#6b593a]">Defaults the brief to Needs James.</span></span>
              </label>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="grid gap-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-[#d34f1f]">Step 2</p>
                <h2 className="mt-2 text-3xl font-black text-[#201203]">Ad sets + ads</h2>
                <p className="mt-2 text-sm font-semibold text-[#6b593a]">Keep it simple: how many ad sets, what each one does, budget if needed, then the ads underneath.</p>
              </div>
              <FieldShell label="How many ad sets?">
                <TextInput
                  type="number"
                  min={1}
                  max={24}
                  value={adSets.length}
                  onChange={(event) => setAdSets((current) => fitAdSetCount(current, Number(event.target.value)))}
                  className="max-w-32 text-center text-xl font-black"
                />
              </FieldShell>
            </div>

            <div className="grid gap-5">
              {adSets.map((adSet, adSetIndex) => (
                <article key={adSet.id} className="pixel-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#d34f1f]">Ad set {adSetIndex + 1}</p>
                      <h3 className="mt-1 text-2xl font-black text-[#201203]">{adSet.label || `Ad set ${adSetIndex + 1}`}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => duplicateAdSet(adSet)} className="mini-button">Duplicate</button>
                      <button type="button" onClick={() => setAdSets((current) => current.filter((item) => item.id !== adSet.id))} className="mini-button danger">Delete</button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <FieldShell label="Ad set name"><TextInput value={adSet.label} onChange={(e) => updateAdSet(adSet.id, { label: e.target.value })} placeholder="UK prospecting / warm retargeting" /></FieldShell>
                    <div className="lg:col-span-2"><FieldShell label="What does this ad set do / target?" hint="Put locations, age, placements, interest stack, LAL, retargeting notes here."><TextArea value={adSet.notes} onChange={(e) => updateAdSet(adSet.id, { notes: e.target.value })} placeholder="Example: UK only, IG placements, 18-35, Advantage+ off, Stormzy/Skepta stack..." /></FieldShell></div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <label className="pixel-card flex items-center gap-3 p-4">
                      <input type="checkbox" checked={adSet.budget_enabled} onChange={(e) => updateAdSet(adSet.id, { budget_enabled: e.target.checked })} className="h-5 w-5" />
                      <span><span className="block font-black text-[#201203]">Ad set budget?</span><span className="text-sm font-semibold text-[#6b593a]">Only tick if budget is split by ad set.</span></span>
                    </label>
                    {adSet.budget_enabled ? (
                      <>
                        <FieldShell label="Budget amount"><TextInput inputMode="decimal" value={adSet.budget_amount} onChange={(e) => updateAdSet(adSet.id, { budget_amount: e.target.value })} /></FieldShell>
                        <FieldShell label="Budget type">
                          <SelectInput value={adSet.budget_type} onChange={(e) => updateAdSet(adSet.id, { budget_type: e.target.value as WizardAdSet["budget_type"] })}>
                            <option value="">Unknown</option>
                            {AD_SET_BUDGET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                          </SelectInput>
                        </FieldShell>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-6 border-t-4 border-[#201203] pt-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h4 className="font-mono text-sm font-black uppercase tracking-[0.18em] text-[#201203]">Ads underneath</h4>
                      <button type="button" onClick={() => updateAdSet(adSet.id, { ads: [...adSet.ads, newAd(`Ad ${adSet.ads.length + 1}`)] })} className="pixel-button px-4 py-3 text-xs">
                        + Add ad
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {adSet.ads.map((ad, adIndex) => (
                        <article key={ad.id} className="pixel-ad-card p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-black text-[#201203]">Ad {adIndex + 1}: {ad.label || "Untitled ad"}</p>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => updateAdSet(adSet.id, { ads: [...adSet.ads, { ...ad, id: uid("ad"), label: `${ad.label || "Ad"} copy` }] })} className="mini-button">Duplicate</button>
                              <button type="button" onClick={() => updateAdSet(adSet.id, { ads: adSet.ads.filter((item) => item.id !== ad.id) })} className="mini-button danger">Delete</button>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-4 lg:grid-cols-3">
                            <FieldShell label="Ad / asset name"><TextInput value={ad.label} onChange={(e) => updateAd(adSet.id, ad.id, { label: e.target.value })} placeholder="Geekin 9x16 / Spark code 1" /></FieldShell>
                            <FieldShell label="Asset type">
                              <SelectInput value={ad.asset_type} onChange={(e) => updateAd(adSet.id, ad.id, { asset_type: e.target.value as AssetType })}>
                                <option value="">Unknown</option>
                                {ASSET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                              </SelectInput>
                            </FieldShell>
                            <FieldShell label="Destination link"><TextInput value={ad.destination_url} onChange={(e) => updateAd(adSet.id, ad.id, { destination_url: e.target.value })} placeholder="song.so / Linkfire / post URL if needed" /></FieldShell>
                            <div className="lg:col-span-2"><FieldShell label="Asset links / post URLs / boost codes" hint="One per line is easiest."><TextArea value={ad.asset_links} onChange={(e) => updateAd(adSet.id, ad.id, { asset_links: e.target.value })} /></FieldShell></div>
                            <FieldShell label="Text / copy"><TextArea value={ad.copy} onChange={(e) => updateAd(adSet.id, ad.id, { copy: e.target.value })} /></FieldShell>
                            <div className="lg:col-span-3"><FieldShell label="Tiny ad note"><TextInput value={ad.notes} onChange={(e) => updateAd(adSet.id, ad.id, { notes: e.target.value })} placeholder="Use the FR video too / pick 4x5 cut / A-B test" /></FieldShell></div>
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
              <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-[#d34f1f]">Step 3</p>
              <h2 className="mt-2 text-3xl font-black text-[#201203]">Review</h2>
              <p className="mt-2 text-sm font-semibold text-[#6b593a]">Submit the brief, or jump back and fill the missing bits.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="pixel-stat p-4"><span>Artist</span><strong>{setup.artist || "Unknown"}</strong></div>
              <div className="pixel-stat p-4"><span>Platform</span><strong>{setup.platform || "Unknown"}</strong></div>
              <div className="pixel-stat p-4"><span>Ad sets</span><strong>{adSets.length}</strong></div>
              <div className="pixel-stat p-4"><span>Ads</span><strong>{adSets.reduce((total, adSet) => total + adSet.ads.length, 0)}</strong></div>
            </div>

            <div className="pixel-card p-4">
              <h3 className="font-mono text-sm font-black uppercase tracking-[0.18em] text-[#201203]">Missing info</h3>
              {missingFields.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingFields.map((field) => (
                    <span key={field} className="pixel-missing px-3 py-2 font-mono text-xs font-black">{field}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 pixel-ready p-3 text-sm font-black">No missing required fields.</p>
              )}
            </div>

            <div className="pixel-card p-4">
              <h3 className="font-mono text-sm font-black uppercase tracking-[0.18em] text-[#201203]">Build checklist preview</h3>
              <div className="mt-3 grid gap-2 text-sm font-bold text-[#33240d]">
                <p>□ Confirm campaign setup, account, pixel and budget.</p>
                <p>□ Build {adSets.length} ad set{adSets.length === 1 ? "" : "s"}.</p>
                <p>□ Add ads underneath the correct parent ad set.</p>
                <p>□ Check each asset link, destination link and copy line.</p>
                <p>□ Screenshot/send to James if anything is missing or unclear.</p>
              </div>
            </div>

            <JsonImportPanel
              onImported={(json, validation) => {
                setImportedJson(json);
                setImportedValidation(validation);
              }}
            />

            {submitError ? <p className="pixel-alert p-3 text-sm font-bold">{submitError}</p> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(2)} className="mini-button px-4 py-3">Back</button>
              <button type="button" onClick={submitBrief} disabled={isPending} className="pixel-button px-6 py-4 text-sm disabled:opacity-60">
                {isPending ? "Saving..." : importedJson ? "Submit imported JSON" : "Create brief"}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {step < 3 ? (
        <div className="flex justify-end">
          <button type="button" onClick={() => setStep((current) => Math.min(3, current + 1))} className="pixel-button px-6 py-4 text-sm">
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
