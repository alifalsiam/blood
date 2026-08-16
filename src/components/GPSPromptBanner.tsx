import React, { useState, useEffect } from 'react';
import { getCurrentGPSPosition, GPSCoordinates } from '../lib/location';
import { useAuth } from '../context/AuthContext';
import { MapPin, Navigation, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface GPSPromptProps {
  onLocationUpdated?: (coords: GPSCoordinates) => void;
}

export const GPSPromptBanner: React.FC<GPSPromptProps> = ({ onLocationUpdated }) => {
  const { siteConfig } = useAuth();
  const [gpsState, setGpsState] = useState<'prompt' | 'loading' | 'success' | 'error'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [coords, setCoords] = useState<GPSCoordinates | null>(null);

  const requestGPS = async () => {
    setGpsState('loading');
    setErrorMessage('');
    try {
      const position = await getCurrentGPSPosition();
      setCoords(position);
      setGpsState('success');
      if (onLocationUpdated) {
        onLocationUpdated(position);
      }
    } catch (err: any) {
      setGpsState('error');
      setErrorMessage(err.message || 'GPS Signal unavailable. Please turn on Location services.');
    }
  };

  useEffect(() => {
    // Check GPS status on mount silently
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCoords(c);
          setGpsState('success');
          if (onLocationUpdated) onLocationUpdated(c);
        },
        () => {
          setGpsState('prompt');
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  if (gpsState === 'success' && coords) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800 my-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>GPS Radar Active ({siteConfig?.radarRadiusKm || 25}km):</strong> ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})
          </span>
        </div>
        <button
          type="button"
          onClick={requestGPS}
          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
        >
          Refresh GPS
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 rounded-xl p-4 my-2 shadow-xs transition-all">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0">
          <Navigation className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>🚨 Precise GPS Radar Required ({siteConfig?.radarRadiusKm || 25}km Radius)</span>
          </h4>
          <p className="text-xs text-slate-600 font-medium mt-1">
            LifeDrop matches donors & emergency requests strictly within a {siteConfig?.radarRadiusKm || 25}km geographical radius. Please enable your mobile/desktop GPS location services for accurate distance metrics.
          </p>

          {gpsState === 'error' && (
            <div className="mt-2 text-[11px] font-bold text-rose-700 bg-rose-100/80 p-2 rounded-lg flex items-center gap-1.5 border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={requestGPS}
              disabled={gpsState === 'loading'}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              {gpsState === 'loading' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Acquiring Precise GPS...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Turn ON & Acquire GPS</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
