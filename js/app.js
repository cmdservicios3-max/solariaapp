// ============================================
// SigueFit - App Initialization
// ============================================
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

  console.log('%c SigueFit v1.0 ', 'background:linear-gradient(135deg,#6C5CE7,#00CEC9);color:white;font-size:14px;font-weight:bold;padding:8px 16px;border-radius:8px;');
  console.log('Base de datos cargada:', DB.getData().clases.length, 'clases,', DB.getData().usuarios.length, 'usuarios');
})();
