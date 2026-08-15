import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BloodType } from '../types';
import { MatchedDonorWorkflowCard } from '../components/MatchedDonorWorkflowCard';
import { RadarConnectingDonors } from '../components/RadarConnectingDonors';
import { GPSPromptBanner } from '../components/GPSPromptBanner';
import { isBloodCompatible, isEmergencyRequest } from '../lib/bloodCompatibility';
import { playBlinkSound } from '../lib/sound';
import html2canvas from 'html2canvas';
import { 
  Plus, 
  Minus,
  Clock, 
  Share2, 
  Download, 
  X, 
  Share, 
  MessageSquare, 
  Phone, 
  Droplet,
  Radio,
  MapPin,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Send,
  Sparkles,
  Zap,
  Filter,
  Navigation,
  ShieldCheck,
  Star,
  RefreshCw,
  Users,
  History,
  Calendar,
  Building2,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Volume2,
  VolumeX
} from 'lucide-react';

interface MatchedDonor {
  id: string;
  name: string;
  avatar: string;
  distanceKm: number;
  locationName: string;
  bloodGroup: string;
  status: 'En Route' | 'Accepted' | 'Notified' | 'In 25km Zone';
  rating: number;
  totalDonations: number;
  phone: string;
  etaMins?: number;
  lastActive: string;
  isSuperDonor?: boolean;
}

const initialDemoDonors: MatchedDonor[] = [];

