"use client";

import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBriefAction, updateBriefAction } from "@/app/actions";
import { validateBriefJson, type BriefValidationResult, type JDWCampaignBrief } from "@/lib/brief-schema";
import { BriefFunnelView } from "@/components/BriefFunnelView";

const MAX_JSON_FILE_LENGTH = 250_000;

type Platform = "" | "Meta" | "TikTok" | "YouTube" | "Other";
type BudgetType = "" | "daily" | "lifetime" | "campaign_total" | "ad_set_level" | "unknown";
type Currency = "" | "GBP" | "EUR" | "USD" | "AUD" | "CAD" | "unknown";
type AssetType = "" | "video" | "image" | "carousel" | "spark_ad" | "unknown";

type WizardAdSet = {
  id: string;
  label: string;
  notes: string;
  budget_enabled: boolean;
  budget_amount: string;
  budget_type: "" | "daily" | "lifetime" | "campaign_total" | "unknown";
};

type WizardAd = {
  id: string;
  label: string;
  asset_type: AssetType;
  asset_links: string;
  destination_url: string;
  copy: string;
  notes: string;
  assignedAdSetIds: string[];
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
};

type NewBriefFormProps = {
  initialBrief?: JDWCampaignBrief;
  briefId?: string;
  savedArtists?: string[];
  savedProjects?: string[];
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

const SLIDES = [
  { label: "Artist", hint: "Who is this for?" },
  { label: "Project", hint: "Track / tour / release" },
  { label: "Platform", hint: "Meta or TikTok" },
  { label: "Account", hint: "Ad account + ACID" },
  { label: "Objective", hint: "What are we buying?" },
  { label: "Pixel", hint: "Only if relevant" },
  { label: "Budget", hint: "Money + dates" },
  { label: "Notes", hint: "Anything James said" },
  { label: "Ad sets", hint: "How many audiences?" },
  { label: "Ad details", hint: "What each one targets" },
  { label: "Ads", hint: "Assets + copy" },
  { label: "Review", hint: "Save draft" }
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

function newAdSet(label = ""): WizardAdSet {
  return {
    id: uid("adset"),
    label,
    notes: "",
    budget_enabled: false,
    budget_amount: "",
    budget_type: ""
  };
}

function newAd(label = "", adSetIds: string[] = []): WizardAd {
  return {
    id: uid("ad"),
    label,
    asset_type: "video",
    asset_links: "",
    destination_url: "",
    copy: "",
    notes: "",
    assignedAdSetIds: adSetIds
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
  campaign_notes: ""
};

function adToJson(ad: WizardAd, setup: CampaignSetup) {
  return {
    label: blankToNull(ad.label),
    release_title: blankToNull(ad.label || setup.release_title),
    asset_type: blankToEnum(ad.asset_type),
    asset_links: splitList(ad.asset_links),
    post_url: null,
    boost_code: null,
    destination_url: blankToNull(ad.destination_url),
    copy: blankToNull(ad.copy),
    notes: blankToNull(ad.notes)
  };
}

function buildBrief(setup: CampaignSetup, adSets: WizardAdSet[], ads: WizardAd[]) {
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
    ads: ads.filter((ad) => ad.assignedAdSetIds.includes(adSet.id)).map((ad) => adToJson(ad, setup))
  }));

  const flatAds = ads.map((ad) => adToJson(ad, setup));

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
      action: "new_campaign",
      existing_campaign_name: null,
      approval_required: null,
      launch_instruction: null,
      priority: "normal"
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
      <span className="pixel-label">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <span className="mt-1 block text-xs font-semibold pixel-muted">{hint}</span> : null}
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
    setMessage("JSON validated. Save it from this review screen.");
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
    <section className="pixel-card p-4">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="pixel-label block">Optional Claude import</span>
          <span className="mt-1 block text-sm font-medium pixel-muted">Manual build is the main flow. JSON paste is only a shortcut.</span>
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
            <button type="button" onClick={() => validateAndImport(rawJson)} className="pixel-button text-xs">
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

