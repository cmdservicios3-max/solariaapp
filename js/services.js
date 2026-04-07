// ============================================
// SigueFit - Services (WhatsApp + MercadoPago)
// ============================================
var WhatsApp = (function() {
  function send(userId, tipo, mensaje) {
    var user = DB.getUser(userId);
    if (!user) return;
    var phone = user.telefono || 'N/A';
    console.log('[WhatsApp] Enviando a ' + user.nombre + ' (' + phone + '): ' + mensaje);
    DB.addMessage(userId, tipo, mensaje);
    Toast.show('whatsapp', 'WhatsApp Enviado', 'A ' + user.nombre + ': ' + mensaje.substring(0,60) + '...');
  }
  function confirmarReserva(userId, clase) {
    var msg = 'Hola! Tu reserva para ' + clase.nombre + ' el ' + formatDate(clase.fecha) + ' a las ' + clase.horario + ' ha sido confirmada. Te esperamos!';
    send(userId, 'confirmacion', msg);
  }
  function recordatorio(userId, clase, horas) {
    var msg = 'Recordatorio: Tu clase de ' + clase.nombre + ' es en ' + horas + ' horas (' + clase.horario + '). No olvides traer tu mat!';
    send(userId, 'recordatorio', msg);
  }
  function mensajePersonalizado(userId, texto) { send(userId, 'custom', texto); }
  function enviarLinkPago(userId, clase, monto) {
    var msg = 'Hola! Para confirmar tu reserva en ' + clase.nombre + ', realiza el pago de $' + monto.toLocaleString() + ' ARS en el siguiente link: https://mpago.la/siguefit-' + Date.now();
    send(userId, 'pago', msg);
  }
  return {confirmarReserva:confirmarReserva, recordatorio:recordatorio, mensajePersonalizado:mensajePersonalizado, enviarLinkPago:enviarLinkPago, send:send};
})();

var MercadoPago = (function() {
  function crearPreferencia(booking, monto) {
    var prefId = 'PREF-' + Date.now() + '-' + Math.random().toString(36).substr(2,6);
    console.log('[MercadoPago] Preferencia creada: ' + prefId + ' por $' + monto);
    return {id: prefId, init_point:'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=' + prefId};
  }
  function simularPago(paymentId) {
    var result = DB.simulatePayment(paymentId);
    if (result.success) {
      console.log('[MercadoPago] Pago confirmado: ' + result.payment.mp_payment_id);
      Toast.show('success', 'Pago Confirmado', 'El pago #' + paymentId + ' fue procesado por MercadoPago');
    }
    return result;
  }
  return {crearPreferencia:crearPreferencia, simularPago:simularPago};
})();

// Helper
function formatDate(dateStr) {
  var d = new Date(dateStr + 'T12:00:00');
  var dias = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
  var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return dias[d.getDay()] + ' ' + d.getDate() + ' ' + meses[d.getMonth()];
}
function formatDateTime(isoStr) {
  var d = new Date(isoStr);
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
}
function formatMoney(amount) { return '$' + Number(amount).toLocaleString('es-AR'); }
function getInitials(name) { return name.split(' ').map(function(w){return w[0];}).join('').toUpperCase().substring(0,2); }
