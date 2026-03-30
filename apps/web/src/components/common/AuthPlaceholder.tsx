
import { Button } from "@/components/ui/button";
import Icon from "@/components/Icon";
import { useState } from "react";
import LoginModal from "@/components/auth/LoginModal";

const AuthPlaceholder = ({ title = "Connect Wallet to View", description = "Please connect your wallet to access this improved feature." }) => {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <>
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full" />
                    <div className="relative bg-gradient-to-br from-gray-900 to-black border border-primary/30 p-6 rounded-full shadow-2xl shadow-primary/20">
                        <Icon name="lock" className="text-4xl text-primary" />
                    </div>
                </div>

                <div className="space-y-2 max-w-md">
                    <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
                    <p className="text-muted-foreground">{description}</p>
                </div>

                <Button
                    onClick={() => setIsLoginOpen(true)}
                    className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-all duration-300"
                >
                    <Icon name="wallet" className="mr-2 text-lg" />
                    Connect Wallet
                </Button>
            </div>
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </>
    );
};

export default AuthPlaceholder;
