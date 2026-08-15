import { createClient } from '@supabase/supabase-js';

const PROD_SUPABASE_URL = 'https://zeyrtbbrlumvlmxomens.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleXJ0YmJybHVtdmxteG9tZW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODA2NzUsImV4cCI6MjEwMTk1NjY3NX0.7RPdtL5Gvv-rAalR7QizhKl_WAEEVfz1H8fnsktw5ik';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PROD_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
