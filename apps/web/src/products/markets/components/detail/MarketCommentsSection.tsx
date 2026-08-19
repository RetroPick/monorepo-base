import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import {
  Smile,
  Paperclip,
  Heart,
  MessageSquare,
  ChevronDown,
  ShieldAlert,
  ArrowUp,
  MoreHorizontal,
} from "lucide-react";

interface CommentItem {
  id: string;
  author: string;
  avatarGradient: string;
  timeAgo: string;
  text: string;
  likes: number;
  liked?: boolean;
  replies?: CommentItem[];
}

export function MarketCommentsSection({ marketQuestion = "Market" }: { marketQuestion?: string }) {
  const [activeTab, setActiveTab] = useState<"comments" | "holders" | "positions" | "activity">("comments");
  const [filterHoldersOnly, setFilterHoldersOnly] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({
    "1": true,
  });

  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: "1",
      author: "Timeforbottle",
      avatarGradient: "from-blue-500 to-indigo-600",
      timeAgo: "16m ago",
      text: "is anyone using any tools to see the chart more precisely? please share.",
      likes: 0,
      replies: [
        {
          id: "1-1",
          author: "Adityamishra",
          avatarGradient: "from-purple-500 to-pink-500",
          timeAgo: "14m ago",
          text: "@Timeforbottle i have",
          likes: 0,
        },
        {
          id: "1-2",
          author: "Gautam-Jangid",
          avatarGradient: "from-emerald-500 to-teal-600",
          timeAgo: "7m ago",
          text: "@Adityamishra heey , what is the name of the tool",
          likes: 0,
        },
      ],
    },
    {
      id: "2",
      author: "CryptoAlpha99",
      avatarGradient: "from-amber-500 to-orange-600",
      timeAgo: "25m ago",
      text: "Chainlink TWAP looks strong heading into the next 5-min candle. Holding Yes with high conviction.",
      likes: 4,
    },
    {
      id: "3",
      author: "WhaleHunter_X",
      avatarGradient: "from-cyan-500 to-blue-600",
      timeAgo: "42m ago",
      text: "Massive liquidity influx in the last 15 mins. Volume already crossed $1.2M.",
      likes: 7,
    },
  ]);

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

  const toggleReplies = (id: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl transition-all space-y-4">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-6 border-b border-white/[0.06] pb-3 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("comments")}
          className={cn(
            "pb-1 transition-all cursor-pointer",
            activeTab === "comments" ? "text-white border-b-2 border-white font-extrabold" : "text-slate-400 hover:text-slate-200",
          )}
        >
          Comments (96,324)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("holders")}
          className={cn(
            "pb-1 transition-all cursor-pointer",
            activeTab === "holders" ? "text-white border-b-2 border-white font-extrabold" : "text-slate-400 hover:text-slate-200",
          )}
        >
          Top Holders
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("positions")}
          className={cn(
            "pb-1 transition-all cursor-pointer",
            activeTab === "positions" ? "text-white border-b-2 border-white font-extrabold" : "text-slate-400 hover:text-slate-200",
          )}
        >
          Positions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={cn(
            "pb-1 transition-all cursor-pointer",
            activeTab === "activity" ? "text-white border-b-2 border-white font-extrabold" : "text-slate-400 hover:text-slate-200",
          )}
        >
          Activity
        </button>
      </div>

      {activeTab === "comments" && (
        <>
          {/* Add a Comment Input Box */}
          <form onSubmit={handlePostComment} className="relative rounded-xl border border-white/10 bg-[#080D18] p-3 focus-within:border-blue-500/50 transition-colors">
            <textarea
              rows={2}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full resize-none bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />

            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
              <div className="flex items-center gap-2 text-slate-400">
                <button
                  type="button"
                  title="Insert emoji"
                  className="rounded-lg p-1 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Attach screenshot or link"
                  className="rounded-lg p-1 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-blue-600/25"
              >
                Post
              </button>
            </div>
          </form>

          {/* Comment Filters & Safety Notice */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="flex items-center gap-1 font-bold text-white hover:text-slate-300 transition-colors"
              >
                <span>Newest</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={filterHoldersOnly}
                  onChange={(e) => setFilterHoldersOnly(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 h-3.5 w-3.5"
                />
                <span>Holders</span>
              </label>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Beware of external links.</span>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4 pt-2">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Main Comment */}
                <div className="flex items-start gap-3 text-xs">
                  {/* User Avatar Gradient */}
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full bg-gradient-to-tr shrink-0 shadow-sm flex items-center justify-center font-bold text-white text-[10px]",
                      comment.avatarGradient,
                    )}
                  >
                    {comment.author.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{comment.author}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{comment.timeAgo}</span>
                      </div>

                      <button type="button" className="text-slate-500 hover:text-slate-300">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-1 text-slate-200 text-xs leading-relaxed font-normal">
                      {comment.text}
                    </p>

                    {/* Likes & Replies Actions */}
                    <div className="mt-2 flex items-center gap-4 text-[11px] font-semibold text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleLike(comment.id)}
                        className={cn(
                          "flex items-center gap-1 hover:text-white transition-colors cursor-pointer",
                          comment.liked ? "text-rose-400 font-bold" : "",
                        )}
                      >
                        <Heart className={cn("h-3.5 w-3.5", comment.liked ? "fill-rose-400" : "")} />
                        <span>{comment.likes}</span>
                      </button>

                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>

                    {/* Toggle Replies Pill */}
                    {comment.replies && comment.replies.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleReplies(comment.id)}
                        className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        <span>{comment.replies.length} Replies</span>
                        <span>{expandedReplies[comment.id] ? "⌃" : "⌄"}</span>
                      </button>
                    )}

                    {/* Nested Replies */}
                    {comment.replies && expandedReplies[comment.id] && (
                      <div className="mt-3 pl-4 border-l border-white/10 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2.5 text-xs">
                            <div
                              className={cn(
                                "h-6 w-6 rounded-full bg-gradient-to-tr shrink-0 shadow-sm flex items-center justify-center font-bold text-white text-[9px]",
                                reply.avatarGradient,
                              )}
                            >
                              {reply.author.slice(0, 2).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{reply.author}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{reply.timeAgo}</span>
                              </div>

                              <p className="mt-0.5 text-slate-200 text-xs leading-relaxed font-normal">
                                {reply.text.split(" ").map((word, idx) => {
                                  if (word.startsWith("@")) {
                                    return (
                                      <span key={idx} className="text-blue-400 font-semibold mr-1">
                                        {word}{" "}
                                      </span>
                                    );
                                  }
                                  return word + " ";
                                })}
                              </p>

                              <div className="mt-1 flex items-center gap-3 text-[10px] font-semibold text-slate-400">
                                <button type="button" className="flex items-center gap-1 hover:text-white">
                                  <Heart className="h-3 w-3" />
                                  <span>0</span>
                                </button>
                                <button type="button" className="hover:text-white">
                                  Reply
                                </button>
                              </div>
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
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#162035] px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-blue-600/30 hover:text-white transition-all cursor-pointer shadow-lg"
            >
              <span>Back to top</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}

      {activeTab === "holders" && (
        <div className="py-8 text-center text-xs text-slate-400">
          <p className="font-bold text-white text-sm mb-1">Top Position Holders</p>
          <p>Top liquidity providers and market position holders will appear here.</p>
        </div>
      )}

      {activeTab === "positions" && (
        <div className="py-8 text-center text-xs text-slate-400">
          <p className="font-bold text-white text-sm mb-1">Your Open Positions</p>
          <p>No open positions yet. Place an order to see your position metrics.</p>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="py-8 text-center text-xs text-slate-400">
          <p className="font-bold text-white text-sm mb-1">Live On-Chain Trade Activity</p>
          <p>Streaming recent buy and sell transactions from the order book.</p>
        </div>
      )}
    </div>
  );
}
