'use client'

export function SplashScreen() {
  return (
    <div className="absolute inset-0 z-50 flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#030814] bg-[radial-gradient(circle_at_center,#0b1a30_0%,#030814_100%)]">
      {/* Custom Keyframe Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { 
            transform: translateY(0) scale(1); 
            opacity: 0.95; 
            filter: drop-shadow(0 0 16px rgba(255,255,255,0.3)); 
          }
          50% { 
            transform: translateY(-8px) scale(1.04); 
            opacity: 1; 
            filter: drop-shadow(0 0 32px rgba(255,255,255,0.7)); 
          }
        }
        .animate-float-logo {
          animation: float 2.2s ease-in-out infinite;
        }
      `}} />

      {/* Floating logo-splesh.png */}
      <img
        src="/logo.webp"
        alt="RetroPick Logo"
        className="h-[180px] w-[180px] animate-float-logo object-contain"
      />
    </div>
  )
}
