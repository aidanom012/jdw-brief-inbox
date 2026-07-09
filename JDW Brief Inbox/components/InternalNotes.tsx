"use client";

import { useState, useTransition } from "react";
import { updateInternalNotesAction } from "@/app/actions";

type InternalNotesProps = {
  briefId: string;
  initialNotes: string;
};

export function InternalNotes({ briefId, initialNotes }: InternalNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Internal notes</h2>
        {saved ? <span className="text-sm text-emerald-200">Saved</span> : null}
      </div>
      <textarea
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setSaved(false);
        }}
        className="focus-ring mt-4 min-h-36 w-full resize-y rounded-md border border-white/10 bg-ink p-3 text-sm leading-6 text-zinc-100"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await updateInternalNotesAction(briefId, notes);
            setSaved(true);
          });
        }}
        className="focus-ring mt-3 rounded-md bg-teal-300 px-4 py-2 font-semibold text-ink hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save notes"}
      </button>
    </section>
  );
}
