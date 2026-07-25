import type { MarketRow } from "@/lib/api/retropickApi";
import { chainDetailPath, inferMarketCardLifecycle } from "@/lib/market-data/chainDiscover";
import type {
  WorldCupGroup,
  WorldCupGroupStats,
  WorldCupGroupStanding,
  WorldCupMarketStatus,
  WorldCupMatch,
  WorldCupParsedMarket,
  WorldCupStage,
  WorldCupTeam,
} from "../types/worldCup.types";
import {
  filterWorldCupAwardMarkets,
  filterWorldCupMatchMarkets,
  filterWorldCupProgressionMarkets,
  isWorldCupMarket,
} from "./worldCupMarketFilter";

function slugParts(slug: string): string[] {
  return slug.toLowerCase().split("-").filter(Boolean);
}

function parseGroupFromSlug(slug: string): string | null {
  const parts = slugParts(slug);
  const groupIdx = parts.indexOf("group");
  if (groupIdx >= 0 && parts[groupIdx + 1]) {
    const letter = parts[groupIdx + 1].toUpperCase();
    if (/^[A-L]$/.test(letter)) return letter;
  }
  const match = slug.match(/group-([a-l])/i);
  if (match?.[1]) return match[1].toUpperCase();
  return null;
}

function parseStageFromSlug(slug: string): WorldCupStage | null {
  const s = slug.toLowerCase();
  if (s.includes("group-stage") || s.includes("group-stage") || (s.includes("group-") && s.includes("progression"))) {
    return "group-stage";
  }
  if (s.includes("round-of-32") || s.includes("r32")) return "round-of-32";
  if (s.includes("quarter-final") || s.includes("quarterfinal") || s.includes("qf")) return "quarter-final";
  if (s.includes("winner") || s.includes("champion")) return "winner";
  if (s.includes("bracket")) return "bracket";
  if (s.includes("award") || s.includes("special")) return "awards";
  if (s.includes("-match-")) return "stats";
  return null;
}

function parseTeamCodeFromSlug(slug: string): string {
  const parts = slugParts(slug);
  const wcIdx = parts.indexOf("cup");
  if (wcIdx >= 0 && parts[wcIdx + 1] && parts[wcIdx + 1] !== "group" && parts[wcIdx + 1] !== "match") {
    const candidate = parts[wcIdx + 1];
    if (!["round", "quarter", "winner", "bracket", "award", "special"].includes(candidate)) {
      return candidate;
    }
  }
  for (const part of parts) {
    if (part.length >= 2 && part.length <= 4 && /^[a-z]{2,4}$/.test(part)) {
      if (!["cup", "world", "group", "match", "round", "final", "award"].includes(part)) {
        return part;
      }
    }
  }
  return "";
}

function teamNameFromRow(row: MarketRow, teamCode: string): string {
  const title = row.title?.trim();
  if (title) {
    const howFar = title.match(/how far will (.+?) go/i);
    if (howFar?.[1]) return howFar[1].trim();
    return title;
  }
  if (row.subtitle?.trim()) return row.subtitle.trim();
  return teamCode ? teamCode.toUpperCase() : "Team";
}

function toWorldCupStatus(row: MarketRow): WorldCupMarketStatus {
  const lifecycle = inferMarketCardLifecycle(row);
  if (lifecycle === "open") return "open";
  if (lifecycle === "lock") return "locked";
  if (lifecycle === "resolve") return "resolved";
  if (lifecycle === "setup") return "setup";
  return "syncing";
}

function impliedChampionPercent(row: MarketRow): number | null {
  const views = row.outcomes ?? [];
  const champion = views.find((o) => o.outcomeIndex === 6);
  if (!champion?.impliedProbabilityE6) return null;
  const e6 = Number(champion.impliedProbabilityE6);
  if (!Number.isFinite(e6)) return null;
  return Math.round(e6 / 10_000);
}

export function parseWorldCupMarket(row: MarketRow): WorldCupParsedMarket {
  const teamCode = parseTeamCodeFromSlug(row.slug);
  return {
    row,
    templateId: row.templateId,
    slug: row.slug,
    teamCode,
    teamName: teamNameFromRow(row, teamCode),
    group: parseGroupFromSlug(row.slug),
    stage: parseStageFromSlug(row.slug),
    marketType: "LADDER",
    lockTime: null,
    status: toWorldCupStatus(row),
    route: chainDetailPath(row.templateId),
  };
}

