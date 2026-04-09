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
  var isLogin = true;
  function render() {
    container.innerHTML = '<div class="login-container"><div class="login-card">'
      + '<div class="login-logo"><span class="logo-icon">&#127947;</span><h1>SigueFit</h1><p>Gestion inteligente para tu estudio</p></div>'
      + '<div class="login-tabs"><button class="login-tab'+(isLogin?' active':'')+'" id="tab-login">Iniciar Sesion</button>'
      + '<button class="login-tab'+(!isLogin?' active':'')+'" id="tab-register">Registrarse</button></div>'
      + '<form id="auth-form">' + (isLogin ? renderLoginForm() : renderRegisterForm()) + '</form>'
      + '<div style="margin-top:24px;text-align:center;font-size:.75rem;color:var(--text-muted)">'
      + 'Demo: admin@siguefit.com / admin123<br>Cliente: maria@test.com / 123456</div>'
      + '</div></div>';
    document.getElementById('tab-login').onclick = function(){ isLogin=true; render(); };
    document.getElementById('tab-register').onclick = function(){ isLogin=false; render(); };
    document.getElementById('auth-form').onsubmit = async function(e){
      e.preventDefault();
      if (isLogin) {
        var u = Auth.login(document.getElementById('email').value, document.getElementById('password').value);
        if (u) Router.navigate(u.rol==='admin'?'/admin':'/dashboard');
      } else {
        var u = await Auth.register(document.getElementById('nombre').value, document.getElementById('email').value, document.getElementById('password').value, document.getElementById('telefono').value);
        if (u) Router.navigate('/dashboard');
      }
    };
  }
  function renderLoginForm() {
    return '<div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="email" placeholder="tu@email.com" required></div>'
      + '<div class="form-group"><label class="form-label">Contrasena</label><input class="form-input" type="password" id="password" placeholder="Tu contrasena" required></div>'
      + '<button class="btn btn-primary btn-block btn-lg" type="submit" style="margin-top:8px">Iniciar Sesion</button>';
  }
  function renderRegisterForm() {
    return '<div class="form-group"><label class="form-label">Nombre completo</label><input class="form-input" type="text" id="nombre" placeholder="Tu nombre" required></div>'
      + '<div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="email" placeholder="tu@email.com" required></div>'
      + '<div class="form-group"><label class="form-label">Telefono</label><input class="form-input" type="tel" id="telefono" placeholder="+54 11 5555-1234"></div>'
      + '<div class="form-group"><label class="form-label">Contrasena</label><input class="form-input" type="password" id="password" placeholder="Min. 6 caracteres" required></div>'
      + '<button class="btn btn-primary btn-block btn-lg" type="submit" style="margin-top:8px">Crear Cuenta</button>';
  }
  render();
};

