"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const AUTOSAVE_KEY = "jdw.manualBriefDraft.v2";
const SLIDE_COUNT = 12;

type ContinueOption = {
  id: string;
  label: string;
  meta: string;
};

type StoredQueueItem = {
  id?: string;
  label?: string;
  slide?: number;
  status?: "pending" | "saved" | "skipped" | string;
  brief?: {
    campaign?: {
      artist?: string | null;
      release_title?: string | null;
      platform?: string | null;
    };
  };
};

type StoredAutosave = {
  setup?: {
    artist?: string | null;
    release_title?: string | null;
  };
  adSets?: unknown[];
  ads?: unknown[];
  slide?: number;
  buildMode?: string;
  campaignQueue?: StoredQueueItem[];
  activeQueueId?: string | null;
  updatedAt?: string;
};

type StartBriefMenuProps = {
  label?: string;
  variant?: "desktop" | "nav";
  className?: string;
};

function safeSlide(value: unknown): number {
  return typeof value === "number" ? Math.max(0, Math.min(SLIDE_COUNT - 1, value)) : 0;
}

function draftLabel(
  setup?: { artist?: string | null; release_title?: string | null },
  fallback = "Unfinished brief",
): string {
  const artist = setup?.artist?.trim();
  const release = setup?.release_title?.trim();
  if (artist && release) return `${artist} / ${release}`;
  if (artist) return artist;
  if (release) return release;
  return fallback;
}

function queueLabel(item: StoredQueueItem, index: number): string {
  if (item.label?.trim()) return item.label.trim();
  const campaign = item.brief?.campaign;
  return draftLabel(
    {
      artist: campaign?.artist,
      release_title: campaign?.release_title,
    },
    `Campaign ${index + 1}`,
  );
}

