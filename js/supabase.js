// Inicialización de Supabase usando el script CDN global (window.supabase)
const supabaseUrl = 'https://cddqnpmyaxnkxwqihbbi.supabase.co';
const supabaseKey = 'sb_publishable_s34IEMKYZ8FrSVykAXqYkQ_Aix5XwXA';

// Verificamos que supabase esté disponible antes de crear el cliente
if (!window.supabase) {
  console.error("Error: Supabase no se cargó correctamente desde el CDN.");
}

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Prueba de conexión (Select a clases)
async function testSupabaseConnection() {
  console.log("Iniciando prueba de conexión a Supabase...");
  try {
    const { data, error } = await supabaseClient.from('clases').select('*').limit(5);
    
    if (error) {
      console.error("❌ Error conectando a Supabase:", error.message);
    } else {
      console.log("✅ Supabase conectado correctamente. Resultados de clases:", data);
    }
  } catch (err) {
    console.error("❌ Excepción inesperada conectando a Supabase:", err);
  }
}

// Ejecutar la prueba
testSupabaseConnection();