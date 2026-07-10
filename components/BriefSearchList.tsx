"use client";

import { useMemo, useState } from "react";
import { BriefCard } from "@/components/BriefCard";
import type { BriefRow } from "@/lib/db";

function haystack(brief: BriefRow): string {
  return [
    brief.artist,
    brief.release_title,
    brief.platform,
    brief.account,
    brief.objective,
    brief.acid,
    brief.title,
    brief.raw_json.campaign.campaign_notes,
    ...brief.raw_json.ad_sets.map((adSet) => `${adSet.label || ""} ${adSet.targeting_details || ""} ${adSet.notes || ""}`),
    ...brief.raw_json.ads.map((ad) => `${ad.label || ""} ${ad.copy || ""} ${ad.destination_url || ""}`)
  ].filter(Boolean).join(" ").toLowerCase();
}

export function BriefSearchList({ briefs }: { briefs: BriefRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return briefs;
    return briefs.filter((brief) => haystack(brief).includes(clean));
  }, [briefs, query]);

  return (
    <section className="grid gap-4">
      <div className="pixel-window p-4">
        <label>
          <span className="pixel-label">Search campaigns</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field mt-2"
            placeholder="Search project, ACID, platform, notes, copy..."
          />
        </label>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] pixel-muted">
          {filtered.length} of {briefs.length} campaigns shown
        </p>
      </div>
      {filtered.length === 0 ? (
        <div className="pixel-card p-8 text-center">
          <p className="pixel-label">No match</p>
          <h2 className="mt-2 text-2xl font-black">Nothing in this workspace matches that search.</h2>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((brief) => <BriefCard key={brief.id} brief={brief} />)}
        </div>
      )}
    </section>
  );
}
