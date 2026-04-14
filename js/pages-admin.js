// ============================================
// SigueFit - Admin Pages
// ============================================

// --- ADMIN DASHBOARD ---
Pages.admin = async function(container) {
  var today = new Date().toISOString().split('T')[0];
  
  try {
    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128202; Panel de Administracion</h1><p>Sincronizando con Supabase...</p></div></div>'
      + '<div id="admin-loading" style="text-align:center;padding:100px 0;opacity:0.5;"><div style="font-size:3rem;margin-bottom:20px;">&#8987;</div>Obteniendo datos de la nube...</div>'
      + '</div>';

    var [stats, todayClasses, recentBks] = await Promise.all([
      DB.getAdminStatsFromSupabase(),
      DB.getClassesFromSupabase(today),
      DB.getRecentBookingsFromSupabase()
    ]);

    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128202; Panel de Administracion</h1><p>SOLARIA Estudio</p></div></div>'
      + '<div class="metrics-grid">'
      + '<div class="metric-card mc-p"><div class="metric-icon">&#128197;</div><div class="metric-value">' + stats.clasesHoy + '</div><div class="metric-label">Clases hoy</div></div>'
      + '<div class="metric-card mc-s"><div class="metric-icon">&#128196;</div><div class="metric-value">' + stats.reservasActivas + '</div><div class="metric-label">Reservas activas</div></div>'
      + '<div class="metric-card mc-g"><div class="metric-icon">&#128176;</div><div class="metric-value">' + formatMoney(stats.ingresosTotales) + '</div><div class="metric-label">Ingresos totales</div></div>'
      + '<div class="metric-card mc-a"><div class="metric-icon">&#128101;</div><div class="metric-value">' + stats.clientesActivos + '</div><div class="metric-label">Clientes activos</div></div>'
      + '</div>'
      + buildTodayClassesTable(todayClasses)
      + buildRecentBookingsTable(recentBks)
      + '</div>';
  } catch (err) {
    console.error("Fallo crítico en el dashboard admin:", err);
    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><h1>&#9888; Error de Conexión</h1></div>'
      + '<div class="card" style="text-align:center;padding:40px;">'
      + '<p>No pudimos cargar los datos desde Supabase en este momento.</p>'
      + '<button class="btn btn-primary" onclick="location.reload()">Reintentar Cargar</button>'
      + '</div></div>';
  }
};

