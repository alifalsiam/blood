import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleToggle } from '../components/RoleToggle';
import { fetchUserDonations, insertManualDonation, updateManualDonation, deleteManualDonation } from '../lib/supabaseDb';
import { 
  Trophy, 
  Users, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Droplet, 
  Flame, 
  ShieldCheck, 
  Plus, 
  Award,
  Calendar,
  MapPin,
  AlertTriangle,
  X,
  FileText,
  BadgeCheck,
  Building,
  ShieldAlert,
  Send,
  Check,
  Bell,
  Phone,
  Mail,
  Building2,
  History,
  Star,
  Edit2,
  Trash2
} from 'lucide-react';

interface HistoryItem {
  id: string;
  type: string;
  date: string;
  hospitalName: string;
  hospitalAddress: string;
  bloodType: string;
  category: string;
  status: 'Verified' | 'Manual' | 'Fulfilled' | 'Cancelled' | 'Pending Admin Review';
  notes: string;
  isAppeal?: boolean;
}

interface CompletedDonationRecord {
  id: string;
  donorName: string;
  avatarUrl: string;
  phone: string;
  email: string;
  donationDate: string;
  hospitalName: string;
  hospitalAddress: string;
  bloodType: string;
  sex: string;
  ageYears: number;
  ageDays: number;
  reasonRequested: string;
  status?: string;
  originalItem?: HistoryItem;
}

