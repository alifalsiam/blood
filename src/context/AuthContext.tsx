import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, ActivityStatus, BloodRequest, ActiveTab, AdminUser, SiteConfig, BloodBank, SupportTicket } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { realtimeHub } from '../lib/realtime';
import { Preloader } from '../components/Preloader';
import { isBloodCompatible } from '../lib/bloodCompatibility';

interface Toast {
  id: string;
  message: string;
  isError?: boolean;
}

interface AuthContextType {
  user: UserProfile;
  isLoggedIn: boolean;
  isSupabaseReady: boolean;
  activeRole: UserRole;
  activityStatus: ActivityStatus;
  pendingRoleShift: UserRole | null;
  activeRequest: BloodRequest | null;
  allBloodRequests: BloodRequest[];
  activeTab: ActiveTab;
  isAuthModalOpen: boolean;
  toasts: Toast[];
  isLoading: boolean;
  loadingMessage: string;
  isAdminLoggedIn: boolean;
  adminUser: AdminUser | null;
  adminAccounts: Array<{
    id: string;
    username: string;
    email: string;
    password?: string;
    role: string;
    createdAt: string;
  }>;
  siteConfig: SiteConfig;
  bloodBanks: BloodBank[];
  setBloodBanks: React.Dispatch<React.SetStateAction<BloodBank[]>>;
  
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  loginAdmin: (emailOrUser: string, pass: string) => boolean;
  logoutAdmin: () => void;
  registerAdminAccount: (newAdmin: { username: string; email: string; password: string; role?: string }) => boolean;
  removeAdminAccount: (email: string) => void;
  updateSiteConfig: (updates: Partial<SiteConfig>) => void;
  adminOverrideActiveRequest: (updatedReq: Partial<BloodRequest> | null) => void;
  promptRoleShift: (targetRole: UserRole) => void;
  confirmRoleShift: () => void;
  cancelRoleShift: () => void;
  toggleActivityStatus: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  loginMock: (email: string, name?: string) => void;
  logout: () => void;
  createRequest: (reqData: {
    bloodType: any;
    hospitalName: string;
    hospitalLocation: string;
    latitude?: number;
    longitude?: number;
    qtyWhole: number;
    qtyPlatelets: number;
    qtyPlasma: number;
    qtyDoubleRed: number;
    reasonNeeded: string;
    neededInHours: number;
  }) => Promise<void> | void;
  cancelRequest: (reason: string) => void;
  expressDonorInterest: (donorId?: string) => void;
  shareDonorContact: (donorId?: string) => void;
  confirmReceiverMatch: (donorId: string) => void;
  completeDonorDonation: (requestId: string) => void;
  acceptBloodRequest: (requestId: string) => void;
  declineBloodRequest: (requestId: string) => void;
  donorConfirmArrival: (requestId: string) => void;
  donorMarkCompleted: (requestId: string) => void;
  requestSpecificDonor: (requestId: string, donorId: string) => void;
  submitReceiverRating: (rating: number, feedback: string) => void;
  showToast: (message: string, isError?: boolean) => void;
  removeToast: (id: string) => void;
  triggerLoading: (durationMs?: number, msg?: string) => void;
  setIsLoading: (loading: boolean, msg?: string) => void;
  clearAllDemoData: () => void;
  ticketsList: SupportTicket[];
  createSupportTicket: (ticket: { category: string; subject: string; description: string }) => void;
  isSoundMuted: boolean;
  toggleSoundMute: () => void;
}

