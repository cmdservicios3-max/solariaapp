// ============================================
// SigueFit - Toast Notifications + Router
// ============================================
var Toast = (function(){
  var container = null;
  function init() {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  function show(type, title, message, duration) {
    if (!container) init();
    duration = duration || 4000;
    var icons = {success:'&#10003;',error:'&#10007;',info:'&#8505;',warning:'&#9888;',whatsapp:'&#128172;'};
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<div class="toast-icon">' + (icons[type]||'&#8505;') + '</div><div class="toast-content"><div class="toast-title">' + title + '</div><div class="toast-message">' + message + '</div></div>';
    container.appendChild(el);
    setTimeout(function(){ el.classList.add('fade-out'); setTimeout(function(){ el.remove(); }, 300); }, duration);
  }
  return {show:show, init:init};
})();

var Router = (function(){
  var routes = {};
  var currentRoute = '';
  var currentUser = null;

  function register(path, handler, opts) { routes[path] = {handler:handler, opts:opts||{}}; }

  function navigate(path) {
    window.location.hash = path;
  }

  function handleRoute() {
    var hash = window.location.hash.replace('#','') || '/login';
    var parts = hash.split('/').filter(Boolean);
    var path = '/' + parts[0];
    var param = parts[1] || null;

    currentUser = Auth.getCurrentUser();

    var route = routes[path];
    if (!route) { path = '/login'; route = routes[path]; }

    if (route.opts.auth && !currentUser) { navigate('/login'); return; }
    if (route.opts.admin && (!currentUser || currentUser.rol !== 'admin')) { navigate('/dashboard'); return; }
    if (path === '/login' && currentUser) {
      navigate(currentUser.rol === 'admin' ? '/admin' : '/dashboard');
      return;
    }

    currentRoute = path;
    var app = document.getElementById('app');
    app.innerHTML = '';

    if (path !== '/login' && currentUser) { app.innerHTML = renderNavbar(); }
    var content = document.createElement('div');
    content.id = 'page-content';
    app.appendChild(content);

    route.handler(content, param);
    bindNavbar();
  }

  function renderNavbar() {
    var u = currentUser;
    var isAdmin = u && u.rol === 'admin';
    var links = '';
    if (isAdmin) {
      links = '<button class="nav-link'+(currentRoute==='/admin'?' active':'')+'" onclick="Router.navigate(\'/admin\')">&#128202; Panel</button>'
        + '<button class="nav-link'+(currentRoute==='/admin-clases'?' active':'')+'" onclick="Router.navigate(\'/admin-clases\')">&#128197; Clases</button>'
        + '<button class="nav-link'+(currentRoute==='/admin-clientes'?' active':'')+'" onclick="Router.navigate(\'/admin-clientes\')">&#128101; Clientes</button>'
        + '<button class="nav-link'+(currentRoute==='/admin-pagos'?' active':'')+'" onclick="Router.navigate(\'/admin-pagos\')">&#128176; Pagos</button>';
    } else {
      links = '<button class="nav-link'+(currentRoute==='/dashboard'?' active':'')+'" onclick="Router.navigate(\'/dashboard\')">&#128197; Clases</button>'
        + '<button class="nav-link'+(currentRoute==='/reservas'?' active':'')+'" onclick="Router.navigate(\'/reservas\')">&#128196; Mis Reservas</button>';
    }
    var initials = u ? getInitials(u.nombre) : '?';
    var creditsHtml = !isAdmin ? '<div class="user-credits">&#11088; ' + u.creditos + ' creditos</div>' : '';
    return '<nav class="navbar" id="main-navbar">'
      + '<div class="navbar-brand" onclick="Router.navigate(\'/'+( isAdmin?'admin':'dashboard')+'\')"><span class="brand-icon">&#127947;</span> SigueFit</div>'
      + '<button class="hamburger" id="hamburger-btn">&#9776;</button>'
      + '<div class="navbar-nav" id="nav-menu">' + links + '</div>'
      + '<div class="navbar-user">' + creditsHtml
      + '<div class="user-avatar">' + initials + '</div>'
      + '<button class="nav-link" onclick="Auth.logout()">Salir</button></div></nav>';
  }

  function bindNavbar() {
    var btn = document.getElementById('hamburger-btn');
    var menu = document.getElementById('nav-menu');
    if (btn && menu) {
      btn.onclick = function() { menu.classList.toggle('open'); };
      menu.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function() { menu.classList.remove('open'); });
      });
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  return {register:register, navigate:navigate, init:init, handleRoute:handleRoute};
})();
