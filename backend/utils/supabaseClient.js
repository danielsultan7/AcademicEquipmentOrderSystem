const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in environment variables');
    process.exit(1); // Fail fast — don't run with broken config
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };