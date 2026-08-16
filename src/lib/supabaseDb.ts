/**
 * supabaseDb.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source-of-truth data-access layer for production.
 * ALL reads and writes go through Supabase — no Express /api/* calls.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { supabase } from './supabase';
import type { BloodBank, BloodRequest, SiteConfig, SupportTicket, EmergencyContact, AdRecord } from '../types';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Map a Supabase blood_banks row → BloodBank */
const rowToBloodBank = (r: any): BloodBank => ({
  id: r.id,
  name: r.name,
  division: r.division,
  district: r.district,
  phone: r.phone,
  phones: Array.isArray(r.phones) ? r.phones : (r.phone ? [r.phone] : []),
  address: r.address,
  mapUrl: r.map_url || '',
  latitude: r.latitude ? Number(r.latitude) : undefined,
  longitude: r.longitude ? Number(r.longitude) : undefined,
  distanceKm: r.distance_km ? Number(r.distance_km) : undefined,
});

/** Map a Supabase blood_requests row → BloodRequest */
const rowToBloodRequest = (r: any): BloodRequest => ({
  id: r.id,
  userId: r.receiver_id || r.user_id,
  userEmail: r.user_email,
  userName: r.user_name,
  userPhone: r.user_phone,
  bloodType: r.blood_type,
  hospitalName: r.hospital_name,
  hospitalLocation: r.hospital_location,
  latitude: r.latitude,
  longitude: r.longitude,
  qtyWhole: r.qty_whole || 0,
  qtyPlatelets: r.qty_platelets || 0,
  qtyPlasma: r.qty_plasma || 0,
  qtyDoubleRed: r.qty_double_red || 0,
  reasonNeeded: r.reason_needed,
  neededInHours: r.needed_in_hours || 4,
  createdAt: r.created_at,
  expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : Date.now() + 4 * 3600 * 1000,
  status: r.status || 'active',
  matchedDonors: Array.isArray(r.matched_donors) ? r.matched_donors : (() => { try { return typeof r.matched_donors === 'string' ? JSON.parse(r.matched_donors) : []; } catch { return []; } })(),
  selectedDonorId: r.selected_donor_id,
  matchStage: r.match_stage || 'broadcast',
  cancelReason: r.cancel_reason,
});

/** Map a Supabase support_tickets row → SupportTicket */
const rowToTicket = (r: any): SupportTicket => ({
  id: r.id,
  category: r.category,
  subject: r.subject,
  description: r.message,
  status: r.status || 'Open',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  userId: r.user_id,
  userEmail: r.user_email,
});

/** Map a Supabase emergency_contacts row → EmergencyContact */
const rowToEmergencyContact = (r: any): EmergencyContact => ({
  id: r.id,
  title: r.title,
  number: r.number,
  tel: r.tel,
  icon: r.icon,
  category: r.category,
});

// ─── BLOOD BANKS ─────────────────────────────────────────────────────────────

export async function fetchBloodBanks(): Promise<BloodBank[]> {
  const { data, error } = await supabase.from('blood_banks').select('*').order('name');
  if (error) { console.warn('fetchBloodBanks error:', error.message); return []; }
  return (data || []).map(rowToBloodBank);
}

