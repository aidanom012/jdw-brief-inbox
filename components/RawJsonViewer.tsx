import type { JDWCampaignBrief } from "@/lib/brief-schema";

type RawJsonViewerProps = {
  brief: JDWCampaignBrief;
};

export function RawJsonViewer({ brief }: RawJsonViewerProps) {
  return (
    <details className="pixel-card p-4">
      <summary className="cursor-pointer font-mono text-sm font-black uppercase tracking-[0.16em]">Raw JSON</summary>
      <pre className="mt-4 max-h-[520px] overflow-auto border-4 border-black bg-[#f4f1e4] p-4 text-xs leading-6">
        {JSON.stringify(brief, null, 2)}
      </pre>
    </details>
  );
}
