// ============================================
// SigueFit - Database Layer (localStorage)
// ============================================
var DB = (function() {
  var STORAGE_KEY = 'siguefit_db';
  var data = null;

  function getDefaultData() {
    var today = new Date();
    var classes = [];
    var tipos = [
      {nombre:'Pilates Mat', tipo:'pilates', instructor:'Laura Gomez', duracion:60},
      {nombre:'Yoga Flow', tipo:'yoga', instructor:'Carolina Paz', duracion:75},
      {nombre:'Funcional', tipo:'funcional', instructor:'Martin Torres', duracion:45},
      {nombre:'Pilates Reformer', tipo:'pilates', instructor:'Laura Gomez', duracion:60},
      {nombre:'Stretching', tipo:'stretching', instructor:'Carolina Paz', duracion:45},
      {nombre:'HIIT Express', tipo:'funcional', instructor:'Martin Torres', duracion:30},
      {nombre:'Yoga Restaurativo', tipo:'yoga', instructor:'Ana Ruiz', duracion:90},
      {nombre:'Barre Fitness', tipo:'barre', instructor:'Sofia Mendez', duracion:50}
    ];
    var horarios = ['07:00','08:00','09:30','10:30','17:00','18:00','19:00','20:00'];
    var id = 1;
    for (var d = 0; d < 14; d++) {
      var fecha = new Date(today);
      fecha.setDate(today.getDate() + d);
      var dateStr = fecha.toISOString().split('T')[0];
      var dow = fecha.getDay();
      if (dow === 0) continue;
      var numClases = dow === 6 ? 3 : 5;
      for (var c = 0; c < numClases; c++) {
        var t = tipos[c % tipos.length];
        var cupo = 8 + Math.floor(Math.random() * 8);
        var ocupados = d < 3 ? Math.floor(Math.random() * (cupo - 1)) : 0;
        classes.push({
          id: id++, studio_id:1, nombre:t.nombre, tipo:t.tipo,
          instructor:t.instructor, fecha:dateStr, horario:horarios[c % horarios.length],
          duracion:t.duracion, cupo_total:cupo, cupo_disponible:cupo - ocupados,
          activa:1, created_at:new Date().toISOString()
        });
      }
    }
    return {
      usuarios: [
        {id:1,studio_id:1,nombre:'Admin Studio',email:'admin@siguefit.com',password:'admin123',telefono:'+5491155551234',rol:'admin',creditos:999,activo:1,created_at:new Date().toISOString()},
        {id:2,studio_id:1,nombre:'Maria Lopez',email:'maria@test.com',password:'123456',telefono:'+5491155552222',rol:'cliente',creditos:5,activo:1,created_at:new Date().toISOString()},
        {id:3,studio_id:1,nombre:'Juan Perez',email:'juan@test.com',password:'123456',telefono:'+5491155553333',rol:'cliente',creditos:2,activo:1,created_at:new Date().toISOString()},
        {id:4,studio_id:1,nombre:'Lucia Fernandez',email:'lucia@test.com',password:'123456',telefono:'+5491155554444',rol:'cliente',creditos:0,activo:1,created_at:new Date().toISOString()}
      ],
      clases: classes,
      reservas: [],
      pagos: [],
      mensajes: [],
      config: {studio_name:'SigueFit Studio', cancel_hours:12, class_price:2500, currency:'ARS'},
      nextIds: {usuarios:5, reservas:1, pagos:1, mensajes:1, clases:id}
    };
  }

  function load() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) { data = JSON.parse(stored); }
      else { data = getDefaultData(); save(); }
    } catch(e) { data = getDefaultData(); save(); }
    return data;
  }

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function reset() { data = getDefaultData(); save(); return data; }
  function getData() { if (!data) load(); return data; }

  // Auth
  function login(email, password) {
    var d = getData();
    return d.usuarios.find(function(u) { return u.email === email && u.password === password && u.activo; }) || null;
  }
  function register(nombre, email, password, telefono) {
    var d = getData();
    if (d.usuarios.find(function(u) { return u.email === email; })) return null;
    var user = {id:d.nextIds.usuarios++, studio_id:1, nombre:nombre, email:email, password:password, telefono:telefono||'', rol:'cliente', creditos:1, activo:1, created_at:new Date().toISOString()};
    d.usuarios.push(user); save(); return user;
  }
  function getUser(id) { return getData().usuarios.find(function(u){return u.id===id;}); }
  function updateUser(id, updates) {
    var d = getData(); var u = d.usuarios.find(function(u){return u.id===id;});
    if (u) { Object.assign(u, updates); save(); } return u;
  }
  function getClients() { return getData().usuarios.filter(function(u){return u.rol==='cliente';}); }

  // Classes
  function getClasses(fecha) {
    var d = getData();
    if (fecha) return d.clases.filter(function(c){return c.fecha===fecha && c.activa;});
    return d.clases.filter(function(c){return c.activa;});
  }
  function getClass(id) { return getData().clases.find(function(c){return c.id===id;}); }
  function addClass(cls) {
    var d = getData(); cls.id = d.nextIds.clases++; cls.studio_id = 1;
    cls.activa = 1; cls.created_at = new Date().toISOString();
    d.clases.push(cls); save(); return cls;
  }
  function updateClass(id, updates) {
    var d = getData(); var c = d.clases.find(function(c){return c.id===id;});
    if (c) { Object.assign(c, updates); save(); } return c;
  }
  function deleteClass(id) {
    var d = getData(); d.clases = d.clases.filter(function(c){return c.id!==id;});
    save();
  }
  function getClassDates() {
    var d = getData(); var dates = {};
    d.clases.filter(function(c){return c.activa;}).forEach(function(c){
      if(!dates[c.fecha]) dates[c.fecha]=0; dates[c.fecha]++;
    });
    return dates;
  }

  // Bookings
  function getBookings(userId) {
    var d = getData();
    if (userId) return d.reservas.filter(function(r){return r.usuario_id===userId;});
    return d.reservas;
  }
  function getBookingsByClass(classId) {
    return getData().reservas.filter(function(r){return r.clase_id===classId && r.estado==='reservado';});
  }
  function createBooking(userId, classId) {
    var d = getData();
    var cls = d.clases.find(function(c){return c.id===classId;});
    var user = d.usuarios.find(function(u){return u.id===userId;});
    if (!cls || !user) return {error:'Clase o usuario no encontrado'};
    if (cls.cupo_disponible <= 0) return {error:'No hay cupo disponible'};
    var existing = d.reservas.find(function(r){return r.usuario_id===userId && r.clase_id===classId && r.estado==='reservado';});
    if (existing) return {error:'Ya tienes reserva en esta clase'};
    var usedCredit = false; var payment = null;
    if (user.creditos > 0) { user.creditos--; usedCredit = true; }
    else {
      payment = {id:d.nextIds.pagos++, usuario_id:userId, reserva_id:null, monto:d.config.class_price,
        estado:'pendiente', metodo:'mercadopago', mp_preference_id:'MP-'+Date.now(),
        mp_payment_id:null, created_at:new Date().toISOString()};
    }
    var booking = {id:d.nextIds.reservas++, usuario_id:userId, clase_id:classId,
      estado:'reservado', credito_usado:usedCredit?1:0, created_at:new Date().toISOString()};
    d.reservas.push(booking); cls.cupo_disponible--;
    if (payment) { payment.reserva_id = booking.id; d.pagos.push(payment); }
    save();
    return {booking:booking, payment:payment, usedCredit:usedCredit};
  }
  function cancelBooking(bookingId) {
    var d = getData();
    var b = d.reservas.find(function(r){return r.id===bookingId;});
    if (!b || b.estado!=='reservado') return {error:'Reserva no encontrada'};
    b.estado = 'cancelado';
    var cls = d.clases.find(function(c){return c.id===b.clase_id;});
    if (cls) cls.cupo_disponible++;
    if (b.credito_usado) {
      var user = d.usuarios.find(function(u){return u.id===b.usuario_id;});
      if (user) user.creditos++;
    }
    save(); return {success:true};
  }

  // Payments
  function getPayments(userId) {
    var d = getData();
    if (userId) return d.pagos.filter(function(p){return p.usuario_id===userId;});
    return d.pagos;
  }
  function simulatePayment(paymentId) {
    var d = getData();
    var p = d.pagos.find(function(p){return p.id===paymentId;});
    if (!p) return {error:'Pago no encontrado'};
    p.estado = 'pagado'; p.mp_payment_id = 'PAY-'+Date.now();
    save(); return {success:true, payment:p};
  }

  // Messages
  function addMessage(userId, tipo, contenido) {
    var d = getData();
    var msg = {id:d.nextIds.mensajes++, usuario_id:userId, tipo:tipo, contenido:contenido,
      enviado:1, created_at:new Date().toISOString()};
    d.mensajes.push(msg); save(); return msg;
  }
  function getMessages(userId) {
    var d = getData();
    if (userId) return d.mensajes.filter(function(m){return m.usuario_id===userId;});
    return d.mensajes;
  }

  // Stats
  function getStats() {
    var d = getData(); var today = new Date().toISOString().split('T')[0];
    var clasesHoy = d.clases.filter(function(c){return c.fecha===today && c.activa;}).length;
    var reservasActivas = d.reservas.filter(function(r){return r.estado==='reservado';}).length;
    var pagosTotal = d.pagos.filter(function(p){return p.estado==='pagado';}).reduce(function(s,p){return s+p.monto;},0);
    var pagosPendientes = d.pagos.filter(function(p){return p.estado==='pendiente';}).length;
    var clientesActivos = d.usuarios.filter(function(u){return u.rol==='cliente' && u.activo;}).length;
    return {clasesHoy:clasesHoy, reservasActivas:reservasActivas, ingresosTotales:pagosTotal, pagosPendientes:pagosPendientes, clientesActivos:clientesActivos};
  }

  return {
    load:load, save:save, reset:reset, login:login, register:register, getUser:getUser,
    updateUser:updateUser, getClients:getClients, getClasses:getClasses, getClass:getClass,
    addClass:addClass, updateClass:updateClass, deleteClass:deleteClass, getClassDates:getClassDates,
    getBookings:getBookings, getBookingsByClass:getBookingsByClass, createBooking:createBooking,
    cancelBooking:cancelBooking, getPayments:getPayments, simulatePayment:simulatePayment,
    addMessage:addMessage, getMessages:getMessages, getStats:getStats, getData:getData
  };
})();
DB.load();
