import type { ReactNode } from "react";

interface InfoItem {
  label: string;
  value: string | ReactNode;
}

interface InfoCardProps {
  title: string;
  items: InfoItem[];
}

export function InfoCard({ title, items }: InfoCardProps) {
  return (
    <div className="grid gap-3 rounded-[20px] border border-border/50 bg-background/65 p-4 text-foreground">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="text-right font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
