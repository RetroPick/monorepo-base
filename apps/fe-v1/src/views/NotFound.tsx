import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-20 pt-10">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
          <Link to="/app/markets/all" className="text-primary underline underline-offset-4 hover:text-primary/90">
            Return to App
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
