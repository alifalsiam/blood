import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { isBloodCompatible } from '../lib/bloodCompatibility';
import { calculateDistanceKm } from '../lib/location';
import { playBlinkSound } from '../lib/sound';
import { GPSPromptBanner } from '../components/GPSPromptBanner';
import { RadarListeningRequests } from '../components/RadarListeningRequests';
import { 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Heart, 
  Check, 
  Phone, 
  User, 
  Building2, 
  Clock, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  WifiOff,
  Power,
  Volume2,
  VolumeX
} from 'lucide-react';

export interface BagRequirement {
  'Whole Blood'?: number;
  'Platelets'?: number;
  'Plasma'?: number;
  'Double Red Cells'?: number;
}

export interface RequestItem {
  id: string;
  bloodGroup: string;
  hospital: string;
  address: string;
  distance: string;
  reason: string;
  expiresAt: number;
  receiverName: string;
  receiverPhone: string;
  receiverWhatsapp: string;
  receiverEmergencyContact: string;
  bags: BagRequirement;
  state: 'incoming' | 'accepted' | 'active' | 'completed' | 'finalized';
  isRemoving?: boolean;
}

export const DonorStreamBlock: React.FC = () => {
  const { showToast, activityStatus, toggleActivityStatus, user, isSoundMuted, toggleSoundMute, allBloodRequests, acceptBloodRequest, declineBloodRequest, donorConfirmArrival, donorMarkCompleted, updateProfile, siteConfig } = useAuth();
  
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());
  const [arrivedIds, setArrivedIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [hiddenFinalizedIds, setHiddenFinalizedIds] = useState<Set<string>>(new Set());
  
  const [isLiveOpen, setIsLiveOpen] = useState<boolean>(true);
  const [isActiveOpen, setIsActiveOpen] = useState<boolean>(true);

  // Map backend blood requests to the local UI structure
  const currentUserId = user.id || user.userId;

  useEffect(() => {
    const finalizedReqs = allBloodRequests.filter(req => 
      req.matchStage === 'rating_submitted' && 
      req.selectedDonorId === currentUserId &&
      !hiddenFinalizedIds.has(req.id)
    );

    if (finalizedReqs.length > 0) {
      const processedStr = localStorage.getItem('lifedrop_processed_donations_history') || '[]';
      const processed = JSON.parse(processedStr);
      let isProfileUpdated = false;

      finalizedReqs.forEach(req => {
        if (!processed.includes(req.id)) {
          processed.push(req.id);
          isProfileUpdated = true;
          
          let categoryParts = [];
          if (req.qtyWhole > 0) categoryParts.push(`Whole Blood (${req.qtyWhole} Bag${req.qtyWhole > 1 ? 's' : ''})`);
          if (req.qtyPlatelets > 0) categoryParts.push(`Platelets (${req.qtyPlatelets} Bag${req.qtyPlatelets > 1 ? 's' : ''})`);
          if (req.qtyPlasma > 0) categoryParts.push(`Plasma (${req.qtyPlasma} Bag${req.qtyPlasma > 1 ? 's' : ''})`);
          if (req.qtyDoubleRed > 0) categoryParts.push(`Double Red (${req.qtyDoubleRed} Bag${req.qtyDoubleRed > 1 ? 's' : ''})`);
          const catString = categoryParts.join(', ') || 'Blood Donation';

          const matchedMe = req.matchedDonors?.find(d => d.id === currentUserId);
          const ratingReceived = matchedMe?.ratingGiven || 5;

          const nextDonations = (user.totalDonations || 0) + 1;
          const currentRating = user.rating || 5.0;
          const calculatedRating = Number((((currentRating * (user.totalDonations || 0)) + ratingReceived) / nextDonations).toFixed(1));
          
          updateProfile({
            totalDonations: nextDonations,
            rating: calculatedRating,
            lastDonatedDate: new Date().toISOString().split('T')[0],
          });

          try {
            const histStr = localStorage.getItem('lifedrop_activity_history');
            const histList = histStr ? JSON.parse(histStr) : [];
            const newEntry = {
              id: `req-${req.id}-donation-${Date.now()}`,
              type: 'Donation Completed',
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              hospitalName: req.hospitalName,
              hospitalAddress: req.hospitalLocation,
              bloodType: req.bloodType,
              category: catString,
              status: 'Completed',
              notes: `Received ${ratingReceived}★ Rating from recipient`,
              createdAt: new Date().toISOString()
            };
            const updated = [newEntry, ...histList.filter((h: any) => h.id !== newEntry.id)];
            localStorage.setItem('lifedrop_activity_history', JSON.stringify(updated));
            window.dispatchEvent(new Event('lifedrop_history_updated'));
          } catch (e) {}
        }

        setTimeout(() => {
          setHiddenFinalizedIds(prev => {
            const next = new Set(prev);
            next.add(req.id);
            return next;
          });
        }, 10000);
      });

      if (isProfileUpdated) {
        localStorage.setItem('lifedrop_processed_donations_history', JSON.stringify(processed));
      }
    }
  }, [allBloodRequests, hiddenFinalizedIds, currentUserId, user.totalDonations, user.rating, updateProfile]);
  
  const requests: RequestItem[] = allBloodRequests
    .filter(req => (req.status === 'active' || (req.status === 'fulfilled' && req.selectedDonorId === currentUserId)) && req.expiresAt > Date.now() && !hiddenFinalizedIds.has(req.id))
    .map(req => {
      const matchedMe = req.matchedDonors?.find(d => d.id === currentUserId);
      let state: RequestItem['state'] | null = null;
      
      if (matchedMe) {
        if (matchedMe.status === 'In 25km Zone') {
          // Donor has not been requested by receiver yet!
          state = null;
        } else if (matchedMe.status === 'Notified') {
          state = 'incoming';
        } else if (matchedMe.status === 'Declined') {
          state = null;
        } else {
          if (req.matchStage === 'rating_submitted') {
            state = 'finalized';
          } else if (completedIds.has(req.id) || req.matchStage === 'donor_completed') {
            state = 'completed';
          } else if (arrivedIds.has(req.id) || req.matchStage === 'receiver_confirmed') {
            state = 'active';
          } else {
            state = 'accepted';
          }
        }
      }

      return {
        id: req.id,
        bloodGroup: req.bloodType,
        hospital: req.hospitalName,
        address: req.hospitalLocation,
        distance: matchedMe?.distanceKm !== undefined
          ? `${matchedMe.distanceKm} km`
          : (user.latitude && user.longitude && req.latitude && req.longitude) 
            ? `${calculateDistanceKm(user.latitude, user.longitude, req.latitude, req.longitude)} km` 
            : '2.5 km',
        reason: req.reasonNeeded,
        expiresAt: req.expiresAt,
        receiverName: req.userName || 'Receiver',
        receiverPhone: req.userPhone || 'Hidden',
        receiverWhatsapp: req.userWhatsapp || req.userPhone || 'Hidden',
        receiverEmergencyContact: req.userEmergencyContact || req.userPhone || 'Hidden',
        bags: {
          'Whole Blood': req.qtyWhole > 0 ? req.qtyWhole : undefined,
          'Platelets': req.qtyPlatelets > 0 ? req.qtyPlatelets : undefined,
          'Plasma': req.qtyPlasma > 0 ? req.qtyPlasma : undefined,
          'Double Red Cells': req.qtyDoubleRed > 0 ? req.qtyDoubleRed : undefined,
        },
        state,
        isRemoving: declinedIds.has(req.id)
      };
    })
    .filter(r => r.state !== null && (!declinedIds.has(r.id) || r.isRemoving)) as RequestItem[];

  // Filter incoming requests strictly by donor's blood group compatibility (Specification Step 1 & 2)
  const donorBloodGroup = user?.bloodGroup || 'A+';
  const compatibleRequests = requests.filter(r => isBloodCompatible(donorBloodGroup, r.bloodGroup));

  // Incoming + Accepted requests belong in Dropdown 1
  const incomingList = compatibleRequests.filter(r => r.state === 'incoming' || r.state === 'accepted');
  // Active + Completed + Finalized requests belong in Dropdown 2 (Active Donations)
  const activeList = requests.filter(r => r.state === 'active' || r.state === 'completed' || r.state === 'finalized');

  const prevIncomingCountRef = useRef(0);
  useEffect(() => {
    if (incomingList.length > prevIncomingCountRef.current) {
      if (!isSoundMuted && activityStatus === 'online') {
        playBlinkSound();
      }
    }
    prevIncomingCountRef.current = incomingList.length;
  }, [incomingList.length, isSoundMuted, activityStatus]);

  const handleDecline = (id: string) => {
    setDeclinedIds(prev => new Set(prev).add(id));
    declineBloodRequest(id);
    showToast(`Request declined and removed.`, true);
  };

  const handleShowInterest = (id: string) => {
    acceptBloodRequest(id);
    setIsLiveOpen(true);
  };

  const handleConfirmArrival = (id: string) => {
    setArrivedIds(prev => new Set(prev).add(id));
    donorConfirmArrival(id);
    setIsActiveOpen(true);
  };

  const handleMarkCompleted = (id: string) => {
    setCompletedIds(prev => new Set(prev).add(id));
    donorMarkCompleted(id);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-2">

      {/* GPS Radar Location Banner */}
      <GPSPromptBanner />


      {/* ========================================================= */}
      {/* 1. LIVE DONOR DASHBOARD DROPDOWN (INCOMING REQUESTS)       */}
      {/* ========================================================= */}
      <div className={`bg-white border-2 border-[#ffccd5] rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(230,57,70,0.08)] transition-all`}>
        {/* Toggle Header */}
        <div className="w-full bg-[#fff1f2] p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#ffccd5] select-none text-left">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e63946] animate-pulse shadow-[0_0_0_4px_rgba(230,57,70,0.2)]" />
            <h2 className="text-base sm:text-lg font-bold text-[#c52233] flex items-center gap-2">
              Live Donor Dashboard ({incomingList.length} Active Requests)
              <button
                type="button"
                onClick={toggleSoundMute}
                className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-colors cursor-pointer"
                title={isSoundMuted ? 'Unmute radar sound' : 'Mute radar sound'}
              >
                {isSoundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </h2>
          </div>
          <button 
            type="button"
            onClick={() => setIsLiveOpen(!isLiveOpen)}
            className="text-[#e63946] font-bold text-sm cursor-pointer hover:bg-rose-100 p-1 rounded-full transition-colors"
          >
            {isLiveOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Dropdown Content */}
        {isLiveOpen && (
          <div className="p-4 sm:p-5 bg-slate-50 transition-all">
            {activityStatus === 'offline' ? (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-3 shadow-md animate-in fade-in duration-300">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                  <WifiOff className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-amber-900">You are currently OFFLINE</h3>
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    "Go ONLINE to see blood requests" — Emergency {siteConfig?.radarRadiusKm || 25}km radar requests are blocked while you are offline.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleActivityStatus}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Power className="w-4 h-4" />
                  <span>Go ONLINE Now</span>
                </button>
              </div>
            ) : incomingList.length === 0 ? (
              <RadarListeningRequests />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingList.map(req => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    onDecline={handleDecline}
                    onShowInterest={handleShowInterest}
                    onConfirmArrival={handleConfirmArrival}
                    onMarkCompleted={handleMarkCompleted}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. ACTIVE DONATIONS DROPDOWN                               */}
      {/* ========================================================= */}
      <div className="bg-white border-2 border-[#a3d9cf] rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(42,157,143,0.08)] transition-all">
        {/* Toggle Header */}
        <button
          type="button"
          onClick={() => setIsActiveOpen(!isActiveOpen)}
          className="w-full bg-[#e9f5f2] p-4 sm:p-5 flex items-center justify-between cursor-pointer border-b-2 border-[#a3d9cf] select-none text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2a9d8f] animate-pulse shadow-[0_0_0_4px_rgba(42,157,143,0.2)]" />
            <h2 className="text-base sm:text-lg font-bold text-[#0f766e]">
              Active Donations ({activeList.length})
            </h2>
          </div>
          <span className="text-[#2a9d8f] font-bold text-sm">
            {isActiveOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </span>
        </button>

        {/* Dropdown Content */}
        {isActiveOpen && (
          <div className="p-4 sm:p-5 bg-slate-50 transition-all">
            {activeList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-medium text-sm">
                No active donations yet. Press <strong className="text-[#2a9d8f]">Confirm Arrival</strong> on an accepted request to shift it here!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeList.map(req => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    onDecline={handleDecline}
                    onShowInterest={handleShowInterest}
                    onConfirmArrival={handleConfirmArrival}
                    onMarkCompleted={handleMarkCompleted}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

/* ==================================================================== */
/* INDIVIDUAL REQUEST CARD COMPONENT                                    */
/* ==================================================================== */
interface RequestCardProps {
  req: RequestItem;
  onDecline: (id: string) => void;
  onShowInterest: (id: string) => void;
  onConfirmArrival: (id: string) => void;
  onMarkCompleted: (id: string) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({
  req,
  onDecline,
  onShowInterest,
  onConfirmArrival,
  onMarkCompleted
}) => {
  // Active Bags needed
  const activeBagsEntries = (Object.entries(req.bags) as [string, number][]).filter(([_, count]) => (count || 0) >= 1);

  const [timeLeftStr, setTimeLeftStr] = useState('00:00:00');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const diff = req.expiresAt - now;

      if (diff <= 0) {
        setTimeLeftStr('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const hh = hours < 10 ? '0' + hours : hours;
      const mm = mins < 10 ? '0' + mins : mins;
      const ss = secs < 10 ? '0' + secs : secs;

      if (hours > 0) {
        setTimeLeftStr(`${hh}:${mm}:${ss}`);
      } else {
        setTimeLeftStr(`${mm}:${ss}`);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [req.expiresAt]);

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between transition-all duration-300 ${
        req.isRemoving ? 'opacity-0 scale-90 max-h-0 p-0 overflow-hidden border-none margin-0' : ''
      }`}
    >
      <div>
        {/* Top Row: Blood Type Pill & Timeout Badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="bg-[#fff1f2] text-[#e63946] border border-[#ffccd5] px-2.5 py-0.5 rounded-full text-xs font-bold">
            {req.bloodGroup} Match
          </span>
          <span className="bg-[#fef3c7] text-[#d97706] border border-[#fde68a] px-2 py-0.5 rounded-md text-[0.72rem] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="tabular-nums tracking-wider">{timeLeftStr}</span>
          </span>
        </div>

        {/* Compact Details Box */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 mb-3 text-xs leading-relaxed space-y-1.5">
          <div className="flex items-center justify-between gap-1 font-bold text-[#1d3557]">
            <span className="truncate">🏥 {req.hospital}</span>
            <span className="text-[0.75rem] text-[#e63946] font-semibold whitespace-nowrap">
              📍 {req.distance}
            </span>
          </div>

          <div className="text-slate-500 text-[0.76rem] truncate">
            {req.address}
          </div>

          {/* Bags Line */}
          <div className="border-y border-dashed border-slate-200 py-1.5 my-1 text-[0.78rem] text-[#1d3557] space-y-1">
            <span className="text-[0.7rem] text-slate-500 font-semibold uppercase block">
              Bags Needed:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeBagsEntries.map(([component, count]) => (
                <span
                  key={component}
                  className="bg-[#fff1f2] text-[#c52233] border border-[#ffccd5] px-1.5 py-0.5 rounded text-[0.72rem] font-bold"
                >
                  {component}: {count} Bag{(count || 0) > 1 ? 's' : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Reason Line */}
          <div className="flex items-center justify-between gap-2 text-[0.78rem]">
            <span className="text-slate-500 font-semibold text-[0.7rem] uppercase">Reason:</span>
            <span className="font-semibold text-[#1d3557] truncate">{req.reason}</span>
          </div>
        </div>
      </div>

      {/* Workflow States & Actions */}
      <div>
        {/* State 1: Incoming */}
        {req.state === 'incoming' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDecline(req.id)}
              className="bg-[#6c757d] hover:bg-[#5a6268] text-white py-2 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => onShowInterest(req.id)}
              className="bg-[#e63946] hover:bg-[#c52233] text-white py-2 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center flex items-center justify-center gap-1"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span>Show Interest</span>
            </button>
          </div>
        )}

        {/* State 2: Accepted (Contact Unlocked, stays in Live Donor section until Confirm Arrival) */}
        {req.state === 'accepted' && (
          <div className="space-y-2">
            <div className="bg-[#e9f5f2] border border-[#a3d9cf] rounded-lg p-2 text-xs text-[#1d3557]">
              <div className="font-bold text-[#134e4a] text-[0.72rem] uppercase mb-0.5">
                Receiver Contact Unlocked ✓
              </div>
              <div className="truncate text-[0.7rem] sm:text-xs">
                👤 <strong>{req.receiverName}</strong> | 📞 <strong>{req.receiverEmergencyContact}</strong> | 📞 <strong>{req.receiverWhatsapp}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDecline(req.id)}
                className="bg-[#6c757d] hover:bg-[#5a6268] text-white py-2 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => onConfirmArrival(req.id)}
                className="bg-[#2a9d8f] hover:bg-[#238b7e] text-white py-2 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                Confirm Arrival
              </button>
            </div>
          </div>
        )}

        {/* State 3: Active (Shifted to Active Donations) */}
        {req.state === 'active' && (
          <div className="space-y-2">
            <div className="bg-[#e9f5f2] border border-[#a3d9cf] rounded-lg p-2 text-xs text-[#1d3557]">
              <div className="font-bold text-[#134e4a] text-[0.72rem] uppercase mb-0.5">
                Arrival Confirmed (En Route) ✓
              </div>
              <div className="truncate text-[0.7rem] sm:text-xs">
                👤 <strong>{req.receiverName}</strong> | 📞 <strong>{req.receiverEmergencyContact}</strong> | 📞 <strong>{req.receiverWhatsapp}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDecline(req.id)}
                className="bg-[#6c757d] hover:bg-[#5a6268] text-white py-2 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => onMarkCompleted(req.id)}
                className="bg-[#15803d] hover:bg-[#166534] text-white py-2 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                Mark Completed
              </button>
            </div>
          </div>
        )}

        {/* State 4: Completed (Waiting Receiver Review) */}
        {req.state === 'completed' && (
          <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-2.5 text-center space-y-1">
            <Loader2 className="w-4 h-4 text-[#d97706] animate-spin mx-auto" />
            <h4 className="text-xs font-bold text-[#92400e]">Pending Receiver Approval</h4>
            <p className="text-[0.72rem] text-slate-500">Waiting for receiver confirmation...</p>
          </div>
        )}

        {/* State 5: Finalized (Donation Successful!) */}
        {req.state === 'finalized' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center space-y-1">
            <h4 className="text-xs font-bold text-emerald-800">🎉 Donation Successfully Completed!</h4>
            <p className="text-[0.72rem] text-slate-600">You saved a life today. Thank you!</p>
          </div>
        )}
      </div>
    </div>
  );
};
