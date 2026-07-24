import { Suspense, lazy } from "react";

const WorldIDVerifier = lazy(() => import("./WorldIDVerifier"));

interface LazyWorldIDVerifierProps {
  asDropdownItem?: boolean;
}

/**
 * Defers loading the WorldIDVerifier chunk (`@worldcoin/idkit` is large) until
 * the parent dropdown actually mounts it. Renders nothing while loading so it
 * does not push layout in the wallet menu.
 */
export default function LazyWorldIDVerifier(props: LazyWorldIDVerifierProps) {
  return (
    <Suspense fallback={null}>
      <WorldIDVerifier {...props} />
    </Suspense>
  );
}
