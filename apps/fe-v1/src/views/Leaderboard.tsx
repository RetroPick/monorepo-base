import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

interface User {
    id: number;
    user: string;
    avatar: string;
    profit: string;
    winRate: string;
    category: string;
}

const leaderboardData: User[] = [];

const PodiumPlace = ({ user, rank, delay }: { user: User, rank: number, delay: number }) => {
    const { t } = useLanguage();

    // Podium Styles based on rank
    const isFirst = rank === 1;
    const isSecond = rank === 2;
    const isThird = rank === 3;

    const height = isFirst ? "h-64 md:h-80" : isSecond ? "h-48 md:h-64" : "h-40 md:h-56";
    const color = isFirst ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500" :
        isSecond ? "bg-slate-300/20 border-slate-300/50 text-slate-300" :
            "bg-orange-700/20 border-orange-700/50 text-orange-600";

    const glow = isFirst ? "shadow-[0_0_50px_rgba(234,179,8,0.3)]" :
        isSecond ? "shadow-[0_0_30px_rgba(203,213,225,0.2)]" :
            "shadow-[0_0_30px_rgba(194,65,12,0.2)]";

    const label = isFirst ? t('leaderboard_page.top_1') : isSecond ? t('leaderboard_page.top_2') : t('leaderboard_page.top_3');

    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay, type: "spring" }}
            className={`relative flex flex-col items-center justify-end ${isFirst ? 'order-2 z-20' : isSecond ? 'order-1 z-10' : 'order-3 z-10'}`}
        >
            {/* Avatar Floating */}
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: delay + 1 }}
                className="mb-4 flex flex-col items-center"
            >
                <div className={`size-20 md:size-24 rounded-full border-4 ${isFirst ? 'border-yellow-500' : isSecond ? 'border-slate-300' : 'border-orange-600'} overflow-hidden bg-background shadow-xl`}>
                    <img src={user.avatar} alt={user.user} className="w-full h-full object-cover" />
                </div>
                <div className="mt-2 text-center">
                    <div className="font-bold text-lg md:text-xl truncate max-w-[120px]">{user.user}</div>
                    <div className={`text-xs md:text-sm font-bold uppercase tracking-widest ${isFirst ? 'text-yellow-500' : isSecond ? 'text-slate-400' : 'text-orange-500'}`}>
                        {label}
                    </div>
                </div>
            </motion.div>

            {/* Podium Block */}
            <div className={cn(
                "w-full md:w-48 rounded-t-2xl border-x border-t backdrop-blur-md flex flex-col items-center justify-start pt-4",
                height, color, glow
            )}>
                <div className="text-4xl md:text-6xl font-black opacity-50">{rank}</div>
                <div className="mt-auto pb-4 md:pb-8 flex flex-col items-center gap-1">
                    <span className="text-xs uppercase text-muted-foreground font-semibold">{t('leaderboard_page.profit')}</span>
                    <span className="text-lg md:text-2xl font-mono font-bold text-foreground">{user.profit}</span>
                </div>
            </div>
        </motion.div>
    );
};

const LeaderboardRow = ({ user, index }: { user: User, index: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="group relative flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-accent/10 transition-all hover:scale-[1.01] hover:border-primary/30 hover:shadow-lg"
        >
            {/* Rank */}
            <div className="w-12 text-center font-black text-xl text-muted-foreground/50 group-hover:text-primary transition-colors">
                #{user.id}
            </div>

            {/* Avatar */}
            <div className="size-10 rounded-full bg-secondary overflow-hidden border border-border group-hover:border-primary transition-colors">
                <img src={user.avatar} alt={user.user} className="w-full h-full object-cover" />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
                <div className="font-bold truncate text-foreground group-hover:text-primary transition-colors">{user.user}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="bg-secondary px-1.5 rounded text-[10px] uppercase font-bold tracking-wider">{user.category}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 text-right">
                <div className="hidden md:block">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Win Rate</div>
                    <div className="font-mono font-bold text-accent-cyan">{user.winRate}</div>
                </div>
                <div className="w-24">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">PnL</div>
                    <div className="font-mono font-bold text-accent-green">{user.profit}</div>
                </div>
            </div>
        </motion.div>
    );
};

const Leaderboard = () => {
    const { t } = useLanguage();
    const top3 = leaderboardData.slice(0, 3);
    const rest = leaderboardData.slice(3);

    return (
        <div className="relative min-h-screen overflow-x-clip bg-background font-sans text-foreground selection:bg-primary/30">
            <Header />

            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-30" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            <div className="container mx-auto px-4 pt-3 pb-20 max-w-5xl relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-black tracking-tight mb-4 uppercase bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent"
                    >
                        {t('leaderboard_page.title')}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        {t('leaderboard_page.subtitle')}
                    </motion.p>
                </div>

                {leaderboardData.length === 0 ? (
                    <div className="mb-20 rounded-2xl border border-border/60 bg-card/40 px-6 py-10 text-center text-muted-foreground">
                        <p className="mx-auto max-w-lg text-base">
                            Public PnL rankings are not available from the RetroPick indexer yet. Your own activity appears on
                            the Activity and Portfolio pages when the API is reachable.
                        </p>
                    </div>
                ) : null}

                {/* Podium Section */}
                <div className="flex min-h-[400px] items-end justify-center gap-4 mb-20">
                    {top3.length >= 3 && (
                        <>
                            <PodiumPlace user={top3[1]!} rank={2} delay={0.2} />
                            <PodiumPlace user={top3[0]!} rank={1} delay={0.4} />
                            <PodiumPlace user={top3[2]!} rank={3} delay={0.6} />
                        </>
                    )}
                </div>

                {rest.length > 0 ? (
                    <>
                {/* List Header */}
                <div className="flex items-center justify-between mb-6 px-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Icon name="groups" className="text-primary" />
                        Top 100
                    </h2>
                    <div className="text-sm text-muted-foreground">
                        Updated in real-time
                    </div>
                </div>

                {/* Leaderboard List */}
                <div className="space-y-3">
                    {rest.map((user, index) => (
                        <LeaderboardRow key={user.id} user={user} index={index} />
                    ))}
                </div>
                    </>
                ) : null}
            </div>

            <Footer />
        </div>
    );
};

export default Leaderboard;
