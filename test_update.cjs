const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zeyrtbbrlumvlmxomens.supabase.co', process.env.VITE_SUPABASE_ANON_KEY); // I don't have the anon key handy, I'll just use postgres directly instead
