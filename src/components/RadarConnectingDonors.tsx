import React, { useEffect } from 'react';
import { Droplet, Heart, User, Activity, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { startRadarLoop, stopRadarLoop } from '../lib/sound';

export const RadarConnectingDonors: React.FC<{ foundCount?: number }> = ({ foundCount = 0 }) => {
  const { isSoundMuted } = useAuth();

  useEffect(() => {
    if (!isSoundMuted) {
      // Faster beep for each donor found (minimum 400ms)
      const intervalMs = Math.max(400, 2000 - (foundCount * 400));
      startRadarLoop(intervalMs);
    } else {
      stopRadarLoop();
    }

    return () => {
      stopRadarLoop();
    };
  }, [isSoundMuted, foundCount]);

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-3 bg-white/60 backdrop-blur-xs rounded-2xl border border-rose-100 shadow-2xs my-3 overflow-hidden">
      <style>{`
        @keyframes radarRingExpand {
          0% { opacity: 0.8; transform: scale(0.8); border-color: rgba(225, 29, 72, 0.6); }
          100% { opacity: 0; transform: scale(1.15); border-color: rgba(225, 29, 72, 0.05); }
        }
        @keyframes radarSweepRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radarHubPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.7); }
          70% { transform: scale(1.06); box-shadow: 0 0 0 25px rgba(225, 29, 72, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
        }
        @keyframes radarWaveBurst {
          0% { width: 58px; height: 58px; opacity: 1; transform: scale(1); }
          100% { width: 250px; height: 250px; opacity: 0; transform: scale(1); }
        }
        @keyframes radarNodeBlink {
          0% { transform: scale(0.9); box-shadow: 0 0 0 rgba(225, 29, 72, 0.1); border-color: #cbd5e1; color: #94a3b8; }
          100% { transform: scale(1.1); box-shadow: 0 0 12px rgba(225, 29, 72, 0.5); border-color: #e11d48; color: #e11d48; }
        }
        @keyframes radarOrbitClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radarOrbitCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes radarCounterRotate {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes radarCounterRotateReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radarDotBlink {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          80%, 100% { opacity: 0; }
        }
      `}</style>

      <div className="w-full max-w-[360px] flex flex-col items-center gap-5 text-center">
        {/* Dynamic Radar Stage */}
        <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] flex items-center justify-center">
          
          {/* Concentric Radar Rings */}
          <div 
            className="absolute rounded-full border border-dashed border-rose-500/25 w-[75px] h-[75px] sm:w-[85px] sm:h-[85px]"
            style={{ animation: 'radarRingExpand 3s infinite linear', animationDelay: '0s' }}
          />
          <div 
            className="absolute rounded-full border border-dashed border-rose-500/25 w-[145px] h-[145px] sm:w-[160px] sm:h-[160px]"
            style={{ animation: 'radarRingExpand 3s infinite linear', animationDelay: '1s' }}
          />
          <div 
            className="absolute rounded-full border border-dashed border-rose-500/25 w-[215px] h-[215px] sm:w-[235px] sm:h-[235px]"
            style={{ animation: 'radarRingExpand 3s infinite linear', animationDelay: '2s' }}
          />

          {/* Radar Sweeping Beam */}
          <div 
            className="absolute w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] top-[calc(50%-130px)] left-[calc(50%-130px)] sm:top-[calc(50%-150px)] sm:left-[calc(50%-150px)] rounded-tl-[130px] sm:rounded-tl-[150px] pointer-events-none z-4"
            style={{
              background: 'conic-gradient(from 0deg at 100% 100%, rgba(225, 29, 72, 0) 0deg, rgba(225, 29, 72, 0.25) 360deg)',
              transformOrigin: '100% 100%',
              animation: 'radarSweepRotate 4s linear infinite',
            }}
          />

          {/* Expanding Signal Waves */}
          <div 
            className="absolute w-[58px] h-[58px] rounded-full border-2 border-rose-600 z-3"
            style={{ animation: 'radarWaveBurst 2s infinite linear' }}
          />
          <div 
            className="absolute w-[58px] h-[58px] rounded-full border-2 border-rose-600 z-3"
            style={{ animation: 'radarWaveBurst 2s infinite linear', animationDelay: '1s' }}
          />

          {/* Center Blood Drop Hub */}
          <div 
            className="relative z-10 w-[58px] h-[58px] sm:w-[66px] sm:h-[66px] bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg"
            style={{ animation: 'radarHubPulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)' }}
          >
            <Droplet className="w-6 h-6 fill-white text-white" />
          </div>

          {/* 25km Radius Tag */}
          <div className="absolute right-1 top-[calc(50%-12px)] bg-white border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-600 shadow-xs z-8 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5" />
            <span>{siteConfig?.radarRadiusKm || 25}km</span>
          </div>

          {/* Orbit 1 (Heart & User Nodes) */}
          <div 
            className="absolute w-[145px] h-[145px] sm:w-[160px] sm:h-[160px] rounded-full pointer-events-none"
            style={{ animation: 'radarOrbitClockwise 10s linear infinite' }}
          >
            {/* Node 1 */}
            <div 
              className="absolute top-[-16px] left-[calc(50%-16px)] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-rose-600 text-rose-600 flex items-center justify-center text-xs shadow-md z-6 pointer-events-auto"
              style={{ animation: 'radarNodeBlink 1.5s infinite alternate ease-in-out' }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ animation: 'radarCounterRotate 10s linear infinite' }}
              >
                <Heart className="w-3.5 h-3.5 fill-rose-600/30 text-rose-600" />
              </div>
            </div>

            {/* Node 2 */}
            <div 
              className="absolute bottom-[10px] right-[10px] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-rose-600 text-rose-600 flex items-center justify-center text-xs shadow-md z-6 pointer-events-auto"
              style={{ animation: 'radarNodeBlink 1.5s infinite alternate ease-in-out', animationDelay: '0.7s' }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ animation: 'radarCounterRotate 10s linear infinite' }}
              >
                <User className="w-3.5 h-3.5 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Orbit 2 (Blood Drop & Heart Pulse Nodes) */}
          <div 
            className="absolute w-[215px] h-[215px] sm:w-[235px] sm:h-[235px] rounded-full pointer-events-none"
            style={{ animation: 'radarOrbitCounter 14s linear infinite' }}
          >
            {/* Node 3 */}
            <div 
              className="absolute top-[30px] right-[-16px] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-rose-600 text-rose-600 flex items-center justify-center text-xs shadow-md z-6 pointer-events-auto"
              style={{ animation: 'radarNodeBlink 1.5s infinite alternate ease-in-out' }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ animation: 'radarCounterRotateReverse 14s linear infinite' }}
              >
                <Droplet className="w-3.5 h-3.5 text-rose-600" />
              </div>
            </div>

            {/* Node 4 */}
            <div 
              className="absolute bottom-[-16px] left-[calc(50%-16px)] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-rose-600 text-rose-600 flex items-center justify-center text-xs shadow-md z-6 pointer-events-auto"
              style={{ animation: 'radarNodeBlink 1.5s infinite alternate ease-in-out', animationDelay: '0.7s' }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ animation: 'radarCounterRotateReverse 14s linear infinite' }}
              >
                <Activity className="w-3.5 h-3.5 text-rose-600" />
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Loader Text Area */}
        <div className="flex flex-col gap-1.5 px-2">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-0.5">
            <span>Connecting to Donors</span>
            <span className="text-rose-600">.</span>
            <span className="inline-flex text-rose-600">
              <span style={{ animation: 'radarDotBlink 1.4s infinite', animationDelay: '0s' }}>.</span>
              <span style={{ animation: 'radarDotBlink 1.4s infinite', animationDelay: '0.2s' }}>.</span>
              <span style={{ animation: 'radarDotBlink 1.4s infinite', animationDelay: '0.4s' }}>.</span>
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
            Broadcasting signals &amp; searching active donors within {siteConfig?.radarRadiusKm || 25}km
          </p>
        </div>
      </div>
    </div>
  );
};
