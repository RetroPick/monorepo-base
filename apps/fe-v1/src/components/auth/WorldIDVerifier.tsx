"use client";

import { useState } from "react";
import { IDKitWidget, VerificationLevel, ISuccessResult } from "@worldcoin/idkit";
import { Check, ShieldCheck, Fingerprint } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenuItem } from "../ui/dropdown-menu"; // Ensure this path is correct
import { useOnboarding } from "@/context/OnboardingContext";

interface WorldIDVerifierProps {
    asDropdownItem?: boolean;
}

const WorldIDVerifier = ({ asDropdownItem }: WorldIDVerifierProps) => {
    const { isWorldIDVerified, verifyWorldID } = useOnboarding();

    const handleVerify = async (proof: ISuccessResult) => {
        // Mock verification call
        if (import.meta.env.DEV) console.log("Proof received:", proof);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return;
    };

    const onSuccess = (result: ISuccessResult) => {
        if (import.meta.env.DEV) console.log("Verification successful", result);
        verifyWorldID();
    };

    if (isWorldIDVerified) {
        if (asDropdownItem) {
            return (
                <DropdownMenuItem disabled className="cursor-default bg-green-500/10 focus:bg-green-500/10 opacity-100 rounded-lg py-2.5 px-3 flex items-center justify-between">
                    <div className="flex items-center">
                        <Check className="mr-3 size-4 text-green-500" />
                        <span className="font-medium text-green-500">Human Verified</span>
                    </div>
                </DropdownMenuItem>
            );
        }

        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]">
                <div className="size-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="size-3 text-green-500" />
                </div>
                <span className="text-xs font-bold text-green-500 tracking-wide">
                    Human Verified
                </span>
            </div>
        );
    }

    return (
        <IDKitWidget
            // Using a generic production app_id pattern. In a real deployment, 
            // VITE_WLD_APP_ID must be a verified app starting with "app_" (not "app_staging_").
            app_id={(import.meta.env.VITE_WLD_APP_ID as `app_${string}`) || "app_e2e6af2e6fd42d0768e98ecdf268fbf1"}
            action={import.meta.env.VITE_WLD_ACTION || "verify-humanity"}
            onSuccess={onSuccess}
            handleVerify={handleVerify}
            verification_level={VerificationLevel.Orb} // 🔥 Enforce REAL hardware Orb verification
        >
            {({ open }) => (
                asDropdownItem ? (
                    <DropdownMenuItem
                        onClick={open}
                        className="cursor-pointer focus:bg-accent/50 rounded-lg py-2.5 px-3"
                    >
                        <ShieldCheck className="mr-3 size-4 text-white" />
                        <span className="font-medium">Verify Humanity</span>
                    </DropdownMenuItem>
                ) : (
                    <Button
                        variant="outline"
                        onClick={open}
                        className="h-9 px-4 gap-2 bg-transparent border-white/10 hover:bg-white/5 hover:border-white/20 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)] transition-all duration-300 group"
                    >
                        <div className="size-5 relative">
                            {/* Worldcoin Logo SVG */}
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-full h-full text-white group-hover:scale-110 transition-transform duration-300"
                            >
                                <path
                                    d="M12 4.5C7.85786 4.5 4.5 7.85786 4.5 12C4.5 16.1421 7.85786 19.5 12 19.5C16.1421 19.5 19.5 16.1421 19.5 12C19.5 7.85786 16.1421 4.5 12 4.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z"
                                    fill="currentColor"
                                    fillOpacity="0.8"
                                />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-white/90">
                            Verify Humanity
                        </span>
                    </Button>
                )
            )}
        </IDKitWidget>
    );
};

export default WorldIDVerifier;
