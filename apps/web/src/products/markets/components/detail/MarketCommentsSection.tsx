import { useState, useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import {
  Smile,
  Heart,
  MessageSquare,
  ChevronDown,
  ShieldAlert,
  ArrowUp,
  MoreHorizontal,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  UserCheck,
  CheckCircle2,
  Users,
  Activity,
  Award,
} from "lucide-react";

interface CommentItem {
  id: string;
  author: string;
  avatarGradient: string;
  timeAgo: string;
  text: string;
  likes: number;
  liked?: boolean;
  positionBadge?: {
    type: "YES" | "NO" | "WHALE";
    label: string;
    amount?: string;
  };
  replies?: CommentItem[];
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
  const [sortBy, setSortBy] = useState<"newest" | "top" | "holders">("newest");
  const [filterHoldersOnly, setFilterHoldersOnly] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({
    "1": true,
  });

  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: "1",
      author: "Timeforbottle",
      avatarGradient: "from-blue-500 to-indigo-600",
      timeAgo: "16m ago",
      text: "Is anyone tracking the 5-min TWAP oracle feed directly from Chainlink? Order book depth on YES is climbing rapidly right before settlement.",
      likes: 8,
      liked: false,
      positionBadge: {
        type: "YES",
        label: "YES Holder",
        amount: "$8.4k",
      },
      replies: [
        {
          id: "1-1",
          author: "Adityamishra",
          avatarGradient: "from-purple-500 to-pink-500",
          timeAgo: "14m ago",
          text: "@Timeforbottle Yes, watching the Pyth / Chainlink consensus delta. The spread is tightening to less than 0.02%.",
          likes: 3,
          positionBadge: {
            type: "YES",
            label: "YES Holder",
          },
        },
        {
          id: "1-2",
          author: "Gautam-Jangid",
          avatarGradient: "from-emerald-500 to-teal-600",
          timeAgo: "7m ago",
          text: "@Adityamishra Nice catch, volume momentum just crossed 1.8M shares.",
          likes: 2,
        },
      ],
    },
    {
      id: "2",
      author: "CryptoAlpha99",
      avatarGradient: "from-amber-500 to-orange-600",
      timeAgo: "25m ago",
      text: "Chainlink TWAP looks strong heading into the next 5-min candle. Holding YES with high conviction, target price is well above the beat threshold.",
      likes: 12,
      liked: true,
      positionBadge: {
        type: "YES",
        label: "Top 5% YES",
        amount: "$15.2k",
      },
    },
    {
      id: "3",
      author: "WhaleHunter_X",
      avatarGradient: "from-cyan-500 to-blue-600",
      timeAgo: "42m ago",
      text: "Massive liquidity influx in the last 15 mins. Volume already crossed $1.2M. Watching for potential volatility spikes.",
      likes: 19,
      liked: false,
      positionBadge: {
        type: "WHALE",
        label: "Whale Trader",
        amount: "$45.0k",
      },
    },
    {
      id: "4",
      author: "SatoshiConsensus",
      avatarGradient: "from-rose-500 to-red-600",
      timeAgo: "1h ago",
      text: "Be careful with high leverage on tight range markets. Setting limit bids at 0.48 to capture mean reversion.",
      likes: 5,
      liked: false,
      positionBadge: {
        type: "NO",
        label: "NO Holder",
        amount: "$4.1k",
      },
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
    {
      rank: 4,
      address: "0xb471...229f",
      handle: "ArbitrageApex",
      avatarGradient: "from-amber-600 to-orange-500",
      outcome: "YES",
      shares: 24500,
      avgPrice: 0.60,
      valueUsd: 15190.0,
      pnlUsd: 490.0,
      pnlPercent: 3.3,
    },
    {
      rank: 5,
      address: "0x6f03...810a",
      handle: "SatoshiConsensus",
      avatarGradient: "from-rose-600 to-pink-600",
      outcome: "NO",
      shares: 19800,
      avgPrice: 0.39,
      valueUsd: 7524.0,
      pnlUsd: -792.0,
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
    {
      id: "act-4",
      type: "BUY_YES",
      trader: "0xb471...229f",
      shares: 8500,
      price: 0.61,
      totalUsd: 5185.0,
      timeAgo: "1m ago",
    },
    {
      id: "act-5",
      type: "BUY_NO",
      trader: "0x6f03...810a",
      shares: 3200,
      price: 0.39,
      totalUsd: 1248.0,
      timeAgo: "3m ago",
    },
  ];

  // Quick Emoji Insertion list
  const quickEmojis = ["🔥", "🚀", "📈", "📉", "👀", "💎", "🤝", "✅"];

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
      positionBadge: {
        type: "YES",
        label: "Verified Trader",
      },
    };

    setComments([newComment, ...comments]);
    setNewCommentText("");
    setShowEmojiPicker(false);
  };

  const handlePostReply = (parentId: string) => {
    if (!replyText.trim()) return;

    const newReply: CommentItem = {
      id: `${parentId}-${Date.now()}`,
      author: "You (Trader)",
      avatarGradient: "from-blue-600 to-cyan-500",
      timeAgo: "Just now",
      text: replyText.trim(),
      likes: 0,
      positionBadge: {
        type: "YES",
        label: "Verified Trader",
      },
    };

    setComments((list) =>
      list.map((c) => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...(c.replies ?? []), newReply],
          };
        }
        return c;
      }),
    );

    setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
    setReplyText("");
    setActiveReplyId(null);
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

  const toggleReplies = (id: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredComments = useMemo(() => {
    let list = [...comments];
    if (filterHoldersOnly) {
      list = list.filter((c) => Boolean(c.positionBadge));
    }
    if (sortBy === "top") {
      list.sort((a, b) => b.likes - a.likes);
    }
    return list;
  }, [comments, filterHoldersOnly, sortBy]);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 sm:p-6 shadow-2xl transition-all space-y-5">
      {/* Top Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-3.5">
        <div className="flex items-center gap-6 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={cn(
              "flex items-center gap-2 pb-1.5 transition-all cursor-pointer",
              activeTab === "comments"
                ? "text-white border-b-2 border-blue-500 font-black"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span>Discussion ({comments.length + 2})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("holders")}
            className={cn(
              "flex items-center gap-2 pb-1.5 transition-all cursor-pointer",
              activeTab === "holders"
                ? "text-white border-b-2 border-blue-500 font-black"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <Award className="h-4 w-4 text-amber-400" />
            <span>Top Holders</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("positions")}
            className={cn(
              "flex items-center gap-2 pb-1.5 transition-all cursor-pointer",
              activeTab === "positions"
                ? "text-white border-b-2 border-blue-500 font-black"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>Your Position</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={cn(
              "flex items-center gap-2 pb-1.5 transition-all cursor-pointer",
              activeTab === "activity"
                ? "text-white border-b-2 border-blue-500 font-black"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <Activity className="h-4 w-4 text-purple-400" />
            <span>Live Trades</span>
          </button>
        </div>

        {/* Live Badge Indicator */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono font-bold text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Discussion Live</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. COMMENTS & DISCUSSION TAB */}
      {/* ========================================================================= */}
      {activeTab === "comments" && (
        <div className="space-y-4">
          {/* Add a Comment Box */}
          <form
            onSubmit={handlePostComment}
            className="rounded-2xl border border-white/10 bg-[#080D18] p-4 shadow-lg focus-within:border-blue-500/60 transition-all"
          >
            <div className="flex items-start gap-3">
              {/* User Avatar */}
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 shrink-0 flex items-center justify-center font-bold text-white text-xs border border-white/10 shadow-md">
                YOU
              </div>

              <div className="flex-1 min-w-0">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Share your market analysis, consensus thesis, or prediction strategy..."
                  className="w-full resize-none bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none leading-relaxed"
                />

                {/* Quick Emoji Bar (Collapsible) */}
                {showEmojiPicker && (
                  <div className="flex items-center gap-1.5 pt-2 pb-1 border-t border-white/5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Quick:</span>
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCommentText((prev) => prev + emoji)}
                        className="rounded-md bg-white/5 hover:bg-white/15 px-2 py-0.5 text-xs transition-colors cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2.5">
                  <div className="flex items-center gap-2 text-slate-400">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      title="Toggle quick emoji"
                      className={cn(
                        "rounded-lg p-1.5 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold",
                        showEmojiPicker ? "bg-white/10 text-amber-400" : "hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Smile className="h-4 w-4" />
                      <span className="text-[11px]">Emoji</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Post Comment</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Comment Filters & Safety Notice */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px]">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-slate-900 text-white">Newest First</option>
                  <option value="top" className="bg-slate-900 text-white">Most Liked</option>
                </select>
              </div>

              {/* Holders Only Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={filterHoldersOnly}
                  onChange={(e) => setFilterHoldersOnly(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Holders Only</span>
              </label>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Beware of impersonators &amp; unverified links.</span>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 pt-1">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3.5 sm:p-4 hover:bg-white/[0.03] transition-all space-y-2.5"
              >
                {/* Main Comment Row */}
                <div className="flex items-start gap-3 text-xs">
                  {/* User Avatar */}
                  <div
                    className={cn(
                      "h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr shrink-0 shadow-md flex items-center justify-center font-bold text-white text-[11px] border border-white/10",
                      comment.avatarGradient,
                    )}
                  >
                    {comment.author.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header: Author + Position Badge + Time */}
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs sm:text-sm">{comment.author}</span>

                        {/* Conviction / Position Badge */}
                        {comment.positionBadge && (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold border",
                              comment.positionBadge.type === "YES"
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : comment.positionBadge.type === "NO"
                                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                                  : "bg-purple-500/15 border-purple-500/30 text-purple-300",
                            )}
                          >
                            {comment.positionBadge.label}
                            {comment.positionBadge.amount ? ` · ${comment.positionBadge.amount}` : ""}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 font-mono">{comment.timeAgo}</span>
                      </div>

                      <button
                        type="button"
                        title="Options"
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Text Body */}
                    <p className="mt-1.5 text-slate-200 text-xs sm:text-sm leading-relaxed font-normal">
                      {comment.text}
                    </p>

                    {/* Action Bar (Like, Reply, View Sub-threads) */}
                    <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleLike(comment.id)}
                        className={cn(
                          "flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-0.5",
                          comment.liked ? "text-rose-400 font-bold" : "",
                        )}
                      >
                        <Heart className={cn("h-3.5 w-3.5", comment.liked ? "fill-rose-400 text-rose-400" : "")} />
                        <span>{comment.likes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                          setReplyText(`@${comment.author} `);
                        }}
                        className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-0.5"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Reply</span>
                      </button>

                      {comment.replies && comment.replies.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleReplies(comment.id)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer py-0.5 ml-auto"
                        >
                          <span>{comment.replies.length} {comment.replies.length === 1 ? "Reply" : "Replies"}</span>
                          <span>{expandedReplies[comment.id] ? "▲" : "▼"}</span>
                        </button>
                      )}
                    </div>

                    {/* Inline Reply Input Box */}
                    {activeReplyId === comment.id && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-950/20 p-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to @${comment.author}...`}
                          className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none px-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handlePostReply(comment.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handlePostReply(comment.id)}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer shadow-sm"
                        >
                          Send
                        </button>
                      </div>
                    )}

                    {/* Nested Replies Thread */}
                    {comment.replies && expandedReplies[comment.id] && (
                      <div className="mt-3.5 pl-3.5 sm:pl-4 border-l-2 border-blue-500/30 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2.5 text-xs">
                            <div
                              className={cn(
                                "h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-tr shrink-0 shadow-sm flex items-center justify-center font-bold text-white text-[9px] border border-white/10",
                                reply.avatarGradient,
                              )}
                            >
                              {reply.author.slice(0, 2).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-xs">{reply.author}</span>
                                {reply.positionBadge && (
                                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-1 py-0.2 text-[9px] font-mono font-bold">
                                    {reply.positionBadge.label}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono">{reply.timeAgo}</span>
                              </div>

                              <p className="mt-0.5 text-slate-200 text-xs leading-relaxed font-normal">
                                {reply.text.split(" ").map((word, idx) => {
                                  if (word.startsWith("@")) {
                                    return (
                                      <span key={idx} className="text-blue-400 font-bold mr-1">
                                        {word}{" "}
                                      </span>
                                    );
                                  }
                                  return word + " ";
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
      {/* 2. TOP HOLDERS LEADERBOARD TAB */}
      {/* ========================================================================= */}
      {activeTab === "holders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Showing top liquidity providers and high conviction position holders</span>
            <span className="font-mono text-[11px] text-slate-500">Updated Real-Time</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.01]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3">Rank &amp; Trader</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3 font-mono">Shares</th>
                  <th className="px-4 py-3 font-mono">Avg Price</th>
                  <th className="px-4 py-3 font-mono">Position Value</th>
                  <th className="px-4 py-3 text-right font-mono">Unrealized PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {topHolders.map((holder) => (
                  <tr key={holder.rank} className="hover:bg-white/[0.02] transition-colors">
                    {/* Rank & Trader */}
                    <td className="px-4 py-3.5 flex items-center gap-3">
                      <span className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black font-mono",
                        holder.rank === 1 ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" :
                        holder.rank === 2 ? "bg-slate-300/20 text-slate-200 border border-slate-300/40" :
                        holder.rank === 3 ? "bg-amber-700/20 text-amber-500 border border-amber-700/40" : "text-slate-500"
                      )}>
                        #{holder.rank}
                      </span>
                      <div className={cn("h-7 w-7 rounded-full bg-gradient-to-tr shrink-0 flex items-center justify-center text-[10px] font-bold text-white", holder.avatarGradient)}>
                        {holder.handle.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white">{holder.handle}</div>
                        <div className="font-mono text-[10px] text-slate-500">{holder.address}</div>
                      </div>
                    </td>

                    {/* Outcome Side */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-bold font-mono",
                          holder.outcome === "YES"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                        )}
                      >
                        {holder.outcome}
                      </span>
                    </td>

                    {/* Shares */}
                    <td className="px-4 py-3.5 font-mono font-medium text-slate-200">
                      {holder.shares.toLocaleString()}
                    </td>

                    {/* Avg Price */}
                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      ${holder.avgPrice.toFixed(2)}
                    </td>

                    {/* Total Position Value */}
                    <td className="px-4 py-3.5 font-mono font-bold text-white">
                      ${holder.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* PnL */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold">
                      <span className={holder.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {holder.pnlUsd >= 0 ? "+" : ""}${holder.pnlUsd.toFixed(2)} ({holder.pnlPercent >= 0 ? "+" : ""}{holder.pnlPercent.toFixed(1)}%)
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
      {/* 3. YOUR POSITION OVERVIEW TAB */}
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

          <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
            <div>
              <div className="font-bold text-white text-sm">Automated Settlement</div>
              <div className="text-xs text-slate-400">When market resolves, proceeds are directly credited to your tradeable balance.</div>
            </div>
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              Adjust Order
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LIVE ON-CHAIN TRADES ACTIVITY TAB */}
      {/* ========================================================================= */}
      {activeTab === "activity" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Streaming real-time order fills from CLOB matching engine</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-emerald-400 font-bold">Live Stream</span>
            </div>
          </div>

          <div className="space-y-2">
            {liveActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 hover:bg-white/[0.03] transition-all text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-mono font-black text-[11px] border shrink-0",
                      act.type === "BUY_YES"
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        : act.type === "BUY_NO"
                          ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                          : "bg-amber-500/20 border-amber-500/40 text-amber-400",
                    )}
                  >
                    {act.type.replace("_", " ")}
                  </span>
                  <div>
                    <span className="font-bold text-white font-mono">{act.trader}</span>
                    <span className="text-slate-500 text-[11px] font-mono ml-2">{act.timeAgo}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-bold text-white text-xs sm:text-sm">${act.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="text-[10px] text-slate-400">{act.shares.toLocaleString()} shares @ ${act.price.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

