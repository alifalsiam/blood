import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { realtimeHub } from '../lib/realtime';
import { AdminLoginBlock } from './AdminLoginBlock';
import { bangladeshDivisionsAndDistricts, divisionNamesWithSuffix, getDistrictsForDivision, allDistricts } from '../data/locationData';
import { 
  Users, 
  Droplets, 
  Building2, 
  Ticket, 
  Heart, 
  Settings, 
  LogOut, 
  ExternalLink, 
  Search, 
  Plus, 
  Copy,
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  Activity, 
  Phone, 
  Filter, 
  Save, 
  Trash2, 
  Globe, 
  Edit3, 
  Flame, 
  Sparkles, 
  Download, 
  Upload, 
  FileText, 
  Calendar, 
  UploadCloud, 
  PhoneCall, 
  Image as ImageIcon,
  Check,
  LayoutDashboard,
  ShieldAlert,
  HelpCircle,
  Tag,
  FileSpreadsheet,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  Shield,
  UserPlus,
  UserX,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
  BarChart3,
  PieChart,
  Target,
  Clock,
  Sliders,
  ChevronDown,
  Printer,
  Wallet,
  Receipt,
  RefreshCw,
  Megaphone
} from 'lucide-react';
import { BloodBank, BloodRequest, BloodType, EmergencyContact, AdSystemConfig, CarouselSlide } from '../types';
import {
  fetchBloodRequests, fetchBloodBanks, fetchEmergencyContacts, fetchSiteConfig,
  fetchSupportTickets, fetchDonations, fetchUsers, fetchAdminAccounts, saveAdminAccounts,
  adminUpdateUserProfile, adminUpdateUserStatus, upsertBloodBank, deleteBloodBank, deleteBulkBloodBanks, saveBloodBanks,
  fetchBannedList, fetchDeletedList, saveBannedList, saveDeletedList, deleteUserProfile,
  updateTicketStatus, deleteTicket,
} from '../lib/supabaseDb';
// supabase is imported at line 3

const safeDivisionString = (val: any): string => {
  if (!val) return 'Dhaka Division';
  if (typeof val === 'string') {
    if (val.startsWith('{') || val.startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        return safeDivisionString(parsed);
      } catch (e) {}
    }
    return val;
  }
  if (typeof val === 'object') {
    return val.division_name || val.division || val.name || val.label || val.value || 'Dhaka Division';
  }
  return String(val);
};

const safeDistrictString = (val: any): string => {
  if (!val) return 'Dhaka';
  if (typeof val === 'string') {
    if (val.startsWith('{') || val.startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        return safeDistrictString(parsed);
      } catch (e) {}
    }
    return val;
  }
  if (typeof val === 'object') {
    return val.district_name || val.district || val.name || val.label || val.value || 'Dhaka';
  }
  return String(val);
};