function draftMeta(slide = 0, updatedAt?: string): string {
  const step = `Step ${safeSlide(slide) + 1} of ${SLIDE_COUNT}`;
  if (!updatedAt) return step;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return step;
  return `${step} · ${date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function hasObjectContent(value: unknown, index: number, kind: "adSet" | "ad"): boolean {
  if (!value || typeof value !== "object") return false;
  const defaultLabel = kind === "adSet" ? `Ad set ${index + 1}` : `Ad ${index + 1}`;
  return Object.entries(value as Record<string, unknown>).some(([key, entry]) => {
    if (key === "id" || key === "assignedAdSetIds") return false;
    if (key === "label" && entry === defaultLabel) return false;
    if (key === "gender" && entry === "all") return false;
    if (key === "targeting_type" && entry === "unknown") return false;
    if (key === "asset_type" && entry === "video") return false;
    if (key === "budget_enabled" && entry === false) return false;
    return typeof entry === "string" ? entry.trim().length > 0 : Boolean(entry);
  });
}

function snapshotHasSingleDraft(snapshot: StoredAutosave): boolean {
  const setup = snapshot.setup || {};
  const setupHasContent = Object.entries(setup).some(([key, value]) => {
    if (key === "currency" && value === "GBP") return false;
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
  return (
    setupHasContent ||
    Boolean(snapshot.adSets?.some((item, index) => hasObjectContent(item, index, "adSet"))) ||
    Boolean(snapshot.ads?.some((item, index) => hasObjectContent(item, index, "ad"))) ||
    safeSlide(snapshot.slide) > 0 ||
    snapshot.buildMode === "ai"
  );
}

function optionsFromSnapshot(snapshot: StoredAutosave | null): ContinueOption[] {
  if (!snapshot) return [];

  if (Array.isArray(snapshot.campaignQueue) && snapshot.campaignQueue.length > 0) {
    return snapshot.campaignQueue
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status === "pending")
      .map(({ item, index }) => ({
        id: item.id || `queued-${index}`,
        label: queueLabel(item, index),
        meta: draftMeta(item.slide, snapshot.updatedAt),
      }));
  }

  if (!snapshotHasSingleDraft(snapshot)) return [];
  return [
    {
      id: "single-draft",
      label: draftLabel(snapshot.setup),
      meta: draftMeta(snapshot.slide, snapshot.updatedAt),
    },
  ];
}

function readSnapshot(): StoredAutosave | null {
  try {
    const saved = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as StoredAutosave;
    const options = optionsFromSnapshot(parsed);
    if (options.length === 0) {
      window.localStorage.removeItem(AUTOSAVE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(AUTOSAVE_KEY);
    return null;
  }
}

function deleteOptionFromStorage(id: string): ContinueOption[] {
  const snapshot = readSnapshot();
  if (!snapshot) return [];

  if (Array.isArray(snapshot.campaignQueue) && snapshot.campaignQueue.length > 0) {
    const nextQueue = snapshot.campaignQueue.filter((item, index) => (item.id || `queued-${index}`) !== id);
    const nextSnapshot: StoredAutosave = {
      ...snapshot,
      campaignQueue: nextQueue,
      activeQueueId: snapshot.activeQueueId === id ? null : snapshot.activeQueueId,
      updatedAt: new Date().toISOString(),
    };
    const nextOptions = optionsFromSnapshot(nextSnapshot);
    if (nextOptions.length === 0) {
      window.localStorage.removeItem(AUTOSAVE_KEY);
      return [];
    }
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(nextSnapshot));
    return nextOptions;
  }

  window.localStorage.removeItem(AUTOSAVE_KEY);
  return [];
}

export function StartBriefMenu({
  label = "+ Start new brief",
  variant = "desktop",
  className = "",
}: StartBriefMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);
  const [options, setOptions] = useState<ContinueOption[]>([]);

  function refreshOptions() {
    setOptions(optionsFromSnapshot(readSnapshot()));
  }

  useEffect(() => {
    refreshOptions();
    window.addEventListener("storage", refreshOptions);
    window.addEventListener("focus", refreshOptions);
    return () => {
      window.removeEventListener("storage", refreshOptions);
      window.removeEventListener("focus", refreshOptions);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setContinueOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function startFresh() {
    window.localStorage.removeItem(AUTOSAVE_KEY);
    setOptions([]);
    setOpen(false);
    setContinueOpen(false);
    router.push("/new?start=fresh");
  }

  function continueDraft(id: string) {
    setOpen(false);
    setContinueOpen(false);
    router.push(`/new?resume=${encodeURIComponent(id)}`);
  }

  function deleteDraft(id: string) {
    const nextOptions = deleteOptionFromStorage(id);
    setOptions(nextOptions);
    if (nextOptions.length === 0) setContinueOpen(false);
  }

  return (
    <div ref={menuRef} className={`start-brief-menu start-brief-menu-${variant} ${className}`}>
      <button
        type="button"
        className={variant === "nav" ? "nav-chip focus-ring start-brief-trigger" : "pixel-button focus-ring desktop-new-button start-brief-trigger"}
        onClick={() => {
          refreshOptions();
          setOpen((current) => !current);
        }}
        aria-expanded={open}
      >
        {label}
      </button>

      {open ? (
        <div className="start-brief-dropdown animate-pop">
          <button type="button" className="start-brief-action" onClick={startFresh}>
            <span>New</span>
            <small>blank brief</small>
          </button>

          <div className="start-brief-continue-block">
            <button
              type="button"
              className="start-brief-action"
              onClick={() => setContinueOpen((current) => !current)}
              disabled={options.length === 0}
            >
              <span>Continue unsaved</span>
              <small>{options.length ? `${options.length} draft${options.length === 1 ? "" : "s"}` : "none"}</small>
            </button>

            {continueOpen && options.length ? (
              <div className="start-brief-continue-list">
                {options.map((option) => (
                  <div key={option.id} className="start-brief-continue-row">
                    <button type="button" onClick={() => continueDraft(option.id)}>
                      <span>{option.label}</span>
                      <small>{option.meta}</small>
                    </button>
                    <button
                      type="button"
                      className="start-brief-delete"
                      aria-label={`Delete ${option.label} autosave`}
                      onClick={() => deleteDraft(option.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
