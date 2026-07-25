import { Link } from "react-router-dom";
import { chainDetailPath } from "@/lib/market-data/chainDiscover";
import { useWorldCupGroupStats } from "../hooks/useWorldCupGroupStats";
import WorldCupMatchCard from "./WorldCupMatchCard";
import WorldCupPredictionCard from "./WorldCupPredictionCard";
import { WorldCupEmptyState } from "./WorldCupEmptyState";
import { WorldCupFlagIcon } from "./WorldCupFlagIcon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function dash(n: number | null) {
  return n == null ? "—" : String(n);
}

export default function WorldCupStatsInfo() {
  const statsQ = useWorldCupGroupStats();
  const groups = statsQ.data ?? [];

  if (statsQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading group stats…</p>;
  }

  if (groups.length === 0) {
    return (
      <WorldCupEmptyState
        title="No group stats available"
        description="Group statistics populate when World Cup LADDER progression markets are indexed."
      />
    );
  }

  return (
    <section className="space-y-8" data-testid="world-cup-stats-info">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Stats &amp; Info</h2>
        <p className="text-sm text-muted-foreground">
          Group tables, team forecast percentages, and upcoming matches. Standings columns fill when the API exposes
          them.
        </p>
      </div>

      {groups.map((groupStats) => (
        <div key={groupStats.group} className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">Group {groupStats.group}</h3>
            {groupStats.standings[0]?.templateId ? (
              <Link
                to={chainDetailPath(groupStats.standings[0].templateId)}
                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                Predict Group Winner
              </Link>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead className="text-center">GF</TableHead>
                  <TableHead className="text-center">GA</TableHead>
                  <TableHead className="text-center">Pts</TableHead>
                  <TableHead className="text-right">Forecast</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupStats.standings.map((row) => (
                  <TableRow key={row.teamCode}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <WorldCupFlagIcon code={row.teamCode} />
                        <span className="font-medium text-foreground">{row.teamName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{dash(row.played)}</TableCell>
                    <TableCell className="text-center tabular-nums">{dash(row.won)}</TableCell>
                    <TableCell className="text-center tabular-nums">{dash(row.drawn)}</TableCell>
                    <TableCell className="text-center tabular-nums">{dash(row.lost)}</TableCell>
                    <TableCell className="text-center tabular-nums">{dash(row.goalsFor)}</TableCell>
                    <TableCell className="text-center tabular-nums">{dash(row.goalsAgainst)}</TableCell>
                    <TableCell className="text-center tabular-nums">{dash(row.points)}</TableCell>
                    <TableCell className="text-right tabular-nums text-primary">
                      {row.predictionPercent != null ? `${row.predictionPercent}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {groupStats.upcomingMatches.length > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Upcoming matches</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {groupStats.upcomingMatches.map((match) => (
                  <WorldCupMatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groupStats.standings.map((row) => (
              <WorldCupPredictionCard
                key={row.teamCode}
                teamCode={row.teamCode}
                teamName={row.teamName}
                templateId={row.templateId}
                predictionPercent={row.predictionPercent}
                subtitle="Tournament progression ladder"
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
