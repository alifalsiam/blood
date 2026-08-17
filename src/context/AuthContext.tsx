import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, ActivityStatus, BloodRequest, ActiveTab, AdminUser, SiteConfig, BloodBank, SupportTicket } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { realtimeHub } from '../lib/realtime';
import { Preloader } from '../components/Preloader';
import { isBloodCompatible } from '../lib/bloodCompatibility';
import {
  fetchBloodBanks, saveBloodBanks, upsertBloodBank, deleteBloodBank, deleteBulkBloodBanks,
  fetchEmergencyContacts, saveEmergencyContacts,
  fetchSiteConfig, saveSiteConfig,
  fetchBloodRequests, upsertBloodRequest, clearBloodRequests,
  fetchSupportTickets, upsertSupportTicket,
  fetchUsers, fetchBannedList, fetchDeletedList, saveBannedList, saveDeletedList,
  fetchAdminAccounts, saveAdminAccounts,
} from '../lib/supabaseDb';

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
  loginAdmin: (emailOrUser: string, pass: string) => Promise<boolean>;
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
  pingSpecificDonor: (requestId: string, donorId: string) => void;
  donorDeclinePing: (requestId: string) => void;
  donorExpressInterest: (requestId: string) => void;
  receiverConfirmMutualContact: (requestId: string) => void;
  donorCancelPostChat: (requestId: string) => void;
  donorConfirmArrivalAction: (requestId: string) => void;
  receiverDeclineArrival: (requestId: string) => void;
  receiverApproveArrival: (requestId: string) => void;
  donorMarkComplete: (requestId: string) => void;
  receiverMarkComplete: (requestId: string) => void;
  submitReceiverFeedback: (requestId: string, rating: number, feedback: string) => void;
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
    const savedUser = null;
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
    const isLoggedFlag = null === 'true';
    const savedUser = null;
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && (parsed.isLoggedIn || parsed.email)) return true;
      } catch (e) {}
    }
    return isLoggedFlag;
  });
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const savedRole = null;
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
    const saved = null;
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

  // Persist blood banks directly to Supabase (single source of truth)
  const setBloodBanksServer = (action: React.SetStateAction<BloodBank[]>) => {
    setBloodBanks((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      saveBloodBanks(next).catch(err => console.warn('Blood banks Supabase sync error:', err));
      return next;
    });
  };

  // Dynamically update document title based on admin configurations
  useEffect(() => {
    const defaultTitle = 'eblood';
    const siteTitle = siteConfig?.seoTitle || siteConfig?.companyName || defaultTitle;
    document.title = siteTitle;
  }, [siteConfig]);

  // On App Mount: Clean localStorage of Blood Banks & Emergency Contacts data and fetch from Server
  useEffect(() => {
    // Purge localstorage blood banks and emergency contacts
//     localStorage.removeItem('lifedrop_blood_banks');
    try {
      const savedConfig = null;
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed && 'emergencyContacts' in parsed) {
          delete parsed.emergencyContacts;
//           localStorage.setItem('lifedrop_site_config', JSON.stringify(parsed));
        }
      }
    } catch (e) {}

    const syncCurrentUserFromList = (usersList: any[]) => {
      const activeStr = null;
      let currentActive: any = null;
      if (activeStr) {
        try { currentActive = JSON.parse(activeStr); } catch (e) {}
      }
      if (!currentActive || !currentActive.email) return;

      const cleanEmail = currentActive.email.toLowerCase().trim();
      const currentId = String(currentActive.id || currentActive.userId || '');

      // Check if user was deleted
      const storedDeleted = null;
      if (storedDeleted) {
        try {
          const deletedArr: string[] = JSON.parse(storedDeleted);
          if (deletedArr.some(d => d.toLowerCase() === cleanEmail || d === currentId)) {
//             localStorage.removeItem('lifedrop_user');
//             localStorage.removeItem('lifedrop_is_logged_in');
//             localStorage.removeItem('lifedrop_active_request');
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
      const storedBanned = null;
      if (storedBanned) {
        try {
          const bannedArr: string[] = JSON.parse(storedBanned);
          if (bannedArr.some(b => b.toLowerCase() === cleanEmail || b === currentId)) {
//             localStorage.removeItem('lifedrop_user');
//             localStorage.removeItem('lifedrop_is_logged_in');
//             localStorage.removeItem('lifedrop_active_request');
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
//           localStorage.removeItem('lifedrop_user');
//           localStorage.removeItem('lifedrop_is_logged_in');
//           localStorage.removeItem('lifedrop_active_request');
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

//         localStorage.setItem('lifedrop_user', JSON.stringify(updatedProfile));
      }
    };

    const syncCurrentUserFromSupabaseRow = (row: any) => {
      if (!row) return;
      const activeStr = null;
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
//           localStorage.removeItem('lifedrop_user');
//           localStorage.removeItem('lifedrop_is_logged_in');
//           localStorage.removeItem('lifedrop_active_request');
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

//         localStorage.setItem('lifedrop_user', JSON.stringify(updatedProfile));
      }
    };

    // Load all data directly from Supabase (production source of truth)
    const loadSupabaseData = async () => {
      try {
        // 1. Fetch deleted & banned lists FIRST to guard against resurrected accounts
        const [deletedList, bannedList] = await Promise.all([
          fetchDeletedList(),
          fetchBannedList(),
        ]);

        const deletedEmailsAndIds = deletedList.map(d => String(d).toLowerCase().trim());
        const bannedEmailsAndIds = bannedList.map(b => String(b).toLowerCase().trim());

//         localStorage.setItem('lifedrop_deleted_users', JSON.stringify(deletedList));
//         localStorage.setItem('lifedrop_banned_users', JSON.stringify(bannedList));

        // Check if currently active user was deleted or banned
        const activeStr = null;
        if (activeStr) {
          try {
            const active = JSON.parse(activeStr);
            const activeEmail = (active.email || '').toLowerCase().trim();
            const activeId = String(active.id || active.userId || '').trim();
            if (deletedEmailsAndIds.includes(activeEmail) || deletedEmailsAndIds.includes(activeId) ||
                bannedEmailsAndIds.includes(activeEmail) || bannedEmailsAndIds.includes(activeId)) {
//               localStorage.removeItem('lifedrop_user');
//               localStorage.removeItem('lifedrop_is_logged_in');
//               localStorage.removeItem('lifedrop_active_request');
              setUser(defaultProfile);
              setIsLoggedIn(false);
              setActiveRequest(null);
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new Event('lifedrop_profile_updated'));
            }
          } catch (e) {}
        }

        // 2. Load all data from Supabase in parallel
        const [cfg, banks, ecData, requests, tickets, admins, users] = await Promise.all([
          fetchSiteConfig(),
          fetchBloodBanks(),
          fetchEmergencyContacts(),
          fetchBloodRequests(),
          fetchSupportTickets(),
          fetchAdminAccounts(),
          fetchUsers(),
        ]);

        if (Array.isArray(users) && users.length > 0) {
          syncCurrentUserFromList(users);
        }

        if (cfg && typeof cfg === 'object') {
          setSiteConfig((prev) => ({
            ...prev,
            ...cfg,
            emergencyHotline: ecData.hotline || cfg.emergencyHotline || prev.emergencyHotline || '999 / 16263',
            emergencyContacts: Array.isArray(ecData.contacts) ? ecData.contacts : [],
          }));
        } else {
          setSiteConfig((prev) => ({
            ...prev,
            emergencyHotline: ecData.hotline || prev.emergencyHotline || '999 / 16263',
            emergencyContacts: Array.isArray(ecData.contacts) ? ecData.contacts : [],
          }));
        }

        if (Array.isArray(banks)) {
          setBloodBanks(banks);
        }

        if (Array.isArray(requests)) {
          setAllBloodRequests(requests);
          const activeUserStr = null;
          let currentUserId = user.id || user.userId;
          let currentUserEmail = user.email;
          if (activeUserStr) {
            try {
              const parsedU = JSON.parse(activeUserStr);
              currentUserId = parsedU.id || parsedU.userId || currentUserId;
              currentUserEmail = parsedU.email || currentUserEmail;
            } catch (e) {}
          }
          const cancelledListStr = null;
          const cancelledList = cancelledListStr ? JSON.parse(cancelledListStr) : [];
          const myActive = requests.find((r: any) =>
            r &&
            r.status === 'active' &&
            r.expiresAt > Date.now() &&
            !cancelledList.includes(r.id) &&
            ((currentUserId && r.userId === currentUserId) ||
             (currentUserEmail && r.userEmail && r.userEmail.toLowerCase() === currentUserEmail.toLowerCase()))
          );
          setActiveRequest(myActive || null);
//           if (!myActive) localStorage.removeItem('lifedrop_active_request');
        }

        if (Array.isArray(tickets)) {
          setTicketsList(tickets);
        }

        if (Array.isArray(admins) && admins.length > 0) {
          setAdminAccounts(admins);
        }
      } catch (err) {
        console.warn('Error loading Supabase data:', err);
      }
    };

    loadSupabaseData();

    // 1. Real-Time Supabase listeners — refresh data on any table change
    const unsubUsers = realtimeHub.on('profiles_changed', async () => {
      // Check if current user was banned
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { data: profile } = await supabase.from('profiles').select('status').ilike('email', session.user.email).maybeSingle();
        if (profile && profile.status === 'Banned') {
          await supabase.auth.signOut();
          setUser(defaultProfile);
          setIsLoggedIn(false);
          setActiveRequest(null);
          showToast('You are banned, please contact the support to get back access.', true);
        }
      }

      const users = await fetchUsers();
      if (Array.isArray(users)) syncCurrentUserFromList(users);
    });

    const unsubBanned = realtimeHub.on('site_settings_changed', async () => {
      const banned = await fetchBannedList();
      if (Array.isArray(banned)) {
//         localStorage.setItem('lifedrop_banned_users', JSON.stringify(banned));
        const bannedList = banned.map(b => String(b).toLowerCase().trim());
        const activeStr = null;
        if (activeStr) {
          try {
            const active = JSON.parse(activeStr);
            const activeEmail = (active.email || '').toLowerCase().trim();
            const activeId = String(active.id || active.userId || '').trim();
            if (bannedList.includes(activeEmail) || bannedList.includes(activeId)) {
//               localStorage.removeItem('lifedrop_user');
//               localStorage.removeItem('lifedrop_is_logged_in');
//               localStorage.removeItem('lifedrop_active_request');
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
//         localStorage.setItem('lifedrop_deleted_users', JSON.stringify(deleted));
        const deletedList = deleted.map(d => String(d).toLowerCase().trim());

        // Sanitize local registered users
        try {
          const storedReg = null;
          if (storedReg) {
            const parsed = JSON.parse(storedReg);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter((u: any) => {
                const uEmail = (u.email || '').toLowerCase().trim();
                const uId = String(u.id || u.userId || '').trim();
                return !deletedList.includes(uEmail) && !deletedList.includes(uId);
              });
//               localStorage.setItem('lifedrop_registered_users', JSON.stringify(clean));
            }
          }
        } catch (e) {}

        const activeStr = null;
        if (activeStr) {
          try {
            const active = JSON.parse(activeStr);
            const activeEmail = (active.email || '').toLowerCase().trim();
            const activeId = String(active.id || active.userId || '').trim();
            if (deletedList.includes(activeEmail) || deletedList.includes(activeId)) {
//               localStorage.removeItem('lifedrop_user');
//               localStorage.removeItem('lifedrop_is_logged_in');
//               localStorage.removeItem('lifedrop_active_request');
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

    const unsubBB = realtimeHub.on('blood_banks_changed', async () => {
      const banks = await fetchBloodBanks();
      setBloodBanks(banks);
    });

    const unsubEC = realtimeHub.on('emergency_contacts_changed', async () => {
      const ecData = await fetchEmergencyContacts();
      setSiteConfig((prev) => ({
        ...prev,
        emergencyHotline: ecData.hotline || prev.emergencyHotline,
        emergencyContacts: Array.isArray(ecData.contacts) ? ecData.contacts : [],
      }));
    });

    const unsubConfig = realtimeHub.on('site_settings_changed', async () => {
      const cfg = await fetchSiteConfig();
      if (cfg && typeof cfg === 'object') setSiteConfig((prev) => ({ ...prev, ...cfg }));
    });

    const unsubReq = realtimeHub.on('blood_requests_changed', async () => {
      const requests = await fetchBloodRequests();
      if (Array.isArray(requests)) {
        setAllBloodRequests(requests);
        const activeUserStr = null;
        let currentUserId = user.id || user.userId;
        let currentUserEmail = user.email;
        if (activeUserStr) {
          try {
            const parsedU = JSON.parse(activeUserStr);
            currentUserId = parsedU.id || parsedU.userId || currentUserId;
            currentUserEmail = parsedU.email || currentUserEmail;
          } catch (e) {}
        }
        
        const cancelledListStr = null;
        const cancelledList = cancelledListStr ? JSON.parse(cancelledListStr) : [];
        
        const active = requests.find((r: any) => 
          r &&
          r.status === 'active' && 
          r.expiresAt > Date.now() && 
          !cancelledList.includes(r.id) &&
          ((currentUserId && (r.userId === currentUserId || r.id === currentUserId)) || 
           (currentUserEmail && r.userEmail && r.userEmail.toLowerCase() === currentUserEmail.toLowerCase()))
        );
        setActiveRequest(active || null);
        if (!active) {
//           localStorage.removeItem('lifedrop_active_request');
        }
      }
    });

    const unsubTickets = realtimeHub.on('support_tickets_changed', async () => {
      const tickets = await fetchSupportTickets();
      if (Array.isArray(tickets)) setTicketsList(tickets);
    });

    const unsubAdmins = realtimeHub.on('site_settings_changed', async () => {
      const admins = await fetchAdminAccounts();
      if (Array.isArray(admins) && admins.length > 0) setAdminAccounts(admins);
    });

    // Supabase Realtime profile sync is handled by realtimeHub above
    let profilesChannel: any = null;

    // 3. Background polling every 30 seconds as reliable fallback (Supabase Realtime handles real-time)
    const pollInterval = setInterval(() => {
      loadSupabaseData();
    }, 30000);

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
        const [delList, banList] = await Promise.all([
          fetchDeletedList(),
          fetchBannedList(),
        ]);
        if (delList.map(d => String(d).toLowerCase()).includes(cleanEmail)) {
          await supabase.auth.signOut();
          showToast('❌ Account Deleted: This account has been permanently removed by an administrator.', true);
          return;
        }
        if (banList.map(b => String(b).toLowerCase()).includes(cleanEmail)) {
          await supabase.auth.signOut();
          showToast('⛔ Account Suspended: Your account has been banned by an administrator.', true);
          return;
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
        if (data) {
          if (data.status === 'Banned') {
            await supabase.auth.signOut();
            showToast('You are banned, please contact the support to get back access.', true);
            return;
          }
          dbProfile = data;
        }
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

      const source = dbProfile || {};
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
        avatarUrl: (source.avatar_url || source.avatarUrl) === 'https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png' ? '' : (source.avatar_url || source.avatarUrl || ''),
        coverUrl: (source.cover_url || source.coverUrl) === 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800' ? '' : (source.cover_url || source.coverUrl || ''),
        totalDonations: source.total_donations ?? source.totalDonations ?? 0,
        verified: source.verified ?? false,
        status: source.status || 'Active',
        createdAt: source.created_at || new Date().toISOString(),
        rating: source.rating || 5.0,
        latitude: source.latitude,
        longitude: source.longitude,
        isLoggedIn: true,
        onlineStatus: 'Online',
        activityStatus: 'online',
      };

      setUser(hydratedUser);
      setIsLoggedIn(true);

      const allowedRoles = ['Super Admin', 'Operating Admin', 'Admin'];
      if (allowedRoles.includes(source.role)) {
        setIsAdminLoggedIn(true);
        setAdminUser({
          id: generatedUserId,
          username: hydratedUser.fullName,
          email: hydratedUser.email,
          role: source.role,
          avatarUrl: hydratedUser.avatarUrl,
          lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      // Restore active request for this user from Supabase
      try {
        const cancelledListStr = null;
        const cancelledList = cancelledListStr ? JSON.parse(cancelledListStr) : [];
        const allReqs = await fetchBloodRequests();
        const myActive = allReqs.find((r: any) =>
          r &&
          r.status === 'active' &&
          r.expiresAt > Date.now() &&
          !cancelledList.includes(r.id) &&
          ((generatedUserId && r.userId === generatedUserId) ||
           (cleanEmail && r.userEmail && r.userEmail.toLowerCase() === cleanEmail))
        );
        setActiveRequest(myActive || null);
      } catch (e) {}

      // Mark online in Supabase
      supabase.from('profiles').update({ is_logged_in: true, online_status: 'Online', updated_at: new Date().toISOString() }).ilike('email', cleanEmail).then();
      supabase.from('public_profiles').update({ is_logged_in: true, online_status: 'Online', updated_at: new Date().toISOString() }).ilike('email', cleanEmail).then();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSupabaseSession(session);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          setIsLoggedIn(true);
//           localStorage.setItem('lifedrop_is_logged_in', 'true');
          await fetchAndHydrateProfile(session.user);
        }
        // Dismiss preloader once auth state is known (whether logged in or not)
        setIsLoadingState(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(defaultProfile);
        setIsLoggedIn(false);
        setActiveRequest(null);
//         localStorage.removeItem('lifedrop_user');
//         localStorage.removeItem('lifedrop_is_logged_in');
//         localStorage.removeItem('lifedrop_active_role');
//         localStorage.removeItem('lifedrop_active_request');
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
    upsertSupportTicket({ ...newTicket, userEmail: user.email, userId: user.id || user.userId })
      .catch(err => console.warn('Failed to save ticket to Supabase:', err));
    showToast(`Support ticket #${newTicket.id} submitted successfully!`);
  };

  // =====================================================================
  // PREFERENCE PERSISTENCE (role, sound — not auth credentials)
  // =====================================================================
  useEffect(() => {
    const configToSave = { ...siteConfig };
    delete configToSave.emergencyContacts;
//     localStorage.setItem('lifedrop_site_config', JSON.stringify(configToSave));
  }, [siteConfig]);

  useEffect(() => {
//     localStorage.setItem('lifedrop_active_role', activeRole);
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
//       localStorage.setItem('lifedrop_is_logged_in', 'true');
    } else {
//       localStorage.removeItem('lifedrop_is_logged_in');
    }
  }, [isLoggedIn]);

  useEffect(() => {
//     localStorage.setItem('lifedrop_active_role', activeRole);
  }, [activeRole]);

  useEffect(() => {
    if (activeRequest) {
      upsertBloodRequest(activeRequest).catch(err => console.warn('Failed to sync blood request to Supabase:', err));
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
//         localStorage.setItem('lifedrop_user', JSON.stringify(updated));

        // Live sync coordinates to Supabase
        if (updated.email) {
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
        const savedReq = null;
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
//     localStorage.removeItem('lifedrop_active_request');
    localStorage.setItem('lifedrop_demo_wiped', 'true');
    clearBloodRequests().catch(() => {});
    showToast('🧹 All demo requests wiped. System restored to clean production state.');
  };

  const updateSiteConfig = async (updates: Partial<SiteConfig>) => {
    // Derive the new config synchronously based on current state
    const target: SiteConfig = { ...siteConfig, ...updates };

    // Update local state immediately
    setSiteConfig(target);

    if (target) {
      if (target.seoTitle) {
        document.title = target.seoTitle;
      }
      if (target.seoDescription !== undefined) {
        let metaDesc: HTMLMetaElement | null = document.querySelector("meta[name='description']");
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          document.getElementsByTagName('head')[0].appendChild(metaDesc);
        }
        metaDesc.content = target.seoDescription;
      }
      if (target.seoKeywords !== undefined) {
        let metaKeywords: HTMLMetaElement | null = document.querySelector("meta[name='keywords']");
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.name = 'keywords';
          document.getElementsByTagName('head')[0].appendChild(metaKeywords);
        }
        metaKeywords.content = target.seoKeywords;
      }
      if (target.ogImageUrl !== undefined) {
        let metaOgImage: HTMLMetaElement | null = document.querySelector("meta[property='og:image']");
        if (!metaOgImage) {
          metaOgImage = document.createElement('meta');
          metaOgImage.setAttribute('property', 'og:image');
          document.getElementsByTagName('head')[0].appendChild(metaOgImage);
        }
        metaOgImage.content = target.ogImageUrl;
      }
      if (target.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = target.faviconUrl;
      }

      try {
        await saveSiteConfig(target);
        if (updates.emergencyContacts !== undefined || updates.emergencyHotline !== undefined) {
          await saveEmergencyContacts(
            target.emergencyHotline || '999 / 16263',
            target.emergencyContacts || []
          );
        }
        showToast('Site Configuration updated by Admin.');
      } catch (err: any) {
        console.error('Failed to sync site config to Supabase:', err);
        showToast(`❌ Database Sync Failed: ${err.message || 'Failed to update configs.'}`, true);
        throw err;
      }
    }
  };

  const adminOverrideActiveRequest = (updatedReq: Partial<BloodRequest> | null) => {
    if (updatedReq === null) {
      setActiveRequest(null);
//       localStorage.removeItem('lifedrop_active_request');
      clearBloodRequests().catch(() => {});
      showToast('Admin cleared/canceled active user request.');
    } else if (updatedReq.status === 'cancelled' || updatedReq.status === 'fulfilled') {
      setActiveRequest(null);
//       localStorage.removeItem('lifedrop_active_request');
      if (activeRequest) {
        upsertBloodRequest({ ...activeRequest, ...updatedReq } as BloodRequest).catch(() => {});
      }
      showToast(`Admin updated request status to ${updatedReq.status}.`);
    } else if (activeRequest) {
      const merged = { ...activeRequest, ...updatedReq };
      setActiveRequest(merged);
//       localStorage.setItem('lifedrop_active_request', JSON.stringify(merged));
      upsertBloodRequest(merged).catch(() => {});
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
//       localStorage.setItem('lifedrop_active_request', JSON.stringify(newOverrideReq));
      upsertBloodRequest(newOverrideReq).catch(() => {});
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

  // No hardcoded admin accounts — all admins are real Supabase users with role 'Super Admin' or 'Operating Admin' in public.profiles
  const [adminAccounts, setAdminAccounts] = useState<Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
  }>>([]);

  // Restore saved admin session if available
  useEffect(() => {
    try {
      const savedSession = null;
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
    // Admin accounts are now managed in Supabase — create the user in Supabase Auth dashboard
    // and set their role in public.profiles to 'Super Admin' or 'Operating Admin'
    showToast('To create an admin account, add the user in Supabase Auth dashboard and set their role in the profiles table.', true);
    return false;
  };

  const removeAdminAccount = (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const updatedList = adminAccounts.filter(a => a.email.toLowerCase() !== cleanEmail);
    setAdminAccounts(updatedList);
    // Also update role in Supabase profiles
    if (isSupabaseConfigured) {
      supabase.from('profiles').update({ role: 'Donor', status: 'Active', updated_at: new Date().toISOString() }).ilike('email', cleanEmail).then();
    }
    showToast(`Admin access revoked for ${email}.`);
  };

  // =====================================================================
  // ADMIN LOGIN — Authenticates via Supabase Auth + verifies admin role
  // =====================================================================
  const loginAdmin = async (emailOrUser: string, pass: string): Promise<boolean> => {
    const cleanEmail = emailOrUser.toLowerCase().trim();

    if (!cleanEmail || !pass) {
      showToast('Please enter your admin email and password.', true);
      return false;
    }

    // 1. Authenticate via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (authError || !authData.user) {
      showToast('❌ Incorrect email or password.', true);
      return false;
    }

    // 2. Verify admin role in public.profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role, status, avatar_url, user_id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      showToast('❌ No profile found for this account.', true);
      return false;
    }

    const allowedRoles = ['Super Admin', 'Operating Admin', 'Admin'];
    if (!allowedRoles.includes(profile.role)) {
      await supabase.auth.signOut();
      showToast('⛔ Access denied. This account does not have admin privileges.', true);
      return false;
    }

    // 3. Set admin session
    const adminData: AdminUser = {
      id: authData.user.id,
      username: profile.full_name || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: profile.role,
      avatarUrl: profile.avatar_url === 'https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png' ? (siteConfig.defaultAvatar || '') : (profile.avatar_url || siteConfig.defaultAvatar || ''),
      lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setIsAdminLoggedIn(true);
    setAdminUser(adminData);
//     localStorage.setItem('lifedrop_admin_session', JSON.stringify(adminData));

    // Track in adminAccounts list for the admin panel UI
    setAdminAccounts(prev => {
      const exists = prev.some(a => a.email.toLowerCase() === cleanEmail);
      if (!exists) {
        return [{ id: authData.user!.id, username: adminData.username, email: cleanEmail, role: profile.role, createdAt: new Date().toISOString().split('T')[0] }, ...prev];
      }
      return prev;
    });

    showToast(`✅ Welcome back, ${adminData.username} (${profile.role})!`);
    setActiveTab('admin');
    return true;
  };

  const logoutAdmin = async () => {
    setIsAdminLoggedIn(false);
    setAdminUser(null);
//     localStorage.removeItem('lifedrop_admin_session');
    await supabase.auth.signOut();
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
  // Removed redundant onAuthStateChange listener as the primary useEffect handles session hydration.

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
//       localStorage.setItem('lifedrop_user', JSON.stringify(updated));
//       localStorage.setItem('lifedrop_active_role', nextRole);

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
      // Mark user offline in Supabase on page close
      if (user.email) {
        const payload = { is_logged_in: false, online_status: 'Offline', updated_at: new Date().toISOString() };
        supabase.from('profiles').update(payload).ilike('email', user.email).then();
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
//       localStorage.setItem('lifedrop_user', JSON.stringify(updated));

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
                    avatar: user.avatarUrl || (siteConfig.defaultAvatar || 'https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png'),
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
    if (!isSupabaseConfigured || !profileData.email) return;
    try {
      const safePayload = {
        user_id: profileData.userId || profileData.id || `RD${Math.floor(100000 + Math.random() * 900000)}`,
        email: profileData.email.toLowerCase(),
        full_name: profileData.fullName || '',
        phone: profileData.phone || '',
        emergency_contact: profileData.emergencyContact || '',
        address: profileData.address || '',
        division: profileData.division || 'Dhaka Division',
        district: profileData.district || 'Dhaka',
        blood_group: profileData.bloodGroup || 'A+',
        weight: profileData.weight || 70,
        sex: profileData.sex || 'Male',
        dob: profileData.dob || '1998-05-15',
        latitude: profileData.latitude !== undefined ? profileData.latitude : null,
        longitude: profileData.longitude !== undefined ? profileData.longitude : null,
        avatar_url: profileData.avatarUrl || '',
        cover_url: profileData.coverUrl || '',
        updated_at: new Date().toISOString(),
      };

      let syncErr: any = null;
      const { data, error: updateErr } = await supabase.from('profiles').update(safePayload).ilike('email', profileData.email).select();
      
      if (updateErr) {
        syncErr = updateErr;
      } else if (!data || data.length === 0) {
        // Fallback: If 0 rows updated, it means the profile doesn't exist yet, so we insert it
        const { error: insertErr } = await supabase.from('profiles').insert(safePayload);
        syncErr = insertErr;
      }

      if (syncErr) {
        console.error('Supabase profile sync error:', syncErr);
        const errMsg = syncErr.message || syncErr.details || syncErr.code || 'Unknown database error';
        showToast(`Sync Error: ${errMsg}`, true);
      } else {
        showToast('Profile Updated Successfully');
      }
    } catch (err) {
      console.warn('Supabase profiles sync error:', err);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };

//       localStorage.setItem('lifedrop_user', JSON.stringify(updated));
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
    }

//     localStorage.removeItem('lifedrop_user');
//     localStorage.removeItem('lifedrop_is_logged_in');
//     localStorage.removeItem('lifedrop_active_role');
//     localStorage.removeItem('lifedrop_active_request');

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
                avatar: u.avatar_url || (siteConfig.defaultAvatar || 'https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png'),
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
          usersList = await fetchUsers();
        } catch (err) {
          console.warn('Failed to fetch users from Supabase, falling back to local storage');
          const storedUsers = null;
          if (storedUsers) usersList = JSON.parse(storedUsers);
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
                avatar: u.avatarUrl || u.avatar || (siteConfig.defaultAvatar || 'https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png'),
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
      id: crypto.randomUUID(),
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

//     localStorage.setItem('lifedrop_active_request', JSON.stringify(newReq));
    setActiveRequest(newReq);

    // Persist to Supabase directly
    upsertBloodRequest(newReq).catch(err => console.warn('Failed to sync blood request to Supabase:', err));

    try {
      const histStr = null;
      const histList = histStr ? JSON.parse(histStr) : [];
      const newEntry = {
        id: `req-${newReq.id}`,
        type: 'Emergency Blood Broadcast',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        hospitalName: newReq.hospitalName,
        hospitalAddress: newReq.hospitalLocation,
        bloodType: newReq.bloodType,
        category: `Emergency ${siteConfig?.radarRadiusKm || 25}km Broadcast`,
        status: 'Active',
        notes: `Needed in ${newReq.neededInHours}h - Reason: ${newReq.reasonNeeded}`,
        createdAt: new Date().toISOString()
      };
      const updated = [newEntry, ...histList.filter((h: any) => h.id !== newEntry.id)];
//       localStorage.setItem('lifedrop_activity_history', JSON.stringify(updated));
      window.dispatchEvent(new Event('lifedrop_history_updated'));
    } catch (e) {}

    showToast(`🚨 Emergency Blood Request broadcasted! ${siteConfig?.radarRadiusKm || 25}km Radar actively scanning for online donors.`);
  };

  const cancelRequest = (reason: string) => {
    const finalReason = reason || 'Cancelled by requester';

//     localStorage.removeItem('lifedrop_active_request');

    if (activeRequest) {
      const reqToCancel: BloodRequest = {
        ...activeRequest,
        status: 'cancelled',
        cancelReason: finalReason,
        expiresAt: Date.now(),
      };

      upsertBloodRequest(reqToCancel).catch(err => console.warn('Failed to sync request cancellation to Supabase:', err));

      // Add to cancelled list so mock server doesn't snap it back
      try {
        const cancelledStr = null;
        const cancelledList = cancelledStr ? JSON.parse(cancelledStr) : [];
        if (!cancelledList.includes(reqToCancel.id)) {
          cancelledList.push(reqToCancel.id);
//           localStorage.setItem('lifedrop_cancelled_requests', JSON.stringify(cancelledList));
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
        const histStr = null;
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
//         localStorage.setItem('lifedrop_activity_history', JSON.stringify(updated));
        window.dispatchEvent(new Event('lifedrop_history_updated'));
      } catch (e) {}
    }

    setActiveRequest(null);
    showToast(`Broadcast cancelled. Reason: "${finalReason}"`);
  };

  const syncRequestToBackend = (req: BloodRequest) => {
    upsertBloodRequest(req).catch(err => console.warn('Failed to sync blood request to Supabase:', err));
  };

  const pingSpecificDonor = (requestId: string, donorId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const existingDonors = targetReq.matchedDonors || [];
    const updatedDonors = existingDonors.map(d => 
      d.id === donorId ? { ...d, status: 'Notified' as any } : d
    );
    const updatedReq: BloodRequest = { ...targetReq, matchedDonors: updatedDonors, status: 'active' };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    setActiveRequest(prev => prev?.id === requestId ? updatedReq : prev);
    syncRequestToBackend(updatedReq);
    showToast('Donor Pinged! Waiting for their response.');
  };

  const donorDeclinePing = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const currentUserId = user.id || user.userId;
    const existingDonors = targetReq.matchedDonors || [];
    const updatedDonors = existingDonors.map(d => 
      d.id === currentUserId ? { ...d, status: 'Declined' as any } : d
    );
    const updatedReq: BloodRequest = { ...targetReq, matchedDonors: updatedDonors };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    syncRequestToBackend(updatedReq);
    showToast('Ping declined. Your card is removed from the receiver view.');
  };

  const donorExpressInterest = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const currentUserId = user.id || user.userId;
    const updatedDonors = (targetReq.matchedDonors || []).map((d) =>
      d.id === currentUserId ? { ...d, hasExpressedInterest: true, status: 'Accepted' as any } : d
    );
    const updatedReq: BloodRequest = {
      ...targetReq,
      matchedDonors: updatedDonors,
      selectedDonorId: currentUserId,
      matchStage: 'donor_interested'
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    syncRequestToBackend(updatedReq);
    showToast('Interest Registered! Awaiting receiver confirmation.');
  };

  const receiverConfirmMutualContact = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const updatedReq: BloodRequest = {
      ...targetReq,
      matchStage: 'mutual_contact_shared'
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    setActiveRequest(prev => prev?.id === requestId ? updatedReq : prev);
    syncRequestToBackend(updatedReq);
    showToast('Privacy Unlocked. You and the donor can now see phone numbers.');
  };

  const donorCancelPostChat = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const updatedReq: BloodRequest = {
      ...targetReq,
      matchStage: 'donor_withdrawn_post_chat',
      selectedDonorId: undefined
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    syncRequestToBackend(updatedReq);
    showToast('Commitment cancelled post-chat.');
  };

  const donorConfirmArrivalAction = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const updatedReq: BloodRequest = {
      ...targetReq,
      matchStage: 'donor_arriving_pending_approval'
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    syncRequestToBackend(updatedReq);
    showToast('Arrival Checked-In. Awaiting Receiver Approval.');
  };

  const receiverDeclineArrival = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const updatedReq: BloodRequest = {
      ...targetReq,
      matchStage: 'arrival_declined_cross_match'
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    setActiveRequest(prev => prev?.id === requestId ? updatedReq : prev);
    syncRequestToBackend(updatedReq);
    showToast('Arrival declined due to cross-matching / medical unfitness.');
  };

  const receiverApproveArrival = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const updatedReq: BloodRequest = {
      ...targetReq,
      matchStage: 'arrival_confirmed_and_approved'
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    setActiveRequest(prev => prev?.id === requestId ? updatedReq : prev);
    syncRequestToBackend(updatedReq);
    showToast('Arrival verified and approved!');
  };

  const donorMarkComplete = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const updatedReq: BloodRequest = {
      ...targetReq,
      donor_completed: true,
      matchStage: targetReq.receiver_completed ? 'donor_completed' : targetReq.matchStage // or just leave matchStage, wait, receiver finalizes
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    syncRequestToBackend(updatedReq);
    showToast('You marked it complete! Waiting for receiver rating and feedback.');
  };

  const receiverMarkComplete = (requestId: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId);
    if (!targetReq) return;
    const updatedReq: BloodRequest = {
      ...targetReq,
      receiver_completed: true,
      matchStage: 'donor_completed' // Trigger to next step
    };
    setAllBloodRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    setActiveRequest(prev => prev?.id === requestId ? updatedReq : prev);
    syncRequestToBackend(updatedReq);
    showToast('Please submit your rating and feedback to fully finalize the record.');
  };

  const submitReceiverFeedback = (requestId: string, rating: number, feedback: string) => {
    const targetReq = allBloodRequests.find(r => r.id === requestId) || activeRequest;
    if (!targetReq) return;
    const donorId = targetReq.selectedDonorId;
    const updatedDonors = (targetReq.matchedDonors || []).map((d) =>
      d.id === donorId ? { ...d, ratingGiven: rating, reviewGiven: feedback } : d
    );
    const updatedReq: BloodRequest = {
      ...targetReq,
      status: 'fulfilled',
      matchStage: 'fully_resolved',
      matchedDonors: updatedDonors,
    };
    setAllBloodRequests(prev => prev.map(r => r.id === targetReq.id ? updatedReq : r));
    setActiveRequest(prev => prev?.id === targetReq.id ? updatedReq : prev);
    syncRequestToBackend(updatedReq);

    try {
      const histStr = null;
      const histList = histStr ? JSON.parse(histStr) : [];
      let categoryParts = [];
      if (updatedReq.qtyWhole > 0) categoryParts.push(`Whole Blood (${updatedReq.qtyWhole} Bag${updatedReq.qtyWhole > 1 ? 's' : ''})`);
      if (updatedReq.qtyPlatelets > 0) categoryParts.push(`Platelets (${updatedReq.qtyPlatelets} Bag${updatedReq.qtyPlatelets > 1 ? 's' : ''})`);
      if (updatedReq.qtyPlasma > 0) categoryParts.push(`Plasma (${updatedReq.qtyPlasma} Bag${updatedReq.qtyPlasma > 1 ? 's' : ''})`);
      if (updatedReq.qtyDoubleRed > 0) categoryParts.push(`Double Red (${updatedReq.qtyDoubleRed} Bag${updatedReq.qtyDoubleRed > 1 ? 's' : ''})`);
      const catString = categoryParts.join(', ') || 'Blood Donation';

      const newEntry = {
        id: `req-${updatedReq.id}-fulfilled-${Date.now()}`,
        type: 'Blood Request (Fulfilled)',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        hospitalName: updatedReq.hospitalName,
        hospitalAddress: updatedReq.hospitalLocation,
        bloodType: updatedReq.bloodType,
        category: catString,
        status: 'Fulfilled',
        notes: `Rated ${rating}★${feedback ? ` - "${feedback}"` : ''}`,
        createdAt: new Date().toISOString()
      };
      const updated = [newEntry, ...histList.filter((h: any) => h.id !== newEntry.id)];
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
        pingSpecificDonor,
        donorDeclinePing,
        donorExpressInterest,
        receiverConfirmMutualContact,
        donorCancelPostChat,
        donorConfirmArrivalAction,
        receiverDeclineArrival,
        receiverApproveArrival,
        donorMarkComplete,
        receiverMarkComplete,
        submitReceiverFeedback,
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
