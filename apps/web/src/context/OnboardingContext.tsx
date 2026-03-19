
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import OnboardingModal from "@/components/auth/OnboardingModal";

interface OnboardingContextType {
    isOnboarded: boolean;
    completeOnboarding: () => void;
    isWorldIDVerified: boolean;
    verifyWorldID: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
    const { isConnected, address } = useAppKitAccount();
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isWorldIDVerified, setIsWorldIDVerified] = useState(false);

    // Check connection and onboarding status
    useEffect(() => {
        if (isConnected && address) {
            // In a real app, check backend or contract.
            // For now, check localStorage or default to false if not found.
            const storedAuth = localStorage.getItem(`onboarding_${address}`);
            if (storedAuth === "true") {
                setIsOnboarded(true);
                setShowModal(false);
            } else {
                setIsOnboarded(false);
                setShowModal(true);
            }

            const storedWorldID = localStorage.getItem(`worldid_${address}`);
            setIsWorldIDVerified(storedWorldID === "true");
        } else {
            setShowModal(false);
            setIsOnboarded(false);
            setIsWorldIDVerified(false);
        }
    }, [isConnected, address]);

    const completeOnboarding = () => {
        setIsOnboarded(true);
        setShowModal(false);
        if (address) {
            localStorage.setItem(`onboarding_${address}`, "true");
        }
    };

    const verifyWorldID = () => {
        setIsWorldIDVerified(true);
        if (address) {
            localStorage.setItem(`worldid_${address}`, "true");
        }
    };

    return (
        <OnboardingContext.Provider value={{ isOnboarded, completeOnboarding, isWorldIDVerified, verifyWorldID }}>
            {children}
            <OnboardingModal
                isOpen={showModal}
                onClose={() => {
                    // Optional: If you want to force onboarding, don't allow closing without completion.
                    // For now, let's allow closing but it won't set onboarded=true.
                    setShowModal(false);
                }}
                onComplete={completeOnboarding}
            />
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (context === undefined) {
        throw new Error("useOnboarding must be used within an OnboardingProvider");
    }
    return context;
};
