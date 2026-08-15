import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, KeyRound, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';

export const AdminLoginBlock: React.FC = () => {
  const { loginAdmin, setActiveTab } = useAuth();

  // Login form state
  const [emailOrUser, setEmailOrUser] = useState('kfalifalsiam540@gmail.com');
  const [password, setPassword] = useState('SiamBhai4265#');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailOrUser.trim()) {
      setError('Please enter your admin email or username.');
      return;
    }
    if (!password) {
      setError('Please enter your admin password.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const success = loginAdmin(emailOrUser, password);
      setIsSubmitting(false);
      if (!success) {
        setError('Unauthorized credentials. Donor & Receiver user accounts cannot log in to Admin panel.');
      }
    }, 400);
  };

  const fillDefaultOperatingCredentials = () => {
    setEmailOrUser('kfalifalsiam540@gmail.com');
    setPassword('SiamBhai4265#');
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to LifeDrop Main Site</span>
        </button>

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Top Banner */}
          <div className="bg-slate-900 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
              <Shield className="w-40 h-40 text-rose-500" />
            </div>

            <div className="inline-flex items-center justify-center p-3 bg-rose-600/20 border border-rose-500/30 rounded-2xl text-rose-400 mb-3 shadow-inner">
              <ShieldCheck className="w-8 h-8 text-rose-500" />
            </div>

            <h1 className="text-xl font-extrabold tracking-tight text-white">
              LifeDrop Admin Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Restricted Operating Administrator Authentication
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <span className="font-bold">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={emailOrUser}
                  onChange={(e) => setEmailOrUser(e.target.value)}
                  placeholder="kfalifalsiam540@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Quick pre-filled credentials button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={fillDefaultOperatingCredentials}
                className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-rose-200 transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                <span>Fill Operating Super Admin Credentials</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Log In to Admin Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Notice */}
          <div className="bg-slate-50 border-t border-slate-100 p-4 text-center text-[11px] text-slate-500 font-medium space-y-1">
            <p className="font-bold text-slate-700">🔒 Restricted Operating Admin Portal</p>
            <p>Donor & Receiver main app user credentials cannot be used here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
