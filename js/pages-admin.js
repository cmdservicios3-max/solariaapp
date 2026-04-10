// ============================================
// SigueFit - Admin Pages
// ============================================

// --- ADMIN DASHBOARD ---
Pages.admin = function(container) {
  var stats = DB.getStats();
  var config = DB.getData().config;
  container.innerHTML = '<div class="page-container">'
    + '<div class="page-header"><div><h1>&#128202; Panel de Administracion</h1><p>SOLARIA Estudio</p></div></div>'
    + '<div class="metrics-grid">'
    + '<div class="metric-card mc-p"><div class="metric-icon">&#128197;</div><div class="metric-value">' + stats.clasesHoy + '</div><div class="metric-label">Clases hoy</div></div>'
    + '<div class="metric-card mc-s"><div class="metric-icon">&#128196;</div><div class="metric-value">' + stats.reservasActivas + '</div><div class="metric-label">Reservas activas</div></div>'
    + '<div class="metric-card mc-g"><div class="metric-icon">&#128176;</div><div class="metric-value">' + formatMoney(stats.ingresosTotales) + '</div><div class="metric-label">Ingresos totales</div></div>'
    + '<div class="metric-card mc-a"><div class="metric-icon">&#128101;</div><div class="metric-value">' + stats.clientesActivos + '</div><div class="metric-label">Clientes activos</div></div>'
    + '</div>'
    + renderTodayClasses()
    + renderRecentBookings()
    + '</div>';
};

function renderTodayClasses() {
  var today = new Date().toISOString().split('T')[0];
  var cls = DB.getClasses(today);
  cls.sort(function(a,b){ return a.horario.localeCompare(b.horario); });
  var html = '<div class="section-header"><h2 class="section-title">&#128197; Clases de Hoy</h2></div>';
  if (cls.length === 0) return html + '<div class="card"><p class="text-muted">No hay clases programadas para hoy</p></div>';
  html += '<div class="table-container"><table class="data-table"><thead><tr><th>Horario</th><th>Clase</th><th>Instructor</th><th>Cupo</th><th>Estado</th></tr></thead><tbody>';
  cls.forEach(function(c) {
    var pct = ((c.cupo_total - c.cupo_disponible)/c.cupo_total)*100;
    var badge = pct >= 100 ? '<span class="badge badge-danger">Lleno</span>' : pct >= 70 ? '<span class="badge badge-warning">Casi lleno</span>' : '<span class="badge badge-success">Disponible</span>';
    html += '<tr><td><strong>' + c.horario + '</strong></td><td>' + c.nombre + '</td><td>' + (c.instructor||'-') + '</td><td>' + (c.cupo_total-c.cupo_disponible) + '/' + c.cupo_total + '</td><td>' + badge + '</td></tr>';
  });
  return html + '</tbody></table></div>';
}

function renderRecentBookings() {
  var bks = DB.getBookings().filter(function(b){return b.estado==='reservado';}).slice(-5).reverse();
  var html = '<div class="section-header" style="margin-top:32px"><h2 class="section-title">&#128196; Ultimas Reservas</h2></div>';
  if (bks.length === 0) return html + '<div class="card"><p class="text-muted">No hay reservas recientes</p></div>';
  html += '<div class="table-container"><table class="data-table"><thead><tr><th>Cliente</th><th>Clase</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>';
  bks.forEach(function(b) {
    var u = DB.getUser(b.usuario_id);
    var c = DB.getClass(b.clase_id);
    if (!u || !c) return;
    html += '<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="attendee-avatar" style="width:28px;height:28px;font-size:.65rem">' + getInitials(u.nombre) + '</div>' + u.nombre + '</div></td><td>' + c.nombre + '</td><td>' + formatDate(c.fecha) + ' ' + c.horario + '</td><td><span class="badge badge-success">Confirmada</span></td></tr>';
  });
  return html + '</tbody></table></div>';
}