// --- CLIENT DASHBOARD ---
Pages.dashboard = function(container) {
  var user = Auth.refreshUser();
  var today = new Date();
  var selectedDate = today.toISOString().split('T')[0];
  var weekOffset = 0;
  var filterType = 'todas';
  var renderCounter = 0;

  async function render() {
    var currentRender = ++renderCounter;

    // 1. Mostrar layout esqueleto mientras ambos calls a la red terminan
    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#127947; Clases Disponibles</h1><p>Reserva tu lugar en la proxima clase</p></div>'
      + '<div class="user-credits" style="font-size:.875rem;padding:8px 16px">&#11088; ' + user.creditos + ' creditos disponibles</div></div>'
      + '<div id="calendar-skeleton" style="padding:20px;text-align:center;color:var(--text-secondary)">Cargando calendario...</div>'
      + renderFilters()
      + '<div class="classes-grid" id="classes-grid" style="display:block; text-align:center; padding:40px 0;">'
      + '<div style="font-size:2.5rem; margin-bottom:16px; opacity:0.8">&#8987;</div>'
      + '<div style="color:var(--text-secondary); font-weight:500;">Cargando clases desde Supabase...</div>'
      + '</div></div>';

    // 2. Fetch asíncrono combinado desde Supabase
    var [cls, datesMap] = await Promise.all([
      DB.getClassesFromSupabase(selectedDate),
      DB.getClassDatesFromSupabase()
    ]);
    
    // Evitar race conditions
    if (currentRender !== renderCounter) return;

    // 3. Reemplazar Esqueleto de Calendario y volver a atar eventos
    var calSkeleton = document.getElementById('calendar-skeleton');
    if (calSkeleton) {
      calSkeleton.outerHTML = renderCalendar(datesMap);
      bindCalendar();
    }

    // 4. Aplicar filtros locales y ordenamientos
    if (filterType !== 'todas') cls = cls.filter(function(c){ return c.tipo === filterType; });
    cls.sort(function(a,b){ return a.horario.localeCompare(b.horario); });

    // 5. Actualizar el grid con los datos reales
    var grid = document.getElementById('classes-grid');
    if (grid) {
      grid.style = ''; // Quitar el block styling inline de carga
      grid.innerHTML = renderClasses(cls);
      bindClassCards();
    }
  }

  function renderCalendar(datesMap) {
    if (!datesMap) datesMap = {};
    var dias = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var start = new Date(today);
    start.setDate(today.getDate() + (weekOffset * 7));
    var monthYear = meses[start.getMonth()] + ' ' + start.getFullYear();
    var html = '<div class="calendar-header"><div class="calendar-title">' + monthYear + '</div>'
      + '<div class="calendar-nav"><button id="cal-prev">&#9664;</button><button id="cal-today" style="width:auto;padding:0 12px;font-size:.75rem">Hoy</button><button id="cal-next">&#9654;</button></div></div>'
      + '<div class="calendar-days">';
    for (var i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      var ds = d.toISOString().split('T')[0];
      var isActive = ds === selectedDate;
      var numCls = datesMap[ds] || 0;
      html += '<div class="calendar-day' + (isActive?' active':'') + '" data-date="' + ds + '">'
        + '<div class="day-name">' + dias[d.getDay()] + '</div>'
        + '<div class="day-number">' + d.getDate() + '</div>'
        + '<div class="day-classes">' + (numCls > 0 ? numCls + ' clases' : '-') + '</div></div>';
    }
    html += '</div>';
    return html;
  }

  function renderFilters() {
    var types = ['todas','pilates','yoga','funcional','stretching','barre'];
    var labels = {todas:'&#127919; Todas',pilates:'&#129526; Pilates',yoga:'&#129495; Yoga',funcional:'&#128170; Funcional',stretching:'&#129336; Stretching',barre:'&#129464; Barre'};
    var html = '<div class="filters-bar">';
    types.forEach(function(t) {
      html += '<button class="filter-chip' + (filterType===t?' active':'') + '" data-filter="' + t + '">' + labels[t] + '</button>';
    });
    return html + '</div>';
  }

  function renderClasses(cls) {
    if (cls.length === 0) return '<div class="empty-state"><div class="empty-icon">&#128197;</div><h3>No hay clases este dia</h3><p>Selecciona otra fecha en el calendario</p></div>';
    var html = '';
    cls.forEach(function(c, i) {
      var pct = ((c.cupo_total - c.cupo_disponible) / c.cupo_total) * 100;
      var lvl = pct < 50 ? 'high' : pct < 80 ? 'medium' : 'low';
      var full = c.cupo_disponible <= 0;
      html += '<div class="class-card" data-id="' + c.id + '" style="animation-delay:' + (i*0.05) + 's">'
        + '<div class="class-card-header"><span class="class-card-type">' + c.tipo + '</span><span class="class-card-time">&#128336; ' + c.horario + '</span></div>'
        + '<div class="class-card-body"><div class="class-card-name">' + c.nombre + '</div>'
        + '<div class="class-card-instructor">&#128100; ' + (c.instructor||'Sin asignar') + ' &middot; ' + c.duracion + ' min</div>'
        + '<div class="class-card-footer"><div class="class-card-spots">'
        + '<div class="spots-bar"><div class="spots-bar-fill ' + lvl + '" style="width:' + pct + '%"></div></div>'
        + '<span class="spots-text">' + c.cupo_disponible + '/' + c.cupo_total + '</span></div>'
        + (full ? '<span class="badge badge-danger">Lleno</span>' : '<button class="btn btn-primary btn-sm" data-book="' + c.id + '">Reservar</button>')
        + '</div></div></div>';
    });
    return html;
  }

  function bindCalendar() {
    document.querySelectorAll('.calendar-day').forEach(function(el) {
      el.onclick = function() { selectedDate = el.dataset.date; render(); };
    });
    var prev = document.getElementById('cal-prev');
    var next = document.getElementById('cal-next');
    var todayBtn = document.getElementById('cal-today');
    if (prev) prev.onclick = function(){ weekOffset--; render(); };
    if (next) next.onclick = function(){ weekOffset++; render(); };
    if (todayBtn) todayBtn.onclick = function(){ weekOffset=0; selectedDate=today.toISOString().split('T')[0]; render(); };
    document.querySelectorAll('.filter-chip').forEach(function(el) {
      el.onclick = function() { filterType = el.dataset.filter; render(); };
    });
  }

  function bindClassCards() {
    document.querySelectorAll('.class-card').forEach(function(el) {
      el.onclick = function(e) {
        if (e.target.dataset.book) {
          e.stopPropagation();
          doBooking(parseInt(e.target.dataset.book), e.target);
          return;
        }
        Router.navigate('/clase/' + el.dataset.id);
      };
    });
    document.querySelectorAll('[data-book]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        doBooking(parseInt(btn.dataset.book), btn);
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
    user = Auth.refreshUser(); // usuario local fresco 
    if(window.Router && Router.refreshNavbar) Router.refreshNavbar(); // navbar unificado
    render(); // dispara query global nuevo
  }

  render();
};

// --- CLASS DETAIL ---
Pages.classDetail = function(container, classId) {
  var user = Auth.getCurrentUser();
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
        ? '<button class="btn btn-danger btn-block" style="margin-top:16px" id="cancel-btn">Cancelar mi reserva</button>'
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
      Auth.refreshUser();
      if(window.Router && Router.refreshNavbar) Router.refreshNavbar();
      render();
    };
    
    var cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.onclick = async function() {
      if (userBooking) {
        console.log('Cancel click desde Detalles', userBooking.id);
        var classTime = new Date(cls.fecha + 'T' + (cls.horario || '00:00') + ':00');
        var isLate = ((classTime - new Date()) / (1000 * 60 * 60)) < 3;
        var msg = isLate 
          ? "Estás fuera del horario de cancelación (menos de 3hs o clase pasada).\nSi continúas, perderás el crédito.\n\n¿Cancelar de todos modos?" 
          : "¿Estás seguro de cancelar tu reserva?\nSe te devolverá el crédito a tu cuenta.";
        
        Pages.confirm(msg, async function() {
          cancelBtn.disabled = true; cancelBtn.innerHTML = 'Procesando...';
          console.log('Enviando petición a la nube...');
          
          var r = await DB.cancelBookingInSupabase(userBooking.id);
          console.log('Resultado de cancelación:', r);
          
          if (r.error) {
            Toast.show('error','Error', r.error);
            cancelBtn.disabled = false; cancelBtn.innerHTML = 'Cancelar mi reserva';
            return;
          }
          Toast.show('info','Reserva cancelada', r.isLate ? 'Cancelación tardía. El crédito no fue devuelto.' : 'Tu crédito fue devuelto a Supabase');
          Auth.refreshUser();
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
Pages.myBookings = function(container) {
  var user = Auth.refreshUser();

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
      + '<div class="section-header"><h2 class="section-title">&#9989; Reservas Activas (' + activas.length + ')</h2></div>'
      + '<div class="bookings-list" style="margin-bottom:32px">' + renderBookings(activas, true) + '</div>'
      + (pasadas.length > 0 ? '<div class="section-header"><h2 class="section-title">&#128203; Historial ('+pasadas.length+')</h2></div><div class="bookings-list">' + renderBookings(pasadas, false) + '</div>' : '')
      + '</div>';
    bindActions();
  }

  function renderBookings(bks, canCancel) {
    if (bks.length === 0) return '<div class="empty-state" style="padding:32px"><div class="empty-icon">&#128196;</div><h3>No hay reservas</h3><p>Explora las clases disponibles y reserva tu lugar</p><button class="btn btn-primary" onclick="Router.navigate(\'/dashboard\')">Ver Clases</button></div>';
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
    console.log('Asignando eventos a ' + btns.length + ' botones de cancelar');
    
    btns.forEach(function(btn) {
      btn.onclick = async function() {
        var bookingId = parseInt(this.dataset.cancel);
        console.log('Cancel click', bookingId);
        
        var isLate = this.dataset.late === '1';
        var msg = isLate 
          ? "Estás fuera del horario de cancelación (menos de 3hs o clase pasada).\nSi continúas, perderás el crédito.\n\n¿Cancelar de todos modos?" 
          : "¿Estás seguro de cancelar tu reserva?\nSe te devolverá el crédito a tu cuenta.";
          
        var btnElement = this;
        Pages.confirm(msg, async function() {
          btnElement.disabled = true; btnElement.innerHTML = '...';
          console.log('Enviando petición a la nube...');
          
          var r = await DB.cancelBookingInSupabase(bookingId);
          console.log('Resultado de cancelación:', r);
          
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