export async function saveBloodBanks(banks: BloodBank[]): Promise<void> {
  // Delete all then re-insert for clean sync
  await supabase.from('blood_banks').delete().neq('id', '___no_match___');
  if (banks.length === 0) return;
  const rows = banks.map(b => ({
    id: b.id,
    name: b.name,
    division: b.division,
    district: b.district,
    phone: b.phone,
    phones: b.phones || [b.phone],
    address: b.address || '',
    map_url: b.mapUrl || '',
    latitude: b.latitude ?? null,
    longitude: b.longitude ?? null,
    distance_km: b.distanceKm ?? 0,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('blood_banks').insert(rows);
  if (error) console.warn('saveBloodBanks error:', error.message);
}

export async function upsertBloodBank(bank: BloodBank): Promise<void> {
  const { error } = await supabase.from('blood_banks').upsert({
    id: bank.id,
    name: bank.name,
    division: bank.division,
    district: bank.district,
    phone: bank.phone,
    phones: bank.phones || [bank.phone],
    address: bank.address || '',
    map_url: bank.mapUrl || '',
    latitude: bank.latitude ?? null,
    longitude: bank.longitude ?? null,
    distance_km: bank.distanceKm ?? 0,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('upsertBloodBank error:', error.message);
}

export async function deleteBloodBank(id: string): Promise<void> {
  const { error } = await supabase.from('blood_banks').delete().eq('id', id);
  if (error) console.warn('deleteBloodBank error:', error.message);
}

export async function deleteBulkBloodBanks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('blood_banks').delete().in('id', ids);
  if (error) console.warn('deleteBulkBloodBanks error:', error.message);
}

// ─── EMERGENCY CONTACTS ──────────────────────────────────────────────────────

export async function fetchEmergencyContacts(): Promise<{ hotline: string; contacts: EmergencyContact[] }> {
  const [{ data: contacts }, { data: settings }] = await Promise.all([
    supabase.from('emergency_contacts').select('*').order('title'),
    supabase.from('site_settings').select('emergency_hotline').eq('id', 'global_config').maybeSingle(),
  ]);
  return {
    hotline: settings?.emergency_hotline || '999 / 16263',
    contacts: (contacts || []).map(rowToEmergencyContact),
  };
}

export async function saveEmergencyContacts(hotline: string, contacts: EmergencyContact[]): Promise<void> {
  // Update hotline in site_settings
  await supabase.from('site_settings').upsert({ id: 'global_config', emergency_hotline: hotline, updated_at: new Date().toISOString() });
  // Replace contacts
  await supabase.from('emergency_contacts').delete().neq('id', '___no_match___');
  if (contacts.length > 0) {
    const rows = contacts.map(c => ({
      id: c.id,
      title: c.title,
      number: c.number,
      tel: c.tel || `tel:${c.number.replace(/[^0-9+]/g, '')}`,
      icon: c.icon || '📞',
      category: c.category || 'Medical',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('emergency_contacts').insert(rows);
    if (error) console.warn('saveEmergencyContacts insert error:', error.message);
  }
}

// ─── SITE CONFIG ─────────────────────────────────────────────────────────────

export async function fetchSiteConfig(): Promise<Partial<SiteConfig> | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'global_config')
    .maybeSingle();
  if (error || !data) return null;
  // If full config_json is stored, return it merged with scalar fields
  let fromJson: Partial<SiteConfig> = {};
  if (data.config_json) {
    if (typeof data.config_json === 'string') {
      try { fromJson = JSON.parse(data.config_json); } catch (e) {}
    } else {
      fromJson = data.config_json;
    }
  }
  // Map DB Ads to AdSystemConfig
  const ads = await fetchAds();
  const mappedAdSystem: any = {
    feedCarousel: { active: false, autoSlideMs: 5000, slides: [] },
    sidebarAd: { active: false, pcImageUrl: '', mobileImageUrl: '', linkUrl: '' },
    popupAd: { active: false, title: '', pcImageUrl: '', mobileImageUrl: '', linkUrl: '', buttonText: '' }
  };
  
  ads.forEach(ad => {
    // Only map active ads to prevent stale overwrites, or if we haven't mapped an active one yet
    if (ad.placement === 'carousel') {
      if (ad.is_active || !mappedAdSystem.feedCarousel.active) {
        mappedAdSystem.feedCarousel.active = ad.is_active || false;
        mappedAdSystem.feedCarousel.autoSlideMs = ad.auto_slide_ms || 5000;
      }
      mappedAdSystem.feedCarousel.slides.push({
        id: ad.id,
        title: ad.title || '',
        pcImageUrl: ad.pc_image_url || '',
        mobileImageUrl: ad.mobile_image_url || '',
        linkUrl: ad.link_url || '',
        buttonText: ad.button_text || ''
      });
    } else if (ad.placement === 'sidebar') {
      if (ad.is_active || !mappedAdSystem.sidebarAd.active) {
        mappedAdSystem.sidebarAd.active = ad.is_active || false;
        mappedAdSystem.sidebarAd.pcImageUrl = ad.pc_image_url || '';
        mappedAdSystem.sidebarAd.mobileImageUrl = ad.mobile_image_url || '';
        mappedAdSystem.sidebarAd.linkUrl = ad.link_url || '';
      }
    } else if (ad.placement === 'popup') {
      if (ad.is_active || !mappedAdSystem.popupAd.active) {
        mappedAdSystem.popupAd.active = ad.is_active || false;
        mappedAdSystem.popupAd.title = ad.title || '';
        mappedAdSystem.popupAd.pcImageUrl = ad.pc_image_url || '';
        mappedAdSystem.popupAd.mobileImageUrl = ad.mobile_image_url || '';
        mappedAdSystem.popupAd.linkUrl = ad.link_url || '';
        mappedAdSystem.popupAd.buttonText = ad.button_text || '';
      }
    }
  });

  return {
    ...fromJson,
    companyName: data.company_name || fromJson.companyName || '',
    tagline: data.tagline || fromJson.tagline || '',
    emergencyHotline: data.emergency_hotline || fromJson.emergencyHotline || '999 / 16263',
    adSystem: mappedAdSystem,
  };
}

export async function saveSiteConfig(config: Partial<SiteConfig>): Promise<void> {
  const { emergencyContacts, adSystem, ...rest } = config as any;

  let existingCompany = '';
  let existingTagline = '';
  let existingHotline = '999 / 16263';
  let existingConfigJson = {};

  try {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'global_config')
      .maybeSingle();
    if (data) {
      existingCompany = data.company_name || '';
      existingTagline = data.tagline || '';
      existingHotline = data.emergency_hotline || '999 / 16263';
      if (data.config_json) {
        existingConfigJson = typeof data.config_json === 'string'
          ? JSON.parse(data.config_json)
          : data.config_json;
      }
    }
  } catch (e) {
    console.warn('Error reading existing config:', e);
  }

  const mergedConfigJson = {
    ...existingConfigJson,
    ...rest
  };

  const finalCompanyName = config.companyName !== undefined ? config.companyName : existingCompany;
  const finalTagline = config.tagline !== undefined ? config.tagline : existingTagline;
  const finalHotline = config.emergencyHotline !== undefined ? config.emergencyHotline : existingHotline;

  const { error } = await supabase.from('site_settings').upsert({
    id: 'global_config',
    company_name: finalCompanyName,
    tagline: finalTagline,
    emergency_hotline: finalHotline,
    config_json: mergedConfigJson,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.warn('saveSiteConfig error:', error.message);
    throw new Error(error.message);
  }
}

// ─── BLOOD REQUESTS ──────────────────────────────────────────────────────────

export async function fetchBloodRequests(): Promise<BloodRequest[]> {
  const { data, error } = await supabase
    .from('blood_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('fetchBloodRequests error:', error.message); return []; }
  return (data || []).map(rowToBloodRequest);
}

export async function upsertBloodRequest(req: BloodRequest): Promise<void> {
  const { error } = await supabase.from('blood_requests').upsert({
    id: req.id,
    receiver_id: req.userId,
    user_email: req.userEmail,
    user_name: req.userName,
    user_phone: req.userPhone,
    blood_type: req.bloodType,
    hospital_name: req.hospitalName,
    hospital_location: req.hospitalLocation,
    latitude: req.latitude ?? null,
    longitude: req.longitude ?? null,
    qty_whole: req.qtyWhole,
    qty_platelets: req.qtyPlatelets,
    qty_plasma: req.qtyPlasma,
    qty_double_red: req.qtyDoubleRed,
    reason_needed: req.reasonNeeded,
    needed_in_hours: req.neededInHours,
    status: req.status,
    cancel_reason: req.cancelReason || null,
    match_stage: req.matchStage || 'broadcast',
    selected_donor_id: req.selectedDonorId || null,
    matched_donors: req.matchedDonors || [],
    created_at: req.createdAt,
    expires_at: new Date(req.expiresAt).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('upsertBloodRequest error:', error.message);
}

export async function clearBloodRequests(): Promise<void> {
  const { error } = await supabase
    .from('blood_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('status', 'active');
  if (error) console.warn('clearBloodRequests error:', error.message);
}

// ─── SUPPORT TICKETS ─────────────────────────────────────────────────────────

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('fetchSupportTickets error:', error.message); return []; }
  return (data || []).map(rowToTicket);
}

export async function upsertSupportTicket(ticket: SupportTicket & { userEmail?: string; userId?: string }): Promise<void> {
  const { error } = await supabase.from('support_tickets').upsert({
    id: ticket.id,
    user_id: ticket.userId || null,
    user_email: ticket.userEmail || '',
    subject: ticket.subject,
    category: ticket.category,
    message: ticket.description,
    status: ticket.status,
    created_at: ticket.createdAt,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('upsertSupportTicket error:', error.message);
}

export async function updateTicketStatus(id: string, status: SupportTicket['status']): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.warn('updateTicketStatus error:', error.message);
}

export async function deleteTicket(id: string): Promise<void> {
  const { error } = await supabase.from('support_tickets').delete().eq('id', id);
  if (error) console.warn('deleteTicket error:', error.message);
}

// ─── USERS / PROFILES ────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<any[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('fetchUsers error:', error.message); return []; }
  return data || [];
}

export async function fetchBannedList(): Promise<string[]> {
  const { data } = await supabase
    .from('site_settings')
    .select('config_json')
    .eq('id', 'global_config')
    .maybeSingle();
  try { return data?.config_json?.banned_users || []; } catch { return []; }
}

export async function fetchDeletedList(): Promise<string[]> {
  const { data } = await supabase
    .from('site_settings')
    .select('config_json')
    .eq('id', 'global_config')
    .maybeSingle();
  try { return data?.config_json?.deleted_users || []; } catch { return []; }
}

export async function saveBannedList(list: string[]): Promise<void> {
  // Merge into config_json
  const { data } = await supabase.from('site_settings').select('config_json').eq('id', 'global_config').maybeSingle();
  const existing = data?.config_json || {};
  await supabase.from('site_settings').upsert({
    id: 'global_config',
    config_json: { ...existing, banned_users: list },
    updated_at: new Date().toISOString(),
  });
}

export async function saveDeletedList(list: string[]): Promise<void> {
  const { data } = await supabase.from('site_settings').select('config_json').eq('id', 'global_config').maybeSingle();
  const existing = data?.config_json || {};
  await supabase.from('site_settings').upsert({
    id: 'global_config',
    config_json: { ...existing, deleted_users: list },
    updated_at: new Date().toISOString(),
  });
}

export async function deleteUserProfile(emailOrId: string): Promise<void> {
  // Try delete by email first, then by user_id
  const { error: e1 } = await supabase.from('profiles').delete().ilike('email', emailOrId);
  if (e1) {
    const { error: e2 } = await supabase.from('profiles').delete().eq('user_id', emailOrId);
    if (e2) console.warn('deleteUserProfile error:', e2.message);
  }
}

export async function adminUpdateUserProfile(user: any): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: user.fullName || user.name,
      phone: user.phone,
      emergency_contact: user.emergencyContact || user.emergency,
      blood_group: user.bloodGroup || user.blood,
      weight: user.weight,
      sex: user.sex,
      division: user.division,
      district: user.district,
      address: user.address,
      role: user.role,
      status: user.status,
      verified: user.verified,
      total_donations: user.totalDonations,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);
  
  if (error) console.warn('adminUpdateUserProfile error:', error.message);
}

export async function adminUpdateUserStatus(id: string, updates: Partial<{ status: string, verified: boolean }>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) console.warn('adminUpdateUserStatus error:', error.message);
}

// ─── ADMIN ACCOUNTS ──────────────────────────────────────────────────────────

export async function fetchAdminAccounts(): Promise<any[]> {
  const { data } = await supabase
    .from('site_settings')
    .select('config_json')
    .eq('id', 'global_config')
    .maybeSingle();
  try { return data?.config_json?.admin_accounts || []; } catch { return []; }
}

export async function saveAdminAccounts(accounts: any[]): Promise<void> {
  const { data } = await supabase.from('site_settings').select('config_json').eq('id', 'global_config').maybeSingle();
  const existing = data?.config_json || {};
  await supabase.from('site_settings').upsert({
    id: 'global_config',
    config_json: { ...existing, admin_accounts: accounts },
    updated_at: new Date().toISOString(),
  });
}

// ─── DONATIONS ───────────────────────────────────────────────────────────────

export async function fetchDonations(): Promise<any[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*, donor:profiles!donor_id(full_name,email), receiver:profiles!receiver_id(full_name,email)')
    .order('completed_at', { ascending: false });
  if (error) { console.warn('fetchDonations error:', error.message); return []; }
  return data || [];
}

export async function fetchUserDonations(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*, donor:profiles!donor_id(full_name,email), receiver:profiles!receiver_id(full_name,email)')
    .eq('donor_id', userId)
    .order('completed_at', { ascending: false });
  if (error) { console.warn('fetchUserDonations error:', error.message); return []; }
  return data || [];
}

export async function insertManualDonation(donation: any): Promise<void> {
  const { error } = await supabase.from('donations').insert({
    donor_id: donation.donorId,
    status: donation.status || 'completed',
    hospital_name: donation.hospitalName,
    hospital_address: donation.hospitalAddress,
    category: donation.category,
    notes: donation.notes,
    is_manual: true,
    donation_date: donation.donationDate,
    completed_at: new Date().toISOString()
  });
  if (error) {
    console.warn('insertManualDonation error:', error.message);
    throw error;
  }
}

export async function updateManualDonation(id: string, updates: any): Promise<void> {
  const { error } = await supabase.from('donations').update({
    hospital_name: updates.hospitalName,
    hospital_address: updates.hospitalAddress,
    category: updates.category,
    notes: updates.notes,
    donation_date: updates.donationDate,
    status: updates.status
  }).eq('id', id);
  if (error) {
    console.warn('updateManualDonation error:', error.message);
    throw error;
  }
}

export async function updateAvatar(userId: string, file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err: any) {
    console.warn('updateAvatar error:', err.message);
    return null;
  }
}

// ─── ADS & SPONSORSHIPS ──────────────────────────────────────────────────────

export async function fetchAds(): Promise<AdRecord[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.warn('fetchAds error:', error.message);
    return [];
  }
  return data || [];
}

export async function upsertAd(ad: Partial<AdRecord>): Promise<AdRecord | null> {
  const { data, error } = await supabase
    .from('ads')
    .upsert({ ...ad, updated_at: new Date().toISOString() })
    .select()
    .maybeSingle();
  if (error) {
    console.warn('upsertAd error:', error.message);
    return null;
  }
  return data;
}

export async function syncAds(adSystem: any): Promise<void> {
  // Delete all then re-insert for clean sync
  await supabase.from('ads').delete().not('id', 'is', null); // delete all rows
  
  const rows: any[] = [];
  
  // Carousel slides
  if (adSystem.feedCarousel?.slides) {
    adSystem.feedCarousel.slides.forEach((slide: any, index: number) => {
      rows.push({
        placement: 'carousel',
        is_active: adSystem.feedCarousel.active,
        title: slide.title || '',
        pc_image_url: slide.pcImageUrl || '',
        mobile_image_url: slide.mobileImageUrl || '',
        link_url: slide.linkUrl || '',
        button_text: slide.buttonText || '',
        auto_slide_ms: adSystem.feedCarousel.autoSlideMs || 5000,
        display_order: index,
        updated_at: new Date().toISOString(),
      });
    });
  }

  // Sidebar Ad
  if (adSystem.sidebarAd) {
    rows.push({
      placement: 'sidebar',
      is_active: adSystem.sidebarAd.active,
      pc_image_url: adSystem.sidebarAd.pcImageUrl || '',
      mobile_image_url: adSystem.sidebarAd.mobileImageUrl || '',
      link_url: adSystem.sidebarAd.linkUrl || '',
      updated_at: new Date().toISOString(),
    });
  }

  // Popup Ad
  if (adSystem.popupAd) {
    rows.push({
      placement: 'popup',
      is_active: adSystem.popupAd.active,
      title: adSystem.popupAd.title || '',
      pc_image_url: adSystem.popupAd.pcImageUrl || '',
      mobile_image_url: adSystem.popupAd.mobileImageUrl || '',
      link_url: adSystem.popupAd.linkUrl || '',
      button_text: adSystem.popupAd.buttonText || '',
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('ads').insert(rows);
    if (error) {
      console.warn('syncAds error:', error.message);
      throw new Error(error.message);
    }
  }
}

export async function deleteAd(id: string): Promise<void> {
  const { error } = await supabase.from('ads').delete().eq('id', id);
  if (error) {
    console.warn('deleteAd error:', error.message);
  }
}

export async function deleteManualDonation(id: string): Promise<void> {
  const { error } = await supabase.from('donations').delete().eq('id', id);
  if (error) {
    console.warn('deleteManualDonation error:', error.message);
    throw error;
  }
}
