/**
 * realtime.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase Realtime-based hub — replaces the SSE /api/realtime/stream approach.
 * Works on Vercel (static SPA) with zero backend required.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { supabase } from './supabase';

type RealtimeListener = (data: any) => void;

class RealtimeHub {
  private listeners: Map<string, Set<RealtimeListener>> = new Map();
  private channel: ReturnType<typeof supabase.channel> | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (typeof window === 'undefined') return;

    // Subscribe to Postgres change events on every relevant table
    this.channel = supabase
      .channel('lifedrop-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_banks' }, () => {
        this.emitLocal('blood_banks_changed', {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_requests' }, (payload) => {
        this.emitLocal('blood_requests_changed', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        this.emitLocal('profiles_changed', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_contacts' }, () => {
        this.emitLocal('emergency_contacts_changed', {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        this.emitLocal('site_settings_changed', {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        this.emitLocal('support_tickets_changed', {});
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.emitLocal('connection_status', { status: 'connected' });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.emitLocal('connection_status', { status: 'disconnected' });
        }
      });
  }

  public on(event: string, callback: RealtimeListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emitLocal(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try { cb(data); } catch (e) {
          console.error(`Error in realtime event handler for ${event}:`, e);
        }
      });
    }
  }

  public disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  public getStatus(): boolean {
    return this.channel !== null;
  }
}

export const realtimeHub = new RealtimeHub();
