import { useState } from "react";
import Icon from "@/components/Icon";
import { sampleComments } from "@/data/markets";

const IdeasActivityPanel = () => {
  const [activeTab, setActiveTab] = useState<'ideas' | 'activity'>('activity');
  const [comment, setComment] = useState("");

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border/50">
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex-1 px-6 py-4 text-sm font-bold transition-all relative ${
            activeTab === 'ideas'
              ? 'text-accent-cyan'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Ideas
          {activeTab === 'ideas' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-cyan" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 px-6 py-4 text-sm font-bold transition-all relative ${
            activeTab === 'activity'
              ? 'text-accent-cyan'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Activity
          {activeTab === 'activity' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-cyan" />
          )}
        </button>
      </div>

      <div className="p-5">
        {/* Filter Row */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm text-muted-foreground">This event</span>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            All
            <Icon name="unfold_more" className="text-base" />
          </button>
        </div>

        {/* Comment Input */}
        <div className="flex items-center gap-3 p-4 bg-secondary/40 rounded-xl border border-border/30 mb-4">
          <div className="size-9 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center shrink-0">
            <Icon name="person" className="text-base text-muted-foreground" />
          </div>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
          />
          <button className="p-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            <Icon name="gif_box" className="text-xl" />
          </button>
        </div>

        {/* Post Row */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-muted-foreground/60">800 left</span>
          <button className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
            Post
          </button>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {sampleComments.slice(0, 2).map((commentData) => (
            <div key={commentData.id} className="p-4 bg-secondary/20 rounded-xl border border-border/20">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-accent-magenta to-primary flex items-center justify-center text-xs font-bold shrink-0 shadow-lg shadow-accent-magenta/20">
                  {commentData.user.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{commentData.user}</span>
                    <span className="text-xs text-muted-foreground/60">{commentData.time}</span>
                    <span className="text-xs text-accent-cyan font-medium">Yes · Rick Rieder</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {commentData.content}
                  </p>
                  <div className="flex items-center gap-5 text-muted-foreground/60">
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <Icon name="chat_bubble_outline" className="text-base" />
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <Icon name="favorite_border" className="text-base" />
                      <span className="text-xs">{commentData.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <Icon name="bookmark_border" className="text-base" />
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <Icon name="ios_share" className="text-base" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IdeasActivityPanel;
