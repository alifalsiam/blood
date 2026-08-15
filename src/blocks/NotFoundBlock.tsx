import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowUpRight } from 'lucide-react';

export const NotFoundBlock: React.FC = () => {
  const { setActiveTab } = useAuth();

  return (
    <div className="relative min-h-[80vh] w-full bg-[#f7f6f2] text-[#121214] flex items-center justify-center p-4 sm:p-6 rounded-3xl overflow-hidden border border-slate-200/80 my-2">
      {/* Background ambient medical pulse glow effect */}
      <div 
        className="absolute w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(230, 57, 70, 0.12) 0%, rgba(0,0,0,0) 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg p-6 sm:p-8 text-center flex flex-col items-center">
        {/* Error Logo */}
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="inline-flex items-center gap-2 font-bold text-xl text-[#121214] tracking-tight mb-6 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-2.5 h-2.5 bg-[#e63946] rounded-full shadow-[0_0_10px_#e63946] animate-pulse inline-block" />
          <span>LifeDrop</span>
        </button>

        {/* 404 Error Code */}
        <div 
          className="font-black text-[#e63946] leading-none tracking-tighter mb-3 select-none"
          style={{
            fontSize: 'clamp(90px, 18vw, 150px)',
            textShadow: '0 10px 30px rgba(230, 57, 70, 0.15)'
          }}
        >
          404
        </div>

        {/* Error Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-[#121214] mb-3 tracking-tight">
          Pulse Lost — Page Not Found
        </h2>

        {/* Error Subtitle */}
        <p className="text-sm sm:text-base text-[#555555] mb-8 leading-relaxed max-w-md mx-auto">
          The lifeline or page you are looking for might have expired, been removed, or is temporarily disconnected from our network.
        </p>

        {/* Button Group */}
        <div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="bg-[#e63946] hover:bg-[#d62839] active:bg-[#b81d2c] text-white px-7 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 shadow-[0_4px_14px_rgba(230,57,70,0.25)] hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Return to Dashboard</span>
            <ArrowUpRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
