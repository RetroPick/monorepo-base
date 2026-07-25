
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CategoryBackgroundProps {
    category: string;
}

const CategoryBackground = ({ category }: CategoryBackgroundProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Single unified theme for all categories
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Subtle global gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />

            {/* Optional: Very subtle global ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
    );
};

export default CategoryBackground;
