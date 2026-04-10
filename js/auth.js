var Auth = (function(){
  var SK = 'siguefit_session';
  var cur = null;
  var loadingUser = null;

  async function _fetchUser() {
    try { 
      var idStr = localStorage.getItem(SK);
      if (!idStr) { cur = null; loadingUser = null; return null; }
      
      var userId = parseInt(idStr);
      if (isNaN(userId)) { cur = null; loadingUser = null; return null; }

      if (typeof supabaseClient !== 'undefined') {
        var response = await supabaseClient.from('usuarios').select('*').eq('id', userId);
        if (response.data && response.data.length > 0) {
           cur = response.data[0];
        } else {
           cur = null;
        }
      } 
    } catch(e) { 
      console.error("Error fetching user from Supabase:", e); 
    }
    loadingUser = null;
    return cur;
  }

  function getCurrent() {
    if (cur) return Promise.resolve(cur);
    if (loadingUser) return loadingUser;
    
    loadingUser = _fetchUser();
    return loadingUser;
  }

  async function refresh() {
    // No reseteamos cur a null para evitar que el Router nos eche mientras cargamos
    loadingUser = _fetchUser();
    return await loadingUser;
  }
  async function login(email, pw) {
    if (typeof supabaseClient === 'undefined') {
      Toast.show('error', 'Error', 'Supabase no conectado');
      return null;
    }
    
    // Login con Supabase (case-insensitive para email)
    var response = await supabaseClient
      .from('usuarios')
      .select('*')
      .ilike('email', email)
      .eq('password', pw);
      
    if (response.error) {
      console.error(response.error);
      Toast.show('error', 'Error', 'Error conectando a Supabase'); 
      return null;
    }
    
    if (response.data && response.data.length > 0) {
      var u = response.data[0];
      
      // Permitimos activos y también 'true' o 1 por retrocompatibilidad
      if (u.activo === false || u.activo === 0) {
        Toast.show('error', 'Error', 'Usuario inactivo'); 
        return null;
      }
      
      // Sincronizar localmente para no romper la dependencia de las demás funciones (ej. getCurrent)
      var localUser = DB.getUser(u.id);
      if (localUser) {
        DB.updateUser(u.id, u);
      } else {
        var d = DB.getData();
        d.usuarios.push(u);
        DB.save();
      }
      
      cur = u; 
      localStorage.setItem(SK, u.id); 
      Toast.show('success', 'Bienvenido/a', u.nombre); 
      return u;
    }
    
    Toast.show('error', 'Error', 'Email o contraseña incorrectos'); 
    return null;
  }
  async function register(nombre, email, pw, tel) {
    var u = DB.register(nombre, email, pw, tel);
    if (!u) {
      Toast.show('error','Error','El email ya está registrado'); 
      return null;
    }
    
    // Sincronizar con Supabase
    var result = await DB.addUserToSupabase(u);
    if (result && result.success && result.data) {
      // IMPORTANTE: Sobrescribir ID local con el ID real de Supabase
      var supabaseId = result.data.id;
      
      // Actualizar registro local con el ID definitivo
      var d = DB.getData();
      var idx = d.usuarios.findIndex(function(x){ return x.id === u.id; });
      if (idx !== -1) {
        d.usuarios[idx].id = supabaseId;
        u.id = supabaseId;
        DB.save();
      }
      
      cur = u; 
      localStorage.setItem(SK, supabaseId); 
      Toast.show('success','Cuenta creada','Bienvenido/a '+nombre); 
      return u;
    } else {
      Toast.show('error', 'Error', 'No se pudo sincronizar con la nube');
      return null;
    }
  }
  async function resetPassword(email, tel, newPw) {
    var u = DB.validateUserForReset(email, tel);
    if (!u) {
      Toast.show('error', 'Error', 'Los datos de verificación son incorrectos');
      return false;
    }
    var result = await DB.updateUserInSupabase(u.id, { password: newPw });
    if (result) {
      Toast.show('success', 'Éxito', 'Tu contraseña ha sido actualizada');
      return true;
    }
    Toast.show('error', 'Error', 'No se pudo procesar la solicitud');
    return false;
  }
  function logout() { cur = null; localStorage.removeItem(SK); Router.navigate('/login'); }
  // refresh ya fue definido arriba

  return {getCurrentUser:getCurrent, login:login, register:register, logout:logout, refreshUser:refresh, resetPassword:resetPassword};
})();
