import { useLanguage } from "@/context/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/40 bg-background py-14 px-5 dark:border-white/[0.06] lg:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:flex-row md:gap-8">
        <div className="flex items-center gap-6">
          <span>{t('footer.copyright')}</span>
          <div className="w-px h-3 bg-border" />
          <span>Oracle-resolved scheduled markets</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-foreground transition-colors">{t('footer.terms')}</a>
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          <a href="#" className="hover:text-foreground transition-colors">{t('footer.support')}</a>
          <a href="#" className="hover:text-foreground transition-colors">{t('footer.documentation')}</a>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          <span>Deterministic settlement active</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
