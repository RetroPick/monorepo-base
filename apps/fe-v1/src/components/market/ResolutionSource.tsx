import Icon from "@/components/Icon";

const ResolutionSource = () => {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
        Resolution Source
      </h3>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
          <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Icon name="account_balance" className="text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">Official Sources</div>
            <div className="text-xs text-muted-foreground">Press Releases & Announcements</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
          <div className="size-10 rounded-lg bg-foreground flex items-center justify-center">
            <span className="text-background font-bold text-lg">𝕏</span>
          </div>
          <div>
            <div className="font-medium text-foreground">@official</div>
            <div className="text-xs text-muted-foreground">Social Media Confirmation</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResolutionSource;
