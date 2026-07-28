'use client'

export function SplashScreen() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#0b1a30_0%,#030814_100%)]">
      {/* Custom Keyframe Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { 
            transform: translateY(0) scale(1); 
            opacity: 0.9; 
            filter: drop-shadow(0 0 12px rgba(255,255,255,0.25)); 
          }
          50% { 
            transform: translateY(-8px) scale(1.04); 
            opacity: 1; 
            filter: drop-shadow(0 0 28px rgba(255,255,255,0.6)); 
          }
        }
        .animate-float-logo {
          animation: float 2.2s ease-in-out infinite;
        }
      `}} />

      {/* Floating transparent white logo.png */}
      <img
        src="/logo.png"
        alt="RetroPick Logo"
        className="h-[180px] w-[180px] animate-float-logo object-contain"
      />
    </div>
  )
}