function buildTodayClassesTable(cls) {
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

function buildRecentBookingsTable(bks) {
  var html = '<div class="section-header" style="margin-top:32px"><h2 class="section-title">&#128196; Ultimas Reservas</h2></div>';
  if (bks.length === 0) return html + '<div class="card"><p class="text-muted">No hay actividad reciente en la nube</p></div>';
  html += '<div class="table-container"><table class="data-table"><thead><tr><th>Cliente</th><th>Clase</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>';
  bks.forEach(function(b) {
    var u = b.usuarios;
    var c = b.clases;
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
      + '</form>'
      + (isEdit ? '<div style="border-top:1px solid var(--border-color);padding:var(--space-lg)">'
      + '<h4 style="font-family:var(--font-serif);font-weight:500;margin-bottom:12px">&#128203; Inscriptos</h4>'
      + '<div id="modal-inscriptos" style="max-height:200px;overflow-y:auto">'
      + '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.875rem">&#8987; Cargando inscriptos...</div>'
      + '</div></div>' : '')
      + '</div></div>';
    document.body.appendChild(overlay);

    document.getElementById('modal-close-btn').onclick = function(){ overlay.remove(); };
    document.getElementById('modal-cancel-btn').onclick = function(){ overlay.remove(); };
    overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

    // Fetch inscriptos for existing classes
    if (isEdit && typeof supabaseClient !== 'undefined') {
      (async function() {
        try {
          var { data: reservas, error } = await supabaseClient
            .from('reservas')
            .select('*, usuarios(nombre)')
            .eq('clase_id', editingClass.id);
          
          var container = document.getElementById('modal-inscriptos');
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
          var container = document.getElementById('modal-inscriptos');
          if (container) container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.875rem">No se pudieron cargar los inscriptos</div>';
        }
      })();
    }

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

// --- ADMIN PAYMENTS (Supabase) ---
Pages.adminPagos = function(container) {
  async function render() {
    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128176; Gestión de Pagos</h1><p>Cargando desde Supabase...</p></div></div>'
      + '<div style="text-align:center;padding:40px;opacity:0.6"><div style="font-size:2rem;margin-bottom:12px">&#8987;</div>Sincronizando pagos...</div></div>';

    var pagos = await DB.getPendingPaymentsFromSupabase();
    var pendientes = pagos.filter(function(p){ return p.estado === 'pendiente'; });
    var procesados = pagos.filter(function(p){ return p.estado !== 'pendiente'; });

    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128176; Gestión de Pagos</h1><p>' + pagos.length + ' pagos registrados</p></div></div>'
      + '<div class="metrics-grid">'
      + '<div class="metric-card mc-a"><div class="metric-icon">&#9203;</div><div class="metric-value">' + pendientes.length + '</div><div class="metric-label">Pendientes</div></div>'
      + '<div class="metric-card mc-g"><div class="metric-icon">&#10003;</div><div class="metric-value">' + pagos.filter(function(p){return p.estado==='aprobado';}).length + '</div><div class="metric-label">Aprobados</div></div>'
      + '<div class="metric-card mc-p"><div class="metric-icon">&#10007;</div><div class="metric-value">' + pagos.filter(function(p){return p.estado==='rechazado';}).length + '</div><div class="metric-label">Rechazados</div></div>'
      + '</div>';

    // Pending payments
    if (pendientes.length > 0) {
      container.innerHTML += '<div class="section-header"><h2 class="section-title">&#9203; Pendientes de Aprobación</h2></div>'
        + '<div class="table-container"><table class="data-table"><thead><tr><th>Cliente</th><th>Plan</th><th>Créditos</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody id="pending-tbody"></tbody></table></div>';
      
      var tbody = document.getElementById('pending-tbody');
      pendientes.forEach(function(p) {
        var uNombre = p.usuarios ? p.usuarios.nombre : 'Usuario #' + p.user_id;
        var planNombre = p.planes ? p.planes.nombre : 'Plan #' + p.plan_id;
        var planCreditos = p.planes ? p.planes.creditos : '?';
        var fecha = new Date(p.created_at);
        var fechaStr = fecha.getDate() + '/' + (fecha.getMonth()+1) + '/' + fecha.getFullYear();
        
        tbody.innerHTML += '<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="attendee-avatar" style="width:28px;height:28px;font-size:.65rem">' + getInitials(uNombre) + '</div>' + uNombre + '</div></td>'
          + '<td>' + planNombre + '</td>'
          + '<td><span class="badge badge-info">' + planCreditos + ' créditos</span></td>'
          + '<td>' + fechaStr + '</td>'
          + '<td><div style="display:flex;gap:8px">'
          + '<button class="btn btn-success btn-sm" data-approve="' + p.id + '">&#10003; Aprobar</button>'
          + '<button class="btn btn-danger btn-sm" data-reject="' + p.id + '">&#10007; Rechazar</button>'
          + '</div></td></tr>';
      });
    } else {
      container.innerHTML += '<div class="card" style="text-align:center;padding:32px;color:var(--text-secondary)">&#10003; No hay pagos pendientes</div>';
    }

    // Processed payments
    if (procesados.length > 0) {
      container.innerHTML += '<div class="section-header" style="margin-top:32px"><h2 class="section-title">&#128203; Historial</h2></div>'
        + '<div class="table-container"><table class="data-table"><thead><tr><th>Cliente</th><th>Plan</th><th>Fecha</th><th>Estado</th></tr></thead><tbody id="history-tbody"></tbody></table></div>';
      
      var histTbody = document.getElementById('history-tbody');
      procesados.forEach(function(p) {
        var uNombre = p.usuarios ? p.usuarios.nombre : 'Usuario #' + p.user_id;
        var planNombre = p.planes ? p.planes.nombre : 'Plan #' + p.plan_id;
        var fecha = new Date(p.created_at);
        var fechaStr = fecha.getDate() + '/' + (fecha.getMonth()+1) + '/' + fecha.getFullYear();
        var badgeClass = p.estado === 'aprobado' ? 'badge-success' : 'badge-danger';
        var badgeText = p.estado === 'aprobado' ? 'Aprobado' : 'Rechazado';
        
        histTbody.innerHTML += '<tr><td>' + uNombre + '</td><td>' + planNombre + '</td><td>' + fechaStr + '</td><td><span class="badge ' + badgeClass + '">' + badgeText + '</span></td></tr>';
      });
    }

    container.innerHTML += '</div>';

    // Bind approve/reject buttons
    document.querySelectorAll('[data-approve]').forEach(function(btn) {
      btn.onclick = async function() {
        btn.disabled = true; btn.innerHTML = '...';
        var result = await DB.approvePaymentInSupabase(parseInt(btn.dataset.approve));
        if (result.error) {
          Toast.show('error', 'Error', result.error);
          btn.disabled = false; btn.innerHTML = '&#10003; Aprobar';
          return;
        }
        Toast.show('success', 'Pago aprobado', result.creditos + ' créditos acreditados al cliente');
        render();
      };
    });

    document.querySelectorAll('[data-reject]').forEach(function(btn) {
      btn.onclick = async function() {
        btn.disabled = true; btn.innerHTML = '...';
        var result = await DB.rejectPaymentInSupabase(parseInt(btn.dataset.reject));
        if (result.error) {
          Toast.show('error', 'Error', result.error);
          btn.disabled = false; btn.innerHTML = '&#10007; Rechazar';
          return;
        }
        Toast.show('info', 'Pago rechazado', 'El pago fue marcado como rechazado');
        render();
      };
    });
  }
  render();
};

// --- ADMIN CREDIT MOVEMENTS ---
Pages.adminCreditos = function(container) {
  async function render() {
    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#11088; Historial de Créditos</h1><p>Cargando movimientos...</p></div></div>'
      + '<div style="text-align:center;padding:40px;opacity:0.6"><div style="font-size:2rem;margin-bottom:12px">&#8987;</div>Sincronizando...</div></div>';

    var movimientos = await DB.getCreditMovementsFromSupabase();

    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#11088; Historial de Créditos</h1><p>' + movimientos.length + ' movimientos registrados</p></div></div>';

    if (movimientos.length === 0) {
      container.innerHTML += '<div class="card" style="text-align:center;padding:32px;color:var(--text-secondary)">No hay movimientos de créditos aún</div></div>';
      return;
    }

    container.innerHTML += '<div class="table-container"><table class="data-table"><thead><tr>'
      + '<th>Usuario</th><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Descripción</th>'
      + '</tr></thead><tbody id="mov-tbody"></tbody></table></div></div>';

    var tbody = document.getElementById('mov-tbody');
    movimientos.forEach(function(m) {
      var nombre = (m.usuarios && m.usuarios.nombre) ? m.usuarios.nombre : 'Usuario #' + m.user_id;
      var fecha = new Date(m.created_at);
      var fechaStr = fecha.getDate() + '/' + (fecha.getMonth()+1) + '/' + fecha.getFullYear() + ' ' + String(fecha.getHours()).padStart(2,'0') + ':' + String(fecha.getMinutes()).padStart(2,'0');
      
      var tipoBadge = m.tipo === 'alta' ? 'badge-success' : m.tipo === 'uso' ? 'badge-danger' : 'badge-info';
      var tipoText = m.tipo === 'alta' ? 'Alta' : m.tipo === 'uso' ? 'Uso' : 'Ajuste';
      
      var isPositive = m.cantidad > 0;
      var cantColor = isPositive ? 'var(--success)' : 'var(--danger)';
      var cantText = (isPositive ? '+' : '') + m.cantidad;

      tbody.innerHTML += '<tr>'
        + '<td><div style="display:flex;align-items:center;gap:8px"><div class="attendee-avatar" style="width:28px;height:28px;font-size:.65rem">' + getInitials(nombre) + '</div>' + nombre + '</div></td>'
        + '<td style="font-size:.8rem;color:var(--text-secondary)">' + fechaStr + '</td>'
        + '<td><span class="badge ' + tipoBadge + '">' + tipoText + '</span></td>'
        + '<td><strong style="color:' + cantColor + '">' + cantText + '</strong></td>'
        + '<td style="font-size:.85rem;color:var(--text-secondary)">' + (m.descripcion || '-') + '</td>'
        + '</tr>';
    });
  }
  render();
};
