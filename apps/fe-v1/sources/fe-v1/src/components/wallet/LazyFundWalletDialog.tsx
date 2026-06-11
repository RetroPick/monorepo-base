import { Suspense, lazy } from "react";

const FundWalletDialog = lazy(() => import("./FundWalletDialog"));

type LazyFundWalletDialogProps = {
  address?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function LazyFundWalletDialog(props: LazyFundWalletDialogProps) {
  if (!props.isOpen) return null;

  return (
    <Suspense fallback={null}>
      <FundWalletDialog {...props} />
    </Suspense>
  );
}
