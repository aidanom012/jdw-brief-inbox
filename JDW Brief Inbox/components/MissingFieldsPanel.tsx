type MissingFieldsPanelProps = {
  fields: string[];
};

export function MissingFieldsPanel({ fields }: MissingFieldsPanelProps) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4">
      <h2 className="text-lg font-semibold text-red-50">Missing information</h2>
      <ul className="mt-3 grid gap-2 text-sm text-red-100 sm:grid-cols-2">
        {fields.map((field) => (
          <li key={field} className="rounded-md border border-red-300/20 bg-red-950/30 px-3 py-2 font-mono">
            {field}
          </li>
        ))}
      </ul>
    </section>
  );
}
