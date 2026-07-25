import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";

interface TimelineSectionProps {
  expiry?: string;
}

const TimelineSection = ({ expiry }: TimelineSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon name="calendar_today" className="text-muted-foreground" />
          <span className="font-bold text-foreground">Timeline and payout</span>
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
            <div className="px-6 pb-6 space-y-4">
              {/* Timeline Items */}
              <div className="relative pl-6 border-l-2 border-accent-green/30 space-y-4">
                <div className="relative">
                  <div className="absolute -left-[25px] size-4 rounded-full bg-accent-green border-2 border-background flex items-center justify-center">
                    <Icon name="check" className="text-[8px] text-background" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Market open</div>
                    <div className="text-xs text-muted-foreground">Aug 13, 2025 · 1:30pm EDT</div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[25px] size-4 rounded-full bg-secondary border-2 border-border" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Market closes</div>
                    <div className="text-xs text-muted-foreground">After the outcome occurs</div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[25px] size-4 rounded-full bg-secondary border-2 border-border" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Projected payout</div>
                    <div className="text-xs text-muted-foreground">30 minutes after closing</div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 p-3 bg-secondary/30 rounded-lg">
                This market will close and expire early following the official outcome. Otherwise, it closes by {expiry || "the specified end date"}.
              </p>

              <p className="text-xs text-muted-foreground">
                At most one outcome can resolve to "Yes". When buying or selling "No" across multiple outcomes, you may receive collateral returns.{" "}
                <span className="text-accent-cyan cursor-pointer hover:underline">Learn more</span>
              </p>

              {/* Market IDs */}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground/50 pt-2 border-t border-border/30">
                <span>Series KXMARKET</span>
                <span>Event KXMARKET-01</span>
                <span>Market KXMARKET-01-001</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimelineSection;
