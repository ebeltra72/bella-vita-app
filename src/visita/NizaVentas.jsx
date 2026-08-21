import { useState } from "react";
import { T, F } from "../theme";
import { RUBRO_NIZA, RUBRO_ICONOS } from "../constants";
import { Btn, Card } from "../ui";

// Mismo criterio que el CHECK de la tabla: entero, de 0 para arriba. Devuelve
// null para lo ilegible, que NO es lo mismo que cero.
export const parseUnidades = (valor) => {
  if (valor === null || valor === undefined) return null;
  const txt = String(valor).trim();
  if (txt === "" || !/^[0-9]+$/.test(txt)) return null;
  return Number(txt);
};

// Las ventas cargadas, listas para mandar. Los campos en blanco no viajan; los
// ceros explícitos sí, porque "revisé y no vendí" es un dato.
export function ventasParaGuardar(ventas = {}) {
  return Object.entries(ventas)
    .map(([producto, valor]) => ({ producto, unidades: parseUnidades(valor) }))
    .filter(v => v.unidades !== null);
}

// ══════════════════════════════════════════════════════════════════════════════
// VENTAS NIZA
//
// Anteúltimo paso de la visita, después del inventario. Niza Científica es un
// laboratorio que Bella Vita revende, así que acá no se cuenta lo que hay sino
// lo que se vendió desde la visita anterior.
//
// El paso es opcional: si Adrián no carga nada, sigue derecho al cierre. No
// todas las sucursales tienen la línea, y una visita no puede quedar trabada por
// esto.
//
// Lo cargado NO se manda al toque: viaja con el check-out, igual que la
// presencia y los pendientes nuevos. Una visita abandonada a mitad no deja
// ventas sueltas en la base.
// ══════════════════════════════════════════════════════════════════════════════
export default function NizaVentas({
  productos, ventas, setVentas, confirmada, onConfirmar, onOmitir, onVolver,
}) {
  const [editando, setEditando] = useState(false);

  const cargadas = ventasParaGuardar(ventas);
  const totalUnidades = cargadas.reduce((a, v) => a + v.unidades, 0);
  const conVenta = cargadas.filter(v => v.unidades > 0);
  const invalidos = Object.entries(ventas)
    .filter(([, v]) => String(v ?? "").trim() !== "" && parseUnidades(v) === null)
    .map(([p]) => p);

  const escribir = (producto, valor) => setVentas(prev => {
    const next = { ...prev };
    if (String(valor).trim() === "") delete next[producto];
    else next[producto] = valor;
    return next;
  });

  const Cabecera = () => (
    <div style={{ background:T.activeSoft, borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
      <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>
        Venta de reventa
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:22 }}>{RUBRO_ICONOS[RUBRO_NIZA] || "🧴"}</span>
        <span style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep }}>{RUBRO_NIZA}</span>
      </div>
    </div>
  );

  // ─── CATÁLOGO VACÍO ────────────────────────────────────────────────────────
  // No es un error ni un estado de carga: la lista de la línea Niza todavía no
  // está cargada en constants.js. Se avisa y se sigue.
  if (productos.length === 0) return (
    <>
      <Card style={{ textAlign:"center", padding:"32px 20px" }}>
        <div style={{ fontSize:34, marginBottom:10 }}>🧴</div>
        <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep, marginBottom:6 }}>
          Sin catálogo Niza
        </div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
          Todavía no están cargados los productos de la línea. Seguí con el cierre.
        </div>
      </Card>
      <Btn onClick={onOmitir}>Continuar al cierre →</Btn>
      <Btn variant="ghost" onClick={onVolver} style={{ marginTop:8 }}>← Volver</Btn>
    </>
  );

  // ─── RESUMEN (ya confirmada) ───────────────────────────────────────────────
  if (confirmada && !editando) return (
    <>
      <Card style={{ background:T.sageBg, border:`1px solid ${T.sage}44` }}>
        <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.sage, marginBottom:6 }}>
          ✓ Ventas registradas
        </div>
        <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>
          {cargadas.length === 0
            ? "No cargaste ventas de Niza en esta visita."
            : `${totalUnidades} ${totalUnidades === 1 ? "unidad" : "unidades"} en ${conVenta.length} ${conVenta.length === 1 ? "producto" : "productos"}. Se guarda con el check-out.`}
        </div>
      </Card>

      {conVenta.length > 0 && (
        <Card>
          {conVenta.map(v => (
            <div key={v.producto} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center", gap:10,
              padding:"8px 0", borderBottom:`1px solid ${T.divider}`,
            }}>
              <span style={{ fontSize:13, color:T.text, minWidth:0 }}>{v.producto}</span>
              <span style={{ fontFamily:F.serif, fontSize:16, fontWeight:700, color:T.primaryDeep, flexShrink:0 }}>
                {v.unidades}
              </span>
            </div>
          ))}
        </Card>
      )}

      <Btn onClick={onConfirmar}>Continuar al cierre →</Btn>
      <Btn variant="ghost" onClick={() => setEditando(true)} style={{ marginTop:8 }}>
        ✎ Editar ventas
      </Btn>
    </>
  );

  // ─── CARGA ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Card>
        <Cabecera/>
        <div style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.primaryDeep, marginBottom:4 }}>
          ¿Cuántas unidades vendidas desde la última visita?
        </div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.5, marginBottom:14 }}>
          Dejá en blanco los productos que no revisaste. Los que pongas en 0 también
          quedan registrados.
        </div>

        {productos.map(prod => {
          const valor = ventas[prod] ?? "";
          const tocado = String(valor).trim() !== "";
          const invalido = invalidos.includes(prod);

          return (
            <div key={prod} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 0", borderBottom:`1px solid ${T.divider}`,
            }}>
              <span style={{ fontSize:13, color: invalido ? T.error : T.text, flex:1, marginRight:12 }}>
                {prod}
              </span>
              <input
                type="number" min="0" step="1" placeholder="—"
                value={valor}
                onChange={e => escribir(prod, e.target.value)}
                style={{
                  width:70, padding:"6px 8px", borderRadius:8,
                  border:`1.5px solid ${invalido ? T.error : tocado ? T.primary : T.border}`,
                  fontSize:14, textAlign:"center", fontFamily:F.body,
                  background: invalido ? T.errorBg : tocado ? T.activeSoft : T.inputBg,
                  color:T.text, outline:"none",
                }}
              />
            </div>
          );
        })}

        <div style={{ marginTop:16, fontSize:12, color:T.muted, lineHeight:1.5 }}>
          {invalidos.length > 0
            ? <span style={{ color:T.error, fontWeight:600 }}>Las unidades tienen que ser un número entero de 0 en adelante.</span>
            : cargadas.length > 0
              ? `${totalUnidades} ${totalUnidades === 1 ? "unidad" : "unidades"} en ${cargadas.length} ${cargadas.length === 1 ? "producto cargado" : "productos cargados"}.`
              : "Si esta sucursal no tiene la línea Niza, podés saltear el paso."}
        </div>
      </Card>

      <Btn
        disabled={invalidos.length > 0 || cargadas.length === 0}
        onClick={() => { setEditando(false); onConfirmar(); }}
      >
        Confirmar ventas →
      </Btn>

      {/* El paso es opcional a propósito: no todas las sucursales tienen la
          línea, y una visita no puede quedar trabada por esto. */}
      <Btn variant="ghost" onClick={onOmitir} style={{ marginTop:8 }}>
        Sin ventas de Niza · ir al cierre →
      </Btn>

      <Btn variant="ghost" onClick={onVolver} style={{ marginTop:8 }}>
        ← Volver al inventario
      </Btn>
    </>
  );
}