export const StatsBlock: React.FC = () => {
  const { user, activeRole, activityStatus, activeRequest, updateProfile, showToast } = useAuth();

  // Completed Donation Records state (Saved automatically into Stats History)
  const [completedDonationRecords, setCompletedDonationRecords] = useState<CompletedDonationRecord[]>([]);

  // State for Log Donation Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [donationDate, setDonationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [hospitalName, setHospitalName] = useState<string>('');
  const [hospitalAddress, setHospitalAddress] = useState<string>('');
  const [reasonWhy, setReasonWhy] = useState<string>('');
  const [categoryType, setCategoryType] = useState<'Whole Blood' | 'Platelets (Apheresis)' | 'Plasma' | 'Double Red'>('Whole Blood');
  const [isEmergencyAppeal, setIsEmergencyAppeal] = useState<boolean>(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // History timeline state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Real-time synchronization of Activity & Broadcast History
  useEffect(() => {
    const loadHistory = async () => {
      let combined: HistoryItem[] = [];

      // 1. Fetch user's manual donations from Supabase
      try {
        const dbDonations = await fetchUserDonations(user.id);
        dbDonations.forEach(d => {
          if (d.is_manual) {
            combined.push({
              id: d.id,
              type: d.status === 'pending' ? 'Emergency Appeal Draft' : 'Verified Blood Donation',
              date: d.donation_date || new Date(d.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              hospitalName: d.hospital_name || 'Unknown',
              hospitalAddress: d.hospital_address || 'Unknown',
              bloodType: user.bloodGroup || 'A+',
              category: d.category || 'Whole Blood',
              status: d.status === 'pending' ? 'Pending Admin Review' : 'Verified',
              notes: d.notes || '',
              isAppeal: d.status === 'pending'
            });
          }
        });
      } catch (e) {
        console.error('Error loading manual donations:', e);
      }

      // 2. Fetch user's blood requests from server /api/blood-requests
      try {
        const res = await fetch('/api/blood-requests');
        if (res.ok) {
          const data = await res.json();
          const list: any[] = Array.isArray(data) ? data : (data.requests || []);
          
          list.forEach(req => {
            const dateStr = req.createdAt 
              ? new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            const isCancelled = req.status === 'cancelled';
            const isFulfilled = req.status === 'fulfilled';
            const isActive = req.status === 'active';

            const reqItem: HistoryItem = {
              id: req.id || `req-${Math.random()}`,
              type: isCancelled 
                ? 'Blood Request (Cancelled)' 
                : isFulfilled 
                ? 'Blood Request (Fulfilled)' 
                : 'Emergency Blood Broadcast',
              date: dateStr,
              hospitalName: req.hospitalName || 'Emergency Hospital',
              hospitalAddress: req.hospitalLocation || 'Dhaka',
              bloodType: req.bloodType || user.bloodGroup || 'A+',
              category: `${siteConfig?.radarRadiusKm || 25}km Radar Broadcast`,
              status: isCancelled ? 'Cancelled' : isFulfilled ? 'Fulfilled' : 'Verified',
              notes: isCancelled && req.cancelReason 
                ? `Reason: ${req.cancelReason}` 
                : req.reasonNeeded 
                ? `Needed in ${req.neededInHours || 4}h - ${req.reasonNeeded}` 
                : 'Emergency Request',
            };

            // Deduplicate
            if (!combined.some(existing => existing.id === reqItem.id || existing.id === `req-${reqItem.id}`)) {
              combined.unshift(reqItem);
            }
          });
        }
      } catch (err) {
        console.warn('Could not fetch server blood requests for history:', err);
      }

      // 3. Include current active request if present
      if (activeRequest) {
        const activeItem: HistoryItem = {
          id: `active-${activeRequest.id}`,
          type: '🚨 Live Active Broadcast',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          hospitalName: activeRequest.hospitalName,
          hospitalAddress: activeRequest.hospitalLocation,
          bloodType: activeRequest.bloodType,
          category: `Active ${siteConfig?.radarRadiusKm || 25}km Radar Scanning`,
          status: 'Verified',
          notes: `Scanning for ${activeRequest.bloodType} donors. Needed in ${activeRequest.neededInHours}h.`,
        };
        combined = [activeItem, ...combined.filter(i => i.id !== activeItem.id && i.id !== activeRequest.id && i.id !== `req-${activeRequest.id}`)];
      }

      // 4. If still empty, provide standard initial user verified donation history if user has donations
      if (combined.length === 0 && user.totalDonations && user.totalDonations > 0) {
        combined = [
          {
            id: 'init-don-1',
            type: 'Verified Blood Donation',
            date: user.lastDonatedDate 
              ? new Date(user.lastDonatedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Jan 15, 2026',
            hospitalName: 'Square Hospital & Diagnostic',
            hospitalAddress: 'Shantinagar, Dhaka',
            bloodType: user.bloodGroup || 'A+',
            category: 'Whole Blood',
            status: 'Verified',
            notes: 'Completed voluntary blood donation verified by Medical Officer.'
          }
        ];
      }

      setHistoryItems(combined);

      // 5. Populate Completed Donation Records
      const donationsOnly = combined.filter(i => i.type.includes('Donation') || i.type === 'Emergency Donation Appeal');
      const mappedDonations: CompletedDonationRecord[] = donationsOnly.map(d => ({
        id: d.id,
        donorName: user.name || 'You',
        avatarUrl: user.avatarUrl || "https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png",
        phone: user.phone || 'N/A',
        email: user.email || 'N/A',
        donationDate: d.date,
        hospitalName: d.hospitalName,
        hospitalAddress: d.hospitalAddress,
        bloodType: d.bloodType,
        sex: user.sex || 'Unknown',
        ageYears: 25, // default
        ageDays: 120, // default
        reasonRequested: d.notes,
        status: d.status,
        originalItem: d
      }));
      setCompletedDonationRecords(mappedDonations);
    };

    loadHistory();

    const handleHistoryEvent = () => loadHistory();
    window.addEventListener('lifedrop_history_updated', handleHistoryEvent);
    window.addEventListener('lifedrop_profile_updated', handleHistoryEvent);
    window.addEventListener('storage', handleHistoryEvent);

    return () => {
      window.removeEventListener('lifedrop_history_updated', handleHistoryEvent);
      window.removeEventListener('lifedrop_profile_updated', handleHistoryEvent);
      window.removeEventListener('storage', handleHistoryEvent);
    };
  }, [activeRequest, user.totalDonations, user.lastDonatedDate, user.bloodGroup]);

  const verifiedDonationsList = historyItems.filter(i => i.type.includes('Donation') && i.status === 'Verified');
  const donations = verifiedDonationsList.length;
  const lastDateStr = verifiedDonationsList.length > 0 ? verifiedDonationsList[0].date : undefined;

  // Calculate dynamic eligibility rule based on Sex, Last Category, and Next Category
  const calculateEligibility = (targetDateStr?: string, nextCategory?: string) => {
    const dateToUse = targetDateStr !== undefined ? targetDateStr : lastDateStr;

    if (!dateToUse || donations === 0) {
      return {
        hasDonatedBefore: false,
        daysPassed: 0,
        daysRemaining: 0,
        isEligible: true,
        lastDateFormatted: 'No previous donations',
        requiredDays: 0
      };
    }

    const lastDate = new Date(dateToUse);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    const daysPassed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    // Find the most recent donation category
    let lastCategory = 'Whole Blood';
    const recentDonation = historyItems.find(i => i.type.includes('Donation'));
    if (recentDonation) {
      lastCategory = recentDonation.category;
    }

    const nextCat = nextCategory || categoryType;
    const isFemale = user.sex === 'Female' || user.sex === 'Female ';

    let REQUIRED_DAYS = 120; // Default

    if (lastCategory.includes('Whole Blood')) {
      if (nextCat.includes('Whole Blood')) REQUIRED_DAYS = isFemale ? 180 : 120;
      else if (nextCat.includes('Platelets')) REQUIRED_DAYS = 28;
      else if (nextCat.includes('Plasma')) REQUIRED_DAYS = 28;
      else if (nextCat.includes('Double Red')) REQUIRED_DAYS = 112;
    } else if (lastCategory.includes('Platelets')) {
      if (nextCat.includes('Platelets')) REQUIRED_DAYS = 7;
      else if (nextCat.includes('Whole Blood')) REQUIRED_DAYS = 28;
      else if (nextCat.includes('Plasma')) REQUIRED_DAYS = 28;
      else if (nextCat.includes('Double Red')) REQUIRED_DAYS = 28;
    } else if (lastCategory.includes('Plasma')) {
      if (nextCat.includes('Plasma')) REQUIRED_DAYS = 28;
      else if (nextCat.includes('Whole Blood')) REQUIRED_DAYS = 56;
      else if (nextCat.includes('Platelets')) REQUIRED_DAYS = 28;
      else if (nextCat.includes('Double Red')) REQUIRED_DAYS = 56;
    } else if (lastCategory.includes('Double Red')) {
      REQUIRED_DAYS = 112;
    }

    const daysRemaining = Math.max(0, REQUIRED_DAYS - daysPassed);
    const isEligible = daysRemaining === 0;

    return {
      hasDonatedBefore: true,
      daysPassed,
      daysRemaining,
      isEligible,
      requiredDays: REQUIRED_DAYS,
      lastDateFormatted: lastDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    };
  };

  const eligibility = calculateEligibility(lastDateStr, categoryType);

  // Gamified Rank Calculation
  const getRankInfo = (cnt: number) => {
    if (cnt >= 25) {
      return {
        title: 'Legend Lifesaver',
        subtitle: 'Master Rank (25+ Donated)',
        badge: '👑',
        nextGoal: 25,
        prevGoal: 25,
        color: 'from-amber-500 via-orange-500 to-rose-600 text-white',
        border: 'border-amber-400',
        bgPill: 'bg-amber-100 text-amber-900'
      };
    }
    if (cnt >= 20) {
      return {
        title: 'Platinum Champion',
        subtitle: 'Rank 5 (20 - 24 Donated)',
        badge: '💎',
        nextGoal: 25,
        prevGoal: 20,
        color: 'from-cyan-600 via-blue-600 to-indigo-700 text-white',
        border: 'border-cyan-300',
        bgPill: 'bg-cyan-100 text-cyan-900'
      };
    }
    if (cnt >= 15) {
      return {
        title: 'Gold Savior',
        subtitle: 'Rank 4 (15 - 19 Donated)',
        badge: '🥇',
        nextGoal: 20,
        prevGoal: 15,
        color: 'from-amber-400 via-amber-500 to-yellow-600 text-slate-950',
        border: 'border-amber-400',
        bgPill: 'bg-amber-100 text-amber-950'
      };
    }
    if (cnt >= 10) {
      return {
        title: 'Silver Hero',
        subtitle: 'Rank 3 (10 - 14 Donated)',
        badge: '🥈',
        nextGoal: 15,
        prevGoal: 10,
        color: 'from-slate-300 via-slate-400 to-slate-500 text-slate-950',
        border: 'border-slate-300',
        bgPill: 'bg-slate-100 text-slate-900'
      };
    }
    if (cnt >= 5) {
      return {
        title: 'Bronze Guardian',
        subtitle: 'Rank 2 (5 - 9 Donated)',
        badge: '🥉',
        nextGoal: 10,
        prevGoal: 5,
        color: 'from-amber-700 via-orange-800 to-rose-900 text-white',
        border: 'border-amber-600',
        bgPill: 'bg-amber-100 text-amber-900'
      };
    }
    if (cnt >= 1) {
      return {
        title: 'Beginner Lifesaver',
        subtitle: 'Started journey with LifeDrop (1 - 4 Donated)',
        badge: '🌱',
        nextGoal: 5,
        prevGoal: 1,
        color: 'from-emerald-600 via-teal-600 to-indigo-700 text-white',
        border: 'border-emerald-400',
        bgPill: 'bg-emerald-100 text-emerald-900'
      };
    }
    return {
      title: 'Aspiring Lifesaver',
      subtitle: 'Newcomer (0 Donated)',
      badge: '🌟',
      nextGoal: 1,
      prevGoal: 0,
      color: 'from-slate-700 via-slate-800 to-slate-900 text-white',
      border: 'border-slate-600',
      bgPill: 'bg-slate-100 text-slate-800'
    };
  };

  const rank = getRankInfo(donations);
  const prevTarget = rank.prevGoal;
  const nextTarget = rank.nextGoal;
  const progressPercent = donations >= 25 
    ? 100 
    : Math.min(100, Math.max(10, Math.round(((donations - prevTarget) / Math.max(1, nextTarget - prevTarget)) * 100)));

  const handleDeleteHistoryItem = async (id: string) => {
    setDeleteConfirmationId(id);
  };

  const confirmDeleteHistoryItem = async () => {
    if (!deleteConfirmationId) return;
    const id = deleteConfirmationId;
    setDeleteConfirmationId(null);
    
    try {
      if (id.startsWith('req-') || id.startsWith('init-') || id.startsWith('active-')) {
         showToast("Cannot delete system-generated records from here.", true);
         return;
      }

      await deleteManualDonation(id);
      
      const itemToDelete = historyItems.find(i => i.id === id);
      const historyList = historyItems.filter(i => i.id !== id);
      setHistoryItems(historyList);
      
      // Adjust total donations count if it was a verified donation
      if (itemToDelete && itemToDelete.type.includes('Donation') && itemToDelete.status !== 'Pending Admin Review') {
        const nextDonations = Math.max(0, (user.totalDonations || 0) - 1);
        let updatedLastDate = '';
        
        if (historyList.length > 0) {
          // Find the most recent donation date from history
          const donationsList = historyList.filter(i => i.type.includes('Donation'));
          if (donationsList.length > 0) {
            updatedLastDate = new Date(donationsList[0].date).toISOString().split('T')[0];
          }
        }
        
        updateProfile({
          totalDonations: nextDonations,
          lastDonatedDate: updatedLastDate
        });
      }
      
      window.dispatchEvent(new Event('lifedrop_history_updated'));
      showToast("Donation record permanently deleted.");
    } catch (e) {
      showToast("Failed to delete record.", true);
    }
  };

  const handleEditHistoryItem = (item: HistoryItem) => {
    setEditingHistoryId(item.id);
    
    // Parse date if possible
    let parsedDate = new Date().toISOString().split('T')[0];
    try {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) parsedDate = d.toISOString().split('T')[0];
    } catch (e) {}

    setDonationDate(parsedDate);
    setHospitalName(item.hospitalName);
    setHospitalAddress(item.hospitalAddress);
    setReasonWhy(item.notes);
    setCategoryType(item.category as any);
    setIsLogModalOpen(true);
  };

  // Submit Logged Donation
  const handleSaveDonationLog = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospitalName.trim() || !hospitalAddress.trim() || !reasonWhy.trim()) {
      showToast('Please fill in Hospital Name, Address Location, and Reason.', true);
      return;
    }

    const formattedDate = new Date(donationDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (editingHistoryId) {
      try {
        await updateManualDonation(editingHistoryId, {
          hospitalName,
          hospitalAddress,
          category: categoryType,
          notes: reasonWhy,
          donationDate: formattedDate
        });
        showToast(`Donation record updated successfully!`);
        window.dispatchEvent(new Event('lifedrop_history_updated'));
      } catch (e) {
        showToast(`Failed to update donation log.`, true);
      }
    } else {
      // ADD NEW
      // Check eligibility rule for this donation date
      if (!eligibility.isEligible && !isEmergencyAppeal) {
        showToast(`⚠️ Cannot save standard entry. You must wait ${eligibility.daysRemaining} days or submit a Special Emergency Appeal.`, true);
        return;
      }
      
      const newStatus = (!eligibility.isEligible && isEmergencyAppeal) ? 'pending' : 'completed';

      try {
        await insertManualDonation({
          donorId: user.id,
          status: newStatus,
          hospitalName,
          hospitalAddress,
          category: categoryType,
          notes: reasonWhy,
          donationDate: formattedDate
        });

        if (newStatus === 'completed') {
          const nextDonations = donations + 1;
          updateProfile({
            totalDonations: nextDonations,
            lastDonatedDate: donationDate
          });
          showToast(`🎉 Donation logged successfully! Total donations updated.`);
        } else {
          showToast(`📝 Appeal Draft submitted for Admin Review.`);
        }
        
        window.dispatchEvent(new Event('lifedrop_history_updated'));

      } catch (e) {
        showToast(`Failed to save donation log.`, true);
      }
    }

    setIsLogModalOpen(false);
    
    // Reset form
    setEditingHistoryId(null);
    setHospitalName('');
    setHospitalAddress('');
    setReasonWhy('');
    setIsEmergencyAppeal(false);
  };

  // Admin approves draft appeal
  const handleApproveAppeal = (itemId: string) => {
    const item = historyItems.find(i => i.id === itemId);
    if (!item) return;

    const nextDonations = donations + 1;
    updateProfile({
      totalDonations: nextDonations,
      lastDonatedDate: donationDate
    });

    const updatedList = historyItems.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          type: 'Verified Donation (Appeal Approved)',
          status: 'Verified' as const,
          notes: `${i.notes} - Approved by Admin.`
        };
      }
      return i;
    });

    setHistoryItems(updatedList);
    try {
      localStorage.setItem('lifedrop_activity_history', JSON.stringify(updatedList));
      window.dispatchEvent(new Event('lifedrop_history_updated'));
    } catch (e) {}

    showToast(`🔔 Admin Notification: Your Special Emergency Donation Appeal was APPROVED! Total Donations is now ${nextDonations}.`);
  };

  // Real Category Breakdown Data
  const wholeBloodCount = historyItems.filter(i => i.type.includes('Donation') && i.status === 'Verified' && i.category?.includes('Whole Blood')).length;
  const plateletsCount = historyItems.filter(i => i.type.includes('Donation') && i.status === 'Verified' && i.category?.includes('Platelets')).length;
  const plasmaCount = historyItems.filter(i => i.type.includes('Donation') && i.status === 'Verified' && i.category === 'Plasma').length;
  const doubleRedCount = historyItems.filter(i => i.type.includes('Donation') && i.status === 'Verified' && i.category === 'Double Red').length;

  const categoryStats = [
    { title: 'Whole Blood', units: wholeBloodCount > 0 ? wholeBloodCount : Math.floor(donations * 0.6), bg: 'bg-rose-50', text: 'text-rose-700', badge: '🩸 Primary' },
    { title: 'Platelets (Apheresis)', units: plateletsCount > 0 ? plateletsCount : Math.floor(donations * 0.3), bg: 'bg-amber-50', text: 'text-amber-800', badge: '⚡ High Demand' },
    { title: 'Plasma', units: plasmaCount > 0 ? plasmaCount : Math.floor(donations * 0.1), bg: 'bg-indigo-50', text: 'text-indigo-700', badge: '💧 Specialized' },
    { title: 'Double Red (Power)', units: doubleRedCount > 0 ? doubleRedCount : Math.floor(donations * 0.05), bg: 'bg-emerald-50', text: 'text-emerald-800', badge: '✨ Super Donor' }
  ];

  return (
    <div className="space-y-5">
      {/* 1. USER RANK HEADER BANNER */}
      <div className={`bg-gradient-to-r ${rank.color} rounded-2xl p-5 sm:p-7 shadow-md relative overflow-hidden border ${rank.border}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <img
                src={user.avatarUrl || "https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png"}
                alt={user.fullName || "User Profile"}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 text-xl sm:text-2xl drop-shadow-md">
                {rank.badge}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user.fullName}</h2>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs ${rank.bgPill}`}>
                  {user.bloodGroup} Group
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold opacity-90 mt-0.5 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-300 inline" />
                <span>Rank: <strong className="font-extrabold underline decoration-amber-300 underline-offset-2">{rank.title}</strong></span>
              </p>
              <p className="text-[11px] opacity-85">{rank.subtitle}</p>
            </div>
          </div>

          {/* Log Donation Trigger Button */}
          <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2">
            <button
              onClick={() => {
                setIsEmergencyAppeal(false);
                setIsLogModalOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-rose-600" />
              <span>Log Completed Donation</span>
            </button>
            <span className="text-[10px] text-center sm:text-right opacity-80">
              {donations} Total Donations Completed
            </span>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="mt-5 pt-4 border-t border-white/20">
          <div className="flex justify-between items-center text-xs font-bold mb-1.5 opacity-90">
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>Rank Progress</span>
            </span>
            <span>
              {donations} / {donations >= 25 ? '25+ (Master)' : `${nextTarget} Donations`}
            </span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden p-0.5">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. 120-DAY ELIGIBILITY BANNER */}
      <div className={`p-4 rounded-2xl border ${
        eligibility.isEligible 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : 'bg-amber-50 border-amber-200 text-amber-900'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs`}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${eligibility.isEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {eligibility.isEligible ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <span>
                {!eligibility.hasDonatedBefore
                  ? '✅ You are eligible to donate blood anytime!'
                  : eligibility.isEligible 
                  ? '✅ Eligible to Donate Blood Now!' 
                  : `⌛ Next Donation Eligibility: Wait ${eligibility.daysRemaining} More Days`}
              </span>
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              {!eligibility.hasDonatedBefore ? (
                <>No previous blood donation history recorded.</>
              ) : (
                <>Last recorded donation: <strong>{eligibility.lastDateFormatted}</strong> ({eligibility.daysPassed} days ago). Standard medical guidelines require a {eligibility.requiredDays}-day interval between these donations.</>
              )}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/50">
          <span className="text-xs font-extrabold uppercase tracking-wider">Eligibility Status</span>
          <span className="text-xs font-bold px-2.5 py-1 bg-white/80 rounded-lg border border-slate-200 shadow-2xs">
            {eligibility.isEligible ? 'READY TO DONATE' : `WAIT ${eligibility.daysRemaining} DAYS`}
          </span>
        </div>
      </div>

      {/* 3. USER METRICS GRID (2 IN A ROW TILES ON MOBILE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tile 1: Receiver Rating */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Receiver Rating</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-1.5">
              <span>{(user.rating || 5.0).toFixed(1)}</span>
              <span className="text-amber-400 text-lg">★</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-bold text-amber-600">
                {donations} Ratings Received
              </span>
            </p>
          </div>
        </div>

        {/* Tile 2: Donations Completed */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Donations Completed</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Droplet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-600">
              {donations}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">Total</span> Completed
            </p>
          </div>
        </div>

        {/* Tile 3: Requests Asked & Cancelled */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Blood Requests</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {activeRequest ? '1 Active' : '0 Active'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Status: <strong className="text-indigo-600 font-bold">{activeRequest ? activeRequest.status.toUpperCase() : 'NO ACTIVE REQUEST'}</strong>
            </p>
          </div>
        </div>

        {/* Tile 4: Operating Mode & Status */}
        <div className="bg-white border border-slate-200 p-3.5 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Current Operating Mode</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="space-y-2.5">
            <RoleToggle compact />
            <p className="text-[11px] font-semibold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activityStatus === 'online' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
              <span className={activityStatus === 'online' ? 'text-emerald-600' : 'text-slate-600'}>
                STATUS: {activityStatus.toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 4. CATEGORY BREAKDOWN (2 IN A ROW TILES ON MOBILE) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-600" />
              Network Fulfillment Success & Category Breakdown
            </h3>
            <p className="text-xs text-slate-500">Donation counts by blood components</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {categoryStats.map((item) => (
            <div key={item.title} className={`p-3.5 rounded-xl border border-slate-200 ${item.bg} flex flex-col justify-between`}>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/90 border border-slate-200 text-slate-700 block w-fit mb-2">
                  {item.badge}
                </span>
                <h4 className="text-xs font-bold text-slate-800 leading-tight mb-1">{item.title}</h4>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
                <span className="text-xs text-slate-500">Units</span>
                <span className={`text-lg font-black ${item.text}`}>{item.units}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4.5. COMPLETED DONATION RECORDS & HISTORY (SAVED AUTOMATICALLY INTO STATS) */}
      <div className="bg-white border-2 border-blue-200/90 rounded-2xl p-3.5 sm:p-6 shadow-xs relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-3.5 sm:p-4.5 rounded-xl border border-blue-200/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <History className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Completed Donation Records & History
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                SAVED RECORDS
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Archived permanent history of finalized blood donations with hospital, location address, blood type, age (Years & Days), sex, and requested reason (contact privacy protected).
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 bg-white text-blue-800 border border-blue-300 rounded-xl shadow-2xs self-start sm:self-auto flex items-center gap-1.5 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>{completedDonationRecords.length} Completed Records</span>
          </span>
        </div>

        {completedDonationRecords.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 sm:p-8 text-center space-y-2">
            <History className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No completed donation records yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              When a donation is completed and reviewed, the card data is automatically saved here in Stats History.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {completedDonationRecords.map((record) => (
              <div key={record.id} className="bg-gradient-to-br from-slate-50 via-white to-blue-50/20 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs relative">
                {/* Header Badge & Date */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] sm:text-[11px] font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Donation Completed</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{record.donationDate}</span>
                  </span>
                </div>

                {/* Donor Info Header */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <img src={record.avatarUrl || "https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png"} alt={record.donorName} className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-400 shadow-2xs flex-shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-slate-900 truncate">{record.donorName}</h5>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 flex-wrap">
                      <span className="font-extrabold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">{record.bloodType}</span>
                      <span className="text-slate-700 font-medium text-[11px] sm:text-xs">
                        • Age: {record.ageYears} Years, {record.ageDays} Days ({record.sex})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recorded Required Details List */}
                <div className="bg-slate-50/80 rounded-xl p-2.5 sm:p-3 border border-slate-100 space-y-2 text-xs">
                  {/* Hospital & Address */}
                  <div className="space-y-1.5 pb-2 border-b border-slate-200/60">
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">Hospital: </span>
                        <span className="text-slate-700">{record.hospitalName}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">Address: </span>
                        <span className="text-slate-600">{record.hospitalAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Demographics & Reason */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">Reason Requested: </span>
                        <span className="text-slate-700 italic">{record.reasonRequested}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Block (Fixed at 5 stars for self-logs) */}
                  <div className="flex items-center gap-1 mt-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-500 mr-1">RATING:</span>
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  </div>

                  {/* Actions: Edit & Delete for self-recorded logs */}
                  {record.originalItem && record.status !== 'Pending Admin Review' && (
                    <div className="mt-3 flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/80">
                      <button 
                        onClick={() => handleEditHistoryItem(record.originalItem!)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors cursor-pointer"
                        title="Edit Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteHistoryItem(record.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {record.status === 'Pending Admin Review' && (
                    <div className="mt-3 pt-2 border-t border-amber-200/80">
                      <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5 text-amber-600" />
                        <span>Awaiting Admin case confirmation...</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. USER BLOOD REQUEST & DONATION HISTORY TIMELINE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Activity & Broadcast History
            </h3>
            <p className="text-xs text-slate-500">When you asked for blood or completed donations</p>
          </div>
        </div>

        <div className="space-y-3">
          {historyItems.filter(item => !item.type.includes('Donation') && item.type !== 'Emergency Donation Appeal').map((item) => (
            <div 
              key={item.id} 
              className={`p-3.5 rounded-xl border ${
                item.status === 'Pending Admin Review' 
                  ? 'border-amber-300 bg-amber-50/60' 
                  : 'border-slate-200 bg-slate-50/70'
              } hover:bg-white hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl mt-0.5 ${
                  item.status === 'Pending Admin Review'
                    ? 'bg-amber-100 text-amber-700'
                    : item.type.includes('Verified') 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : item.type.includes('Donation')
                    ? 'bg-rose-100 text-rose-700'
                    : item.status === 'Cancelled' 
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {item.status === 'Pending Admin Review' ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : item.type.includes('Verified') ? (
                    <BadgeCheck className="w-4 h-4" />
                  ) : item.type.includes('Donation') ? (
                    <Droplet className="w-4 h-4" />
                  ) : item.status === 'Cancelled' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900">{item.type}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md">
                      {item.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      item.status === 'Verified' || item.status === 'Fulfilled' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : item.status === 'Pending Admin Review'
                        ? 'bg-amber-200 text-amber-900 font-extrabold animate-pulse'
                        : item.status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {item.status === 'Pending Admin Review' ? '⏳ Draft: Pending Admin Review' : item.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span><strong>{item.hospitalName}</strong>, {item.hospitalAddress}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.notes}</p>

                  {/* Admin Simulation Button for Pending Appeals */}
                  {item.status === 'Pending Admin Review' && (
                    <div className="mt-2 pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5 text-amber-600" />
                        <span>Awaiting Admin case confirmation...</span>
                      </span>
                      <button
                        onClick={() => handleApproveAppeal(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>[Admin Action] Approve Appeal</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right text-xs font-bold text-slate-500 flex items-center sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                <span className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {item.date}
                </span>
                <span className="text-[10px] text-slate-400">Group: {item.bloodType}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. LOG COMPLETED DONATION MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <Droplet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Log Completed Blood Donation</h3>
                  <p className="text-xs text-slate-500">Record when, where, and why you donated</p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Medical Warning if not eligible */}
            {!eligibility.isEligible && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{eligibility.requiredDays}-Day Restriction Warning: Wait {eligibility.daysRemaining} Days</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Your last recorded donation was on <strong>{eligibility.lastDateFormatted}</strong> ({eligibility.daysPassed} days ago). 
                  Standard medical rules require waiting <strong>{eligibility.requiredDays} days</strong> based on your gender and donation types before entering another donation.
                </p>

                <div className="pt-2 border-t border-amber-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEmergencyAppeal}
                      onChange={(e) => setIsEmergencyAppeal(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-rose-600 rounded border-amber-400 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-amber-950 block">
                        Appeal for Special Emergency Donation Case
                      </span>
                      <span className="text-[11px] text-amber-800 leading-snug block">
                        If this was a critical emergency, submit an appeal. This entry will be saved as a <strong>Draft</strong> and sent for <strong>Admin Review</strong>. Once approved by Admin, your total donation count and Last Donated Date will automatically update, and you will receive a notification.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveDonationLog} className="space-y-4">
              {/* When */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-600" />
                  <span>WHEN (Donation Date)</span>
                </label>
                <input
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Where - Hospital Name & Address Location */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-rose-600" />
                  <span>WHERE (Hospital & Location Address)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Hospital / Clinic Name (e.g. Square Hospital)"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <input
                    type="text"
                    placeholder="Location / Address (e.g. Shantinagar, Dhaka)"
                    value={hospitalAddress}
                    onChange={(e) => setHospitalAddress(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Why / Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Reason to Donate</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Open-Heart Surgery, ICU Platelets"
                  value={reasonWhy}
                  onChange={(e) => setReasonWhy(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Category Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  DONATION CATEGORY
                </label>
                <select
                  value={categoryType}
                  onChange={(e: any) => setCategoryType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Platelets (Apheresis)">Platelets (Apheresis)</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Double Red">Double Red Blood Cells</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 ${
                    !eligibility.isEligible && isEmergencyAppeal
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : !eligibility.isEligible
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {!eligibility.isEligible && isEmergencyAppeal ? (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Emergency Appeal (Draft)</span>
                    </>
                  ) : (
                    <span>Confirm & Save Entry</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Delete Record?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to permanently delete this donation record? This action cannot be undone.
              </p>
              
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmationId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteHistoryItem}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
