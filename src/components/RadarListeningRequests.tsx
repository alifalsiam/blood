import React, { useEffect } from 'react';
import { Droplet, Heart, User, Activity, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { startRadarLoop, stopRadarLoop } from '../lib/sound';

export const RadarListeningRequests: React.FC = () => {
  const { isSoundMuted, activityStatus } = useAuth();

  useEffect(() => {
    if (!isSoundMuted && activityStatus === 'online') {
      startRadarLoop();
    } else {
      stopRadarLoop();
    }

    return () => {
      stopRadarLoop();
    };
  }, [isSoundMuted, activityStatus]);

  return (
    <div className="w-full flex flex-col items-center justify-center py-8 px-3 bg-white/60 backdrop-blur-xs rounded-2xl border border-rose-100 shadow-2xs overflow-hidden min-h-[400px]">
      <style>{`
        @keyframes radarRingExpand {
          0% { opacity: 0.8; transform: scale(0.8); border-color: rgba(225, 29, 72, 0.8); }
          100% { opacity: 0; transform: scale(1.15); border-color: rgba(225, 29, 72, 0.1); }
        }
        @keyframes radarSweepRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radarHubPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.8); }
          70% { transform: scale(1.06); box-shadow: 0 0 0 20px rgba(225, 29, 72, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
        }
        @keyframes radarWaveBurst {
          0% { width: 58px; height: 58px; opacity: 1; transform: scale(1); }
          100% { width: 250px; height: 250px; opacity: 0; transform: scale(1); }
        }
        @keyframes radarNodeBlink {
          0% { transform: scale(0.9); box-shadow: 0 0 0 rgba(225, 29, 72, 0.2); border-color: #cbd5e1; color: #94a3b8; }
          100% { transform: scale(1.1); box-shadow: 0 0 15px rgba(225, 29, 72, 0.8); border-color: #e11d48; color: #e11d48; }
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

      <div className="w-full max-w-[360px] flex flex-col items-center gap-6 text-center">
        {/* Dynamic Radar Stage */}
        <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] flex items-center justify-center">
          
          {/* Concentric Radar Rings */}
          <div 
            className="absolute rounded-full border border-dashed border-rose-500/40 w-[75px] h-[75px] sm:w-[85px] sm:h-[85px]"
            style={{ animation: 'radarRingExpand 1.5s infinite linear', animationDelay: '0s' }}
          />
          <div 
            className="absolute rounded-full border border-dashed border-rose-500/40 w-[145px] h-[145px] sm:w-[160px] sm:h-[160px]"
            style={{ animation: 'radarRingExpand 1.5s infinite linear', animationDelay: '0.5s' }}
          />
          <div 
            className="absolute rounded-full border border-dashed border-rose-500/40 w-[215px] h-[215px] sm:w-[235px] sm:h-[235px]"
            style={{ animation: 'radarRingExpand 1.5s infinite linear', animationDelay: '1s' }}
          />

          {/* Radar Sweeping Beam */}
          <div 
            className="absolute w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] top-[calc(50%-130px)] left-[calc(50%-130px)] sm:top-[calc(50%-150px)] sm:left-[calc(50%-150px)] rounded-tl-[130px] sm:rounded-tl-[150px] pointer-events-none z-4"
            style={{
              background: 'conic-gradient(from 0deg at 100% 100%, rgba(225, 29, 72, 0) 0deg, rgba(225, 29, 72, 0.4) 360deg)',
              transformOrigin: '100% 100%',
              animation: 'radarSweepRotate 2s linear infinite',
            }}
          />

          {/* Expanding Signal Waves */}
          <div 
            className="absolute w-[58px] h-[58px] rounded-full border-2 border-rose-600 z-3"
            style={{ animation: 'radarWaveBurst 1s infinite linear' }}
          />
          <div 
            className="absolute w-[58px] h-[58px] rounded-full border-2 border-rose-600 z-3"
            style={{ animation: 'radarWaveBurst 1s infinite linear', animationDelay: '0.5s' }}
          />

          {/* Center Hub */}
          <div 
            className="relative z-10 w-[58px] h-[58px] sm:w-[66px] sm:h-[66px] bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg"
            style={{ animation: 'radarHubPulse 1s infinite cubic-bezier(0.4, 0, 0.6, 1)' }}
          >
            <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>

          {/* Orbit 1 */}
          <div 
            className="absolute w-[145px] h-[145px] sm:w-[160px] sm:h-[160px] rounded-full pointer-events-none"
            style={{ animation: 'radarOrbitClockwise 6s linear infinite' }}
          >
            <div 
              className="absolute top-[-16px] left-[calc(50%-16px)] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-rose-600 text-rose-600 flex items-center justify-center shadow-md z-6 pointer-events-auto"
              style={{ animation: 'radarNodeBlink 1s infinite alternate ease-in-out' }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ animation: 'radarCounterRotate 6s linear infinite' }}
              >
                <Heart className="w-3.5 h-3.5 text-rose-600" />
              </div>
            </div>

            <div 
              className="absolute bottom-[10px] right-[10px] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-rose-600 text-rose-600 flex items-center justify-center shadow-md z-6 pointer-events-auto"
              style={{ animation: 'radarNodeBlink 1s infinite alternate ease-in-out', animationDelay: '0.3s' }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ animation: 'radarCounterRotate 6s linear infinite' }}
              >
                <User className="w-3.5 h-3.5 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Orbit 2 */}
          <div 
            className="absolute w-[215px] h-[215px] sm:w-[235px] sm:h-[235px] rounded-full pointer-events-none"
            style={{ animation: 'radarOrbitCounter 8s linear infinite' }}
          >
            <div 
              className="absolute top-[30px] right-[-16px] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-rose-600 text-rose-600 flex items-center justify-center shadow-md z-6 pointer-events-auto"
              style={{ animation: 'radarNodeBlink 1s infinite alternate ease-in-out' }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ animation: 'radarCounterRotateReverse 8s linear infinite' }}
              >
                <Droplet className="w-3.5 h-3.5 text-rose-600" />
              </div>
            </div>

            <div 
              className="absolute bottom-[-16px] left-[calc(50%-16px)] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-rose-600 text-rose-600 flex items-center justify-center shadow-md z-6 pointer-events-auto"
              style={{ animation: 'radarNodeBlink 1s infinite alternate ease-in-out', animationDelay: '0.3s' }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ animation: 'radarCounterRotateReverse 8s linear infinite' }}
              >
                <Building2 className="w-3.5 h-3.5 text-rose-600" />
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Loader Text Area */}
        <div className="flex flex-col gap-1.5 px-2">
          <h3 className="text-[17px] sm:text-[20px] font-extrabold text-slate-800 tracking-tight flex items-center justify-center">
            Listening for Requests<span className="text-rose-600">.</span>
            <span className="inline-flex text-rose-600 font-extrabold">
              <span style={{ animation: 'radarDotBlink 1.4s infinite', animationDelay: '0s' }}>.</span>
              <span style={{ animation: 'radarDotBlink 1.4s infinite', animationDelay: '0.2s' }}>.</span>
              <span style={{ animation: 'radarDotBlink 1.4s infinite', animationDelay: '0.4s' }}>.</span>
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xs mx-auto">
            scouting for life saving needs
          </p>
        </div>
      </div>
    </div>
  );
};
