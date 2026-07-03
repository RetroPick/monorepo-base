type WorldCupEmptyStateProps = {
  title: string;
  description: string;
};

export function WorldCupEmptyState({ title, description }: WorldCupEmptyStateProps) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </section>
  );
}
