import { FileText, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/components/theme-provider";
import { siteLinks, socialLinks } from "@/config/siteLinks";
import { IconDiscord, IconTelegram, IconX } from "@/components/footer-social-icons";
import { cn } from "@/lib/utils";

import pkg from "../../package.json";

const externalLinkProps = {
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

function FooterThemeButton() {
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      className="group relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-white/5"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Sun className="size-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden />
      <Moon className="absolute size-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden />
    </button>
  );
}

const Footer = () => {
  const { t } = useLanguage();

  const linkClass =
    "inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground";
  const textLinkClass = "whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground";

  return (
    <>
      <div
        className="shrink-0"
        style={{ height: "calc(2.75rem + env(safe-area-inset-bottom, 0px))" }}
        aria-hidden
      />
      <footer
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] text-[12px] leading-none text-muted-foreground",
          "dark:border-white/[0.06]",
        )}
      >
        <div className="mx-auto flex h-11 max-w-[1440px] items-center justify-between gap-2 px-5 sm:gap-4 lg:px-10 min-[360px]:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="size-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.55)]" />
            <span className="shrink-0 font-semibold text-foreground">{t("dashboard.live")}</span>
            <span className="min-w-0 truncate text-muted-foreground">
              {t("footer.version_prefix")} {pkg.version}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:gap-4 md:gap-5">
            <a href={siteLinks.docsUrl} className={linkClass} {...externalLinkProps}>
              <FileText className="size-[15px] shrink-0 opacity-90" aria-hidden />
              <span>{t("footer.docs")}</span>
            </a>
            <Link to={siteLinks.termsUrl} className={textLinkClass}>
              {t("footer.terms_short")}
            </Link>
            <Link to={siteLinks.privacyUrl} className={textLinkClass}>
              {t("footer.privacy")}
            </Link>
            <span className="hidden h-3 w-px shrink-0 bg-border dark:bg-white/20 sm:block" aria-hidden />
            <a
              href={socialLinks.discord}
              className="group inline-flex size-8 items-center justify-center rounded-md hover:bg-muted dark:hover:bg-white/5"
              aria-label="Discord"
              title="Discord"
              {...externalLinkProps}
            >
              <IconDiscord />
            </a>
            <a
              href={socialLinks.telegram}
              className="group inline-flex size-8 items-center justify-center rounded-md hover:bg-muted dark:hover:bg-white/5"
              aria-label="Telegram"
              title="Telegram"
              {...externalLinkProps}
            >
              <IconTelegram />
            </a>
            <a
              href={socialLinks.x}
              className="group inline-flex size-8 items-center justify-center rounded-md hover:bg-muted dark:hover:bg-white/5"
              aria-label="X (Twitter)"
              title="X"
              {...externalLinkProps}
            >
              <IconX />
            </a>
            <FooterThemeButton />
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
