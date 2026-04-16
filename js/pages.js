// ============================================
// SigueFit - Pages (Client)
// ============================================
var Pages = {};

Pages.confirm = function(msg, onConfirm) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '9999';
  overlay.innerHTML = '<div class="modal" style="max-width:400px;text-align:center"><div class="modal-body">'
    + '<h3 style="margin-bottom:16px;">Verificar Cancelacion</h3>'
    + '<p style="margin-bottom:24px;white-space:pre-wrap;color:var(--text-secondary)">' + msg + '</p>'
    + '<div style="display:flex;gap:12px;justify-content:center">'
    + '<button class="btn btn-ghost" id="sc-cancel">Volver</button>'
    + '<button class="btn btn-danger" id="sc-ok">Si, cancelar</button>'
    + '</div></div></div>';
  document.body.appendChild(overlay);
  
  document.getElementById('sc-cancel').onclick = function(){ overlay.remove(); };
  document.getElementById('sc-ok').onclick = function(){ overlay.remove(); onConfirm(); };
};

// --- LOGIN ---
Pages.login = function(container) {
  var authMode = 'login'; // 'login', 'register', 'forgot'
  function render() {
    var title = authMode === 'register' ? 'Registrarse' : authMode === 'forgot' ? 'Recuperar Cuenta' : 'Iniciar Sesión';
    
    container.innerHTML = '<div class="login-container"><div class="login-card">'
      + '<div class="login-logo" style="display:flex; flex-direction:column; align-items:center; margin-bottom:var(--space-xl);">'
      + '<img src="img/logo-solaria-bkg.svg" alt="SOLARIA" style="height:80px; width:auto; margin-bottom:var(--space-md); filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));">'
      + '<h1 style="margin-bottom:4px;">SOLARIA</h1>'
      + '<p style="color:var(--text-secondary); font-size:.875rem;">Gestion inteligente para tu estudio</p></div>'
      + '<div class="login-tabs">'
      + '<button class="login-tab'+(authMode==='login'?' active':'')+'" id="tab-login">Iniciar Sesión</button>'
      + '<button class="login-tab'+(authMode==='register'?' active':'')+'" id="tab-register">Registrarse</button>'
      + '</div>'
      + '<form id="auth-form">' + (authMode === 'register' ? renderRegisterForm() : authMode === 'forgot' ? renderForgotForm() : renderLoginForm()) + '</form>'
      + '<div style="margin-top:20px; text-align:center; display:flex; flex-direction:column; gap:12px; align-items:center;">'
      + '<button type="button" class="btn btn-primary" id="btn-install-app" style="display:' + (window.pwaDeferredPrompt ? 'inline-flex' : 'none') + ';">Descargar App</button>'
      + (authMode === 'login' ? '<a href="javascript:void(0)" id="link-forgot" style="font-size:0.875rem; color:var(--text-secondary); text-decoration:none;">¿Olvidaste tu contraseña?</a>' : '')
      + (authMode === 'forgot' ? '<a href="javascript:void(0)" id="link-back-login" style="font-size:0.875rem; color:var(--text-secondary); text-decoration:none;">&#10229; Volver al inicio</a>' : '')
      + '</div>'
      + '</div></div>';

    document.getElementById('tab-login').onclick = function(){ authMode='login'; render(); };
    document.getElementById('tab-register').onclick = function(){ authMode='register'; render(); };
    var fLink = document.getElementById('link-forgot');
    if (fLink) fLink.onclick = function(){ authMode='forgot'; render(); };
    var bLink = document.getElementById('link-back-login');
    if (bLink) bLink.onclick = function(){ authMode='login'; render(); };
    
    var installBtn = document.getElementById('btn-install-app');
    if (installBtn) {
      installBtn.onclick = async function() {
        if (window.pwaDeferredPrompt) {
          window.pwaDeferredPrompt.prompt();
          const { outcome } = await window.pwaDeferredPrompt.userChoice;
          console.log('Install prompt result:', outcome);
          window.pwaDeferredPrompt = null;
          installBtn.style.display = 'none';
        }
      };
    }

    document.getElementById('auth-form').onsubmit = async function(e){
      e.preventDefault();
      if (authMode === 'login') {
        var u = await Auth.login(document.getElementById('email').value, document.getElementById('password').value);
        if (u) Router.navigate(u.rol==='admin'?'/admin':'/dashboard');
      } else if (authMode === 'register') {
        var u = await Auth.register(document.getElementById('nombre').value, document.getElementById('email').value, document.getElementById('password').value, document.getElementById('telefono').value);
        if (u) Router.navigate('/dashboard');
      } else if (authMode === 'forgot') {
        var success = await Auth.resetPassword(
          document.getElementById('email').value, 
          document.getElementById('telefono-verify').value,
          document.getElementById('new-password').value
        );
        if (success) {
          authMode = 'login';
          render();
        }
      }
    };
  }
  function renderLoginForm() {
    return '<div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="email" placeholder="tu@email.com" required></div>'
      + '<div class="form-group"><label class="form-label">Contraseña</label><input class="form-input" type="password" id="password" placeholder="Tu contraseña" required></div>'
      + '<button class="btn btn-primary btn-block btn-lg" type="submit" style="margin-top:8px">Iniciar Sesión</button>';
  }
  function renderRegisterForm() {
    return '<div class="form-group"><label class="form-label">Nombre completo</label><input class="form-input" type="text" id="nombre" placeholder="Tu nombre" required></div>'
      + '<div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="email" placeholder="tu@email.com" required></div>'
      + '<div class="form-group"><label class="form-label">Teléfono</label><input class="form-input" type="tel" id="telefono" placeholder="+54 11 5555-1234"></div>'
      + '<div class="form-group"><label class="form-label">Contraseña</label><input class="form-input" type="password" id="password" placeholder="Min. 6 caracteres" required></div>'
      + '<button class="btn btn-primary btn-block btn-lg" type="submit" style="margin-top:8px">Crear Cuenta</button>';
  }
  function renderForgotForm() {
    return '<div class="form-group" style="padding:16px; background:rgba(210,89,63,0.05); border:1px solid rgba(210,89,63,0.2); border-radius:var(--radius-md); margin-bottom:20px;">'
      + '<p style="font-size:0.875rem; color:var(--primary); text-align:center; font-weight:600; margin:0;">&#9888; Aviso de Seguridad</p>'
      + '<p style="font-size:0.75rem; color:var(--text-secondary); text-align:center; margin-top:4px;">Por seguridad, el cambio de contraseña requiere verificación del email y teléfono registrados.</p></div>'
      + '<div class="form-group"><label class="form-label">Email de tu cuenta</label><input class="form-input" type="email" id="email" placeholder="tu@email.com" required></div>'
      + '<div class="form-group"><label class="form-label">Teléfono registrado</label><input class="form-input" type="tel" id="telefono-verify" placeholder="Ej: +54 9 11 5555-1234" required></div>'
      + '<div class="form-group"><label class="form-label">Nueva Contraseña</label><input class="form-input" type="password" id="new-password" placeholder="Establecer nueva clave" required></div>'
      + '<button class="btn btn-primary btn-block btn-lg" type="submit" style="margin-top:8px">Validar y Restablecer</button>';
  }
  render();
};