const defaultProfile: UserProfile = {
  id: '',
  userId: '',
  fullName: '',
  email: '',
  phone: '',
  emergencyContact: '',
  address: '',
  division: 'Dhaka Division',
  district: 'Dhaka',
  bloodGroup: 'A+',
  weight: 70,
  sex: 'Male',
  dob: '',
  avatarUrl: '',
  coverUrl: '',
  totalDonations: 0,
  lastDonatedDate: '',
  verified: false,
  status: 'Active',
  rating: 5.0,
  isLoggedIn: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    const savedUser = localStorage.getItem('lifedrop_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && (parsed.email || parsed.fullName || parsed.id)) {
          return { ...defaultProfile, ...parsed };
        }
      } catch (e) {}
    }
    return defaultProfile;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const isLoggedFlag = localStorage.getItem('lifedrop_is_logged_in') === 'true';
    const savedUser = localStorage.getItem('lifedrop_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && (parsed.isLoggedIn || parsed.email)) return true;
      } catch (e) {}
    }
    return isLoggedFlag;
  });
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('lifedrop_active_role');
    if (savedRole === 'Donor' || savedRole === 'Receiver') {
      return savedRole as UserRole;
    }
    return 'Donor';
  });
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>('online');
  const [pendingRoleShift, setPendingRoleShift] = useState<UserRole | null>(null);
  
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => {
    return localStorage.getItem('lifedrop_sound_muted') === 'true';
  });

  const toggleSoundMute = () => {
    setIsSoundMuted(prev => {
      const next = !prev;
      localStorage.setItem('lifedrop_sound_muted', String(next));
      if (next) {
        showToast('Radar alert sound muted.', true);
      } else {
        showToast('Radar alert sound unmuted.');
      }
      return next;
    });
  };

  const [activeRequest, setActiveRequest] = useState<BloodRequest | null>(null);
  const [allBloodRequests, setAllBloodRequests] = useState<BloodRequest[]>([]);
  const [_supabaseSession, setSupabaseSession] = useState<any>(null);
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    const validTabs: ActiveTab[] = [
      'dashboard', 'stats', 'emergency', 'bloodbank', 'donorCard',
      'supportDev', 'supportTickets', 'profile', 'admin', 'admin/login'
    ];
    try {
      const path = window.location.pathname.replace(/^\//, '');
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (path && validTabs.includes(path as ActiveTab)) return path as ActiveTab;
      if (hash && validTabs.includes(hash as ActiveTab)) return hash as ActiveTab;
      const savedTab = localStorage.getItem('lifedrop_active_tab');
      if (savedTab && validTabs.includes(savedTab as ActiveTab)) return savedTab as ActiveTab;
    } catch (e) {}
    return 'dashboard';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoadingState] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>("Preparing life-saving connections…");

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const defaultSiteConfig: SiteConfig = {
    companyName: '',
    logoSymbol: '',
    logoUrl: '',
    faviconUrl: '',
    logoDisplayMode: 'both',
    tagline: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    analyticsId: '',
    metaPixelId: '',
    ogImageUrl: '',
    maintenanceMode: false,
    announcementActive: true,
    announcementText: '⚡ High Priority Alert: O- negative blood needed urgently at Dhaka Medical College Hospital.',
    emergencyHotline: '999 / 16263',
    emergencyContacts: [],
    ticketCategories: ['Account & Verification', 'Donor Radar Match', 'Technical Bug / Glitch', 'Other Inquiry'],
    radarRadiusKm: 25,
  };

  const initialBloodBanks: BloodBank[] = [];

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => {
    const saved = localStorage.getItem('lifedrop_site_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.companyName) {
          // Remove emergencyContacts from local config so it always fetches fresh from server
          delete parsed.emergencyContacts;
          return { ...defaultSiteConfig, ...parsed };
        }
      } catch (e) {}
    }
    return defaultSiteConfig;
  });

  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);

  // Function to set and persist blood banks on both Server and Supabase
  const setBloodBanksServer = (action: React.SetStateAction<BloodBank[]>) => {
    setBloodBanks((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      // 1. Sync to local backend server
      fetch('/api/blood-banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloodBanks: next }),
      }).catch(err => console.warn('Failed to sync blood banks to server:', err));

      // 2. Sync directly to Supabase blood_banks table
      if (isSupabaseConfigured) {
        (async () => {
          try {
            // Remove existing and insert fresh list to guarantee perfect synchronization
            await supabase.from('blood_banks').delete().neq('id', '___non_existent___');
            if (next.length > 0) {
              const rows = next.map(b => ({
                id: b.id,
                name: b.name,
                division: b.division,
                district: b.district,
                phone: b.phone,
                phones: b.phones || [b.phone],
                address: b.address,
                map_url: b.mapUrl || '',
                latitude: b.latitude || null,
                longitude: b.longitude || null,
                distance_km: b.distanceKm || 0,
                updated_at: new Date().toISOString()
              }));
              await supabase.from('blood_banks').insert(rows);
            }
          } catch (e) {
            console.warn('Supabase blood_banks sync error:', e);
          }
        })();
      }

      return next;
    });
  };

  // On App Mount: Clean localStorage of Blood Banks & Emergency Contacts data and fetch from Server
  useEffect(() => {
    // Purge localstorage blood banks and emergency contacts
    localStorage.removeItem('lifedrop_blood_banks');
    try {
      const savedConfig = localStorage.getItem('lifedrop_site_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed && 'emergencyContacts' in parsed) {
          delete parsed.emergencyContacts;
          localStorage.setItem('lifedrop_site_config', JSON.stringify(parsed));
        }
      }
    } catch (e) {}

    const syncCurrentUserFromList = (usersList: any[]) => {
      const activeStr = localStorage.getItem('lifedrop_user');
      let currentActive: any = null;
      if (activeStr) {
        try { currentActive = JSON.parse(activeStr); } catch (e) {}
      }
      if (!currentActive || !currentActive.email) return;

      const cleanEmail = currentActive.email.toLowerCase().trim();
      const currentId = String(currentActive.id || currentActive.userId || '');

      // Check if user was deleted
      const storedDeleted = localStorage.getItem('lifedrop_deleted_users');
      if (storedDeleted) {
        try {
          const deletedArr: string[] = JSON.parse(storedDeleted);
          if (deletedArr.some(d => d.toLowerCase() === cleanEmail || d === currentId)) {
            localStorage.removeItem('lifedrop_user');
            localStorage.removeItem('lifedrop_is_logged_in');
            localStorage.removeItem('lifedrop_active_request');
            setUser(defaultProfile);
            setIsLoggedIn(false);
            setActiveRequest(null);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('lifedrop_profile_updated'));
            showToast('❌ Account Deleted: Your account was removed by an administrator.', true);
            return;
          }
        } catch (e) {}
      }

      // Check if user was banned
      const storedBanned = localStorage.getItem('lifedrop_banned_users');
      if (storedBanned) {
        try {
          const bannedArr: string[] = JSON.parse(storedBanned);
          if (bannedArr.some(b => b.toLowerCase() === cleanEmail || b === currentId)) {
            localStorage.removeItem('lifedrop_user');
            localStorage.removeItem('lifedrop_is_logged_in');
            localStorage.removeItem('lifedrop_active_request');
            setUser(defaultProfile);
            setIsLoggedIn(false);
            setActiveRequest(null);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('lifedrop_profile_updated'));
            showToast('⛔ Account Suspended: Your account has been banned by an administrator.', true);
            return;
          }
        } catch (e) {}
      }

      // Find in server users
      const matched = usersList.find((u: any) => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uId = String(u.id || u.userId || '');
        return (cleanEmail && uEmail === cleanEmail) || (currentId && uId === currentId);
      });

      if (matched) {
        if (matched.status === 'Banned' || matched.status === 'Suspended' || matched.isBanned) {
          localStorage.removeItem('lifedrop_user');
          localStorage.removeItem('lifedrop_is_logged_in');
          localStorage.removeItem('lifedrop_active_request');
          setUser(defaultProfile);
          setIsLoggedIn(false);
          setActiveRequest(null);
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('lifedrop_profile_updated'));
          showToast('⛔ Account Suspended: Your account has been banned by an administrator.', true);
          return;
        }

        const normalizedName = matched.fullName || matched.name || currentActive.fullName;
        const normalizedPhone = matched.phone !== undefined ? matched.phone : currentActive.phone;
        const normalizedEmergency = (matched.emergencyContact || matched.emergency) !== undefined ? (matched.emergencyContact || matched.emergency) : currentActive.emergencyContact;
        const normalizedBlood = (matched.bloodGroup || matched.blood) || currentActive.bloodGroup;
        const normalizedDivision = matched.division || currentActive.division;
        const normalizedDistrict = matched.district || currentActive.district;
        const normalizedAddress = matched.address !== undefined ? matched.address : currentActive.address;
        const normalizedWeight = matched.weight !== undefined ? matched.weight : currentActive.weight;
        const normalizedSex = matched.sex || currentActive.sex;
        const normalizedVerified = matched.verified !== undefined ? Boolean(matched.verified) : (matched.status === 'Verified' || currentActive.verified);
        const normalizedStatus = matched.status || currentActive.status;
        const normalizedDonations = matched.totalDonations !== undefined ? matched.totalDonations : currentActive.totalDonations;
        const normalizedRole = matched.role || currentActive.role;
        const normalizedAvatar = matched.avatarUrl || currentActive.avatarUrl;
        const normalizedCover = matched.coverUrl || currentActive.coverUrl;

        const updatedProfile: UserProfile = {
          ...currentActive,
          fullName: normalizedName,
          phone: normalizedPhone,
          emergencyContact: normalizedEmergency,
          bloodGroup: normalizedBlood,
          division: normalizedDivision,
          district: normalizedDistrict,
          address: normalizedAddress,
          weight: normalizedWeight,
          sex: normalizedSex,
          verified: normalizedVerified,
          status: normalizedStatus,
          totalDonations: normalizedDonations,
          role: normalizedRole,
          avatarUrl: normalizedAvatar,
          coverUrl: normalizedCover,
        };

        setUser((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(updatedProfile)) {
            return updatedProfile;
          }
          return prev;
        });

        localStorage.setItem('lifedrop_user', JSON.stringify(updatedProfile));
      }
    };

    const syncCurrentUserFromSupabaseRow = (row: any) => {
      if (!row) return;
      const activeStr = localStorage.getItem('lifedrop_user');
      let currentActive: any = null;
      if (activeStr) {
        try { currentActive = JSON.parse(activeStr); } catch (e) {}
      }
      if (!currentActive || !currentActive.email) return;

      const cleanEmail = currentActive.email.toLowerCase().trim();
      const rowEmail = (row.email || '').toLowerCase().trim();
      const currentId = String(currentActive.id || currentActive.userId || '');
      const rowId = String(row.id || row.user_id || '');

      if (rowEmail === cleanEmail || (currentId && rowId === currentId)) {
        if (row.status === 'Banned' || row.status === 'Suspended') {
          localStorage.removeItem('lifedrop_user');
          localStorage.removeItem('lifedrop_is_logged_in');
          localStorage.removeItem('lifedrop_active_request');
          setUser(defaultProfile);
          setIsLoggedIn(false);
          setActiveRequest(null);
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('lifedrop_profile_updated'));
          showToast('⛔ Account Suspended: Your account has been banned by an administrator.', true);
          return;
        }

        const updatedProfile: UserProfile = {
          ...currentActive,
          fullName: row.full_name || currentActive.fullName,
          phone: row.phone !== undefined ? row.phone : currentActive.phone,
          emergencyContact: row.emergency_contact !== undefined ? row.emergency_contact : currentActive.emergencyContact,
          bloodGroup: row.blood_group || currentActive.bloodGroup,
          division: row.division || currentActive.division,
          district: row.district || currentActive.district,
          address: row.address !== undefined ? row.address : currentActive.address,
          weight: row.weight !== undefined ? row.weight : currentActive.weight,
          sex: row.sex || currentActive.sex,
          verified: row.verified !== undefined ? Boolean(row.verified) : (row.status === 'Verified' || currentActive.verified),
          status: row.status || currentActive.status,
          totalDonations: row.total_donations !== undefined ? row.total_donations : currentActive.totalDonations,
          role: row.role || currentActive.role,
          avatarUrl: row.avatar_url || currentActive.avatarUrl,
          coverUrl: row.cover_url || currentActive.coverUrl,
        };

        setUser((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(updatedProfile)) {
            return updatedProfile;
          }
          return prev;
        });

        localStorage.setItem('lifedrop_user', JSON.stringify(updatedProfile));
      }
    };

    // Load Blood Banks, Emergency Contacts, Site Config, Tickets, Blood Requests, and sync any local users directly to Server API
    const loadServerData = async () => {
      try {
        // 1. Fetch deleted & banned lists FIRST to protect against resurrection
        const [delRes, banRes] = await Promise.all([
          fetch('/api/users/deleted'),
          fetch('/api/users/banned'),
        ]);

        let deletedEmailsAndIds: string[] = [];
        let bannedEmailsAndIds: string[] = [];

        if (delRes.ok) {
          try {
            const delData = await delRes.json();
            if (Array.isArray(delData)) {
              deletedEmailsAndIds = delData.map(d => String(d).toLowerCase().trim());
              localStorage.setItem('lifedrop_deleted_users', JSON.stringify(delData));
            }
          } catch (e) {}
        }

        if (banRes.ok) {
          try {
            const banData = await banRes.json();
            if (Array.isArray(banData)) {
              bannedEmailsAndIds = banData.map(b => String(b).toLowerCase().trim());
              localStorage.setItem('lifedrop_banned_users', JSON.stringify(banData));
            }
          } catch (e) {}
        }

        // Sync local storage registered users ONLY after filtering out any deleted accounts
        const localReg = localStorage.getItem('lifedrop_registered_users');
        if (localReg) {
          try {
            const parsedReg = JSON.parse(localReg);
            if (Array.isArray(parsedReg)) {
              const cleanedReg = parsedReg.filter((u: any) => {
                if (!u) return false;
                const uEmail = (u.email || '').toLowerCase().trim();
                const uId = String(u.id || u.userId || '').trim();
                return !deletedEmailsAndIds.includes(uEmail) && !deletedEmailsAndIds.includes(uId);
              });
              localStorage.setItem('lifedrop_registered_users', JSON.stringify(cleanedReg));

              if (cleanedReg.length > 0) {
                fetch('/api/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ users: cleanedReg }),
                }).catch(() => {});
              }
            }
          } catch (e) {}
        }

        // Check if currently active user was deleted or banned
        const activeStr = localStorage.getItem('lifedrop_user');
        if (activeStr) {
          try {
            const active = JSON.parse(activeStr);
            const activeEmail = (active.email || '').toLowerCase().trim();
            const activeId = String(active.id || active.userId || '').trim();
            if (deletedEmailsAndIds.includes(activeEmail) || deletedEmailsAndIds.includes(activeId)) {
              localStorage.removeItem('lifedrop_user');
              localStorage.removeItem('lifedrop_is_logged_in');
              localStorage.removeItem('lifedrop_active_request');
              setUser(defaultProfile);
              setIsLoggedIn(false);
              setActiveRequest(null);
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new Event('lifedrop_profile_updated'));
            } else if (bannedEmailsAndIds.includes(activeEmail) || bannedEmailsAndIds.includes(activeId)) {
              localStorage.removeItem('lifedrop_user');
              localStorage.removeItem('lifedrop_is_logged_in');
              localStorage.removeItem('lifedrop_active_request');
              setUser(defaultProfile);
              setIsLoggedIn(false);
              setActiveRequest(null);
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new Event('lifedrop_profile_updated'));
            }
          } catch (e) {}
        }

        const [cfgRes, bbRes, ecRes, reqRes, tktRes, admRes, usrRes] = await Promise.all([
          fetch('/api/site-config'),
          fetch('/api/blood-banks'),
          fetch('/api/emergency-contacts'),
          fetch('/api/blood-requests'),
          fetch('/api/tickets'),
          fetch('/api/admin-accounts'),
          fetch('/api/users'),
        ]);

        if (usrRes.ok) {
          const usrData = await usrRes.json();
          if (Array.isArray(usrData)) {
            syncCurrentUserFromList(usrData);
          }
        }

        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          if (cfgData && typeof cfgData === 'object' && cfgData.companyName) {
            setSiteConfig((prev) => ({ ...prev, ...cfgData }));
          }
        }

        if (bbRes.ok) {
          const bbData = await bbRes.json();
          if (Array.isArray(bbData)) {
            setBloodBanks(bbData);
          }
        }

        if (ecRes.ok) {
          const ecData = await ecRes.json();
          if (ecData && typeof ecData === 'object') {
            setSiteConfig((prev) => ({
              ...prev,
              emergencyHotline: ecData.hotline !== undefined ? ecData.hotline : (prev.emergencyHotline || '999 / 16263'),
              emergencyContacts: Array.isArray(ecData.contacts) ? ecData.contacts : [],
            }));
          }
        }

        if (reqRes.ok) {
          const reqData = await reqRes.json();
          if (Array.isArray(reqData)) {
            setAllBloodRequests(reqData);
            const activeUserStr = localStorage.getItem('lifedrop_user');
            let currentUserId = user.id || user.userId;
            let currentUserEmail = user.email;
            if (activeUserStr) {
              try {
                const parsedU = JSON.parse(activeUserStr);
                currentUserId = parsedU.id || parsedU.userId || currentUserId;
                currentUserEmail = parsedU.email || currentUserEmail;
              } catch (e) {}
            }
            const cancelledListStr = localStorage.getItem('lifedrop_cancelled_requests');
            const cancelledList = cancelledListStr ? JSON.parse(cancelledListStr) : [];
            
            const myActive = reqData.find((r: any) => 
              r &&
              r.status === 'active' && 
              r.expiresAt > Date.now() &&
              !cancelledList.includes(r.id) &&
              ((currentUserId && (r.userId === currentUserId || r.id === currentUserId)) || 
               (currentUserEmail && r.userEmail && r.userEmail.toLowerCase() === currentUserEmail.toLowerCase()))
            );
            setActiveRequest(myActive || null);
            if (!myActive) {
              localStorage.removeItem('lifedrop_active_request');
            }
          }
        }

        if (tktRes.ok) {
          const tktData = await tktRes.json();
          if (Array.isArray(tktData)) {
            setTicketsList(tktData);
          }
        }

        if (admRes.ok) {
          const admData = await admRes.json();
          if (Array.isArray(admData) && admData.length > 0) {
            setAdminAccounts(admData);
          }
        }
      } catch (err) {
        console.warn('Error loading server data:', err);
      }
    };

    loadServerData();

    // 1. Instant Real-Time Push Listeners via Server-Sent Events (SSE)
    const unsubUsers = realtimeHub.on('users_updated', (payload) => {
      if (payload && Array.isArray(payload.users)) {
        syncCurrentUserFromList(payload.users);
      }
    });

    const unsubBanned = realtimeHub.on('banned_users_updated', (banned) => {
      if (Array.isArray(banned)) {
        localStorage.setItem('lifedrop_banned_users', JSON.stringify(banned));
        const bannedList = banned.map(b => String(b).toLowerCase().trim());
        const activeStr = localStorage.getItem('lifedrop_user');
        if (activeStr) {
          try {
            const active = JSON.parse(activeStr);
            const activeEmail = (active.email || '').toLowerCase().trim();
            const activeId = String(active.id || active.userId || '').trim();
            if (bannedList.includes(activeEmail) || bannedList.includes(activeId)) {
              localStorage.removeItem('lifedrop_user');
              localStorage.removeItem('lifedrop_is_logged_in');
              localStorage.removeItem('lifedrop_active_request');
              setUser(defaultProfile);
              setIsLoggedIn(false);
              setActiveRequest(null);
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new Event('lifedrop_profile_updated'));
              showToast('⛔ Account Suspended: Your account has been banned by an administrator.', true);
            }
          } catch (e) {}
        }
      }
    });

    const unsubDeleted = realtimeHub.on('deleted_users_updated', (deleted) => {
      if (Array.isArray(deleted)) {
        localStorage.setItem('lifedrop_deleted_users', JSON.stringify(deleted));
        const deletedList = deleted.map(d => String(d).toLowerCase().trim());

        // Sanitize local registered users
        try {
          const storedReg = localStorage.getItem('lifedrop_registered_users');
          if (storedReg) {
            const parsed = JSON.parse(storedReg);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter((u: any) => {
                const uEmail = (u.email || '').toLowerCase().trim();
                const uId = String(u.id || u.userId || '').trim();
                return !deletedList.includes(uEmail) && !deletedList.includes(uId);
              });
              localStorage.setItem('lifedrop_registered_users', JSON.stringify(clean));
            }
          }
        } catch (e) {}

        const activeStr = localStorage.getItem('lifedrop_user');
        if (activeStr) {
          try {
            const active = JSON.parse(activeStr);
            const activeEmail = (active.email || '').toLowerCase().trim();
            const activeId = String(active.id || active.userId || '').trim();
            if (deletedList.includes(activeEmail) || deletedList.includes(activeId)) {
              localStorage.removeItem('lifedrop_user');
              localStorage.removeItem('lifedrop_is_logged_in');
              localStorage.removeItem('lifedrop_active_request');
              setUser(defaultProfile);
              setIsLoggedIn(false);
              setActiveRequest(null);
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new Event('lifedrop_profile_updated'));
              showToast('❌ Account Deleted: Your account was removed by an administrator.', true);
            }
          } catch (e) {}
        }
      }
    });

    const unsubBB = realtimeHub.on('blood_banks_updated', (banks) => {
      if (Array.isArray(banks)) {
        setBloodBanks(banks);
      }
    });

    const unsubEC = realtimeHub.on('emergency_contacts_updated', (updated) => {
      if (updated && typeof updated === 'object') {
        setSiteConfig((prev) => ({
          ...prev,
          emergencyHotline: updated.hotline !== undefined ? updated.hotline : prev.emergencyHotline,
          emergencyContacts: Array.isArray(updated.contacts) ? updated.contacts : [],
        }));
      }
    });

    const unsubConfig = realtimeHub.on('site_config_updated', (newConfig) => {
      if (newConfig && typeof newConfig === 'object') {
        setSiteConfig((prev) => ({ ...prev, ...newConfig }));
      }
    });

    const unsubReq = realtimeHub.on('blood_requests_updated', (payload) => {
      if (payload && Array.isArray(payload.allRequests)) {
        setAllBloodRequests(payload.allRequests);
        const activeUserStr = localStorage.getItem('lifedrop_user');
        let currentUserId = user.id || user.userId;
        let currentUserEmail = user.email;
        if (activeUserStr) {
          try {
            const parsedU = JSON.parse(activeUserStr);
            currentUserId = parsedU.id || parsedU.userId || currentUserId;
            currentUserEmail = parsedU.email || currentUserEmail;
          } catch (e) {}
        }
        
        const cancelledListStr = localStorage.getItem('lifedrop_cancelled_requests');
        const cancelledList = cancelledListStr ? JSON.parse(cancelledListStr) : [];
        
        const active = payload.allRequests.find((r: any) => 
          r &&
          r.status === 'active' && 
          r.expiresAt > Date.now() && 
          !cancelledList.includes(r.id) &&
          ((currentUserId && (r.userId === currentUserId || r.id === currentUserId)) || 
           (currentUserEmail && r.userEmail && r.userEmail.toLowerCase() === currentUserEmail.toLowerCase()))
        );
        setActiveRequest(active || null);
        if (!active) {
          localStorage.removeItem('lifedrop_active_request');
        }
      }
    });

    const unsubTickets = realtimeHub.on('tickets_updated', (tickets) => {
      if (Array.isArray(tickets)) {
        setTicketsList(tickets);
      }
    });

    const unsubAdmins = realtimeHub.on('admin_accounts_updated', (admins) => {
      if (Array.isArray(admins)) {
        setAdminAccounts(admins);
      }
    });

    // 2. Supabase Postgres Realtime Changes Channel for Profiles
    let profilesChannel: any = null;
    if (isSupabaseConfigured) {
      profilesChannel = supabase
        .channel('realtime:auth_profiles_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
          if (payload.new) {
            syncCurrentUserFromSupabaseRow(payload.new);
          }
        })
        .subscribe();
    }

    // 3. Active Background Polling every 3 seconds as reliable fallback
    const pollInterval = setInterval(() => {
      loadServerData();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      unsubUsers();
      unsubBanned();
      unsubDeleted();
      unsubBB();
      unsubEC();
      unsubConfig();
      unsubReq();
      unsubTickets();
      unsubAdmins();
      if (profilesChannel) {
        supabase.removeChannel(profilesChannel);
      }
    };
  }, []);

  // =====================================================================
  // SUPABASE AUTH — Single Source of Truth for Sessions
  // Fires automatically on: sign-in, sign-out, token refresh, page reload
  // =====================================================================
  useEffect(() => {
    const fetchAndHydrateProfile = async (supabaseUser: any) => {
      if (!supabaseUser?.email) return;
      const cleanEmail = supabaseUser.email.toLowerCase().trim();

      // Check ban/delete lists before hydrating
      try {
        const [delRes, banRes] = await Promise.all([
          fetch('/api/users/deleted'),
          fetch('/api/users/banned'),
        ]);
        if (delRes.ok) {
          const delData = await delRes.json();
          if (Array.isArray(delData) && delData.map((d: any) => String(d).toLowerCase()).includes(cleanEmail)) {
            await supabase.auth.signOut();
            showToast('❌ Account Deleted: This account has been permanently removed by an administrator.', true);
            return;
          }
        }
        if (banRes.ok) {
          const banData = await banRes.json();
          if (Array.isArray(banData) && banData.map((b: any) => String(b).toLowerCase()).includes(cleanEmail)) {
            await supabase.auth.signOut();
            showToast('⛔ Account Suspended: Your account has been banned by an administrator.', true);
            return;
          }
        }
      } catch (e) {}

      // Fetch full profile from Supabase profiles table
      let dbProfile: any = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (data) dbProfile = data;
      } catch (err) {
        console.warn('Could not fetch profile from Supabase:', err);
      }

      // Also try public_profiles view as fallback
      if (!dbProfile) {
        try {
          const { data } = await supabase
            .from('public_profiles')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
          if (data) dbProfile = data;
        } catch (err) {}
      }

      // Try server API as additional fallback
      let serverProfile: any = null;
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const users = await res.json();
          if (Array.isArray(users)) {
            serverProfile = users.find((u: any) => (u.email || '').toLowerCase() === cleanEmail);
          }
        }
      } catch (e) {}

      const source = dbProfile || serverProfile || {};
      const generatedUserId = source.user_id || source.userId || source.id || `RD${Math.floor(100000 + Math.random() * 900000)}`;

      const hydratedUser: UserProfile = {
        ...defaultProfile,
        id: generatedUserId,
        userId: generatedUserId,
        fullName: source.full_name || source.fullName || supabaseUser.user_metadata?.full_name || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: source.phone || source.phone || '',
        emergencyContact: source.emergency_contact || source.emergencyContact || '',
        bloodGroup: source.blood_group || source.bloodGroup || 'A+',
        weight: source.weight || 70,
        sex: source.sex || 'Male',
        dob: source.dob || '',
        address: source.address || '',
        division: source.division || 'Dhaka Division',
        district: source.district || 'Dhaka',
        avatarUrl: source.avatar_url || source.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        coverUrl: source.cover_url || source.coverUrl || 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
        totalDonations: source.total_donations ?? source.totalDonations ?? 0,
        verified: source.verified ?? false,
        status: source.status || 'Active',
        rating: source.rating || 5.0,
        latitude: source.latitude,
        longitude: source.longitude,
        isLoggedIn: true,
        onlineStatus: 'Online',
        activityStatus: 'online',
      };

      setUser(hydratedUser);
      setIsLoggedIn(true);

      // Restore active request for this user from server
      try {
        const cancelledListStr = localStorage.getItem('lifedrop_cancelled_requests');
        const cancelledList = cancelledListStr ? JSON.parse(cancelledListStr) : [];
        const reqRes = await fetch('/api/blood-requests');
        if (reqRes.ok) {
          const allReqs = await reqRes.json();
          if (Array.isArray(allReqs)) {
            const myActive = allReqs.find((r: any) =>
              r &&
              r.status === 'active' &&
              r.expiresAt > Date.now() &&
              !cancelledList.includes(r.id) &&
              ((generatedUserId && (r.userId === generatedUserId)) ||
               (cleanEmail && r.userEmail && r.userEmail.toLowerCase() === cleanEmail))
            );
            setActiveRequest(myActive || null);
          }
        }
      } catch (e) {}

      // Mark online in Supabase
      supabase.from('profiles').update({ is_logged_in: true, online_status: 'Online', updated_at: new Date().toISOString() }).ilike('email', cleanEmail).then();
      supabase.from('public_profiles').update({ is_logged_in: true, online_status: 'Online', updated_at: new Date().toISOString() }).ilike('email', cleanEmail).then();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSupabaseSession(session);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          await fetchAndHydrateProfile(session.user);
        }
        // Dismiss preloader once auth state is known (whether logged in or not)
        setIsLoadingState(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(defaultProfile);
        setIsLoggedIn(false);
        setActiveRequest(null);
        localStorage.removeItem('lifedrop_active_request');
        setIsLoadingState(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [ticketsList, setTicketsList] = useState<SupportTicket[]>([]);

  const createSupportTicket = (ticketData: { category: string; subject: string; description: string }) => {
    const newTicket: SupportTicket = {
      id: `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
      category: ticketData.category,
      subject: ticketData.subject,
      description: ticketData.description,
      status: 'Open',
      createdAt: new Date().toISOString(),
    };
    setTicketsList(prev => [newTicket, ...prev]);
    fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: newTicket }),
    }).catch(err => console.warn('Failed to save ticket on server:', err));
    showToast(`Support ticket #${newTicket.id} submitted successfully!`);
  };

  // =====================================================================
  // PREFERENCE PERSISTENCE (role, sound — not auth credentials)
  // =====================================================================
  useEffect(() => {
    const configToSave = { ...siteConfig };
    delete configToSave.emergencyContacts;
    localStorage.setItem('lifedrop_site_config', JSON.stringify(configToSave));
  }, [siteConfig]);

  useEffect(() => {
    localStorage.setItem('lifedrop_active_role', activeRole);
  }, [activeRole]);

  // Sync profile changes in real time if modified by Admin or across sessions
  useEffect(() => {
    const handleSyncFromStorage = () => {
      const savedUser = localStorage.getItem('lifedrop_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && (parsed.email || parsed.id)) {
            setUser((prev) => {
              const nextVal = { ...prev, ...parsed };
              if (JSON.stringify(prev) !== JSON.stringify(nextVal)) {
                return nextVal;
              }
              return prev;
            });
          }
        } catch (e) {}
      }
      const isLoggedFlag = localStorage.getItem('lifedrop_is_logged_in') === 'true';
      setIsLoggedIn(isLoggedFlag);
    };

    window.addEventListener('storage', handleSyncFromStorage);
    window.addEventListener('lifedrop_profile_updated', handleSyncFromStorage);
    return () => {
      window.removeEventListener('storage', handleSyncFromStorage);
      window.removeEventListener('lifedrop_profile_updated', handleSyncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('lifedrop_is_logged_in', 'true');
    } else {
      localStorage.removeItem('lifedrop_is_logged_in');
    }
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('lifedrop_active_role', activeRole);
  }, [activeRole]);

  useEffect(() => {
    if (activeRequest) {
      fetch('/api/blood-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: activeRequest }),
      }).catch(err => console.warn('Failed to sync blood request to server:', err));
    }
  }, [activeRequest]);

  // Continuous Live Geolocation updates for logged in users
  useEffect(() => {
    if (!isLoggedIn || !user.email) return;

    let watchId: number | null = null;

    const handlePosSuccess = (pos: GeolocationPosition) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));

      setUser((prev) => {
        if (prev.latitude === lat && prev.longitude === lng) return prev;
        const updated = {
          ...prev,
          latitude: lat,
          longitude: lng,
          lastLocationUpdate: new Date().toISOString()
        };
        localStorage.setItem('lifedrop_user', JSON.stringify(updated));

        // Live sync coordinates to server and Supabase
        if (updated.email) {
          fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: { email: updated.email, latitude: lat, longitude: lng } }),
          }).catch(() => {});

          if (isSupabaseConfigured) {
            const coordsPayload = {
              latitude: lat,
              longitude: lng,
              updated_at: new Date().toISOString()
            };
            supabase.from('profiles').update(coordsPayload).ilike('email', updated.email.toLowerCase()).then();
            supabase.from('public_profiles').update(coordsPayload).ilike('email', updated.email.toLowerCase()).then();
          }
        }
        return updated;
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handlePosSuccess, () => {}, { enableHighAccuracy: true, timeout: 10000 });
      watchId = navigator.geolocation.watchPosition(handlePosSuccess, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 20000
      });
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isLoggedIn, user.email]);

  // Tab Visibility Listener - Ensures active background state when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const savedReq = localStorage.getItem('lifedrop_active_request');
        if (savedReq) {
          try {
            const parsed = JSON.parse(savedReq);
            if (parsed && parsed.expiresAt > Date.now()) {
              setActiveRequest(parsed);
            }
          } catch (e) {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 2. Wipe Demo Data & Restore Clean Production State
  const clearAllDemoData = () => {
    setActiveRequest(null);
    localStorage.removeItem('lifedrop_active_request');
    localStorage.setItem('lifedrop_demo_wiped', 'true');
    fetch('/api/blood-requests/clear', { method: 'POST' }).catch(() => {});
    showToast('🧹 All demo requests wiped. System restored to clean production state.');
  };

  const updateSiteConfig = (updates: Partial<SiteConfig>) => {
    setSiteConfig(prev => {
      const updated = { ...prev, ...updates };
      // Dynamically update document title for SEO
      if (updated.seoTitle) {
        document.title = updated.seoTitle;
      }
      // Dynamically update meta description
      if (updated.seoDescription !== undefined) {
        let metaDesc: HTMLMetaElement | null = document.querySelector("meta[name='description']");
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          document.getElementsByTagName('head')[0].appendChild(metaDesc);
        }
        metaDesc.content = updated.seoDescription;
      }
      // Dynamically update meta keywords
      if (updated.seoKeywords !== undefined) {
        let metaKeywords: HTMLMetaElement | null = document.querySelector("meta[name='keywords']");
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.name = 'keywords';
          document.getElementsByTagName('head')[0].appendChild(metaKeywords);
        }
        metaKeywords.content = updated.seoKeywords;
      }
      // Dynamically update OG image
      if (updated.ogImageUrl !== undefined) {
        let metaOgImage: HTMLMetaElement | null = document.querySelector("meta[property='og:image']");
        if (!metaOgImage) {
          metaOgImage = document.createElement('meta');
          metaOgImage.setAttribute('property', 'og:image');
          document.getElementsByTagName('head')[0].appendChild(metaOgImage);
        }
        metaOgImage.content = updated.ogImageUrl;
      }
      // Dynamically update favicon
      if (updated.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = updated.faviconUrl;
      }

      // Sync site config to server
      const configToSave = { ...updated };
      delete configToSave.emergencyContacts;
      fetch('/api/site-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteConfig: configToSave }),
      }).catch(err => console.warn('Failed to sync site config to server:', err));

      // Sync emergency contacts or hotline to server endpoint and Supabase if modified
      if (updates.emergencyContacts !== undefined || updates.emergencyHotline !== undefined) {
        fetch('/api/emergency-contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotline: updated.emergencyHotline,
            contacts: updated.emergencyContacts,
          }),
        }).catch(err => console.warn('Failed to sync emergency contacts to server:', err));

        if (isSupabaseConfigured) {
          (async () => {
            try {
              // Sync hotline and site config to site_settings table
              await supabase.from('site_settings').upsert({
                id: 'global_config',
                company_name: updated.companyName,
                tagline: updated.tagline,
                logo_url: updated.logoUrl || null,
                favicon_url: updated.faviconUrl || null,
                og_image_url: updated.ogImageUrl || null,
                seo_title: updated.seoTitle,
                seo_description: updated.seoDescription,
                seo_keywords: updated.seoKeywords,
                analytics_id: updated.analyticsId,
                meta_pixel_id: updated.metaPixelId || null,
                logo_display_mode: updated.logoDisplayMode || 'both',
                logo_symbol: updated.logoSymbol || '🩸',
                emergency_hotline: updated.emergencyHotline || '999 / 16263',
                updated_at: new Date().toISOString()
              });

              if (updates.emergencyContacts !== undefined) {
                await supabase.from('emergency_contacts').delete().neq('id', '___non_existent___');
                if (Array.isArray(updated.emergencyContacts) && updated.emergencyContacts.length > 0) {
                  const rows = updated.emergencyContacts.map(ec => ({
                    id: ec.id,
                    title: ec.title,
                    number: ec.number,
                    tel: ec.tel || `tel:${ec.number.replace(/[^0-9+]/g, '')}`,
                    icon: ec.icon || '📞',
                    category: ec.category || 'Medical',
                    updated_at: new Date().toISOString()
                  }));
                  await supabase.from('emergency_contacts').insert(rows);
                }
              }
            } catch (sbErr) {
              console.warn('Supabase emergency_contacts sync error:', sbErr);
            }
          })();
        }
      }
      return updated;
    });
    showToast('Site Configuration updated by Admin.');
  };

  const adminOverrideActiveRequest = (updatedReq: Partial<BloodRequest> | null) => {
    if (updatedReq === null) {
      setActiveRequest(null);
      localStorage.removeItem('lifedrop_active_request');
      fetch('/api/blood-requests/clear', { method: 'POST' }).catch(() => {});
      showToast('Admin cleared/canceled active user request.');
    } else if (updatedReq.status === 'cancelled' || updatedReq.status === 'fulfilled') {
      setActiveRequest(null);
      localStorage.removeItem('lifedrop_active_request');
      if (activeRequest) {
        fetch('/api/blood-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request: { ...activeRequest, ...updatedReq } }),
        }).catch(() => {});
      }
      showToast(`Admin updated request status to ${updatedReq.status}.`);
    } else if (activeRequest) {
      const merged = { ...activeRequest, ...updatedReq };
      setActiveRequest(merged);
      localStorage.setItem('lifedrop_active_request', JSON.stringify(merged));
      fetch('/api/blood-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: merged }),
      }).catch(() => {});
      showToast('Admin overridden active blood request parameters.');
    } else {
      const newOverrideReq: BloodRequest = {
        id: `req-admin-${Date.now()}`,
        bloodType: 'A+',
        hospitalName: 'Square Hospital',
        hospitalLocation: 'Panthapath, Dhaka',
        qtyWhole: 2,
        qtyPlatelets: 0,
        qtyPlasma: 0,
        qtyDoubleRed: 0,
        reasonNeeded: 'Admin created emergency broadcast',
        neededInHours: 4,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        expiresAt: Date.now() + 4 * 60 * 60 * 1000,
        status: 'active',
        matchStage: 'broadcast',
        ...updatedReq
      };
      setActiveRequest(newOverrideReq);
      localStorage.setItem('lifedrop_active_request', JSON.stringify(newOverrideReq));
      fetch('/api/blood-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: newOverrideReq }),
      }).catch(() => {});
      showToast('Admin force-created active emergency broadcast.');
    }
  };

  // Fallback safety: if onAuthStateChange takes >3s, stop loading anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingState(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const triggerLoading = (durationMs = 800, msg = "Preparing life-saving connections…") => {
    setLoadingMessage(msg);
    setIsLoadingState(true);
    setTimeout(() => {
      setIsLoadingState(false);
    }, durationMs);
  };

  const setIsLoading = (loading: boolean, msg = "Preparing life-saving connections…") => {
    setLoadingMessage(msg);
    setIsLoadingState(loading);
  };

  const setActiveTab = (tab: ActiveTab) => {
    if (tab !== activeTab) {
      triggerLoading(600, "Loading view…");
      setActiveTabState(tab);
      try {
        localStorage.setItem('lifedrop_active_tab', tab);
        window.history.pushState({}, '', '/' + tab);
      } catch (e) {
        window.location.hash = '/' + tab;
      }
    }
  };

  const defaultAdminAccounts = [
    {
      id: 'adm-003',
      username: 'Siam Bhai (Super Admin)',
      email: 'kfalifalsiam540@gmail.com',
      password: 'SiamBhai4265#',
      role: 'Super Admin',
      createdAt: '2026-01-01'
    },
    {
      id: 'adm-001',
      username: 'Samin Yeasir Hasan',
      email: 'saminyeasirhasan.ruet@gmail.com',
      password: 'admin123',
      role: 'Super Admin',
      createdAt: '2026-01-01'
    },
    {
      id: 'adm-002',
      username: 'System Administrator',
      email: 'admin@lifedrop.org',
      password: 'admin123',
      role: 'Super Admin',
      createdAt: '2026-01-01'
    }
  ];

  const [adminAccounts, setAdminAccounts] = useState<Array<{
    id: string;
    username: string;
    email: string;
    password?: string;
    role: string;
    createdAt: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem('lifedrop_admin_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const exists = parsed.some((a: any) => a.email && a.email.toLowerCase() === 'kfalifalsiam540@gmail.com');
          if (!exists) {
            const updated = [defaultAdminAccounts[0], ...parsed];
            localStorage.setItem('lifedrop_admin_accounts', JSON.stringify(updated));
            return updated;
          }
          return parsed;
        }
      }
    } catch (e) {}
    return defaultAdminAccounts;
  });

  // Restore saved admin session if available
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('lifedrop_admin_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.email) {
          setAdminUser(parsed);
          setIsAdminLoggedIn(true);
        }
      }
    } catch (e) {}
  }, []);

  const registerAdminAccount = (newAdmin: { username: string; email: string; password: string; role?: string }): boolean => {
    if (!newAdmin.email || !newAdmin.password) {
      showToast('Email and Password are required for admin registration.', true);
      return false;
    }
    const cleanEmail = newAdmin.email.toLowerCase().trim();
    const existing = adminAccounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      showToast(`An admin account with email ${cleanEmail} already exists.`, true);
      return false;
    }
    const created = {
      id: 'adm-' + Math.floor(1000 + Math.random() * 9000),
      username: newAdmin.username || cleanEmail.split('@')[0],
      email: cleanEmail,
      password: newAdmin.password,
      role: newAdmin.role || 'Operating Admin',
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updatedList = [created, ...adminAccounts];
    setAdminAccounts(updatedList);
    fetch('/api/admin-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminAccounts: updatedList }),
    }).catch(err => console.warn('Failed to sync admin accounts to server:', err));

    if (isSupabaseConfigured) {
      supabase.from('profiles').upsert({
        id: crypto.randomUUID(),
        user_id: created.id,
        full_name: created.username,
        email: cleanEmail,
        status: 'Admin',
        verified: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' }).then();
    }

    showToast(`Real Operating Admin account created for ${created.username}!`);
    return true;
  };

  const removeAdminAccount = (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const updatedList = adminAccounts.filter(a => a.email.toLowerCase() !== cleanEmail);
    setAdminAccounts(updatedList);
    fetch('/api/admin-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminAccounts: updatedList }),
    }).catch(err => console.warn('Failed to sync admin accounts to server:', err));
    showToast(`Admin account ${email} removed.`);
  };

  const loginAdmin = (emailOrUser: string, pass: string): boolean => {
    const cleanInput = emailOrUser.toLowerCase().trim();

    // Check against registered admin accounts ONLY
    const account = adminAccounts.find(
      a => a.email.toLowerCase() === cleanInput || a.username.toLowerCase() === cleanInput
    );

    if (account) {
      if (account.password && account.password !== pass) {
        showToast('Incorrect password for admin account.', true);
        return false;
      }

      const adminData: AdminUser = {
        id: account.id,
        username: account.username,
        email: account.email,
        role: account.role || 'Super Admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setIsAdminLoggedIn(true);
      setAdminUser(adminData);
      localStorage.setItem('lifedrop_admin_session', JSON.stringify(adminData));
      showToast(`Welcome back, ${account.username} (${account.role})!`);
      setActiveTab('admin');
      return true;
    }

    showToast('Unauthorized admin login attempt. Account not registered.', true);
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
    setAdminUser(null);
    localStorage.removeItem('lifedrop_admin_session');
    showToast('Admin session logged out.');
    setActiveTab('admin/login');
  };

  // URL route & hash validation listener (Show 404 for unknown pages/routes)
  useEffect(() => {
    const validTabs: ActiveTab[] = [
      'dashboard',
      'stats',
      'bloodbank',
      'emergency',
      'donorCard',
      'supportDev',
      'supportTickets',
      'profile',
      'admin',
      'admin/login'
    ];

    const checkCurrentRoute = () => {
      const rawPathname = window.location.pathname.replace(/^\//, '').trim().toLowerCase();
      const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();

      // Determine requested path/route
      const requestedRoute = rawPathname || hash;

      // If root path or empty, default to dashboard
      if (!requestedRoute || requestedRoute === '' || requestedRoute === 'index.html') {
        setActiveTabState('dashboard');
        return;
      }

      if (validTabs.includes(requestedRoute as ActiveTab)) {
        setActiveTabState(requestedRoute as ActiveTab);
      } else {
        // Unknown route / file requested by browser -> trigger 404 Page Not Found
        setActiveTabState('notFound');
      }
    };

    checkCurrentRoute();
    window.addEventListener('popstate', checkCurrentRoute);
    window.addEventListener('hashchange', checkCurrentRoute);
    return () => {
      window.removeEventListener('popstate', checkCurrentRoute);
      window.removeEventListener('hashchange', checkCurrentRoute);
    };
  }, []);

  // Listen to Supabase Auth state if configured
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true);
        localStorage.setItem('lifedrop_is_logged_in', 'true');
        setUser((prev) => ({
          ...prev,
          id: session.user.id,
          email: session.user.email || prev.email,
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || prev.fullName,
          isLoggedIn: true,
        }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        localStorage.setItem('lifedrop_is_logged_in', 'true');
        setUser((prev) => ({
          ...prev,
          id: session.user.id,
          email: session.user.email || prev.email,
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || prev.fullName,
          isLoggedIn: true,
        }));
      } else {
        // Only set logged out if there is no saved local session
        const hasLocalSession = localStorage.getItem('lifedrop_is_logged_in') === 'true';
        const savedUser = localStorage.getItem('lifedrop_user');
        if (!hasLocalSession && !savedUser) {
          setIsLoggedIn(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (message: string, isError = false) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, isError }]);

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const promptRoleShift = (targetRole: UserRole) => {
    if (activeRole === targetRole) return;
    setPendingRoleShift(targetRole);
  };

  const confirmRoleShift = () => {
    if (!pendingRoleShift) return;
    const nextRole = pendingRoleShift;

    if (activeRole === 'Receiver' && activeRequest) {
      setActiveRequest(null);
      showToast('Previous active blood request cancelled on role shift.', true);
    }

    setActiveRole(nextRole);
    setPendingRoleShift(null);

    setUser((prev) => {
      const updated = { ...prev, activeRole: nextRole, role: nextRole };
      localStorage.setItem('lifedrop_user', JSON.stringify(updated));
      localStorage.setItem('lifedrop_active_role', nextRole);
      
      try {
        const stored = localStorage.getItem('lifedrop_registered_users');
        let list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((u: any) => (u.email && updated.email && u.email.toLowerCase() === updated.email.toLowerCase()) || u.id === updated.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], activeRole: nextRole, role: nextRole };
          localStorage.setItem('lifedrop_registered_users', JSON.stringify(list));
        }
      } catch (e) {}

      syncProfileToSupabase(updated);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('lifedrop_profile_updated'));
      return updated;
    });

    showToast(`Role Shifted: Operating as ${nextRole}.`);
  };

  const cancelRoleShift = () => {
    setPendingRoleShift(null);
  };

  // Handle Tab Close - Automatically mark user as offline to instantly wipe them from active requests
  useEffect(() => {
    if (!isLoggedIn || !user || !user.id) return;
    
    const handleBeforeUnload = () => {
      const payload = JSON.stringify({ userId: user.id || user.userId, userEmail: user.email });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/users/offline', payload);
      } else {
        fetch('/api/users/offline', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user.id, user.userId, user.email, isLoggedIn]);

  const toggleActivityStatus = () => {
    const next = activityStatus === 'online' ? 'offline' : 'online';
    const onlineText = next === 'online' ? 'Online' : 'Offline';
    setActivityStatus(next);

    setUser((prev) => {
      const updated = { ...prev, activityStatus: next, onlineStatus: onlineText };
      localStorage.setItem('lifedrop_user', JSON.stringify(updated));

      try {
        const stored = localStorage.getItem('lifedrop_registered_users');
        let list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((u: any) => (u.email && updated.email && u.email.toLowerCase() === updated.email.toLowerCase()) || u.id === updated.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], activityStatus: next, onlineStatus: onlineText };
          localStorage.setItem('lifedrop_registered_users', JSON.stringify(list));
        }
      } catch (e) {}

      syncProfileToSupabase(updated);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('lifedrop_profile_updated'));
      return updated;
    });

    if (next === 'offline') {
      showToast('Status set to Offline. Incoming requests will auto-decline.', true);
      
      // Dynamic Match Removal: If Donor goes offline, instantly remove them from any broadcast they haven't accepted yet
      if (user.role === 'Donor') {
        setAllBloodRequests(prevReqs => {
          let modified = false;
          const updatedReqs = prevReqs.map(req => {
            if (req.status === 'active') {
              const alreadyMatched = req.matchedDonors?.find(d => 
                d.id === user.id || 
                d.id === user.userId || 
                (user.email && (d.id === user.email || d.email === user.email))
              );
              if (alreadyMatched) {
                modified = true;
                const updatedReq = {
                  ...req,
                  matchedDonors: req.matchedDonors.filter(d => 
                    d.id !== user.id && 
                    d.id !== user.userId &&
                    !(user.email && (d.id === user.email || d.email === user.email))
                  )
                };
                setTimeout(() => syncRequestToBackend(updatedReq), 0);
                return updatedReq;
              }
            }
            return req;
          });
          
          if (modified) {
            setActiveRequest(currActive => {
              if (currActive) {
                const matchingUpdated = updatedReqs.find(r => r.id === currActive.id);
                if (matchingUpdated) return matchingUpdated;
              }
              return currActive;
            });
            return updatedReqs;
          }
          return prevReqs;
        });
      }
    } else {
      showToast('Status set to Online. You are visible on the donor radar!');

      // Dynamic Matching: If this user is a Donor, add them to any active compatible requests
      if (user.role === 'Donor') {
        const currentLat = user.latitude;
        const currentLon = user.longitude;
        
        setAllBloodRequests(prevReqs => {
          let modified = false;
          const updatedReqs = prevReqs.map(req => {
            if (req.status === 'active' && req.expiresAt > Date.now()) {
              if (isBloodCompatible(user.bloodGroup || 'A+', req.bloodType)) {
                const alreadyMatched = req.matchedDonors?.find(d => d.id === (user.id || user.userId));
                if (!alreadyMatched) {
                  modified = true;
                  let distance = 2.5;
                  if (currentLat && currentLon && req.latitude && req.longitude) {
                    const R = 6371;
                    const dLat = ((req.latitude - currentLat) * Math.PI) / 180;
                    const dLon = ((req.longitude - currentLon) * Math.PI) / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((currentLat * Math.PI) / 180) * Math.cos((req.latitude * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
                  }
                  const newMatchedDonor = {
                    id: user.id || user.userId,
                    name: user.fullName || user.name || 'Anonymous Donor',
                    avatar: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                    distanceKm: distance,
                    locationName: user.address || user.district || 'Nearby',
                    bloodGroup: user.bloodGroup || 'A+',
                    status: 'In 25km Zone', 
                    rating: user.rating || 5.0,
                    totalDonations: user.totalDonations || 0,
                    phone: user.phone || 'Hidden',
                    whatsappNumber: user.whatsappNumber || user.phone || 'Hidden',
                    emergencyContact: user.emergencyContact || user.phone || 'Hidden',
                    lastActive: 'Just now',
                    age: user.dob ? Math.floor((Date.now() - new Date(user.dob).getTime()) / 31557600000) : 25,
                    weight: user.weight || 65,
                    sex: user.sex || 'Unspecified',
                    lastDonated: user.lastDonatedDate || 'N/A',
                    isVerified: user.verified || false
                  };
                  
                  const updatedReq = {
                    ...req,
                    matchedDonors: [...(req.matchedDonors || []), newMatchedDonor]
                  };
                  
                  setTimeout(() => syncRequestToBackend(updatedReq), 0);
                  return updatedReq;
                }
              }
            }
            return req;
          });
          
          if (modified) {
            setActiveRequest(currActive => {
              if (currActive) {
                const matchingUpdated = updatedReqs.find(r => r.id === currActive.id);
                if (matchingUpdated) return matchingUpdated;
              }
              return currActive;
            });
            return updatedReqs;
          }
          return prevReqs;
        });
      }
    }
  };

  const syncProfileToSupabase = async (profileData: UserProfile) => {
    if (profileData && profileData.email) {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: profileData }),
      }).catch(err => console.warn('Server user sync error:', err));
    }

    if (!isSupabaseConfigured || !profileData.email) return;
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validId = (profileData.id && uuidRegex.test(profileData.id)) ? profileData.id : crypto.randomUUID();
      const payload = {
        id: validId,
        user_id: profileData.userId || profileData.id || `RD${Math.floor(100000 + Math.random() * 900000)}`,
        full_name: profileData.fullName || '',
        email: profileData.email.toLowerCase(),
        phone: profileData.phone || '',
        emergency_contact: profileData.emergencyContact || '',
        address: profileData.address || '',
        division: profileData.division || 'Dhaka Division',
        district: profileData.district || 'Dhaka',
        blood_group: profileData.bloodGroup || 'A+',
        weight: profileData.weight || 70,
        sex: profileData.sex || 'Male',
        dob: profileData.dob || '1998-05-15',
        role: profileData.activeRole || profileData.role || 'Donor',
        online_status: profileData.onlineStatus || (profileData.activityStatus === 'offline' ? 'Offline' : 'Online'),
        is_logged_in: profileData.isLoggedIn !== undefined ? profileData.isLoggedIn : true,
        latitude: profileData.latitude !== undefined ? profileData.latitude : null,
        longitude: profileData.longitude !== undefined ? profileData.longitude : null,
        last_donated_at: profileData.lastDonatedAt || (profileData.lastDonatedDate ? new Date(profileData.lastDonatedDate).toISOString() : null),
        avatar_url: profileData.avatarUrl || '',
        cover_url: profileData.coverUrl || '',
        total_donations: profileData.totalDonations || 0,
        verified: profileData.verified || false,
        status: profileData.status || 'Active',
        rating: profileData.rating || 5.0,
        updated_at: new Date().toISOString(),
      };

      const [resProfiles, resPublic] = await Promise.allSettled([
        supabase.from('profiles').upsert(payload, { onConflict: 'email' }),
        supabase.from('public_profiles').upsert(payload, { onConflict: 'email' })
      ]);

      if (resProfiles.status === 'rejected') {
        console.warn('Supabase profiles upsert warning:', resProfiles.reason);
      }
      if (resPublic.status === 'rejected') {
        console.warn('Supabase public_profiles upsert warning:', resPublic.reason);
      }
    } catch (err) {
      console.warn('Supabase profiles sync error:', err);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };

      // Update in localStorage registered users
      try {
        const stored = localStorage.getItem('lifedrop_registered_users');
        let list = stored ? JSON.parse(stored) : [];
        const index = list.findIndex(
          (u: any) => (u.email && updated.email && u.email.toLowerCase() === updated.email.toLowerCase()) || u.id === updated.id
        );
        if (index >= 0) {
          list[index] = { ...list[index], ...updated };
        } else {
          list.unshift(updated);
        }
        localStorage.setItem('lifedrop_registered_users', JSON.stringify(list));
      } catch (e) {}

      localStorage.setItem('lifedrop_user', JSON.stringify(updated));
      syncProfileToSupabase(updated);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('lifedrop_profile_updated'));
      return updated;
    });
    showToast('Profile updated successfully!');
  };

  // =====================================================================
  // loginMock — now a thin shim. onAuthStateChange handles actual session.
  // =====================================================================
  const loginMock = async (email: string, _name?: string, _extraProfile?: Partial<UserProfile>) => {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    if (!cleanEmail) return;
    // If there's already a Supabase session for this email, just close the modal.
    // The onAuthStateChange listener handles all profile hydration.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && session.user.email?.toLowerCase() === cleanEmail) {
      closeAuthModal();
    }
  };

  const logout = async () => {
    const currentEmail = user.email ? user.email.toLowerCase() : null;

    if (currentEmail) {
      const offlinePayload = {
        is_logged_in: false,
        online_status: 'Offline',
        updated_at: new Date().toISOString()
      };
      supabase.from('public_profiles').update(offlinePayload).ilike('email', currentEmail).then();
      supabase.from('profiles').update(offlinePayload).ilike('email', currentEmail).then();

      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { email: currentEmail, isLoggedIn: false, onlineStatus: 'Offline' } }),
      }).catch(() => {});
    }

    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT event automatically clears user, isLoggedIn, activeRequest
    showToast('Logged out successfully.', true);
  };

  const createRequest = async (reqData: {
    bloodType: any;
    hospitalName: string;
    hospitalLocation: string;
    latitude?: number;
    longitude?: number;
    qtyWhole: number;
    qtyPlatelets: number;
    qtyPlasma: number;
    qtyDoubleRed: number;
    reasonNeeded: string;
    neededInHours: number;
  }) => {
    let initialMatchedDonors: any[] = [];
    const reqLat = reqData.latitude || user.latitude;
    const reqLon = reqData.longitude || user.longitude;

    if (isSupabaseConfigured) {
      try {
        const { data: dbUsers, error } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('online_status', 'Online')
          .eq('role', 'Donor');

        if (!error && dbUsers && dbUsers.length > 0) {
          initialMatchedDonors = dbUsers
            .filter((u: any) => 
              u.email?.toLowerCase() !== user.email?.toLowerCase() &&
              isBloodCompatible(u.blood_group || 'A+', reqData.bloodType)
            )
            .map((u: any) => {
              let distance = 2.5;
              if (reqLat && reqLon && u.latitude && u.longitude) {
                const R = 6371;
                const dLat = ((u.latitude - reqLat) * Math.PI) / 180;
                const dLon = ((u.longitude - reqLon) * Math.PI) / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((reqLat * Math.PI) / 180) * Math.cos((u.latitude * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
              }
              return {
                id: u.id || u.email,
                name: u.full_name || 'Anonymous Donor',
                avatar: u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                distanceKm: distance,
                locationName: u.district || 'Nearby',
                bloodGroup: u.blood_group || 'A+',
                status: 'In 25km Zone',
                rating: u.rating || 5.0,
                totalDonations: u.total_donations || 0,
                phone: u.phone || 'Hidden',
                whatsappNumber: u.whatsapp_number || u.phone || 'Hidden',
                emergencyContact: u.emergency_contact || u.phone || 'Hidden',
                lastActive: 'Just now',
                age: u.age || 25,
                weight: u.weight || 65,
                sex: u.gender || 'Unspecified',
                lastDonated: u.last_donated_date || 'N/A',
                isVerified: u.is_verified || false
              };
            });
        }
      } catch (e) {
        console.warn('Failed to fetch from supabase', e);
      }
    }

    if (initialMatchedDonors.length === 0) {
      try {
        let usersList: any[] = [];
        try {
          const apiRes = await fetch('/api/users');
          if (apiRes.ok) {
            usersList = await apiRes.json();
            if (Array.isArray(usersList)) {
              localStorage.setItem('lifedrop_registered_users', JSON.stringify(usersList));
            }
          }
        } catch (err) {
          console.warn('Failed to fetch from /api/users, falling back to local storage');
        }

        if (!usersList || usersList.length === 0) {
          const storedUsers = localStorage.getItem('lifedrop_registered_users');
          if (storedUsers) {
            usersList = JSON.parse(storedUsers);
          }
        }

        if (Array.isArray(usersList)) {
          initialMatchedDonors = usersList
            .filter((u: any) => 
              u.id !== (user.id || user.userId) && 
              (u.role === 'Donor' || u.activeRole === 'Donor') &&
              (u.activityStatus === 'online' || u.onlineStatus === 'Online') && 
              (u.isLoggedIn === true || u.loginState === 'Logged In') &&
              isBloodCompatible(u.bloodGroup || 'A+', reqData.bloodType)
            )
            .map((u: any) => {
              let distance = 2.5;
              if (reqLat && reqLon && u.latitude && u.longitude) {
                const R = 6371;
                const dLat = ((u.latitude - reqLat) * Math.PI) / 180;
                const dLon = ((u.longitude - reqLon) * Math.PI) / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((reqLat * Math.PI) / 180) * Math.cos((u.latitude * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
              }

              return {
                id: u.id || u.userId,
                name: u.fullName || u.name || 'Anonymous Donor',
                avatar: u.avatarUrl || u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                distanceKm: distance,
                locationName: u.address || u.district || u.locationName || 'Nearby',
                bloodGroup: u.bloodGroup || 'A+',
                status: 'In 25km Zone', 
                rating: u.rating || 5.0,
                totalDonations: u.totalDonations || 0,
                phone: u.phone || 'Hidden',
                whatsappNumber: u.whatsappNumber || u.phone || 'Hidden',
                emergencyContact: u.emergencyContact || u.phone || 'Hidden',
                lastActive: 'Just now',
                age: u.dob ? Math.floor((Date.now() - new Date(u.dob).getTime()) / 31557600000) : (u.age || 25),
                weight: u.weight || 65,
                sex: u.sex || 'Unspecified',
                lastDonated: u.lastDonatedDate || 'N/A',
                isVerified: u.isVerified || false
              };
            });
        }
      } catch (e) {
        console.warn('Failed to parse registered users for initial matching', e);
      }
    }

    const newReq: BloodRequest = {
      id: 'req-' + Math.floor(Math.random() * 89999 + 10000),
      userId: user.id || user.userId,
      userEmail: user.email,
      userName: user.fullName || 'Anonymous Receiver',
      userPhone: user.phone || 'Hidden',
      userWhatsapp: user.whatsappNumber || user.phone || 'Hidden',
      userEmergencyContact: user.emergencyContact || 'Hidden',
      ...reqData,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + reqData.neededInHours * 3600 * 1000,
      status: 'active',
      matchStage: 'broadcast',
      matchedDonors: initialMatchedDonors
    } as any;

    localStorage.setItem('lifedrop_active_request', JSON.stringify(newReq));
    setActiveRequest(newReq);

    fetch('/api/blood-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: newReq }),
    }).catch(err => console.warn('Failed to sync blood request to server:', err));

    if (isSupabaseConfigured) {
      supabase.from('blood_requests').upsert({
        id: newReq.id,
        user_id: user.id || user.userId,
        blood_type: newReq.bloodType,
        hospital_name: newReq.hospitalName,
        hospital_location: newReq.hospitalLocation,
        latitude: newReq.latitude || user.latitude || null,
        longitude: newReq.longitude || user.longitude || null,
        qty_whole: newReq.qtyWhole,
        qty_platelets: newReq.qtyPlatelets,
        qty_plasma: newReq.qtyPlasma,
        qty_double_red: newReq.qtyDoubleRed,
        reason_needed: newReq.reasonNeeded,
        needed_in_hours: newReq.neededInHours,
        status: 'active',
        created_at: newReq.createdAt,
        expires_at: new Date(newReq.expiresAt).toISOString(),
        updated_at: new Date().toISOString()
      }).then();
    }

    try {
      const histStr = localStorage.getItem('lifedrop_activity_history');
      const histList = histStr ? JSON.parse(histStr) : [];
      const newEntry = {
        id: `req-${newReq.id}`,
        type: 'Emergency Blood Broadcast',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        hospitalName: newReq.hospitalName,
        hospitalAddress: newReq.hospitalLocation,
        bloodType: newReq.bloodType,
        category: 'Emergency 25km Broadcast',
        status: 'Active',
        notes: `Needed in ${newReq.neededInHours}h - Reason: ${newReq.reasonNeeded}`,
        createdAt: new Date().toISOString()
      };
      const updated = [newEntry, ...histList.filter((h: any) => h.id !== newEntry.id)];
      localStorage.setItem('lifedrop_activity_history', JSON.stringify(updated));
      window.dispatchEvent(new Event('lifedrop_history_updated'));
    } catch (e) {}

    showToast('🚨 Emergency Blood Request broadcasted! 25km Radar actively scanning for online donors.');
  };

  const cancelRequest = (reason: string) => {
    const finalReason = reason || 'Cancelled by requester';

    localStorage.removeItem('lifedrop_active_request');

    if (activeRequest) {
      const reqToCancel: BloodRequest = {
        ...activeRequest,
        status: 'cancelled',
        cancelReason: finalReason,
        expiresAt: Date.now(),
      };

      fetch('/api/blood-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: reqToCancel }),
      }).catch(err => console.warn('Failed to sync request cancellation to server:', err));

      if (isSupabaseConfigured) {
        supabase.from('blood_requests').upsert({
          id: reqToCancel.id,
          user_id: user.id || user.userId,
          blood_type: reqToCancel.bloodType,
          hospital_name: reqToCancel.hospitalName,
          hospital_location: reqToCancel.hospitalLocation,
          status: 'cancelled',
          cancel_reason: finalReason,
          updated_at: new Date().toISOString()
        }).then();
      }

      // Add to cancelled list so mock server doesn't snap it back
      try {
        const cancelledStr = localStorage.getItem('lifedrop_cancelled_requests');
        const cancelledList = cancelledStr ? JSON.parse(cancelledStr) : [];
        if (!cancelledList.includes(reqToCancel.id)) {
          cancelledList.push(reqToCancel.id);
          localStorage.setItem('lifedrop_cancelled_requests', JSON.stringify(cancelledList));
        }
      } catch (e) {}

      // Calculate broadcast duration
      let durationText = '';
      try {
        const createdTime = reqToCancel.createdAt ? new Date(reqToCancel.createdAt).getTime() : Date.now() - 3600000;
        const durationMs = Date.now() - createdTime;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const mins = Math.floor((durationMs / (1000 * 60)) % 60);
        durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        if (durationText === '0m') durationText = '< 1m';
      } catch (e) {
        durationText = 'Unknown duration';
      }

      const isFoundDonor = finalReason.includes('FOUND DONOR');

      try {
        const histStr = localStorage.getItem('lifedrop_activity_history');
        const histList = histStr ? JSON.parse(histStr) : [];
        const newEntry = {
          id: `req-${reqToCancel.id}-${Date.now()}`,
          type: isFoundDonor ? 'Blood Request (Fulfilled)' : 'Blood Request (Cancelled)',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          hospitalName: reqToCancel.hospitalName,
          hospitalAddress: reqToCancel.hospitalLocation,
          bloodType: reqToCancel.bloodType,
          category: 'Emergency Broadcast',
          status: isFoundDonor ? 'Fulfilled' : 'Cancelled',
          notes: isFoundDonor 
            ? `Fulfilled! 🌟 Broadcast was active for: ${durationText}.` 
            : `Reason: ${finalReason} (Active for: ${durationText})`,
          createdAt: new Date().toISOString()
        };
        const updated = [newEntry, ...histList.filter((h: any) => h.id !== newEntry.id)];
        localStorage.setItem('lifedrop_activity_history', JSON.stringify(updated));
        window.dispatchEvent(new Event('lifedrop_history_updated'));
      } catch (e) {}
    }

    setActiveRequest(null);
    showToast(`Broadcast cancelled. Reason: "${finalReason}"`);
  };

  const expressDonorInterest = (targetDonorId?: string) => {
    if (!activeRequest) return;
    const donorId = targetDonorId || 'donor-1';
    setActiveRequest((prev) => {
      if (!prev) return null;
      const updatedDonors = (prev.matchedDonors || []).map((d) =>
        d.id === donorId ? { ...d, hasExpressedInterest: true, status: 'Accepted' as const } : d
      );
      return {
        ...prev,
        matchStage: 'donor_interested',
        selectedDonorId: donorId,
        matchedDonors: updatedDonors,
      };
    });
    showToast('Interest Registered! Active update section displayed at top of Live Donor Stream.');
  };

  const requestSpecificDonor = (requestId: string, targetDonorId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;

    const existingDonors = targetReq.matchedDonors || [];
    const updatedDonors = existingDonors.map(d => 
      d.id === targetDonorId ? { ...d, status: 'Notified' as const } : d
    );

    const updatedReq: BloodRequest = {
      ...targetReq,
      matchedDonors: updatedDonors,
    };

    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    setActiveRequest(prev => prev?.id === requestId ? updatedReq : prev);
    syncRequestToBackend(updatedReq);
    showToast('Donor Requested! Waiting for them to accept...');
  };

  const acceptBloodRequest = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;

    let distance = 2.5;
    if (user.latitude && user.longitude && targetReq.latitude && targetReq.longitude) {
      const R = 6371; 
      const dLat = ((targetReq.latitude - user.latitude) * Math.PI) / 180;
      const dLon = ((targetReq.longitude - user.longitude) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((user.latitude * Math.PI) / 180) * Math.cos((targetReq.latitude * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
    }

    const currentUserId = user.id || user.userId;
    const existingDonors = targetReq.matchedDonors || [];
    
    // Check if donor is already in matchedDonors (from the Receiver's list)
    const isAlreadyMatched = existingDonors.some(d => d.id === currentUserId);

    let updatedDonors;
    if (isAlreadyMatched) {
      updatedDonors = existingDonors.map(d => 
        d.id === currentUserId ? { ...d, status: 'Accepted' as const, hasExpressedInterest: true } : d
      );
    } else {
      const donorInfo = {
        id: currentUserId,
        name: user.fullName || 'Anonymous Donor',
        avatar: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        distanceKm: distance,
        locationName: user.address || user.district || 'Nearby',
        bloodGroup: user.bloodGroup || 'A+',
        status: 'Accepted' as const,
        rating: user.rating || 5.0,
        totalDonations: user.totalDonations || 0,
        phone: user.phone || 'Hidden',
        lastActive: 'Just now',
        hasExpressedInterest: true
      };
      updatedDonors = [...existingDonors, donorInfo];
    }

    const updatedReq: BloodRequest = {
      ...targetReq,
      matchedDonors: updatedDonors,
      matchStage: 'donor_interested'
    };

    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    setActiveRequest(prev => prev?.id === requestId ? updatedReq : prev);
    syncRequestToBackend(updatedReq);
    showToast('Interest Registered! Receiver has been notified.');
  };

  const declineBloodRequest = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;

    const currentUserId = user.id || user.userId;
    const existingDonors = targetReq.matchedDonors || [];
    
    // Set status to Declined instead of removing them
    const updatedDonors = existingDonors.map(d => 
      d.id === currentUserId ? { ...d, status: 'Declined' } : d
    );

    const updatedReq: BloodRequest = {
      ...targetReq,
      matchedDonors: updatedDonors,
    };

    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    setActiveRequest(prev => prev?.id === requestId ? updatedReq : prev);
    syncRequestToBackend(updatedReq);
  };


  const syncRequestToBackend = (req: BloodRequest) => {
    fetch('/api/blood-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: req }),
    }).catch(err => console.warn('Failed to sync blood request to server:', err));

    if (isSupabaseConfigured) {
      supabase.from('blood_requests').upsert({
        id: req.id,
        user_id: req.userId,
        blood_type: req.bloodType,
        hospital_name: req.hospitalName,
        hospital_location: req.hospitalLocation,
        latitude: req.latitude,
        longitude: req.longitude,
        qty_whole: req.qtyWhole,
        qty_platelets: req.qtyPlatelets,
        qty_plasma: req.qtyPlasma,
        qty_double_red: req.qtyDoubleRed,
        reason_needed: req.reasonNeeded,
        needed_in_hours: req.neededInHours,
        status: req.status,
        created_at: req.createdAt,
        expires_at: new Date(req.expiresAt).toISOString(),
        updated_at: new Date().toISOString()
      }).then();
    }
  };

  const shareDonorContact = (targetDonorId?: string) => {
    if (!activeRequest) return;
    const donorId = targetDonorId || activeRequest.selectedDonorId || 'donor-1';
    setActiveRequest((prev) => {
      if (!prev) return null;
      const updatedDonors = (prev.matchedDonors || []).map((d) =>
        d.id === donorId ? { ...d, hasSharedContact: true, status: 'En Route' as const } : d
      );
      const nextReq: BloodRequest = {
        ...prev,
        matchStage: 'contact_shared',
        selectedDonorId: donorId,
        matchedDonors: updatedDonors,
      };
      syncRequestToBackend(nextReq);
      return nextReq;
    });
    showToast('Contact Info Shared! Receiver can now see direct Call, WhatsApp, and Email buttons.');
  };

  const donorConfirmArrival = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const currentUserId = user.id || user.userId;
    const updatedDonors = (targetReq.matchedDonors || []).map((d) =>
      d.id === currentUserId ? { ...d, hasDonorConfirmedArrival: true } : d
    );
    const updatedReq: BloodRequest = {
      ...targetReq,
      matchedDonors: updatedDonors,
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    syncRequestToBackend(updatedReq);
    showToast('Arrival confirmed! Receiver notified.');
  };

  const donorMarkCompleted = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const currentUserId = user.id || user.userId;
    const updatedDonors = (targetReq.matchedDonors || []).map((d) =>
      d.id === currentUserId ? { ...d, donorCompleted: true } : d
    );
    const updatedReq: BloodRequest = {
      ...targetReq,
      matchStage: 'donor_completed',
      matchedDonors: updatedDonors,
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    syncRequestToBackend(updatedReq);
    showToast('Marked completed for Request. Waiting for receiver review.');
  };

  const confirmReceiverMatch = (donorId: string) => {
    if (!activeRequest) return;
    setActiveRequest((prev) => {
      if (!prev) return null;
      const updatedDonors = (prev.matchedDonors || []).map((d) =>
        d.id === donorId ? { ...d, receiverConfirmed: true } : d
      );
      const nextReq: BloodRequest = {
        ...prev,
        matchStage: 'receiver_confirmed',
        selectedDonorId: donorId,
        matchedDonors: updatedDonors,
      };
      syncRequestToBackend(nextReq);
      return nextReq;
    });
    showToast('Final match confirmation sent to Donor! Awaiting Donor to confirm donation completion.');
  };

  const completeDonorDonation = (targetDonorId?: string) => {
    if (!activeRequest) return;
    const donorId = targetDonorId || activeRequest.selectedDonorId || 'donor-1';
    setActiveRequest((prev) => {
      if (!prev) return null;
      const updatedDonors = (prev.matchedDonors || []).map((d) =>
        d.id === donorId ? { ...d, donorCompleted: true } : d
      );
      const nextReq: BloodRequest = {
        ...prev,
        matchStage: 'donor_completed',
        selectedDonorId: donorId,
        matchedDonors: updatedDonors,
      };
      syncRequestToBackend(nextReq);
      return nextReq;
    });
    showToast('Donation marked as completed by Donor! Waiting for Receiver rating & review.');
  };

  const submitReceiverRating = (rating: number, review?: string) => {
    if (!activeRequest) return;
    const donorId = activeRequest.selectedDonorId || 'donor-1';
    const currentReq = activeRequest;

    setActiveRequest((prev) => {
      if (!prev) return null;
      const updatedDonors = (prev.matchedDonors || []).map((d) =>
        d.id === donorId ? { ...d, ratingGiven: rating, reviewGiven: review } : d
      );
      const nextReq: BloodRequest = {
        ...prev,
        status: 'fulfilled',
        matchStage: 'rating_submitted',
        matchedDonors: updatedDonors,
      };
      setAllBloodRequests(allPrev => allPrev.map(r => r.id === nextReq.id ? nextReq : r));
      syncRequestToBackend(nextReq);
      return nextReq;
    });

    try {
      const histStr = localStorage.getItem('lifedrop_activity_history');
      const histList = histStr ? JSON.parse(histStr) : [];
      let categoryParts = [];
      if (currentReq.qtyWhole > 0) categoryParts.push(`Whole Blood (${currentReq.qtyWhole} Bag${currentReq.qtyWhole > 1 ? 's' : ''})`);
      if (currentReq.qtyPlatelets > 0) categoryParts.push(`Platelets (${currentReq.qtyPlatelets} Bag${currentReq.qtyPlatelets > 1 ? 's' : ''})`);
      if (currentReq.qtyPlasma > 0) categoryParts.push(`Plasma (${currentReq.qtyPlasma} Bag${currentReq.qtyPlasma > 1 ? 's' : ''})`);
      if (currentReq.qtyDoubleRed > 0) categoryParts.push(`Double Red (${currentReq.qtyDoubleRed} Bag${currentReq.qtyDoubleRed > 1 ? 's' : ''})`);
      const catString = categoryParts.join(', ') || 'Blood Donation';

      const newEntry = {
        id: `req-${currentReq.id}-fulfilled-${Date.now()}`,
        type: 'Blood Request (Fulfilled)',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        hospitalName: currentReq.hospitalName,
        hospitalAddress: currentReq.hospitalLocation,
        bloodType: currentReq.bloodType,
        category: catString,
        status: 'Fulfilled',
        notes: `Rated ${rating}★${review ? ` - "${review}"` : ''}`,
        createdAt: new Date().toISOString()
      };
      const updated = [newEntry, ...histList.filter((h: any) => h.id !== newEntry.id)];
      localStorage.setItem('lifedrop_activity_history', JSON.stringify(updated));
      window.dispatchEvent(new Event('lifedrop_history_updated'));
    } catch (e) {}

    showToast(`🎉 Donation verified and rating (${rating}★) recorded! Thank you for using LifeDrop.`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        isSupabaseReady: isSupabaseConfigured,
        activeRole,
        activityStatus,
        pendingRoleShift,
        activeRequest,
        allBloodRequests,
        activeTab,
        isAuthModalOpen,
        toasts,
        isLoading,
        loadingMessage,
        isAdminLoggedIn,
        adminUser,
        adminAccounts,
        siteConfig,
        bloodBanks,
        setBloodBanks: setBloodBanksServer,
        openAuthModal,
        closeAuthModal,
        setActiveTab,
        loginAdmin,
        logoutAdmin,
        registerAdminAccount,
        removeAdminAccount,
        updateSiteConfig,
        adminOverrideActiveRequest,
        promptRoleShift,
        confirmRoleShift,
        cancelRoleShift,
        toggleActivityStatus,
        updateProfile,
        loginMock,
        logout,
        createRequest,
        cancelRequest,
        expressDonorInterest,
        shareDonorContact,
        confirmReceiverMatch,
        completeDonorDonation,
        acceptBloodRequest,
        declineBloodRequest,
        requestSpecificDonor,
        submitReceiverRating,
        showToast,
        removeToast,
        triggerLoading,
        setIsLoading,
        clearAllDemoData,
        ticketsList,
        createSupportTicket,
        isSoundMuted,
        toggleSoundMute,
      }}
    >
      <Preloader isLoading={isLoading} message={loadingMessage} />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