// --- ADMIN CLASSES ---
Pages.adminClases = function(container) {
  var editingClass = null;

  async function render() {
    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128197; Gestion de Clases</h1><p>Crear, editar y administrar clases</p></div>'
      + '<button class="btn btn-primary" id="new-class-btn">&#10010; Nueva Clase</button></div>'
      + '<div id="calendar-container" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:var(--space-md);min-height:600px;color:var(--text-primary);">'
      + '<div style="text-align:center;padding:40px;color:var(--text-secondary)">&#8987; Cargando calendario y clases...</div>'
      + '</div></div>';

    document.getElementById('new-class-btn').onclick = function(){ openModal(null); };

    var clases = await DB.getClassesFromSupabase();
    clases = clases || [];

    var calendarEl = document.getElementById('calendar-container');
    if (!calendarEl) return;
    calendarEl.innerHTML = ''; 

    // FullCalendar variables override for Dark Mode
    calendarEl.style.setProperty('--fc-border-color', 'var(--border-color)');
    calendarEl.style.setProperty('--fc-page-bg-color', 'var(--bg-card)');
    calendarEl.style.setProperty('--fc-neutral-bg-color', 'var(--bg-secondary)');
    calendarEl.style.setProperty('--fc-neutral-text-color', 'var(--text-primary)');
    calendarEl.style.setProperty('--fc-today-bg-color', 'rgba(210,89,63,0.1)'); // primary tint
    calendarEl.style.fontFamily = 'var(--font)';

    var calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: window.innerWidth < 768 ? 'listMonth' : 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,dayGridMonth,listMonth'
      },
      locale: 'es',
      firstDay: 1,
      slotMinTime: '06:00:00',
      slotMaxTime: '22:00:00',
      buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', list: 'Lista' },
      events: clases.map(function(c) {
        var startDT = c.fecha + 'T' + (c.horario || '00:00');
        var ms = new Date(startDT).getTime() + (c.duracion * 60000);
        var endDate = new Date(ms - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0,-1); // local adjustment helper if needed, but native ISO is safer
        // Better cross-browser approach for end string
        var d = new Date(startDT);
        d.setMinutes(d.getMinutes() + c.duracion);
        var endString = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + 'T' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':00';

        var cap = (c.cupo_total - c.cupo_disponible);
        return {
          id: c.id,
          title: c.nombre + ' (' + cap + '/' + c.cupo_total + ')',
          start: startDT,
          end: endString,
          extendedProps: c,
          backgroundColor: c.cupo_disponible <= 0 ? 'var(--danger)' : 'var(--primary)',
          borderColor: 'transparent'
        };
      }),
      eventClick: function(info) {
        var c = info.event.extendedProps;
        var clsToEdit = clases.find(function(x){return x.id === c.id;}) || DB.getClass(c.id);
        openModal(clsToEdit);
      },
      dateClick: function(info) {
        var newCls = { fecha: info.dateStr.split('T')[0] };
        if (info.dateStr.includes('T')) {
           newCls.horario = info.dateStr.split('T')[1].substring(0,5);
        }
        openModal(newCls);
      }
    });
    calendar.render();
  }

  function openModal(cls) {
    editingClass = cls && cls.id ? cls : null;
    var isEdit = !!editingClass;
    // Si viene de dateClick tendra fecha pero no id
    var defaultFecha = cls && cls.fecha ? cls.fecha : new Date().toISOString().split('T')[0];
    var defaultHorario = cls && cls.horario ? cls.horario : '09:00';

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'class-modal';
    overlay.innerHTML = '<div class="modal"><div class="modal-header"><h3 class="modal-title">' + (isEdit?'Editar':'Nueva') + ' Clase</h3><button class="modal-close" id="modal-close-btn">&times;</button></div>'
      + '<div class="modal-body"><form id="class-form">'
      + '<div class="form-group"><label class="form-label">Nombre</label><input class="form-input" id="cf-nombre" value="' + (editingClass?editingClass.nombre:'Pilates Mat') + '" required placeholder="Ej: Pilates Mat"></div>'
      + '<div class="form-group"><label class="form-label">Tipo</label><select class="form-input" id="cf-tipo"><option value="pilates"' + (editingClass&&editingClass.tipo==='pilates'?' selected':'') + '>Pilates</option><option value="yoga"' + (editingClass&&editingClass.tipo==='yoga'?' selected':'') + '>Yoga</option><option value="funcional"' + (editingClass&&editingClass.tipo==='funcional'?' selected':'') + '>Funcional</option><option value="stretching"' + (editingClass&&editingClass.tipo==='stretching'?' selected':'') + '>Stretching</option><option value="barre"' + (editingClass&&editingClass.tipo==='barre'?' selected':'') + '>Barre</option></select></div>'
      + '<div class="form-group"><label class="form-label">Instructor</label><input class="form-input" id="cf-inst" value="' + (editingClass?editingClass.instructor:'') + '" placeholder="Nombre del instructor"></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + '<div class="form-group"><label class="form-label">Fecha de Inicio</label><input type="date" class="form-input" id="cf-fecha" value="' + defaultFecha + '" required></div>'
      + '<div class="form-group"><label class="form-label">Horario</label><input type="time" class="form-input" id="cf-horario" value="' + defaultHorario + '" required></div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + '<div class="form-group"><label class="form-label">Duracion (min)</label><input type="number" class="form-input" id="cf-duracion" value="' + (editingClass?editingClass.duracion:60) + '" min="15" max="180" required></div>'
      + '<div class="form-group"><label class="form-label">Cupo maximo</label><input type="number" class="form-input" id="cf-cupo" value="' + (editingClass?editingClass.cupo_total:10) + '" min="1" max="50" required></div></div>'
      + (isEdit ? '' : '<div class="form-group" style="padding:16px; border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--bg-card);"><label class="form-label" style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;"><input type="checkbox" id="cf-repeat" onchange="document.getElementById(\'repeat-options\').style.display=this.checked?\'block\':\'none\'"> Programar clases concurrentes (Repetir)</label>'
      + '<div id="repeat-options" style="display:none; margin-top:16px;">'
      + '<div style="margin-bottom:8px;font-size:0.875rem;color:var(--text-secondary);">Dias de la semana:</div>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">'
      + ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'].map(function(d,i){return '<label style="font-size:0.875rem;display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" class="cf-rep-day" value="'+i+'"> '+d+'</label>';}).join('')
      + '</div>'
      + '<div class="form-group"><label class="form-label">Repetir hasta (inclusive)</label><input type="date" class="form-input" id="cf-rep-until"></div>'
      + '</div></div>')
      + '<div class="modal-footer" style="padding:16px 0 0;border:none;justify-content:space-between">'
      + (isEdit ? '<button type="button" class="btn btn-danger" id="modal-delete-btn">&#128465; Eliminar</button>' : '<div></div>')
      + '<div style="display:flex;gap:8px;"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancelar</button><button type="submit" class="btn btn-primary" id="modal-save-btn">' + (isEdit?'Guardar':'Crear Clase') + '</button></div></div>'
      + '</form></div></div>';
    document.body.appendChild(overlay);

    document.getElementById('modal-close-btn').onclick = function(){ overlay.remove(); };
    document.getElementById('modal-cancel-btn').onclick = function(){ overlay.remove(); };
    overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

    var delBtn = document.getElementById('modal-delete-btn');
    if (delBtn) {
      delBtn.onclick = async function() {
        if (confirm('¿Eliminar esta clase permanentemente?')) {
          delBtn.innerHTML = '...'; delBtn.disabled = true;
          await DB.deleteClassFromSupabase(editingClass.id);
          Toast.show('info','Clase eliminada','Removida del calendario');
          overlay.remove();
          render();
        }
      };
    }

    document.getElementById('class-form').onsubmit = async function(e) {
      e.preventDefault();
      var saveBtn = document.getElementById('modal-save-btn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = 'Guardando...'; }

      var data = {
        nombre: document.getElementById('cf-nombre').value,
        tipo: document.getElementById('cf-tipo').value,
        instructor: document.getElementById('cf-inst').value,
        fecha: document.getElementById('cf-fecha').value,
        horario: document.getElementById('cf-horario').value,
        duracion: parseInt(document.getElementById('cf-duracion').value),
        cupo_total: parseInt(document.getElementById('cf-cupo').value),
        activa: true
      };
      
      if (isEdit) {
        var diff = data.cupo_total - editingClass.cupo_total;
        data.cupo_disponible = editingClass.cupo_disponible + diff;
        if (data.cupo_disponible < 0) data.cupo_disponible = 0;
        await DB.updateClassInSupabase(editingClass.id, data);
        Toast.show('success','Clase actualizada', data.nombre);
        overlay.remove();
        render();
      } else {
        data.cupo_disponible = data.cupo_total;
        var repeatCb = document.getElementById('cf-repeat');
        if (repeatCb && repeatCb.checked) {
          // Logica concurrente
          var startDateStr = data.fecha + 'T00:00:00'; // Fuerza inicio a las 00h de forma predecible timezone-agnostic local
          var parts = data.fecha.split('-');
          var startDate = new Date(parts[0], parts[1]-1, parts[2]);
          
          var untilVal = document.getElementById('cf-rep-until').value;
          if (!untilVal) { Toast.show('error','Error','Falta la fecha de fin'); saveBtn.disabled = false; saveBtn.innerHTML = 'Crear Clase'; return; }
          var uParts = untilVal.split('-');
          var endDate = new Date(uParts[0], uParts[1]-1, uParts[2]);
          
          if (endDate < startDate) { Toast.show('error','Error','Fecha fin menor a inicio'); saveBtn.disabled = false; saveBtn.innerHTML = 'Crear Clase'; return; }
          var selectedDays = Array.from(document.querySelectorAll('.cf-rep-day:checked')).map(function(cb){ return parseInt(cb.value); });
          if (selectedDays.length === 0) { Toast.show('error','Error','Elija al menos un dia de repetición'); saveBtn.disabled = false; saveBtn.innerHTML = 'Crear Clase'; return; }
          
          Toast.show('info','Creando Multiples Clases','Sincronizando con nube...');
          var current = new Date(startDate);
          var promises = [];
          
          while (current <= endDate) {
            if (selectedDays.includes(current.getDay())) {
              var clone = Object.assign({}, data);
              clone.fecha = current.getFullYear() + "-" + String(current.getMonth()+1).padStart(2,'0') + "-" + String(current.getDate()).padStart(2,'0');
              promises.push(DB.addClassToSupabase(clone));
            }
            current.setDate(current.getDate() + 1);
          }
          
          if(promises.length === 0){ Toast.show('warning','Cuidado','Las fechas no contienen esos dias elegidos'); saveBtn.disabled = false; saveBtn.innerHTML = 'Crear Clase'; return; }
          await Promise.all(promises);
          Toast.show('success','Repetición Completa', promises.length + ' clases generadas masivamente.');
          overlay.remove();
          render();
        } else {
          try {
             var res = await DB.addClassToSupabase(data);
             if(!res) { Toast.show('error','Error', 'Falló la conexion con Supabase'); saveBtn.disabled = false; saveBtn.innerHTML = 'Crear Clase'; return; }
             Toast.show('success','Clase creada', data.nombre + ' en ' + data.fecha);
          } catch(err){ console.error(err); }
          overlay.remove();
          render();
        }
      }
    };
  }
  render();
};

