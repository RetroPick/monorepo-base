import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { useWalletInfo } from "@reown/appkit/react";
import {
    Copy,
    LogOut,
    Trophy,
    Coins,
    Settings,
    Moon,
    ChevronRight,
    Globe,
    Check,
    Gavel,
    QrCode,
    CreditCard,
    Building2
} from "lucide-react";
import { Button } from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";
import { useTheme } from "./theme-provider";
import { useOnboarding } from "@/context/OnboardingContext";
import WorldIDVerifier from "./auth/WorldIDVerifier";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/data/translations";
import { openAppKitModal } from "@/lib/openAppKitModal";
import LazyFundWalletDialog from "@/components/wallet/LazyFundWalletDialog";

const WalletButton = () => {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { data: balance } = useBalance({ address });
    const { walletInfo } = useWalletInfo();
    const { theme, setTheme } = useTheme();
    const { t, language, setLanguage } = useLanguage();
    const { isOnboarded, isWorldIDVerified } = useOnboarding();
    const [isFundWalletOpen, setIsFundWalletOpen] = useState(false);
    const nativeBalanceFormatted = balance?.formatted
        ? `${Number(balance.formatted).toFixed(2)} ${balance.symbol}`
        : "0.00";

    const languages: { code: Language; label: string }[] = [
        { code: 'en', label: 'English' },
        { code: 'id', label: 'Indonesia' },
        { code: 'zh', label: '中文 (Chinese)' },
        { code: 'hi', label: 'हिन्दी (Hindi)' },
        { code: 'es', label: 'Español' },
    ];

    useEffect(() => {
        if (!isConnected || !address) return;

        const isSocialWallet =
            walletInfo?.type === "social" ||
            walletInfo?.type === "AUTH" ||
            walletInfo?.type === "auth" ||
            walletInfo?.type === "email" ||
            typeof walletInfo?.social === "string";

        if (!isSocialWallet) return;
        if (balance?.value !== 0n) return;

        const storageKey = `fund_wallet_prompt_seen_${address}`;
        if (window.localStorage.getItem(storageKey) === "true") return;

        window.localStorage.setItem(storageKey, "true");
        setIsFundWalletOpen(true);
    }, [address, balance?.value, isConnected, walletInfo]);

    if (!isConnected) {
        return (
            <Button
                onClick={() => void openAppKitModal()}
                className="h-9 rounded-lg border border-border/50 bg-secondary px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:px-5 sm:text-sm dark:border-transparent dark:ring-1 dark:ring-white/[0.06]"
            >
                Connect Wallet
            </Button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {/* Wallet Profile */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="flex min-h-8 cursor-pointer items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-1.5 transition-colors hover:bg-secondary/80 group sm:min-h-9 sm:gap-3 sm:px-3 sm:py-2">
                        <div className="flex flex-col items-end hidden md:flex">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold leading-none mb-0.5">
                                {t('balance')}
                            </span>
                            <span className="text-xs font-bold tabular-nums text-primary">
                                {isConnected ? nativeBalanceFormatted : "0.00"}
                            </span>
                        </div>

                        <div className="size-8 rounded-full border border-border bg-muted ring-1 ring-primary/25 flex items-center justify-center relative shadow-sm group-hover:ring-primary/40 transition-all">
                            <div className="size-4 rounded-full bg-primary/85" />
                            {isWorldIDVerified && (
                                <div className="absolute -top-1 -right-1 size-3.5 bg-up rounded-full border-2 border-card flex items-center justify-center z-10">
                                    <Check className="size-2.5 text-white" strokeWidth={3} />
                                </div>
                            )}
                        </div>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[300px] p-0 overflow-hidden bg-popover border-border text-popover-foreground rounded-xl shadow-2xl z-[10000]">
                    {/* Header Section */}
                    <div className="p-4 flex items-start gap-3 relative">
                        <div className="size-10 shrink-0 rounded-full border border-border bg-muted ring-1 ring-primary/30 flex items-center justify-center">
                            <div className="size-5 rounded-full bg-primary/90" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-base truncate">{address}</div>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono">
                                <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                                <Copy
                                    className="size-3 cursor-pointer hover:text-foreground transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(address || "");
                                    }}
                                />
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground rounded-full">
                            <Settings className="size-4" />
                        </Button>
                    </div>

                    <div className="h-px bg-border/50 mx-4" />

                    {/* Main Menu Items */}
                    <div className="p-2 space-y-0.5">
                        <DropdownMenuItem
                            onClick={() => setIsFundWalletOpen(true)}
                            className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3"
                        >
                            <QrCode className="mr-3 size-4 text-accent-cyan" />
                            <span className="font-medium">Receive / fund wallet</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => setIsFundWalletOpen(true)}
                            className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3"
                        >
                            <CreditCard className="mr-3 size-4 text-emerald-400" />
                            <span className="font-medium">Buy crypto</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => setIsFundWalletOpen(true)}
                            className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3"
                        >
                            <Building2 className="mr-3 size-4 text-blue-400" />
                            <span className="font-medium">Deposit from exchange</span>
                        </DropdownMenuItem>

                        {isOnboarded && <WorldIDVerifier asDropdownItem />}

                        <DropdownMenuItem className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3">
                            <Coins className="mr-3 size-4 text-green-400" />
                            <span className="font-medium">{t('rewards')}</span>
                        </DropdownMenuItem>

                        <Link to="/app/leaderboard">
                            <DropdownMenuItem className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3">
                                <Trophy className="mr-3 size-4 text-amber-400" />
                                <span className="font-medium">{t('leaderboard')}</span>
                            </DropdownMenuItem>
                        </Link>

                        <Link to="/app/resolution">
                            <DropdownMenuItem className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3">
                                <Gavel className="mr-3 size-4 text-blue-400" />
                                <span className="font-medium">Resolution</span>
                            </DropdownMenuItem>
                        </Link>

                        {/* Dark Mode Toggle */}
                        <DropdownMenuItem className="focus:bg-transparent rounded-lg py-2.5 px-3 flex items-center justify-between cursor-default">
                            <div className="flex items-center">
                                                               <Moon className="mr-3 size-4 text-muted-foreground" />
                                <span className="font-medium">{t('dark_mode')}</span>
                            </div>
                            <Switch
                                checked={theme === 'dark'}
                                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                className="scale-90 data-[state=checked]:bg-blue-500"
                            />
                        </DropdownMenuItem>
                    </div>

                    <div className="h-px bg-border/50 mx-4" />

                    {/* Secondary Links */}
                    <div className="p-2 space-y-0.5">
                        {[
                            { label: t('accuracy'), key: 'Accuracy' },
                            { label: t('support'), key: 'Support' },
                            { label: t('documentation'), key: 'Documentation' },
                            { label: t('help_center'), key: 'Help Center' },
                            { label: t('terms_of_use'), key: 'Terms of Use' }
                        ].map((item) => (
                            <DropdownMenuItem key={item.key} className="cursor-pointer focus:bg-accent/50 rounded-lg py-2 text-muted-foreground focus:text-foreground">
                                <span className="text-sm font-medium">{item.label}</span>
                            </DropdownMenuItem>
                        ))}
                    </div>

                    <div className="h-px bg-border/50 mx-4" />

                    {/* Footer Actions */}
                    <div className="p-2 space-y-0.5">
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3 flex items-center justify-between group data-[state=open]:bg-accent/50">
                                <div className="flex items-center text-muted-foreground group-focus:text-foreground">
                                    <Globe className="mr-2 size-4" />
                                    <span>{t('language')}</span>
                                </div>
                                <span className="text-xs text-muted-foreground ml-auto mr-2">
                                    {languages.find(l => l.code === language)?.label}
                                </span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-popover border-border text-popover-foreground rounded-xl shadow-xl min-w-[200px] z-[10001]">
                                {languages.map((lang) => (
                                    <DropdownMenuItem
                                        key={lang.code}
                                        onClick={() => setLanguage(lang.code)}
                                        className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3 justify-between"
                                    >
                                        <span className={cn("font-medium", language === lang.code && "text-accent-cyan")}>
                                            {lang.label}
                                        </span>
                                        {language === lang.code && <Check className="size-4 text-accent-cyan" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuItem
                            onClick={() => disconnect()}
                            className="cursor-pointer focus:bg-red-500/10 focus:text-red-500 rounded-lg py-2.5 px-3 text-red-500"
                        >
                            <LogOut className="mr-2 size-4" />
                            <span className="font-medium">{t('logout')}</span>
                        </DropdownMenuItem>
                    </div>

                </DropdownMenuContent>
            </DropdownMenu>
            <LazyFundWalletDialog
                address={address}
                isOpen={isFundWalletOpen}
                onOpenChange={setIsFundWalletOpen}
            />
        </div>
    );
};

export default WalletButton;
