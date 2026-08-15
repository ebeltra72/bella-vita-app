// ─── API ─────────────────────────────────────────────────────────────────────
export const API = {
  async getVisitas() {
    const r = await fetch('/.netlify/functions/visitas');
    if (!r.ok) throw new Error('Error al cargar visitas');
    const rows = await r.json();
    return rows.map(v => ({
      id: v.id, sucursalId: v.sucursal_id, sucursalNombre: v.sucursal_nombre,
      checkin: v.checkin, checkout: v.checkout,
      latCheckin: v.lat_checkin, lngCheckin: v.lng_checkin,
      latCheckout: v.lat_checkout, lngCheckout: v.lng_checkout,
      distCheckin: v.dist_checkin, distCheckout: v.dist_checkout,
      gpsOkCheckin: v.gps_ok_checkin, gpsOkCheckout: v.gps_ok_checkout,
      simulado: v.simulado, respuestas: v.respuestas || {},
    }));
  },
  async saveVisita(v) {
    await fetch('/.netlify/functions/visitas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v),
    });
  },
  async uploadFoto({ data, visitaId, sucursal, tipo }) {
    const r = await fetch('/.netlify/functions/upload-foto', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, visitaId, sucursal, tipo }),
    });
    if (!r.ok) throw new Error('Error al subir foto');
    return r.json();
  },
  async getRegistros() {
    const r = await fetch('/.netlify/functions/registros');
    if (!r.ok) throw new Error('Error al cargar registros');
    const rows = await r.json();
    return rows.map(r => ({
      id: r.id, personaId: r.persona_id, personaNombre: r.persona_nombre,
      fecha: r.fecha?.slice(0, 10), mensajes: r.mensajes, turnos: r.turnos,
      senias: r.senias, nota: r.nota, editado: r.editado,
    }));
  },
  async saveRegistro(r) {
    await fetch('/.netlify/functions/registros', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r),
    });
  },
  async getInventarios(sucursalId) {
    const url = sucursalId ? `/.netlify/functions/inventarios?sucursal_id=${sucursalId}` : '/.netlify/functions/inventarios';
    const r = await fetch(url);
    if (!r.ok) throw new Error('Error al cargar inventarios');
    return r.json();
  },
  async saveInventario(inv) {
    await fetch('/.netlify/functions/inventarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inv),
    });
  },
};