// --- ADMIN CLIENTS ---
Pages.adminClientes = function(container) {
  async function render() {
    container.innerHTML = '<div class="page-container"><div class="page-header"><div><h1>&#128101; Gestion de Clientes</h1><p>Cargando clientes desde la nube...</p></div></div>'
      + '<div style="text-align:center;padding:40px;opacity:0.6;"><div style="font-size:2rem;margin-bottom:12px;">&#8987;</div>Sincronizando con Supabase...</div></div>';

    var clients = await DB.getClientsFromSupabase();
    
    // Obtenemos conteos de reservas en paralelo para optimizar
    var clientsWithBookings = await Promise.all(clients.map(async function(c) {
      var allBks = await DB.getBookingsFromSupabase(c.id);
      c.reservas_activas = allBks.filter(function(b){ return b.estado === 'reservado'; }).length;
      return c;
    }));

    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128101; Gestion de Clientes</h1><p>' + clients.length + ' clientes registrados en la nube</p></div></div>'
      + '<div class="table-container"><table class="data-table"><thead><tr><th>Cliente</th><th>Email</th><th>Telefono</th><th>Creditos Actuales</th><th>Reservas</th><th>Modificar Creditos</th></tr></thead><tbody>';
    
    var tbody = container.querySelector('tbody');
    clientsWithBookings.forEach(function(c) {
      tbody.innerHTML += '<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="attendee-avatar" style="width:32px;height:32px;font-size:.7rem">' + getInitials(c.nombre) + '</div><strong>' + c.nombre + '</strong></div></td>'
        + '<td>' + c.email + '</td><td>' + (c.telefono||'-') + '</td>'
        + '<td><span class="badge badge-' + (c.creditos>0?'success':'warning') + '" id="badge-cred-' + c.id + '">' + c.creditos + ' creditos</span></td>'
        + '<td>' + c.reservas_activas + ' activas</td>'
        + '<td><div style="display:flex;align-items:center;gap:8px;">'
        + '<input type="number" id="input-amt-' + c.id + '" value="1" min="1" style="width:60px; height:32px; padding:4px 8px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary);">'
        + '<button class="btn btn-success btn-sm" data-action="add" data-uid="' + c.id + '">Sumar</button>'
        + '<button class="btn btn-danger btn-sm" data-action="sub" data-uid="' + c.id + '">Restar</button>'
        + '</div><div style="margin-top:8px; display:flex; gap:8px;">'
        + '<button class="btn btn-ghost btn-xs" data-quick="1" data-uid="' + c.id + '">+1 rapido</button>'
        + '<button class="btn btn-ghost btn-xs" data-quick="5" data-uid="' + c.id + '">+5 rapido</button>'
        + '</div></td></tr>';
    });
    container.innerHTML += '</tbody></table></div></div>';

    async function updateCredits(userId, amount, op) {
      // Buscamos el usuario fresco de la lista que ya tenemos
      var u = clients.find(function(x){ return x.id === userId; });
      if (!u) return;
      
      var current = u.creditos || 0;
      var newValue = op === 'add' ? current + amount : current - amount;

      if (newValue < 0) {
        Toast.show('error', 'Error', 'El cliente no puede tener créditos negativos');
        return;
      }

      var btn = document.querySelector('[data-uid="' + userId + '"][data-action="' + op + '"]');
      if (btn) { btn.disabled = true; btn.innerHTML = '...'; }

      await DB.updateUserInSupabase(u.id, {creditos: newValue});
      Toast.show('success', 'Créditos actualizados', u.nombre + ' ahora tiene ' + newValue + ' créditos');
      
      // Actualizar navbar si el admin se editó a si mismo (raro pero posible)
      Auth.refreshUser(); 
      if(window.Router && Router.refreshNavbar) Router.refreshNavbar();
      render();
    }

    document.querySelectorAll('[data-action]').forEach(function(btn){
      btn.onclick = function() {
        var uid = parseInt(btn.dataset.uid);
        var amt = parseInt(document.getElementById('input-amt-' + uid).value) || 0;
        if (amt <= 0) { Toast.show('warning', 'Atención', 'Ingresa una cantidad válida'); return; }
        updateCredits(uid, amt, btn.dataset.action);
      };
    });

    document.querySelectorAll('[data-quick]').forEach(function(btn){
      btn.onclick = function() {
        var uid = parseInt(btn.dataset.uid);
        var amt = parseInt(btn.dataset.quick);
        updateCredits(uid, amt, 'add');
      };
    });
  }
  render();
};