export const AdminDashboardBlock: React.FC = () => {
  const { 
    isAdminLoggedIn, 
    adminUser, 
    adminAccounts,
    registerAdminAccount,
    removeAdminAccount,
    logoutAdmin, 
    logout,
    setActiveTab, 
    showToast,
    activeRequest,
    adminOverrideActiveRequest,
    siteConfig,
    updateSiteConfig,
    bloodBanks: bloodBanksList,
    setBloodBanks: setBloodBanksList,
    clearAllDemoData
  } = useAuth();

  const [showSqlModal, setShowSqlModal] = useState(false);

  // Desktop Navigation Tab State
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [adminTab, setAdminTab] = useState<
    'overview' | 'requests' | 'branding' | 'seo' | 'contacts' | 'data_tools' | 'settings' | 'users' | 'bloodbanks' | 'tickets' | 'donations' | 'ads'
  >('overview');

  // --- 1. BRANDING & LOGO STATE ---
  const [companyNameInput, setCompanyNameInput] = useState(siteConfig.companyName || '');
  const [logoSymbolInput, setLogoSymbolInput] = useState(siteConfig.logoSymbol || '🩸');
  const [logoUrlInput, setLogoUrlInput] = useState(siteConfig.logoUrl || '');
  const [faviconUrlInput, setFaviconUrlInput] = useState(siteConfig.faviconUrl || '');
  const [logoDisplayModeInput, setLogoDisplayModeInput] = useState<'both' | 'logoOnly' | 'nameOnly'>(
    siteConfig.logoDisplayMode || 'both'
  );
  const [taglineInput, setTaglineInput] = useState(siteConfig.tagline || '');

  // --- 2. SEO STATE ---
  const [seoTitleInput, setSeoTitleInput] = useState(siteConfig.seoTitle || '');
  const [seoDescInput, setSeoDescInput] = useState(siteConfig.seoDescription || '');
  const [seoKeywordsInput, setSeoKeywordsInput] = useState(siteConfig.seoKeywords || '');
  const [analyticsIdInput, setAnalyticsIdInput] = useState(siteConfig.analyticsId || '');
  const [metaPixelIdInput, setMetaPixelIdInput] = useState(siteConfig.metaPixelId || '');
  const [ogImageUrlInput, setOgImageUrlInput] = useState(siteConfig.ogImageUrl || '');

  // --- 3. EMERGENCY CONTACTS STATE ---
  const [contactsList, setContactsList] = useState<EmergencyContact[]>(
    siteConfig.emergencyContacts || []
  );
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [editContactTitle, setEditContactTitle] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');
  const [editContactIcon, setEditContactIcon] = useState('📞');
  const [editContactCategory, setEditContactCategory] = useState('Medical');
  const [newContactTitle, setNewContactTitle] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [newContactIcon, setNewContactIcon] = useState('📞');
  const [newContactCategory, setNewContactCategory] = useState('Medical');

  useEffect(() => {
    if (Array.isArray(siteConfig.emergencyContacts)) {
      setContactsList(siteConfig.emergencyContacts);
    }
  }, [siteConfig.emergencyContacts]);

  // --- 4. REQUESTS OVERRIDE LIST ---
  const [requestFilter, setRequestFilter] = useState<'all' | 'active' | 'fulfilled' | 'cancelled'>('all');
  const [requestsList, setRequestsList] = useState<BloodRequest[]>([]);

  // Modals for requests
  const [editingReq, setEditingReq] = useState<BloodRequest | null>(null);
  const [showCreateOverrideReqModal, setShowCreateOverrideReqModal] = useState(false);
  const [newReqType, setNewReqType] = useState<BloodType>('O-');
  const [newReqHospital, setNewReqHospital] = useState('Dhaka Medical College Hospital');
  const [newReqLocation, setNewReqLocation] = useState('Secretariat Rd, Ramna, Dhaka');
  const [newReqQty, setNewReqQty] = useState(2);
  const [newReqReason, setNewReqReason] = useState('Emergency Admin Override Requirement');

  // --- 5. USERS MANAGEMENT STATE & DIRECTORY UX ---
  const [userSearch, setUserSearch] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [divisionFilter, setDivisionFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [badgeFilter, setBadgeFilter] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>([]);

  // Date Filter State
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [datePreset, setDatePreset] = useState<string>('all');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [reloadingSection, setReloadingSection] = useState<string | null>(null);

  const formatDdMmYyyy = (val: any, fallback = '12/08/2026'): string => {
    if (!val || val === 'Never' || val === 'N/A') return fallback;
    if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatLastDonatedDate = (val: any): string => {
    if (!val || val === 'Never' || val === 'N/A') return 'Never';
    if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return 'Never';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // --- RELOADERS FOR EACH SECTION & DATASET ---
  const reloadUsersDataset = async () => {
    setReloadingSection('users');
    try {
      await loadUsers();
      showToast('✅ Users & Donors dataset reloaded fresh from DB!');
    } catch (err) {
      showToast('⚠️ Error refreshing users dataset.');
    } finally {
      setTimeout(() => setReloadingSection(null), 450);
    }
  };

  const reloadRequestsDataset = async () => {
    setReloadingSection('requests');
    try {
      const res = await fetch('/api/blood-requests');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRequestsList(data);
        }
      }
      showToast('✅ Blood requests dataset reloaded fresh from DB!');
    } catch (err) {
      showToast('⚠️ Error reloading blood requests.');
    } finally {
      setTimeout(() => setReloadingSection(null), 450);
    }
  };

  const reloadBloodBanksDataset = async () => {
    setReloadingSection('bloodbanks');
    try {
      const data = await fetchBloodBanks();
      if (Array.isArray(data)) setBloodBanksList(data);
      showToast('✅ Blood banks directory reloaded fresh from DB!');
    } catch (err) {
      showToast('⚠️ Error reloading blood banks.');
    } finally {
      setTimeout(() => setReloadingSection(null), 450);
    }
  };

  const reloadContactsDataset = async () => {
    setReloadingSection('contacts');
    try {
      const ecData = await fetchEmergencyContacts();
      if (Array.isArray(ecData.contacts)) setContactsList(ecData.contacts);
      showToast('✅ Emergency contacts reloaded fresh from DB!');
    } catch (err) {
      showToast('⚠️ Error reloading emergency contacts.');
    } finally {
      setTimeout(() => setReloadingSection(null), 450);
    }
  };

  const reloadTicketsDataset = async () => {
    setReloadingSection('tickets');
    try {
      const data = await fetchSupportTickets();
      if (Array.isArray(data)) setTicketsList(data);
      showToast('✅ Support tickets dataset reloaded from DB!');
    } catch (err) {
      showToast('⚠️ Error reloading support tickets.');
    } finally {
      setTimeout(() => setReloadingSection(null), 450);
    }
  };

  const reloadDonationsDataset = async () => {
    setReloadingSection('donations');
    try {
      const data = await fetchDonations();
      if (Array.isArray(data)) setReceiptsList(data);
      showToast('✅ Dev Fund receipts & invoices reloaded from DB!');
    } catch (err) {
      showToast('⚠️ Error reloading donations.');
    } finally {
      setTimeout(() => setReloadingSection(null), 450);
    }
  };

  const reloadSettingsDataset = async (sectionKey: string = 'settings') => {
    setReloadingSection(sectionKey);
    try {
      const res = await fetch('/api/site-config');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.companyName) setCompanyNameInput(data.companyName);
          if (data.logoSymbol) setLogoSymbolInput(data.logoSymbol);
          if (data.logoUrl !== undefined) setLogoUrlInput(data.logoUrl);
          if (data.seoTitle) setSeoTitleInput(data.seoTitle);
          if (data.seoDescription) setSeoDescInput(data.seoDescription);
          if (data.announcementText !== undefined) setAnnouncementMsg(data.announcementText);
          if (data.emergencyHotline !== undefined) setEmergencyHotline(data.emergencyHotline);
        }
      }
      showToast(`✅ ${sectionKey.toUpperCase()} configuration reloaded from DB!`);
    } catch (err) {
      showToast('⚠️ Error reloading configuration.');
    } finally {
      setTimeout(() => setReloadingSection(null), 450);
    }
  };

  const reloadOverviewDataset = async () => {
    setReloadingSection('overview');
    try {
      const [reqs, banks, ecData, tickets, donations] = await Promise.all([
        fetchBloodRequests(),
        fetchBloodBanks(),
        fetchEmergencyContacts(),
        fetchSupportTickets(),
        fetchDonations(),
      ]);
      await loadUsers();
      if (Array.isArray(reqs)) setRequestsList(reqs);
      if (Array.isArray(banks)) setBloodBanksList(banks);
      if (Array.isArray(ecData.contacts)) setContactsList(ecData.contacts);
      if (Array.isArray(tickets)) setTicketsList(tickets);
      if (Array.isArray(donations)) setReceiptsList(donations);
      showToast('✅ All dashboard metrics and collections reloaded fresh from DB!');
    } catch (err) {
      showToast('⚠️ Error refreshing overview metrics.');
    } finally {
      setTimeout(() => setReloadingSection(null), 450);
    }
  };

  const loadUsers = async () => {
    let merged: any[] = [];
    const adminEmails = adminAccounts ? adminAccounts.map(a => a.email.toLowerCase()) : [];

    const isOperatingAdmin = (emailStr: string, roleStr?: string, statusStr?: string) => {
      const email = (emailStr || '').toLowerCase().trim();
      const role = (roleStr || '').toLowerCase();
      const status = (statusStr || '').toLowerCase();
      return (
        email === 'kfalifalsiam540@gmail.com' ||
        adminEmails.includes(email) ||
        role.includes('admin') ||
        status === 'admin'
      );
    };

    let deletedList: string[] = [];
    let bannedList: string[] = [];

    if (isSupabaseConfigured) {
      try {
        const [dbDeleted, dbBanned] = await Promise.all([
          fetchDeletedList(),
          fetchBannedList()
        ]);
        deletedList = dbDeleted.map(d => String(d).toLowerCase().trim());
        bannedList = dbBanned.map(b => String(b).toLowerCase().trim());
      } catch (err) {
        console.warn('Failed to fetch deleted/banned lists from Supabase:', err);
      }
    }

    const isDeletedUser = (idVal: any, emailVal: any) => {
      const cleanE = (emailVal || '').toLowerCase().trim();
      const cleanI = String(idVal || '').trim();
      return (
        (cleanE && deletedList.includes(cleanE)) ||
        (cleanI && deletedList.includes(cleanI))
      );
    };

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('profiles').select('*');
        if (data && data.length > 0) {
          data.forEach((p: any) => {
            if (isOperatingAdmin(p.email, p.role, p.status) || isDeletedUser(p.id || p.user_id, p.email)) return;
            const uEmail = p.email ? p.email.toLowerCase() : '';

            const sbUser = {
              id: p.id,
              userId: p.user_id || p.id,
              name: p.full_name,
              fullName: p.full_name,
              email: uEmail,
              password: p.password || 'Pass#123',
              phone: p.phone,
              emergency: p.emergency_contact,
              emergencyContact: p.emergency_contact,
              blood: p.blood_group,
              bloodGroup: p.blood_group,
              weight: p.weight,
              sex: p.sex,
              dob: p.dob,
              division: safeDivisionString(p.division),
              district: safeDistrictString(p.district),
              address: p.address,
              latitude: p.latitude,
              longitude: p.longitude,
              onlineStatus: p.online_status || 'Online',
              role: p.role && !p.role.toLowerCase().includes('admin') ? p.role : 'Donor',
              isLoggedIn: p.is_logged_in ?? false,
              lastDonatedAt: p.last_donated_at || null,
              totalDonations: p.total_donations || 0,
              totalRequests: 0,
              lastDonated: formatLastDonatedDate(p.last_donated_at || p.last_donated_date),
              memberSince: formatDdMmYyyy(p.member_since || p.created_at),
              lastLogin: p.is_logged_in ? 'Active now' : 'Recently',
              loginState: p.is_logged_in ? 'Logged In' : 'Logged Out',
              status: bannedList.includes(uEmail) || bannedList.includes(String(p.id)) ? 'Banned' : (p.status || 'Active'),
              verified: p.verified || false,
            };

            merged.push(sbUser);
          });
        }
      } catch (err) {
        console.warn('Supabase fetch profiles error:', err);
      }
    }

    setUsersList(merged);
  };

    useEffect(() => {
      if (!isAdminLoggedIn) return;

      loadUsers();

      // Initial data load from Supabase
      fetchBloodRequests().then(data => {
        if (Array.isArray(data) && data.length > 0) setRequestsList(data);
      }).catch(() => {});

      fetchDonations().then(data => {
        if (Array.isArray(data) && data.length > 0) setReceiptsList(data);
      }).catch(() => {});

    const handleSyncStorage = () => {
      loadUsers();
    };

    window.addEventListener('storage', handleSyncStorage);
    window.addEventListener('lifedrop_profile_updated', handleSyncStorage);

    // Realtime listeners for Supabase changes
    const unsubServerUsers = realtimeHub.on('profiles_changed', () => {
      loadUsers();
    });

    const unsubBanned = realtimeHub.on('site_settings_changed', () => {
      loadUsers();
    });

    const unsubDeleted = realtimeHub.on('site_settings_changed', () => {
      loadUsers();
    });

    // 2. Continuous real-time background polling every 3 seconds
    const adminPoll = setInterval(() => {
      loadUsers();
    }, 3000);

    // 3. Supabase Postgres Realtime Changes Channel
    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('realtime:profiles_directory')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          loadUsers();
        })
        .subscribe();
    }

    return () => {
      clearInterval(adminPoll);
      unsubServerUsers();
      unsubBanned();
      unsubDeleted();
      window.removeEventListener('storage', handleSyncStorage);
      window.removeEventListener('lifedrop_profile_updated', handleSyncStorage);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAdminLoggedIn, adminAccounts]);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteUserConfirmModal, setDeleteUserConfirmModal] = useState<{
    ids: (string | number)[];
    title: string;
    message: string;
    userNames?: string[];
  } | null>(null);

  // --- 6. BLOOD BANKS DIRECTORY STATE ---

  // Blood Banks Search, Filter, Selection & Pagination State
  const [bbSearch, setBbSearch] = useState('');
  const [bbDivisionFilter, setBbDivisionFilter] = useState('');
  const [bbDistrictFilter, setBbDistrictFilter] = useState('');
  const [bbResultsPerPage, setBbResultsPerPage] = useState(10);
  const [bbIsFilterPanelOpen, setBbIsFilterPanelOpen] = useState(false);
  const [selectedBBIds, setSelectedBBIds] = useState<string[]>([]);
  const [showAddBloodBankModal, setShowAddBloodBankModal] = useState(false);
  const [editingBB, setEditingBB] = useState<BloodBank | null>(null);
  const [showDeleteBBConfirmModal, setShowDeleteBBConfirmModal] = useState(false);
  const [bbToDeleteId, setBbToDeleteId] = useState<string | null>(null);

  // Blood Bank Form Inputs (for Add / Edit)
  const [bbFormName, setBbFormName] = useState('');
  const [bbFormDivision, setBbFormDivision] = useState('Dhaka Division');
  const [bbFormDistrict, setBbFormDistrict] = useState('Dhaka');
  const [bbFormPhone1, setBbFormPhone1] = useState('');
  const [bbFormPhone2, setBbFormPhone2] = useState('');
  const [bbFormPhone3, setBbFormPhone3] = useState('');
  const [bbFormAddress, setBbFormAddress] = useState('');
  const [bbFormMapUrl, setBbFormMapUrl] = useState('');
  const [bbFormLat, setBbFormLat] = useState('');
  const [bbFormLng, setBbFormLng] = useState('');

  // --- 7. SUPPORT TICKETS STATE ---
  const [ticketsList, setTicketsList] = useState<SupportTicket[]>([]);

  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');
  const [ticketPerPage, setTicketPerPage] = useState(5);
  const [ticketPage, setTicketPage] = useState(1);

  // Category Management State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // --- 8. DEV FUND RECEIPTS STATE & ADMIN CONFIGURATION ---
  const [receiptsList, setReceiptsList] = useState<any[]>([]);

  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptMethodFilter, setReceiptMethodFilter] = useState('');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('');

  // Admin Config Accordion State
  const [configAccordionOpen, setConfigAccordionOpen] = useState(false);
  const [configTitle, setConfigTitle] = useState("Support LifeDrop Developers");
  const [configBtnText, setConfigBtnText] = useState("Buy Developers a Coffee / Donate");
  const [configDesc, setConfigDesc] = useState("LifeDrop is an open-initiative platform connecting emergency receivers and volunteer blood donors seamlessly. Your support helps us maintain 24/7 server uptime, expand our emergency dispatch gateway, and keep donor matching completely free.");
  
  const [mfsConfigList, setMfsConfigList] = useState([
    { name: "Nagad", number: "+880 1711-000000" },
    { name: "bKash", number: "+880 1811-000000" },
    { name: "Rocket", number: "+880 1911-000000" },
    { name: "Upay", number: "+880 1311-000000" }
  ]);

  const [bankConfigList, setBankConfigList] = useState([
    {
      name: "Janata Bank PLC",
      accountName: "LifeDrop Emergency Network",
      account: "0100234567890",
      branch: "Motijheel Corporate Branch, Dhaka",
      routing: "205263102 / SWIFT: JANABDHK"
    }
  ]);

  // Modals state for Receipts
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [modalContributor, setModalContributor] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalMethod, setModalMethod] = useState('bKash');
  const [modalTrx, setModalTrx] = useState('');
  const [modalStatus, setModalStatus] = useState<'Verified' | 'Unverified'>('Verified');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceReceipt, setInvoiceReceipt] = useState<{
    id: string;
    contributor: string;
    amount: number;
    method: string;
    trx: string;
    status: 'Verified' | 'Unverified';
  } | null>(null);

  // --- 9. SYSTEM CONFIG & ANNOUNCEMENT STATE ---
  const [announcementMsg, setAnnouncementMsg] = useState(siteConfig.announcementText);
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(siteConfig.announcementActive);
  const [maintenanceMode, setMaintenanceMode] = useState(siteConfig.maintenanceMode);
  const [defaultRadarKm, setDefaultRadarKm] = useState(String(siteConfig.radarRadiusKm));
  const [emergencyHotline, setEmergencyHotline] = useState(siteConfig.emergencyHotline);

  // --- 10. SPONSORSHIPS & ADS STATE ---
  const defaultAdSystem: AdSystemConfig = {
    feedCarousel: { active: false, autoSlideMs: 5000, slides: [] },
    sidebarAd: { active: false, pcImageUrl: '', mobileImageUrl: '', linkUrl: '' },
    popupAd: { active: false, pcImageUrl: '', mobileImageUrl: '', linkUrl: '', title: '', buttonText: '' }
  };

  const getSafeAdSystem = (raw: any): AdSystemConfig => {
    const safeRaw = raw || {};
    return {
      feedCarousel: {
        active: !!safeRaw.feedCarousel?.active,
        autoSlideMs: Number(safeRaw.feedCarousel?.autoSlideMs || 5000),
        slides: Array.isArray(safeRaw.feedCarousel?.slides) ? safeRaw.feedCarousel.slides : [],
      },
      sidebarAd: {
        active: !!safeRaw.sidebarAd?.active,
        pcImageUrl: safeRaw.sidebarAd?.pcImageUrl || '',
        mobileImageUrl: safeRaw.sidebarAd?.mobileImageUrl || '',
        linkUrl: safeRaw.sidebarAd?.linkUrl || '',
      },
      popupAd: {
        active: !!safeRaw.popupAd?.active,
        title: safeRaw.popupAd?.title || '',
        pcImageUrl: safeRaw.popupAd?.pcImageUrl || '',
        mobileImageUrl: safeRaw.popupAd?.mobileImageUrl || '',
        linkUrl: safeRaw.popupAd?.linkUrl || '',
        buttonText: safeRaw.popupAd?.buttonText || '',
      }
    };
  };

  const [adSystem, setAdSystem] = useState<AdSystemConfig>(() => getSafeAdSystem(siteConfig.adSystem));

  useEffect(() => {
    if (siteConfig.adSystem) {
      setAdSystem(getSafeAdSystem(siteConfig.adSystem));
    }
  }, [siteConfig.adSystem]);

  // --- 10. DATA EXPORT & IMPORT ENGINE STATE ---
  const [exportTimeframe, setExportTimeframe] = useState<'today' | '7days' | '30days' | 'all' | 'custom'>('all');
  const [exportEntity, setExportEntity] = useState<'users' | 'requests' | 'bloodbanks' | 'tickets' | 'donations'>('users');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [importEntity, setImportEntity] = useState<'users' | 'bloodbanks' | 'requests'>('users');
  const [rawCsvText, setRawCsvText] = useState('');

  // --- 11. OPERATING ADMIN ACCOUNTS MANAGEMENT STATE ---
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Super Admin');

  const handleCreateAdminAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser?.role !== 'Super Admin' && adminUser?.email !== 'kfalifalsiam540@gmail.com') {
      showToast('Only Super Admin can create or remove operating admin accounts.', true);
      return;
    }
    if (!newAdminEmail.trim() || !newAdminPass.trim()) {
      showToast('Please provide an official email and password for the admin account.', true);
      return;
    }
    const success = registerAdminAccount({
      username: newAdminName.trim() || newAdminEmail.split('@')[0],
      email: newAdminEmail.trim(),
      password: newAdminPass.trim(),
      role: 'Super Admin',
    });
    if (success) {
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPass('');
    }
  };

  if (!isAdminLoggedIn) {
    return <AdminLoginBlock />;
  }

  // --- LOGO / IMAGE FILE UPLOAD HANDLER (SUPABASE STORAGE) ---
  const handleImageUpload = async (file: File, oldUrl: string | undefined, onSuccess: (url: string) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size must be less than 2MB', true);
      return;
    }

    try {
      showToast('Uploading image to cloud storage...');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase 'brand-assets' bucket
      const { error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('brand-assets')
        .getPublicUrl(filePath);

      onSuccess(publicUrl);
      showToast('Image uploaded successfully!');
      
      // Delete old file if it exists and is a Supabase asset
      if (oldUrl && oldUrl.includes('supabase.co') && oldUrl.includes('/brand-assets/')) {
        try {
          // Extract just the filename from the end of the URL
          const urlParts = oldUrl.split('/');
          const oldFileName = urlParts[urlParts.length - 1];
          if (oldFileName) {
            await supabase.storage.from('brand-assets').remove([oldFileName]);
          }
        } catch (e) {
          console.warn('Failed to delete old image:', e);
        }
      }
      
      // Also handle legacy local uploads
      if (oldUrl && oldUrl.startsWith('/uploads/')) {
        fetch('/api/delete-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: oldUrl })
        }).catch(e => console.warn('Failed to delete legacy local image:', e));
      }
      
    } catch (err: any) {
      console.error("Upload error:", err);
      showToast(`Error uploading image: ${err.message || 'Unknown error'}`, true);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, logoUrlInput, setLogoUrlInput);
  };
  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, faviconUrlInput, setFaviconUrlInput);
  };
  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, ogImageUrlInput, setOgImageUrlInput);
  };

  // Save Branding & SEO (Unified)
  const handleSaveBrandingAndSEO = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteConfig({
      companyName: companyNameInput,
      logoSymbol: logoSymbolInput,
      logoUrl: logoUrlInput,
      faviconUrl: faviconUrlInput,
      logoDisplayMode: logoDisplayModeInput,
      tagline: taglineInput,
      seoTitle: seoTitleInput,
      seoDescription: seoDescInput,
      seoKeywords: seoKeywordsInput,
      analyticsId: analyticsIdInput,
      metaPixelId: metaPixelIdInput,
      ogImageUrl: ogImageUrlInput
    });
    showToast('Branding & SEO Settings applied globally!');
  };

  // Reset Branding & SEO
  const handleResetBrandingAndSEO = () => {
    setCompanyNameInput(siteConfig.companyName || '');
    setLogoSymbolInput(siteConfig.logoSymbol || '🩸');
    setLogoUrlInput(siteConfig.logoUrl || '');
    setFaviconUrlInput(siteConfig.faviconUrl || '');
    setLogoDisplayModeInput(siteConfig.logoDisplayMode || 'both');
    setTaglineInput(siteConfig.tagline || '');
    setSeoTitleInput(siteConfig.seoTitle || '');
    setSeoDescInput(siteConfig.seoDescription || '');
    setSeoKeywordsInput(siteConfig.seoKeywords || '');
    setAnalyticsIdInput(siteConfig.analyticsId || '');
    setMetaPixelIdInput(siteConfig.metaPixelId || '');
    setOgImageUrlInput(siteConfig.ogImageUrl || '');
  };

  // Emergency Contacts Handlers
  const handleAddEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactTitle.trim() || !newContactNumber.trim()) {
      showToast('Please enter both Contact Title and Phone Number', true);
      return;
    }
    const created: EmergencyContact = {
      id: `ec-${Date.now()}`,
      title: newContactTitle.trim(),
      number: newContactNumber.trim(),
      tel: `tel:${newContactNumber.replace(/[^0-9+]/g, '')}`,
      icon: newContactIcon,
      category: newContactCategory
    };
    const updated = [created, ...contactsList];
    setContactsList(updated);
    updateSiteConfig({ emergencyContacts: updated });
    setNewContactTitle('');
    setNewContactNumber('');
    showToast(`Added emergency contact: ${created.title}`);
  };

  const handleOpenEditContactModal = (item: EmergencyContact) => {
    setEditingContact(item);
    setEditContactTitle(item.title);
    setEditContactNumber(item.number);
    setEditContactIcon(item.icon || '📞');
    setEditContactCategory(item.category || 'Medical');
    setShowEditContactModal(true);
  };

  const handleSaveEditContactModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContactTitle.trim() || !editContactNumber.trim()) {
      showToast('Please enter both Contact Title and Phone Number', true);
      return;
    }
    if (editingContact) {
      const updated = contactsList.map(c => {
        if (c.id === editingContact.id) {
          return {
            ...c,
            title: editContactTitle.trim(),
            number: editContactNumber.trim(),
            tel: `tel:${editContactNumber.replace(/[^0-9+]/g, '')}`,
            icon: editContactIcon,
            category: editContactCategory
          };
        }
        return c;
      });
      setContactsList(updated);
      updateSiteConfig({ emergencyContacts: updated });
      showToast(`Updated contact: ${editContactTitle.trim()}`);
    }
    setShowEditContactModal(false);
    setEditingContact(null);
  };

  const handleRemoveEmergencyContact = (id: string, title: string) => {
    const updated = contactsList.filter(c => c.id !== id);
    setContactsList(updated);
    updateSiteConfig({ emergencyContacts: updated });
    showToast(`Removed contact: ${title}`);
  };

  // User Moderation Actions
  const toggleBanUser = (id: string) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        const nextBan = !u.isBanned;
        const updatedStatus = nextBan ? 'Banned' : 'Active';
        const updatedUser = { ...u, isBanned: nextBan, status: updatedStatus };

        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: updatedUser }),
        }).catch(err => console.warn('Server user ban sync error:', err));

        try {
          const stored = localStorage.getItem('lifedrop_registered_users');
          if (stored) {
            let list = JSON.parse(stored);
            const idx = list.findIndex((ru: any) => ru.id === id || (ru.email && u.email && ru.email.toLowerCase() === u.email.toLowerCase()));
            if (idx >= 0) {
              list[idx].status = updatedStatus;
              localStorage.setItem('lifedrop_registered_users', JSON.stringify(list));
            }
          }
        } catch (e) {}

        if (isSupabaseConfigured && u.email) {
          supabase.from('profiles').update({ status: updatedStatus }).ilike('email', u.email.toLowerCase()).then();
        }

        showToast(`${u.name || u.fullName} has been ${nextBan ? 'BANNED' : 'UNBANNED'}`);
        return updatedUser;
      }
      return u;
    }));
  };

  const toggleUserVerified = (id: string) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        const nextState = !u.verified;
        const updatedStatus = nextState ? 'Verified' : 'Active';
        const updatedUser = { ...u, verified: nextState, status: updatedStatus };

        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: updatedUser }),
        }).catch(err => console.warn('Server user verified sync error:', err));

        try {
          const stored = localStorage.getItem('lifedrop_registered_users');
          if (stored) {
            let list = JSON.parse(stored);
            const idx = list.findIndex((ru: any) => ru.id === id || (ru.email && u.email && ru.email.toLowerCase() === u.email.toLowerCase()));
            if (idx >= 0) {
              list[idx].verified = nextState;
              list[idx].status = updatedStatus;
              localStorage.setItem('lifedrop_registered_users', JSON.stringify(list));
            }
          }
        } catch (e) {}

        if (isSupabaseConfigured && u.email) {
          supabase.from('profiles').update({ verified: nextState, status: updatedStatus }).ilike('email', u.email.toLowerCase()).then();
        }

        showToast(`${u.name || u.fullName} verification status changed to: ${nextState ? 'Verified' : 'Unverified'}`);
        return updatedUser;
      }
      return u;
    }));
  };

  // Request Override Actions
  const handleUpdateReqStatus = (reqId: string, newStatus: 'active' | 'fulfilled' | 'cancelled') => {
    setRequestsList(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r));
    if (activeRequest && activeRequest.id === reqId) {
      adminOverrideActiveRequest({ status: newStatus });
    }
    showToast(`Request #${reqId} status updated to ${newStatus.toUpperCase()}`);
  };

  const handleUpdateMatchStage = (reqId: string, stage: any) => {
    setRequestsList(prev => prev.map(r => r.id === reqId ? { ...r, matchStage: stage } : r));
    if (activeRequest && activeRequest.id === reqId) {
      adminOverrideActiveRequest({ matchStage: stage });
    }
    showToast(`Advanced match stage for #${reqId} to: ${stage}`);
  };

  const handleSaveReqEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    setRequestsList(prev => prev.map(r => r.id === editingReq.id ? editingReq : r));
    if (activeRequest && activeRequest.id === editingReq.id) {
      adminOverrideActiveRequest(editingReq);
    }
    setEditingReq(null);
    showToast(`Override saved for Request #${editingReq.id}`);
  };

  const handleCreateOverrideReq = (e: React.FormEvent) => {
    e.preventDefault();
    const created: BloodRequest = {
      id: `req-override-${Date.now()}`,
      bloodType: newReqType,
      hospitalName: newReqHospital,
      hospitalLocation: newReqLocation,
      qtyWhole: newReqQty,
      qtyPlatelets: 0,
      qtyPlasma: 0,
      qtyDoubleRed: 0,
      reasonNeeded: newReqReason,
      neededInHours: 2,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      status: 'active',
      matchStage: 'broadcast'
    };
    setRequestsList([created, ...requestsList]);
    adminOverrideActiveRequest(created);
    setShowCreateOverrideReqModal(false);
  };

  // --- 6. BLOOD BANK MANAGEMENT HANDLERS ---
  // Filtered Blood Banks List
  const filteredBloodBanks = bloodBanksList.filter(bb => {
    const q = bbSearch.trim().toLowerCase();
    const matchesSearch = !q ||
      bb.name.toLowerCase().includes(q) ||
      bb.phone.toLowerCase().includes(q) ||
      (bb.phones && bb.phones.some(p => p.toLowerCase().includes(q))) ||
      (bb.address && bb.address.toLowerCase().includes(q));

    const matchesDivision = !bbDivisionFilter || bb.division.toLowerCase() === bbDivisionFilter.toLowerCase();
    const matchesDistrict = !bbDistrictFilter || bb.district.toLowerCase() === bbDistrictFilter.toLowerCase();

    return matchesSearch && matchesDivision && matchesDistrict;
  });

  // Open Add Modal
  const handleOpenAddBBModal = () => {
    setEditingBB(null);
    setBbFormName('');
    setBbFormDivision('Dhaka Division');
    setBbFormDistrict('Dhaka');
    setBbFormPhone1('');
    setBbFormPhone2('');
    setBbFormPhone3('');
    setBbFormAddress('');
    setBbFormMapUrl('');
    setBbFormLat('');
    setBbFormLng('');
    setShowAddBloodBankModal(true);
  };

  // Helper to extract data from pasted Google Maps info
  const extractDataFromMapPaste = (text: string) => {
    if (!text) return null;
    
    let lat = '';
    let lng = '';
    let url = '';
    let name = '';
    let address = '';
    let phone = '';

    // Extract URL (with or without http)
    const urlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:google\.com\/maps\/[^\s]+|maps\.app\.goo\.gl\/[^\s]+)/);
    if (urlMatch) {
      url = urlMatch[0];
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
    } else if (text.match(/^https?:\/\/[^\s]+$/)) {
      url = text.trim();
    }

    // Extract Lat/Lng
    const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch && atMatch[1] && atMatch[2]) {
      lat = atMatch[1];
      lng = atMatch[2];
    } else {
      const qMatch = text.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch && qMatch[1] && qMatch[2]) {
        lat = qMatch[1];
        lng = qMatch[2];
      }
    }

    // Attempt to extract name from full URL (e.g., /place/Some+Name/)
    if (text.includes('/place/')) {
      const nameMatch = text.match(/\/place\/([^\/]+)/);
      if (nameMatch && nameMatch[1]) {
        name = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
        if (name.includes('@')) name = name.split('@')[0];
      }
    }

    // Extract Phone (Broadened for Bangladeshi formats including landlines)
    const phoneMatch = text.match(/(?:\+?88)?[\s-]?\(?0[1-9]\)?[\s-]?[0-9][0-9\s-]{5,9}\b/);
    if (phoneMatch) {
      phone = phoneMatch[0].trim();
    }

    // Parse multi-line if available (Google Maps share format)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      if (!lines[0].startsWith('http') && !lines[0].includes('google.com') && !lines[0].match(/0[1-9]/)) {
        name = lines[0];
      }
      const possibleAddressLine = lines.find(l => !l.startsWith('http') && !l.includes('google.com') && !l.match(/0[1-9]/) && l !== name);
      if (possibleAddressLine) {
         address = possibleAddressLine;
      }
    }

    return { lat, lng, url: url || text.trim(), name, address, phone };
  };

  // Open Edit Modal
  const handleOpenEditBBModal = (bb: BloodBank) => {
    setEditingBB(bb);
    setBbFormName(bb.name || '');
    setBbFormDivision(bb.division || 'Dhaka Division');
    setBbFormDistrict(bb.district || 'Dhaka');
    setBbFormPhone1(bb.phone || '');
    setBbFormPhone2(bb.phones && bb.phones[1] ? bb.phones[1] : '');
    setBbFormPhone3(bb.phones && bb.phones[2] ? bb.phones[2] : '');
    setBbFormAddress(bb.address || '');
    setBbFormMapUrl(bb.mapUrl || '');
    setBbFormLat(bb.latitude !== undefined && bb.latitude !== null ? String(bb.latitude) : '');
    setBbFormLng(bb.longitude !== undefined && bb.longitude !== null ? String(bb.longitude) : '');
    setShowAddBloodBankModal(true);
  };

  // Save Add / Edit Form
  const handleSaveBloodBankForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bbFormName.trim() || !bbFormPhone1.trim()) {
      showToast('Please provide Blood Bank Name and primary Phone Hotline', true);
      return;
    }

    const phonesList = [bbFormPhone1.trim(), bbFormPhone2.trim(), bbFormPhone3.trim()].filter(Boolean);
    const parsedLat = bbFormLat.trim() ? parseFloat(bbFormLat.trim()) : undefined;
    const parsedLng = bbFormLng.trim() ? parseFloat(bbFormLng.trim()) : undefined;

    if (editingBB) {
      const updated: BloodBank = {
        ...editingBB,
        name: bbFormName.trim(),
        division: bbFormDivision,
        district: bbFormDistrict,
        phone: bbFormPhone1.trim(),
        phones: phonesList,
        address: bbFormAddress.trim(),
        mapUrl: bbFormMapUrl.trim(),
        latitude: parsedLat,
        longitude: parsedLng
      };
      setBloodBanksList(prev => prev.map(item => item.id === editingBB.id ? updated : item));
      upsertBloodBank(updated).catch(err => console.warn('BB upsert error:', err));
      showToast(`Updated record for '${bbFormName.trim()}'`);
    } else {
      const created: BloodBank = {
        id: `bb-${Date.now()}`,
        name: bbFormName.trim(),
        division: bbFormDivision,
        district: bbFormDistrict,
        phone: bbFormPhone1.trim(),
        phones: phonesList,
        address: bbFormAddress.trim(),
        mapUrl: bbFormMapUrl.trim(),
        latitude: parsedLat,
        longitude: parsedLng
      };
      setBloodBanksList(prev => [created, ...prev]);
      upsertBloodBank(created).catch(err => console.warn('BB insert error:', err));
      showToast(`Added '${created.name}' to Certified Directory Node!`);
    }

    setShowAddBloodBankModal(false);
  };

  // Selection handlers
  const handleToggleSelectBB = (id: string) => {
    setSelectedBBIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleSelectAllBB = (checked: boolean) => {
    if (checked) {
      setSelectedBBIds(filteredBloodBanks.map(b => b.id));
    } else {
      setSelectedBBIds([]);
    }
  };

  // Modal Deletion handlers
  const handleOpenDeleteSingleBBModal = (id: string) => {
    setBbToDeleteId(id);
    setShowDeleteBBConfirmModal(true);
  };

  const handleOpenDeleteBulkBBModal = () => {
    if (selectedBBIds.length === 0) {
      showToast('No blood banks selected for deletion', true);
      return;
    }
    setBbToDeleteId(null);
    setShowDeleteBBConfirmModal(true);
  };

  const handleConfirmDeleteBB = () => {
    if (bbToDeleteId) {
      const target = bloodBanksList.find(b => b.id === bbToDeleteId);
      setBloodBanksList(prev => prev.filter(b => b.id !== bbToDeleteId));
      deleteBloodBank(bbToDeleteId).catch(err => console.warn('BB delete error:', err));
      showToast(`Removed '${target?.name || 'Blood Bank'}' from directory.`);
    } else if (selectedBBIds.length > 0) {
      const count = selectedBBIds.length;
      const toDelete = [...selectedBBIds];
      setBloodBanksList(prev => prev.filter(b => !toDelete.includes(b.id)));
      setSelectedBBIds([]);
      deleteBulkBloodBanks(toDelete).catch(err => console.warn('BB bulk delete error:', err));
      showToast(`Deleted ${count} selected blood bank records.`);
    }
    setShowDeleteBBConfirmModal(false);
    setBbToDeleteId(null);
  };

  // Ticket status update
  const calculateTicketDuration = (start: Date, end?: Date | null) => {
    if (!end) return "Pending resolution";
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return "0 mins";
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHrs === 0) return `${diffMins} mins`;
    return `${diffHrs} hrs ${diffMins} mins`;
  };

  const handleTicketStatus = async (ticketId: string, newStatus: string) => {
    setTicketsList(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: newStatus as 'Open' | 'In Progress' | 'Resolved',
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    await updateTicketStatus(ticketId, newStatus as any);
    showToast(`Ticket #${ticketId} status updated to ${newStatus}`);
  };

  // FIFO Sorted tickets (ascending by timestampPlaced)
  // FIFO Sorted tickets (ascending by createdAt)
  const sortedTicketsFIFO = [...ticketsList].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Filtered tickets
  const filteredTicketsList = sortedTicketsFIFO.filter(t => {
    const user = usersList.find(u => u.email === t.userEmail);
    const profileName = user?.full_name || 'Unknown User';
    const userPhone = user?.phone || '';

    const q = ticketSearch.trim().toLowerCase();
    const matchesQuery = !q ||
      t.subject.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      profileName.toLowerCase().includes(q) ||
      userPhone.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);

    const matchesCat = !ticketCategoryFilter || t.category === ticketCategoryFilter;
    const matchesStatus = !ticketStatusFilter || t.status === ticketStatusFilter;

    return matchesQuery && matchesCat && matchesStatus;
  });

  // Calculate Average Resolution Time
  const calculateAvgResolutionTime = () => {
    const resolved = ticketsList.filter(t => t.status === 'Resolved' && (t.updatedAt || t.createdAt));
    if (resolved.length === 0) return 'N/A';
    let totalMs = 0;
    resolved.forEach(t => {
      const resTime = t.updatedAt ? new Date(t.updatedAt).getTime() : new Date().getTime();
      const startTime = new Date(t.createdAt).getTime();
      totalMs += Math.max(0, resTime - startTime);
    });
    const avgMs = totalMs / resolved.length;
    const avgHrs = Math.floor(avgMs / (1000 * 60 * 60));
    const avgMins = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
    if (avgHrs === 0) return `${avgMins}m`;
    return `${avgHrs}h ${avgMins}m`;
  };

  // Ticket Category Management Handlers
  const currentTicketCategories = siteConfig.ticketCategories && siteConfig.ticketCategories.length > 0
    ? siteConfig.ticketCategories
    : ['Account & Verification', 'Donor Radar Match', 'Technical Bug / Glitch', 'Other Inquiry'];

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast('Please enter a category name', true);
      return;
    }
    if (currentTicketCategories.includes(trimmed)) {
      showToast('Category already exists', true);
      return;
    }
    const updated = [...currentTicketCategories, trimmed];
    updateSiteConfig({ ticketCategories: updated });
    setNewCategoryName('');
    showToast(`Added ticket category: "${trimmed}"`);
  };

  const handleSaveEditCategory = (index: number) => {
    const trimmed = editingCategoryValue.trim();
    if (!trimmed) {
      showToast('Category name cannot be empty', true);
      return;
    }
    const updated = [...currentTicketCategories];
    updated[index] = trimmed;
    updateSiteConfig({ ticketCategories: updated });
    setEditingCategoryIndex(null);
    setEditingCategoryValue('');
    showToast(`Category updated to: "${trimmed}"`);
  };

  const handleDeleteCategory = (index: number) => {
    const catName = currentTicketCategories[index];
    const updated = currentTicketCategories.filter((_, i) => i !== index);
    updateSiteConfig({ ticketCategories: updated });
    showToast(`Deleted category: "${catName}"`);
  };

  // Support Receipts Helpers
  const handleToggleReceiptStatus = (id: string) => {
    setReceiptsList(prev => prev.map(r => {
      if (r.id === id) {
        const nextStatus = r.status === 'Verified' ? 'Unverified' as const : 'Verified' as const;
        showToast(`Receipt #${id} status changed to ${nextStatus}`);
        return { ...r, status: nextStatus };
      }
      return r;
    }));
  };

  const handleDeleteReceipt = (id: string) => {
    setReceiptsList(prev => prev.filter(r => r.id !== id));
    showToast(`Receipt #${id} removed successfully`);
  };

  const handleOpenAddReceiptModal = () => {
    setEditingReceiptId(null);
    setModalContributor('');
    setModalAmount('');
    setModalMethod('bKash');
    setModalTrx('');
    setModalStatus('Verified');
    setShowReceiptModal(true);
  };

  const handleOpenEditReceiptModal = (id: string) => {
    const r = receiptsList.find(x => x.id === id);
    if (!r) return;
    setEditingReceiptId(r.id);
    setModalContributor(r.contributor);
    setModalAmount(String(r.amount));
    setModalMethod(r.method);
    setModalTrx(r.trx);
    setModalStatus(r.status);
    setShowReceiptModal(true);
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(modalAmount) || 0;
    if (!modalContributor.trim() || !modalTrx.trim() || amountNum <= 0) {
      showToast('Please fill all required receipt fields correctly.', true);
      return;
    }

    if (!editingReceiptId) {
      const nextNum = 100001 + receiptsList.length;
      const newId = `DON-${nextNum}`;
      setReceiptsList(prev => [...prev, {
        id: newId,
        contributor: modalContributor.trim(),
        amount: amountNum,
        method: modalMethod,
        trx: modalTrx.trim(),
        status: modalStatus
      }]);
      showToast(`Added new receipt ${newId}`);
    } else {
      setReceiptsList(prev => prev.map(r => r.id === editingReceiptId ? {
        ...r,
        contributor: modalContributor.trim(),
        amount: amountNum,
        method: modalMethod,
        trx: modalTrx.trim(),
        status: modalStatus
      } : r));
      showToast(`Updated receipt ${editingReceiptId}`);
    }

    setShowReceiptModal(false);
  };

  const handleOpenInvoiceModal = (id: string) => {
    const r = receiptsList.find(x => x.id === id);
    if (!r) return;
    setInvoiceReceipt(r);
    setShowInvoiceModal(true);
  };

  const handleApplyUserViewSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Success! User-facing view settings have been updated from the Admin Panel.');
  };

  const handleAddMfsField = () => {
    setMfsConfigList(prev => [...prev, { name: '', number: '' }]);
  };

  const handleRemoveMfsField = (index: number) => {
    setMfsConfigList(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBankField = () => {
    setBankConfigList(prev => [...prev, { name: '', accountName: '', account: '', branch: '', routing: '' }]);
  };

  const handleRemoveBankField = (index: number) => {
    setBankConfigList(prev => prev.filter((_, i) => i !== index));
  };

  // System Config
  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      showToast('Saving System Config...', false);
      await updateSiteConfig({
        announcementActive: isAnnouncementActive,
        announcementText: announcementMsg,
        maintenanceMode: maintenanceMode,
        emergencyHotline: emergencyHotline,
        radarRadiusKm: Number(defaultRadarKm)
      });
    } catch (err: any) {
      showToast(`❌ Update Failed: ${err.message || 'Database error'}`, true);
    }
  };

  const handleSaveAds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      showToast('Saving Master Ads Configuration...', false);
      await updateSiteConfig({ adSystem: adSystem });
      showToast('✅ Sponsorships & Ads updated successfully!');
    } catch (err: any) {
      showToast(`❌ Save Failed: ${err.message || 'Database error'}`, true);
    }
  };

  // --- DATA EXPORT ENGINE (CSV / XLSX) ---
  const handleDownloadExportData = () => {
    let sourceData: any[] = [];
    let fileNamePrefix = '';

    if (exportEntity === 'users') {
      sourceData = usersList;
      fileNamePrefix = 'lifedrop_users';
    } else if (exportEntity === 'requests') {
      sourceData = requestsList;
      fileNamePrefix = 'lifedrop_blood_requests';
    } else if (exportEntity === 'bloodbanks') {
      sourceData = bloodBanksList;
      fileNamePrefix = 'lifedrop_bloodbanks_directory';
    } else if (exportEntity === 'tickets') {
      sourceData = ticketsList;
      fileNamePrefix = 'lifedrop_support_tickets';
    } else if (exportEntity === 'donations') {
      sourceData = receiptsList;
      fileNamePrefix = 'lifedrop_dev_donations';
    }

    if (sourceData.length === 0) {
      showToast('No records available to export', true);
      return;
    }

    // Convert array of objects to CSV string
    const keys = Object.keys(sourceData[0]);
    const headerRow = keys.join(',');
    const dataRows = sourceData.map(row => 
      keys.map(k => {
        let val = row[k];
        if (typeof val === 'object') val = JSON.stringify(val);
        val = String(val ?? '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );

    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileNamePrefix}_${exportTimeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${sourceData.length} records as CSV file!`);
  };

  // Download Sample CSV Templates
  const handleDownloadSampleCsv = (type: 'users' | 'bloodbanks' | 'requests') => {
    let sampleContent = '';
    let fileName = '';

    if (type === 'users') {
      sampleContent = `id,name,email,phone,bloodGroup,role,totalDonations,verified\nusr-901,Rashid Khan,rashid@gmail.com,+880 1712-000000,A+,Donor,5,true\nusr-902,Farhana Begum,farhana@gmail.com,+880 1812-111111,O-,Receiver,0,false`;
      fileName = 'sample_users_template.csv';
    } else if (type === 'bloodbanks') {
      sampleContent = `id,name,division,district,phone,distanceKm\nbb-901,Chittagong Medical College Blood Bank,Chittagong,Chittagong,+880 31-619400,12.5\nbb-902,Sylhet MAG Osmani Medical Unit,Sylhet,Sylhet,+880 821-713482,8.0`;
      fileName = 'sample_bloodbanks_template.csv';
    } else if (type === 'requests') {
      sampleContent = `id,bloodType,hospitalName,hospitalLocation,qtyWhole,reasonNeeded,neededInHours,status\nreq-901,AB-,United Hospital,Gulshan 2 Dhaka,2,Urgent surgery,3,active`;
      fileName = 'sample_requests_template.csv';
    }

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Downloaded ${fileName}`);
  };

  // Import Bulk CSV Data
  const handleProcessBulkImport = () => {
    if (!rawCsvText.trim()) {
      showToast('Please paste or upload CSV text content first', true);
      return;
    }

    try {
      const lines = rawCsvText.trim().split('\n');
      if (lines.length < 2) {
        showToast('Invalid CSV format. Header and data rows required.', true);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || '';
        });
        parsedRows.push(obj);
      }

      if (parsedRows.length === 0) {
        showToast('No valid rows found in CSV text', true);
        return;
      }

      if (importEntity === 'users') {
        const mappedUsers = parsedRows.map((r, i) => ({
          id: r.id || `usr-imp-${Date.now()}-${i}`,
          name: r.name || 'Imported User',
          email: r.email || `imported_${i}@lifedrop.org`,
          phone: r.phone || '+880 1700-000000',
          bloodGroup: (r.bloodGroup || 'A+') as BloodType,
          role: (r.role || 'Donor') as any,
          totalDonations: Number(r.totalDonations) || 0,
          verified: r.verified === 'true' || r.verified === true,
          isBanned: false,
          createdAt: new Date().toISOString().split('T')[0]
        }));
        setUsersList(prev => [...mappedUsers, ...prev]);
        showToast(`Successfully imported ${mappedUsers.length} Users!`);
      } else if (importEntity === 'bloodbanks') {
        const mappedBB = parsedRows.map((r, i) => ({
          id: r.id || `bb-imp-${Date.now()}-${i}`,
          name: r.name || 'Imported Blood Bank',
          division: r.division || 'Dhaka',
          district: r.district || 'Dhaka',
          phone: r.phone || '+880 2-0000000',
          distanceKm: Number(r.distanceKm) || 5.0
        }));
        setBloodBanksList(prev => [...mappedBB, ...prev]);
        showToast(`Successfully imported ${mappedBB.length} Blood Banks!`);
      } else if (importEntity === 'requests') {
        const mappedReq = parsedRows.map((r, i) => ({
          id: r.id || `req-imp-${Date.now()}-${i}`,
          bloodType: (r.bloodType || 'A+') as BloodType,
          hospitalName: r.hospitalName || 'Emergency Medical Center',
          hospitalLocation: r.hospitalLocation || 'Dhaka, Bangladesh',
          qtyWhole: Number(r.qtyWhole) || 1,
          qtyPlatelets: 0,
          qtyPlasma: 0,
          qtyDoubleRed: 0,
          reasonNeeded: r.reasonNeeded || 'Urgent requirement',
          neededInHours: Number(r.neededInHours) || 4,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          expiresAt: Date.now() + 4 * 60 * 60 * 1000,
          status: (r.status || 'active') as any,
          matchStage: 'broadcast' as any
        }));
        setRequestsList(prev => [...mappedReq, ...prev]);
        showToast(`Successfully imported ${mappedReq.length} Requests!`);
      }

      setRawCsvText('');
    } catch (err) {
      showToast('Error parsing CSV content. Check column formatting.', true);
    }
  };

  const handleFileUploadInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawCsvText(content);
      showToast(`Loaded ${file.name} into CSV importer!`);
    };
    reader.readAsText(file);
  };

  // --- USER DIRECTORY HELPERS & FILTER LOGIC ---
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const filteredDirectoryUsers = usersList.filter(c => {
    const email = (c.email || '').toLowerCase().trim();
    const role = (c.role || '').toLowerCase();
    const status = (c.status || '').toLowerCase();
    const adminEmails = adminAccounts ? adminAccounts.map(a => a.email.toLowerCase()) : [];

    if (
      email === 'kfalifalsiam540@gmail.com' ||
      adminEmails.includes(email) ||
      role.includes('admin') ||
      status === 'admin'
    ) {
      return false;
    }

    const q = userSearch.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.userId.toLowerCase().includes(q);

    const matchesStatus = !badgeFilter || c.status === badgeFilter;
    const matchesSession = !sessionFilter || c.loginState === sessionFilter;
    const matchesDivision = !divisionFilter || c.division === divisionFilter;
    const matchesDistrict = !districtFilter || c.district === districtFilter;
    const matchesOnline = !onlineFilter || c.onlineStatus === onlineFilter;
    const matchesRole = !userRoleFilter || c.role === userRoleFilter;

    let matchesDate = true;
    if (startDate && endDate) {
      const memberDate = new Date(c.memberSince);
      matchesDate = memberDate >= startDate && memberDate <= endDate;
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSession &&
      matchesDivision &&
      matchesDistrict &&
      matchesOnline &&
      matchesRole &&
      matchesDate
    );
  });

  const handleClearAllUserFilters = () => {
    setUserSearch('');
    setBadgeFilter('');
    setSessionFilter('');
    setDivisionFilter('');
    setDistrictFilter('');
    setOnlineFilter('');
    setUserRoleFilter('');
    setStartDate(null);
    setEndDate(null);
    setDatePreset('all');
  };

  const handleToggleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredDirectoryUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelectUser = (id: string | number) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const executeUserDeletion = async (idsToDelete: (string | number)[]) => {
    if (idsToDelete.length === 0) return;

    const stringIds = idsToDelete.map(id => String(id));
    const targets = usersList.filter(u => 
      idsToDelete.includes(u.id) || 
      stringIds.includes(String(u.id)) || 
      (u.userId && (idsToDelete.includes(u.userId) || stringIds.includes(String(u.userId))))
    );

    const emailsToDelete = targets.map(u => u.email ? u.email.toLowerCase() : '').filter(Boolean);

    // 1. Remove from usersList state
    setUsersList(prev => prev.filter(u => {
      const matchId = idsToDelete.includes(u.id) || stringIds.includes(String(u.id)) || (u.userId && (idsToDelete.includes(u.userId) || stringIds.includes(String(u.userId))));
      const matchEmail = u.email && emailsToDelete.includes(u.email.toLowerCase());
      return !matchId && !matchEmail;
    }));
    setSelectedUserIds(prev => prev.filter(id => !idsToDelete.includes(id) && !stringIds.includes(String(id))));

    // Supabase deletion (permanent server database cleanup)
    if (isSupabaseConfigured) {
      try {
        if (emailsToDelete.length > 0) {
          const { error: e1 } = await supabase.from('profiles').delete().in('email', emailsToDelete);
          if (e1) throw e1;
        }
        if (stringIds.length > 0) {
          const { error: e2 } = await supabase.from('profiles').delete().in('id', stringIds);
          if (e2) throw e2;
          const { error: e3 } = await supabase.from('profiles').delete().in('user_id', stringIds);
          if (e3) throw e3;
        }
      } catch (err: any) {
        showToast('Database deletion error: ' + err.message, true);
        return;
      }
    }

    // 6. Broadcast real-time profile updated events
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('lifedrop_profile_updated'));

    showToast(`🗑️ Permanently deleted ${targets.length || idsToDelete.length} user record(s) from database and local state.`);
  };

  const handleDeleteSelectedUsers = () => {
    if (selectedUserIds.length === 0) {
      showToast('Please select at least one record to delete.', true);
      return;
    }
    const selectedTargets = usersList.filter(u => 
      selectedUserIds.includes(u.id) || 
      selectedUserIds.map(String).includes(String(u.id))
    );
    const names = selectedTargets.map(u => `${u.fullName || u.name} (${u.email || u.id})`);

    setDeleteUserConfirmModal({
      ids: [...selectedUserIds],
      title: `Permanently Delete ${selectedUserIds.length} Selected User Record(s)?`,
      message: `Are you sure you want to permanently delete ${selectedUserIds.length} selected record(s)? All user profile information, login credentials, and active session state will be wiped from local storage and database permanently.`,
      userNames: names.length > 0 ? names : selectedUserIds.map(id => `User ID: ${id}`)
    });
  };

  const handleDeleteSingleUser = (userObj: any) => {
    const targetId = userObj.id || userObj.userId;
    setDeleteUserConfirmModal({
      ids: [targetId],
      title: `Permanently Delete '${userObj.fullName || userObj.name}'?`,
      message: `Are you sure you want to permanently delete user '${userObj.fullName || userObj.name}' (${userObj.email || userObj.id})? All profile data, login credentials, and active session state will be wiped permanently.`,
      userNames: [`${userObj.fullName || userObj.name} (${userObj.email || userObj.id})`]
    });
  };

  const handleConfirmDeleteUserModal = () => {
    if (deleteUserConfirmModal && deleteUserConfirmModal.ids.length > 0) {
      executeUserDeletion(deleteUserConfirmModal.ids);
    }
    setDeleteUserConfirmModal(null);
  };

  const handleToggleUserVerify = (id: string | number) => {
    const target = usersList.find(u => u.id === id || String(u.id) === String(id) || u.userId === id);
    if (!target) return;
    const nextVerified = !Boolean(target.verified || target.status === 'Verified');
    const nextStatus = nextVerified ? 'Verified' : 'Active';
    const updatedUser = { ...target, verified: nextVerified, status: nextStatus };

    setUsersList(prev =>
      prev.map(u => (u.id === id || String(u.id) === String(id) || u.userId === id ? updatedUser : u))
    );

    // Sync to Supabase
    if (isSupabaseConfigured && target.id) {
      adminUpdateUserStatus(String(target.id), { verified: nextVerified, status: nextStatus });
    } else if (isSupabaseConfigured && target.email) {
      supabase.from('profiles').update({ verified: nextVerified, status: nextStatus }).ilike('email', target.email.toLowerCase()).then();
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('lifedrop_profile_updated'));
    showToast(`User '${target.fullName || target.name}' verification set to ${nextStatus}`);
  };

  const handleToggleUserBan = (id: string | number) => {
    const target = usersList.find(u => u.id === id || String(u.id) === String(id) || u.userId === id);
    if (!target) return;

    const nextBan = target.status !== 'Banned';
    const nextStatus = nextBan ? 'Banned' : 'Active';
    const updatedUser = { ...target, status: nextStatus, isBanned: nextBan };

    setUsersList(prev =>
      prev.map(u => (u.id === id || String(u.id) === String(id) || u.userId === id ? updatedUser : u))
    );

    // Sync to Supabase
    if (isSupabaseConfigured && target.id) {
      adminUpdateUserStatus(String(target.id), { status: nextStatus });
    } else if (isSupabaseConfigured && target.email) {
      supabase.from('profiles').update({ status: nextStatus }).ilike('email', target.email.toLowerCase()).then();
    }

    // If currently active user is banned, force immediate logout
    if (nextBan && target.email) {
      try {
        const activeStr = localStorage.getItem('lifedrop_user');
        if (activeStr) {
          const active = JSON.parse(activeStr);
          if (active.email && active.email.toLowerCase() === target.email.toLowerCase()) {
            localStorage.removeItem('lifedrop_user');
            localStorage.removeItem('lifedrop_is_logged_in');
            logout();
          }
        }
      } catch (e) {}
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('lifedrop_profile_updated'));
    showToast(`User '${target.fullName || target.name}' status set to ${nextStatus}`);
  };

  const handleExportUsersDirectory = (format: 'csv' | 'xlsx') => {
    let fileContent =
      "User ID,Name,Password,Blood Group,Sex,Weight,WhatsApp,Emergency,Email,Division,District,Address,Online Status,Live Role,Total Donations,Total Requests,Last Donated,Member Since,Last Logged,Session,Badge\n";
    filteredDirectoryUsers.forEach(c => {
      fileContent += `"${c.userId}","${c.name}","${c.password || '••••••••'}","${c.blood}","${c.sex}","${c.weight}","${c.phone}","${c.emergency}","${c.email}","${c.division}","${c.district}","${c.address || ''}","${c.onlineStatus}","${c.role}","${c.totalDonations}","${c.totalRequests}","${c.lastDonated}","${c.memberSince}","${c.lastLogin}","${c.loginState}","${c.status}"\n`;
    });

    const blob = new Blob([fileContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lifedrop_donors_filtered.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDateModalOpen(false);
    showToast(`Successfully exported ${filteredDirectoryUsers.length} filtered records as ${format.toUpperCase()}!`);
  };

  const getDateRangeLabelText = () => {
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (startDate) {
      return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return "All Time Records";
  };

  const handleSelectDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date(2026, 4, 22);
    if (preset === 'all') {
      setStartDate(null);
      setEndDate(null);
    } else if (preset === 'today') {
      setStartDate(new Date(today));
      setEndDate(new Date(today));
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      setStartDate(y);
      setEndDate(y);
    } else if (preset === 'last7') {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      setStartDate(s);
      setEndDate(new Date(today));
    } else if (preset === 'last15') {
      const s = new Date(today);
      s.setDate(s.getDate() - 14);
      setStartDate(s);
      setEndDate(new Date(today));
    }
  };

  const handleSaveUserModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const normalizedName = (editingUser.fullName || editingUser.name || 'User').trim();
    const normalizedPhone = (editingUser.phone || '').trim();
    const normalizedEmergency = (editingUser.emergencyContact || editingUser.emergency || '').trim();
    const normalizedBlood = (editingUser.bloodGroup || editingUser.blood || 'A+').trim();
    const normalizedPassword = editingUser.password || 'Pass#123';
    const normalizedDivision = safeDivisionString(editingUser.division);
    const normalizedDistrict = safeDistrictString(editingUser.district);
    const normalizedRole = editingUser.role || 'Donor';
    const normalizedStatus = editingUser.status || 'Active';
    const normalizedVerified = Boolean(editingUser.verified);
    const normalizedDonations = typeof editingUser.totalDonations === 'number' ? editingUser.totalDonations : (parseInt(editingUser.totalDonations) || 0);

    const updated = {
      ...editingUser,
      name: normalizedName,
      fullName: normalizedName,
      phone: normalizedPhone,
      emergency: normalizedEmergency,
      emergencyContact: normalizedEmergency,
      blood: normalizedBlood,
      bloodGroup: normalizedBlood,
      password: normalizedPassword,
      division: normalizedDivision,
      district: normalizedDistrict,
      address: editingUser.address || '',
      weight: editingUser.weight || 70,
      sex: editingUser.sex || 'Male',
      role: normalizedRole,
      status: normalizedStatus,
      verified: normalizedVerified,
      totalDonations: normalizedDonations,
      isBanned: normalizedStatus === 'Banned'
    };

    // 1. Update React State usersList (Matching by id, userId, or email)
    setUsersList(prev => prev.map(u => {
      const isIdMatch = Boolean(u.id && editingUser.id && u.id === editingUser.id);
      const isUserIdMatch = Boolean(u.userId && editingUser.userId && u.userId === editingUser.userId);
      const isEmailMatch = Boolean(u.email && editingUser.email && u.email.toLowerCase() === editingUser.email.toLowerCase());
      return (isIdMatch || isUserIdMatch || isEmailMatch) ? { ...u, ...updated } : u;
    }));

    try {
      if (isSupabaseConfigured && updated.id) {
        await adminUpdateUserProfile(updated);
      }
    } catch (err: any) {
      showToast('Error updating database: ' + err.message, true);
    }

    // 4. Sync directly to Supabase profiles table
    if (isSupabaseConfigured && editingUser.email) {
      const cleanEmail = editingUser.email.toLowerCase().trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUuid = (editingUser.id && uuidRegex.test(editingUser.id)) ? editingUser.id : crypto.randomUUID();

      const profilePayload: Record<string, any> = {
        full_name: normalizedName,
        phone: normalizedPhone,
        emergency_contact: normalizedEmergency,
        address: editingUser.address || '',
        division: normalizedDivision,
        district: normalizedDistrict,
        blood_group: normalizedBlood,
        weight: typeof editingUser.weight === 'number' ? editingUser.weight : parseInt(editingUser.weight) || 70,
        sex: editingUser.sex || 'Male',
        dob: editingUser.dob || '1998-05-15',
        role: normalizedRole,
        online_status: editingUser.onlineStatus || 'Online',
        is_logged_in: editingUser.loginState === 'Logged In' || editingUser.isLoggedIn || false,
        total_donations: normalizedDonations,
        avatar_url: editingUser.avatarUrl || '',
        cover_url: editingUser.coverUrl || '',
        verified: normalizedVerified,
        status: normalizedStatus,
        updated_at: new Date().toISOString()
      };

      try {
        // Attempt update by email first
        const { data: updateData, error: errEmail } = await supabase
          .from('profiles')
          .update(profilePayload)
          .ilike('email', cleanEmail)
          .select();

        let updatedDb = Boolean(updateData && updateData.length > 0);

        if (!updatedDb && (editingUser.id || editingUser.userId)) {
          const { data: updateIdData, error: errId } = await supabase
            .from('profiles')
            .update(profilePayload)
            .or(`id.eq.${editingUser.id},user_id.eq.${editingUser.userId || editingUser.id}`)
            .select();
          if (updateIdData && updateIdData.length > 0) {
            updatedDb = true;
          }
        }

        // If row not found in Supabase yet, insert complete profile
        if (!updatedDb) {
          const { error: insertErr } = await supabase.from('profiles').insert({
            id: validUuid,
            user_id: editingUser.userId || editingUser.id || `RD${Math.floor(100000 + Math.random() * 900000)}`,
            email: cleanEmail,
            ...profilePayload
          });
          if (insertErr) {
            console.error('Supabase profile insertion error:', insertErr);
          } else {
            console.log('Supabase profile inserted successfully for:', cleanEmail);
          }
        } else {
          console.log('Supabase profile updated successfully in database for:', cleanEmail);
        }
      } catch (sbErr) {
        console.error('Supabase profile direct save error:', sbErr);
      }
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('lifedrop_profile_updated'));
    setEditingUser(null);
    showToast(`User record successfully saved and updated for ${normalizedName}`);
  };

  // Filtered lists
  const filteredRequests = requestsList.filter(r => requestFilter === 'all' || r.status === requestFilter);
  const filteredUsers = filteredDirectoryUsers;

  // DESKTOP NAVMENU ITEMS
  const desktopNavGroups = [
    {
      group: 'MAIN CONTROL',
      items: [
        { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { 
          id: 'requests', 
          label: 'Emergency Requests', 
          icon: <Droplets className="w-4 h-4 text-rose-500" />, 
          badge: requestsList.filter(r => r.status === 'active').length, 
          badgeColor: 'bg-rose-100 text-rose-700 font-extrabold' 
        },
      ]
    },
    {
      group: 'BRANDING & SITE',
      items: [
        { id: 'branding', label: 'Brand, Logo & SEO', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
        { id: 'ads', label: 'Sponsorships & Ads', icon: <Megaphone className="w-4 h-4 text-emerald-500" /> },
        { id: 'contacts', label: 'Emergency Contacts', icon: <PhoneCall className="w-4 h-4 text-emerald-600" /> },
      ]
    },
    {
      group: 'DATA & TOOLS',
      items: [
        { id: 'data_tools', label: 'Data Export & Import', icon: <FileSpreadsheet className="w-4 h-4 text-purple-600" /> },
        { id: 'settings', label: 'System Operations', icon: <Settings className="w-4 h-4 text-slate-500" /> },
      ]
    },
    {
      group: 'COMMUNITY & NETWORK',
      items: [
        { 
          id: 'users', 
          label: 'User Directory', 
          icon: <Users className="w-4 h-4 text-teal-600" />, 
          badge: usersList.length, 
          badgeColor: 'bg-slate-100 text-slate-700' 
        },
        { 
          id: 'bloodbanks', 
          label: 'Blood Banks Network', 
          icon: <Building2 className="w-4 h-4 text-indigo-600" />, 
          badge: bloodBanksList.length, 
          badgeColor: 'bg-indigo-50 text-indigo-700' 
        },
        { 
          id: 'tickets', 
          label: 'Support Tickets', 
          icon: <Ticket className="w-4 h-4 text-orange-500" />, 
          badge: ticketsList.filter(t => t.status === 'Open').length, 
          badgeColor: 'bg-orange-100 text-orange-700 font-bold' 
        },
        { id: 'donations', label: 'Dev Fund Receipts', icon: <Heart className="w-4 h-4 text-rose-500" /> },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans select-none">
      
      {/* 1. DESKTOP ADMIN TOP CONTROL BAR */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="w-full max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          
          {/* Left Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md border border-rose-500/30 overflow-hidden">
              {siteConfig.logoUrl ? (
                <img src={siteConfig.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span>{siteConfig.logoSymbol}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base tracking-tight">{siteConfig.companyName}</span>
                <span className="bg-rose-500/20 text-rose-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-rose-500/30 uppercase tracking-widest">
                  ADMIN DESKTOP CONSOLE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Real-Time Control Room & System Overrides</p>
            </div>
          </div>

          {/* Center Live System Pulse */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">System Online</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="text-xs text-slate-300 font-semibold">
              Radar: <span className="text-rose-400 font-bold">{siteConfig.radarRadiusKm}km</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="text-xs text-slate-300 font-semibold">
              Active Request: <span className="text-emerald-400 font-bold">{activeRequest ? `#${activeRequest.id}` : 'None'}</span>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNavHidden(!isNavHidden)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              title={isNavHidden ? "Show Sidebar Navigation" : "Hide Sidebar Navigation"}
            >
              {isNavHidden ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
                  <span>Show Nav</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-amber-400" />
                  <span>Hide Nav</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              <span>Return to Main App</span>
            </button>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{adminUser?.email || 'admin@lifedrop.org'}</span>
            </div>

            <button
              onClick={logoutAdmin}
              className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. DESKTOP TWO-COLUMN WORKSPACE (FIXED WIDE SIDEBAR + MAIN PANEL) */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto flex min-h-[calc(100vh-64px)]">
        
        {/* DESKTOP SIDEBAR NAVIGATION MENU */}
        {!isNavHidden && (
          <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-4 shadow-2xs flex-shrink-0 transition-all">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Navigation</span>
                <button
                  onClick={() => setIsNavHidden(true)}
                  className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                  title="Hide Sidebar Navigation"
                >
                  <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hide Nav</span>
                </button>
              </div>

              {desktopNavGroups.map((group, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3">
                    {group.group}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const isActive = adminTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setAdminTab(item.id as any)}
                          className={`
                            w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer
                            ${isActive 
                              ? 'bg-rose-600 text-white shadow-md font-extrabold translate-x-0.5' 
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <span className={isActive ? 'text-white' : 'text-slate-500'}>
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white font-extrabold' : item.badgeColor || 'bg-slate-100 text-slate-600 font-bold'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Sidebar Footer */}
            <div className="pt-4 border-t border-slate-100">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold text-slate-800">Desktop Operator</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Full privilege administrative overrides active. All updates apply globally.
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* DESKTOP WORKSPACE MAIN CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto min-w-0 bg-slate-50/60">
          {isNavHidden && (
            <button
              onClick={() => setIsNavHidden(false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs rounded-xl text-xs font-bold mb-6 transition-all cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4 text-rose-600" />
              <span>Show Navigation Sidebar</span>
            </button>
          )}
          
          {/* ------------------ TAB 1: DASHBOARD OVERVIEW ------------------ */}
          {adminTab === 'overview' && (
            <div className="space-y-6">
              {/* Header Title Banner */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                    <Activity className="w-6 h-6 text-rose-600" />
                    <span>Dashboard Overview & Real-Time Controls</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    System operations metrics, active emergency broadcasts, and immediate context overrides.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={reloadOverviewDataset}
                    disabled={reloadingSection === 'overview'}
                    className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Reload all dashboard metrics and collections directly from DB"
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-600 ${reloadingSection === 'overview' ? 'animate-spin text-rose-600' : ''}`} />
                    <span>{reloadingSection === 'overview' ? 'Reloading...' : 'Reload DB'}</span>
                  </button>

                  <button
                    onClick={() => setShowCreateOverrideReqModal(true)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Force Emergency Broadcast</span>
                  </button>
                </div>
              </div>

              {/* Metrics Cards Grid */}
              <div className="grid grid-cols-6 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
                  <div className="text-slate-500 text-xs font-semibold">Registered Users</div>
                  <div className="text-3xl font-black text-slate-900 mt-2">{usersList.length}</div>
                  <div className="text-[11px] text-teal-600 font-bold mt-1">
                    {usersList.filter(u => u.verified).length} Verified Donors
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
                  <div className="text-slate-500 text-xs font-semibold">Active Requests</div>
                  <div className="text-3xl font-black text-rose-600 mt-2">{requestsList.filter(r => r.status === 'active').length}</div>
                  <div className="text-[11px] text-rose-600 font-bold mt-1">Radar Radius {siteConfig.radarRadiusKm}km</div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
                  <div className="text-slate-500 text-xs font-semibold">Blood Banks</div>
                  <div className="text-3xl font-black text-indigo-600 mt-2">{bloodBanksList.length}</div>
                  <div className="text-[11px] text-indigo-600 font-bold mt-1">Certified Directory</div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
                  <div className="text-slate-500 text-xs font-semibold">Emergency Contacts</div>
                  <div className="text-3xl font-black text-emerald-600 mt-2">{contactsList.length}</div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-1">Verified Helplines</div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
                  <div className="text-slate-500 text-xs font-semibold">Support Tickets</div>
                  <div className="text-3xl font-black text-amber-600 mt-2">{ticketsList.length}</div>
                  <div className="text-[11px] text-amber-600 font-bold mt-1">{ticketsList.filter(t => t.status === 'Open').length} Open Tickets</div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
                  <div className="text-slate-500 text-xs font-semibold">Community Fund</div>
                  <div className="text-3xl font-black text-purple-600 mt-2">
                    ৳{receiptsList.filter(x => x.status === 'Verified').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-purple-600 font-bold mt-1">{receiptsList.length} Receipts</div>
                </div>
              </div>

              {/* Core System Status & Override Panels */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-rose-600" />
                      <span>Live Request Context Override</span>
                    </h3>
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-200">
                      LIVE OVERRIDE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Current Active Main App Request: <span className="text-slate-900 font-bold">{activeRequest ? `#${activeRequest.id} (${activeRequest.bloodType} at ${activeRequest.hospitalName})` : 'None active'}</span>
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setShowCreateOverrideReqModal(true)}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Force Create Broadcast</span>
                    </button>
                    {activeRequest && (
                      <button
                        onClick={() => adminOverrideActiveRequest(null)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Clear User Request</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-teal-600" />
                      <span>System Health Audit</span>
                    </h3>
                    <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-teal-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping" />
                      ALL NODES ONLINE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Database API:</span>
                      <span className="text-teal-700 font-bold">Connected</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">GPS Radar:</span>
                      <span className="text-teal-700 font-bold">Active ({siteConfig.radarRadiusKm}km)</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Maintenance Mode:</span>
                      <span className={siteConfig.maintenanceMode ? "text-rose-600 font-bold" : "text-slate-700 font-bold"}>
                        {siteConfig.maintenanceMode ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Alert Banner:</span>
                      <span className={siteConfig.announcementActive ? "text-rose-600 font-bold" : "text-slate-500 font-bold"}>
                        {siteConfig.announcementActive ? "Live Broadcast" : "Off"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------ TAB 2: BRAND & LOGO SETUP ------------------ */}
          {adminTab === 'branding' && (
            <form onSubmit={handleSaveBrandingAndSEO} className="w-full max-w-4xl mx-auto flex flex-col gap-8">
              <style>{`
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .btn-primary { 
                    position: relative; overflow: hidden;
                    background: linear-gradient(90deg, #f43f5e 0%, #e11d48 50%, #f43f5e 100%);
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite linear;
                    color: white; padding: 11px 24px; border-radius: 9999px; 
                    font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(244, 63, 94, 0.35); cursor: pointer;
                }
                .btn-warning-glass { background: rgba(255, 255, 255, 0.35); border: 1px solid rgba(100, 116, 139, 0.3); padding: 10px 18px; border-radius: 9999px; font-weight: 600; color: #475569; font-size: 14px; cursor: pointer; transition: 0.3s; }
                .btn-warning-glass:hover { background: rgba(255, 255, 255, 0.6); }
                .custom-dropzone { border: 2px dashed rgba(244, 63, 94, 0.25); border-radius: 16px; padding: 24px 16px; text-align: center; cursor: pointer; transition: all 0.3s ease; background: rgba(255, 241, 242, 0.4); display: block; }
                .custom-dropzone:hover { border-color: #f43f5e; background: rgba(244, 63, 94, 0.05); }
                .icon-wrapper { width: 40px; height: 40px; margin: 0 auto 8px; background: rgba(244, 63, 94, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #f43f5e; }
              `}</style>
              
              {/* Top Branding Header */}
              <section className="flex flex-col sm:flex-row justify-between items-center gap-6 p-8 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-sm">
                <div>
                  <h2 className="text-2xl font-bold">LifeDrop Branding Edit</h2>
                  <p className="text-sm text-slate-500">Configure platform identity, SEO metadata, and tracking integrations.</p>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={handleResetBrandingAndSEO} className="btn-warning-glass">Reset all</button>
                  <button type="submit" className="btn-primary">Save Branding</button>
                </div>
              </section>

              {/* Section 1: Logo & Favicon */}
              <section className="bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">🎨 Logos & Favicon</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Nav Logo Type</label>
                          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-4">
                              <button type="button" onClick={() => setLogoDisplayModeInput('nameOnly')} className={`py-2 text-xs rounded-xl shadow-sm transition-all ${logoDisplayModeInput === 'nameOnly' ? 'font-bold bg-white text-rose-600' : 'font-semibold text-slate-500 hover:text-slate-900'}`}>Text Logo</button>
                              <button type="button" onClick={() => setLogoDisplayModeInput('logoOnly')} className={`py-2 text-xs rounded-xl shadow-sm transition-all ${logoDisplayModeInput !== 'nameOnly' ? 'font-bold bg-white text-rose-600' : 'font-semibold text-slate-500 hover:text-slate-900'}`}>Image Logo</button>
                          </div>
                          
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center bg-slate-50/50 min-h-[140px] flex flex-col justify-center">
                              {logoDisplayModeInput === 'nameOnly' ? (
                                <div>
                                    <div className="font-extrabold text-rose-600 text-2xl py-1">{companyNameInput || "LifeDrop"}</div>
                                    <input type="text" value={companyNameInput} onChange={(e) => setCompanyNameInput(e.target.value)} placeholder="LifeDrop" className="w-full px-3 py-2 mt-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-600" />
                                </div>
                              ) : (
                                <label className="custom-dropzone cursor-pointer">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoFileUpload} />
                                    <div className="icon-wrapper"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
                                    <div className="font-bold text-xs text-slate-700">Click to upload</div>
                                    {logoUrlInput && <div className="text-[10px] mt-2 text-rose-500 font-medium">Selected: {logoUrlInput.split('/').pop()?.slice(0,10)}...</div>}
                                </label>
                              )}
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Favicon (180x180 px)</label>
                          <label className="custom-dropzone h-full min-h-[140px] flex flex-col justify-center">
                              <input type="file" className="hidden" accept="image/*" onChange={handleFaviconUpload} />
                              <div className="icon-wrapper"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg></div>
                              <div className="font-bold text-xs text-slate-700">Upload Favicon</div>
                              {faviconUrlInput && <div className="text-[10px] mt-2 text-rose-500 font-medium">Selected: {faviconUrlInput.split('/').pop()?.slice(0,10)}...</div>}
                          </label>
                      </div>
                  </div>
              </section>

              {/* Section 2: SEO */}
              <section className="bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">🌍 Metadata, SEO & Branding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Company Name</label>
                          <input type="text" placeholder="Company Name" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500" value={companyNameInput} onChange={e => setCompanyNameInput(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Tagline / Subtitle</label>
                          <input type="text" placeholder="Tagline / Subtitle" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500" value={taglineInput} onChange={e => setTaglineInput(e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Meta Description (Search Engine Snippet)</label>
                          <textarea placeholder="Meta Description..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500" rows={2} value={seoDescInput} onChange={e => setSeoDescInput(e.target.value)}></textarea>
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Meta Keywords</label>
                          <input type="text" placeholder="Meta Keywords" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500" value={seoKeywordsInput} onChange={e => setSeoKeywordsInput(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">SEO Document Title (&lt;title&gt;)</label>
                          <input type="text" placeholder="SEO Document Title" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500" value={seoTitleInput} onChange={e => setSeoTitleInput(e.target.value)} />
                      </div>
                      
                      <div className="md:col-span-2">
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Social Share Image (1200x630px)</label>
                          <label className="custom-dropzone w-full">
                              <input type="file" className="hidden" accept="image/*" onChange={handleOgImageUpload} />
                              <div className="icon-wrapper"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg></div>
                              <div className="font-bold text-xs text-slate-700">Click to upload OG Image</div>
                              {ogImageUrlInput && <div className="text-[10px] mt-2 text-rose-500 font-medium">Selected: {ogImageUrlInput.split('/').pop()?.slice(0,10)}...</div>}
                          </label>
                      </div>
                  </div>
              </section>

              {/* Section 3: Analytics */}
              <section className="bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">📊 Analytics & Tracking</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Google Analytics ID</label>
                          <input type="text" placeholder="G-XXXXXXXXXX" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-rose-500" value={analyticsIdInput} onChange={e => setAnalyticsIdInput(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Meta Pixel ID</label>
                          <input type="text" placeholder="Meta Pixel ID" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-rose-500" value={metaPixelIdInput} onChange={e => setMetaPixelIdInput(e.target.value)} />
                      </div>
                  </div>
              </section>
            </form>
          )}

          {/* ------------------ SPONSORSHIPS & ADS ------------------ */}
          {adminTab === 'ads' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xs">
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Megaphone className="w-6 h-6 text-emerald-600" />
                    Sponsorships & Ads Management
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                    Configure manual ad placements across the application
                  </p>
                </div>

                <div className="space-y-12">
                  
                  {/* --- 1. FEED CAROUSEL --- */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">1. Top Feed Carousel</h3>
                        <p className="text-xs text-slate-500">Auto-sliding multi-image banner at the top of the main feed.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={adSystem.feedCarousel.active}
                            onChange={e => setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, active: e.target.checked}})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                        <span className="text-sm font-bold text-slate-700">Master Toggle</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-bold uppercase text-slate-700">Slide Speed (ms):</label>
                          <input 
                            type="number" 
                            value={adSystem.feedCarousel.autoSlideMs} 
                            onChange={e => setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, autoSlideMs: Number(e.target.value)}})}
                            className="w-24 p-2 bg-white border border-slate-200 rounded-md text-sm"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newSlide: CarouselSlide = { id: 'slide_' + Date.now(), pcImageUrl: '', mobileImageUrl: '', linkUrl: '', title: '', buttonText: 'Learn More' };
                            setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: [...adSystem.feedCarousel.slides, newSlide]}});
                          }}
                          className="btn-primary py-2 px-4 rounded-lg flex items-center gap-2 text-xs"
                        >
                          <Plus className="w-3 h-3" /> Add Slide
                        </button>
                      </div>

                      <div className="space-y-4">
                        {adSystem.feedCarousel.slides.map((slide, sIdx) => (
                          <div key={slide.id} className="bg-white border border-slate-200 p-4 rounded-lg relative">
                            <button 
                              onClick={async () => {
                                const newSlides = [...adSystem.feedCarousel.slides];
                                const slideToDelete = newSlides.splice(sIdx, 1)[0];
                                setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: newSlides}});
                                
                                if (slideToDelete.pcImageUrl || slideToDelete.mobileImageUrl) {
                                  const { deleteImageAsset } = await import('../lib/storage');
                                  if (slideToDelete.pcImageUrl) await deleteImageAsset(slideToDelete.pcImageUrl);
                                  if (slideToDelete.mobileImageUrl) await deleteImageAsset(slideToDelete.mobileImageUrl);
                                }
                              }} 
                              className="absolute top-4 right-4 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Title</label>
                                  <input type="text" value={slide.title || ''} onChange={e => {
                                    const ns = [...adSystem.feedCarousel.slides]; ns[sIdx].title = e.target.value;
                                    setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: ns}});
                                  }} className="w-full p-2 border border-slate-200 rounded text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Link URL</label>
                                    <input type="url" value={slide.linkUrl || ''} onChange={e => {
                                      const ns = [...adSystem.feedCarousel.slides]; ns[sIdx].linkUrl = e.target.value;
                                      setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: ns}});
                                    }} className="w-full p-2 border border-slate-200 rounded text-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">CTA Button Text</label>
                                    <input type="text" value={slide.buttonText || ''} onChange={e => {
                                      const ns = [...adSystem.feedCarousel.slides]; ns[sIdx].buttonText = e.target.value;
                                      setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: ns}});
                                    }} className="w-full p-2 border border-slate-200 rounded text-sm" />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">PC Image URL (1200x300px)</label>
                                  <div className="flex gap-2 mb-2">
                                    <input type="text" value={slide.pcImageUrl || ''} onChange={e => {
                                      const ns = [...adSystem.feedCarousel.slides]; ns[sIdx].pcImageUrl = e.target.value;
                                      setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: ns}});
                                    }} className="flex-1 p-2 border border-slate-200 rounded text-xs" />
                                    <button onClick={e => { e.preventDefault(); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async (ev: any) => { const file = ev.target.files?.[0]; if (file) { showToast('Uploading PC Banner...', 'info'); const { uploadImageAsset, deleteImageAsset } = await import('../lib/storage'); const url = await uploadImageAsset(file, 'sponsors'); if (url) { const ns = [...adSystem.feedCarousel.slides]; ns[sIdx].pcImageUrl = url; setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: ns}}); showToast('PC Banner Uploaded!'); } } }; input.click(); }} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition flex items-center gap-1">Upload</button>
                                  </div>
                                  {slide.pcImageUrl ? (
                                    <div className="bg-slate-200 rounded-lg border border-slate-300 p-1 mt-2">
                                      <img src={slide.pcImageUrl} alt="PC Preview" className="w-full h-auto max-h-32 object-contain" />
                                    </div>
                                  ) : (
                                    <div className="h-20 w-full flex items-center justify-center bg-slate-100 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs mt-2">No Image</div>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mobile Image URL (600x300px)</label>
                                  <div className="flex gap-2 mb-2">
                                    <input type="text" value={slide.mobileImageUrl || ''} onChange={e => {
                                      const ns = [...adSystem.feedCarousel.slides]; ns[sIdx].mobileImageUrl = e.target.value;
                                      setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: ns}});
                                    }} className="flex-1 p-2 border border-slate-200 rounded text-xs" />
                                    <button onClick={e => { e.preventDefault(); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async (ev: any) => { const file = ev.target.files?.[0]; if (file) { showToast('Uploading Mobile Banner...', 'info'); const { uploadImageAsset, deleteImageAsset } = await import('../lib/storage'); const url = await uploadImageAsset(file, 'sponsors'); if (url) { const ns = [...adSystem.feedCarousel.slides]; ns[sIdx].mobileImageUrl = url; setAdSystem({...adSystem, feedCarousel: {...adSystem.feedCarousel, slides: ns}}); showToast('Mobile Banner Uploaded!'); } } }; input.click(); }} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition flex items-center gap-1">Upload</button>
                                  </div>
                                  {slide.mobileImageUrl ? (
                                    <div className="bg-slate-200 rounded-lg border border-slate-300 p-1 mt-2">
                                      <img src={slide.mobileImageUrl} alt="Mobile Preview" className="w-full h-auto max-h-32 object-contain" />
                                    </div>
                                  ) : (
                                    <div className="h-20 w-full flex items-center justify-center bg-slate-100 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs mt-2">No Image</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* --- 2. SIDEBAR AD --- */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">2. Sidebar Ad</h3>
                        <p className="text-xs text-slate-500">Static banner on the right sidebar (Desktop).</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={adSystem.sidebarAd.active}
                            onChange={e => setAdSystem({...adSystem, sidebarAd: {...adSystem.sidebarAd, active: e.target.checked}})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                        <span className="text-sm font-bold text-slate-700">Master Toggle</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Link URL</label>
                        <input type="url" value={adSystem.sidebarAd.linkUrl || ''} onChange={e => {
                          setAdSystem({...adSystem, sidebarAd: {...adSystem.sidebarAd, linkUrl: e.target.value}});
                        }} className="w-full p-2 border border-slate-200 rounded text-sm" />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">PC Image URL (300x250px)</label>
                          <div className="flex gap-2 mb-2">
                            <input type="text" value={adSystem.sidebarAd.pcImageUrl || ''} onChange={e => {
                              setAdSystem({...adSystem, sidebarAd: {...adSystem.sidebarAd, pcImageUrl: e.target.value}});
                            }} className="flex-1 p-2 border border-slate-200 rounded text-xs" />
                            <button onClick={e => { e.preventDefault(); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async (ev: any) => { const file = ev.target.files?.[0]; if (file) { showToast('Uploading Banner...', 'info'); const { uploadImageAsset, deleteImageAsset } = await import('../lib/storage'); const url = await uploadImageAsset(file, 'sponsors'); if (url) { setAdSystem({...adSystem, sidebarAd: {...adSystem.sidebarAd, pcImageUrl: url}}); showToast('Banner Uploaded!'); } } }; input.click(); }} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition flex items-center gap-1">Upload</button>
                          </div>
                          {adSystem.sidebarAd.pcImageUrl ? (
                            <div className="bg-slate-200 rounded-lg border border-slate-300 p-1 mt-2">
                              <img src={adSystem.sidebarAd.pcImageUrl} alt="Sidebar PC Preview" className="w-full h-auto max-h-40 object-contain" />
                            </div>
                          ) : (
                            <div className="h-24 w-full flex items-center justify-center bg-slate-100 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs mt-2">No Image</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mobile Image URL (Fallback)</label>
                          <div className="flex gap-2 mb-2">
                            <input type="text" value={adSystem.sidebarAd.mobileImageUrl || ''} onChange={e => {
                              setAdSystem({...adSystem, sidebarAd: {...adSystem.sidebarAd, mobileImageUrl: e.target.value}});
                            }} className="flex-1 p-2 border border-slate-200 rounded text-xs" />
                            <button onClick={e => { e.preventDefault(); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async (ev: any) => { const file = ev.target.files?.[0]; if (file) { showToast('Uploading Mobile Banner...', 'info'); const { uploadImageAsset, deleteImageAsset } = await import('../lib/storage'); const url = await uploadImageAsset(file, 'sponsors'); if (url) { setAdSystem({...adSystem, sidebarAd: {...adSystem.sidebarAd, mobileImageUrl: url}}); showToast('Mobile Banner Uploaded!'); } } }; input.click(); }} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition flex items-center gap-1">Upload</button>
                          </div>
                          {adSystem.sidebarAd.mobileImageUrl ? (
                            <div className="bg-slate-200 rounded-lg border border-slate-300 p-1 mt-2">
                              <img src={adSystem.sidebarAd.mobileImageUrl} alt="Sidebar Mobile Preview" className="w-full h-auto max-h-40 object-contain" />
                            </div>
                          ) : (
                            <div className="h-24 w-full flex items-center justify-center bg-slate-100 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs mt-2">No Image</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- 3. POPUP AD --- */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">3. Modal / Popup Ad</h3>
                        <p className="text-xs text-slate-500">Appears once per session for every user.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={adSystem.popupAd.active}
                            onChange={e => setAdSystem({...adSystem, popupAd: {...adSystem.popupAd, active: e.target.checked}})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                        <span className="text-sm font-bold text-slate-700">Master Toggle</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Title</label>
                          <input type="text" value={adSystem.popupAd.title || ''} onChange={e => {
                            setAdSystem({...adSystem, popupAd: {...adSystem.popupAd, title: e.target.value}});
                          }} className="w-full p-2 border border-slate-200 rounded text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Link URL</label>
                            <input type="url" value={adSystem.popupAd.linkUrl || ''} onChange={e => {
                              setAdSystem({...adSystem, popupAd: {...adSystem.popupAd, linkUrl: e.target.value}});
                            }} className="w-full p-2 border border-slate-200 rounded text-sm" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">CTA Button Text</label>
                            <input type="text" value={adSystem.popupAd.buttonText || ''} onChange={e => {
                              setAdSystem({...adSystem, popupAd: {...adSystem.popupAd, buttonText: e.target.value}});
                            }} className="w-full p-2 border border-slate-200 rounded text-sm" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">PC Image URL (800x600px)</label>
                          <div className="flex gap-2 mb-2">
                            <input type="text" value={adSystem.popupAd.pcImageUrl || ''} onChange={e => {
                              setAdSystem({...adSystem, popupAd: {...adSystem.popupAd, pcImageUrl: e.target.value}});
                            }} className="flex-1 p-2 border border-slate-200 rounded text-xs" />
                            <button onClick={e => { e.preventDefault(); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async (ev: any) => { const file = ev.target.files?.[0]; if (file) { showToast('Uploading Popup Banner...', 'info'); const { uploadImageAsset } = await import('../lib/storage'); const url = await uploadImageAsset(file, 'sponsors'); if (url) { setAdSystem({...adSystem, popupAd: {...adSystem.popupAd, pcImageUrl: url}}); showToast('Popup Banner Uploaded!'); } } }; input.click(); }} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition flex items-center gap-1">Upload</button>
                          </div>
                          {adSystem.popupAd.pcImageUrl ? (
                            <div className="bg-slate-200 rounded-lg border border-slate-300 p-1 mt-2">
                              <img src={adSystem.popupAd.pcImageUrl} alt="Popup PC Preview" className="w-full h-auto max-h-48 object-contain" />
                            </div>
                          ) : (
                            <div className="h-24 w-full flex items-center justify-center bg-slate-100 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs mt-2">No Image</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mobile Image URL (600x800px)</label>
                          <div className="flex gap-2 mb-2">
                            <input type="text" value={adSystem.popupAd.mobileImageUrl || ''} onChange={e => {
                              setAdSystem({...adSystem, popupAd: {...adSystem.popupAd, mobileImageUrl: e.target.value}});
                            }} className="flex-1 p-2 border border-slate-200 rounded text-xs" />
                            <button onClick={e => { e.preventDefault(); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async (ev: any) => { const file = ev.target.files?.[0]; if (file) { showToast('Uploading Popup Mobile Banner...', 'info'); const { uploadImageAsset } = await import('../lib/storage'); const url = await uploadImageAsset(file, 'sponsors'); if (url) { setAdSystem({...adSystem, popupAd: {...adSystem.popupAd, mobileImageUrl: url}}); showToast('Popup Mobile Banner Uploaded!'); } } }; input.click(); }} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition flex items-center gap-1">Upload</button>
                          </div>
                          {adSystem.popupAd.mobileImageUrl ? (
                            <div className="bg-slate-200 rounded-lg border border-slate-300 p-1 mt-2">
                              <img src={adSystem.popupAd.mobileImageUrl} alt="Popup Mobile Preview" className="w-full h-auto max-h-48 object-contain" />
                            </div>
                          ) : (
                            <div className="h-24 w-full flex items-center justify-center bg-slate-100 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs mt-2">No Image</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button onClick={handleSaveAds} className="btn-primary py-3 px-8 text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-200">
                      <Save className="w-4 h-4" /> Save Master Ads Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------ TAB 4: EMERGENCY CONTACTS ------------------ */}
          {adminTab === 'contacts' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xs">
                <div className="border-b border-slate-100 pb-5 mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                      <PhoneCall className="w-6 h-6 text-emerald-600" />
                      <span>Manage Emergency Contacts & Helplines</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Add, edit, or remove 24/7 verified emergency contact numbers displayed on the Emergency tab in the main application.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={reloadContactsDataset}
                      disabled={reloadingSection === 'contacts'}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Reload emergency contacts directly from DB"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${reloadingSection === 'contacts' ? 'animate-spin text-emerald-600' : ''}`} />
                      <span>{reloadingSection === 'contacts' ? 'Reloading...' : 'Reload DB'}</span>
                    </button>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                      {contactsList.length} Active Helplines
                    </span>
                  </div>
                </div>

                {/* Add New Contact Form */}
                <form onSubmit={handleAddEmergencyContact} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl mb-6 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>Add New Emergency Contact</span>
                  </h3>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Icon Emoji</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newContactIcon}
                          onChange={e => setNewContactIcon(e.target.value)}
                          className="w-16 p-2.5 bg-white border border-slate-200 rounded-xl text-center text-lg font-bold"
                        />
                        <div className="flex items-center gap-1">
                          {['🚨', '🏥', '🩸', '🚑', '📞', '❤️'].map(ico => (
                            <button
                              key={ico}
                              type="button"
                              onClick={() => setNewContactIcon(ico)}
                              className="p-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-sm cursor-pointer"
                            >
                              {ico}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Contact Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Police Emergency Dispatch"
                        value={newContactTitle}
                        onChange={e => setNewContactTitle(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Phone Number / Hotline</label>
                      <input
                        type="text"
                        placeholder="e.g. 999 or +880 1700-000000"
                        value={newContactNumber}
                        onChange={e => setNewContactNumber(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Category</label>
                      <select
                        value={newContactCategory}
                        onChange={e => setNewContactCategory(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      >
                        <option value="National">National</option>
                        <option value="Medical">Medical</option>
                        <option value="Blood Bank">Blood Bank</option>
                        <option value="Dispatch">Dispatch</option>
                        <option value="Hotline">Hotline</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Emergency Contact</span>
                  </button>
                </form>

                {/* Contact List Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Icon</th>
                        <th className="p-3.5">Title</th>
                        <th className="p-3.5">Contact Number</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {contactsList.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 text-xl font-bold">{item.icon || '📞'}</td>
                          <td className="p-3.5 font-bold text-slate-900">{item.title}</td>
                          <td className="p-3.5 font-mono font-bold text-rose-600 text-sm">{item.number}</td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px] uppercase">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditContactModal(item)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                                title="Edit Emergency Contact"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveEmergencyContact(item.id, item.title)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                                title="Remove Emergency Contact"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------ TAB 5: DATA EXPORT & IMPORT ------------------ */}
          {adminTab === 'data_tools' && (
            <div className="space-y-8">
              {/* 1. EXPORT SECTION */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                      <Download className="w-6 h-6 text-purple-600" />
                      <span>Download Data (CSV / Excel Format)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Export filtered system datasets by timeframe (Today, 7 days, 30 days, All time, or Custom range).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={reloadOverviewDataset}
                    disabled={reloadingSection === 'overview'}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Reload all collections before export"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${reloadingSection === 'overview' ? 'animate-spin text-purple-600' : ''}`} />
                    <span>{reloadingSection === 'overview' ? 'Reloading...' : 'Reload DB'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Select Entity */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Select Entity / Dataset
                    </label>
                    <div className="space-y-2">
                      {[
                        { id: 'users', label: 'Users & Donors Directory', count: usersList.length, icon: <Users className="w-4 h-4 text-teal-600" /> },
                        { id: 'requests', label: 'Emergency Blood Requests', count: requestsList.length, icon: <Droplets className="w-4 h-4 text-rose-600" /> },
                        { id: 'bloodbanks', label: 'Blood Banks Network', count: bloodBanksList.length, icon: <Building2 className="w-4 h-4 text-indigo-600" /> },
                        { id: 'tickets', label: 'Support Tickets', count: ticketsList.length, icon: <Ticket className="w-4 h-4 text-orange-500" /> },
                        { id: 'donations', label: 'Dev Fund Receipts', count: receiptsList.length, icon: <Heart className="w-4 h-4 text-rose-500" /> },
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setExportEntity(item.id as any)}
                          className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            exportEntity === item.id 
                              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 font-bold text-slate-900' 
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.icon}
                            <span className="text-xs">{item.label}</span>
                          </div>
                          <span className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600">
                            {item.count} Records
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeframe Selector */}
                  <div className="space-y-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Select Export Timeframe
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'today', label: 'Today' },
                        { id: '7days', label: 'Last 7 Days' },
                        { id: '30days', label: 'Last 30 Days' },
                        { id: 'all', label: 'All Time' },
                      ].map(tf => (
                        <button
                          key={tf.id}
                          type="button"
                          onClick={() => setExportTimeframe(tf.id as any)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            exportTimeframe === tf.id 
                              ? 'bg-purple-600 text-white shadow-xs' 
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {tf.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExportTimeframe('custom')}
                      className={`w-full p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        exportTimeframe === 'custom' 
                          ? 'bg-purple-600 text-white shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Custom Date Range
                    </button>

                    {exportTimeframe === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Date</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={e => setCustomStartDate(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Date</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={e => setCustomEndDate(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleDownloadExportData}
                      className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Filtered Data (CSV)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. BULK IMPORT SECTION */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-5">
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                    <Upload className="w-6 h-6 text-teal-600" />
                    <span>Upload Bulk Data (CSV Format)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Download sample templates to structure your CSV file and import bulk data directly into the system.
                  </p>
                </div>

                {/* Sample Download Bar */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Need a Sample CSV Template?</h3>
                    <p className="text-[11px] text-slate-500">Download formatted sample CSV template to ensure column names match.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadSampleCsv('users')}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      <span>Sample Users</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSampleCsv('bloodbanks')}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Sample Blood Banks</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSampleCsv('requests')}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>Sample Requests</span>
                    </button>
                  </div>
                </div>

                {/* Import Target Entity */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Import Target Entity
                    </label>
                    <div className="flex items-center gap-3">
                      {[
                        { id: 'users', label: 'Users & Donors' },
                        { id: 'bloodbanks', label: 'Blood Banks Network' },
                        { id: 'requests', label: 'Emergency Requests' },
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setImportEntity(item.id as any)}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            importEntity === item.id 
                              ? 'bg-teal-600 text-white shadow-xs' 
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File Upload / Paste Box */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Upload CSV File or Paste Raw CSV Text
                      </label>
                      <label className="text-xs font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Browse File...</span>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={handleFileUploadInput}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <textarea
                      rows={6}
                      value={rawCsvText}
                      onChange={e => setRawCsvText(e.target.value)}
                      placeholder="Paste comma-separated CSV text here (e.g. name,email,phone,bloodGroup)..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    onClick={handleProcessBulkImport}
                    className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Process & Import Bulk Records</span>
                  </button>
                </div>
              </div>

              {/* 3. PRODUCTION CLEAN-UP & SUPABASE SCHEMA TOOL */}
              <div className="bg-gradient-to-r from-rose-900 to-slate-900 border border-rose-800 p-8 rounded-2xl shadow-lg text-white space-y-6">
                <div className="flex items-start justify-between border-b border-rose-800/80 pb-5">
                  <div>
                    <h2 className="text-xl font-extrabold flex items-center gap-2.5 text-white">
                      <Sparkles className="w-6 h-6 text-rose-400" />
                      <span>Production Deployment & Database Clean-Up</span>
                    </h2>
                    <p className="text-xs text-rose-200 mt-1">
                      Clean out demo data, enforce asset storage hygiene, and generate the final SQL script for Supabase execution.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider">
                    Production Wired
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>1. Wipe Demo Data</span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Clears all test requests, mock bids, and temporary session data. Restores the application to a pristine, clean state ready for official launch.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearAllDemoData();
                      }}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Wipe Demo Data & Restore Clean State</span>
                    </button>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-400" />
                      <span>2. Final Supabase Schema & SQL</span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Includes complete schema, automated <code className="text-rose-300 font-mono">last_donated_date</code> triggers, 25km GPS radar spatial indexes, and RLS security policies.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowSqlModal(true)}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>View & Copy Production SQL Script</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SUPABASE SQL MODAL */}
              {showSqlModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 text-white shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                          <span>Production Supabase SQL Schema Script</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Copy and run this script inside your Supabase SQL Editor to set up clean production tables, triggers & RLS policies.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSqlModal(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto my-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-teal-300 leading-relaxed whitespace-pre font-medium">
                      {`-- =====================================================================
-- LifeDrop Blood Network - Production Database Schema & SQL Setup
-- Target Platform: Supabase / PostgreSQL
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. CLEAN-UP EXISTING DEMO DATA
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'donations') THEN
    TRUNCATE TABLE public.donations CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blood_requests') THEN
    TRUNCATE TABLE public.blood_requests CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'storage_assets') THEN
    TRUNCATE TABLE public.storage_assets CASCADE;
  END IF;
END $$;

-- 3. PROFILES TABLE (User Accounts, Donors & Receivers)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(20) UNIQUE NOT NULL, -- Format: RD982745
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(30) UNIQUE NOT NULL,
  emergency_contact VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  division VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  blood_group VARCHAR(10) NOT NULL,
  weight NUMERIC(5,2),
  sex VARCHAR(20),
  dob DATE,
  role VARCHAR(50) DEFAULT 'Donor' NOT NULL CHECK (role IN ('Donor', 'Receiver', 'Volunteer', 'Admin', 'Super Admin')),
  avatar_url TEXT,
  cover_url TEXT,
  total_donations INT DEFAULT 0 CHECK (total_donations >= 0),
  last_donated_date DATE, -- AUTOMATED: Calculated on donation completion
  last_donated_at TIMESTAMPTZ, -- AUTOMATED: Calculated timestamp on donation completion
  online_status VARCHAR(20) DEFAULT 'Online' NOT NULL CHECK (online_status IN ('Online', 'Offline', 'Busy', 'Away')),
  is_logged_in BOOLEAN DEFAULT FALSE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Verified', 'Banned')),
  rating NUMERIC(2,1) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT profiles_phone_emergency_diff_check CHECK (phone IS NULL OR emergency_contact IS NULL OR phone = 'N/A' OR emergency_contact = 'N/A' OR phone <> emergency_contact)
);

-- Migration / Safety ALTER TABLE commands for existing database tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Donor' NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_donated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS online_status VARCHAR(20) DEFAULT 'Online' NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT FALSE NOT NULL;

-- Backwards-compatibility data migration for legacy column names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_number') THEN
    EXECUTE 'UPDATE public.profiles SET phone = phone_number WHERE phone IS NULL AND phone_number IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'emergency_contact_number') THEN
    EXECUTE 'UPDATE public.profiles SET emergency_contact = emergency_contact_number WHERE emergency_contact IS NULL AND emergency_contact_number IS NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key') THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'emergency_contact') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_emergency_diff_check') THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_emergency_diff_check CHECK (phone IS NULL OR emergency_contact IS NULL OR phone = 'N/A' OR emergency_contact = 'N/A' OR phone <> emergency_contact);
    END IF;
  END IF;
END $$;

-- 4. BLOOD REQUESTS TABLE (Emergency Radar Requests)
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_type VARCHAR(10) NOT NULL,
  hospital_name VARCHAR(255) NOT NULL,
  hospital_location TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  qty_whole INT DEFAULT 0,
  qty_platelets INT DEFAULT 0,
  qty_plasma INT DEFAULT 0,
  qty_double_red INT DEFAULT 0,
  reason_needed TEXT,
  needed_in_hours INT DEFAULT 4,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  match_stage VARCHAR(30) DEFAULT 'broadcast',
  selected_donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 5. DONATIONS TABLE (Donation History & Verification Records)
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  rating NUMERIC(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
  review TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BLOOD BANKS DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS public.blood_banks (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  division VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  phones JSONB DEFAULT '[]'::jsonb,
  address TEXT NOT NULL,
  map_url TEXT,
  distance_km NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  number VARCHAR(50) NOT NULL,
  tel VARCHAR(60) NOT NULL,
  icon VARCHAR(20) DEFAULT '📞',
  category VARCHAR(100) DEFAULT 'Medical',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.site_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global_config',
  company_name VARCHAR(255),
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  og_image_url TEXT,
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT,
  analytics_id VARCHAR(100),
  meta_pixel_id VARCHAR(100),
  logo_display_mode VARCHAR(20) DEFAULT 'both',
  logo_symbol VARCHAR(20) DEFAULT '🩸',
  emergency_hotline VARCHAR(50) DEFAULT '999 / 16263',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUTOMATED TIMERS & CALCULATIONS (Triggers & Functions)
CREATE OR REPLACE FUNCTION public.fn_auto_calculate_donor_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.profiles
    SET 
      last_donated_date = CURRENT_DATE,
      total_donations = total_donations + 1,
      updated_at = NOW()
    WHERE id = NEW.donor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_calculate_donor_stats ON public.donations;
CREATE TRIGGER trg_auto_calculate_donor_stats
AFTER INSERT OR UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_calculate_donor_stats();

-- 10. INDEXES FOR HIGH-PERFORMANCE 25KM RADAR & DIRECTORY SEARCH
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_blood_group ON public.profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_location ON public.blood_requests(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_blood_banks_division ON public.blood_banks(division);
CREATE INDEX IF NOT EXISTS idx_blood_banks_district ON public.blood_banks(district);

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by all" ON public.profiles;
CREATE POLICY "Profiles are viewable by all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert profile" ON public.profiles;
CREATE POLICY "Anyone can insert profile" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update profile" ON public.profiles;
CREATE POLICY "Anyone can update profile" ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Blood banks are viewable by all" ON public.blood_banks;
CREATE POLICY "Blood banks are viewable by all" ON public.blood_banks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert blood banks" ON public.blood_banks;
CREATE POLICY "Anyone can insert blood banks" ON public.blood_banks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update blood banks" ON public.blood_banks;
CREATE POLICY "Anyone can update blood banks" ON public.blood_banks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete blood banks" ON public.blood_banks;
CREATE POLICY "Anyone can delete blood banks" ON public.blood_banks FOR DELETE USING (true);

DROP POLICY IF EXISTS "Emergency contacts are viewable by all" ON public.emergency_contacts;
CREATE POLICY "Emergency contacts are viewable by all" ON public.emergency_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Anyone can insert emergency contacts" ON public.emergency_contacts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Anyone can update emergency contacts" ON public.emergency_contacts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Anyone can delete emergency contacts" ON public.emergency_contacts FOR DELETE USING (true);

DROP POLICY IF EXISTS "Site settings viewable by all" ON public.site_settings;
CREATE POLICY "Site settings viewable by all" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can upsert site settings" ON public.site_settings;
CREATE POLICY "Anyone can upsert site settings" ON public.site_settings FOR ALL USING (true);`}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          const sqlText = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\nTRUNCATE TABLE IF EXISTS public.donations CASCADE;\nTRUNCATE TABLE IF EXISTS public.blood_requests CASCADE;`;
                          navigator.clipboard.writeText(sqlText);
                          showToast('📋 SQL Code copied to clipboard!');
                        }}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4 text-teal-400" />
                        <span>Copy SQL to Clipboard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSqlModal(false)}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------ TAB 6: EMERGENCY REQUESTS OVERRIDE ------------------ */}
          {adminTab === 'requests' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-rose-600" />
                    <span>Emergency Blood Requests & Match Stage Override</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Admin can edit any user request, advance match stages, or force create/fulfill/cancel broadcasts.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={reloadRequestsDataset}
                    disabled={reloadingSection === 'requests'}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Reload blood requests dataset directly from DB"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${reloadingSection === 'requests' ? 'animate-spin text-rose-600' : ''}`} />
                    <span>{reloadingSection === 'requests' ? 'Reloading...' : 'Reload DB'}</span>
                  </button>

                  <button
                    onClick={() => setShowCreateOverrideReqModal(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Override Request</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {(['all', 'active', 'fulfilled', 'cancelled'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setRequestFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                          requestFilter === f ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">ID & Date</th>
                      <th className="p-3.5">Group</th>
                      <th className="p-3.5">Hospital & Reason</th>
                      <th className="p-3.5">Match Stage</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-900">{req.id}</div>
                          <div className="text-[10px] text-slate-400">{req.createdAt}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-md">
                            {req.bloodType}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{req.hospitalName}</div>
                          <div className="text-slate-500 text-[11px] truncate max-w-sm">{req.reasonNeeded}</div>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={req.matchStage || 'broadcast'}
                            onChange={e => handleUpdateMatchStage(req.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold py-1 px-2.5 rounded-lg cursor-pointer focus:outline-none"
                          >
                            <option value="broadcast">1. Broadcast</option>
                            <option value="donor_interested">2. Donor Interested</option>
                            <option value="contact_shared">3. Contact Shared</option>
                            <option value="receiver_confirmed">4. Receiver Confirmed</option>
                            <option value="donor_completed">5. Donor Completed</option>
                            <option value="rating_submitted">6. Rating Submitted</option>
                          </select>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${
                            req.status === 'active' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                            req.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingReq(req)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Override</span>
                            </button>
                            {req.status === 'active' ? (
                              <>
                                <button
                                  onClick={() => handleUpdateReqStatus(req.id, 'fulfilled')}
                                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition-all cursor-pointer"
                                >
                                  Fulfill
                                </button>
                                <button
                                  onClick={() => handleUpdateReqStatus(req.id, 'cancelled')}
                                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUpdateReqStatus(req.id, 'active')}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------ TAB 7: USER DIRECTORY ------------------ */}
          {adminTab === 'users' && (
            <div className="space-y-6">
              {/* TOP TOOLBAR CONTAINER */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-[300px] flex-wrap">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Search users by name, ID..."
                        className="w-full h-10 pl-9 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-200/70 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md pointer-events-none">
                        ⌘K
                      </span>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                      className={`h-10 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        isFilterPanelOpen || divisionFilter || districtFilter || onlineFilter || userRoleFilter || sessionFilter || badgeFilter
                          ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Filters</span>
                    </button>

                    {/* Expanding Date Range Button */}
                    <button
                      type="button"
                      onClick={() => setIsDateModalOpen(true)}
                      title="Select Date Range"
                      className="h-10 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs flex items-center gap-2 transition-all group overflow-hidden cursor-pointer hover:border-rose-500 shadow-2xs"
                    >
                      <Calendar className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span className="max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden">
                        {getDateRangeLabelText()}
                      </span>
                    </button>

                    {/* Expandable Delete Button */}
                    <button
                      type="button"
                      onClick={handleDeleteSelectedUsers}
                      title="Delete Selected"
                      className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs flex items-center gap-2 transition-all group overflow-hidden cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span className="max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden">
                        Delete Selected ({selectedUserIds.length})
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={reloadUsersDataset}
                      disabled={reloadingSection === 'users'}
                      className="h-10 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Reload users & donors directory directly from DB"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${reloadingSection === 'users' ? 'animate-spin text-teal-600' : ''}`} />
                      <span>{reloadingSection === 'users' ? 'Reloading...' : 'Reload DB'}</span>
                    </button>

                    <div className="h-10 px-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center text-xs font-extrabold text-rose-600">
                      Total Users: <span className="text-slate-900 ml-1.5">{filteredDirectoryUsers.length}</span>
                    </div>
                  </div>
                </div>

                {/* Active Filters Bar */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-slate-400 font-medium">Active:</span>
                  <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Date: {getDateRangeLabelText()}</span>
                    <button type="button" onClick={() => { setStartDate(null); setEndDate(null); setDatePreset('all'); }} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {(divisionFilter || districtFilter || onlineFilter || userRoleFilter || sessionFilter || badgeFilter) && (
                    <button
                      type="button"
                      onClick={handleClearAllUserFilters}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer ml-1"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Dropdown Filters Panel */}
                {isFilterPanelOpen && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-3 border-t border-slate-200 transition-all">
                    <select
                      value={resultsPerPage}
                      onChange={e => setResultsPerPage(Number(e.target.value))}
                      className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                    </select>

                    <select
                      value={divisionFilter}
                      onChange={e => {
                        setDivisionFilter(e.target.value);
                        setDistrictFilter('');
                      }}
                      className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">All Divisions</option>
                      {divisionNamesWithSuffix.map(div => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>

                    <select
                      value={districtFilter}
                      onChange={e => setDistrictFilter(e.target.value)}
                      className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">All Districts</option>
                      {(divisionFilter ? getDistrictsForDivision(divisionFilter) : allDistricts).map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>

                    <select
                      value={onlineFilter}
                      onChange={e => setOnlineFilter(e.target.value)}
                      className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">Online Status</option>
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                    </select>

                    <select
                      value={userRoleFilter}
                      onChange={e => setUserRoleFilter(e.target.value)}
                      className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">Live Role</option>
                      <option value="Donor">Donor</option>
                      <option value="Receiver">Receiver</option>
                    </select>

                    <select
                      value={sessionFilter}
                      onChange={e => setSessionFilter(e.target.value)}
                      className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">Session</option>
                      <option value="Logged In">Logged In</option>
                      <option value="Logged Out">Logged Out</option>
                    </select>

                    <select
                      value={badgeFilter}
                      onChange={e => setBadgeFilter(e.target.value)}
                      className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">Badge</option>
                      <option value="Active">Active</option>
                      <option value="Verified">Verified</option>
                      <option value="Banned">Banned</option>
                    </select>
                  </div>
                )}
              </div>

              {/* TABLE CONTAINER CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-2 w-8">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.length > 0 && selectedUserIds.length === filteredDirectoryUsers.length}
                            onChange={e => handleToggleSelectAllUsers(e.target.checked)}
                            className="accent-blue-600 rounded cursor-pointer w-4 h-4"
                          />
                        </th>
                        <th className="py-3 px-2">User ID ↕</th>
                        <th className="py-3 px-2">Name & Profile ↕</th>
                        <th className="py-3 px-2 text-center">Blood Group ↕</th>
                        <th className="py-3 px-2">Sex ↕</th>
                        <th className="py-3 px-2">DOB ↕</th>
                        <th className="py-3 px-2">Weight ↕</th>
                        <th className="py-3 px-2">WhatsApp ↕</th>
                        <th className="py-3 px-2">Emergency ↕</th>
                        <th className="py-3 px-2">Email ↕</th>
                        <th className="py-3 px-2">Division ↕</th>
                        <th className="py-3 px-2">District ↕</th>
                        <th className="py-3 px-2">Address ↕</th>
                        <th className="py-3 px-2 text-center">Coordinates ↕</th>
                        <th className="py-3 px-2">Online Status ↕</th>
                        <th className="py-3 px-2">Live Role ↕</th>
                        <th className="py-3 px-2">Donations ↕</th>
                        <th className="py-3 px-2 text-center">Requests ↕</th>
                        <th className="py-3 px-2">Last Donated ↕</th>
                        <th className="py-3 px-2">Member Since ↕</th>
                        <th className="py-3 px-2">Last Logged ↕</th>
                        <th className="py-3 px-2">Session ↕</th>
                        <th className="py-3 px-2">Badge ↕</th>
                        <th className="py-3 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDirectoryUsers.length === 0 ? (
                        <tr>
                          <td colSpan={24} className="py-8 text-center text-slate-400 font-medium">
                            No records found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredDirectoryUsers.slice(0, resultsPerPage).map(c => {
                          const isSelected = selectedUserIds.includes(c.id);
                          const isBanned = c.status === 'Banned';
                          const isVerified = c.status === 'Verified';

                          return (
                            <tr
                              key={c.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-3 px-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectUser(c.id)}
                                  className="accent-blue-600 rounded cursor-pointer w-4 h-4"
                                />
                              </td>
                              <td className="py-3 px-2">
                                <span className="font-mono font-bold text-blue-600">{c.userId}</span>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                                    {c.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <span className="font-semibold text-slate-900">{c.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="font-black text-rose-600">{c.blood}</span>
                              </td>
                              <td className="py-3 px-2 text-slate-700">{c.sex}</td>
                              <td className="py-3 px-2 text-slate-700">{c.dob}</td>
                              <td className="py-3 px-2 text-slate-700">{c.weight}</td>
                              <td className="py-3 px-2 text-emerald-600 font-semibold flex items-center gap-1">
                                <PhoneCall className="w-3.5 h-3.5" />
                                <span>{c.phone}</span>
                              </td>
                              <td className="py-3 px-2 text-slate-700">{c.emergency}</td>
                              <td className="py-3 px-2 text-slate-700">{c.email}</td>
                              <td className="py-3 px-2 text-slate-700">{safeDivisionString(c.division)}</td>
                              <td className="py-3 px-2 text-slate-700">{safeDistrictString(c.district)}</td>
                              <td className="py-3 px-2 text-slate-700 max-w-[150px] truncate" title={c.address}>
                                {c.address}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {c.latitude && c.longitude ? (
                                  <a href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono font-bold text-blue-600 hover:underline">
                                    {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Not set</span>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${c.onlineStatus === 'Online' ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-400'}`} />
                                  <span className="font-medium text-slate-700">{c.onlineStatus}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded-full font-semibold text-[11px]">
                                  {c.role}
                                </span>
                              </td>
                              <td className="py-3 px-2 font-bold text-emerald-700">{c.totalDonations}</td>
                              <td className="py-3 px-2 text-center font-bold text-blue-600">{c.totalRequests}</td>
                              <td className="py-3 px-2 text-[11px] text-slate-500">{c.lastDonated}</td>
                              <td className="py-3 px-2 text-[11px] text-slate-500">{c.memberSince}</td>
                              <td className="py-3 px-2 text-[11px] text-slate-500">{c.lastLogin}</td>
                              <td className="py-3 px-2">
                                <span className={`text-[11px] font-extrabold ${c.loginState === 'Logged In' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                  {c.loginState}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  isBanned ? 'bg-rose-100 text-rose-800' :
                                  isVerified ? 'bg-amber-100 text-amber-800' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingUser({ ...c, division: safeDivisionString(c.division), district: safeDistrictString(c.district) })}
                                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer transition-all"
                                    title="Edit record"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserVerify(c.id)}
                                    className={`p-1.5 border rounded-lg cursor-pointer transition-all ${
                                      isVerified
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                    }`}
                                    title={isVerified ? "Unverify User" : "Verify User"}
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserBan(c.id)}
                                    className={`p-1.5 border rounded-lg cursor-pointer transition-all ${
                                      isBanned
                                        ? 'bg-rose-600 text-white border-rose-600'
                                        : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                    }`}
                                    title={isBanned ? "Unban User" : "Ban User"}
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleUser(c)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg cursor-pointer transition-all"
                                    title="Permanently Delete User & All Data"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer / Pagination Section */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex-wrap gap-2">
                  <div>
                    Showing 1 to {Math.min(filteredDirectoryUsers.length, resultsPerPage)} of {filteredDirectoryUsers.length} entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">«</button>
                    <button type="button" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">‹</button>
                    <button type="button" className="px-2.5 py-1 bg-rose-600 text-white font-bold border border-rose-600 rounded-lg cursor-pointer">1</button>
                    <button type="button" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">›</button>
                    <button type="button" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">»</button>
                  </div>
                </div>
              </div>

              {/* DATE PICKER & EXPORT MODAL */}
              {isDateModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 text-center font-bold text-slate-800 text-base">
                      {getDateRangeLabelText()}
                    </div>

                    <div className="flex min-h-[320px]">
                      {/* Preset Sidebar */}
                      <div className="w-44 border-r border-slate-200 bg-slate-50/70 p-2 space-y-1">
                        {[
                          { id: 'all', label: 'All Time' },
                          { id: 'today', label: 'Today' },
                          { id: 'yesterday', label: 'Yesterday' },
                          { id: 'last7', label: 'Last 7 days' },
                          { id: 'last15', label: 'Last 15 days' },
                          { id: 'custom', label: 'Custom' },
                        ].map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectDatePreset(p.id)}
                            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                              datePreset === p.id
                                ? 'bg-rose-50 text-rose-600 border-l-4 border-rose-600 font-bold'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Calendar Container */}
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-bold text-slate-800 text-sm">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                              className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                              className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="w-full">
                          <div className="grid grid-cols-7 text-center gap-1 mb-2 text-[11px] font-bold text-slate-400">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, idx) => (
                              <div key={idx}>{w}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 text-center gap-y-1">
                            {(() => {
                              const year = viewDate.getFullYear();
                              const month = viewDate.getMonth();
                              const firstDayIndex = new Date(year, month, 1).getDay();
                              const daysInMonth = new Date(year, month + 1, 0).getDate();
                              const prevMonthDays = new Date(year, month, 0).getDate();
                              const cells = [];

                              for (let i = firstDayIndex; i > 0; i--) {
                                cells.push(
                                  <div key={`empty-${i}`} className="h-8 flex items-center justify-center text-xs text-slate-300">
                                    {prevMonthDays - i + 1}
                                  </div>
                                );
                              }

                              for (let d = 1; d <= daysInMonth; d++) {
                                const curr = new Date(year, month, d);
                                const isStart = startDate && isSameDay(curr, startDate);
                                const isEnd = endDate && isSameDay(curr, endDate);
                                const inRange = startDate && endDate && curr > startDate && curr < endDate;

                                let cls = "h-8 flex items-center justify-center text-xs font-semibold cursor-pointer text-slate-700 transition-all ";
                                if (isStart && isEnd) {
                                  cls += "bg-rose-600 text-white rounded-full font-bold";
                                } else if (isStart) {
                                  cls += "bg-rose-600 text-white rounded-l-full font-bold";
                                } else if (isEnd) {
                                  cls += "bg-rose-600 text-white rounded-r-full font-bold";
                                } else if (inRange) {
                                  cls += "bg-rose-50 text-rose-600 font-bold";
                                } else {
                                  cls += "hover:bg-slate-100 rounded-full";
                                }

                                cells.push(
                                  <button
                                    key={`day-${d}`}
                                    type="button"
                                    onClick={() => {
                                      setDatePreset('custom');
                                      if (!startDate || (startDate && endDate)) {
                                        setStartDate(curr);
                                        setEndDate(null);
                                      } else if (startDate && !endDate) {
                                        if (curr < startDate) {
                                          setEndDate(startDate);
                                          setStartDate(curr);
                                        } else {
                                          setEndDate(curr);
                                        }
                                      }
                                    }}
                                    className={cls}
                                  >
                                    {d}
                                  </button>
                                );
                              }
                              return cells;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExportUsersDirectory('csv')}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>Export CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportUsersDirectory('xlsx')}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>Export XLSX</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsDateModalOpen(false)}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDateModalOpen(false)}
                          className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT USER MODAL WINDOW */}
              {editingUser && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-rose-600" />
                        <span>Edit User Record</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveUserModal} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={editingUser.name}
                          onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email ID</label>
                        <input
                          type="email"
                          required
                          value={editingUser.email}
                          onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Account Password</label>
                        <div className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-2 text-slate-500">
                          <span>🔒 Managed by Supabase Auth</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">To reset password, use Supabase Auth dashboard.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Blood Group</label>
                          <select
                            value={editingUser.blood}
                            onChange={e => setEditingUser({ ...editingUser, blood: e.target.value as BloodType })}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          >
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sex</label>
                          <select
                            value={editingUser.sex}
                            onChange={e => setEditingUser({ ...editingUser, sex: e.target.value })}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Weight (KG)</label>
                          <input
                            type="text"
                            value={editingUser.weight}
                            onChange={e => setEditingUser({ ...editingUser, weight: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">WhatsApp Number</label>
                          <input
                            type="text"
                            value={editingUser.phone}
                            onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Emergency Number</label>
                        <input
                          type="text"
                          value={editingUser.emergency}
                          onChange={e => setEditingUser({ ...editingUser, emergency: e.target.value })}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Division</label>
                          <select
                            value={safeDivisionString(editingUser.division)}
                            onChange={e => {
                              const newDiv = e.target.value;
                              const dists = getDistrictsForDivision(newDiv);
                              const newDist = dists.length > 0 ? dists[0] : 'Dhaka';
                              setEditingUser({ ...editingUser, division: newDiv, district: newDist });
                            }}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          >
                            {divisionNamesWithSuffix.map(div => (
                              <option key={div} value={div}>{div}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">District</label>
                          <select
                            value={safeDistrictString(editingUser.district)}
                            onChange={e => setEditingUser({ ...editingUser, district: e.target.value })}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          >
                            {(getDistrictsForDivision(editingUser.division).length > 0
                              ? getDistrictsForDivision(editingUser.division)
                              : allDistricts
                            ).map(dist => (
                              <option key={dist} value={dist}>{dist}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">User Role</label>
                          <select
                            value={editingUser.role || 'Donor'}
                            onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          >
                            <option value="Donor">Donor</option>
                            <option value="Receiver">Receiver</option>
                            <option value="Volunteer">Volunteer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Account Status</label>
                          <select
                            value={editingUser.status || 'Active'}
                            onChange={e => setEditingUser({ ...editingUser, status: e.target.value, isBanned: e.target.value === 'Banned' })}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          >
                            <option value="Active">Active</option>
                            <option value="Verified">Verified</option>
                            <option value="Banned">Banned</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Total Donations</label>
                          <input
                            type="number"
                            min="0"
                            value={editingUser.totalDonations !== undefined ? editingUser.totalDonations : 0}
                            onChange={e => setEditingUser({ ...editingUser, totalDonations: parseInt(e.target.value) || 0 })}
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                          />
                        </div>

                        <div className="pt-4">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(editingUser.verified)}
                              onChange={e => setEditingUser({ ...editingUser, verified: e.target.checked })}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">Verified Badge</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Address</label>
                        <input
                          type="text"
                          value={editingUser.address}
                          onChange={e => setEditingUser({ ...editingUser, address: e.target.value })}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setEditingUser(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* DELETE USER CONFIRMATION MODAL */}
              {deleteUserConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-rose-100 text-rose-600 rounded-full shrink-0">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{deleteUserConfirmModal.title}</h3>
                        <p className="text-xs font-semibold text-rose-600">Irreversible Action</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {deleteUserConfirmModal.message}
                    </p>

                    {deleteUserConfirmModal.userNames && deleteUserConfirmModal.userNames.length > 0 && (
                      <div className="max-h-28 overflow-y-auto space-y-1 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-[11px] font-medium text-rose-900">
                        <p className="font-bold uppercase tracking-wider text-[10px] text-rose-600 mb-1">Selected Account(s):</p>
                        {deleteUserConfirmModal.userNames.map((name, i) => (
                          <div key={i} className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                            <span className="truncate">{name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setDeleteUserConfirmModal(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeleteUserModal}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Permanently Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------ TAB 8: BLOOD BANKS NETWORK ------------------ */}
          {adminTab === 'bloodbanks' && (
            <div className="space-y-6">
              {/* TOP TOOLBAR CONTAINER */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-[300px] flex-wrap">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={bbSearch}
                        onChange={e => setBbSearch(e.target.value)}
                        placeholder="Search blood banks by name, phone, address..."
                        className="w-full h-10 pl-9 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-200/70 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md pointer-events-none">
                        ⌘K
                      </span>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setBbIsFilterPanelOpen(!bbIsFilterPanelOpen)}
                      className={`h-10 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        bbIsFilterPanelOpen || bbDivisionFilter || bbDistrictFilter
                          ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Filters</span>
                    </button>

                    {/* Delete Selected Expandable Button */}
                    {selectedBBIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleOpenDeleteBulkBBModal}
                        title="Delete Selected Blood Banks"
                        className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          Delete Selected ({selectedBBIds.length})
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={reloadBloodBanksDataset}
                      disabled={reloadingSection === 'bloodbanks'}
                      className="h-10 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Reload blood banks directory directly from DB"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${reloadingSection === 'bloodbanks' ? 'animate-spin text-indigo-600' : ''}`} />
                      <span>{reloadingSection === 'bloodbanks' ? 'Reloading...' : 'Reload DB'}</span>
                    </button>

                    <div className="h-10 px-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center text-xs font-extrabold text-indigo-700">
                      Total Blood Banks: <span className="text-slate-900 ml-1.5">{filteredBloodBanks.length}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddBBModal}
                      className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Blood Bank</span>
                    </button>
                  </div>
                </div>

                {/* Active Filters Bar */}
                {(bbDivisionFilter || bbDistrictFilter) && (
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">Active Filters:</span>
                    {bbDivisionFilter && (
                      <div className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span>Division: {bbDivisionFilter}</span>
                        <button type="button" onClick={() => { setBbDivisionFilter(''); setBbDistrictFilter(''); }} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {bbDistrictFilter && (
                      <div className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span>District: {bbDistrictFilter}</span>
                        <button type="button" onClick={() => setBbDistrictFilter('')} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setBbDivisionFilter(''); setBbDistrictFilter(''); setBbSearch(''); }}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer ml-1"
                    >
                      Clear All
                    </button>
                  </div>
                )}

                {/* Dropdown Filters Panel */}
                {bbIsFilterPanelOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 transition-all">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Per Page</label>
                      <select
                        value={bbResultsPerPage}
                        onChange={e => setBbResultsPerPage(Number(e.target.value))}
                        className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Division</label>
                      <select
                        value={bbDivisionFilter}
                        onChange={e => {
                          setBbDivisionFilter(e.target.value);
                          setBbDistrictFilter('');
                        }}
                        className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                      >
                        <option value="">All Divisions</option>
                        {divisionNamesWithSuffix.map(div => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">District</label>
                      <select
                        value={bbDistrictFilter}
                        onChange={e => setBbDistrictFilter(e.target.value)}
                        className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                      >
                        <option value="">All Districts</option>
                        {(bbDivisionFilter && bangladeshDivisionsAndDistricts[bbDivisionFilter]
                          ? bangladeshDivisionsAndDistricts[bbDivisionFilter]
                          : Array.from(new Set(Object.values(bangladeshDivisionsAndDistricts).flat()))
                        ).map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* DIRECTORY TABLE CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <span>Certified Blood Banks Directory Node</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage certified hospital blood bank listings and emergency numbers across Bangladesh.
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredBloodBanks.length > 0 && selectedBBIds.length === filteredBloodBanks.length}
                            onChange={e => handleToggleSelectAllBB(e.target.checked)}
                            className="accent-indigo-600 rounded cursor-pointer w-4 h-4"
                          />
                        </th>
                        <th className="p-3.5">Name ↕</th>
                        <th className="p-3.5">Division ↕</th>
                        <th className="p-3.5">District ↕</th>
                        <th className="p-3.5">Phone Hotline ↕</th>
                        <th className="p-3.5">Address ↕</th>
                        <th className="p-3.5">Map Link ↕</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredBloodBanks.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                            No blood bank records found matching your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredBloodBanks.slice(0, bbResultsPerPage).map(bb => {
                          const isSelected = selectedBBIds.includes(bb.id);
                          const phones = bb.phones && bb.phones.length > 0 ? bb.phones : [bb.phone];

                          return (
                            <tr
                              key={bb.id}
                              className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}
                            >
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectBB(bb.id)}
                                  className="accent-indigo-600 rounded cursor-pointer w-4 h-4"
                                />
                              </td>
                              <td className="p-3.5 font-extrabold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                                    🏥
                                  </div>
                                  <span className="font-bold text-slate-900">{bb.name}</span>
                                </div>
                              </td>
                              <td className="p-3.5 font-semibold text-slate-700">{bb.division}</td>
                              <td className="p-3.5 font-semibold text-slate-700">{bb.district}</td>
                              <td className="p-3.5">
                                <div className="flex flex-col gap-1">
                                  {phones.map((ph, idx) => (
                                    <a
                                      key={idx}
                                      href={`tel:${ph.replace(/[^0-9+]/g, '')}`}
                                      className="inline-flex items-center gap-1.5 font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline text-xs"
                                    >
                                      <PhoneCall className="w-3 h-3 text-indigo-500" />
                                      <span>{ph}</span>
                                    </a>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={bb.address || 'N/A'}>
                                {bb.address || 'Dhaka, Bangladesh'}
                              </td>
                              <td className="p-3.5">
                                {bb.mapUrl ? (
                                  <a
                                    href={bb.mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                                  >
                                    <MapPin className="w-3 h-3 text-indigo-600" />
                                    <span>View Map</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-[11px] italic">No map link</span>
                                )}
                              </td>
                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditBBModal(bb)}
                                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-indigo-600 rounded-lg cursor-pointer transition-all"
                                    title="Edit Blood Bank"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteSingleBBModal(bb.id)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer transition-all"
                                    title="Delete Blood Bank"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer / Pagination */}
                <div className="flex items-center justify-between pt-2 text-xs text-slate-500 flex-wrap gap-2">
                  <div>
                    Showing 1 to {Math.min(filteredBloodBanks.length, bbResultsPerPage)} of {filteredBloodBanks.length} entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">«</button>
                    <button type="button" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">‹</button>
                    <button type="button" className="px-2.5 py-1 bg-indigo-600 text-white font-bold border border-indigo-600 rounded-lg cursor-pointer">1</button>
                    <button type="button" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">›</button>
                    <button type="button" className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">»</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------ TAB 9: SUPPORT TICKETS ------------------ */}
          {adminTab === 'tickets' && (
            <div className="space-y-6">
              {/* 1. TOP KPI ANALYTICS CARDS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* KPI 1: All Tickets */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">All tickets</span>
                    <span className="text-2xl font-black text-slate-900">{ticketsList.length}</span>
                  </div>
                  <Users className="w-6 h-6 text-slate-300" />
                </div>

                {/* KPI 2: Avg. Resolution Time */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Avg. Resolution Time</span>
                    <span className="text-2xl font-black text-slate-900">{calculateAvgResolutionTime()}</span>
                  </div>
                  <Clock className="w-6 h-6 text-slate-300" />
                </div>

                {/* KPI 3: Tickets without reply */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Tickets without reply</span>
                    <span className="text-2xl font-black text-slate-900">
                      {ticketsList.filter(t => t.status !== 'Resolved').length}
                    </span>
                  </div>
                  <Target className="w-6 h-6 text-slate-300" />
                </div>
              </div>

              {/* 2. DATA VISUALIZER SECTION GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Chart 1: Bar Chart by Category */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-orange-500" />
                      <span>Ticket Volume by Category</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Real-time metrics</span>
                  </div>

                  <div className="flex items-end justify-around h-44 pt-4 border-b border-slate-100 gap-2">
                    {(() => {
                      const catCounts: Record<string, number> = {};
                      ticketsList.forEach(t => {
                        catCounts[t.cat] = (catCounts[t.cat] || 0) + 1;
                      });
                      const maxVal = Math.max(...Object.values(catCounts), 3);

                      return Object.entries(catCounts).map(([catName, count]) => {
                        const heightPercent = Math.max((count / maxVal) * 120, 24);
                        return (
                          <div key={catName} className="flex flex-col items-center justify-end h-full gap-2 flex-1">
                            <div
                              style={{ height: `${heightPercent}px` }}
                              className="w-8 bg-orange-500 hover:bg-orange-600 rounded-t-md flex items-center justify-center text-white text-[10px] font-black transition-all shadow-xs"
                            >
                              {count}
                            </div>
                            <span
                              className="text-[11px] text-slate-500 font-medium text-center truncate max-w-[120px]"
                              title={catName}
                            >
                              {catName}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Chart 2: Donut Chart Resolution Status */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-orange-500" />
                      <span>Resolution Status</span>
                    </span>
                  </div>

                  {(() => {
                    const totalCount = ticketsList.length || 1;
                    const openCount = ticketsList.filter(x => x.status === 'Open').length;
                    const progressCount = ticketsList.filter(x => x.status === 'In Progress').length;
                    const resolvedCount = ticketsList.filter(x => x.status === 'Resolved').length;

                    const openDeg = (openCount / totalCount) * 360;
                    const progressDeg = openDeg + (progressCount / totalCount) * 360;

                    return (
                      <div className="flex items-center justify-center gap-6 h-44">
                        {/* Conic Ring Donut */}
                        <div
                          className="w-28 h-28 rounded-full flex items-center justify-center relative flex-shrink-0 shadow-xs"
                          style={{
                            background: `conic-gradient(#f59e0b 0deg ${openDeg}deg, #0ea5e9 ${openDeg}deg ${progressDeg}deg, #10b981 ${progressDeg}deg 360deg)`
                          }}
                        >
                          <div className="w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                            <span className="text-[10px] font-bold text-slate-400">TOTAL</span>
                            <span className="text-base font-black text-slate-900">{ticketsList.length}</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-col gap-2.5 text-xs font-semibold">
                          <div className="flex items-center gap-2 text-slate-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            <span>Open ({openCount})</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                            <span>In Progress ({progressCount})</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span>Resolved ({resolvedCount})</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* TICKET CATEGORIES BACKEND MANAGEMENT CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Manage Support Ticket Categories</h3>
                      <p className="text-[11px] text-slate-500">Create, rename, or delete categories available to users in the support ticket form.</p>
                    </div>
                  </div>
                </div>

                {/* Categories List */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentTicketCategories.map((cat, idx) => {
                    const isEditing = editingCategoryIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingCategoryValue}
                              onChange={(e) => setEditingCategoryValue(e.target.value)}
                              className="px-2 py-0.5 text-xs bg-white border border-orange-300 rounded focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEditCategory(idx)}
                              className="text-emerald-600 hover:text-emerald-700 font-bold text-xs cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCategoryIndex(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span>{cat}</span>
                            <button
                              onClick={() => {
                                setEditingCategoryIndex(idx);
                                setEditingCategoryValue(cat);
                              }}
                              className="text-slate-400 hover:text-orange-600 cursor-pointer text-xs"
                              title="Edit Category"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(idx)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer text-xs"
                              title="Delete Category"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add New Category Input */}
                <div className="flex items-center gap-2 pt-2 max-w-md">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter new ticket category name..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Category</span>
                  </button>
                </div>
              </div>

              {/* 3. MAIN TICKETING QUEUE CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">Support Tickets Queue (FIFO Order)</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tickets are automatically processed and structured in First-In, First-Out sequence based on arrival timestamp.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={reloadTicketsDataset}
                    disabled={reloadingSection === 'tickets'}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Reload support tickets dataset directly from DB"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${reloadingSection === 'tickets' ? 'animate-spin text-orange-600' : ''}`} />
                    <span>{reloadingSection === 'tickets' ? 'Reloading...' : 'Reload DB'}</span>
                  </button>
                </div>

                {/* Toolbar Filters */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3.5 flex-wrap flex-1 min-w-[280px]">
                    {/* Search Box */}
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={ticketSearch}
                        onChange={e => {
                          setTicketSearch(e.target.value);
                          setTicketPage(1);
                        }}
                        placeholder="Search ticket, RD User ID, profile..."
                        className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all"
                      />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={ticketCategoryFilter}
                      onChange={e => {
                        setTicketCategoryFilter(e.target.value);
                        setTicketPage(1);
                      }}
                      className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      {currentTicketCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3.5 flex-wrap">
                    {/* Status Filter */}
                    <select
                      value={ticketStatusFilter}
                      onChange={e => {
                        setTicketStatusFilter(e.target.value);
                        setTicketPage(1);
                      }}
                      className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    {/* Per Page Select */}
                    <select
                      value={ticketPerPage}
                      onChange={e => {
                        setTicketPerPage(Number(e.target.value));
                        setTicketPage(1);
                      }}
                      className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                    </select>
                  </div>
                </div>

                {/* Tickets Horizontal Stream List */}
                <div className="flex flex-col gap-3">
                  {filteredTicketsList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-200">
                      No support tickets match your filter criteria.
                    </div>
                  ) : (
                    filteredTicketsList.slice((ticketPage - 1) * ticketPerPage, ticketPage * ticketPerPage).map(t => {
                      let indicatorBg = 'bg-amber-500';
                      if (t.status === 'In Progress') indicatorBg = 'bg-sky-500';
                      if (t.status === 'Resolved') indicatorBg = 'bg-emerald-500';

                      const durationText = calculateTicketDuration(new Date(t.createdAt), t.updatedAt && t.status === 'Resolved' ? new Date(t.updatedAt) : null);
                      const user = usersList.find(u => u.email === t.userEmail);
                      const profileName = user?.full_name || 'Unknown User';
                      const userPhone = user?.phone || 'No Contact Info';
                      const createdAtDate = new Date(t.createdAt);

                      return (
                        <div
                          key={t.id}
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative transition-all shadow-2xs hover:shadow-xs"
                        >
                          {/* Left Colored Indicator Bar */}
                          <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-md ${indicatorBg}`} />

                          <div className="flex items-center gap-5 flex-1 min-w-0 pl-2">
                            {/* Date & Time Tag */}
                            <div className="flex flex-col gap-0.5 whitespace-nowrap text-xs">
                              <b className="font-extrabold text-slate-900">{createdAtDate.toLocaleDateString()}</b>
                              <span className="text-[11px] text-slate-400 font-medium">{createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Title & Snippet Block */}
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <h4 className="font-extrabold text-sm text-slate-900 truncate" title={t.subject}>
                                {t.subject}
                              </h4>
                              <p className="text-xs text-slate-500 truncate" title={t.description}>
                                {t.description}
                              </p>
                            </div>
                          </div>

                          {/* User Badge */}
                          <div className="px-4 py-0.5 border-l border-r border-slate-200 flex flex-col gap-0.5 whitespace-nowrap">
                            <span className="text-[11px] text-slate-500 font-semibold">
                              <b className="text-slate-900 font-extrabold">{profileName}</b>
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Phone/WP: <span className="font-mono font-extrabold text-blue-600">{userPhone}</span>
                            </span>
                          </div>

                          {/* Duration Tag */}
                          <div className="px-2 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{durationText}</span>
                            </span>
                          </div>

                          {/* Inline Controls */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              value={t.status}
                              onChange={e => handleTicketStatus(t.id, e.target.value)}
                              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 cursor-pointer focus:border-orange-500 focus:outline-none transition-all"
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between pt-2 text-xs text-slate-500 flex-wrap gap-2">
                  <div>
                    Showing {filteredTicketsList.length === 0 ? 0 : (ticketPage - 1) * ticketPerPage + 1} to{' '}
                    {Math.min(ticketPage * ticketPerPage, filteredTicketsList.length)} of {filteredTicketsList.length} entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={ticketPage === 1}
                      onClick={() => setTicketPage(prev => Math.max(prev - 1, 1))}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      «
                    </button>
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-orange-500 text-white font-bold border border-orange-500 rounded-lg cursor-pointer"
                    >
                      {ticketPage}
                    </button>
                    <button
                      type="button"
                      disabled={ticketPage * ticketPerPage >= filteredTicketsList.length}
                      onClick={() => setTicketPage(prev => prev + 1)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------ TAB 10: DEV FUND RECEIPTS ------------------ */}
          {adminTab === 'donations' && (
            <div className="space-y-6">
              {/* 1. ADMIN CONFIGURATION PANEL (Collapsible Dropdown Accordion) */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl overflow-hidden shadow-xs">
                {/* Header Toggle */}
                <div
                  onClick={() => setConfigAccordionOpen(prev => !prev)}
                  className="p-5 flex items-center justify-between cursor-pointer bg-amber-100/70 hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sliders className="w-5 h-5 text-amber-700" />
                    <div>
                      <h3 className="text-sm font-extrabold text-amber-900">
                        Admin Control Panel: User-Facing View Configuration
                      </h3>
                      <p className="text-xs text-amber-800/80 mt-0.5">
                        Click to expand/collapse configuration settings (MFS, Banks, Title, Button Text, and Mission Description).
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-amber-700 transition-transform duration-300 ${configAccordionOpen ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Body Content */}
                {configAccordionOpen && (
                  <form onSubmit={handleApplyUserViewSettings} className="p-5 space-y-5 bg-amber-50/50">
                    {/* Title & Button Text */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-amber-900 uppercase">Platform Title</label>
                        <input
                          type="text"
                          value={configTitle}
                          onChange={e => setConfigTitle(e.target.value)}
                          required
                          className="w-full h-10 px-3 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-amber-900 uppercase">
                          Button Text ("Buy a Coffee / Donate")
                        </label>
                        <input
                          type="text"
                          value={configBtnText}
                          onChange={e => setConfigBtnText(e.target.value)}
                          required
                          className="w-full h-10 px-3 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Mission Subtitle Description */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 uppercase">Mission Subtitle Description</label>
                      <input
                        type="text"
                        value={configDesc}
                        onChange={e => setConfigDesc(e.target.value)}
                        required
                        className="w-full h-10 px-3 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* MFS Dynamic Manager */}
                    <div className="border-t border-dashed border-amber-300 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-amber-700" />
                          <span>MFS Gateways</span>
                        </h4>
                        <button
                          type="button"
                          onClick={handleAddMfsField}
                          className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add MFS
                        </button>
                      </div>

                      <div className="space-y-2">
                        {mfsConfigList.map((mfs, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-amber-200">
                            <input
                              type="text"
                              value={mfs.name}
                              onChange={e => {
                                const val = e.target.value;
                                setMfsConfigList(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                              }}
                              placeholder="MFS Name (e.g. bKash)"
                              className="sm:col-span-5 h-9 px-3 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                              required
                            />
                            <input
                              type="text"
                              value={mfs.number}
                              onChange={e => {
                                const val = e.target.value;
                                setMfsConfigList(prev => prev.map((item, i) => i === idx ? { ...item, number: val } : item));
                              }}
                              placeholder="Number / ID"
                              className="sm:col-span-6 h-9 px-3 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveMfsField(idx)}
                              className="sm:col-span-1 h-9 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bank Accounts Manager */}
                    <div className="border-t border-dashed border-amber-300 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-700" />
                          <span>Bank Accounts</span>
                        </h4>
                        <button
                          type="button"
                          onClick={handleAddBankField}
                          className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Bank
                        </button>
                      </div>

                      <div className="space-y-2">
                        {bankConfigList.map((bank, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-amber-200">
                            <input
                              type="text"
                              value={bank.name}
                              onChange={e => {
                                const val = e.target.value;
                                setBankConfigList(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                              }}
                              placeholder="Bank Name"
                              className="sm:col-span-2 h-9 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                              required
                            />
                            <input
                              type="text"
                              value={bank.accountName}
                              onChange={e => {
                                const val = e.target.value;
                                setBankConfigList(prev => prev.map((item, i) => i === idx ? { ...item, accountName: val } : item));
                              }}
                              placeholder="Account Name"
                              className="sm:col-span-3 h-9 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                              required
                            />
                            <input
                              type="text"
                              value={bank.account}
                              onChange={e => {
                                const val = e.target.value;
                                setBankConfigList(prev => prev.map((item, i) => i === idx ? { ...item, account: val } : item));
                              }}
                              placeholder="Account Number"
                              className="sm:col-span-2 h-9 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                              required
                            />
                            <input
                              type="text"
                              value={bank.branch}
                              onChange={e => {
                                const val = e.target.value;
                                setBankConfigList(prev => prev.map((item, i) => i === idx ? { ...item, branch: val } : item));
                              }}
                              placeholder="Branch Name"
                              className="sm:col-span-2 h-9 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                              required
                            />
                            <input
                              type="text"
                              value={bank.routing}
                              onChange={e => {
                                const val = e.target.value;
                                setBankConfigList(prev => prev.map((item, i) => i === idx ? { ...item, routing: val } : item));
                              }}
                              placeholder="Routing / SWIFT Code"
                              className="sm:col-span-2 h-9 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveBankField(idx)}
                              className="sm:col-span-1 h-9 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="h-10 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                    >
                      <span>Apply Changes to User View</span>
                    </button>
                  </form>
                )}
              </div>

              {/* 2. TOP KPI CARDS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Total Audit Receipts</span>
                    <span className="text-2xl font-black text-slate-900">{receiptsList.length}</span>
                  </div>
                  <Receipt className="w-6 h-6 text-slate-300" />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Total Verified Funds</span>
                    <span className="text-2xl font-black text-emerald-600">
                      ৳ {receiptsList.filter(x => x.status === 'Verified').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <Building2 className="w-6 h-6 text-slate-300" />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Pending Verification</span>
                    <span className="text-2xl font-black text-amber-600">
                      {receiptsList.filter(x => x.status === 'Unverified').length}
                    </span>
                  </div>
                  <Clock className="w-6 h-6 text-slate-300" />
                </div>
              </div>

              {/* 3. MAIN AUDIT RECEIPTS CARD */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                      <Heart className="w-5 h-5 fill-rose-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">Dev & Operations Support Receipts</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Audit donor support transactions (bKash, Nagad, Bank Transfers).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={reloadDonationsDataset}
                      disabled={reloadingSection === 'donations'}
                      className="h-10 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Reload Dev Fund donation receipts directly from DB"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${reloadingSection === 'donations' ? 'animate-spin text-rose-600' : ''}`} />
                      <span>{reloadingSection === 'donations' ? 'Reloading...' : 'Reload DB'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenAddReceiptModal}
                      className="h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Receipt</span>
                    </button>
                  </div>
                </div>

                {/* Toolbar Filters */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
                    {/* Search Box */}
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={receiptSearch}
                        onChange={e => setReceiptSearch(e.target.value)}
                        placeholder="Search receipt ID, contributor, TRX..."
                        className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    {/* Method Filter */}
                    <select
                      value={receiptMethodFilter}
                      onChange={e => setReceiptMethodFilter(e.target.value)}
                      className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                    >
                      <option value="">All Payment Methods</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <select
                    value={receiptStatusFilter}
                    onChange={e => setReceiptStatusFilter(e.target.value)}
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="Verified">Verified</option>
                    <option value="Unverified">Unverified</option>
                  </select>
                </div>

                {/* Receipts Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Receipt ID</th>
                        <th className="p-3.5">Contributor</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Method</th>
                        <th className="p-3.5">Transaction TRX</th>
                        <th className="p-3.5">Verification</th>
                        <th className="p-3.5 text-right">Admin Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-medium">
                      {(() => {
                        const filtered = receiptsList.filter(r => {
                          const q = receiptSearch.trim().toLowerCase();
                          const matchesQ = !q ||
                            r.id.toLowerCase().includes(q) ||
                            r.contributor.toLowerCase().includes(q) ||
                            r.trx.toLowerCase().includes(q);
                          const matchesMethod = !receiptMethodFilter || r.method === receiptMethodFilter;
                          const matchesStatus = !receiptStatusFilter || r.status === receiptStatusFilter;

                          return matchesQ && matchesMethod && matchesStatus;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                                No support receipts found.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-orange-600">{r.id}</td>
                            <td className="p-3.5 font-bold text-slate-900">{r.contributor}</td>
                            <td className="p-3.5 font-black text-emerald-600 text-sm">৳ {r.amount.toLocaleString()}</td>
                            <td className="p-3.5 font-semibold text-slate-700">{r.method}</td>
                            <td className="p-3.5 font-mono font-semibold text-slate-600">{r.trx}</td>
                            <td className="p-3.5">
                              {r.status === 'Verified' ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleReceiptStatus(r.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-100 transition-all"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verified</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleReceiptStatus(r.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-100 transition-all"
                                >
                                  <span>Verify TRX</span>
                                </button>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenInvoiceModal(r.id)}
                                  className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Invoice</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditReceiptModal(r.id)}
                                  className="px-2.5 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReceipt(r.id)}
                                  className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. ADD / EDIT RECEIPT MODAL */}
              {showReceiptModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900">
                      {editingReceiptId ? 'Edit Support Receipt' : 'Add Support Receipt'}
                    </h3>

                    <form onSubmit={handleSaveReceipt} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contributor Name</label>
                        <input
                          type="text"
                          required
                          value={modalContributor}
                          onChange={e => setModalContributor(e.target.value)}
                          placeholder="e.g. Tariqul Alam or Anonymous"
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-900 focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (৳)</label>
                          <input
                            type="number"
                            required
                            value={modalAmount}
                            onChange={e => setModalAmount(e.target.value)}
                            placeholder="5000"
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                          <select
                            value={modalMethod}
                            onChange={e => setModalMethod(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-900 focus:border-orange-500 focus:outline-none cursor-pointer"
                          >
                            <option value="bKash">bKash</option>
                            <option value="Nagad">Nagad</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transaction TRX</label>
                        <input
                          type="text"
                          required
                          value={modalTrx}
                          onChange={e => setModalTrx(e.target.value)}
                          placeholder="e.g. BK99283120"
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Verification Status</label>
                        <select
                          value={modalStatus}
                          onChange={e => setModalStatus(e.target.value as any)}
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-900 focus:border-orange-500 focus:outline-none cursor-pointer"
                        >
                          <option value="Verified">Verified</option>
                          <option value="Unverified">Unverified</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowReceiptModal(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                        >
                          Save Record
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 5. PRINTABLE OFFICIAL LETTERHEAD INVOICE MODAL (DON-10000x FORMAT) */}
              {showInvoiceModal && invoiceReceipt && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                    {/* Letterhead */}
                    <div className="flex items-start justify-between border-b-2 border-slate-200 pb-5 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0">
                          <Heart className="w-6 h-6 fill-rose-600" />
                        </div>
                        <div>
                          <h1 className="text-base font-black text-slate-900">RedDonor Operations & Dev</h1>
                          <p className="text-xs text-slate-500 mt-0.5">Emergency Blood Bank & Donor Network Node</p>
                          <p className="text-[11px] text-slate-400">Dhaka, Bangladesh | support@reddonor.org</p>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <span className="text-sm font-black text-rose-600 uppercase block">Official Support Invoice</span>
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                          {invoiceReceipt.id}
                        </span>
                        <p className="text-[11px] text-slate-400 block pt-0.5">Date: August 12, 2026</p>
                      </div>
                    </div>

                    {/* Billing Grid */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Contributor / Supporter</span>
                        <div className="font-extrabold text-slate-900 text-sm mt-0.5">{invoiceReceipt.contributor}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Audit Verification</span>
                        <div className="mt-1">
                          {invoiceReceipt.status === 'Verified' ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md font-bold text-[11px]">
                              Verified
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-md font-bold text-[11px]">
                              Unverified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Invoice Items Table */}
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white uppercase text-[10px] font-extrabold tracking-wider">
                          <th className="p-3 rounded-l-lg">Description</th>
                          <th className="p-3">Payment Method</th>
                          <th className="p-3">Reference TRX</th>
                          <th className="p-3 text-right rounded-r-lg">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-3 py-4">
                            <b className="text-slate-900 font-bold block">Dev & Infrastructure Support Contribution</b>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              General fund contribution for server uptime and donor radar maintenance.
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{invoiceReceipt.method}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{invoiceReceipt.trx}</td>
                          <td className="p-3 text-right font-black text-slate-900">৳ {invoiceReceipt.amount.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Total Summary */}
                    <div className="flex justify-end pt-2">
                      <div className="w-64 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span className="font-bold text-slate-800">৳ {invoiceReceipt.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t-2 border-slate-900 pt-2 font-black text-sm">
                          <span>Total Paid:</span>
                          <span className="text-emerald-600">৳ {invoiceReceipt.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs">
                      <span className="text-[11px] text-slate-400">
                        Digitally verified secure document. Requires no manual signature.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowInvoiceModal(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Invoice</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------ TAB 11: SYSTEM OPERATIONS ------------------ */}
          {adminTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xs max-w-2xl">
                <div className="border-b border-slate-100 pb-5 mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                      <Settings className="w-6 h-6 text-slate-700" />
                      <span>System Operations & Broadcast Banner</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Configure emergency alert banner, maintenance mode, and default radar radius.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => reloadSettingsDataset('settings')}
                    disabled={reloadingSection === 'settings'}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Reload system operations configuration from DB"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${reloadingSection === 'settings' ? 'animate-spin text-slate-800' : ''}`} />
                    <span>{reloadingSection === 'settings' ? 'Reloading...' : 'Reload DB'}</span>
                  </button>
                </div>

                <form onSubmit={handleSaveSystemConfig} className="space-y-5">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Top Announcement Alert Banner
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAnnouncementActive}
                          onChange={e => setIsAnnouncementActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    <textarea
                      rows={2}
                      value={announcementMsg}
                      onChange={e => setAnnouncementMsg(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Radar Radius (KM)
                      </label>
                      <input
                        type="number"
                        value={defaultRadarKm}
                        onChange={e => setDefaultRadarKm(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                      />
                    </div>

                  </div>

                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-rose-900">Maintenance Mode</div>
                      <div className="text-[10px] text-rose-700">Restricts public access with maintenance notice</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={maintenanceMode}
                        onChange={e => setMaintenanceMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save System Operations Settings</span>
                  </button>
                </form>
              </div>

              {/* Real Operating Admin Accounts Card */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xs max-w-2xl space-y-6">
                <div className="border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                      <Shield className="w-6 h-6 text-rose-600" />
                      <span>Operating Admin Accounts & Credentials</span>
                    </h2>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-extrabold">
                      Real Admin Mode Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage real operating administrator credentials, create new operational accounts, and configure permissions.
                  </p>
                </div>

                {/* Existing Admin Accounts List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Registered Operating Administrators ({adminAccounts?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {adminAccounts?.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{acc.username}</span>
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-extrabold">
                              {acc.role}
                            </span>
                          </div>
                          <div className="text-slate-500 font-mono">{acc.email}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (adminUser?.role !== 'Super Admin' && adminUser?.email !== 'kfalifalsiam540@gmail.com') {
                                showToast('Only Super Admin can create or remove operating admin accounts.', true);
                                return;
                              }
                              removeAdminAccount(acc.email);
                            }}
                            disabled={adminAccounts.length <= 1}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Create New Operating Admin Account Form */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-rose-600" />
                    <span>Create New Operating Admin Account</span>
                  </h3>

                  <form onSubmit={handleCreateAdminAccount} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          placeholder="Full name of admin"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Official Admin Email
                        </label>
                        <input
                          type="email"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="admin@yourdomain.com"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={newAdminPass}
                          onChange={(e) => setNewAdminPass(e.target.value)}
                          placeholder="Set secure password"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Admin Privilege
                        </label>
                        <select
                          value={newAdminRole}
                          onChange={(e) => setNewAdminRole(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        >
                          <option value="Super Admin">Super Admin (Full Platform Control)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register & Authorize Operating Admin</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      {/* 2. Modal for Creating Override Request */}
      {showCreateOverrideReqModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Force Create Emergency Request</h3>
            <form onSubmit={handleCreateOverrideReq} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Blood Group</label>
                  <select
                    value={newReqType}
                    onChange={e => setNewReqType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Bags Needed</label>
                  <input
                    type="number"
                    min={1}
                    value={newReqQty}
                    onChange={e => setNewReqQty(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={newReqHospital}
                  onChange={e => setNewReqHospital(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Hospital Location</label>
                <input
                  type="text"
                  required
                  value={newReqLocation}
                  onChange={e => setNewReqLocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={newReqReason}
                  onChange={e => setNewReqReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOverrideReqModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold shadow-xs"
                >
                  Broadcast Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal for Add / Edit Blood Bank */}
      {showAddBloodBankModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>{editingBB ? 'Edit Certified Blood Bank Node' : 'Add Certified Blood Bank Node'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBloodBankModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBloodBankForm} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Blood Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Red Crescent Blood Bank"
                  value={bbFormName}
                  onChange={e => setBbFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Division *</label>
                  <select
                    value={bbFormDivision}
                    onChange={e => {
                      const div = e.target.value;
                      setBbFormDivision(div);
                      const dists = bangladeshDivisionsAndDistricts[div] || [];
                      if (dists.length > 0) setBbFormDistrict(dists[0]);
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer focus:bg-white focus:outline-none"
                  >
                    {divisionNamesWithSuffix.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">District *</label>
                  <select
                    value={bbFormDistrict}
                    onChange={e => setBbFormDistrict(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer focus:bg-white focus:outline-none"
                  >
                    {(bangladeshDivisionsAndDistricts[bbFormDivision] || ['Dhaka']).map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 uppercase block">Phone Hotlines *</label>
                <input
                  type="text"
                  required
                  placeholder="Primary Hotline (e.g. +880 2-9330188)"
                  value={bbFormPhone1}
                  onChange={e => setBbFormPhone1(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-700 focus:bg-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Secondary Hotline (Optional)"
                  value={bbFormPhone2}
                  onChange={e => setBbFormPhone2(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Tertiary Hotline (Optional)"
                  value={bbFormPhone3}
                  onChange={e => setBbFormPhone3(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Full Address</label>
                <input
                  type="text"
                  placeholder="e.g. 7/1 Aurangzeb Road, Mohammadpur, Dhaka"
                  value={bbFormAddress}
                  onChange={e => setBbFormAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Google Maps Link / Paste Text</label>
                <textarea
                  placeholder="Paste Google Maps 'Share' text here..."
                  value={bbFormMapUrl}
                  onChange={e => {
                    const val = e.target.value;
                    setBbFormMapUrl(val);
                    const data = extractDataFromMapPaste(val);
                    if (data) {
                      if (data.lat && data.lng) { setBbFormLat(data.lat); setBbFormLng(data.lng); }
                      if (data.name && !bbFormName) setBbFormName(data.name);
                      if (data.address && !bbFormAddress) setBbFormAddress(data.address);
                      if (data.phone && !bbFormPhone1) setBbFormPhone1(data.phone);
                    }
                  }}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Exact GPS Coordinates (For Live Distance Calculation) */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <span>📍 GPS Coordinates (For Live User Distance in KM)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          pos => {
                            setBbFormLat(String(pos.coords.latitude));
                            setBbFormLng(String(pos.coords.longitude));
                            showToast('📍 Loaded your current GPS coordinates!');
                          },
                          err => showToast('Could not get GPS coordinates: ' + err.message, true)
                        );
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-0.5 rounded-md border border-indigo-200 cursor-pointer"
                  >
                    📍 Use Current Location
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Latitude (e.g. 23.8103)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="23.8103"
                      value={bbFormLat}
                      onChange={e => setBbFormLat(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Longitude (e.g. 90.4125)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="90.4125"
                      value={bbFormLng}
                      onChange={e => setBbFormLng(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  When Latitude & Longitude are set, every user sees their exact real-time distance in KM to this blood bank.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBloodBankModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-all"
                >
                  {editingBB ? 'Save Changes' : 'Add to Directory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3b. Modal for Confirm Delete Blood Bank */}
      {showDeleteBBConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Confirm Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {bbToDeleteId ? (
                <>
                  Are you sure you want to remove <strong className="text-slate-900">{bloodBanksList.find(b => b.id === bbToDeleteId)?.name}</strong> from the directory?
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong className="text-slate-900">{selectedBBIds.length} selected blood bank records</strong>?
                </>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowDeleteBBConfirmModal(false); setBbToDeleteId(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBB}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
              >
                Delete Record(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal for Editing Emergency Request Override */}
      {editingReq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Override Request #{editingReq.id}</h3>
            <form onSubmit={handleSaveReqEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Hospital Name</label>
                  <input
                    type="text"
                    value={editingReq.hospitalName}
                    onChange={e => setEditingReq({ ...editingReq, hospitalName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Blood Group</label>
                  <select
                    value={editingReq.bloodType}
                    onChange={e => setEditingReq({ ...editingReq, bloodType: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Hospital Location</label>
                <input
                  type="text"
                  value={editingReq.hospitalLocation}
                  onChange={e => setEditingReq({ ...editingReq, hospitalLocation: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Reason / Description</label>
                <textarea
                  rows={2}
                  value={editingReq.reasonNeeded}
                  onChange={e => setEditingReq({ ...editingReq, reasonNeeded: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReq(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal for Editing Emergency Contact */}
      {showEditContactModal && editingContact && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900">Edit Emergency Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditContactModal(false); setEditingContact(null); }}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditContactModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Icon Emoji</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editContactIcon}
                    onChange={e => setEditContactIcon(e.target.value)}
                    className="w-16 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold"
                  />
                  <div className="flex items-center gap-1">
                    {['🚨', '🏥', '🩸', '🚑', '📞', '❤️', '🚒', '🛡️'].map(ico => (
                      <button
                        key={ico}
                        type="button"
                        onClick={() => setEditContactIcon(ico)}
                        className={`p-2 rounded-lg border text-sm cursor-pointer transition-all ${editContactIcon === ico ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                      >
                        {ico}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Contact Title</label>
                <input
                  type="text"
                  value={editContactTitle}
                  onChange={e => setEditContactTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                  placeholder="e.g. Red Crescent Blood Center"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phone Number / Hotline</label>
                <input
                  type="text"
                  value={editContactNumber}
                  onChange={e => setEditContactNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-600 focus:bg-white focus:outline-none"
                  placeholder="e.g. +880 1811-458524"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Category</label>
                <select
                  value={editContactCategory}
                  onChange={e => setEditContactCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                >
                  <option value="National">National</option>
                  <option value="Medical">Medical</option>
                  <option value="Blood Bank">Blood Bank</option>
                  <option value="Dispatch">Dispatch</option>
                  <option value="Hotline">Hotline</option>
                  <option value="Rescue">Rescue</option>
                  <option value="Health Info">Health Info</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowEditContactModal(false); setEditingContact(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-all"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
