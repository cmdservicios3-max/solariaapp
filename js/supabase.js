const supabaseUrl = 'https://cddqnpmyaxnkxwqihbbi.supabase.co';
const supabaseKey = 'sb_publishable_s34IEMKYZ8FrSVykAXqYkQ_Aix5XwXA';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Para debug en consola
window.supabaseClient = supabaseClient;