// --- ADMIN PAYMENTS (simplified) ---
Pages.adminPagos = function(container) {
  var pagos = DB.getPayments();
  var totalPagado = pagos.filter(function(p){return p.estado==='pagado';}).reduce(function(s,p){return s+p.monto;},0);
  var pendientes = pagos.filter(function(p){return p.estado==='pendiente';});

  container.innerHTML = '<div class="page-container">'
    + '<div class="page-header"><div><h1>&#128176; Pagos e Ingresos</h1><p>Resumen financiero del estudio</p></div></div>'
    + '<div class="metrics-grid">'
    + '<div class="metric-card mc-g"><div class="metric-icon">&#128178;</div><div class="metric-value">' + formatMoney(totalPagado) + '</div><div class="metric-label">Total cobrado</div></div>'
    + '<div class="metric-card mc-a"><div class="metric-icon">&#9203;</div><div class="metric-value">' + pendientes.length + '</div><div class="metric-label">Pagos pendientes</div></div>'
    + '<div class="metric-card mc-p"><div class="metric-icon">&#128179;</div><div class="metric-value">' + pagos.length + '</div><div class="metric-label">Total transacciones</div></div></div>';

  if (pagos.length === 0) {
    container.innerHTML += '<div class="empty-state"><div class="empty-icon">&#128176;</div><h3>Sin transacciones</h3><p>Los pagos apareceran cuando los clientes reserven sin creditos</p></div></div>';
    return;
  }
  var html = '<div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Cliente</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>';
  pagos.reverse().forEach(function(p) {
    var u = DB.getUser(p.usuario_id);
    var badge = p.estado==='pagado' ? '<span class="badge badge-success">Pagado</span>' : '<span class="badge badge-warning">Pendiente</span>';
    html += '<tr><td>#' + p.id + '</td><td>' + (u?u.nombre:'?') + '</td><td><strong>' + formatMoney(p.monto) + '</strong></td><td>' + badge + '</td><td>' + formatDateTime(p.created_at) + '</td></tr>';
  });
  container.innerHTML += html + '</tbody></table></div></div>';
};
