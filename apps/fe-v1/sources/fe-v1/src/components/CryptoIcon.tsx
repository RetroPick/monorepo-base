
import { cn } from "@/lib/utils";

interface CryptoIconProps {
    type: string;
    className?: string;
}

export const CryptoIcon = ({ type, className }: CryptoIconProps) => {
    const iconPaths: Record<string, React.ReactNode> = {
        // Bitcoin (B symbol only)
        "Bitcoin": (
            <path fill="currentColor" d="M22.698 13.974c.326-2.176-1.332-3.344-3.596-4.125l.735-2.946-1.793-.448-.716 2.87c-.471-.118-1.554-.36-3.033-.49l.716-2.87L13.218 5.5l-.736 2.956c-.4.098-1.58.26-1.58.26s-.586-.146-.574-.132l-1.42 3.868s.992.238.972.252c.542.136.64.496.624.782l-1.49 5.976c-.05.372-.258.918-1.002.732-.024.016-.973-.252-.973-.252l-2.66 6.138 2.508.626c.465.116 1.834.42 3.064.636l-.726 2.91 1.794.448.736-2.946c.488.132 1.348.318 2.268.514l-.73 2.922 1.793.448.74-2.956c3.06.58 5.362.346 6.328-2.422.778-2.228-.038-3.518-1.65-4.354 1.174-.272 2.06-1.046 2.298-2.646zM18.8 19.462c-.66.262-5.118 2.454-6.574 1.09l1.172-4.7c1.46.208 6.136.702 5.402 3.61zm.6-6.494c-.604.24-4.316 2.126-5.526.96l1.066-4.272c1.214-.264 5.25.076 4.46 3.312z" />
        ),
        // Ethereum (Diamond symbol only)
        "Ethereum": (
            <>
                <path fill="currentColor" d="M16 4v8.83l7.98-3.72L16 4z" opacity=".6" />
                <path fill="currentColor" d="M16 4L8.02 9.11 16 12.83V4z" opacity=".8" />
                <path fill="currentColor" d="M16 22.84V28l7.99-10.99L16 22.84z" opacity=".6" />
                <path fill="currentColor" d="M16 28v-5.16l-7.98-5.83L16 28z" opacity=".8" />
                <path fill="currentColor" d="M16 14.16l7.98-3.72L16 22.84V14.16z" opacity=".5" />
                <path fill="currentColor" d="M8.02 10.44L16 14.16v8.68L8.02 10.44z" opacity=".9" />
            </>
        ),
        // Solana (Swirl logo)
        "Solana": (
            <path fill="currentColor" d="M5.56 22.72L5.27 22.85L5.61 23.47L22.42 21.65L22.7 21.52L22.37 20.9L5.56 22.72ZM26.44 9.28L26.73 9.15L26.39 8.53L9.58 10.35L9.3 10.48L9.63 11.1L26.44 9.28ZM5.56 16.5L5.27 16.63L5.61 17.25L22.42 15.43L22.7 15.3L22.37 14.68L5.56 16.5Z" />
        )
    };

    // Fallback
    const path = iconPaths[type] || iconPaths["Ethereum"];

    return (
        <svg viewBox="0 0 32 32" className={cn("w-full h-full", className)} xmlns="http://www.w3.org/2000/svg">
            {path}
        </svg>
    );
};
