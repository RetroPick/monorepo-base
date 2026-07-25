import { Suspense, lazy, useEffect, useRef } from "react";

const BetModal = lazy(() => import("./BetModal"));

export interface LazyBetModalProps {
  open: boolean;
  onClose: () => void;
  marketTitle: string;
  outcome: string;
  side: "YES" | "NO";
  price: number;
}

/**
 * Defers loading the BetModal chunk (framer-motion + ConfirmationModal +
 * portal logic) until the first time it is opened. After that, the chunk
 * stays in memory so subsequent opens are immediate.
 */
export default function LazyBetModal(props: LazyBetModalProps) {
  const hasOpenedRef = useRef(false);
  if (props.open) {
    hasOpenedRef.current = true;
  }

  useEffect(() => {
    if (props.open && typeof window !== "undefined") {
      void import("./BetModal");
    }
  }, [props.open]);

  if (!hasOpenedRef.current) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <BetModal {...props} />
    </Suspense>
  );
}
