// ============================================
// SigueFit - Admin Pages
// ============================================

// --- ADMIN DASHBOARD ---
Pages.admin = function(container) {
  var stats = DB.getStats();
  var config = DB.getData().config;
  container.innerHTML = '<div class="page-container">'
    + '<div class="page-header"><div><h1>&#128202; Panel de Administracion</h1><p>' + config.studio_name + '</p></div></div>'
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
  var selectedDate = '';
  var showModal = false;
  var editingClass = null;

  function render() {
    var clases = selectedDate ? DB.getClasses(selectedDate) : DB.getClasses();
    clases.sort(function(a,b){ return a.fecha===b.fecha ? a.horario.localeCompare(b.horario) : a.fecha.localeCompare(b.fecha); });

    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128197; Gestion de Clases</h1><p>Crear, editar y administrar clases</p></div>'
      + '<button class="btn btn-primary" id="new-class-btn">&#10010; Nueva Clase</button></div>'
      + '<div class="form-group" style="max-width:250px;margin-bottom:24px"><label class="form-label">Filtrar por fecha</label>'
      + '<input type="date" class="form-input" id="date-filter" value="' + selectedDate + '"></div>'
      + '<div class="table-container"><table class="data-table"><thead><tr><th>Fecha</th><th>Horario</th><th>Nombre</th><th>Tipo</th><th>Instructor</th><th>Cupo</th><th>Acciones</th></tr></thead><tbody>';
    if (clases.length === 0) {
      container.innerHTML += '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">No hay clases</td></tr>';
    }
    clases.forEach(function(c) {
      container.querySelector('tbody').innerHTML += '<tr><td>' + formatDate(c.fecha) + '</td><td><strong>' + c.horario + '</strong></td><td>' + c.nombre + '</td><td><span class="badge badge-primary">' + c.tipo + '</span></td><td>' + (c.instructor||'-') + '</td><td>' + (c.cupo_total-c.cupo_disponible) + '/' + c.cupo_total + '</td>'
        + '<td><button class="btn btn-ghost btn-sm" data-edit="' + c.id + '">&#9998;</button> <button class="btn btn-danger btn-sm" data-delete="' + c.id + '">&#128465;</button></td></tr>';
    });
    container.innerHTML += '</tbody></table></div></div>';

    document.getElementById('new-class-btn').onclick = function(){ openModal(null); };
    document.getElementById('date-filter').onchange = function(e){ selectedDate = e.target.value; render(); };
    document.querySelectorAll('[data-edit]').forEach(function(btn){
      btn.onclick = function(){ openModal(DB.getClass(parseInt(btn.dataset.edit))); };
    });
    document.querySelectorAll('[data-delete]').forEach(function(btn){
      btn.onclick = function(){
        if (confirm('Eliminar esta clase?')) {
          DB.deleteClass(parseInt(btn.dataset.delete));
          Toast.show('info','Clase eliminada','La clase fue removida del calendario');
          render();
        }
      };
    });
  }

  function openModal(cls) {
    editingClass = cls;
    var isEdit = !!cls;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'class-modal';
    overlay.innerHTML = '<div class="modal"><div class="modal-header"><h3 class="modal-title">' + (isEdit?'Editar':'Nueva') + ' Clase</h3><button class="modal-close" id="modal-close-btn">&times;</button></div>'
      + '<div class="modal-body"><form id="class-form">'
      + '<div class="form-group"><label class="form-label">Nombre</label><input class="form-input" id="cf-nombre" value="' + (cls?cls.nombre:'') + '" required placeholder="Ej: Pilates Mat"></div>'
      + '<div class="form-group"><label class="form-label">Tipo</label><select class="form-input" id="cf-tipo"><option value="pilates"' + (cls&&cls.tipo==='pilates'?' selected':'') + '>Pilates</option><option value="yoga"' + (cls&&cls.tipo==='yoga'?' selected':'') + '>Yoga</option><option value="funcional"' + (cls&&cls.tipo==='funcional'?' selected':'') + '>Funcional</option><option value="stretching"' + (cls&&cls.tipo==='stretching'?' selected':'') + '>Stretching</option><option value="barre"' + (cls&&cls.tipo==='barre'?' selected':'') + '>Barre</option></select></div>'
      + '<div class="form-group"><label class="form-label">Instructor</label><input class="form-input" id="cf-inst" value="' + (cls?cls.instructor:'') + '" placeholder="Nombre del instructor"></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + '<div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" id="cf-fecha" value="' + (cls?cls.fecha:new Date().toISOString().split('T')[0]) + '" required></div>'
      + '<div class="form-group"><label class="form-label">Horario</label><input type="time" class="form-input" id="cf-horario" value="' + (cls?cls.horario:'09:00') + '" required></div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + '<div class="form-group"><label class="form-label">Duracion (min)</label><input type="number" class="form-input" id="cf-duracion" value="' + (cls?cls.duracion:60) + '" min="15" max="180" required></div>'
      + '<div class="form-group"><label class="form-label">Cupo maximo</label><input type="number" class="form-input" id="cf-cupo" value="' + (cls?cls.cupo_total:10) + '" min="1" max="50" required></div></div>'
      + '<div class="modal-footer" style="padding:16px 0 0;border:none"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancelar</button><button type="submit" class="btn btn-primary">' + (isEdit?'Guardar':'Crear Clase') + '</button></div>'
      + '</form></div></div>';
    document.body.appendChild(overlay);

    document.getElementById('modal-close-btn').onclick = function(){ overlay.remove(); };
    document.getElementById('modal-cancel-btn').onclick = function(){ overlay.remove(); };
    overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

    document.getElementById('class-form').onsubmit = function(e) {
      e.preventDefault();
      var data = {
        nombre: document.getElementById('cf-nombre').value,
        tipo: document.getElementById('cf-tipo').value,
        instructor: document.getElementById('cf-inst').value,
        fecha: document.getElementById('cf-fecha').value,
        horario: document.getElementById('cf-horario').value,
        duracion: parseInt(document.getElementById('cf-duracion').value),
        cupo_total: parseInt(document.getElementById('cf-cupo').value)
      };
      if (isEdit) {
        var diff = data.cupo_total - cls.cupo_total;
        data.cupo_disponible = cls.cupo_disponible + diff;
        if (data.cupo_disponible < 0) data.cupo_disponible = 0;
        DB.updateClass(cls.id, data);
        Toast.show('success','Clase actualizada', data.nombre);
      } else {
        data.cupo_disponible = data.cupo_total;
        DB.addClass(data);
        Toast.show('success','Clase creada', data.nombre + ' el ' + formatDate(data.fecha));
      }
      overlay.remove();
      render();
    };
  }
  render();
};

