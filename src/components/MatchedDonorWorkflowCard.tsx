import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  MapPin, 
  AlertTriangle, 
  Star, 
  Sparkles, 
  User, 
  Activity, 
  Scale, 
  Calendar,
  Clock,
  ShieldCheck,
  RefreshCw,
  Heart,
  BadgeCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type WorkflowState = 
  | 'initial' 
  | 'pending' 
  | 'declined' 
  | 'approved' 
  | 'arrivalPending' 
  | 'arrivalConfirmed' 
  | 'review' 
  | 'completed';

interface MatchedDonorWorkflowCardProps {
  donorName?: string;
  avatarUrl?: string;
  distanceKm?: number;
  bloodGroup?: string;
  age?: number;
  weight?: number;
  sex?: string;
  lastDonated?: string;
  phone?: string;
  whatsappNumber?: string;
  emergencyContact?: string;
  email?: string;
  rating?: number;
  totalDonations?: number;
  isVerified?: boolean;
  initialState?: WorkflowState;
  showScenarioToolbar?: boolean;
  onStateChange?: (state: WorkflowState) => void;
}

export const MatchedDonorWorkflowCard: React.FC<MatchedDonorWorkflowCardProps> = ({
  donorName = "Volunteer Donor",
  avatarUrl = "",
  distanceKm = 0,
  bloodGroup = "O+",
  age = 25,
  weight = 65,
  sex = "Unspecified",
  lastDonated = "N/A",
  phone = "Hidden",
  whatsappNumber = "Hidden",
  emergencyContact = "Hidden",
  email = "",
  rating = 5.0,
  totalDonations = 0,
  isVerified = false,
  initialState = "initial",
  showScenarioToolbar = true,
  onStateChange,
}) => {
  const { showToast, submitReceiverRating } = useAuth();

  const [currentState, setCurrentState] = useState<WorkflowState>(initialState);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string>("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [totalDonationsCount, setTotalDonationsCount] = useState<number>(5);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const changeState = (newState: WorkflowState) => {
    setCurrentState(newState);
    onStateChange?.(newState);
  };

  // Sync when prop changes
  useEffect(() => {
    setCurrentState(initialState);
  }, [initialState]);

  if (isDismissed) {
    return null;
  }

  const ratingDescriptions: Record<number, string> = {
    1: "Terrible",
    2: "Bad",
    3: "OK",
    4: "Good",
    5: "Excellent"
  };

  // State 1 Action: Request Contact Share -> State 2
  const handleRequestContactShare = () => {
    changeState('pending');
    showToast("🩸 Request sent to " + donorName + ". Waiting for approval...");
  };

  // State 4 Action: Confirm Donor Arrival (En Route) -> State 5
  const handleConfirmArrival = () => {
    changeState('arrivalPending');
    showToast("📡 Pinging donor's device for travel verification...");

    // Simulate donor response after 3 seconds
    setTimeout(() => {
      changeState('arrivalConfirmed');
      showToast("📍 Donor confirmed travel! Status updated to En Route.");
    }, 3000);
  };

  // State 6 Action: Donor Marks Completed -> State 7 Modal
  const handleMarkCompleted = () => {
    changeState('review');
    setIsReviewModalOpen(true);
    showToast("ℹ️ Donation marked as completed. Please submit review & star rating.");
  };

  // State 7 Action: Submit Review & Rating -> State Completed
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRating) {
      showToast("Please select a star rating before approving.", true);
      return;
    }

    if (submitReceiverRating) {
      submitReceiverRating(selectedRating, reviewFeedback);
    }

    setIsReviewModalOpen(false);
    changeState('completed');
    setTotalDonationsCount(prev => prev + 1);

    showToast("🎉 Receiver review submitted! Match successfully finalized.");

    setTimeout(() => {
      showToast(`🏆 CONGRATS! You have successfully completed your ${totalDonationsCount + 1}th donation!`);
    }, 800);
  };

  const getStatusBadgeText = () => {
    switch (currentState) {
      case 'initial':
        return { text: "Ready to Request", color: "text-emerald-600 font-bold" };
      case 'pending':
        return { text: "Waiting Approval", color: "text-amber-600 font-bold" };
      case 'declined':
        return { text: "Request Cancelled", color: "text-rose-600 font-bold" };
      case 'approved':
        return { text: "Contacts Shared", color: "text-teal-600 font-bold" };
      case 'arrivalPending':
        return { text: "Waiting for Arrival Confirmation", color: "text-amber-600 font-bold" };
      case 'arrivalConfirmed':
        return { text: "En Route (ETA 12m)", color: "text-emerald-600 font-bold" };
      case 'review':
        return { text: "Pending Receiver Review", color: "text-amber-600 font-bold" };
      case 'completed':
        return { text: "Completed Successfully", color: "text-emerald-600 font-bold" };
      default:
        return { text: "Active", color: "text-slate-700 font-bold" };
    }
  };

  const badge = getStatusBadgeText();

  return (
    <div className="w-full h-full font-sans">
      {/* 🧪 SCENARIO TOOLBAR FOR TESTING ALL 7 FSM STATES */}
      {showScenarioToolbar && (
        <div className="mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
            <span>Workflow State Simulator (7 FSM States):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'initial', label: '1. Initial Request' },
              { id: 'pending', label: '2. Waiting Loader' },
              { id: 'declined', label: '3. Declined' },
              { id: 'approved', label: '4. Approved Contacts' },
              { id: 'arrivalPending', label: '5. Arrival Loader' },
              { id: 'arrivalConfirmed', label: '6. Arrival Confirmed' },
              { id: 'review', label: '7. Receiver Review' },
            ].map(sc => (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  changeState(sc.id as WorkflowState);
                  if (sc.id === 'review') setIsReviewModalOpen(true);
                  else setIsReviewModalOpen(false);
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  currentState === sc.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN MATCHED DONOR CARD */}
      <div className="bg-white border-2 border-rose-200 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden h-full flex flex-col justify-between">
        {/* Top Profile Row matching exact HTML spec */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
              <img
                src={avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                alt={donorName}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-rose-500"
              />
              <div className="absolute -bottom-0.5 -right-0.5 bg-amber-400 text-white w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black border-2 border-white">
                ★
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug truncate">{donorName}</h3>
                {isVerified && (
                  <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-blue-500 flex-shrink-0" title="Verified Donor" />
                )}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-600 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-1">
                <div className="flex items-center text-rose-600 min-w-0">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mr-0.5" />
                  <span className="truncate">{distanceKm} km</span>
                </div>
                <span className="text-slate-300 flex-shrink-0 hidden sm:inline">•</span>
                <div className="flex items-center text-amber-500 flex-shrink-0" title="Donor Rating">
                  <Star className="w-3 h-3 fill-amber-500 mr-0.5 flex-shrink-0" />
                  {rating.toFixed(1)}
                </div>
                <span className="text-slate-300 flex-shrink-0 hidden sm:inline">•</span>
                <div className="text-indigo-600 truncate font-bold min-w-0 flex-shrink-0">{totalDonations} Donations</div>
              </div>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 flex items-center gap-1">
            <span>{bloodGroup} Match</span>
          </div>
        </div>

        {/* Demographics Bar: 3 Columns (Age/Sex, Weight, Last Donated) */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 sm:p-2.5 mb-3 sm:mb-4 text-center">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Age / Sex</span>
            <strong className="text-[10px] sm:text-xs font-bold text-slate-900 block leading-tight">
              {age} Yrs, {(() => {
                const match = lastDonated?.match(/\d+/);
                return match ? match[0] : '90';
              })()} Days ({sex})
            </strong>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Weight</span>
            <strong className="text-[11px] sm:text-xs font-bold text-slate-900 block">{weight} kg</strong>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Last Donated</span>
            <strong className="text-[10px] sm:text-xs font-bold text-slate-900 block truncate">{lastDonated}</strong>
          </div>
        </div>

        {/* Status Match Bar */}
        <div className="bg-slate-100 rounded-xl p-2.5 mb-4 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-semibold">Status:</span>
          <strong className={badge.color}>
            {badge.text}
          </strong>
        </div>

        {/* DYNAMIC INTERACTION PANEL (STATE MACHINE) */}
        <div className="space-y-3">
          {/* STATE 1: INITIAL */}
          {currentState === 'initial' && (
            <button
              type="button"
              onClick={handleRequestContactShare}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Request Contact Share</span>
            </button>
          )}

          {/* STATE 2: PENDING APPROVAL (LOADER) */}
          {currentState === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
              <div className="w-6 h-6 border-3 border-amber-300 border-t-amber-600 rounded-full animate-spin mx-auto" />
              <h4 className="text-xs font-bold text-amber-900">Waiting for Donor Approval</h4>
              <p className="text-[11px] text-slate-600">
                Request sent to <strong>{donorName}</strong>. Please wait...
              </p>
            </div>
          )}

          {/* STATE 3: DECLINED / CANCELLED */}
          {currentState === 'declined' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center space-y-1">
              <h4 className="text-xs font-bold text-rose-800 flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>❌ Request Cancelled</span>
              </h4>
              <p className="text-[11px] text-slate-600">
                The request was declined or cancelled by the donor.
              </p>
            </div>
          )}

          {/* STATE 4, 5, 6: CONTACTS SHARED / EN ROUTE */}
          {(currentState === 'approved' || currentState === 'arrivalPending' || currentState === 'arrivalConfirmed') && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-teal-200 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between font-extrabold text-teal-900 text-[11px] tracking-wider">
                  <span>CONTACT APPROVED</span>
                  <span className="text-emerald-600 font-bold">Shared ✓</span>
                </div>
                <div className="text-slate-800 text-[11px] sm:text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span>📞</span> Whatsapp Number: <strong className="text-teal-900 break-all">{whatsappNumber !== 'Hidden' ? whatsappNumber : phone}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📞</span> Emergency Contact: <strong className="text-teal-900 break-all">{emergencyContact !== 'Hidden' ? emergencyContact : phone}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <a
                  href={`tel:${emergencyContact !== 'Hidden' ? emergencyContact : phone}`}
                  className="py-2 sm:py-2.5 px-1.5 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] sm:text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>Call Emergency</span>
                </a>
                <a
                  href={`https://wa.me/${(whatsappNumber !== 'Hidden' ? whatsappNumber : phone).replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 sm:py-2.5 px-1.5 sm:px-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[11px] sm:text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="truncate">WhatsApp</span>
                </a>
              </div>

              {currentState === 'approved' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                  <div className="w-6 h-6 border-3 border-amber-300 border-t-amber-600 rounded-full animate-spin mx-auto" />
                  <h4 className="text-xs font-bold text-amber-900">Waiting for Donor Arrival Confirmation</h4>
                  <p className="text-[11px] text-slate-600">
                    Waiting for <strong>{donorName}</strong> to confirm they are on the way...
                  </p>
                </div>
              )}

              {currentState === 'arrivalPending' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <button
                    type="button"
                    onClick={handleConfirmArrival}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Donor Arrival (En Route)</span>
                  </button>
                </div>
              )}

              {currentState === 'arrivalConfirmed' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center space-y-2">
                  <p className="text-xs font-bold text-emerald-800">✓ Donor Confirmed Arrival / En Route</p>
                  <button
                    type="button"
                    onClick={handleMarkCompleted}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Donor: Mark Donation Completed</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATE 7: PENDING RECEIVER REVIEW & RATING */}
          {currentState === 'review' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center space-y-2">
              <p className="text-xs font-bold text-amber-900">
                ⌛ Donation Completed! Receiver Review Pending
              </p>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Star className="w-4 h-4" />
                <span>Review Donor's Completion Claim</span>
              </button>
            </div>
          )}

          {/* STATE COMPLETED: SUCCESS BANNER */}
          {currentState === 'completed' && (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-300 rounded-xl p-4 text-center space-y-1.5 shadow-xs relative overflow-hidden">
              <h4 className="text-sm font-extrabold text-emerald-900 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>🎉 Donation Successfully Completed!</span>
              </h4>
              <p className="text-xs font-medium text-slate-700">
                Receiver approved the donation and submitted feedback. Saved in History.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* STATE 7: RECEIVER REVIEW & STAR RATING MODAL */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Donation Completion Review</h3>
              <p className="text-xs text-slate-500">
                Donor stated: <em>"I have successfully completed the blood donation."</em> Please confirm and rate:
              </p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Control with Hover Metric */}
              <div className="text-center space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700">Star Rating:</label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating !== null ? hoverRating : selectedRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className={`p-2 rounded-xl text-xl transition-all cursor-pointer ${
                          isFilled
                            ? 'bg-amber-400 text-slate-950 scale-110 shadow-xs'
                            : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                        }`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-bold text-rose-600 h-4">
                  {ratingDescriptions[hoverRating !== null ? hoverRating : selectedRating]}
                </p>
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Receiver Feedback:</label>
                <textarea
                  rows={3}
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Write feedback about the donor..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Approve Donation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

