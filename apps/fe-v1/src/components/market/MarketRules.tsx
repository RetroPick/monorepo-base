import Icon from "@/components/Icon";

interface MarketRulesProps {
  category: string;
}

const MarketRules = ({ category }: MarketRulesProps) => {
  const rules = [
    "This market will resolve according to the official outcome announcement from verified sources.",
    "Only official statements, press releases, or verified social media posts will count as resolution sources.",
    "Rumors, leaks, or \"sources say\" reports will NOT count towards resolution until confirmed officially.",
    "If an outcome is announced but subsequently reversed, this market resolves based on the initial confirmed event.",
    "Community reposts or speculation will not count toward resolution.",
  ];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Rules</h3>
      
      <ul className="space-y-3 text-sm text-muted-foreground">
        {rules.map((rule, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-accent-cyan mt-1">•</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <button className="mt-6 flex items-center gap-2 text-sm text-accent-cyan hover:text-accent-cyan/80 transition-colors">
        <Icon name="open_in_new" className="text-base" />
        See full rulebook
      </button>
    </div>
  );
};

export default MarketRules;
