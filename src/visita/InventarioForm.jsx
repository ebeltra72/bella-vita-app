import { useState } from "react";
import { T, F } from "../theme";
import { CATALOGO, RUBRO_ICONOS } from "../constants";
import { API } from "../api";
import { hoy, rubroSemanaActual, semanaKey } from "../utils";
import { Btn } from "../ui";

// ─── COMPONENTE INVENTARIO ────────────────────────────────────────────────────
export default function InventarioForm({ visitaActual, inventariosExistentes }) {
  const rubroAsignado = rubroSemanaActual();
  const semana = semanaKey();

  // ¿Ya se hizo el control de este rubro esta semana en esta sucursal?
  const yaHecho = inventariosExistentes?.some(inv =>
    inv.sucursalId === visitaActual?.sucursalId &&
    inv.rubro === rubroAsignado &&
    inv.semanaKey === semana
  );

  const [cantidades, setCantidades] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const productos = CATALOGO[rubroAsignado] || [];

  const guardar = async () => {
    setGuardando(true);
    try {
      await API.saveInventario({
        id: Date.now(),
        visitaId: visitaActual?.id,
        sucursalId: visitaActual?.sucursalId,
        sucursalNombre: visitaActual?.sucursalNombre,
        fecha: hoy(),
        rubro: rubroAsignado,
        semanaKey: semana,
        productos: cantidades,
      });
      setGuardado(true);
    } catch (e) {
      console.error(e);
    }
    setGuardando(false);
  };

  if (guardado || yaHecho) return (
    <div style={{ background: T.sageBg, borderRadius: 14, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: T.sage, marginBottom: 4 }}>
        ✓ Control de {rubroAsignado} completado esta semana
      </div>
      <div style={{ fontSize: 12, color: T.muted }}>
        {guardado ? "Guardado recién" : "Ya lo hiciste en una visita anterior"}
      </div>
    </div>
  );

  return (
    <div>
      {/* Encabezado con rubro asignado */}
      <div style={{ background: T.activeSoft, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
          Rubro de esta semana
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{RUBRO_ICONOS[rubroAsignado]}</span>
          <span style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 700, color: T.primaryDeep }}>{rubroAsignado}</span>
        </div>
      </div>

      {productos.map(prod => (
        <div key={prod} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", borderBottom: `1px solid ${T.divider}`,
        }}>
          <span style={{ fontSize: 13, color: T.text, flex: 1, marginRight: 12 }}>{prod}</span>
          <input
            type="number" min="0" step="0.5" placeholder="0"
            value={cantidades[prod] || ""}
            onChange={e => {
              const val = e.target.value;
              if (val === "") {
                const next = { ...cantidades };
                delete next[prod];
                setCantidades(next);
              } else {
                setCantidades(c => ({ ...c, [prod]: val }));
              }
            }}
            style={{
              width: 70, padding: "6px 8px", borderRadius: 8,
              border: `1.5px solid ${cantidades[prod] ? T.primary : T.border}`,
              fontSize: 14, textAlign: "center", fontFamily: F.body,
              background: cantidades[prod] ? T.activeSoft : T.inputBg,
              color: T.text, outline: "none",
            }}
          />
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize:12, color:T.muted, marginTop:8, marginBottom:12 }}>
          Podés dejar en blanco los productos que no revisaste. Los que pongas en 0 también quedan registrados.
        </div>
        <Btn variant="primary" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : `Guardar inventario de ${rubroAsignado}`}
        </Btn>
      </div>
    </div>
  );
}