export const ReceiverDashboardBlock: React.FC = () => {
  const { 
    user, 
    activeRequest, 
    createRequest, 
    cancelRequest, 
    confirmReceiverMatch,
    shareDonorContact,
    completeDonorDonation,
    submitReceiverRating, 
    requestSpecificDonor,
    showToast,
    siteConfig,
    isSoundMuted,
    toggleSoundMute
  } = useAuth();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [liveUsersList, setLiveUsersList] = useState<any[]>([]);

  // Keep an ultra-live local copy of registered users for strict ghost-filtering
  useEffect(() => {
    const fetchLiveUsers = () => {
      try {
        const stored = localStorage.getItem('lifedrop_registered_users');
        if (stored) setLiveUsersList(JSON.parse(stored));
      } catch (e) {}
    };
    fetchLiveUsers();
    const interval = setInterval(fetchLiveUsers, 2000);
    return () => clearInterval(interval);
  }, []);

  // Form states
  const [bloodType, setBloodType] = useState<BloodType>('A+');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalLocation, setHospitalLocation] = useState('');
  const [qtyWhole, setQtyWhole] = useState(0);
  const [qtyPlatelets, setQtyPlatelets] = useState(0);
  const [qtyPlasma, setQtyPlasma] = useState(0);
  const [qtyDoubleRed, setQtyDoubleRed] = useState(0);
  const [reasonNeeded, setReasonNeeded] = useState('');
  const [neededInHours, setNeededInHours] = useState<number | ''>('');

  const resetFormFields = () => {
    setBloodType('A+');
    setHospitalName('');
    setHospitalLocation('');
    setQtyWhole(0);
    setQtyPlatelets(0);
    setQtyPlasma(0);
    setQtyDoubleRed(0);
    setReasonNeeded('');
    setNeededInHours('');
    setStep(1);
  };

  // Rating & Review state
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [gpsAccuracyMsg, setGpsAccuracyMsg] = useState<string>('');

  // Timer countdown state
  const [timeLeftStr, setTimeLeftStr] = useState('00:00:00');
  const flyerRef = useRef<HTMLDivElement>(null);

  // Demo Donors state in 25km Radius
  const [isRadarDropdownOpen, setIsRadarDropdownOpen] = useState(true);
  const [isApprovedContactsDropdownOpen, setIsApprovedContactsDropdownOpen] = useState(true);
  const [donors, setDonors] = useState<MatchedDonor[]>(initialDemoDonors);
  const [donorFilter, setDonorFilter] = useState<'All' | 'Responded' | 'Nearest' | 'Super'>('All');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [pingedDonorIds, setPingedDonorIds] = useState<string[]>([]);

  // Workflow Donors state tracking across Discovery vs Approved Contacts sections
  const [workflowDonors, setWorkflowDonors] = useState<any[]>([]);
  const [hiddenCompletedDonorIds, setHiddenCompletedDonorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newlyTerminal = workflowDonors.filter(d => (d.state === 'completed' || d.state === 'declined') && !hiddenCompletedDonorIds.has(d.id));
    if (newlyTerminal.length > 0) {
      newlyTerminal.forEach(d => {
        if (d.state === 'declined') {
          // Log donor decline to history once
          try {
            const histStr = localStorage.getItem('lifedrop_activity_history');
            const histList = histStr ? JSON.parse(histStr) : [];
            const newEntry = {
              id: `req-${activeRequest?.id}-declined-${d.id}-${Date.now()}`,
              type: 'Donor Declined',
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              hospitalName: activeRequest?.hospitalName || 'Unknown',
              hospitalAddress: activeRequest?.hospitalLocation || 'Unknown',
              bloodType: d.bloodGroup,
              category: 'Donation Declined',
              status: 'Declined',
              notes: `${d.donorName} declined the blood donation request.`,
              createdAt: new Date().toISOString()
            };
            const updated = [newEntry, ...histList];
            localStorage.setItem('lifedrop_activity_history', JSON.stringify(updated));
            window.dispatchEvent(new Event('lifedrop_history_updated'));
          } catch (e) {}
        }

        setTimeout(() => {
          setHiddenCompletedDonorIds(prev => {
            const next = new Set(prev);
            next.add(d.id);
            return next;
          });
        }, 10000);
      });
    }
  }, [workflowDonors, hiddenCompletedDonorIds, activeRequest]);

  useEffect(() => {
    if (activeRequest && activeRequest.matchedDonors) {
      // Live Status Filter: Cross-reference matched donors with live registered users list
      const liveDonors = activeRequest.matchedDonors.filter(d => {
        // If they already completed or reviewed the donation, they stay on screen
        if (d.donorCompleted || d.ratingGiven || d.receiverConfirmed) return true;
        
        // Find their live profile
        const liveProfile = liveUsersList?.find(u => 
          u.id === d.id || 
          u.userId === d.id || 
          (u.email && u.email.toLowerCase() === d.email?.toLowerCase())
        );

        // If they exist in live database and their status is strictly 'offline', drop them from the screen instantly
        // ALSO ensure they are fully logged in and operating as a Donor
        if (liveProfile && (
          liveProfile.activityStatus === 'offline' || 
          liveProfile.onlineStatus === 'Offline' ||
          (liveProfile.isLoggedIn !== true && liveProfile.loginState !== 'Logged In') ||
          (liveProfile.role !== 'Donor' && liveProfile.activeRole !== 'Donor')
        )) {
          return false;
        }

        return true;
      });

      setWorkflowDonors(liveDonors.map(d => {
        let state = 'initial';
        if (d.status === 'Notified') state = 'pending';
        if (d.status === 'Declined') state = 'declined';
        if (d.status === 'Accepted' || d.hasExpressedInterest || d.hasSharedContact) state = 'approved';
        if (d.status === 'En Route') state = 'approved';
        if (d.receiverConfirmed) state = 'arrivalConfirmed';
        if (d.donorCompleted) state = 'review';
        if (d.ratingGiven) state = 'completed';

        return {
          id: d.id,
          donorName: d.name,
          avatarUrl: d.avatar,
          distanceKm: d.distanceKm,
          locationName: d.locationName,
          bloodGroup: d.bloodGroup,
          state,
          rating: d.rating,
          totalDonations: d.totalDonations,
          phone: d.phone,
          lastActive: d.lastActive,
          isSuperDonor: d.totalDonations >= 5,
          age: d.age || 25,
          weight: d.weight || 65,
          sex: d.sex || 'Unspecified',
          lastDonated: d.lastDonated || 'N/A',
          isVerified: d.isVerified || false
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      );
    } else {
      setWorkflowDonors([]);
    }
  }, [activeRequest, liveUsersList]);

  // Faster beep sound for each found donor
  useEffect(() => {
    // Only beep if there are matched donors and sound is not muted
    const foundCount = workflowDonors.filter(d => d.state === 'initial' || d.state === 'pending').length;
    if (foundCount > 0 && !isSoundMuted) {
      const intervalMs = Math.max(400, 2000 - (foundCount * 400));
      const interval = setInterval(() => {
        playBlinkSound();
      }, intervalMs);
      return () => clearInterval(interval);
    }
  }, [workflowDonors, isSoundMuted]);

  // Receiver 24h Compliance & Acknowledgment State
  const [isReceiverAcknowledged, setIsReceiverAcknowledged] = useState<boolean>(() => {
    return localStorage.getItem('lifedrop_receiver_24h_policy_ack') === 'true';
  });
  const [isAccountComplianceFlagged, setIsAccountComplianceFlagged] = useState<boolean>(false);

  const handleWorkflowDonorStateChange = (id: string, newState: any) => {
    if (newState === 'pending' && activeRequest) {
      requestSpecificDonor(activeRequest.id, id);
    } else if (newState === 'approved') {
      shareDonorContact(id);
    } else if (newState === 'arrivalConfirmed') {
      confirmReceiverMatch(id);
    } else if (newState === 'review') {
      completeDonorDonation(id);
    }
  };

  // 24-Hour Receiver Inaction Auto-Cleanup Effect
  useEffect(() => {
    const check24hInactionExpiry = () => {
      const NOW = Date.now();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

      setWorkflowDonors((prev) => {
        let removedCount = 0;
        const remaining = prev.filter((donor) => {
          if (donor.state === 'review') {
            const completedTime = (donor as any).completedAtTimestamp || (NOW - 1000);
            if (NOW - completedTime >= TWENTY_FOUR_HOURS_MS) {
              removedCount++;
              return false; // Automatically remove donor from approved contacts
            }
          }
          return true;
        });

        if (removedCount > 0) {
          setIsAccountComplianceFlagged(true);
          showToast(`⚠️ 24h Elapsed with Receiver Inaction! ${removedCount} donor record(s) automatically removed. Receiver account flagged for non-compliance policy review.`, true);
        }

        return remaining;
      });
    };

    const interval = setInterval(check24hInactionExpiry, 10000);
    return () => clearInterval(interval);
  }, [showToast]);

  // Simulate 24-Hour Inaction Expiry for instant testing
  const handleSimulate24hInactionExpiry = () => {
    let affectedCount = 0;
    setWorkflowDonors((prev) => {
      const remaining = prev.filter((donor) => {
        if (donor.state === 'review' || donor.state === 'arrivalConfirmed') {
          affectedCount++;
          return false; // Automatically remove due to simulated 24h inaction
        }
        return true;
      });
      return remaining;
    });

    if (affectedCount > 0) {
      setIsAccountComplianceFlagged(true);
      showToast(`⚠️ Simulated 24 Hours Inaction Expiry! ${affectedCount} donor(s) removed automatically due to receiver inaction. Receiver account flagged for potential ban.`, true);
    } else {
      showToast("No active completed donors to expire. Click 'Donation Completed' on a donor card first to test expiry!");
    }
  };

  // Responded discovery donors (Initial Step 1 or Pending)
  const discoveryRespondedDonors = workflowDonors.filter(
    (d) => d.state === 'initial' || d.state === 'pending' || d.state === 'declined'
  );

  // Approved & active matched donors (Approved Contacts, En Route, Review)
  const approvedActiveDonors = workflowDonors.filter(
    (d) => (d.state === 'approved' || d.state === 'arrivalPending' || d.state === 'arrivalConfirmed' || d.state === 'review' || d.state === 'completed') && !hiddenCompletedDonorIds.has(d.id)
  );

  // Completed donation records (Shifted automatically into saved history upon review approval)
  const completedDonationRecords = workflowDonors.filter(
    (d) => d.state === 'completed'
  );

  const handleGetFreeBrowserGPS = () => {
    if (!('geolocation' in navigator)) {
      showToast('Geolocation API is not supported by your browser.', true);
      return;
    }

    showToast('📡 Requesting free device GPS location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracyMsg(`📍 GPS Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)} (±${Math.round(accuracy)}m)`);
        showToast(`📍 Live GPS Acquired! 25km radar distance updated.`);
      },
      (err) => {
        showToast(`⚠️ Device Location Note: ${err.message}. Using default 25km center coordinates.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!activeRequest) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = activeRequest.expiresAt - now;

      if (diff <= 0) {
        setTimeLeftStr('Period Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const hh = hours < 10 ? '0' + hours : hours;
      const mm = mins < 10 ? '0' + mins : mins;
      const ss = secs < 10 ? '0' + secs : secs;

      setTimeLeftStr(`${hh}:${mm}:${ss}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeRequest]);

  // Radar pulsing pulse simulation
  useEffect(() => {
    if (!activeRequest) return;
    const scanInterval = setInterval(() => {
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 2000);
    }, 8000);
    return () => clearInterval(scanInterval);
  }, [activeRequest]);

  const handleNextStep = () => {
    if (step === 1 && !bloodType) {
      showToast('Please select a blood group.', true);
      return;
    }
    if (step === 2 && (!hospitalName.trim() || !hospitalLocation.trim())) {
      showToast('Please enter Hospital Name and Hospital Location & Address.', true);
      return;
    }
    if (step === 3) {
      const totalBags = qtyWhole + qtyPlatelets + qtyPlasma + qtyDoubleRed;
      if (totalBags <= 0) {
        showToast('At least one component must have more than 0 bags requested.', true);
        return;
      }
    }
    if (step === 4 && !reasonNeeded.trim()) {
      showToast('Please specify why blood is needed.', true);
      return;
    }
    if (step === 5) {
      const hoursNum = typeof neededInHours === 'number' ? neededInHours : parseInt(neededInHours, 10);
      if (!hoursNum || isNaN(hoursNum) || hoursNum <= 0) {
        showToast('Please specify valid needed within hours (at least 1 hour).', true);
        return;
      }
    }

    if (step < 5) {
      setStep((s) => s + 1);
    } else {
      const hoursNum = typeof neededInHours === 'number' ? neededInHours : parseInt(neededInHours, 10) || 4;
      createRequest({
        bloodType,
        hospitalName: hospitalName.trim(),
        hospitalLocation: hospitalLocation.trim(),
        qtyWhole,
        qtyPlatelets,
        qtyPlasma,
        qtyDoubleRed,
        reasonNeeded: reasonNeeded.trim(),
        neededInHours: hoursNum,
      });
      setIsWizardOpen(false);
      resetFormFields();
      showToast('🚨 Emergency Blood Request Broadcasted! 25km Radar search initiated.');
    }
  };

  const handleConfirmCancel = () => {
    const finalReason = cancelReason === 'Other' 
      ? (customReason.trim() || 'Other reason') 
      : (cancelReason || 'Cancelled by requester');
    cancelRequest(finalReason);
    setIsCancelModalOpen(false);
    setCancelReason('');
    setCustomReason('');
  };

  const handleCopyPostText = () => {
    if (!shareText) return;
    navigator.clipboard.writeText(shareText);
    showToast('📋 URGENT Blood Request POST text copied to clipboard!');
  };

  const handleDownloadFlyer = async () => {
    if (!flyerRef.current) return;
    try {
      const canvas = await html2canvas(flyerRef.current, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `lifedrop-emergency-${activeRequest?.bloodType || 'blood'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Emergency Flyer image downloaded successfully!');
    } catch (err) {
      showToast('Failed to generate flyer image.', true);
    }
  };

  const handleShareImage = async () => {
    if (!flyerRef.current) return;
    try {
      showToast('Generating flyer image for sharing...');
      const canvas = await html2canvas(flyerRef.current, { scale: 2, useCORS: true });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Failed to prepare flyer image.', true);
          return;
        }
        const file = new File([blob], `lifedrop-emergency-${activeRequest?.bloodType || 'blood'}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Urgent Blood Needed: ${activeRequest?.bloodType}`,
              text: `Emergency blood donation required at ${activeRequest?.hospitalName}`,
              files: [file],
            });
            showToast('Flyer image shared successfully!');
          } catch (shareErr) {
            // Share dialog cancelled by user or not supported
          }
        } else {
          // Fallback to downloading image for manual sharing
          const link = document.createElement('a');
          link.download = file.name;
          link.href = canvas.toDataURL('image/png');
          link.click();
          showToast('Flyer image downloaded! You can now share this image on social media.');
        }
      }, 'image/png');
    } catch (err) {
      showToast('Failed to share flyer image.', true);
    }
  };

  // Ping donor in 25km radius
  const handlePingDonor = (donorId: string, donorName: string) => {
    if (pingedDonorIds.includes(donorId)) return;
    setPingedDonorIds([...pingedDonorIds, donorId]);
    showToast(`📡 Emergency Ping sent directly to ${donorName} within 25km radius!`);
  };

  // Filtered and proximity-sorted donors list (Ascending order by proximity & compatible blood groups)
  const targetBloodType = activeRequest?.bloodType || 'A+';
  const filteredDonors = donors
    .filter((d) => isBloodCompatible(d.bloodGroup, targetBloodType))
    .filter((d) => {
      if (donorFilter === 'Responded') return d.status === 'En Route' || d.status === 'Accepted';
      if (donorFilter === 'Nearest') return d.distanceKm <= 5.0;
      if (donorFilter === 'Super') return d.isSuperDonor;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const totalMatchedCount = activeRequest
    ? (activeRequest.matchedDonors && activeRequest.matchedDonors.length > 0
        ? activeRequest.matchedDonors.length
        : filteredDonors.length)
    : 0;

  const prevMatchedCountRef = useRef(0);
  useEffect(() => {
    if (totalMatchedCount > prevMatchedCountRef.current) {
      if (!isSoundMuted) {
        playBlinkSound();
      }
    }
    prevMatchedCountRef.current = totalMatchedCount;
  }, [totalMatchedCount, isSoundMuted]);

  const totalRespondedCount = activeRequest
    ? (workflowDonors.filter(d => d.state !== 'initial' && d.state !== 'pending' && d.state !== 'declined').length + 
       donors.filter(d => d.status === 'En Route' || d.status === 'Accepted').length)
    : 0;

  // Broadcast ping to all 25km donors
  const handleBroadcastPingAll = () => {
    const allIds = donors.map(d => d.id);
    setPingedDonorIds(allIds);
    showToast(`📡 Emergency Alert Ping broadcasted to ALL ${totalMatchedCount} matched donors in 25km radius!`);
  };

  const cancelReasonsList = [
    '🌟 FOUND DONOR (FULFILLED)',
    'Patient got better: Blood is no longer needed because the patient stabilized.',
    'Other treatment worked: Patient treated with medication or fluids.',
    'Procedure cancelled: Surgery or medical procedure delayed or called off.',
    'Patient moved: Transferred to another hospital or discharged.',
    'Blood found elsewhere: Obtained from blood bank.',
    'Mistake or duplicate: Order submitted twice.',
    'Other',
  ];

  let shareText = '';
  if (activeRequest) {
    const qtyParts = [];
    if (activeRequest.qtyWhole > 0) qtyParts.push(`${activeRequest.qtyWhole} Whole Blood`);
    if (activeRequest.qtyPlatelets > 0) qtyParts.push(`${activeRequest.qtyPlatelets} Platelets (Apheresis)`);
    if (activeRequest.qtyPlasma > 0) qtyParts.push(`${activeRequest.qtyPlasma} Plasma`);
    if (activeRequest.qtyDoubleRed > 0) qtyParts.push(`${activeRequest.qtyDoubleRed} Double Red Cells`);
    const qtyString = qtyParts.length > 0 ? qtyParts.join(', ') : '';

    shareText = `🚨 URGENT BLOOD REQUEST 🚨
Group: ${activeRequest.bloodType}
Hospital: ${activeRequest.hospitalName}, ${activeRequest.hospitalLocation}
Reason: ${activeRequest.reasonNeeded}
${qtyString ? `Bags Needed: ${qtyString}\n` : ''}Contact: ${user.phone} (WhatsApp)
Emergency Contact: ${user.emergencyContact || 'Not Provided'}
Share life, share blood! - ${siteConfig?.companyName || 'LifeDrop Network'}`;
  }

  return (
    <div className="space-y-6">
      {/* GPS Radar Banner */}
      <GPSPromptBanner />

      {/* Cancel Request Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-rose-600 mb-2">Cancel Blood Request</h3>
            <p className="text-xs text-slate-500 mb-4">
              Please select or specify why you are cancelling this emergency request:
            </p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg mb-3 focus:outline-none focus:border-rose-500"
            >
              <option value="">Choose reason...</option>
              {cancelReasonsList.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {cancelReason === 'Other' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify details..."
                rows={2}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg mb-4 focus:outline-none focus:border-rose-500"
              />
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Keep Request
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Receiver Bento Box: Emergency Request Broadcast */}
      {!activeRequest && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          {!isWizardOpen && (
            <div className="text-center py-10 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">No Active Blood Broadcast</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Create an urgent request with details to broadcast across nearby donors in 25km radius.
              </p>
              <button
                onClick={() => setIsWizardOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Blood Request</span>
              </button>
            </div>
          )}

          {/* Multi-step Wizard */}
          {isWizardOpen && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-800">Create Blood Request</span>
                <span className="text-xs font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                  Step {step} of 4
                </span>
              </div>

              {/* Steps dots */}
              <div className="flex justify-between items-center mb-6 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      s === step
                        ? 'bg-rose-600 text-white shadow-xs'
                        : s < step
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Select Blood Group Wanted
                  </label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value as BloodType)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="e.g., Square Hospital, Dhaka"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital Location & Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={hospitalLocation}
                      onChange={(e) => setHospitalLocation(e.target.value)}
                      placeholder="e.g., 18 Bir Uttam Qazi Nuruzzaman Sarak, Panthapath, Dhaka"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      Specify Bags Needed by Component <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      Total: {qtyWhole + qtyPlatelets + qtyPlasma + qtyDoubleRed} Bag(s)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Use the lower (−) or higher (+) buttons to adjust bags needed for each component. At least one component must be greater than 0.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Whole Blood */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Whole Blood</div>
                        <div className="text-[10px] text-slate-500">Standard transfusion bags</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQtyWhole(Math.max(0, qtyWhole - 1))}
                          disabled={qtyWhole <= 0}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 active:bg-rose-200 border border-slate-200 text-slate-700 hover:text-rose-700 font-bold flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                          title="Lower quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-extrabold text-slate-900 select-none">
                          {qtyWhole}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQtyWhole(qtyWhole + 1)}
                          className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                          title="Higher quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Platelets */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Platelets (Apheresis)</div>
                        <div className="text-[10px] text-slate-500">Concentrated platelets</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQtyPlatelets(Math.max(0, qtyPlatelets - 1))}
                          disabled={qtyPlatelets <= 0}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 active:bg-rose-200 border border-slate-200 text-slate-700 hover:text-rose-700 font-bold flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                          title="Lower quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-extrabold text-slate-900 select-none">
                          {qtyPlatelets}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQtyPlatelets(qtyPlatelets + 1)}
                          className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                          title="Higher quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Plasma */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Plasma</div>
                        <div className="text-[10px] text-slate-500">Fresh frozen plasma</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQtyPlasma(Math.max(0, qtyPlasma - 1))}
                          disabled={qtyPlasma <= 0}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 active:bg-rose-200 border border-slate-200 text-slate-700 hover:text-rose-700 font-bold flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                          title="Lower quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-extrabold text-slate-900 select-none">
                          {qtyPlasma}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQtyPlasma(qtyPlasma + 1)}
                          className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                          title="Higher quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Double Red Cells */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Double Red Cells</div>
                        <div className="text-[10px] text-slate-500">Concentrated red cells</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQtyDoubleRed(Math.max(0, qtyDoubleRed - 1))}
                          disabled={qtyDoubleRed <= 0}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 active:bg-rose-200 border border-slate-200 text-slate-700 hover:text-rose-700 font-bold flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                          title="Lower quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-extrabold text-slate-900 select-none">
                          {qtyDoubleRed}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQtyDoubleRed(qtyDoubleRed + 1)}
                          className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                          title="Higher quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {step === 4 && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Why is blood needed? <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reasonNeeded}
                    onChange={(e) => setReasonNeeded(e.target.value)}
                    placeholder="Explain the medical condition, e.g., Emergency surgery trauma care or critical ICU transfusion..."
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 placeholder:text-slate-400"
                  />
                </div>
              )}

              {/* Step 5 */}
              {step === 5 && (
                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Needed Within (Hours) <span className="text-rose-500">*</span>
                  </label>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[2, 4, 8, 12, 24, 48].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setNeededInHours(h)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          neededInHours === h
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {h} Hours
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          const current = typeof neededInHours === 'number' ? neededInHours : 4;
                          setNeededInHours(Math.max(1, current - 1));
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold flex items-center justify-center transition-all cursor-pointer"
                        title="Lower hours"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={neededInHours}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNeededInHours(val === '' ? '' : parseInt(val, 10) || 1);
                        }}
                        placeholder="e.g., 4"
                        className="w-20 text-center text-sm font-extrabold text-slate-900 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = typeof neededInHours === 'number' ? neededInHours : 0;
                          setNeededInHours(current + 1);
                        }}
                        className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title="Higher hours"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">
                      Hours required before urgency expires
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-between mt-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-600 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  {step === 5 ? 'Broadcast Request & Search 25km Radius' : 'Next Step'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Active Request Dashboard & 25km Radar Search */}
      {activeRequest && (
        <div className="space-y-4">
          {/* Ultra-Thin Responsive Emergency Broadcast Card Component */}
          <div className="bg-white border-2 border-[#ffccd5] rounded-[14px] p-3.5 md:p-[16px_24px] shadow-[0_4px_16px_rgba(230,57,70,0.06)] hover:shadow-[0_8px_24px_rgba(230,57,70,0.1)] transition-all">
            <div className="md:flex md:items-center md:justify-between md:gap-5">
              
              {/* Left Side: Main Title Content & Mobile Cancel Row */}
              <div className="flex-grow">
                {/* Mobile Only Top Row for Cancel Button */}
                <div className="flex justify-end mb-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="bg-transparent border border-[#dee2e6] text-[#6c757d] hover:bg-[#fee2e2] hover:text-[#b91c1c] hover:border-[#fca5a5] px-2 py-0.5 rounded-md text-[0.7rem] font-semibold cursor-pointer transition-colors"
                  >
                    Cancel Broadcast
                  </button>
                </div>

                <div className="broadcast-content">
                  {isEmergencyRequest(activeRequest.neededInHours) && (
                    <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md mb-1.5 tracking-wider shadow-2xs">
                      🚨 Emergency (≤ 4 Hours)
                    </span>
                  )}
                  <h3 className="text-[1.05rem] md:text-[1.15rem] font-normal text-[#1d3557] leading-tight m-0">
                    <span className="text-[#e63946] font-bold">{activeRequest.bloodType}</span> donors in 25KM...
                  </h3>
                </div>
              </div>

              {/* Right Side: Actions Group (Timer, Copy, Share, Desktop Cancel) */}
              <div className="flex flex-col gap-2 mt-3 md:mt-0 md:flex-row md:items-center md:flex-shrink-0">
                {/* Timer Display */}
                <div className="bg-[#fff1f2] border border-[#ffccd5] text-[#e63946] px-3 py-1.5 rounded-lg text-[0.85rem] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <span className="inline-block animate-pulse" aria-hidden="true">⏰</span>
                  <span>{timeLeftStr}</span>
                </div>

                {/* Copy Post Text and Share Flyer in one row on mobile */}
                <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-2">
                  {/* Copy POST Text */}
                  <button
                    type="button"
                    onClick={handleCopyPostText}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#1d3557] px-3 py-2 rounded-lg text-[0.82rem] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap w-full md:w-auto"
                  >
                    <span>📋 Copy POST Text</span>
                  </button>

                  {/* Share Flyer Action */}
                  <button
                    type="button"
                    onClick={() => setIsSocialOpen(!isSocialOpen)}
                    className="bg-[#e63946] hover:bg-[#c52233] text-white border-none px-3.5 py-2 rounded-lg text-[0.82rem] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[0_4px_10px_rgba(230,57,70,0.15)] hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap w-full md:w-auto"
                  >
                    <span>Share Flyer 📱</span>
                  </button>
                </div>

                {/* Desktop Cancel Broadcast Button */}
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="hidden md:inline-block bg-transparent border border-[#dee2e6] text-[#6c757d] hover:bg-[#fee2e2] hover:text-[#b91c1c] hover:border-[#fca5a5] px-3 py-1.5 rounded-md text-[0.75rem] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                >
                  Cancel Broadcast
                </button>
              </div>

            </div>
          </div>

            {/* Social Share Accordion */}
            {isSocialOpen && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white p-4 space-y-4">
                <div className="flex justify-center">
                  <div
                    ref={flyerRef}
                    className="w-full max-w-sm bg-gradient-to-br from-rose-600 to-rose-700 text-white p-5 rounded-2xl shadow-xl relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                          alt={user.fullName || "User Profile"}
                          className="w-8 h-8 rounded-full border border-white/80 object-cover"
                        />
                        <div>
                          <div className="text-xs font-bold">{user.fullName}</div>
                          <div className="text-[10px] text-white/80">Posted Just Now</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-right uppercase tracking-wider text-rose-200">
                        Save a Life
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <span className="inline-block px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider">
                        Urgently Needed
                      </span>
                      <div className="text-2xl font-black">{activeRequest.bloodType} Blood</div>
                      <div className="text-xs font-medium text-rose-100">
                        at {activeRequest.hospitalName}
                      </div>
                      <div className="inline-block bg-black/20 px-2.5 py-1 rounded text-xs font-mono font-bold">
                        Contact: {user.phone}
                      </div>
                    </div>

                    <div className="bg-white text-slate-900 rounded-xl p-3 flex items-center justify-between -mx-1 -mb-1 mt-4">
                      <div className="text-xs">
                        <span className="text-slate-400 block text-[10px]">Powered by</span>
                        <strong className="text-rose-600">LifeDrop Network</strong>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-600 text-white rounded text-[10px] font-bold uppercase">
                        Donate Now
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadFlyer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Flyer Image
                  </button>

                  <button
                    type="button"
                    onClick={handleShareImage}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Image 📱
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* 📌 SEPARATE SECTION 2: 25 KILOMETRE RADIUS DONOR RADAR (COLLAPSIBLE DROPDOWN) */}
      {activeRequest && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs relative overflow-hidden mt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Header Section */}
            <div className="flex items-center justify-between gap-3 md:flex-grow min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-grow">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 text-lg">
                    <Radio className={`w-5 h-5 ${isScanning ? 'animate-pulse text-rose-600' : ''}`} />
                  </div>
                  {isScanning && (
                    <span className="absolute inset-0 rounded-full border border-rose-400 animate-ping opacity-60" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-snug flex items-center gap-2">
                    25km Donor Radar
                    <button
                      type="button"
                      onClick={toggleSoundMute}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                      title={isSoundMuted ? 'Unmute radar sound' : 'Mute radar sound'}
                    >
                      {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal truncate sm:whitespace-normal">
                    Scanning zone for <strong className="text-slate-900 font-semibold">{activeRequest.hospitalName}</strong> (Group {activeRequest.bloodType})
                  </p>
                  {gpsAccuracyMsg && (
                    <p className="text-[10px] text-emerald-700 font-bold mt-0.5 font-mono">
                      {gpsAccuracyMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-[1fr_1fr_44px] sm:flex sm:items-center gap-2.5 md:flex-shrink-0">
              {/* Matched Donors Pill */}
              <div className="p-2.5 sm:px-3.5 sm:py-2.5 bg-[#e9f5f2] border border-[#a3d9cf] rounded-xl flex flex-col justify-center min-w-[105px] sm:min-w-[120px]">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#0f766e] mb-0.5 block">
                  Matched Donors
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#2a9d8f]">
                  {totalMatchedCount} Found
                </span>
              </div>

              {/* Responded Pill */}
              <div className="p-2.5 sm:px-3.5 sm:py-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl flex flex-col justify-center min-w-[105px] sm:min-w-[120px]">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#92400e] mb-0.5 block">
                  Responded
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#d97706]">
                  {totalRespondedCount} Donors
                </span>
              </div>

              {/* Dropdown Toggle Button */}
              <button
                type="button"
                onClick={() => setIsRadarDropdownOpen(!isRadarDropdownOpen)}
                className="w-11 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0 justify-self-end shadow-2xs"
                title={isRadarDropdownOpen ? "Collapse Radar Section" : "Expand Radar Section"}
                aria-label="Toggle details"
              >
                <ChevronDown className={`w-5 h-5 text-slate-700 transition-transform duration-200 ${isRadarDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE DROPDOWN BODY */}
          {isRadarDropdownOpen && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-5">
              {/* RATING & REVIEW PROMPT REMOVED - Handled by MatchedDonorWorkflowCard */}

              {/* MATCHED DONOR WORKFLOW COMPONENT - DISCOVERY RESPONDED DONORS (STEP 1: INITIAL) */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Responded Matched Donors ({discoveryRespondedDonors.length} Showed Interest)</span>
                    </h4>
                    <p className="text-xs text-slate-500">Donors who accepted your request and are ready for contact sharing</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hidden sm:inline-block">
                    {discoveryRespondedDonors.length} Active Discovery Matches
                  </span>
                </div>

                {discoveryRespondedDonors.length === 0 ? (
                  <RadarConnectingDonors foundCount={discoveryRespondedDonors.length} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {discoveryRespondedDonors.map((donor) => (
                      <MatchedDonorWorkflowCard 
                        key={donor.id}
                        donorName={donor.donorName}
                        avatarUrl={donor.avatarUrl}
                        distanceKm={donor.distanceKm}
                        bloodGroup={activeRequest.bloodType || donor.bloodGroup}
                        age={donor.age}
                        weight={donor.weight}
                        sex={donor.sex}
                        lastDonated={donor.lastDonated}
                        phone={donor.phone}
                        whatsappNumber={donor.whatsappNumber}
                        emergencyContact={donor.emergencyContact}
                        email={donor.email}
                        rating={donor.rating}
                        totalDonations={donor.totalDonations}
                        isVerified={donor.isVerified}
                        initialState={donor.state}
                        showScenarioToolbar={false}
                        onStateChange={(newState) => handleWorkflowDonorStateChange(donor.id, newState)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📌 SEPARATE SECTION 2: APPROVED CONTACTS & ACTIVE MATCHED DONORS (COLLAPSIBLE DROPDOWN) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs relative overflow-hidden mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Header Section */}
          <div className="flex items-center justify-between gap-3 md:flex-grow min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-grow">
              <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 text-lg">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Approved Matched Donors
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid matching 25km Donor Radar proportions */}
          <div className="grid grid-cols-[1fr_1fr_44px] sm:flex sm:items-center gap-2.5 md:flex-shrink-0">
            {/* Approved Contacts Pill */}
            <div className="p-2.5 sm:px-3.5 sm:py-2.5 bg-[#e9f5f2] border border-[#a3d9cf] rounded-xl flex flex-col justify-center min-w-[105px] sm:min-w-[120px]">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#0f766e] mb-0.5 block">
                Approved Contacts
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#2a9d8f]">
                {approvedActiveDonors.length} Saved
              </span>
            </div>

            {/* Responded Pill */}
            <div className="p-2.5 sm:px-3.5 sm:py-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl flex flex-col justify-center min-w-[105px] sm:min-w-[120px]">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#92400e] mb-0.5 block">
                Responded
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#d97706]">
                {approvedActiveDonors.filter(d => d.state === 'arrivalConfirmed' || d.state === 'review').length} Donors
              </span>
            </div>

            {/* Dropdown Toggle Button */}
            <button
              type="button"
              onClick={() => setIsApprovedContactsDropdownOpen(!isApprovedContactsDropdownOpen)}
              className="w-11 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0 justify-self-end shadow-2xs"
              title={isApprovedContactsDropdownOpen ? "Collapse Approved Contacts Section" : "Expand Approved Contacts Section"}
              aria-label="Toggle approved contacts details"
            >
              <ChevronDown className={`w-5 h-5 text-slate-700 transition-transform duration-200 ${isApprovedContactsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* COLLAPSIBLE DROPDOWN BODY */}
        {isApprovedContactsDropdownOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            {/* ⚠️ 24-HOUR COMPLIANCE & RECEIVER BAN ACKNOWLEDGEMENT WARNING BANNER */}
            <div className={`p-4 rounded-xl border transition-all ${
              isAccountComplianceFlagged 
                ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs' 
                : 'bg-amber-50/90 border-amber-200/90 text-amber-900 shadow-2xs'
            }`}>
              <div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isAccountComplianceFlagged ? 'text-rose-600' : 'text-amber-600'}`} />
                    <h4 className="text-xs sm:text-sm font-extrabold tracking-tight">
                      {isAccountComplianceFlagged 
                        ? '🚨 Receiver Account Compliance Flagged: Inaction Penalty Imposed' 
                        : '⚠️ Receiver Compliance Policy: 24-Hour Review Obligation'}
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                    When a donor marks <strong className="text-slate-900">Donation Completed</strong>, you have exactly <strong className="text-rose-700 font-bold">24 hours</strong> to verify and submit your review. 
                    If no action is taken within 24 hours, the record is <strong className="text-slate-900">automatically deleted</strong> from your contacts and your receiver account faces an immediate <strong className="text-rose-700 font-bold">permanent ban</strong> for non-compliance.
                  </p>
                </div>
              </div>
            </div>

            {approvedActiveDonors.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                No donors in Approved Contacts stage yet. Click "Request Contact Share" on a matched donor above to request access.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedActiveDonors.map((donor) => (
                  <MatchedDonorWorkflowCard 
                    key={donor.id}
                    donorName={donor.donorName}
                    avatarUrl={donor.avatarUrl}
                    distanceKm={donor.distanceKm}
                    bloodGroup={user.bloodGroup || donor.bloodGroup}
                    age={donor.age}
                    weight={donor.weight}
                    sex={donor.sex}
                    lastDonated={donor.lastDonated}
                    phone={donor.phone}
                    whatsappNumber={donor.whatsappNumber}
                    emergencyContact={donor.emergencyContact}
                    email={donor.email}
                    rating={donor.rating}
                    totalDonations={donor.totalDonations}
                    isVerified={donor.isVerified}
                    initialState={donor.state}
                    showScenarioToolbar={false}
                    onStateChange={(newState) => handleWorkflowDonorStateChange(donor.id, newState)}
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