export function deriveWorldCupGroups(rows: MarketRow[]): WorldCupGroup[] {
  const progression = filterWorldCupProgressionMarkets(rows).map(parseWorldCupMarket);
  const byGroup = new Map<string, WorldCupTeam[]>();

  for (const market of progression) {
    const groupLetter = market.group ?? "—";
    const team: WorldCupTeam = {
      code: market.teamCode || market.slug,
      name: market.teamName,
      group: market.group,
      market,
      predictionPercent: impliedChampionPercent(market.row),
    };
    const existing = byGroup.get(groupLetter) ?? [];
    existing.push(team);
    byGroup.set(groupLetter, existing);
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, teams]) => ({
      letter,
      teams: teams.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function parseMatchFromSlug(row: MarketRow): WorldCupMatch | null {
  const slug = row.slug.toLowerCase();
  const vsMatch = slug.match(/world-cup-([a-z]{2,4})-vs-([a-z]{2,4})/);
  if (!vsMatch) return null;
  const [, code1, code2] = vsMatch;
  const group = parseGroupFromSlug(row.slug);
  return {
    id: row.templateId,
    group: group ? `Group ${group}` : "Match",
    date: row.subtitle?.trim() || "TBD",
    team1: {
      name: code1.toUpperCase(),
      code: code1,
      percent: null,
      templateId: row.templateId,
    },
    team2: {
      name: code2.toUpperCase(),
      code: code2,
      percent: null,
      templateId: row.templateId,
    },
    templateId: row.templateId,
  };
}

export function deriveWorldCupMatches(rows: MarketRow[]): WorldCupMatch[] {
  return filterWorldCupMatchMarkets(rows)
    .map(parseMatchFromSlug)
    .filter((m): m is WorldCupMatch => m != null);
}

export function deriveWorldCupGroupStats(rows: MarketRow[], groupId?: string): WorldCupGroupStats[] {
  const groups = deriveWorldCupGroups(rows);
  const matches = deriveWorldCupMatches(rows);
  const filtered = groupId ? groups.filter((g) => g.letter === groupId) : groups;

  return filtered.map((group) => {
    const standings: WorldCupGroupStanding[] = group.teams.map((team) => ({
      teamCode: team.code,
      teamName: team.name,
      played: null,
      won: null,
      drawn: null,
      lost: null,
      goalsFor: null,
      goalsAgainst: null,
      points: null,
      predictionPercent: team.predictionPercent,
      templateId: team.market?.templateId ?? null,
    }));

    const upcomingMatches = matches.filter((m) =>
      group.letter === "—" ? true : m.group.toUpperCase().includes(group.letter),
    );

    return {
      group: group.letter,
      standings,
      upcomingMatches,
    };
  });
}

export function findWorldCupMarketByTeam(rows: MarketRow[], teamCode: string): WorldCupParsedMarket | null {
  const normalized = teamCode.toLowerCase();
  const match = filterWorldCupProgressionMarkets(rows).find((row) => {
    const parsed = parseWorldCupMarket(row);
    return parsed.teamCode.toLowerCase() === normalized;
  });
  return match ? parseWorldCupMarket(match) : null;
}

export function filterMarketsByStage(rows: MarketRow[], stage: WorldCupStage): WorldCupParsedMarket[] {
  return filterWorldCupProgressionMarkets(rows)
    .map(parseWorldCupMarket)
    .filter((m) => {
      if (stage === "group-stage") return m.stage === "group-stage" || m.stage === null;
      if (stage === "round-of-32") return m.stage === "round-of-32" || m.stage === null;
      if (stage === "quarter-final") return m.stage === "quarter-final" || m.stage === null;
      if (stage === "winner") return m.stage === "winner" || m.stage === null;
      return true;
    });
}

export function deriveWorldCupAwardMarkets(rows: MarketRow[]): MarketRow[] {
  return filterWorldCupAwardMarkets(rows);
}

export function hasAnyWorldCupMarkets(rows: MarketRow[]): boolean {
  return rows.some(isWorldCupMarket);
}
