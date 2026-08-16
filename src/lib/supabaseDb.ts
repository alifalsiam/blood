/**
 * supabaseDb.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source-of-truth data-access layer for production.
 * ALL reads and writes go through Supabase — no Express /api/* calls.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { supabase } from './supabase';
import type { BloodBank, BloodRequest, SiteConfig, SupportTicket, EmergencyContact } from '../types';

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
  userId: r.user_id,
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
  matchedDonors: (() => { try { return r.matched_donors ? JSON.parse(r.matched_donors) : []; } catch { return []; } })(),
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
  const fromJson: Partial<SiteConfig> = data.config_json ? data.config_json : {};
  return {
    companyName: data.company_name || fromJson.companyName || '',
    tagline: data.tagline || fromJson.tagline || '',
    emergencyHotline: data.emergency_hotline || fromJson.emergencyHotline || '999 / 16263',
    ...fromJson,
  };
}

export async function saveSiteConfig(config: Partial<SiteConfig>): Promise<void> {
  const { emergencyContacts, ...rest } = config as any;
  const { error } = await supabase.from('site_settings').upsert({
    id: 'global_config',
    company_name: config.companyName || '',
    tagline: config.tagline || '',
    emergency_hotline: config.emergencyHotline || '999 / 16263',
    config_json: rest,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('saveSiteConfig error:', error.message);
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
    user_id: req.userId,
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
    matched_donors: JSON.stringify(req.matchedDonors || []),
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
