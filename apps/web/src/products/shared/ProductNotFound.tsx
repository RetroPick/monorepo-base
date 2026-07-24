import { Link } from "react-router-dom";

import { getProductMode } from "@/config/product";

export default function ProductNotFound() {
  const mode = getProductMode();
  const home = mode === "prism" ? "/prism" : mode === "markets" ? "/markets" : "/";

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">This route is not available in the current product build.</p>
      <Link className="text-primary underline" to={home}>
        Go home
      </Link>
    </main>
  );
}
