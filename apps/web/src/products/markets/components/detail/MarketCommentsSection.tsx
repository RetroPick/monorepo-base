import { useState, useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import {
  Smile,
  Heart,
  ChevronDown,
  Shield,
  ArrowUp,
  MoreHorizontal,
  Image as ImageIcon,
} from "lucide-react";

interface CommentItem {
  id: string;
  author: string;
  avatarGradient: string;
  timeAgo: string;
  text: string;
  likes: number;
  liked?: boolean;
  positionBadge?: string;
  badgeColor?: "red" | "green" | "blue";
}

interface TopHolder {
  rank: number;
  address: string;
  handle: string;
  avatarGradient: string;
  outcome: "YES" | "NO";
  shares: number;
  avgPrice: number;
  valueUsd: number;
  pnlUsd: number;
  pnlPercent: number;
}

interface LiveTradeActivity {
  id: string;
  type: "BUY_YES" | "BUY_NO" | "SELL_YES" | "SELL_NO";
  trader: string;
  shares: number;
  price: number;
  totalUsd: number;
  timeAgo: string;
}

export function MarketCommentsSection({ marketQuestion = "Market" }: { marketQuestion?: string }) {
  const [activeTab, setActiveTab] = useState<"comments" | "holders" | "positions" | "activity">("comments");
  const [filterHoldersOnly, setFilterHoldersOnly] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: "1",
      author: "flashback3",
      avatarGradient: "from-yellow-400 via-amber-500 to-rose-400",
      timeAgo: "24m ago",
      text: "perp access. - 011mp36k",
      likes: 0,
      liked: false,
    },
    {
      id: "2",
      author: "milkthedip",
      avatarGradient: "from-emerald-500 to-green-600",
      timeAgo: "5h ago",
      text: "Same teams will fight for the trophy - Psg, Bayern, Arsenal",
      likes: 0,
      liked: false,
      positionBadge: "2.5K Barcelona",
      badgeColor: "red",
    },
    {
      id: "3",
      author: "Liss.",
      avatarGradient: "from-slate-200 via-slate-400 to-slate-600",
      timeAgo: "22h ago",
      text: "Dont want to lose guys😩",
      likes: 0,
      liked: false,
    },
    {
      id: "4",
      author: "CryptoAlpha99",
      avatarGradient: "from-amber-500 to-orange-600",
      timeAgo: "1d ago",
      text: "Chainlink TWAP oracle feed looks super stable heading into the final 5-min candle.",
      likes: 4,
      liked: true,
      positionBadge: "Holding YES",
      badgeColor: "green",
    },
    {
      id: "5",
      author: "WhaleHunter_X",
      avatarGradient: "from-cyan-500 to-blue-600",
      timeAgo: "2d ago",
      text: "Volume momentum already crossed $1.2M. Watching the order book spread closely.",
      likes: 7,
      liked: false,
      positionBadge: "Whale Trader",
      badgeColor: "blue",
    },
  ]);

  // Top Holders Dataset
  const topHolders: TopHolder[] = [
    {
      rank: 1,
      address: "0x7a8f...39b1",
      handle: "Whale_Alpha",
      avatarGradient: "from-purple-600 to-indigo-600",
      outcome: "YES",
      shares: 78500,
      avgPrice: 0.58,
      valueUsd: 48670.0,
      pnlUsd: 7065.0,
      pnlPercent: 17.0,
    },
    {
      rank: 2,
      address: "0x3e19...c402",
      handle: "DeFi_Ninja",
      avatarGradient: "from-blue-600 to-cyan-500",
      outcome: "YES",
      shares: 45200,
      avgPrice: 0.54,
      valueUsd: 28024.0,
      pnlUsd: 3616.0,
      pnlPercent: 14.8,
    },
    {
      rank: 3,
      address: "0x91d2...aa88",
      handle: "QuantMacroFund",
      avatarGradient: "from-emerald-600 to-teal-500",
      outcome: "NO",
      shares: 38000,
      avgPrice: 0.42,
      valueUsd: 14440.0,
      pnlUsd: -1520.0,
      pnlPercent: -9.5,
    },
  ];

  // Live Activity Dataset
  const liveActivity: LiveTradeActivity[] = [
    {
      id: "act-1",
      type: "BUY_YES",
      trader: "0x7a8f...39b1",
      shares: 5000,
      price: 0.62,
      totalUsd: 3100.0,
      timeAgo: "4s ago",
    },
    {
      id: "act-2",
      type: "BUY_YES",
      trader: "0x3e19...c402",
      shares: 2400,
      price: 0.62,
      totalUsd: 1488.0,
      timeAgo: "18s ago",
    },
    {
      id: "act-3",
      type: "SELL_NO",
      trader: "0x91d2...aa88",
      shares: 4000,
      price: 0.38,
      totalUsd: 1520.0,
      timeAgo: "42s ago",
    },
  ];

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: CommentItem = {
      id: String(Date.now()),
      author: "You (Trader)",
      avatarGradient: "from-blue-600 to-cyan-500",
      timeAgo: "Just now",
      text: newCommentText.trim(),
      likes: 0,
    };

    setComments([newComment, ...comments]);
    setNewCommentText("");
  };

  const handleLike = (id: string) => {
    setComments((list) =>
      list.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            liked: !c.liked,
            likes: c.liked ? c.likes - 1 : c.likes + 1,
          };
        }
        return c;
      }),
    );
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredComments = useMemo(() => {
    if (filterHoldersOnly) {
      return comments.filter((c) => Boolean(c.positionBadge));
    }
    return comments;
  }, [comments, filterHoldersOnly]);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-5 sm:p-6 shadow-2xl transition-all space-y-4">
      {/* Top Tab Navigation Header */}
      <div className="flex items-center gap-6 border-b border-white/[0.06] pb-3 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("comments")}
          className={cn(
            "pb-1 transition-all cursor-pointer",
            activeTab === "comments"
              ? "text-white font-extrabold"
              : "text-slate-400 hover:text-slate-200 font-semibold",
          )}
        >
          Comments ({comments.length + 12})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("holders")}
          className={cn(
            "pb-1 transition-all cursor-pointer",
            activeTab === "holders"
              ? "text-white font-extrabold"
              : "text-slate-400 hover:text-slate-200 font-semibold",
          )}
        >
          Top Holders
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("positions")}
          className={cn(
            "pb-1 transition-all cursor-pointer",
            activeTab === "positions"
              ? "text-white font-extrabold"
              : "text-slate-400 hover:text-slate-200 font-semibold",
          )}
        >
          Positions
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={cn(
            "pb-1 transition-all cursor-pointer",
            activeTab === "activity"
              ? "text-white font-extrabold"
              : "text-slate-400 hover:text-slate-200 font-semibold",
          )}
        >
          Activity
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. COMMENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === "comments" && (
        <div className="space-y-4">
          {/* Simple Capsule Comment Input Bar */}
          <form
            onSubmit={handlePostComment}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#080D18] px-4 py-2.5 shadow-inner focus-within:border-blue-500/60 transition-all"
          >
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />

            <div className="flex items-center gap-2.5 text-slate-400 shrink-0">
              <button
                type="button"
                title="Add emoji"
                onClick={() => setNewCommentText((prev) => prev + "🔥 ")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <Smile className="h-4 w-4" />
              </button>

              <button
                type="button"
                title="Attach image"
                className="hover:text-white transition-colors cursor-pointer"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="rounded-lg bg-blue-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all cursor-pointer shadow-sm shadow-blue-600/30"
              >
                Post
              </button>
            </div>
          </form>

          {/* Filters & Safety Notice */}
          <div className="flex items-center justify-between gap-3 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="flex items-center gap-1 font-bold text-white hover:text-slate-300 transition-colors cursor-pointer"
              >
                <span>Newest</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={filterHoldersOnly}
                  onChange={(e) => setFilterHoldersOnly(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Holders</span>
              </label>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/[0.03] border border-white/5 px-3 py-1 rounded-full">
              <Shield className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Beware of external links.</span>
            </div>
          </div>

          {/* Minimalist Comments List */}
          <div className="space-y-4 pt-2">
            {filteredComments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 text-xs">
                {/* User Avatar Circle */}
                <div
                  className={cn(
                    "h-9 w-9 rounded-full bg-gradient-to-tr shrink-0 shadow-sm flex items-center justify-center font-bold text-white text-[11px]",
                    comment.avatarGradient,
                  )}
                >
                  {comment.author.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header: Author + Position Badge + TimeAgo + Options */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs sm:text-sm">{comment.author}</span>

                      {comment.positionBadge && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium border",
                            comment.badgeColor === "red"
                              ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                              : comment.badgeColor === "green"
                                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                                : "bg-blue-950/40 border-blue-500/30 text-blue-300",
                          )}
                        >
                          {comment.positionBadge}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 font-mono">{comment.timeAgo}</span>
                    </div>

                    <button
                      type="button"
                      title="Options"
                      className="text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Body Text */}
                  <p className="mt-1 text-slate-200 text-xs sm:text-[13px] leading-relaxed font-normal">
                    {comment.text}
                  </p>

                  {/* Like Button */}
                  <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleLike(comment.id)}
                      className={cn(
                        "flex items-center gap-1 hover:text-white transition-colors cursor-pointer py-0.5",
                        comment.liked ? "text-rose-400 font-bold" : "",
                      )}
                    >
                      <Heart className={cn("h-3.5 w-3.5", comment.liked ? "fill-rose-400 text-rose-400" : "")} />
                      <span>{comment.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Floating Back to Top Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#162035] px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-lg"
            >
              <span>Back to top</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOP HOLDERS TAB */}
      {/* ========================================================================= */}
      {activeTab === "holders" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.01]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3">Rank &amp; Trader</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3 font-mono">Shares</th>
                  <th className="px-4 py-3 font-mono">Position Value</th>
                  <th className="px-4 py-3 text-right font-mono">Unrealized PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {topHolders.map((holder) => (
                  <tr key={holder.rank} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5 flex items-center gap-3">
                      <span className="text-slate-500 font-mono font-bold text-xs">#{holder.rank}</span>
                      <div className={cn("h-7 w-7 rounded-full bg-gradient-to-tr shrink-0 flex items-center justify-center text-[10px] font-bold text-white", holder.avatarGradient)}>
                        {holder.handle.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white">{holder.handle}</div>
                        <div className="font-mono text-[10px] text-slate-500">{holder.address}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[11px] font-bold font-mono",
                          holder.outcome === "YES"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400",
                        )}
                      >
                        {holder.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-medium text-slate-200">
                      {holder.shares.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-white">
                      ${holder.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold">
                      <span className={holder.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {holder.pnlUsd >= 0 ? "+" : ""}${holder.pnlUsd.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. YOUR POSITION TAB */}
      {/* ========================================================================= */}
      {activeTab === "positions" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Held Outcome</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-sm font-black font-mono text-emerald-400">
                  YES · 2,500 Shares
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Position Value</span>
              <div className="text-xl font-mono font-black text-white mt-1">
                $1,550.00
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Avg Entry: $0.54</span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unrealized PnL</span>
              <div className="text-xl font-mono font-black text-emerald-400 mt-1">
                +$200.00 (+14.8%)
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Current Price: $0.62</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ACTIVITY TAB */}
      {/* ========================================================================= */}
      {activeTab === "activity" && (
        <div className="space-y-2">
          {liveActivity.map((act) => (
            <div
              key={act.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 hover:bg-white/[0.03] transition-all text-xs"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded px-2 py-0.5 font-mono font-bold text-[11px] border shrink-0",
                    act.type === "BUY_YES"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-rose-500/20 border-rose-500/40 text-rose-400",
                  )}
                >
                  {act.type.replace("_", " ")}
                </span>
                <span className="font-bold text-white font-mono">{act.trader}</span>
                <span className="text-slate-500 text-[11px] font-mono">{act.timeAgo}</span>
              </div>

              <div className="text-right font-mono font-bold text-white">
                ${act.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


