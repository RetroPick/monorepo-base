import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Activity } from 'lucide-react';

// Import ModelViewer directly to prevent context loss
import ModelViewer from './ModelViewer'; // Re-enabled for 3D model
import ErrorBoundary from '@/components/ErrorBoundary';

const Hero: React.FC = () => {
  const [resetKey, setResetKey] = React.useState(0);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
      {/* Background - Plain White with Top Circular Blue Gradient */}
      {/* Background - Plain White with Top Circular Blue Gradient */}
      <div className="absolute inset-0 z-0 bg-white">
        <div className="absolute top-0 left-0 w-full h-[900px] bg-[radial-gradient(ellipse_70%_55%_at_50%_-15%,rgba(59,130,246,0.08),transparent_60%)]"></div>
        <div className="absolute top-0 left-0 w-full h-[700px] bg-[radial-gradient(ellipse_50%_35%_at_50%_-10%,rgba(6,182,212,0.05),transparent_55%)]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="text-center lg:text-left space-y-10 lg:space-y-12">

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[2.75rem] sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-[1.08] tracking-tight text-slate-900"
          >
            UP OR DOWN
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-[1.7]"
          >
            Catch the next move.
            <br />
            BTC. ETH. SOL.
            <br />
            Fast rounds. Clean yes/no picks. Enter before the clock runs out.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
          >
            <a href="/app/markets/all" className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5">
              Open Markets <ArrowRight className="w-4 h-4 opacity-80" />
            </a>
          </motion.div>

        </div>

        {/* Right Content: 3D Model */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="hidden lg:flex justify-center items-center h-[600px] w-full relative"
        >
          <div className="relative w-full h-full">
            <ErrorBoundary key={resetKey} fallback={
              <div className="relative w-full h-full max-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-50 flex items-center justify-center group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
                <img
                  src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop"
                  alt="AI Prediction Market"
                  className="w-full h-full object-cover opacity-90 transition-transform duration-700"
                />

                {/* Retry Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => setResetKey(prev => prev + 1)}
                    className="px-6 py-3 bg-white text-slate-900 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <Activity className="w-4 h-4 text-blue-600" />
                    Retry Loading 3D Model
                  </button>
                </div>

                <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/90 backdrop-blur-md rounded-xl border border-white/50 shadow-lg group-hover:opacity-0 transition-opacity">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">Deterministic resolution</div>
                      <div className="text-xs text-slate-500">Public oracle snapshots drive every market outcome</div>
                    </div>
                  </div>
                </div>
              </div>
            }>
              <React.Suspense fallback={<div className="w-full h-full flex items-center justify-center text-slate-400">Loading 3D Model...</div>}>
                <ModelViewer />
              </React.Suspense>
            </ErrorBoundary>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default Hero;