function briefToBuilderState(brief?: JDWCampaignBrief): { setup: CampaignSetup; adSets: WizardAdSet[]; ads: WizardAd[] } {
  if (!brief) {
    const firstAdSet = newAdSet("Ad set 1");
    return { setup: EMPTY_SETUP, adSets: [firstAdSet], ads: [newAd("Ad 1", [firstAdSet.id])] };
  }

  const setup: CampaignSetup = {
    artist: brief.campaign.artist || "",
    release_title: brief.campaign.release_title || "",
    platform: (brief.campaign.platform || "") as Platform,
    account: brief.campaign.account || "",
    acid: brief.campaign.acid || "",
    objective: brief.campaign.objective || "",
    campaign_type: brief.campaign.campaign_type || "",
    conversion_location: brief.campaign.conversion_location || "",
    optimisation_event: brief.campaign.optimisation_event || "",
    pixel: brief.campaign.pixel || "",
    budget_type: (brief.budget.type || "") as BudgetType,
    budget_amount: brief.budget.amount === null ? "" : String(brief.budget.amount),
    currency: (brief.budget.currency || "") as Currency,
    start_date: brief.campaign.start_date || "",
    end_date: brief.campaign.end_date || "",
    territory_summary: brief.campaign.territory_summary || "",
    campaign_notes: brief.campaign.campaign_notes || brief.special_notes.join("\n") || ""
  };

  const adSets: WizardAdSet[] = (brief.ad_sets.length ? brief.ad_sets : [{ label: "Ad set 1", targeting_details: null, budget_amount: null, budget_type: null, ads: [] } as any]).map((adSet, index) => ({
    id: uid("adset"),
    label: adSet.label || `Ad set ${index + 1}`,
    notes: adSet.targeting_details || adSet.notes || "",
    budget_enabled: adSet.budget_amount !== null && adSet.budget_amount !== undefined,
    budget_amount: adSet.budget_amount === null || adSet.budget_amount === undefined ? "" : String(adSet.budget_amount),
    budget_type: (adSet.budget_type || "") as WizardAdSet["budget_type"]
  }));

  const nestedAds: WizardAd[] = [];
  brief.ad_sets.forEach((adSet, adSetIndex) => {
    const adSetId = adSets[adSetIndex]?.id;
    (adSet.ads || []).forEach((ad) => {
      nestedAds.push({
        id: uid("ad"),
        label: ad.label || ad.release_title || `Ad ${nestedAds.length + 1}`,
        asset_type: (ad.asset_type || "") as AssetType,
        asset_links: [...(ad.asset_links || []), ad.post_url || "", ad.boost_code || ""].filter(Boolean).join("\n"),
        destination_url: ad.destination_url || "",
        copy: ad.copy || "",
        notes: ad.notes || "",
        assignedAdSetIds: adSetId ? [adSetId] : []
      });
    });
  });

  const flatAds: WizardAd[] = nestedAds.length > 0 ? nestedAds : (brief.ads || []).map((ad, index) => ({
    id: uid("ad"),
    label: ad.label || ad.release_title || `Ad ${index + 1}`,
    asset_type: (ad.asset_type || "") as AssetType,
    asset_links: [...(ad.asset_links || []), ad.post_url || "", ad.boost_code || ""].filter(Boolean).join("\n"),
    destination_url: ad.destination_url || "",
    copy: ad.copy || "",
    notes: ad.notes || "",
    assignedAdSetIds: adSets.map((adSet) => adSet.id)
  }));

  return { setup, adSets, ads: flatAds.length ? flatAds : [newAd("Ad 1", adSets.map((adSet) => adSet.id))] };
}

function toggleAssignedAdSet(ad: WizardAd, adSetId: string): string[] {
  return ad.assignedAdSetIds.includes(adSetId)
    ? ad.assignedAdSetIds.filter((id) => id !== adSetId)
    : [...ad.assignedAdSetIds, adSetId];
}

function FunnelPreview({ setup, adSets, ads }: { setup: CampaignSetup; adSets: WizardAdSet[]; ads: WizardAd[] }) {
  const previewBrief = useMemo(() => buildBrief(setup, adSets, ads) as JDWCampaignBrief, [setup, adSets, ads]);
  return <BriefFunnelView brief={previewBrief} />;
}

