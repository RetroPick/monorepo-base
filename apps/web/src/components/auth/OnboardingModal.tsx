
import { useState, useEffect } from "react";
import { useAppKitAccount } from '@reown/appkit/react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/Icon";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const steps = [
    { id: 'sign', title: 'Sign Message', icon: 'signature' },
    { id: 'username', title: 'Create Username', icon: 'person' },
    { id: 'trading', title: 'Enable Trading', icon: 'candlestick_chart' },
    { id: 'email', title: 'Email (Optional)', icon: 'mail' },
    { id: 'deposit', title: 'Deposit Funds', icon: 'account_balance_wallet' },
];

const OnboardingModal = ({ isOpen, onClose, onComplete }: OnboardingModalProps) => {
    const { address } = useAppKitAccount();
    const [currentStep, setCurrentStep] = useState(0);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Sign Message
    const handleSign = async () => {
        setIsLoading(true);
        // Simulate signing delay
        setTimeout(() => {
            setIsLoading(false);
            setCurrentStep(1);
        }, 1000);
    };

    // Step 2: Username
    const handleUsername = () => {
        if (!username) return;
        setCurrentStep(2);
    };

    // Step 3: Enable Trading
    const handleEnableTrading = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setCurrentStep(3);
        }, 1000);
    };

    // Step 4: Email
    const handleEmail = (skip = false) => {
        setCurrentStep(4);
    };

    // Step 5: Deposit (Use as specific "Done" step for now)
    const handleDeposit = () => {
        onComplete();
        onClose();
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Sign
                return (
                    <div className="space-y-4 text-center">
                        <div className="mx-auto size-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                            <Icon name="verified_user" className="text-3xl text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Verify Ownership</h3>
                        <p className="text-muted-foreground text-sm">
                            Please sign a message to verify you own this wallet.<br />
                            <span className="font-mono text-xs text-muted-foreground/50">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        </p>
                        <Button
                            onClick={handleSign}
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl text-md font-bold"
                        >
                            {isLoading ? "Signing..." : "Sign Message"}
                        </Button>
                    </div>
                );
            case 1: // Username
                return (
                    <div className="space-y-4">
                        <div className="text-center">
                            <h3 className="text-xl font-bold">Create Profile</h3>
                            <p className="text-muted-foreground text-sm">Choose a unique username for your portfolio.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Username</Label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="crypto_wizard_99"
                                className="h-12 text-lg"
                            />
                        </div>
                        <Button onClick={handleUsername} className="w-full h-12 rounded-xl" disabled={!username}>
                            Continue
                        </Button>
                    </div>
                );
            case 2: // Enable Trading
                return (
                    <div className="space-y-6 text-center">
                        <div className="mx-auto size-16 bg-accent-green/10 rounded-full flex items-center justify-center">
                            <Icon name="rocket_launch" className="text-3xl text-accent-green" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Enable Trading</h3>
                            <p className="text-muted-foreground text-sm mt-2">
                                Activate your account for trading on Retropick Prediction Markets.
                            </p>
                        </div>
                        <Button
                            onClick={handleEnableTrading}
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl bg-accent-green text-green-950 font-bold hover:bg-accent-green/90"
                        >
                            {isLoading ? "Activating..." : "Enable Trading"}
                        </Button>
                    </div>
                );
            case 3: // Email
                return (
                    <div className="space-y-4">
                        <div className="text-center">
                            <h3 className="text-xl font-bold">Stay Updated</h3>
                            <p className="text-muted-foreground text-sm">Get notifications about your positions (Optional).</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="h-12"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => handleEmail(true)} className="flex-1 h-12 rounded-xl">
                                Skip
                            </Button>
                            <Button onClick={() => handleEmail(false)} className="flex-[2] h-12 rounded-xl">
                                Continue
                            </Button>
                        </div>
                    </div>
                );
            case 4: // Deposit
                return (
                    <div className="space-y-6 text-center">
                        <div className="p-4 bg-white rounded-xl w-32 mx-auto">
                            {/* Mock QR Code */}
                            <div className="w-full h-24 bg-black/10 flex items-center justify-center">
                                <Icon name="qr_code_2" className="text-6xl text-black" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Deposit Funds</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                Send SOL to your trading wallet to start.
                            </p>
                            <div className="mt-4 p-3 bg-secondary rounded-lg font-mono text-xs break-all border border-border">
                                {address || "0x..."}
                            </div>
                        </div>
                        <Button onClick={handleDeposit} className="w-full h-12 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90">
                            I've Deposited / Do Later
                        </Button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl rounded-3xl p-6 [&>button]:hidden">
                {/* Progress Bar */}
                <div className="flex items-center gap-1 mb-8">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${index <= currentStep ? 'bg-primary' : 'bg-transparent'}`}
                                style={{ width: index === currentStep ? '50%' : index < currentStep ? '100%' : '0%' }}
                            />
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};

export default OnboardingModal;
