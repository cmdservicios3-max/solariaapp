// ============================================
// SigueFit - Database Layer (localStorage)
// ============================================
var DB = (function() {
  var STORAGE_KEY = 'siguefit_db';
  var data = null;

  function getDefaultData() {
    return {
      usuarios: [
        {id: 1, studio_id: 1, nombre: 'Admin Studio', email: 'admin@siguefit.com', password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', telefono: '+5491155551234', rol: 'admin', creditos: 0, activo: 1, created_at: new Date().toISOString()}
      ],
      clases: [],
      reservas: [],
      pagos: [],
      mensajes: [],
      config: {studio_name: 'SOLARIA Estudio', cancel_hours: 12, class_price: 2500, currency: 'ARS'},
      nextIds: {usuarios: 2, reservas: 1, pagos: 1, mensajes: 1, clases: 1}
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
  function getUserByEmail(email) { return getData().usuarios.find(function(u){return u.email===email;}); }
  function validateUserForReset(email, tel) { 
    return getData().usuarios.find(function(u){
      // Normalizamos telefonos para evitar errores por espacios o signos +
      var cleanTel = function(t){ return t ? t.replace(/\D/g,'') : ''; };
      return u.email === email && cleanTel(u.telefono) === cleanTel(tel);
    }); 
  }
  function updateUser(id, updates) {
    var d = getData(); var u = d.usuarios.find(function(u){return u.id===id;});
    if (u) { Object.assign(u, updates); save(); } return u;
  }
  function getClients() { return getData().usuarios.filter(function(u){return u.rol==='cliente';}); }
  async function getClientsFromSupabase() {
    try {
      if (typeof supabaseClient === 'undefined') return [];
      var { data, error } = await supabaseClient.from('usuarios').select('*').eq('rol', 'cliente').order('nombre', { ascending: true });
      if (error) { console.error('Error al obtener clientes:', error.message); return []; }
      return data || [];
    } catch (err) { console.error(err); return []; }
  }

  // Classes
  async function getClassesFromSupabase(fecha) {
    try {
      if (typeof supabaseClient === 'undefined') {
        console.warn("Supabase client no definido globalmente.");
        return [];
      }
      // Retiramos el .eq('activa', 1) para traer todas y poder evaluar null/undefined
      var query = supabaseClient.from('clases').select('*');
      if (fecha) {
        query = query.eq('fecha', fecha);
      }
      var response = await query;
      if (response.error) {
        console.error("Error al obtener clases desde Supabase:", response.error.message);
        return [];
      }
      
      var data = response.data || [];
      // Solo excluye si estrictamente es === false (incluyendo así true, null, undefined)
      return data.filter(function(c) {
        return c.activa !== false;
      });
    } catch (err) {
      console.error("Excepción inesperada al consultar Supabase:", err);
      return [];
    }
  }

  async function getClassDatesFromSupabase() {
    try {
      if (typeof supabaseClient === 'undefined') return {};
      // Pedir solo las columnas clave ayuda a optimizar
      var { data, error } = await supabaseClient.from('clases').select('fecha, activa');
      if (error) { console.error('Error extrayendo fechas:', error.message); return {}; }
      
      var dates = {};
      var activas = (data || []).filter(function(c) { return c.activa !== false; });
      activas.forEach(function(c) {
        if (!dates[c.fecha]) dates[c.fecha] = 0;
        dates[c.fecha]++;
      });
      return dates;
    } catch (err) {
      console.error(err); return {};
    }
  }

  async function addClassToSupabase(cls) {
    try {
      if (typeof supabaseClient === 'undefined') return null;
      
      var clsPayload = Object.assign({}, cls);
      delete clsPayload.id;
      delete clsPayload.created_at;
      clsPayload.activa = true;

      var response = await supabaseClient.from('clases').insert([clsPayload]).select();
      if (response.error) { console.error('Error creando en Supabase:', response.error.message); return null; }
      return response.data && response.data[0] ? response.data[0] : null;
    } catch (err) { console.error(err); return null; }
  }

  async function addUserToSupabase(user) {
    try {
      if (typeof supabaseClient === 'undefined') return { error: 'Supabase no conectado' };
      
      // Hacemos una copia para no alterar la referencia en memoria
      var userPayload = Object.assign({}, user);
      
      // IMPORTANTE: Eliminamos el ID local para que Supabase genere el suyo propio (identity)
      // y asigne la secuencia correcta. También eliminamos created_at para que use el default de la DB.
      delete userPayload.id;
      delete userPayload.created_at;

      // Asegurar que el campo "activo" sea boolean en caso de que en localStorage esté como 1
      userPayload.activo = (userPayload.activo === 1 || userPayload.activo === true);

      var { data, error } = await supabaseClient.from('usuarios').insert([userPayload]).select();
      
      if (error) { 
        console.error('Error insertando usuario en Supabase:', error.message);
        return { error: error.message };
      }

      if (!data || data.length === 0) {
        return { error: 'No se recibió confirmación de la base de datos' };
      }

      return { success: true, data: data[0] };
    } catch (err) {
      console.error(err);
      return { error: 'Excepción inesperada al sincronizar usuario: ' + err.message };
    }
  }

  async function updateClassInSupabase(id, updates) {
    try {
      if (typeof supabaseClient === 'undefined') return null;
      var response = await supabaseClient.from('clases').update(updates).eq('id', id).select();
      if (response.error) { console.error('Error actualizando en Supabase:', response.error.message); return null; }
      return response.data && response.data[0] ? response.data[0] : null;
    } catch (err) { console.error(err); return null; }
  }

  async function updateUserInSupabase(id, updates) {
    try {
      if (typeof supabaseClient === 'undefined') return null;
      var response = await supabaseClient.from('usuarios').update(updates).eq('id', id).select();
      if (response.error) { 
        console.error('Error actualizando usuario en Supabase:', response.error.message); 
        return null; 
      }
      // Actualizamos localmente para asegurar el estado híbrido
      var localUser = updateUser(id, updates);
      return response.data && response.data[0] ? response.data[0] : localUser;
    } catch (err) { console.error(err); return null; }
  }

  async function deleteClassFromSupabase(id) {
    try {
      if (typeof supabaseClient === 'undefined') return false;
      var response = await supabaseClient.from('clases').delete().eq('id', id);
      if (response.error) { console.error('Error eliminando en Supabase:', response.error.message); return false; }
      return true;
    } catch (err) { console.error(err); return false; }
  }

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
  function cancelBooking(bookingId, isLate) {
    var d = getData();
    var b = d.reservas.find(function(r){return r.id===bookingId;});
    if (!b || b.estado!=='reservado') return {error:'Reserva no encontrada'};
    b.estado = 'cancelado';
    var cls = d.clases.find(function(c){return c.id===b.clase_id;});
    if (cls) cls.cupo_disponible++;
    if (b.credito_usado && !isLate) {
      var user = d.usuarios.find(function(u){return u.id===b.usuario_id;});
      if (user) user.creditos++;
    }
    save(); return {success:true};
  }

  // Bookings in Supabase
  async function createBookingInSupabase(userId, classId) {
    try {
      if (typeof supabaseClient === 'undefined') return { error: 'Supabase no está conectado' };

      // 1. Obtener clase y validar cupo en DB
      var { data: cls, error: clsError } = await supabaseClient.from('clases').select('*').eq('id', classId).single();
      if (clsError || !cls) return { error: 'Clase no encontrada en el sistema' };
      if (cls.cupo_disponible <= 0) return { error: 'No hay cupo disponible' };

      // 2. Obtener usuario de Supabase y chequear si tiene crédito
      var { data: userDb, error: usrError } = await supabaseClient.from('usuarios').select('*').eq('id', userId).single();
      if (usrError || !userDb) return { error: 'Usuario no encontrado en el servidor' };
      if (userDb.creditos <= 0) return { error: 'No tienes créditos suficientes (los pagos se migrarán pronto)' };

      // Nuevo: Validación Vencimiento
      if (userDb.fecha_vencimiento) {
        var today = new Date();
        var venc = new Date(userDb.fecha_vencimiento);
        if (today > venc) {
          return { error: 'Tus créditos están vencidos. Contactá al estudio para renovar.' };
        }
      }
      // 3. Verificar si la reserva ya existe
      var { data: existing, error: extError } = await supabaseClient.from('reservas')
        .select('*').eq('usuario_id', userId).eq('clase_id', classId).eq('estado', 'reservado');
      if (extError) return { error: 'Error verificando reservas activas' };
      if (existing && existing.length > 0) return { error: 'Ya tienes una reserva activa en esta clase' };

      // 4. Insertar reserva en la nube
      var newBooking = {
        usuario_id: userId,
        clase_id: classId,
        estado: 'reservado',
        credito_usado: 1
      };
      
      var { data: bookingData, error: insertError } = await supabaseClient.from('reservas').insert([newBooking]).select();
      if (insertError) return { error: 'Error procesando tu reserva en la nube' };
      
      var finalBooking = bookingData[0];

      // 5. Consolidar el descuento: actualizar en supabase clases y usuarios
      await supabaseClient.from('clases').update({ cupo_disponible: cls.cupo_disponible - 1 }).eq('id', classId);
      await supabaseClient.from('usuarios').update({ creditos: userDb.creditos - 1 }).eq('id', userId);

      // 6. ¡Sincronizar localStorage! Mantenemos compatibilidad con el resto de la app
      var d = getData();
      var localCls = d.clases.find(function(c){return c.id===classId;});
      var localUser = d.usuarios.find(function(u){return u.id===userId;});
      if (localCls) localCls.cupo_disponible--;
      if (localUser) localUser.creditos--;
      
      var syncBk = {
        id: finalBooking.id, // Forzamos coincidencia de IDs
        usuario_id: userId,
        clase_id: classId,
        estado: 'reservado',
        credito_usado: 1,
        created_at: finalBooking.created_at
      };
      d.reservas.push(syncBk);
      save();

      return { success: true, booking: finalBooking };
    } catch (err) {
      console.error(err);
      return { error: 'Ocurrió un error inesperado. Intenta de nuevo' };
    }
  }

  async function cancelBookingInSupabase(bookingId) {
    try {
      if (typeof supabaseClient === 'undefined') return { error: 'Supabase desconectado' };

      // 1. Validar la reserva en Supabase
      var { data: booking, error: bkError } = await supabaseClient.from('reservas').select('*').eq('id', bookingId).single();
      if (bkError || !booking) {
        return { error: 'No pudimos encontrar la reserva en el servidor' };
      }
      if (booking.estado !== 'reservado') return { error: 'La reserva ya figura como cancelada' };

      // 2. Transición de estado en BD
      var { error: updateBkError } = await supabaseClient.from('reservas').update({ estado: 'cancelado' }).eq('id', bookingId);
      if (updateBkError) return { error: 'Fallo central al cancelar tu reserva' };

      // 3 y 4. Reactivar cupo y créditos
      var { data: cls } = await supabaseClient.from('clases').select('fecha, horario, cupo_disponible').eq('id', booking.clase_id).single();
      var isLate = false;
      if (cls) {
        await supabaseClient.from('clases').update({ cupo_disponible: cls.cupo_disponible + 1 }).eq('id', booking.clase_id);
        var classDate = new Date(cls.fecha + 'T' + (cls.horario || '00:00') + ':00');
        var now = new Date();
        var hoursDiff = (classDate - now) / (1000 * 60 * 60);
        isLate = hoursDiff < 3;
      }
      
      if (booking.credito_usado === 1 && !isLate) {
        var { data: dbUser } = await supabaseClient.from('usuarios').select('creditos').eq('id', booking.usuario_id).single();
        if (dbUser) {
          await supabaseClient.from('usuarios').update({ creditos: dbUser.creditos + 1 }).eq('id', booking.usuario_id);
        }
      }

      // 5. ¡Sincronizar localStorage! (Para pantallas no migradas y el estado base)
      cancelBooking(bookingId, isLate); // Llamamos al método nativo con el ID homologado
      return { success: true, isLate: isLate };
    } catch (err) {
      console.error(err);
      return { error: 'Error del sistema en Supabase.' };
    }
  }

  async function getBookingsFromSupabase(userId) {
    try {
      if (typeof supabaseClient === 'undefined') return [];
      
      // Pedimos las reservas y le indicamos que haga un Join automático a la tabla "clases"
      // Traemos todo el historial para poder separarlo en frontend si se desea
      var { data, error } = await supabaseClient
        .from('reservas')
        .select('*, clases(*)')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener mis reservas:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error(err); return [];
    }
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

  // Stats (Local fallback)
  function getStats() {
    var d = getData(); var today = new Date().toISOString().split('T')[0];
    var clasesHoy = d.clases.filter(function(c){return c.fecha===today && c.activa;}).length;
    var reservasActivas = d.reservas.filter(function(r){return r.estado==='reservado';}).length;
    var pagosTotal = d.pagos.filter(function(p){return p.estado==='pagado';}).reduce(function(s,p){return s+p.monto;},0);
    var pagosPendientes = d.pagos.filter(function(p){return p.estado==='pendiente';}).length;
    var clientesActivos = d.usuarios.filter(function(u){return u.rol==='cliente' && u.activo;}).length;
    return {clasesHoy:clasesHoy, reservasActivas:reservasActivas, ingresosTotales:pagosTotal, pagosPendientes:pagosPendientes, clientesActivos:clientesActivos};
  }

  async function getAdminStatsFromSupabase() {
    try {
      if (typeof supabaseClient === 'undefined') return getStats();
      var today = new Date().toISOString().split('T')[0];
      
      var [clases, reservas, clientes] = await Promise.all([
        supabaseClient.from('clases').select('*', { count: 'exact', head: true }).eq('fecha', today).neq('activa', false),
        supabaseClient.from('reservas').select('*', { count: 'exact', head: true }).eq('estado', 'reservado'),
        supabaseClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'cliente').eq('activo', true)
      ]);

      return {
        clasesHoy: clases.count || 0,
        reservasActivas: reservas.count || 0,
        ingresosTotales: 0, // Migracion de pagos pendiente
        clientesActivos: clientes.count || 0
      };
    } catch (e) {
      console.error("Error al obtener estadisticas de Supabase:", e);
      return getStats();
    }
  }

  async function getRecentBookingsFromSupabase() {
    try {
      if (typeof supabaseClient === 'undefined') return [];
      var { data, error } = await supabaseClient
        .from('reservas')
        .select('*, usuarios(nombre), clases(nombre, fecha, horario)')
        .eq('estado', 'reservado')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) { console.error('Error al obtener actividad reciente:', error.message); return []; }
      return data || [];
    } catch (e) { console.error(e); return []; }
  }

  // Recurrencias
  async function getRecurrenciasFromSupabase(userId) {
    try {
      if (typeof supabaseClient === 'undefined') return [];
      var { data, error } = await supabaseClient
        .from('recurrencias')
        .select('*, clases(nombre, horario)')
        .eq('usuario_id', userId)
        .order('dia_semanal', { ascending: true });
      if (error) { console.error('Error al obtener recurrencias:', error.message); return []; }
      return data || [];
    } catch (e) { console.error(e); return []; }
  }

  async function addRecurrenciaToSupabase(rec) {
    try {
      if (typeof supabaseClient === 'undefined') return null;
      var { data, error } = await supabaseClient.from('recurrencias').insert([rec]).select();
      if (error) { console.error('Error creando recurrencia:', error.message); return null; }
      return data && data[0] ? data[0] : null;
    } catch (e) { console.error(e); return null; }
  }

  async function deleteRecurrenciaFromSupabase(id) {
    try {
      if (typeof supabaseClient === 'undefined') return false;
      var { error } = await supabaseClient.from('recurrencias').delete().eq('id', id);
      if (error) { console.error('Error eliminando recurrencia:', error.message); return false; }
      return true;
    } catch (e) { console.error(e); return false; }
  }

  async function generarReservasRecurrencia(usuarioId, semanas) {
    if (typeof semanas === 'undefined') semanas = 2; // default 2
    if (typeof supabaseClient === 'undefined') return { success: false, error: 'Sin conexion', count: 0 };
    try {
      var recs = await getRecurrenciasFromSupabase(usuarioId);
      if (!recs || recs.length === 0) return { success: true, count: 0 };

      var today = new Date();
      var maxDate = new Date();
      maxDate.setDate(today.getDate() + (semanas * 7));

      var todayStr = today.toISOString().split('T')[0];
      var maxDateStr = maxDate.toISOString().split('T')[0];

      var { data: futureClasses, error: clsErr } = await supabaseClient
        .from('clases')
        .select('*')
        .gte('fecha', todayStr)
        .lte('fecha', maxDateStr)
        .eq('activa', true);

      if (clsErr) {
        console.error("Error clases futuras:", clsErr);
        return { success: false, error: clsErr.message, count: 0 };
      }
      
      var createdCount = 0;

      for (var i=0; i<recs.length; i++) {
        var r = recs[i];
        if (!r.activa || !r.clases) continue; 

        var rNombre = r.clases.nombre;
        var rHorario = r.clases.horario;

        var matches = futureClasses.filter(function(c) {
          if (!c.fecha) return false;
          var cDate = new Date(c.fecha + 'T12:00:00');
          return c.nombre === rNombre && c.horario === rHorario && cDate.getDay() === r.dia_semanal;
        });

        for (var j=0; j<matches.length; j++) {
          var matchClass = matches[j];
          var res = await createBookingInSupabase(usuarioId, matchClass.id);
          if (res && res.success) {
            createdCount++;
          }
        }
      }
      return { success: true, count: createdCount };
    } catch(err) {
      console.error(err);
      return { success: false, error: err.message, count: 0 };
    }
  }

  async function cancelFutureBookingsInSupabase(userId, baseClassId) {
    if (typeof supabaseClient === 'undefined') return { success: false, error: 'Sin conexion', count: 0 };
    try {
      var { data: baseCls, error: bErr } = await supabaseClient.from('clases').select('*').eq('id', baseClassId).single();
      if (bErr || !baseCls) return { success: false, error: 'Clase base no encontrada', count: 0 };

      var todayStr = new Date().toISOString().split('T')[0];
      
      var { data: userBookings, error: ubErr } = await supabaseClient
        .from('reservas')
        .select('*, clases(*)')
        .eq('usuario_id', userId)
        .eq('estado', 'reservado');
        
      if (ubErr || !userBookings) return { success: false, error: 'Error leyendo reservas', count: 0 };
      
      var bDia = new Date(baseCls.fecha + 'T12:00:00').getDay();
      var bNombre = baseCls.nombre;
      var bHorario = baseCls.horario;

      var toCancel = [];
      userBookings.forEach(function(b) {
        if (!b.clases) return;
        var c = b.clases;
        if (c.fecha >= todayStr) {
          var cDia = new Date(c.fecha + 'T12:00:00').getDay();
          if (c.nombre === bNombre && c.horario === bHorario && cDia === bDia) {
            toCancel.push(b.id);
          }
        }
      });

      if (toCancel.length === 0) return { success: true, count: 0 };

      var canceledCount = 0;
      for (var i=0; i<toCancel.length; i++) {
        var res = await cancelBookingInSupabase(toCancel[i]);
        if (res && res.success) canceledCount++;
      }

      return { success: true, count: canceledCount };
    } catch (e) {
      console.error(e); return { success: false, error: e.message, count: 0 };
    }
  }

  // Plans & Payments (Supabase)
  async function getPlansFromSupabase() {
    try {
      if (typeof supabaseClient === 'undefined') return [];
      var { data, error } = await supabaseClient.from('planes').select('*').eq('activo', true).order('precio', { ascending: true });
      if (error) { console.error('Error al obtener planes:', error.message); return []; }
      return data || [];
    } catch (err) { console.error(err); return []; }
  }

  async function createPaymentInSupabase(userId, planId) {
    try {
      if (typeof supabaseClient === 'undefined') return { error: 'Supabase no conectado' };
      var { data, error } = await supabaseClient.from('pagos').insert([{
        user_id: userId,
        plan_id: planId,
        estado: 'pendiente'
      }]).select();
      if (error) { console.error('Error creando pago:', error.message); return { error: error.message }; }
      return { success: true, pago: data[0] };
    } catch (err) { console.error(err); return { error: 'Error inesperado' }; }
  }

  async function getPendingPaymentsFromSupabase() {
    try {
      if (typeof supabaseClient === 'undefined') return [];
      var { data, error } = await supabaseClient
        .from('pagos')
        .select('*, usuarios:user_id(id, nombre, email, creditos), planes:plan_id(id, nombre, creditos, precio)')
        .order('created_at', { ascending: false });
      if (error) { console.error('Error al obtener pagos:', error.message); return []; }
      return data || [];
    } catch (err) { console.error(err); return []; }
  }

  async function approvePaymentInSupabase(paymentId) {
    try {
      if (typeof supabaseClient === 'undefined') return { error: 'Supabase no conectado' };

      // 1. Get payment with plan and user info
      var { data: pago, error: pErr } = await supabaseClient
        .from('pagos')
        .select('*, planes:plan_id(creditos), usuarios:user_id(id, creditos)')
        .eq('id', paymentId)
        .single();
      if (pErr || !pago) return { error: 'Pago no encontrado' };
      if (pago.estado !== 'pendiente') return { error: 'Este pago ya fue procesado' };

      // 2. Update payment status
      var { error: uErr } = await supabaseClient.from('pagos').update({ estado: 'aprobado' }).eq('id', paymentId);
      if (uErr) return { error: 'Error al actualizar pago' };

      // 3. Add credits to user
      var creditosDelPlan = pago.planes ? pago.planes.creditos : 0;
      var creditosActuales = pago.usuarios ? pago.usuarios.creditos : 0;
      var userId = pago.usuarios ? pago.usuarios.id : pago.user_id;
      
      await supabaseClient.from('usuarios').update({ 
        creditos: creditosActuales + creditosDelPlan 
      }).eq('id', userId);

      // 4. Log credit movement
      await supabaseClient.from('movimientos_creditos').insert([{
        user_id: userId,
        tipo: 'alta',
        cantidad: creditosDelPlan,
        descripcion: 'Compra de plan',
        pago_id: paymentId
      }]);

      return { success: true, creditos: creditosDelPlan };
    } catch (err) { console.error(err); return { error: 'Error inesperado al aprobar' }; }
  }

  async function rejectPaymentInSupabase(paymentId) {
    try {
      if (typeof supabaseClient === 'undefined') return { error: 'Supabase no conectado' };
      var { error } = await supabaseClient.from('pagos').update({ estado: 'rechazado' }).eq('id', paymentId);
      if (error) return { error: 'Error al rechazar pago' };
      return { success: true };
    } catch (err) { console.error(err); return { error: 'Error inesperado' }; }
  }

  async function getUserPaymentsFromSupabase(userId) {
    try {
      if (typeof supabaseClient === 'undefined') return [];
      var { data, error } = await supabaseClient
        .from('pagos')
        .select('*, planes:plan_id(nombre, creditos, precio)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error al obtener pagos del usuario:', error.message); return []; }
      return data || [];
    } catch (err) { console.error(err); return []; }
  }
  async function getCreditMovementsFromSupabase() {
    try {
      if (typeof supabaseClient === 'undefined') return [];
      var { data, error } = await supabaseClient
        .from('movimientos_creditos')
        .select('*, usuarios:user_id(nombre)')
        .order('created_at', { ascending: false });
      if (error) { console.error('Error al obtener movimientos:', error.message); return []; }
      return data || [];
    } catch (err) { console.error(err); return []; }
  }

  return {
    load:load, save:save, reset:reset, login:login, register:register, getUser:getUser, getUserByEmail:getUserByEmail, validateUserForReset:validateUserForReset, addUserToSupabase:addUserToSupabase,
    updateUser:updateUser, updateUserInSupabase:updateUserInSupabase, getClients:getClients, getClientsFromSupabase:getClientsFromSupabase, getClasses:getClasses, getClassesFromSupabase:getClassesFromSupabase, getClassDatesFromSupabase:getClassDatesFromSupabase, getClass:getClass,
    addClass:addClass, addClassToSupabase:addClassToSupabase, updateClass:updateClass, updateClassInSupabase:updateClassInSupabase, deleteClass:deleteClass, deleteClassFromSupabase:deleteClassFromSupabase, getClassDates:getClassDates,
    getBookings:getBookings, getBookingsByClass:getBookingsByClass, getBookingsFromSupabase:getBookingsFromSupabase, createBooking:createBooking, createBookingInSupabase:createBookingInSupabase,
    cancelBooking:cancelBooking, cancelBookingInSupabase:cancelBookingInSupabase, getPayments:getPayments, simulatePayment:simulatePayment,
    addMessage:addMessage, getMessages:getMessages, getStats:getStats, getAdminStatsFromSupabase:getAdminStatsFromSupabase, getRecentBookingsFromSupabase:getRecentBookingsFromSupabase, getData:getData,
    getRecurrenciasFromSupabase:getRecurrenciasFromSupabase, addRecurrenciaToSupabase:addRecurrenciaToSupabase, deleteRecurrenciaFromSupabase:deleteRecurrenciaFromSupabase, generarReservasRecurrencia:generarReservasRecurrencia,
    cancelFutureBookingsInSupabase:cancelFutureBookingsInSupabase,
    getPlansFromSupabase:getPlansFromSupabase, createPaymentInSupabase:createPaymentInSupabase, getPendingPaymentsFromSupabase:getPendingPaymentsFromSupabase,
    approvePaymentInSupabase:approvePaymentInSupabase, rejectPaymentInSupabase:rejectPaymentInSupabase, getUserPaymentsFromSupabase:getUserPaymentsFromSupabase,
    getCreditMovementsFromSupabase:getCreditMovementsFromSupabase
  };
})();
DB.load();
