// ============================================
// SOLARIA - App Initialization
// ============================================

// PWA Install Setup
window.pwaDeferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.pwaDeferredPrompt = e;
  
  // Si el boton existe (ej. ya en la pantalla de login), mostrarlo si estaba oculto
  const btn = document.getElementById('btn-install-app');
  if (btn) btn.style.display = 'inline-flex';
});

(function() {
  // Register routes
  Router.register('/login', Pages.login, {});
  Router.register('/dashboard', Pages.dashboard, {auth:true});
  Router.register('/clase', Pages.classDetail, {auth:true});
  Router.register('/reservas', Pages.myBookings, {auth:true});
  Router.register('/admin', Pages.admin, {auth:true, admin:true});
  Router.register('/admin-clases', Pages.adminClases, {auth:true, admin:true});
  Router.register('/admin-clientes', Pages.adminClientes, {auth:true, admin:true});
  Router.register('/admin-pagos', Pages.adminPagos, {auth:true, admin:true});

  // Initialize
  Toast.init();
  Router.init();

  console.log('%c SOLARIA v1.0 ', 'background:linear-gradient(135deg,#f39c12,#d35400);color:white;font-size:14px;font-weight:bold;padding:8px 16px;border-radius:8px;');
  console.log('Base de datos cargada:', DB.getData().clases.length, 'clases,', DB.getData().usuarios.length, 'usuarios');
})();
