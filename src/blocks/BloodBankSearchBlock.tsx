import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Phone, Search, MapPin, ExternalLink, Navigation, Compass } from 'lucide-react';
import { divisionNamesWithSuffix, getDistrictsForDivision } from '../data/locationData';
import { calculateDistanceKm, getCurrentGPSPosition } from '../lib/location';

// Helper to extract lat/lon from Google Maps URLs if not explicitly stored
function extractCoordinatesFromUrl(url?: string): { latitude: number; longitude: number } | null {
  if (!url) return null;
  
  // Format 1: @23.7915,90.4042 or /@23.7915,90.4042,15z
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch && atMatch[1] && atMatch[2]) {
    return { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) };
  }
  
  // Format 2: ?q=23.7915,90.4042 or &query=23.7915,90.4042
  const qMatch = url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch && qMatch[1] && qMatch[2]) {
    return { latitude: parseFloat(qMatch[1]), longitude: parseFloat(qMatch[2]) };
  }
  
  return null;
}

export const BloodBankSearchBlock: React.FC = () => {
  const { user, bloodBanks, showToast } = useAuth();

  const [divisionVal, setDivisionVal] = useState<string>('');
  const [districtVal, setDistrictVal] = useState<string>('');
  const [searchVal, setSearchVal] = useState<string>('');
  const [sortByNearest, setSortByNearest] = useState<boolean>(false);
  
  // User's live GPS coordinates
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (user?.latitude && user?.longitude) {
      return { latitude: user.latitude, longitude: user.longitude };
    }
    return null;
  });
  const [locating, setLocating] = useState<boolean>(false);

  // Sync with user profile coordinates if they log in or update profile
  useEffect(() => {
    if (user?.latitude && user?.longitude && !userLocation) {
      setUserLocation({ latitude: user.latitude, longitude: user.longitude });
    }
  }, [user?.latitude, user?.longitude]);

  // Request browser GPS
  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentGPSPosition();
      setUserLocation({ latitude: pos.latitude, longitude: pos.longitude });
      setSortByNearest(true);
      showToast('📍 Live GPS location detected! Distance measured from your position.');
    } catch (err: any) {
      showToast('Could not access GPS location. Please allow location permissions in your browser.', true);
    } finally {
      setLocating(false);
    }
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setDivisionVal(value);
    setDistrictVal('');
  };

  const availableDistricts = divisionVal ? getDistrictsForDivision(divisionVal) : [];

  // Filter banks
  const filteredBanks = bloodBanks.filter(bank => {
    const bankDiv = (bank.division || '').toLowerCase().replace(' division', '').trim();
    const selectedDiv = (divisionVal || '').toLowerCase().replace(' division', '').trim();
    const matchesDivision = !divisionVal || bankDiv.includes(selectedDiv) || selectedDiv.includes(bankDiv);
    const matchesDistrict = !districtVal || (bank.district || '').toLowerCase() === districtVal.toLowerCase();
    const matchesSearch = !searchVal || (bank.name || '').toLowerCase().includes(searchVal.toLowerCase().trim());
    return matchesDivision && matchesDistrict && matchesSearch;
  });

  // Calculate live distance for each bank based on current user coordinates
  const banksWithDistance = filteredBanks.map(bank => {
    let lat = bank.latitude;
    let lon = bank.longitude;

    // If lat/lon not stored directly, attempt parsing from mapUrl
    if ((!lat || !lon) && bank.mapUrl) {
      const extracted = extractCoordinatesFromUrl(bank.mapUrl);
      if (extracted) {
        lat = extracted.latitude;
        lon = extracted.longitude;
      }
    }

    let calculatedDist: number | null = null;
    if (userLocation && lat && lon) {
      calculatedDist = calculateDistanceKm(userLocation.latitude, userLocation.longitude, lat, lon);
    }

    return {
      ...bank,
      resolvedLat: lat,
      resolvedLon: lon,
      liveDistanceKm: calculatedDist
    };
  });

  // Sort by nearest if user requested
  if (sortByNearest && userLocation) {
    banksWithDistance.sort((a, b) => {
      if (a.liveDistanceKm !== null && b.liveDistanceKm !== null) {
        return a.liveDistanceKm - b.liveDistanceKm;
      }
      if (a.liveDistanceKm !== null) return -1;
      if (b.liveDistanceKm !== null) return 1;
      return 0;
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] my-2">
      
      {/* Directory Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="text-xl bg-[#fff1f2] p-2 rounded-xl border border-[#ffccd5] flex-shrink-0">
            🏥
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1d3557]">
              Blood Bank Directory ({bloodBanks.length})
            </h2>
            <p className="text-xs text-slate-500">Live distance calculated dynamically from your real-time position to certified blood banks.</p>
          </div>
        </div>

        {/* Live GPS detector badge / button */}
        <div className="flex items-center gap-2 flex-wrap">
          {userLocation ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>GPS Live Active</span>
              </span>
              <button
                type="button"
                onClick={() => setSortByNearest(!sortByNearest)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  sortByNearest
                    ? 'bg-[#1d3557] text-white border-[#1d3557] shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{sortByNearest ? 'Sorted: Nearest First' : 'Sort by Nearest'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="text-xs px-3.5 py-1.5 bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#e63946] border border-[#ffccd5] rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <MapPin className={`w-3.5 h-3.5 ${locating ? 'animate-bounce text-rose-500' : ''}`} />
              <span>{locating ? 'Locating...' : '📍 Measure Distance from My GPS'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* Division Select */}
        <div className="space-y-1.5">
          <label htmlFor="divisionSelect" className="block text-xs font-bold text-[#1d3557] uppercase tracking-wider">
            Select Division
          </label>
          <select
            id="divisionSelect"
            value={divisionVal}
            onChange={handleDivisionChange}
            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white text-[#1d3557] outline-none focus:border-[#e63946] transition-colors cursor-pointer"
          >
            <option value="">All Divisions ({bloodBanks.length})</option>
            {divisionNamesWithSuffix.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        {/* District Select */}
        <div className="space-y-1.5">
          <label htmlFor="districtSelect" className="block text-xs font-bold text-[#1d3557] uppercase tracking-wider">
            Select District
          </label>
          <select
            id="districtSelect"
            value={districtVal}
            disabled={!divisionVal}
            onChange={(e) => setDistrictVal(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white text-[#1d3557] outline-none focus:border-[#e63946] transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 cursor-pointer"
          >
            <option value="">All Districts</option>
            {availableDistricts.map(dist => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="space-y-1.5">
          <label htmlFor="searchInput" className="block text-xs font-bold text-[#1d3557] uppercase tracking-wider">
            Search Name
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="searchInput"
              placeholder="Search blood bank by name..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-[#1d3557] outline-none focus:border-[#e63946] transition-colors"
            />
          </div>
        </div>

      </div>

      {/* Blood Banks List Feed */}
      <div className="space-y-3">
        {banksWithDistance.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No matching certified blood banks found. {bloodBanks.length === 0 ? "No blood banks added yet in Admin panel." : "Try clearing filters."}
          </div>
        ) : (
          banksWithDistance.map(bank => {
            const hasExplicitMap = Boolean(bank.mapUrl && bank.mapUrl.trim());
            const hasExplicitCoords = Boolean(bank.resolvedLat && bank.resolvedLon);
            const canShowMap = hasExplicitMap || hasExplicitCoords;
            const mapHref = bank.mapUrl && bank.mapUrl.trim() 
              ? bank.mapUrl 
              : (hasExplicitCoords ? `https://www.google.com/maps?q=${bank.resolvedLat},${bank.resolvedLon}` : '');

            return (
              <div
                key={bank.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-[#1d3557]">
                      {bank.name}
                    </h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                      {bank.district}
                    </span>
                    {/* Dynamic Real-Time Distance Badge */}
                    {bank.liveDistanceKm !== null ? (
                      <div className="inline-flex items-center gap-2 font-sans text-[13px] bg-white text-slate-900 border border-rose-200 pl-[5px] pr-[14px] py-[5px] rounded-full shadow-[0_4px_16px_-2px_rgba(225,29,72,0.12),0_2px_4px_-2px_rgba(0,0,0,0.04)] w-max">
                        <div className="inline-flex items-center justify-center w-7 h-7 bg-rose-50 rounded-full shrink-0 text-[13px] leading-none">
                          📍
                        </div>
                        <div className="inline-flex items-baseline gap-1 leading-none">
                          <span className="font-bold text-rose-600 tracking-[-0.02em]">{bank.liveDistanceKm} km</span>
                          <span className="text-[11px] font-medium text-slate-500 tracking-[-0.01em]">away</span>
                        </div>
                      </div>
                    ) : bank.distanceKm ? (
                      <div className="inline-flex items-center gap-2 font-sans text-[13px] bg-white text-slate-900 border border-slate-200 pl-[5px] pr-[14px] py-[5px] rounded-full shadow-sm w-max">
                        <div className="inline-flex items-center justify-center w-7 h-7 bg-slate-50 rounded-full shrink-0 text-[13px] leading-none">
                          📍
                        </div>
                        <div className="inline-flex items-baseline gap-1 leading-none">
                          <span className="font-bold text-slate-600 tracking-[-0.02em]">~{bank.distanceKm} km</span>
                          <span className="text-[11px] font-medium text-slate-400 tracking-[-0.01em]">away</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-slate-500 flex flex-col gap-1.5 mt-1.5">
                    <span className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#e63946] shrink-0 mt-0.5" />
                      <span>{bank.address || `${bank.division}, ${bank.district}`}</span>
                    </span>
                    <span className="flex items-start gap-1 text-[#1d3557]">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <strong>
                        {bank.phones && bank.phones.length > 0 
                          ? bank.phones.filter(p => p.trim()).join(', ') 
                          : bank.phone}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Show Map button ONLY if map URL or coordinates were provided */}
                  {canShowMap && (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => showToast(`Opening map location for ${bank.name}...`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>View Map</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
                    </a>
                  )}

                  <a
                    href={`tel:${bank.phone}`}
                    onClick={() => showToast(`Calling ${bank.name}...`)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#ffccd5] bg-[#fff1f2] text-[#e63946] hover:bg-[#ffe4e6] hover:border-[#e63946] rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Bank</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