// --- ADMIN CLIENTS ---
Pages.adminClientes = function(container) {
  function render() {
    var clients = DB.getClients();
    container.innerHTML = '<div class="page-container">'
      + '<div class="page-header"><div><h1>&#128101; Gestion de Clientes</h1><p>' + clients.length + ' clientes registrados</p></div></div>'
      + '<div class="table-container"><table class="data-table"><thead><tr><th>Cliente</th><th>Email</th><th>Telefono</th><th>Creditos</th><th>Reservas</th><th>Acciones</th></tr></thead><tbody>';
    clients.forEach(function(c) {
      var bks = DB.getBookings(c.id).filter(function(b){return b.estado==='reservado';}).length;
      container.querySelector('tbody').innerHTML += '<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="attendee-avatar" style="width:32px;height:32px;font-size:.7rem">' + getInitials(c.nombre) + '</div><strong>' + c.nombre + '</strong></div></td>'
        + '<td>' + c.email + '</td><td>' + (c.telefono||'-') + '</td>'
        + '<td><span class="badge badge-' + (c.creditos>0?'success':'warning') + '">' + c.creditos + ' creditos</span></td>'
        + '<td>' + bks + ' activas</td>'
        + '<td><button class="btn btn-success btn-sm" data-addcred="' + c.id + '">+1 Credito</button> <button class="btn btn-ghost btn-sm" data-addcred5="' + c.id + '">+5</button></td></tr>';
    });
    container.innerHTML += '</tbody></table></div></div>';

    document.querySelectorAll('[data-addcred]').forEach(function(btn){
      btn.onclick = function() {
        var u = DB.getUser(parseInt(btn.dataset.addcred));
        DB.updateUser(u.id, {creditos: u.creditos + 1});
        Toast.show('success','Credito agregado', u.nombre + ' ahora tiene ' + (u.creditos+1) + ' creditos');
        render();
      };
    });
    document.querySelectorAll('[data-addcred5]').forEach(function(btn){
      btn.onclick = function() {
        var u = DB.getUser(parseInt(btn.dataset.addcred5));
        DB.updateUser(u.id, {creditos: u.creditos + 5});
        Toast.show('success','5 Creditos agregados', u.nombre + ' ahora tiene ' + (u.creditos+5) + ' creditos');
        render();
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