// --- CLIENT DASHBOARD ---
Pages.dashboard = async function(container) {
  var user = await Auth.refreshUser();
  if (!user) { Router.navigate('/login'); return; }

  // Variables de estado
  var now = new Date();
  var filterType = 'todas';
  var weekOffset = 0;
  var renderCounter = 0;

  // Calculamos el lunes de la semana actual como base inmutable
  var day = now.getDay();
  var diff = (day === 0 ? -6 : 1) - day;
  var currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + diff);
  currentMonday.setHours(0,0,0,0);

  // Fecha seleccionada por defecto: Hoy si es esta semana, o el Lunes si es otra
  var selectedDate = now.toISOString().split('T')[0];

  // Render inicial de la estructura fija
  container.innerHTML = '<div class="page-container">'
    + '<div class="page-header"><div><h1>&#127947; Clases Disponibles</h1><p>Reserva tu lugar en la proxima clase</p></div>'
    + '<div class="user-credits" style="font-size:.875rem;padding:8px 16px">&#11088; ' + user.creditos + ' creditos disponibles</div></div>'
    + '<div id="calendar-area"></div>'
    + '<div id="classes-area" style="margin-top:24px"></div>'
    + '</div>';

  async function update() {
    var curRequest = ++renderCounter;
    
    // UI Feedback: Opacidad mientras carga
    var calArea = document.getElementById('calendar-area');
    var clsArea = document.getElementById('classes-area');
    if (calArea) calArea.style.opacity = '0.5';
    if (clsArea) clsArea.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.6;"><div style="font-size:2rem;margin-bottom:12px;">&#8987;</div>Cargando clases...</div>';

    // Fetch de datos
    var [cls, datesMap] = await Promise.all([
      DB.getClassesFromSupabase(selectedDate),
      DB.getClassDatesFromSupabase()
    ]);

    if (curRequest !== renderCounter) return;

    // Renderizado de sub-componentes
    if (calArea) {
      calArea.style.opacity = '1';
      calArea.innerHTML = buildCalendarHTML(datesMap);
      bindCalendarEvents();
    }
    
    if (clsArea) {
      cls.sort(function(a,b){ return a.horario.localeCompare(b.horario); });
      clsArea.innerHTML = buildClassesHTML(cls);
      bindClassEvents();
    }
  }

  function buildCalendarHTML(datesMap) {
    var dias = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    
    var startOfWeek = new Date(currentMonday);
    startOfWeek.setDate(currentMonday.getDate() + (weekOffset * 7));
    
    var monthYear = meses[startOfWeek.getMonth()] + ' ' + startOfWeek.getFullYear();
    
    var html = '<div class="calendar-header"><div class="calendar-title">' + monthYear + '</div>'
      + '<div class="calendar-nav"><button id="cal-prev">&#9664;</button><button id="cal-today" style="width:auto;padding:0 12px;font-size:.75rem">Hoy</button><button id="cal-next">&#9654;</button></div></div>'
      + '<div class="calendar-days" id="swipe-zone">';
    
    for (var i = 0; i < 7; i++) {
      var d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      var ds = d.toISOString().split('T')[0];
      var isToday = ds === now.toISOString().split('T')[0];
      var isActive = ds === selectedDate;
      var numCls = datesMap[ds] || 0;
      
      var dayLetter = dias[d.getDay()].charAt(0);
      
      html += '<div class="calendar-day' + (isActive?' active':'') + (isToday?' is-today':'') + '" data-date="' + ds + '">'
        + '<div class="day-name">' + dayLetter + '</div>'
        + '<div class="day-number">' + d.getDate() + '</div>'
        + '<div class="day-classes">' + (numCls > 0 ? '<span>' + numCls + '</span>' : '-') + '</div></div>';
    }
    html += '</div>';
    return html;
  }



  function buildClassesHTML(cls) {
    if (cls.length === 0) return '<div class="empty-state"><div class="empty-icon">&#128197;</div><h3>No hay clases este dia</h3><p>Prueba seleccionando otra fecha</p></div>';
    var html = '';
    cls.forEach(function(c, i) {
      var ocupados = c.cupo_total - c.cupo_disponible;
      var pct = (ocupados / c.cupo_total) * 100;
      var full = c.cupo_disponible <= 0;
      
      // Semáforo de cupo
      var cupoColor, cupoLabel;
      if (full) {
        cupoColor = 'var(--danger)'; cupoLabel = 'Llena';
      } else if (c.cupo_disponible <= 3) {
        cupoColor = 'var(--warning)'; cupoLabel = 'Últimos lugares';
      } else {
        cupoColor = 'var(--success)'; cupoLabel = 'Disponible';
      }
      
      html += '<div class="class-card" data-id="' + c.id + '" data-class=\'' + JSON.stringify(c).replace(/'/g, "&#39;") + '\' style="animation-delay:' + (i*0.05) + 's">'
        + '<div class="class-card-header"><span class="class-card-type">' + c.tipo + '</span><span class="class-card-time">&#128336; ' + c.horario + '</span></div>'
        + '<div class="class-card-body"><div class="class-card-name">' + c.nombre + '</div>'
        + '<div class="class-card-instructor">&#128100; ' + (c.instructor||'Sin asignar') + ' &middot; ' + c.duracion + ' min</div>'
        + '<div class="class-card-footer"><div class="class-card-spots">'
        + '<span style="display:inline-flex;align-items:center;gap:4px;font-size:.8rem;font-weight:600;color:' + cupoColor + '">&#128101; ' + ocupados + '/' + c.cupo_total + '</span>'
        + '</div>'
        + (full ? '<span class="badge badge-danger">Llena</span>' : '<button class="btn btn-primary btn-sm" data-book="' + c.id + '">Reservar</button>')
        + '</div></div></div>';
    });
    return html;
  }

  function bindCalendarEvents() {
    document.querySelectorAll('.calendar-day').forEach(function(el) {
      el.onclick = function() { selectedDate = el.dataset.date; update(); };
    });
    var prev = document.getElementById('cal-prev');
    var next = document.getElementById('cal-next');
    var todayBtn = document.getElementById('cal-today');
    
    if (prev) prev.onclick = function(){ 
      weekOffset--; 
      var sd = new Date(selectedDate + 'T12:00:00');
      sd.setDate(sd.getDate() - 7);
      selectedDate = sd.toISOString().split('T')[0];
      update(); 
    };
    if (next) next.onclick = function(){ 
      weekOffset++; 
      var sd = new Date(selectedDate + 'T12:00:00');
      sd.setDate(sd.getDate() + 7);
      selectedDate = sd.toISOString().split('T')[0];
      update(); 
    };
    if (todayBtn) todayBtn.onclick = function(){ 
      weekOffset=0; 
      selectedDate=now.toISOString().split('T')[0]; 
      update(); 
    };

    // Swipe Support
    var zone = document.getElementById('swipe-zone');
    if (zone) {
      var touchStartX = 0;
      var swiped = false;
      zone.addEventListener('touchstart', function(e) { 
        touchStartX = e.changedTouches[0].screenX; 
        swiped = false; 
      }, {passive: true});
      zone.addEventListener('touchend', function(e) {
        if (swiped) return;
        var diff = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(diff) > 50) {
          swiped = true;
          var sd = new Date(selectedDate + 'T12:00:00');
          if (diff < 0) { weekOffset++; sd.setDate(sd.getDate() + 7); }
          else { weekOffset--; sd.setDate(sd.getDate() - 7); }
          selectedDate = sd.toISOString().split('T')[0];
          update();
        }
      }, {passive: true});
    }


  }

  function bindClassEvents() {
    document.querySelectorAll('.class-card').forEach(function(el) {
      el.onclick = async function(e) {
        if (e.target.dataset.book) {
          e.stopPropagation();
          doBooking(parseInt(e.target.dataset.book), e.target);
          return;
        }
        // Open class detail modal
        var c = JSON.parse(el.dataset.class);
        var ocupados = c.cupo_total - c.cupo_disponible;
        var full = c.cupo_disponible <= 0;
        
        var cupoColor;
        if (full) cupoColor = 'var(--danger)';
        else if (c.cupo_disponible <= 3) cupoColor = 'var(--warning)';
        else cupoColor = 'var(--success)';
        
        var fechaObj = new Date(c.fecha + 'T12:00:00');
        var diasSem = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        var fechaFormateada = diasSem[fechaObj.getDay()] + ' ' + fechaObj.getDate() + ' de ' + meses[fechaObj.getMonth()];
        
        var modalContent = ''
          + '<div style="display:flex;flex-direction:column;gap:16px">'
          + '<div style="display:flex;align-items:center;justify-content:space-between">'
          + '<span class="badge badge-primary" style="text-transform:uppercase">' + c.tipo + '</span>'
          + '<span style="font-size:.875rem;color:var(--text-secondary)">&#128336; ' + c.duracion + ' min</span></div>'
          + '<div>'
          + '<div style="font-size:.875rem;color:var(--text-secondary);margin-bottom:4px">&#128197; ' + fechaFormateada + '</div>'
          + '<div style="font-size:.875rem;color:var(--text-secondary)">&#128336; ' + c.horario + ' hs</div>'
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:8px">'
          + '<span style="font-size:.875rem;color:var(--text-secondary)">&#128100; Instructor:</span>'
          + '<span style="font-weight:600">' + (c.instructor || 'Sin asignar') + '</span></div>'
          + '<div style="padding:12px 16px;background:var(--bg-primary);border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between">'
          + '<span style="font-size:.875rem;color:var(--text-secondary)">&#128101; Cupo</span>'
          + '<span style="font-weight:700;font-size:1.1rem;color:' + cupoColor + '">' + ocupados + ' / ' + c.cupo_total + '</span></div>'
          + (full 
            ? '<div style="text-align:center;padding:8px;color:var(--danger);font-weight:600">Esta clase está llena</div>'
            : '<button class="btn btn-primary btn-block btn-lg" id="modal-book-btn" data-book="' + c.id + '">&#10003; Reservar mi lugar</button>')
          + '<div style="border-top:1px solid var(--border-color);padding-top:16px">'
          + '<h4 style="font-family:var(--font-serif);font-weight:500;margin-bottom:12px">&#128203; Inscriptos</h4>'
          + '<div id="modal-inscriptos" style="max-height:200px;overflow-y:auto">'
          + '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.875rem">&#8987; Cargando inscriptos...</div>'
          + '</div></div>'
          + '</div>';
        
        var overlay = UI.modal(modalContent, { title: c.nombre, maxWidth: '440px' });
        
        // Bind reservar button
        var modalBook = overlay.querySelector('#modal-book-btn');
        if (modalBook) {
          modalBook.onclick = async function() {
            modalBook.disabled = true; modalBook.innerHTML = 'Procesando...';
            await doBooking(c.id);
            overlay.remove();
          };
        }
        
        // Fetch inscriptos from Supabase
        try {
          var { data: reservas, error } = await supabaseClient
            .from('reservas')
            .select('*, usuarios(nombre)')
            .eq('clase_id', c.id);
          
          var container = overlay.querySelector('#modal-inscriptos');
          if (!container) return;
          
          if (error || !reservas || reservas.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.875rem">No hay inscriptos aún</div>';
            return;
          }
          
          // Sort: reservado first, then cancelado
          reservas.sort(function(a, b) {
            if (a.estado === 'reservado' && b.estado !== 'reservado') return -1;
            if (a.estado !== 'reservado' && b.estado === 'reservado') return 1;
            return 0;
          });
          
          var html = '<div style="display:flex;flex-direction:column;gap:8px">';
          reservas.forEach(function(r) {
            var nombre = (r.usuarios && r.usuarios.nombre) ? r.usuarios.nombre : 'Usuario #' + r.usuario_id;
            var initials = nombre.split(' ').map(function(w){ return w.charAt(0).toUpperCase(); }).join('').substring(0,2);
            var isActive = r.estado === 'reservado';
            var badgeClass = isActive ? 'badge-success' : 'badge-danger';
            var badgeText = isActive ? 'Reservado' : 'Cancelado';
            
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-primary);border-radius:var(--radius-md);border:1px solid var(--border-color)">'
              + '<div style="display:flex;align-items:center;gap:10px">'
              + '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.75rem;font-weight:600">' + initials + '</div>'
              + '<span style="font-size:.875rem;font-weight:500">' + nombre + '</span></div>'
              + '<span class="badge ' + badgeClass + '">' + badgeText + '</span>'
              + '</div>';
          });
          html += '</div>';
          container.innerHTML = html;
        } catch(err) {
          var container = overlay.querySelector('#modal-inscriptos');
          if (container) container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.875rem">No se pudieron cargar los inscriptos</div>';
        }
      };
    });
  }

  async function doBooking(classId, btnEl) {
    if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '...'; }
    var result = await DB.createBookingInSupabase(user.id, classId);
    
    if (result.error) { 
      Toast.show('error','No se pudo reservar', result.error); 
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = 'Reservar'; }
      return; 
    }
    Toast.show('success','Reserva confirmada','Tu lugar está asegurado en la nube');
    user = await Auth.refreshUser(); // balance actualizado
    var navCredits = document.querySelector('.user-credits');
    if (navCredits) navCredits.innerHTML = '&#11088; ' + user.creditos + ' creditos disponibles';
    if(window.Router && Router.refreshNavbar) Router.refreshNavbar();
    update();
  }

  // Lanzar primera actualización
  update();
};

