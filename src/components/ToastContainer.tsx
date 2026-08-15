import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-white rounded-lg shadow-lg border-l-4 p-4 flex items-start gap-3 transition-all transform animate-in slide-in-from-right duration-200 ${
            toast.isError ? 'border-l-rose-600' : 'border-l-emerald-600'
          }`}
        >
          {toast.isError ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs sm:text-sm text-slate-700 leading-snug">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-sm cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
