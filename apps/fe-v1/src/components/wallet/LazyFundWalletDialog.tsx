import { Suspense, lazy, useEffect, useRef } from "react";

const FundWalletDialog = lazy(() => import("./FundWalletDialog"));

type LazyFundWalletDialogProps = {
  address?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Defers loading the FundWalletDialog chunk (qrcode + Radix Dialog assets) until
 * the first open. After that, the chunk stays mounted so close animations and
 * reopens are immediate.
 */
export default function LazyFundWalletDialog(props: LazyFundWalletDialogProps) {
  const hasOpenedRef = useRef(false);
  if (props.isOpen) {
    hasOpenedRef.current = true;
  }

  useEffect(() => {
    if (props.isOpen && typeof window !== "undefined") {
      void import("./FundWalletDialog");
    }
  }, [props.isOpen]);

  if (!hasOpenedRef.current) return null;

  return (
    <Suspense fallback={null}>
      <FundWalletDialog {...props} />
    </Suspense>
  );
}
