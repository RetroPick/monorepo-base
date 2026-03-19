import { useLanguage } from "@/context/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/50 py-12 px-4 lg:px-8 bg-background">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
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
        <div className="flex items-center gap-2 px-3 py-1 bg-accent-green/5 border border-accent-green/20 rounded-full text-accent-green">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          <span>Deterministic settlement active</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
