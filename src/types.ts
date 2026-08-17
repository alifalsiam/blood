export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UserRole = 'Receiver' | 'Donor';

export type ActivityStatus = 'online' | 'offline';

export interface UserProfile {
  id: string;
  userId: string; // e.g. RD982745
  fullName: string;
  email: string;
  phone: string;
  bloodGroup: BloodType;
  weight: number;
  sex: 'Male' | 'Female' | 'Other';
  dob: string;
  avatarUrl: string;
  coverUrl: string;
  totalDonations: number;
  lastDonatedDate?: string;
  lastDonatedAt?: string | null;
  verified: boolean;
  status: 'Active' | 'Verified' | 'Banned';
  createdAt?: string;
  rating: number;
  emergencyContact?: string;
  whatsappNumber?: string;
  address?: string;
  division?: string;
  district?: string;
  role?: string;
  activeRole?: string;
  onlineStatus?: string;
  activityStatus?: ActivityStatus;
  isLoggedIn?: boolean;
  latitude?: number;
  longitude?: number;
  lastLocationUpdate?: string;
}

export interface BloodComponentQty {
  qtyWhole: number;
  qtyPlatelets: number;
  qtyPlasma: number;
  qtyDoubleRed: number;
}

export interface MatchedDonorInfo {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  distanceKm: number;
  bloodGroup: BloodType;
  status: 'En Route' | 'Accepted' | 'Notified' | 'In 25km Zone';
  rating: number;
  totalDonations: number;
  locationName: string;
  age?: number;
  weight?: number;
  sex?: 'Male' | 'Female' | 'Other';
  lastDonated?: string;
  isVerified?: boolean;
  hasExpressedInterest?: boolean;
  hasSharedContact?: boolean;
  hasDonorConfirmedArrival?: boolean;
  receiverConfirmed?: boolean;
  donorCompleted?: boolean;
  ratingGiven?: number;
  reviewGiven?: string;
  isSuperDonor?: boolean;
  whatsappNumber?: string;
  emergencyContact?: string;
}

export interface BloodRequest extends BloodComponentQty {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  userWhatsapp?: string;
  userEmergencyContact?: string;
  bloodType: BloodType;
  hospitalName: string;
  hospitalLocation: string;
  latitude?: number;
  longitude?: number;
  reasonNeeded: string;
  neededInHours: number;
  createdAt: string;
  expiresAt: number;
  status: 'active' | 'cancelled' | 'fulfilled';
  cancelReason?: string;
  matchedDonors?: MatchedDonorInfo[];
  selectedDonorId?: string;
  matchStage?: 'broadcast' | 'donor_declined' | 'mutual_contact_shared' | 'donor_withdrawn_post_chat' | 'donor_arriving_pending_approval' | 'arrival_declined_cross_match' | 'arrival_confirmed_and_approved' | 'donor_completed' | 'rating_submitted' | 'fully_resolved' | 'donor_interested' | 'contact_shared' | 'receiver_confirmed';
  donor_completed?: boolean;
  receiver_completed?: boolean;
}

export interface BloodBank {
  id: string;
  name: string;
  division: string;
  district: string;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  phone: string;
  phones?: string[];
  address?: string;
  mapUrl?: string;
}

export interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  userEmail?: string;
}

export interface DonationReceipt {
  id: string;
  name: string;
  contact: string;
  senderAccount: string;
  amount: string;
  trxId: string;
  isNameless: boolean;
  createdAt: string;
}

export interface DonorInterestBid {
  id: string;
  hospitalName: string;
  location: string;
  bloodType: BloodType;
  distanceKm: number;
  hoursLeft: string;
  hasExpressedInterest: boolean;
}

export interface EmergencyContact {
  id: string;
  title: string;
  number: string;
  tel?: string;
  icon?: string;
  category?: string;
}

export interface CarouselSlide {
  id: string;
  title?: string;
  pcImageUrl: string;
  mobileImageUrl: string;
  linkUrl: string;
  buttonText?: string;
}

export interface AdSystemConfig {
  feedCarousel: {
    active: boolean;
    autoSlideMs: number;
    slides: CarouselSlide[];
  };
  sidebarAd: {
    active: boolean;
    pcImageUrl: string;
    mobileImageUrl: string;
    linkUrl: string;
  };
  popupAd: {
    active: boolean;
    title?: string;
    pcImageUrl: string;
    mobileImageUrl: string;
    linkUrl: string;
    buttonText?: string;
    displayFrequency?: 'once_per_session' | 'every_time';
  };
}

export interface SiteConfig {
  companyName: string;
  logoSymbol?: string;
  logoUrl?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  logoDisplayMode?: 'both' | 'logoOnly' | 'nameOnly';
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  analyticsId: string;
  metaPixelId?: string;
  maintenanceMode: boolean;
  announcementActive: boolean;
  announcementText: string;
  emergencyHotline: string;
  emergencyContacts?: EmergencyContact[];
  ticketCategories?: string[];
  radarRadiusKm: number;
  adSystem?: AdSystemConfig;
  allowCustomAvatars?: boolean;
  presetAvatars?: string[];
  presetCovers?: string[];
  defaultAvatar?: string;
  defaultCover?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl: string;
  lastLogin: string;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'stats'
  | 'emergency' 
  | 'bloodbank' 
  | 'donorCard' 
  | 'supportDev' 
  | 'supportTickets' 
  | 'profile'
  | 'admin'
  | 'admin/login'
  | 'notFound';

export interface AdRecord {
  id: string;
  placement: string; // 'carousel', 'sidebar', 'popup'
  is_active: boolean;
  pc_image_url: string;
  mobile_image_url: string;
  link_url: string;
  title: string;
  button_text: string;
  auto_slide_ms: number;
  display_order: number;
}
