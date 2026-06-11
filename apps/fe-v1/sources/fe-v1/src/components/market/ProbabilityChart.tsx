
import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine
} from "recharts";
import Icon from "@/components/Icon";
import { MarketOutcome } from "@/types/market";
import { format, subDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface ProbabilityChartProps {
  outcomes: MarketOutcome[];
  volume: string;
  /** When true, removes the inner card frame so the chart blends into the parent (e.g. FeaturedMarket) */
  embedded?: boolean;
}

// --- Custom Candlestick Shape ---
const CandlestickShape = (props: any) => {
  const {
    x,
    y,
    width,
    height,
    low,
    high,
    open,
    close,
    fill // standard fill from the bar
  } = props;

  // We need to map values to Y pixels using the yAxis scale function passed potentially?
  // Actually, Recharts purely passes x,y,width,height based on the `dataKey`.
  // The `dataKey` for the Bar should be the `high` value to define the top of the wick, 
  // but that doesn't help with the bottom.

  // WORKAROUND: In Recharts, custom shapes receive the `yAxis` scale function if inside a customized component, 
  // but in `Bar.shape`, it receives pixel values for the MAIN dataKey.
  // We need the Y-Scale to calculate the pixel positions for Open, Close, Low.
  // The props usually contain `yAxis` which has the `scale` function.

  const { yAxis } = props;
  const scale = yAxis?.scale;

  if (!scale) return null;

  const yHigh = scale(high);
  const yLow = scale(low);
  const yOpen = scale(open);
  const yClose = scale(close);

  const isUp = close >= open;
  const color = isUp ? "#10B981" : "#EF4444"; // Green / Red
  const wickWidth = 2;
  const bodyWidth = Math.max(width * 0.6, 6);
  const xCenter = x + width / 2;

  return (
    <g>
      {/* Wick */}
      <line
        x1={xCenter}
        y1={yHigh}
        x2={xCenter}
        y2={yLow}
        stroke={color}
        strokeWidth={wickWidth}
      />
      {/* Body */}
      <rect
        x={xCenter - bodyWidth / 2}
        y={Math.min(yOpen, yClose)}
        width={bodyWidth}
        height={Math.max(Math.abs(yOpen - yClose), 1)} // Min height 1px
        fill={color}
        stroke="none"
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, label, mode }: any) => {
  if (active && payload && payload.length) {
    // Candle Mode Tooltip
    if (mode === 'candle') {
      const data = payload[0].payload;
      // Find which outcome is currently selected to show relevant OHLC
      // Actually the payload comes from the Bar, so it has the specific outcome data
      // We look for properties starting with the selected ID or just the raw ones passed
      // Since we render ONE bar, we can grab o/h/l/c from the data object directly if mapped correctly.

      // However, we mapped data such that `outcome_${id}_open` exists.
      // We need to know WHICH outcome is being hovered? 
      // Or we just grab the props that were passed to the Bar. 
      // Simplification: The data point has all fields. We display the one that matches the active `dataKey`?
      // Actually, we can pass "activeOutcome" to this component or context.
      // But `Recharts` renders this separately.

      // Let's rely on the `name` property of the payload which usually matches the outcome id/label.
      const name = payload[0].name; // "Outcome Label"
      const value = payload[0].value; // High?

      // Let's assume we pass the full OHLC in the data payload
      const o = data.open;
      const h = data.high;
      const l = data.low;
      const c = data.close;

      // Is it up or down?
      const isUp = c >= o;
      const color = isUp ? "#10B981" : "#EF4444";

      return (
        <div className="bg-background/90 backdrop-blur-xl border border-border/50 p-3 rounded-xl shadow-2xl text-xs font-mono">
          <div className="mb-2 text-muted-foreground">{label}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-muted-foreground">Open:</span> <span className={color}>{o.toFixed(1)}%</span>
            <span className="text-muted-foreground">High:</span> <span className={color}>{h.toFixed(1)}%</span>
            <span className="text-muted-foreground">Low:</span> <span className={color}>{l.toFixed(1)}%</span>
            <span className="text-muted-foreground">Close:</span> <span className={color}>{c.toFixed(1)}%</span>
          </div>
        </div>
      )
    }

    // Area Mode Tooltip (Existing)
    return (
      <div className="bg-background/80 backdrop-blur-xl border border-border/50 p-4 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <p className="text-xs text-muted-foreground font-mono mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: entry.color, color: entry.color }}
              />
              <span className="font-medium text-foreground">{entry.name}:</span>
              <span className="font-bold font-mono" style={{ color: entry.color }}>
                {Math.round(entry.value)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ProbabilityChart = ({ outcomes, volume, embedded = false }: ProbabilityChartProps) => {
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState<'area' | 'candle'>('area'); // Default to Area (Normal)
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>(outcomes[0]?.id);

  const ranges = ['1D', '1W', '1M', 'ALL'];

  // Ensure selected outcome is valid
  const currentOutcome = outcomes.find(o => o.id === selectedOutcomeId) || outcomes[0];

  // Generate mock data based on outcomes
  const chartData = useMemo(() => {
    const data = [];
    const points = 50;
    const now = new Date();

    const sortedOutcomes = [...outcomes].sort((a, b) => b.probability - a.probability).slice(0, 3);

    // Initial values for OHLC generation
    const currentValues: Record<string, number> = {};
    sortedOutcomes.forEach(o => currentValues[o.id] = o.probability);

    // We generate backwards from NOW
    for (let i = 0; i < points; i++) {
      const pointIndex = points - 1 - i; // 0 is oldest, 49 is newest
      const date = subDays(now, i);
      const dateStr = format(date, "MMM dd");

      const point: any = { date: dateStr };

      sortedOutcomes.forEach((outcome) => {
        // "Current" value in the loop (working backwards)
        const baseProb = currentValues[outcome.id];

        // Random daily movement
        const volatility = 4;
        const change = (Math.random() - 0.5) * volatility;
        const prevProb = Math.max(1, Math.min(99, baseProb - change)); // The "Close" of the previous day (or Open of this day if looking backwards)

        // Assign OHLC
        // Since we are iterating backwards:
        // The "Close" of this day is the baseProb.
        // The "Open" of this day is prevProb (calculated above).

        // High/Low
        const bodyMax = Math.max(baseProb, prevProb);
        const bodyMin = Math.min(baseProb, prevProb);
        const high = Math.min(100, bodyMax + Math.random() * 2);
        const low = Math.max(0, bodyMin - Math.random() * 2);

        // In our data array, we push to the front? Or direct index.
        // Let's create the array in order (Oldest -> Newest) to be easier.
        // But here I'm calculating backwards...

        // Let's update the "currentValues" for next iteration (which is previous day)
        currentValues[outcome.id] = prevProb;

        // Generate field names
        // For separate candle plotting, we need cleaner keys
        point[`outcome_${outcome.id}`] = baseProb; // For Area Chart (Close)
        point[`outcome_${outcome.id}_open`] = prevProb;
        point[`outcome_${outcome.id}_high`] = high;
        point[`outcome_${outcome.id}_low`] = low;
        point[`outcome_${outcome.id}_close`] = baseProb;
      });

      data.unshift(point); // Add to beginning (Oldest first)
    }

    // Standardize the outcome keys for the currently selected single-view candle
    // We Map `open`, `high`, `low`, `close` to the top level of the data object 
    // based on `selectedOutcomeId` to make the BarChart simpler.
    const candleData = data.map(d => ({
      ...d,
      open: d[`outcome_${selectedOutcomeId}_open`],
      high: d[`outcome_${selectedOutcomeId}_high`],
      low: d[`outcome_${selectedOutcomeId}_low`],
      close: d[`outcome_${selectedOutcomeId}_close`],
    }));

    return { data: candleData, topOutcomes: sortedOutcomes };
  }, [outcomes, selectedOutcomeId]);

  // Prepare data for the 2-bar approach (Body + Wick)
  const preparedCandleData = useMemo(() => {
    if (!chartData?.data) return [];
    return chartData.data.map(d => {
      const isUp = d.close >= d.open;
      return {
        ...d,
        // Ranges for the bars. [min, max]
        bodyRange: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
        wickRange: [d.low, d.high],
        color: isUp ? "#10B981" : "#EF4444"
      };
    });
  }, [chartData]);

  return (
    <div className={cn(
      "p-6",
      !embedded && "bg-card border border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-500"
    )}>

      {/* Header / Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">

        {/* Outcome Selector (Only for Candle View) */}
        {chartType === 'candle' ? (
          <div className="flex gap-2 bg-secondary/30 p-1 rounded-lg">
            {chartData.topOutcomes.map(outcome => (
              <button
                key={outcome.id}
                onClick={() => setSelectedOutcomeId(outcome.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                  selectedOutcomeId === outcome.id
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{
                  backgroundColor:
                    outcome.id === outcomes[0].id ? "#0EA5E9" :
                      outcome.id === outcomes[1]?.id ? "#10B981" : "#6B7280"
                }} />
                {outcome.label}
              </button>
            ))}
          </div>
        ) : (
          // Legend for Area View
          <div className="flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-wider">
            {chartData.topOutcomes.map((outcome, i) => (
              <div key={outcome.id} className="flex items-center gap-2 group cursor-default">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? "#0EA5E9" : i === 1 ? "#10B981" : "#6B7280" }} />
                <span className="text-muted-foreground">{outcome.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* View Toggle */}
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg">
          <button
            onClick={() => setChartType('area')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              chartType === 'area' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            title="Line Chart"
          >
            <Icon name="show_chart" className="text-lg" />
          </button>
          <button
            onClick={() => setChartType('candle')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              chartType === 'candle' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            title="Candlestick Chart"
          >
            <Icon name="candlestick_chart" className="text-lg" />
          </button>
        </div>
      </div>

      {/* Chart Render - transparent to blend with card, no inner square */}
      <div className="relative h-[300px] w-full mb-4 bg-transparent">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ background: 'transparent' }}>
              <defs>
                {chartData.topOutcomes.map((outcome, i) => {
                  const color = i === 0 ? "#0EA5E9" : i === 1 ? "#10B981" : "#6B7280";
                  return (
                    <linearGradient key={`gradient-${outcome.id}`} id={`gradient-${outcome.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.2} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} minTickGap={30} dy={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#888' }} domain={[0, 100]} dx={-10} />
              <Tooltip content={<CustomTooltip mode="area" />} />
              {chartData.topOutcomes.map((outcome, i) => {
                const color = i === 0 ? "#10B981" : i === 1 ? "#EF4444" : "#6B7280";
                return (
                  <Area
                    key={outcome.id}
                    type="monotone"
                    dataKey={`outcome_${outcome.id}`}
                    stroke={color}
                    fill={`url(#gradient-${outcome.id})`}
                    strokeWidth={2}
                  />
                )
              })}
            </AreaChart>
          ) : (
            <BarChart data={preparedCandleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ background: 'transparent' }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.2} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} minTickGap={30} dy={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#888' }} domain={[0, 100]} dx={-10} />
              <Tooltip content={<CustomTooltip mode="candle" />} cursor={{ fill: 'transparent' }} />

              {/* Wick (Thin Bar) */}
              <Bar dataKey="wickRange" barSize={2}>
                {preparedCandleData.map((entry: any, index: number) => (
                  <Cell key={`wick-${index}`} fill={entry.color} />
                ))}
              </Bar>

              {/* Body (Thick Bar) */}
              <Bar dataKey="bodyRange" barSize={8}>
                {preparedCandleData.map((entry: any, index: number) => (
                  <Cell key={`body-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between border-t border-border/30 pt-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-accent-green/10 flex items-center justify-center animate-pulse">
            <Icon name="attach_money" className="text-xs text-accent-green" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">24h Volume</span>
            <span className="text-sm font-bold text-foreground font-mono">{volume}</span>
          </div>
        </div>

        <div className="bg-secondary/30 p-1 rounded-xl flex items-center gap-1 backdrop-blur-sm">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${timeRange === range
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProbabilityChart;
