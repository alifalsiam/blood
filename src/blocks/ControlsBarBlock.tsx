import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export const ControlsBarBlock: React.FC = () => {
  const {
    pendingRoleShift,
    confirmRoleShift,
    cancelRoleShift,
  } = useAuth();

  if (!pendingRoleShift) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Role Shift</h3>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          {pendingRoleShift === 'Donor' ? (
            <>Shifting from <strong>Receiver</strong> to <strong>Donor</strong> will clear any active blood requests currently posted on your dashboard.</>
          ) : (
            <>Shifting from <strong>Donor</strong> to <strong>Receiver</strong> will clear any active donor bids or radar interest.</>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={cancelRoleShift}
            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={confirmRoleShift}
            className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Yes, Shift Role
          </button>
        </div>
      </div>
    </div>
  );
};

