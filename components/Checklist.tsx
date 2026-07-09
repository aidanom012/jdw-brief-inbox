"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItemAction } from "@/app/actions";
import type { ChecklistItemRow } from "@/lib/db";

type ChecklistProps = {
  briefId: string;
  items: ChecklistItemRow[];
  canEdit: boolean;
};

export function Checklist({ briefId, items: initialItems, canEdit }: ChecklistProps) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const completedCount = items.filter((item) => item.completed).length;

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Aidan checklist</h2>
        <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300">
          {completedCount}/{items.length}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 ${
              item.completed ? "border-emerald-400/30 bg-emerald-500/10" : "border-white/10 bg-ink/70"
            } ${canEdit ? "cursor-pointer" : "cursor-default opacity-80"}`}
          >
            <input
              type="checkbox"
              checked={item.completed}
              disabled={!canEdit || isPending}
              onChange={(event) => {
                const completed = event.target.checked;
                setItems((currentItems) =>
                  currentItems.map((currentItem) =>
                    currentItem.id === item.id ? { ...currentItem, completed } : currentItem
                  )
                );
                startTransition(async () => {
                  await toggleChecklistItemAction(briefId, item.id, completed);
                });
              }}
              className="h-5 w-5 rounded border-white/20 bg-ink text-teal-300 focus:ring-teal-300"
            />
            <span className="text-sm font-medium text-zinc-100">{item.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
