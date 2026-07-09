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
    <section className="pixel-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-sm font-black uppercase tracking-[0.16em]">Internal notes</h2>
        {saved ? <span className="pixel-missing px-2 py-1 font-mono text-xs font-black">Saved</span> : null}
      </div>
      <textarea
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setSaved(false);
        }}
        className="field mt-4 min-h-36 resize-y text-sm leading-6"
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
        className="pixel-button mt-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save notes"}
      </button>
    </section>
  );
}
