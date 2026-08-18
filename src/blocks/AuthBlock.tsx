import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BloodType } from '../types';
import { divisionNamesWithSuffix, bangladeshDivisionsAndDistricts } from '../data/locationData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const existingUsers = [
  { email: "existing.donor@lifedrop.com", phone: "01711223344" },
  { email: "test@example.com", phone: "01899887766" }
];

const getStoredRegisteredUsers = (): any[] => {
  try {
    const saved = localStorage.getItem('lifedrop_registered_users');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const formatBdPhone = (num: string): string => {
  if (!num) return '';
  const clean = num.replace(/\D/g, '');
  if (clean.length === 11 && clean.startsWith('01')) {
    return `+880 ${clean.slice(1, 5)}-${clean.slice(5)}`;
  }
  if (num.startsWith('+')) return num;
  return '+88' + num;
};

export const AuthBlock: React.FC = () => {
  const { loginMock, showToast, siteConfig, closeAuthModal } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isSuccessView, setIsSuccessView] = useState(false);
  const [lastRegisteredProfile, setLastRegisteredProfile] = useState<any>(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState(false);

  // Reset Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailError, setResetEmailError] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'not_found'>('idle');

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regBlood, setRegBlood] = useState<BloodType | ''>('');
  const [regSex, setRegSex] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regWeight, setRegWeight] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDivision, setRegDivision] = useState('');
  const [regDistrict, setRegDistrict] = useState('');
  const [regFullAddress, setRegFullAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [termsChecked, setTermsChecked] = useState(false);

  // Passwords Visibility
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Error States
  const [phoneError, setPhoneError] = useState('');
  const [emergencyPhoneError, setEmergencyPhoneError] = useState('');
  const [regEmailError, setRegEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState(false);

  // Success Screen Data
  const [registeredUserName, setRegisteredUserName] = useState('');
  const [registeredUserBlood, setRegisteredUserBlood] = useState('');

  // Division Change Handler
  const handleDivisionChange = (val: string) => {
    setRegDivision(val);
    setRegDistrict('');
  };

  // Email Validation Helper (Strict RFC 5322 Standard Format)
  const isValidEmail = (emailStr: string) => {
    if (!emailStr || typeof emailStr !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailStr.trim());
  };

  // Password Strength Regex (Min 8 chars, 1 upper, 1 lower, 1 num, 1 special)
  const isStrongPassword = (passStr: string) => {
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return strongRegex.test(passStr);
  };

  // Generate Strong Password
  const handleGeneratePassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    password = password.split('').sort(() => 0.5 - Math.random()).join('');

    setRegPassword(password);
    setRegConfirmPassword(password);
    setPasswordError('');
    setConfirmPasswordError('');
    showToast('Secure password generated!');
  };

  // Phone Sanitizer & Blur Check
  const handlePhoneInput = (val: string, setter: React.Dispatch<React.SetStateAction<string>>, errorSetter: React.Dispatch<React.SetStateAction<string>>) => {
    let sanitized = val.replace(/[^0-9]/g, '');
    if (sanitized.length > 11) {
      sanitized = sanitized.slice(0, 11);
    }
    setter(sanitized);
    errorSetter('');
  };

  const handlePhoneBlur = (val: string, errorSetter: React.Dispatch<React.SetStateAction<string>>) => {
    if (val.length > 0 && (!val.startsWith('01') || val.length !== 11)) {
      errorSetter('Number must start with 01 and contain 11 digits in total.');
      return;
    }
    if (regPhone && regEmergencyPhone && regPhone.replace(/\D/g, '') === regEmergencyPhone.replace(/\D/g, '')) {
      setEmergencyPhoneError('WhatsApp Contact Number and Emergency Contact Number cannot be identical. Please provide two different numbers.');
      return;
    }
    errorSetter('');
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !isValidEmail(resetEmail)) {
      setResetEmailError(true);
      showToast('Please enter a valid email address.', true);
      return;
    }
    if (isSupabaseConfigured) {
      setResetStatus('loading');
      
      try {
        const cleanEmail = resetEmail.toLowerCase().trim();
        
        // Step 1: Check if the user exists in the profiles table
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!data) {
          setResetStatus('not_found');
          return;
        }

        // Step 2: Send reset link
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin + '/',
        });
        
        if (error) {
          showToast(`Reset failed: ${error.message}`, true);
          setResetStatus('idle'); // Fix: release the loading lock on error
        } else {
          setResetStatus('success');
          
          // Auto-redirect to login after 4 seconds
          setTimeout(() => {
            setAuthMode('login');
            setResetEmail('');
            setResetStatus('idle');
          }, 4000);
        }
      } catch (err: any) {
        showToast(`An unexpected error occurred: ${err.message}`, true);
        setResetStatus('idle');
      }
    }
  };

  // Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast('Please fill out all required fields.', true);
      return;
    }

    if (!isValidEmail(loginEmail)) {
      setLoginEmailError(true);
      showToast('Please enter a valid email format.', true);
      return;
    }

    const cleanEmail = loginEmail.toLowerCase().trim();

    showToast('Signing in...');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: loginPassword,
    });

    if (authError) {
      const msg = authError.message || '';
      let errorMsg: string;

      if (
        msg === 'Invalid login credentials' ||
        msg.toLowerCase().includes('invalid login')
      ) {
        errorMsg = 'Incorrect email or password. If you just registered, please try again — your account may still be setting up.';
      } else {
        errorMsg = msg || 'Login failed. Please try again.';
      }

      showToast(`❌ ${errorMsg}`, true);
      return;
    }

    if (authData.user) {
      // onAuthStateChange in AuthContext handles profile hydration and state updates.
      showToast(`✅ Welcome back! Signing you in...`);
      closeAuthModal();
    }
  };

  // Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regName || !regDob || !regBlood || !regSex || !regWeight || !regPhone || !regEmergencyPhone || !regEmail || !regDivision || !regDistrict || !regFullAddress || !regPassword || !regConfirmPassword) {
      showToast('All fields must be filled out completely.', true);
      return;
    }

    if (!termsChecked) {
      setTermsError(true);
      showToast('You must agree to the Terms and Conditions.', true);
      return;
    } else {
      setTermsError(false);
    }

    let emailExists = false;
    let phoneExists = false;

    if (isSupabaseConfigured) {
      const formattedPhoneForCheck = formatBdPhone(regPhone);
      
      const [emailCheck, phoneCheck] = await Promise.all([
        supabase.from('profiles').select('email').ilike('email', regEmail.toLowerCase()).maybeSingle(),
        supabase.from('profiles').select('phone').eq('phone', formattedPhoneForCheck).maybeSingle()
      ]);

      if (emailCheck.data) emailExists = true;
      if (phoneCheck.data) phoneExists = true;
    } else {
      let serverUsers: any[] = [];
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) serverUsers = data;
        }
      } catch (e) {}

      const storedUsers = getStoredRegisteredUsers();
      const allKnownUsers = [...existingUsers, ...serverUsers, ...storedUsers];
      emailExists = allKnownUsers.some(u => u.email && u.email.toLowerCase() === regEmail.toLowerCase());
      phoneExists = allKnownUsers.some(u => (u.phone || '').replace(/\D/g, '').includes(regPhone.replace(/\D/g, '')));
    }

    if (emailExists || phoneExists) {
      if (emailExists) setRegEmailError('This email is already registered. Please use a non-existing email.');
      if (phoneExists) setPhoneError('This WhatsApp number is already in use. Please change to a non-existing contact.');
      showToast('Registration failed: Email or Contact number already exists!', true);
      return;
    }

    // Strict Email Format Validation
    if (!isValidEmail(regEmail)) {
      setRegEmailError('Invalid email structure. Format must be name@domain.com (e.g., john@gmail.com)');
      showToast('Invalid email address structure. Example: user@domain.com', true);
      return;
    }

    // Strict Phone Number vs Emergency Contact Number Validation
    const cleanPhone = regPhone.replace(/\D/g, '');
    const cleanEmergency = regEmergencyPhone.replace(/\D/g, '');

    if (!regPhone.startsWith('01') || cleanPhone.length !== 11) {
      setPhoneError('WhatsApp number must start with 01 and contain 11 digits in total.');
      showToast('WhatsApp number must start with 01 and contain 11 digits in total.', true);
      return;
    }

    if (!regEmergencyPhone.startsWith('01') || cleanEmergency.length !== 11) {
      setEmergencyPhoneError('Emergency contact must start with 01 and contain 11 digits in total.');
      showToast('Emergency contact must start with 01 and contain 11 digits in total.', true);
      return;
    }

    if (cleanPhone === cleanEmergency) {
      setEmergencyPhoneError('WhatsApp Contact Number and Emergency Contact Number cannot be identical. Please enter a different Emergency Contact Number.');
      showToast('WhatsApp number and Emergency contact number must be different!', true);
      return;
    }

    if (!isStrongPassword(regPassword)) {
      setPasswordError('Password does not meet requirements.');
      showToast('Password must meet the strong security criteria.', true);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      showToast('Passwords do not match.', true);
      return;
    }

    const newUserId = `RD${Math.floor(100000 + Math.random() * 900000)}`;
    const formattedPhone = formatBdPhone(regPhone);
    const formattedEmergency = formatBdPhone(regEmergencyPhone);

    const newUserProfile = {
      userId: newUserId,
      id: newUserId,
      fullName: regName,
      email: regEmail.toLowerCase(),
      password: regPassword,
      phone: formattedPhone,
      emergencyContact: formattedEmergency,
      bloodGroup: regBlood as BloodType,
      weight: parseFloat(regWeight) || 65,
      sex: regSex as any,
      dob: regDob,
      address: regFullAddress,
      division: regDivision || 'Dhaka Division',
      district: regDistrict || 'Dhaka',
      verified: false,
      status: 'Active' as const,
      avatarUrl: 'https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png',
      coverUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
      totalDonations: 0,
      rating: 5.0,
    };

    // Sync newly registered user to server API
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: newUserProfile }),
      });
    } catch (err) {
      console.warn('Server user sync error:', err);
    }

    // 1. Create user in Supabase Auth — capture the returned UUID
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: regEmail.toLowerCase(),
      password: regPassword,
      options: {
        data: {
          full_name: regName,
          phone: formattedPhone,
        },
      },
    });

    if (signUpError) {
      const isAlreadyRegistered =
        signUpError.message.toLowerCase().includes('already registered') ||
        signUpError.message.toLowerCase().includes('already been registered') ||
        signUpError.message.toLowerCase().includes('user already exists');

      if (!isAlreadyRegistered) {
        // A real error: Supabase couldn't create the account — stop and inform user
        showToast(`❌ Account creation failed: ${signUpError.message}`, true);
        return;
      }
      // Email already exists in Supabase Auth — proceed (auto sign-in below will work)
    }

    // Use the real Supabase Auth UUID as profile id (required for RLS and correct linking)
    const authUUID = signUpData?.user?.id || crypto.randomUUID();

    // 2. Insert profile record in profiles table, linked to the real auth UUID
    const profilePayload = {
      id: authUUID,
      user_id: newUserId,
      full_name: regName,
      email: regEmail.toLowerCase(),
      phone: formattedPhone,
      emergency_contact: formattedEmergency,
      address: regFullAddress,
      division: regDivision || 'Dhaka Division',
      district: regDistrict || 'Dhaka',
      blood_group: regBlood,
      weight: parseFloat(regWeight) || 65,
      sex: regSex,
      dob: regDob,
      role: 'Donor',
      online_status: 'Online',
      is_logged_in: true,
      avatar_url: 'https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png',
      cover_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
      total_donations: 0,
      verified: false,
      status: 'Active',
      rating: 5.0,
      updated_at: new Date().toISOString()
    };

    const { error: upsertErr } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'email' });
    if (upsertErr) {
      console.warn('Supabase profile upsert error:', upsertErr.message);
      // Fallback: try insert without conflict handling
      const { error: insertErr } = await supabase.from('profiles').insert([profilePayload]);
      if (insertErr) {
        console.warn('Supabase profile insert error:', insertErr.message);
        // Non-fatal: profile might already exist or RLS is open — continue to sign-in
      }
    }

    // 3. Auto sign-in so onAuthStateChange fires and hydrates the full session
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: regEmail.toLowerCase(),
      password: regPassword,
    });
    if (signInErr) {
      showToast(`❌ Registration succeeded but auto sign-in failed: ${signInErr.message}. Please log in manually.`, true);
      console.warn('Auto sign-in after registration failed:', signInErr.message);
    }

    // Success Screen Data
    setRegisteredUserName(regName);
    setRegisteredUserBlood(regBlood);
    setIsSuccessView(true);
  };

  const handleProceedToSignIn = async () => {
    // Check if auto sign-in from registration already created a session
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // Already signed in — onAuthStateChange has already hydrated the profile
      // Just close the registration screen
      closeAuthModal();
      return;
    }

    // No active session — attempt sign-in now with the registered credentials
    showToast('Signing you in...');
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: regEmail.toLowerCase(),
      password: regPassword,
    });

    if (signInErr) {
      showToast(`❌ Could not sign in: ${signInErr.message}`, true);
      return;
    }

    // onAuthStateChange will fire SIGNED_IN and hydrate the user profile automatically
    closeAuthModal();
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff5f5] via-[#ffe3e3] to-[#fdf2f2] text-[#1d3557] flex flex-col items-center justify-center p-3 sm:p-5 relative overflow-x-hidden font-sans">
      {/* Dynamic Background Animation Styles */}
      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-900px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes btn-shimmer-anim {
          0% { transform: translateX(-100%) rotate(30deg); }
          100% { transform: translateX(100%) rotate(30deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .btn-shimmer::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.35) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(30deg);
          animation: btn-shimmer-anim 3s infinite;
        }
      `}</style>

      {/* Floating Background Shapes */}
      <ul className="absolute top-0 left-0 w-full h-full overflow-hidden z-1 pointer-events-none">
        <li className="absolute block list-none bg-rose-500/10 rounded-full border border-rose-500/15 bottom-[-150px] left-[10%] w-[70px] h-[70px]" style={{ animation: 'floatUp 18s linear infinite' }} />
        <li className="absolute block list-none bg-rose-500/10 rounded-full border border-rose-500/15 bottom-[-150px] left-[20%] w-[35px] h-[35px]" style={{ animation: 'floatUp 12s linear infinite 2s' }} />
        <li className="absolute block list-none bg-rose-500/10 rounded-full border border-rose-500/15 bottom-[-150px] left-[35%] w-[50px] h-[50px]" style={{ animation: 'floatUp 18s linear infinite 4s' }} />
        <li className="absolute block list-none bg-rose-500/10 rounded-full border border-rose-500/15 bottom-[-150px] left-[50%] w-[25px] h-[25px]" style={{ animation: 'floatUp 16s linear infinite 1s' }} />
        <li className="absolute block list-none bg-rose-500/10 rounded-full border border-rose-500/15 bottom-[-150px] left-[65%] w-[60px] h-[60px]" style={{ animation: 'floatUp 18s linear infinite 3s' }} />
        <li className="absolute block list-none bg-rose-500/10 rounded-full border border-rose-500/15 bottom-[-150px] left-[78%] w-[90px] h-[90px]" style={{ animation: 'floatUp 18s linear infinite 6s' }} />
        <li className="absolute block list-none bg-rose-500/10 rounded-full border border-rose-500/15 bottom-[-150px] left-[88%] w-[45px] h-[45px]" style={{ animation: 'floatUp 18s linear infinite 5s' }} />
      </ul>

      {/* Top Logo Branding Section */}
      <a href="/" className="relative z-10 flex items-center gap-2.5 mb-4 select-none hover:opacity-90 transition-opacity cursor-pointer text-decoration-none">
        {siteConfig.logoDisplayMode === 'logoOnly' ? (
          <>
            {siteConfig.logoUrl ? (
              <img src={siteConfig.logoUrl} alt="Logo" className="h-[42px] object-contain drop-shadow-md" />
            ) : (
              <div className="w-[42px] h-[42px] bg-[#e63946] text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-rose-500/30">
                {siteConfig.logoSymbol || <i className="fa-solid fa-droplet"></i>}
              </div>
            )}
            <div className="text-2xl font-extrabold text-[#e63946] tracking-tight">{siteConfig.companyName || (siteConfig._hasLoaded ? 'Company Name' : '')}</div>
          </>
        ) : (
          <div className="text-2xl font-extrabold text-[#e63946] tracking-tight">{siteConfig.companyName || (siteConfig._hasLoaded ? 'Company Name' : '')}</div>
        )}
      </a>

      {/* TERMS & CONDITIONS MODAL */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-extrabold text-[#1d3557] flex items-center gap-2">
                <i className="fa-solid fa-file-contract text-[#e63946]"></i>
                <span>Terms & Conditions</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="text-xs text-[#64748b] leading-relaxed overflow-y-auto max-h-[50vh] pr-2 mb-4 space-y-3">
              <p>Welcome to <strong>{siteConfig.companyName || (siteConfig._hasLoaded ? 'Company Name' : '')}</strong>. By registering as a donor or user within our community, you agree to comply with and be bound by the following terms and guidelines:</p>
              <div>
                <h4 className="font-bold text-[#1d3557] text-xs">1. Donor Eligibility & Truthfulness</h4>
                <p>You certify that all personal records provided (including Name, Date of Birth, Weight, Blood Group, and Medical Status) are accurate and truthful to the best of your knowledge.</p>
              </div>
              <div>
                <h4 className="font-bold text-[#1d3557] text-xs">2. Privacy & Emergency Contact Data</h4>
                <p>Your WhatsApp and emergency contact numbers will be utilized exclusively for coordination during emergency blood requests and community notifications.</p>
              </div>
              <div>
                <h4 className="font-bold text-[#1d3557] text-xs">3. Code of Conduct</h4>
                <p>Members agree to treat fellow donors and recipients with dignity, respect, and absolute honesty regarding donation availability.</p>
              </div>
              <div>
                <h4 className="font-bold text-[#1d3557] text-xs">4. Account Security</h4>
                <p>You are responsible for keeping your account password secure. {siteConfig.companyName || (siteConfig._hasLoaded ? 'Company Name' : '')} is not liable for unauthorized access stemming from compromised credentials.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTermsModalOpen(false)}
              className="w-full py-2.5 bg-[#e63946] hover:bg-[#d90429] text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md shadow-rose-500/20"
            >
              Understood & Close
            </button>
          </div>
        </div>
      )}

      {/* AUTH CONTAINER CARD */}
      <div className="w-full max-w-[500px] bg-white/98 backdrop-blur-md rounded-[20px] border border-rose-500/15 p-5 sm:p-8 shadow-2xl shadow-rose-500/10 max-h-[86vh] overflow-y-auto relative z-10">
        {!isSuccessView ? (
          <>
            {/* Segmented Tabs for Sign In / Register */}
            <div className="grid grid-cols-2 bg-[#f8fafc] rounded-xl p-1 mb-5 border border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'login' ? 'bg-white text-[#e63946] shadow-sm' : 'text-[#64748b] hover:text-[#1d3557]'
                }`}
              >
                <i className="fa-solid fa-right-to-bracket"></i> Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'register' ? 'bg-white text-[#e63946] shadow-sm' : 'text-[#64748b] hover:text-[#1d3557]'
                }`}
              >
                <i className="fa-solid fa-user-plus"></i> Register
              </button>
            </div>

            {/* LOGIN FORM VIEW */}
            {authMode === 'login' && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <h2 className="text-lg font-extrabold text-[#1d3557] flex items-center gap-2">
                    <i className="fa-solid fa-droplet text-[#e63946]"></i>
                    <span>Sign In</span>
                  </h2>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3">
                  <div>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-envelope absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={e => {
                          setLoginEmail(e.target.value);
                          setLoginEmailError(false);
                        }}
                        onBlur={e => {
                          if (e.target.value && !isValidEmail(e.target.value)) {
                            setLoginEmailError(true);
                          }
                        }}
                        placeholder="Email Address"
                        className={`w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] transition-all focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 ${
                          loginEmailError ? 'border-rose-500 bg-rose-50' : ''
                        }`}
                      />
                    </div>
                    {loginEmailError && (
                      <p className="text-[11px] font-medium text-[#e63946] mt-1">
                        Please enter a valid email format (e.g., name@domain.com)
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-lock absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-9 pr-9 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] transition-all focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 text-[#64748b] hover:text-[#1d3557] text-xs cursor-pointer"
                      >
                        <i className={`fa-solid ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-shimmer relative overflow-hidden w-full py-3 bg-[#e63946] hover:bg-[#d90429] text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 mt-4"
                  >
                    <i className="fa-solid fa-arrow-right-to-bracket"></i> Sign In
                  </button>
                </form>

                <div className="text-center text-xs text-[#64748b] pt-2">
                  Forgot password?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('reset')}
                    className="text-[#e63946] hover:underline font-semibold cursor-pointer"
                  >
                    Reset access
                  </button>
                </div>
              </div>
            )}

            {/* RESET PASSWORD VIEW */}
            {authMode === 'reset' && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <h2 className="text-lg font-extrabold text-[#1d3557] flex items-center gap-2">
                    <i className="fa-solid fa-key text-[#e63946]"></i>
                    <span>Reset Access</span>
                  </h2>
                </div>

                <form onSubmit={handleSendResetLink} className="space-y-3">
                  {resetStatus === 'not_found' && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-semibold flex items-start gap-3">
                      <i className="fa-solid fa-circle-xmark mt-0.5 text-rose-500"></i>
                      <div>
                        Account not found. There is no user registered with this email address. Please check the spelling or{' '}
                        <button type="button" onClick={() => setAuthMode('register')} className="underline font-bold hover:text-rose-900">create a new account</button>.
                      </div>
                    </div>
                  )}
                  {resetStatus === 'success' && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm font-semibold flex items-start gap-3">
                      <i className="fa-solid fa-circle-check mt-0.5 text-emerald-500"></i>
                      <div>
                        Reset link sent successfully! Please check your email inbox (and spam folder) for the secure link to set your new password.
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#1d3557] mb-1 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fa-regular fa-envelope text-[#94a3b8]"></i>
                      </div>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          setResetEmailError(false);
                          setResetStatus('idle'); // Clear status when typing
                        }}
                        className={`w-full bg-[#f8fafc] border ${resetEmailError ? 'border-[#e63946] ring-2 ring-[#e63946]/20' : 'border-[#e2e8f0]'} rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#e63946]/30 focus:border-[#e63946] transition-all outline-none`}
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetStatus === 'success' || resetStatus === 'loading'}
                    className={`w-full text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-4 ${
                      resetStatus === 'success' 
                        ? 'bg-emerald-600 cursor-not-allowed opacity-90'
                        : resetStatus === 'loading'
                        ? 'bg-[#1d3557] cursor-wait opacity-80'
                        : 'bg-[#1d3557] hover:bg-[#112240] shadow-[0_4px_14px_0_rgba(29,53,87,0.39)] hover:shadow-[0_6px_20px_rgba(29,53,87,0.23)] hover:-translate-y-0.5'
                    }`}
                  >
                    {resetStatus === 'loading' ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Verifying...
                      </>
                    ) : resetStatus === 'success' ? (
                      <>
                        <i className="fa-solid fa-check"></i> Link Sent!
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i> Send Reset Link
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center text-xs text-[#64748b] pt-2">
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-[#e63946] hover:underline font-semibold cursor-pointer"
                  >
                    Back to login
                  </button>
                </div>
              </div>
            )}

            {/* REGISTER FORM VIEW */}
            {authMode === 'register' && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <h2 className="text-lg font-extrabold text-[#1d3557] flex items-center gap-2">
                    <i className="fa-solid fa-heart-pulse text-[#e63946]"></i>
                    <span>Registration</span>
                  </h2>
                  <div className="text-[10px] font-bold text-[#64748b] bg-[#f1f5f9] px-2 py-1 rounded-md">
                    100% Free
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  {/* CATEGORY 1: PERSONAL INFORMATION */}
                  <div className="text-[11px] uppercase tracking-wider font-extrabold text-[#64748b] flex items-center gap-2 pt-1">
                    <i className="fa-solid fa-user text-[#e63946]"></i> Personal Information
                    <div className="flex-1 h-[1px] bg-[#e2e8f0]"></div>
                  </div>

                  <div>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-signature absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="relative flex items-center">
                        <i className="fa-solid fa-droplet absolute left-3.5 text-[#e63946] text-xs pointer-events-none"></i>
                        <select
                          required
                          value={regBlood}
                          onChange={e => setRegBlood(e.target.value as BloodType)}
                          className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 cursor-pointer transition-all"
                        >
                          <option value="" disabled>Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="relative flex items-center">
                        <i className="fa-solid fa-venus-mars absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                        <select
                          required
                          value={regSex}
                          onChange={e => setRegSex(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 cursor-pointer transition-all"
                        >
                          <option value="" disabled>Sex</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="relative flex items-center">
                        <i className="fa-solid fa-calendar-days absolute left-3.5 text-[#e63946] text-xs pointer-events-none"></i>
                        <input
                          type="date"
                          required
                          value={regDob}
                          onChange={e => setRegDob(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="relative flex items-center">
                        <i className="fa-solid fa-weight-scale absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                        <input
                          type="number"
                          min="30"
                          max="250"
                          step="0.1"
                          required
                          value={regWeight}
                          onChange={e => setRegWeight(e.target.value)}
                          placeholder="Weight (in KG)"
                          className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CATEGORY 2: CONTACT & LOCATION INFORMATION */}
                  <div className="text-[11px] uppercase tracking-wider font-extrabold text-[#64748b] flex items-center gap-2 pt-2">
                    <i className="fa-solid fa-address-book text-[#e63946]"></i> Contact & Location
                    <div className="flex-1 h-[1px] bg-[#e2e8f0]"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className={`flex items-center border border-[#e2e8f0] rounded-xl bg-[#f8fafc] overflow-hidden focus-within:border-[#e63946] focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/10 transition-all ${phoneError ? 'border-rose-500 bg-rose-50' : ''}`}>
                        <i className="fa-brands fa-whatsapp text-[#25D366] text-xs pl-3 pointer-events-none"></i>
                        <span className="bg-[#e2e8f0] text-[#1d3557] font-bold text-xs px-2.5 py-2.5 select-none border-x border-[#e2e8f0] ml-2">
                          +88
                        </span>
                        <input
                          type="tel"
                          maxLength={11}
                          required
                          value={regPhone}
                          onChange={e => handlePhoneInput(e.target.value, setRegPhone, setPhoneError)}
                          onBlur={e => handlePhoneBlur(e.target.value, setPhoneError)}
                          placeholder="WhatsApp Number"
                          className="w-full px-3 py-2.5 text-xs bg-transparent text-[#1d3557] focus:outline-none"
                        />
                      </div>
                      {phoneError && (
                        <p className="text-[11px] font-medium text-[#e63946] mt-1">{phoneError}</p>
                      )}
                    </div>

                    <div>
                      <div className={`flex items-center border border-[#e2e8f0] rounded-xl bg-[#f8fafc] overflow-hidden focus-within:border-[#e63946] focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/10 transition-all ${emergencyPhoneError ? 'border-rose-500 bg-rose-50' : ''}`}>
                        <i className="fa-solid fa-phone-volume text-[#e63946] text-xs pl-3 pointer-events-none"></i>
                        <span className="bg-[#e2e8f0] text-[#1d3557] font-bold text-xs px-2.5 py-2.5 select-none border-x border-[#e2e8f0] ml-2">
                          +88
                        </span>
                        <input
                          type="tel"
                          maxLength={11}
                          required
                          value={regEmergencyPhone}
                          onChange={e => handlePhoneInput(e.target.value, setRegEmergencyPhone, setEmergencyPhoneError)}
                          onBlur={e => handlePhoneBlur(e.target.value, setEmergencyPhoneError)}
                          placeholder="Emergency Contact"
                          className="w-full px-3 py-2.5 text-xs bg-transparent text-[#1d3557] focus:outline-none"
                        />
                      </div>
                      {emergencyPhoneError && (
                        <p className="text-[11px] font-medium text-[#e63946] mt-1">{emergencyPhoneError}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="relative flex items-center">
                      <i className="fa-solid fa-envelope absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={e => {
                          setRegEmail(e.target.value);
                          setRegEmailError('');
                        }}
                        onBlur={e => {
                          if (e.target.value && !isValidEmail(e.target.value)) {
                            setRegEmailError('Invalid email structure. Format must be name@domain.com (e.g., john@gmail.com)');
                          }
                        }}
                        placeholder="Email ID"
                        className={`w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 transition-all ${
                          regEmailError ? 'border-rose-500 bg-rose-50' : ''
                        }`}
                      />
                    </div>
                    {regEmailError && (
                      <p className="text-[11px] font-medium text-[#e63946] mt-1">{regEmailError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="relative flex items-center">
                        <i className="fa-solid fa-map absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                        <select
                          required
                          value={regDivision}
                          onChange={e => handleDivisionChange(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 cursor-pointer transition-all font-medium"
                        >
                          <option value="" disabled>Select a Division</option>
                          {divisionNamesWithSuffix.map(div => (
                            <option key={div} value={div}>{div}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="relative flex items-center">
                        <i className="fa-solid fa-location-dot absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                        <select
                          required
                          value={regDistrict}
                          onChange={e => setRegDistrict(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 cursor-pointer transition-all font-medium"
                        >
                          <option value="" disabled>Select a District</option>
                          {regDivision && bangladeshDivisionsAndDistricts[regDivision]?.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="relative flex items-start">
                      <i className="fa-solid fa-house absolute left-3.5 top-3 text-[#64748b] text-xs pointer-events-none"></i>
                      <textarea
                        rows={2}
                        required
                        value={regFullAddress}
                        onChange={e => setRegFullAddress(e.target.value)}
                        placeholder="Full address"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 transition-all resize-y"
                      ></textarea>
                    </div>
                  </div>

                  {/* CATEGORY 3: ACCOUNT SECURITY */}
                  <div className="text-[11px] uppercase tracking-wider font-extrabold text-[#64748b] flex items-center gap-2 pt-2">
                    <i className="fa-solid fa-shield-halved text-[#e63946]"></i> Account Security
                    <div className="flex-1 h-[1px] bg-[#e2e8f0]"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="relative flex items-center">
                        <i className="fa-solid fa-lock absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={e => {
                            setRegPassword(e.target.value);
                            setPasswordError('');
                          }}
                          placeholder="Password"
                          className={`w-full pl-9 pr-9 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 transition-all ${
                            passwordError ? 'border-rose-500 bg-rose-50' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 text-[#64748b] hover:text-[#1d3557] text-xs cursor-pointer"
                        >
                          <i className={`fa-solid ${showRegPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[10px] text-[#64748b]">
                        <span>Min 8 chars, upper, lower, num & spec.</span>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="bg-[#fff0f1] hover:bg-[#e63946] hover:text-white border border-dashed border-[#e63946] text-[#e63946] font-semibold px-2 py-0.5 rounded-md text-[10px] cursor-pointer transition-all flex items-center gap-1"
                        >
                          <i className="fa-solid fa-wand-magic-sparkles"></i> Generate
                        </button>
                      </div>
                      {passwordError && (
                        <p className="text-[11px] font-medium text-[#e63946] mt-0.5">{passwordError}</p>
                      )}
                    </div>

                    <div>
                      <div className="relative flex items-center">
                        <i className="fa-solid fa-check-double absolute left-3.5 text-[#64748b] text-xs pointer-events-none"></i>
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={e => {
                            setRegConfirmPassword(e.target.value);
                            setConfirmPasswordError('');
                          }}
                          placeholder="Confirm Password"
                          className={`w-full pl-9 pr-9 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#1d3557] focus:bg-white focus:outline-none focus:border-[#e63946] focus:ring-2 focus:ring-rose-500/10 transition-all ${
                            confirmPasswordError ? 'border-rose-500 bg-rose-50' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-3 text-[#64748b] hover:text-[#1d3557] text-xs cursor-pointer"
                        >
                          <i className={`fa-solid ${showRegConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      {confirmPasswordError && (
                        <p className="text-[11px] font-medium text-[#e63946] mt-1">{confirmPasswordError}</p>
                      )}
                    </div>
                  </div>

                  {/* Terms and Conditions Checkbox */}
                  <div className="flex items-start gap-2 pt-2 text-xs text-[#64748b]">
                    <input
                      type="checkbox"
                      id="termsCheck"
                      required
                      checked={termsChecked}
                      onChange={e => setTermsChecked(e.target.checked)}
                      className="mt-0.5 accent-[#e63946] cursor-pointer w-4 h-4"
                    />
                    <label htmlFor="termsCheck" className="cursor-pointer">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setIsTermsModalOpen(true)}
                        className="text-[#e63946] font-semibold hover:underline cursor-pointer"
                      >
                        Terms and Conditions
                      </button>
                    </label>
                  </div>
                  {termsError && (
                    <p className="text-[11px] font-medium text-[#e63946]">You must agree to the terms and conditions.</p>
                  )}

                  <button
                    type="submit"
                    className="btn-shimmer relative overflow-hidden w-full py-3 bg-[#e63946] hover:bg-[#d90429] text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 mt-4"
                  >
                    <i className="fa-solid fa-user-check"></i> Submit Registration
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          /* SUCCESS SCREEN VIEW */
          <div className="text-center py-5 space-y-4 animate-in fade-in duration-300">
            <div className="w-[70px] h-[70px] bg-[#e6f4f1] text-[#2a9d8f] rounded-full flex items-center justify-center text-3xl mx-auto ring-8 ring-[#2a9d8f]/10 shadow-lg shadow-teal-500/10">
              <i className="fa-solid fa-circle-check"></i>
            </div>

            <h3 className="text-xl font-extrabold text-[#1d3557]">
              Welcome aboard, {registeredUserName}! 🎉
            </h3>

            <p className="text-xs text-[#64748b] leading-relaxed max-w-sm mx-auto">
              Your Lifesaving registration with <strong>{siteConfig.companyName || (siteConfig._hasLoaded ? 'Company Name' : '')}</strong> was processed successfully.<br />
              Your blood group <strong>({registeredUserBlood})</strong> and contact information are now secure. Thank you for stepping forward to save lives!
            </p>

            <button
              type="button"
              onClick={handleProceedToSignIn}
              className="btn-shimmer relative overflow-hidden w-full py-3 bg-[#e63946] hover:bg-[#d90429] text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-right-to-bracket"></i> Proceed to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