// --- CLASS DETAIL ---
Pages.classDetail = async function(container, classId) {
  var user = await Auth.getCurrentUser();
  if (!user) { Router.navigate('/login'); return; }
  var cls = DB.getClass(parseInt(classId));
  if (!cls) { container.innerHTML = '<div class="page-container"><div class="empty-state"><h3>Clase no encontrada</h3></div></div>'; return; }
  var bookings = DB.getBookingsByClass(cls.id);
  var userBooking = bookings.find(function(b){ return b.usuario_id === user.id; });
  var pct = ((cls.cupo_total - cls.cupo_disponible) / cls.cupo_total) * 100;
  var lvl = pct < 50 ? 'high' : pct < 80 ? 'medium' : 'low';

  function render() {
    bookings = DB.getBookingsByClass(cls.id);
    userBooking = DB.getBookings(user.id).find(function(b){ return b.clase_id === cls.id && b.estado === 'reservado'; });
    cls = DB.getClass(parseInt(classId));
    pct = ((cls.cupo_total - cls.cupo_disponible) / cls.cupo_total) * 100;
    lvl = pct < 50 ? 'high' : pct < 80 ? 'medium' : 'low';

    container.innerHTML = '<div class="page-container">'
      + '<button class="btn btn-ghost" onclick="Router.navigate(\'/dashboard\')" style="margin-bottom:16px">&#9664; Volver a clases</button>'
      + '<div class="class-detail-header"><div style="position:relative;z-index:1">'
      + '<span class="badge badge-primary" style="margin-bottom:8px">' + cls.tipo.toUpperCase() + '</span>'
      + '<h1 style="font-size:2rem;font-weight:900;margin-bottom:4px">' + cls.nombre + '</h1>'
      + '<p style="color:var(--text-secondary)">' + (cls.instructor||'Sin instructor asignado') + '</p>'
      + '<div class="class-detail-meta">'
      + '<div class="class-meta-item"><span class="meta-icon">&#128197;</span> ' + formatDate(cls.fecha) + '</div>'
      + '<div class="class-meta-item"><span class="meta-icon">&#128336;</span> ' + cls.horario + ' (' + cls.duracion + ' min)</div>'
      + '<div class="class-meta-item"><span class="meta-icon">&#128101;</span> ' + cls.cupo_disponible + ' de ' + cls.cupo_total + ' lugares</div>'
      + '</div></div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px" class="detail-grid">'
      + '<div class="card"><h3 style="margin-bottom:16px;font-weight:700">Disponibilidad</h3>'
      + '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">'
      + '<div style="width:100%;height:12px;background:var(--bg-glass-strong);border-radius:9999px;overflow:hidden"><div class="spots-bar-fill ' + lvl + '" style="height:100%;width:' + pct + '%;border-radius:9999px"></div></div>'
      + '<span style="font-weight:700;white-space:nowrap">' + Math.round(pct) + '%</span></div>'
      + '<p style="color:var(--text-secondary);font-size:.875rem">' + (cls.cupo_total - cls.cupo_disponible) + ' personas inscriptas de ' + cls.cupo_total + ' lugares</p>'
      + (userBooking
        ? '<div style="margin-top:16px;font-size:0.8rem;color:var(--text-secondary);"><span style="color:var(--text-warning)">&#9888;</span> Recuerda: puedes cancelar sin penalización hasta 3 horas antes.</div><button class="btn btn-danger btn-block" style="margin-top:8px" id="cancel-btn">Cancelar mi reserva</button>'
        : (cls.cupo_disponible > 0
          ? '<button class="btn btn-primary btn-block btn-lg" style="margin-top:16px" id="book-btn">&#10003; Reservar mi lugar</button>'
          : '<button class="btn btn-ghost btn-block" disabled style="margin-top:16px">Sin cupo disponible</button>'))
      + '</div>'
      + '<div class="card"><h3 style="margin-bottom:16px;font-weight:700">Inscriptos (' + bookings.length + ')</h3>'
      + renderAttendees(bookings)
      + '</div></div></div>';

    var bookBtn = document.getElementById('book-btn');
    if (bookBtn) bookBtn.onclick = async function() {
      bookBtn.disabled = true; bookBtn.innerHTML = 'Procesando...';
      var result = await DB.createBookingInSupabase(user.id, cls.id);
      if (result.error) { 
        Toast.show('error','Error', result.error); 
        bookBtn.disabled = false; bookBtn.innerHTML = '&#10003; Reservar mi lugar';
        return; 
      }
      Toast.show('success','Reserva confirmada','Tu lugar está asegurado en la nube');
      await Auth.refreshUser();
      if(window.Router && Router.refreshNavbar) Router.refreshNavbar();
      render();
    };
    
    var cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.onclick = async function() {
      if (userBooking) {
        var classTime = new Date(cls.fecha + 'T' + (cls.horario || '00:00') + ':00');
        var isLate = ((classTime - new Date()) / (1000 * 60 * 60)) < 3;
        var msg = isLate 
          ? "Estás fuera del horario de cancelación (menos de 3hs o clase pasada).\nSi continúas, perderás el crédito.\n\n¿Cancelar de todos modos?" 
          : "¿Estás seguro de cancelar tu reserva?\nSe te devolverá el crédito a tu cuenta.";
        
        Pages.confirm(msg, async function() {
          cancelBtn.disabled = true; cancelBtn.innerHTML = 'Procesando...';
          
          var r = await DB.cancelBookingInSupabase(userBooking.id);
          
          if (r.error) {
            Toast.show('error','Error', r.error);
            cancelBtn.disabled = false; cancelBtn.innerHTML = 'Cancelar mi reserva';
            return;
          }
          Toast.show('info','Reserva cancelada', r.isLate ? 'Cancelación tardía. El crédito no fue devuelto.' : 'Tu crédito fue devuelto a Supabase');
          await Auth.refreshUser();
          if(window.Router && Router.refreshNavbar) Router.refreshNavbar();
          render(); // al refrescar, la sincronizacion de la db mantendra compatibles los reads locales
        });
      }
    };
  }

  function renderAttendees(bks) {
    if (bks.length === 0) return '<div class="empty-state" style="padding:24px"><p>Aun no hay inscriptos</p></div>';
    var html = '<div class="attendees-list">';
    bks.forEach(function(b) {
      var u = DB.getUser(b.usuario_id);
      if (!u) return;
      html += '<div class="attendee-item"><div class="attendee-info">'
        + '<div class="attendee-avatar">' + getInitials(u.nombre) + '</div>'
        + '<div><div style="font-weight:600;font-size:.875rem">' + u.nombre + '</div>'
        + '<div style="font-size:.75rem;color:var(--text-secondary)">' + formatDateTime(b.created_at) + '</div></div></div>'
        + '<span class="badge badge-success">Confirmado</span></div>';
    });
    return html + '</div>';
  }
  render();
};

