var Auth = (function(){
  var SK = 'siguefit_session';
  var cur = null;
  function getCurrent() {
    if (cur) return cur;
    try { var id = localStorage.getItem(SK); if (id) cur = DB.getUser(parseInt(id)); } catch(e) {}
    return cur;
  }
  function login(email, pw) {
    var u = DB.login(email, pw);
    if (u) { cur = u; localStorage.setItem(SK, u.id); Toast.show('success','Bienvenido/a', u.nombre); return u; }
    Toast.show('error','Error','Email o contrasena incorrectos'); return null;
  }
  async function register(nombre, email, pw, tel) {
    var u = DB.register(nombre, email, pw, tel);
    if (!u) {
      Toast.show('error','Error','El email ya está registrado'); 
      return null;
    }
    
    // Sincronizar con Supabase silenciosamente
    var result = await DB.addUserToSupabase(u);
    if (result && result.error) {
      console.warn('Usuario creado localmente, pero falló en Supabase:', result.error);
    }
    
    cur = u; 
    localStorage.setItem(SK, u.id); 
    Toast.show('success','Cuenta creada','Bienvenido/a '+nombre); 
    return u;
  }
  function logout() { cur = null; localStorage.removeItem(SK); Router.navigate('/login'); }
  function refresh() { if (cur) cur = DB.getUser(cur.id); return cur; }
  return {getCurrentUser:getCurrent, login:login, register:register, logout:logout, refreshUser:refresh};
})();
