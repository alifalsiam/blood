import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { X, LogIn, UserPlus, Database, ShieldCheck, Mail, Lock, Sparkles } from 'lucide-react';

export const SupabaseAuthModalBlock: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, loginMock, showToast, siteConfig } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter email and password', true);
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured) {
      try {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName || email.split('@')[0],
              },
            },
          });
          if (error) throw error;
          showToast('Account created successfully via Supabase!');
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          showToast('Logged in successfully via Supabase!');
        }
        closeAuthModal();
      } catch (err: any) {
        showToast(err.message || 'Authentication failed', true);
      } finally {
        setLoading(false);
      }
    } else {
      // Offline / Local database mode
      const storedUsers = (() => {
        try {
          const saved = localStorage.getItem('lifedrop_registered_users');
          return saved ? JSON.parse(saved) : [];
        } catch (e) {
          return [];
        }
      })();
      const cleanEmail = email.toLowerCase().trim();
      const matched = storedUsers.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

      if (isSignUp) {
        const newUser = {
          userId: `RD${Math.floor(100000 + Math.random() * 900000)}`,
          fullName: fullName || email.split('@')[0],
          email: cleanEmail,
          password: password,
          role: 'Donor',
          status: 'Active',
          bloodGroup: 'A+',
        };
        const updated = [newUser, ...storedUsers.filter((u: any) => u.email?.toLowerCase() !== cleanEmail)];
        localStorage.setItem('lifedrop_registered_users', JSON.stringify(updated));
        loginMock(cleanEmail, fullName || email.split('@')[0], newUser);
        showToast('Account created and authenticated successfully!');
        closeAuthModal();
        setLoading(false);
      } else {
        if (!matched) {
          showToast('❌ Account not found. Please register first.', true);
          setLoading(false);
          return;
        }
        if (matched.password && matched.password !== password) {
          showToast('❌ Incorrect password. Please check your credentials.', true);
          setLoading(false);
          return;
        }
        loginMock(cleanEmail, matched.fullName || email.split('@')[0], matched);
        showToast('Logged in successfully!');
        closeAuthModal();
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="p-2 bg-rose-100 text-rose-600 rounded-xl">
            <Database className="w-5 h-5" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
            {isSupabaseConfigured ? 'Supabase Live' : 'Supabase Ready'}
          </span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1">
          {isSignUp ? `Create ${siteConfig?.companyName || (siteConfig?._hasLoaded ? 'Company Name' : '')} Account` : `Welcome Back to ${siteConfig?.companyName || (siteConfig?._hasLoaded ? 'Company Name' : '')}`}
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Connect your account to protect blood requests, donor card data, and profile settings.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full pl-3 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                Sign Up with Supabase
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Log In to Session
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {/* Quick Demo Bypass for testing protected blocks */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <button
            onClick={() => loginMock('demo.user@lifedrop.org', 'Demo Member')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Preview Auth (Instant Demo Mode)
          </button>
        </div>
      </div>
    </div>
  );
};