// --- MY BOOKINGS ---
Pages.myBookings = async function(container) {
  var user = await Auth.refreshUser();
  if (!user) { Router.navigate('/login'); return; }

  async function render() {
    container.innerHTML = '<div class="page-container" style="text-align:center;padding:40px;">'
      + '<div style="font-size:2rem;margin-bottom:16px">&#8987;</div>'
      + '<div style="color:var(--text-secondary)">Cargando tu historial desde la nube...</div></div>';

    // Pedimos las reservas reales a Supabase
    var bookings = await DB.getBookingsFromSupabase(user.id);
    
    // Separadores para BONUS (activas vs canceladas)
    var activas = bookings.filter(function(b){return b.estado==='reservado';});
    var pasadas = bookings.filter(function(b){return b.estado!=='reservado';});

    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128196; Mis Reservas</h1><p>Historial y reservas activas</p></div>'
      + '<div class="user-credits" style="font-size:.875rem;padding:8px 16px">&#11088; ' + user.creditos + ' creditos</div></div>'
      + '<div style="margin-bottom:24px;padding:12px 16px;background:var(--bg-glass-strong);border-radius:8px;font-size:0.875rem;color:var(--text-secondary);"><span style="color:var(--text-warning)">&#9888;</span> Recuerda: puedes cancelar sin penalización hasta 3 horas antes de la clase.</div>'
      + '<div class="section-header"><h2 class="section-title">&#9989; Reservas Activas (' + activas.length + ')</h2></div>'
      + '<div class="bookings-list" style="margin-bottom:32px">' + renderBookings(activas, true) + '</div>'
      + (pasadas.length > 0 ? '<div class="section-header"><h2 class="section-title">&#128203; Historial ('+pasadas.length+')</h2></div><div class="bookings-list">' + renderBookings(pasadas, false) + '</div>' : '')
      + '</div>';
    bindActions();
  }

  function renderBookings(bks, canCancel) {
    if (bks.length === 0 && canCancel) return '<div class="empty-state" style="padding:32px"><div class="empty-icon">&#128196;</div><h3>No tienes reservas aún</h3><p>Explora las clases disponibles y reserva tu lugar</p><button class="btn btn-primary" onclick="Router.navigate(\'/dashboard\')">Ver Clases</button></div>';
    if (bks.length === 0) return '<div class="empty-state" style="padding:32px"><p>No hay historial de clases.</p></div>';
    var html = '';
    bks.forEach(function(b) {
      // Usamos exclusivamente la clase embebida desde Supabase
      var cls = b.clases;
      if (!cls) return;
      var d = new Date(cls.fecha + 'T' + (cls.horario || '00:00') + ':00');
      var isLate = ((d - new Date()) / (1000 * 60 * 60)) < 3;
      var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      var statusBadge = b.estado==='reservado' ? '<span class="badge badge-success">Confirmada</span>' : '<span class="badge badge-danger">Cancelada</span>';
      html += '<div class="booking-card"><div class="booking-info">'
        + '<div class="booking-date-badge"><div class="bd-day">' + d.getDate() + '</div><div class="bd-month">' + meses[d.getMonth()] + '</div></div>'
        + '<div class="booking-details"><h3>' + cls.nombre + '</h3><p>&#128336; ' + cls.horario + ' &middot; ' + cls.duracion + ' min &middot; ' + (cls.instructor||'') + '</p></div></div>'
        + '<div class="booking-actions">' + statusBadge
        + (canCancel && b.estado==='reservado' ? ' <button class="btn btn-danger btn-sm" data-cancel="' + b.id + '" data-late="' + (isLate ? '1' : '0') + '">Cancelar</button>' : '')
        + '</div></div>';
    });
    return html;
  }

  function bindActions() {
    var btns = document.querySelectorAll('[data-cancel]');
    
    btns.forEach(function(btn) {
      btn.onclick = async function() {
        var bookingId = parseInt(this.dataset.cancel);
        
        var isLate = this.dataset.late === '1';
        var msg = isLate 
          ? "Estás fuera del horario de cancelación (menos de 3hs o clase pasada).\nSi continúas, perderás el crédito.\n\n¿Cancelar de todos modos?" 
          : "¿Estás seguro de cancelar tu reserva?\nSe te devolverá el crédito a tu cuenta.";
          
        var btnElement = this;
        Pages.confirm(msg, async function() {
          btnElement.disabled = true; btnElement.innerHTML = '...';
          
          var r = await DB.cancelBookingInSupabase(bookingId);
          
          if (r.error) {
             Toast.show('error', 'Error', r.error);
             btnElement.disabled = false; btnElement.innerHTML = 'Cancelar';
             return;
          }
          
          Toast.show('info','Reserva cancelada', r.isLate ? 'Cancelación tardía. El crédito no fue devuelto.' : 'Tu crédito fue devuelto a Supabase');
          user = Auth.refreshUser(); 
          if(window.Router && Router.refreshNavbar) Router.refreshNavbar();
          render();
        });
      };
    });
  }
  render();
};
<<<<<<< HEAD
=======

