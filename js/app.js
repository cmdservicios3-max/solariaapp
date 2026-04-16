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

// ============================================
// SOLARIA - Reusable UI Utilities
// ============================================
var UI = {};

UI.modal = function(content, opts) {
  opts = opts || {};
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal" style="max-width:' + (opts.maxWidth || '500px') + '">'
    + '<div class="modal-header"><h3 class="modal-title">' + (opts.title || '') + '</h3>'
    + '<button class="modal-close" id="ui-modal-close">&times;</button></div>'
    + '<div class="modal-body">' + content + '</div>'
    + '</div>';
  document.body.appendChild(overlay);

  // Close on X button
  overlay.querySelector('#ui-modal-close').onclick = function() { overlay.remove(); };
  // Close on click outside
  overlay.addEventListener('click', function(e) { 
    if (e.target === overlay) overlay.remove(); 
  });

  return overlay;
};

(function() {
  // Register routes
  Router.register('/login', Pages.login, {});
  Router.register('/dashboard', Pages.dashboard, {auth:true});
  Router.register('/clase', Pages.classDetail, {auth:true});
  Router.register('/reservas', Pages.myBookings, {auth:true});
<<<<<<< HEAD
=======
  Router.register('/planes', Pages.planes, {auth:true});
>>>>>>> 872efee9d1642456ead9b3bf4038cbc2eae644bc
  Router.register('/admin', Pages.admin, {auth:true, admin:true});
  Router.register('/admin-clases', Pages.adminClases, {auth:true, admin:true});
  Router.register('/admin-clientes', Pages.adminClientes, {auth:true, admin:true});
  Router.register('/admin-pagos', Pages.adminPagos, {auth:true, admin:true});
<<<<<<< HEAD
=======
  Router.register('/admin-creditos', Pages.adminCreditos, {auth:true, admin:true});
>>>>>>> 872efee9d1642456ead9b3bf4038cbc2eae644bc

  // Initialize
  Toast.init();
  Router.init();

  console.log('%c SOLARIA v1.0 ', 'background:linear-gradient(135deg,#f39c12,#d35400);color:white;font-size:14px;font-weight:bold;padding:8px 16px;border-radius:8px;');
  console.log('Base de datos cargada:', DB.getData().clases.length, 'clases,', DB.getData().usuarios.length, 'usuarios');
})();
