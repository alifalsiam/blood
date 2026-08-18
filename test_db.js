import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zeyrtbbrlumvlmxomens.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
// I need the service role key to do raw queries, or I can just use psql via node-postgres (pg).
