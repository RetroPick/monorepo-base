import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";

interface MarketInsightsProps {
  marketTitle: string;
}

const MarketInsights = ({ marketTitle }: MarketInsightsProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const insightText = `No major announcements in the past week alter expectations for the nomination timeline, but sustained chatter around the leading candidate's recent media appearances—highlighting economic alignment with the administration—bolsters the current probability range. Historical patterns suggest a narrowing of the field by early next month. Secondary contenders remain strong if there's a pivot towards a more traditional stance, while other candidates' odds have dipped slightly due to recent commentary.`;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center">
            <Icon name="auto_awesome" className="text-white text-sm" />
          </div>
          <span className="font-bold text-foreground">AI-Powered Market Insights</span>
        </div>
        <Icon 
          name={isOpen ? "expand_less" : "expand_more"} 
          className="text-muted-foreground text-xl" 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 pb-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insightText}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-4 italic">
                Results are experimental.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketInsights;
