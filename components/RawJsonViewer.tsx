import type { JDWCampaignBrief } from "@/lib/brief-schema";

type RawJsonViewerProps = {
  brief: JDWCampaignBrief;
};

export function RawJsonViewer({ brief }: RawJsonViewerProps) {
  return (
    <details className="rounded-lg border border-white/10 bg-panel p-4">
      <summary className="cursor-pointer text-lg font-semibold text-white">Raw JSON</summary>
      <pre className="mt-4 max-h-[520px] overflow-auto rounded-md border border-white/10 bg-ink p-4 text-xs leading-6 text-zinc-200">
        {JSON.stringify(brief, null, 2)}
      </pre>
    </details>
  );
}
