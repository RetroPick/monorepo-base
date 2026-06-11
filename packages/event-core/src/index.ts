export type EventId = string;
export type TemplateId = `0x${string}`;

export type RetroPickEventName =
  | "market.upserted"
  | "epoch.opened"
  | "epoch.locked"
  | "epoch.resolved"
  | "epoch.cancelled"
  | "position.updated"
  | "chart.tick";

export type RetroPickEventEnvelope<TName extends string = RetroPickEventName, TPayload = unknown> = {
  id: EventId;
  name: TName;
  templateId?: TemplateId;
  epochId?: number;
  blockNumber?: number;
  observedAt: string;
  payload: TPayload;
};

export function eventChannel(templateId: TemplateId, topic: "market" | "epoch" | "position" | "chart"): string {
  return `${topic}:${templateId}`;
}

export function isTemplateId(value: string): value is TemplateId {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}