// --- PLANES (CLIENT) ---
Pages.planes = async function(container) {
  var user = await Auth.refreshUser();
  if (!user) { Router.navigate('/login'); return; }

  container.innerHTML = '<div class="page-container">'
    + '<div style="text-align:center;padding:40px;opacity:0.6"><div style="font-size:2rem;margin-bottom:12px">&#8987;</div>Cargando planes...</div></div>';

  var [planes, misPagos] = await Promise.all([
    DB.getPlansFromSupabase(),
    DB.getUserPaymentsFromSupabase(user.id)
  ]);

  function render() {
    var html = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128176; Comprar Créditos</h1><p>Elegí tu plan y sumá créditos para reservar</p></div>'
      + '<div class="user-credits" style="font-size:.875rem;padding:8px 16px">&#11088; ' + user.creditos + ' créditos disponibles</div></div>';

    if (planes.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">&#128179;</div><h3>No hay planes disponibles</h3><p>Contacta al estudio para más información</p></div>';
    } else {
      html += '<div class="classes-grid" style="margin-bottom:32px">';
      planes.forEach(function(p) {
        html += '<div class="card" style="text-align:center;position:relative;overflow:hidden">'
          + '<div style="position:absolute;top:0;left:0;right:0;height:4px;background:var(--primary)"></div>'
          + '<div style="padding:var(--space-xl) var(--space-lg)">'
          + '<h3 style="font-family:var(--font-serif);font-size:1.25rem;margin-bottom:8px">' + p.nombre + '</h3>'
          + '<div style="font-size:2rem;font-weight:700;color:var(--primary-dark);font-family:var(--font-serif);margin-bottom:4px">$' + Number(p.precio).toLocaleString('es-AR') + '</div>'
          + '<div style="font-size:.875rem;color:var(--text-secondary);margin-bottom:20px">ARS</div>'
          + '<div style="display:inline-flex;align-items:center;gap:6px;padding:8px 20px;background:var(--success-bg);border-radius:var(--radius-full);margin-bottom:20px">'
          + '<span style="font-size:1.1rem">&#11088;</span><span style="font-weight:600;color:var(--primary-dark)">' + p.creditos + ' créditos</span></div><br>'
          + '<button class="btn btn-primary btn-lg" data-plan-id="' + p.id + '">Ya pagué</button>'
          + '</div></div>';
      });
      html += '</div>';
    }

    // Payment history
    if (misPagos.length > 0) {
      html += '<div class="section-header"><h2 class="section-title">&#128203; Mis Pagos</h2></div>'
        + '<div class="bookings-list">';
      misPagos.forEach(function(pg) {
        var plan = pg.planes;
        var badgeClass = pg.estado === 'aprobado' ? 'badge-success' : pg.estado === 'pendiente' ? 'badge-warning' : 'badge-danger';
        var badgeText = pg.estado === 'aprobado' ? 'Aprobado' : pg.estado === 'pendiente' ? 'Pendiente' : 'Rechazado';
        var fecha = new Date(pg.created_at);
        var fechaStr = fecha.getDate() + '/' + (fecha.getMonth()+1) + '/' + fecha.getFullYear();
        html += '<div class="booking-card">'
          + '<div class="booking-info"><div class="booking-details">'
          + '<h3>' + (plan ? plan.nombre : 'Plan') + '</h3>'
          + '<p>&#128197; ' + fechaStr + (plan ? ' &middot; ' + plan.creditos + ' créditos' : '') + '</p>'
          + '</div></div>'
          + '<div class="booking-actions"><span class="badge ' + badgeClass + '">' + badgeText + '</span></div>'
          + '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // Bind "Ya pagué" buttons
    document.querySelectorAll('[data-plan-id]').forEach(function(btn) {
      btn.onclick = async function() {
        btn.disabled = true; btn.innerHTML = 'Enviando...';
        var result = await DB.createPaymentInSupabase(user.id, parseInt(btn.dataset.planId));
        if (result.error) {
          Toast.show('error', 'Error', result.error);
          btn.disabled = false; btn.innerHTML = 'Ya pagué';
          return;
        }
        Toast.show('success', 'Pago enviado', 'Pendiente de aprobación por el estudio');
        misPagos = await DB.getUserPaymentsFromSupabase(user.id);
        render();
      };
    });
  }
  render();
};
>>>>>>> 872efee9d1642456ead9b3bf4038cbc2eae644bc