function SummaryStrip({ setup, adSets, ads }: { setup: CampaignSetup; adSets: WizardAdSet[]; ads: WizardAd[] }) {
  return (
    <div className="quick-summary">
      <span>{setup.artist || "artist?"}</span>
      <span>{setup.release_title || "project?"}</span>
      <span>{setup.platform || "platform?"}</span>
      <span>{adSets.length} ad set{adSets.length === 1 ? "" : "s"}</span>
      <span>{ads.length} ad{ads.length === 1 ? "" : "s"}</span>
    </div>
  );
}

export function NewBriefForm({ initialBrief, briefId, savedArtists = [], savedProjects = [] }: NewBriefFormProps) {
  const router = useRouter();
  const initialState = useMemo(() => briefToBuilderState(initialBrief), [initialBrief]);
  const [slide, setSlide] = useState(0);
  const [setup, setSetup] = useState<CampaignSetup>(initialState.setup);
  const [adSets, setAdSets] = useState<WizardAdSet[]>(initialState.adSets);
  const [ads, setAds] = useState<WizardAd[]>(initialState.ads);
  const [sameAdSetNotes, setSameAdSetNotes] = useState("");
  const [sameBudgetEnabled, setSameBudgetEnabled] = useState(false);
  const [sameBudgetAmount, setSameBudgetAmount] = useState("");
  const [sameBudgetType, setSameBudgetType] = useState<WizardAdSet["budget_type"]>("");
  const [importedJson, setImportedJson] = useState<string | null>(null);
  const [importedValidation, setImportedValidation] = useState<BriefValidationResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const adSetIds = useMemo(() => adSets.map((adSet) => adSet.id), [adSets]);
  const manualJson = useMemo(() => JSON.stringify(buildBrief(setup, adSets, ads), null, 2), [setup, adSets, ads]);
  const manualValidation = useMemo(() => validateBriefJson(manualJson), [manualJson]);
  const activeValidation = importedValidation?.ok ? importedValidation : manualValidation;
  const missingFields = activeValidation.ok
    ? activeValidation.briefs.reduce((fields, brief) => [...fields, ...brief.missingFields], [] as string[])
    : [];
  const activeJson = importedValidation?.ok && importedJson ? importedJson : manualJson;
  const currentSlide = SLIDES[slide];

  function clearImport() {
    setImportedJson(null);
    setImportedValidation(null);
  }

  function updateSetup<K extends keyof CampaignSetup>(key: K, value: CampaignSetup[K]) {
    clearImport();
    setSetup((current) => ({ ...current, [key]: value }));
  }

  function updateAdSet(id: string, changes: Partial<WizardAdSet>) {
    clearImport();
    setAdSets((current) => current.map((adSet) => (adSet.id === id ? { ...adSet, ...changes } : adSet)));
  }

  function updateAd(id: string, changes: Partial<WizardAd>) {
    clearImport();
    setAds((current) => current.map((ad) => (ad.id === id ? { ...ad, ...changes } : ad)));
  }

  function changeAdSetCount(count: number) {
    clearImport();
    setAdSets((current) => {
      const next = fitAdSetCount(current, count);
      const nextIds = next.map((adSet) => adSet.id);
      setAds((currentAds) => currentAds.map((ad) => ({
        ...ad,
        assignedAdSetIds: ad.assignedAdSetIds.length ? ad.assignedAdSetIds.filter((id) => nextIds.includes(id)) : nextIds
      })));
      return next;
    });
  }

  function nextSlide() {
    setSlide((current) => Math.min(SLIDES.length - 1, current + 1));
  }

  function previousSlide() {
    setSlide((current) => Math.max(0, current - 1));
  }

  function submitBrief() {
    setSubmitError(null);
    const validation = validateBriefJson(activeJson);
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    startTransition(async () => {
      const result = briefId
        ? await updateBriefAction(briefId, activeJson)
        : await submitBriefAction(activeJson);
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      router.push(result.ids.length === 1 ? `/brief/${result.id}` : "/inbox");
    });
  }

  return (
    <div className="one-by-one-builder">
      <div className="pixel-window p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="pixel-label">Step {slide + 1} of {SLIDES.length}</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight">{currentSlide.label}</h2>
            <p className="mt-1 text-sm font-semibold pixel-muted">{currentSlide.hint}</p>
          </div>
          <SummaryStrip setup={setup} adSets={adSets} ads={ads} />
        </div>
        <div className="mt-4 h-4 border-3 border-black bg-white">
          <div className="h-full bg-[#eb5160] transition-all duration-300" style={{ width: `${((slide + 1) / SLIDES.length) * 100}%` }} />
        </div>
        <div className="mt-4 hidden gap-2 lg:flex">
          {SLIDES.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setSlide(index)}
              className={`step-dot ${index === slide ? "step-dot-active" : ""}`}
              aria-label={`Go to ${item.label}`}
            />
          ))}
        </div>
      </div>

      <div key={slide} className="swipe-card pixel-window p-5 sm:p-8">
        {slide === 0 ? (
          <section className="simple-question">
            <p className="pixel-label">Artist folder</p>
            <h3>Who is the artist?</h3>
            <TextInput
              list="saved-artists"
              autoFocus
              value={setup.artist}
              onChange={(event) => updateSetup("artist", event.target.value)}
              placeholder="Nemzzz / Trampolene / Father of Peace"
              className="mega-field"
            />
            <DataList id="saved-artists" options={savedArtists} />
            <p className="helper-copy">If this artist already exists, pick it from the dropdown and the brief will live in that artist folder.</p>
          </section>
        ) : null}

        {slide === 1 ? (
          <section className="simple-question">
            <p className="pixel-label">Project</p>
            <h3>What is the track, tour, or project?</h3>
            <TextInput
              list="saved-projects"
              autoFocus
              value={setup.release_title}
              onChange={(event) => updateSetup("release_title", event.target.value)}
              placeholder="Super Powers / South Wales Tour / No Complaints"
              className="mega-field"
            />
            <DataList id="saved-projects" options={savedProjects} />
            <p className="helper-copy">This becomes the project name inside the artist folder.</p>
          </section>
        ) : null}

        {slide === 2 ? (
          <section className="simple-question">
            <p className="pixel-label">Platform</p>
            <h3>Where is this campaign being built?</h3>
            <div className="choice-grid mt-6">
              {PLATFORM_OPTIONS.map((value) => (
                <button key={value} type="button" onClick={() => { updateSetup("platform", value); }} className={`choice-card ${setup.platform === value ? "choice-card-active" : ""}`}>
                  {value}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {slide === 3 ? (
          <section className="simple-question">
            <p className="pixel-label">Account + ACID</p>
            <h3>What account and ACID?</h3>
            <div className="mx-auto mt-6 grid max-w-3xl gap-4 md:grid-cols-2">
              <FieldShell label="Account"><TextInput value={setup.account} onChange={(e) => updateSetup("account", e.target.value)} placeholder="Atlantic Records UK / Trade Secret..." /></FieldShell>
              <FieldShell label="ACID"><TextInput value={setup.acid} onChange={(e) => updateSetup("acid", e.target.value)} placeholder="80JPUI" /></FieldShell>
            </div>
            <p className="helper-copy">No ASID. If James has not given ACID yet, hit Skip.</p>
          </section>
        ) : null}

        {slide === 4 ? (
          <section className="simple-question">
            <p className="pixel-label">Objective</p>
            <h3>What is the campaign trying to do?</h3>
            <div className="mx-auto mt-6 grid max-w-3xl gap-4 md:grid-cols-2">
              <FieldShell label="Objective">
                <TextInput list="objective-presets" value={setup.objective} onChange={(e) => updateSetup("objective", e.target.value)} placeholder="Streaming Conversions" />
                <DataList id="objective-presets" options={OBJECTIVE_PRESETS} />
              </FieldShell>
              <FieldShell label="Campaign type">
                <TextInput list="campaign-type-presets" value={setup.campaign_type} onChange={(e) => updateSetup("campaign_type", e.target.value)} placeholder="Engagement / Sales / Traffic" />
                <DataList id="campaign-type-presets" options={CAMPAIGN_TYPE_PRESETS} />
              </FieldShell>
            </div>
          </section>
        ) : null}

        {slide === 5 ? (
          <section className="simple-question">
            <p className="pixel-label">Tracking</p>
            <h3>Pixel, conversion location, and event?</h3>
            <div className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-3">
              <FieldShell label="Conversion location">
                <TextInput list="conversion-presets" value={setup.conversion_location} onChange={(e) => updateSetup("conversion_location", e.target.value)} placeholder="Website" />
                <DataList id="conversion-presets" options={CONVERSION_LOCATION_PRESETS} />
              </FieldShell>
              <FieldShell label="Optimisation event">
                <TextInput list="optimisation-presets" value={setup.optimisation_event} onChange={(e) => updateSetup("optimisation_event", e.target.value)} placeholder="FeatureFM_click" />
                <DataList id="optimisation-presets" options={OPTIMISATION_PRESETS} />
              </FieldShell>
              <FieldShell label="Pixel"><TextInput value={setup.pixel} onChange={(e) => updateSetup("pixel", e.target.value)} placeholder="Pixel ID / name" /></FieldShell>
            </div>
            <p className="helper-copy">For TikTok views or basic boosts, you can usually skip this.</p>
          </section>
        ) : null}

        {slide === 6 ? (
          <section className="simple-question">
            <p className="pixel-label">Budget + dates</p>
            <h3>How much money and when?</h3>
            <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3">
              <FieldShell label="Budget amount"><TextInput inputMode="decimal" value={setup.budget_amount} onChange={(e) => updateSetup("budget_amount", e.target.value)} placeholder="250" /></FieldShell>
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
              <FieldShell label="Territory summary"><TextInput value={setup.territory_summary} onChange={(e) => updateSetup("territory_summary", e.target.value)} placeholder="UK / FR NL BE / Global" /></FieldShell>
            </div>
          </section>
        ) : null}

        {slide === 7 ? (
          <section className="simple-question">
            <p className="pixel-label">Context</p>
            <h3>Anything else James said?</h3>
            <TextArea
              autoFocus
              value={setup.campaign_notes}
              onChange={(e) => updateSetup("campaign_notes", e.target.value)}
              placeholder="Same song.so setup as previous, leave off for JD sign-off, account pending, etc."
              className="mx-auto mt-6 max-w-4xl text-lg"
            />
          </section>
        ) : null}

        {slide === 8 ? (
          <section className="simple-question">
            <p className="pixel-label">Ad sets</p>
            <h3>How many ad sets?</h3>
            <TextInput
              type="number"
              min={1}
              max={24}
              value={adSets.length}
              onChange={(event) => changeAdSetCount(Number(event.target.value))}
              className="mega-field mx-auto max-w-60 text-center"
            />
            <p className="helper-copy">Example: 1 broad ad set, 5 city ad sets, or 2 test cells.</p>
          </section>
        ) : null}

        {slide === 9 ? (
          <section className="grid gap-5">
            <div className="text-center">
              <p className="pixel-label">Ad set details</p>
              <h3 className="text-3xl font-black">What does each ad set do?</h3>
              <p className="helper-copy">Keep it simple: name, targeting notes, optional budget.</p>
            </div>

            <div className="pixel-card p-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <FieldShell label="Same note for every ad set">
                    <TextArea value={sameAdSetNotes} onChange={(e) => setSameAdSetNotes(e.target.value)} placeholder="IG only, 18-35, Advantage+ off, no expansion..." />
                  </FieldShell>
                </div>
                <div className="grid gap-3">
                  <label className="pixel-panel flex items-center gap-3 p-3">
                    <input type="checkbox" checked={sameBudgetEnabled} onChange={(e) => setSameBudgetEnabled(e.target.checked)} className="h-5 w-5" />
                    <span className="text-sm font-black">Same ad set budget?</span>
                  </label>
                  {sameBudgetEnabled ? (
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput placeholder="Amount" inputMode="decimal" value={sameBudgetAmount} onChange={(e) => setSameBudgetAmount(e.target.value)} />
                      <SelectInput value={sameBudgetType} onChange={(e) => setSameBudgetType(e.target.value as WizardAdSet["budget_type"])}>
                        <option value="">Type</option>
                        {AD_SET_BUDGET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                      </SelectInput>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="pixel-button text-xs"
                    onClick={() => {
                      clearImport();
                      setAdSets((current) => current.map((adSet) => ({
                        ...adSet,
                        notes: sameAdSetNotes,
                        budget_enabled: sameBudgetEnabled,
                        budget_amount: sameBudgetAmount,
                        budget_type: sameBudgetType
                      })));
                    }}
                  >
                    Apply to all ad sets
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {adSets.map((adSet, adSetIndex) => (
                <article key={adSet.id} className="pixel-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="pixel-label">Ad set {adSetIndex + 1}</p>
                      <h4 className="mt-1 text-2xl font-black">{adSet.label || `Ad set ${adSetIndex + 1}`}</h4>
                    </div>
                    <button type="button" onClick={() => setAdSets((current) => [...current, { ...adSet, id: uid("adset"), label: `${adSet.label || "Ad set"} copy` }])} className="mini-button">Duplicate</button>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <FieldShell label="Ad set name"><TextInput value={adSet.label} onChange={(e) => updateAdSet(adSet.id, { label: e.target.value })} placeholder="UK prospecting / warm retargeting" /></FieldShell>
                    <div className="lg:col-span-2"><FieldShell label="What does this ad set do / target?"><TextArea value={adSet.notes} onChange={(e) => updateAdSet(adSet.id, { notes: e.target.value })} placeholder="Locations, age, placements, interest stack, LAL, retargeting notes..." /></FieldShell></div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <label className="pixel-panel flex items-center gap-3 p-4">
                      <input type="checkbox" checked={adSet.budget_enabled} onChange={(e) => updateAdSet(adSet.id, { budget_enabled: e.target.checked })} className="h-5 w-5" />
                      <span><span className="block font-black">Ad set budget?</span><span className="text-sm font-semibold pixel-muted">Only if split here.</span></span>
                    </label>
                    {adSet.budget_enabled ? (
                      <>
                        <FieldShell label="Amount"><TextInput inputMode="decimal" value={adSet.budget_amount} onChange={(e) => updateAdSet(adSet.id, { budget_amount: e.target.value })} /></FieldShell>
                        <FieldShell label="Type">
                          <SelectInput value={adSet.budget_type} onChange={(e) => updateAdSet(adSet.id, { budget_type: e.target.value as WizardAdSet["budget_type"] })}>
                            <option value="">Unknown</option>
                            {AD_SET_BUDGET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                          </SelectInput>
                        </FieldShell>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {slide === 10 ? (
          <section className="grid gap-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="pixel-label">Ads</p>
                <h3 className="text-3xl font-black">Create ads once. Send them to any ad set.</h3>
                <p className="helper-copy text-left">Tick 3 of 5 ad sets, all of them, or only one.</p>
              </div>
              <button type="button" onClick={() => { clearImport(); setAds((current) => [...current, newAd(`Ad ${current.length + 1}`, adSetIds)]); }} className="pixel-button text-xs">
                + Add ad
              </button>
            </div>

            <div className="grid gap-4">
              {ads.map((ad, adIndex) => (
                <article key={ad.id} className="pixel-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="pixel-label">Ad {adIndex + 1}</p>
                      <h4 className="mt-1 text-2xl font-black">{ad.label || `Ad ${adIndex + 1}`}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateAd(ad.id, { assignedAdSetIds: adSetIds })} className="mini-button">All</button>
                      <button type="button" onClick={() => updateAd(ad.id, { assignedAdSetIds: [] })} className="mini-button">None</button>
                      <button type="button" onClick={() => { clearImport(); setAds((current) => [...current, { ...ad, id: uid("ad"), label: `${ad.label || "Ad"} copy` }]); }} className="mini-button">Duplicate</button>
                      {ads.length > 1 ? <button type="button" onClick={() => { clearImport(); setAds((current) => current.filter((item) => item.id !== ad.id)); }} className="mini-button danger">Delete</button> : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <FieldShell label="Ad / asset name"><TextInput value={ad.label} onChange={(e) => updateAd(ad.id, { label: e.target.value })} placeholder="Geekin 9x16 / Spark code 1" /></FieldShell>
                    <FieldShell label="Asset type">
                      <SelectInput value={ad.asset_type} onChange={(e) => updateAd(ad.id, { asset_type: e.target.value as AssetType })}>
                        <option value="">Unknown</option>
                        {ASSET_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                      </SelectInput>
                    </FieldShell>
                    <FieldShell label="Destination link"><TextInput value={ad.destination_url} onChange={(e) => updateAd(ad.id, { destination_url: e.target.value })} placeholder="song.so / Linkfire" /></FieldShell>
                    <div className="lg:col-span-2"><FieldShell label="Asset links / post URLs / boost codes" hint="One per line is easiest."><TextArea value={ad.asset_links} onChange={(e) => updateAd(ad.id, { asset_links: e.target.value })} /></FieldShell></div>
                    <FieldShell label="Text / copy"><TextArea value={ad.copy} onChange={(e) => updateAd(ad.id, { copy: e.target.value })} /></FieldShell>
                    <div className="lg:col-span-3"><FieldShell label="Tiny note"><TextInput value={ad.notes} onChange={(e) => updateAd(ad.id, { notes: e.target.value })} placeholder="Pick 4x5 cut / use FR video / A-B test" /></FieldShell></div>
                  </div>

                  <div className="mt-5 border-t-4 border-black pt-4">
                    <p className="pixel-label">Send this ad to</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {adSets.map((adSet, index) => (
                        <label key={adSet.id} className={`pixel-node cursor-pointer p-3 ${ad.assignedAdSetIds.includes(adSet.id) ? "pixel-node-active" : ""}`}>
                          <input
                            type="checkbox"
                            checked={ad.assignedAdSetIds.includes(adSet.id)}
                            onChange={() => updateAd(ad.id, { assignedAdSetIds: toggleAssignedAdSet(ad, adSet.id) })}
                            className="sr-only"
                          />
                          <span className="pixel-label block">Ad set {index + 1}</span>
                          <span className="mt-1 block font-black">{adSet.label || `Ad set ${index + 1}`}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {slide === 11 ? (
          <section className="grid gap-5">
            <div className="text-center">
              <p className="pixel-label">Review</p>
              <h3 className="text-3xl font-black">Save the campaign folder draft.</h3>
              <p className="helper-copy">Click a funnel box to inspect the details.</p>
            </div>

            <FunnelPreview setup={setup} adSets={adSets} ads={ads} />

            {missingFields.length > 0 ? (
              <details className="pixel-card p-4">
                <summary className="cursor-pointer font-mono text-sm font-black uppercase tracking-[0.16em]">Missing info ({missingFields.length})</summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingFields.map((field) => (
                    <span key={field} className="pixel-missing px-3 py-2 font-mono text-xs font-black">{field}</span>
                  ))}
                </div>
              </details>
            ) : (
              <p className="pixel-ready p-4 font-black">No missing required fields.</p>
            )}

            <JsonImportPanel
              onImported={(json, validation) => {
                setImportedJson(json);
                setImportedValidation(validation);
              }}
            />

            {submitError ? <p className="pixel-alert p-3 text-sm font-bold">{submitError}</p> : null}
          </section>
        ) : null}
      </div>

      <div className="wizard-controls pixel-window p-4">
        <button type="button" onClick={previousSlide} disabled={slide === 0} className="mini-button px-4 py-3 disabled:opacity-40">Back</button>
        <button type="button" onClick={nextSlide} disabled={slide === SLIDES.length - 1} className="mini-button px-4 py-3 disabled:opacity-40">Skip</button>
        {slide < SLIDES.length - 1 ? (
          <button type="button" onClick={nextSlide} className="pixel-button px-6 py-4 text-sm">Next</button>
        ) : (
          <button type="button" onClick={submitBrief} disabled={isPending} className="pixel-button px-6 py-4 text-sm disabled:opacity-60">
            {isPending ? "Saving..." : briefId ? "Update brief" : importedJson ? "Submit imported JSON" : "Save draft"}
          </button>
        )}
      </div>
    </div>
  );
}
