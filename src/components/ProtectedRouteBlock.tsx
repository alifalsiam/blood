import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, LogIn, Database } from 'lucide-react';

interface ProtectedRouteBlockProps {
  children: React.ReactNode;
  blockTitle?: string;
  blockDescription?: string;
  requiredRole?: 'Receiver' | 'Donor';
}

export const ProtectedRouteBlock: React.FC<ProtectedRouteBlockProps> = ({
  children,
  blockTitle = 'Protected Block',
  blockDescription = 'Authentication required to access this module',
  requiredRole,
}) => {
  const { isLoggedIn, activeRole, openAuthModal, isSupabaseReady } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{blockTitle}</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          {blockDescription}. Log in or connect Supabase to view and interact with this block.
        </p>

        <div className="flex flex-wrap gap-3 justify-center items-center">
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Authenticate / Log In
          </button>

          {!isSupabaseReady && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <Database className="w-3.5 h-3.5" />
              Supabase Ready (Preview Mode Active)
            </span>
          )}
        </div>
      </div>
    );
  }

  if (requiredRole && activeRole !== requiredRole) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Role Restricted Block</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          This block is configured for <strong>{requiredRole}</strong> mode. You are currently operating in <strong>{activeRole}</strong> mode.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
