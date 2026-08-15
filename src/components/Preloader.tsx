import React, { useEffect, useState } from 'react';

interface PreloaderProps {
  isLoading: boolean;
  message?: string;
}

export const Preloader: React.FC<PreloaderProps> = ({ 
  isLoading, 
  message = "Preparing life-saving connections…" 
}) => {
  const [shouldRender, setShouldRender] = useState(isLoading);
  const [fadeState, setFadeState] = useState<'visible' | 'fading'>('visible');

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      setFadeState('visible');
    } else {
      setFadeState('fading');
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 800); // 0.8s transition matching HTML spec
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Animated Deep-Sea Background Blobs */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none filter blur-[80px]">
        <div 
          className="absolute rounded-full opacity-60 animate-blob-move w-[450px] h-[450px] bg-[#fee2e2] -top-[15%] -left-[10%]"
        />
        <div 
          className="absolute rounded-full opacity-60 animate-blob-move w-[550px] h-[550px] bg-[#e0f2fe] -bottom-[15%] -right-[10%]"
        />
      </div>

      {/* Modern Glass Preloader Overlay */}
      <div 
        className={`
          fixed inset-0 z-[9999] flex items-center justify-center
          bg-[#f1f5f9]/70 backdrop-blur-[25px] transition-opacity duration-800 ease-in-out
          ${fadeState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        <div className="bg-white/60 p-[45px] rounded-[40px] border-2 border-white/90 shadow-[0_25px_50px_rgba(0,0,0,0.08)] flex flex-col items-center text-center max-w-sm mx-4">
          <div className="relative w-[60px] h-[60px] flex items-center justify-center">
            {/* Pulsing red halo */}
            <div className="absolute inset-0 bg-[#ff4d4d] rounded-full animate-pulse-out" />
            {/* Center Heart / Cross Icon */}
            <div className="text-[50px] leading-none text-[#ff4d4d] z-10 relative select-none font-black">
              ✚
            </div>
          </div>

          {/* Shimmering gradient loading text */}
          <div className="mt-[25px] font-extrabold text-[13px] tracking-wide bg-gradient-to-r from-[#0f172a] via-[#ff4d4d] to-[#0f172a] bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
            {message}
          </div>
        </div>
      </div>
    </>
  );
};
