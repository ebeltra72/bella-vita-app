import { useState } from "react";
import { T, F } from "../theme";
import { ROLES } from "../constants";
import { API } from "../api";
import { Btn, BtnSm, Card, Input, Label, Select } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PRESENCIA DE PERSONAL
//
// Segunda pantalla de la visita, antes de la encuesta: quiénes estaban hoy en
// esta sucursal. El personal rota entre las 7, así que no hay lista fija por
// sucursal — se muestra el plantel activo entero, agrupado por rol.
//
// Lo tildado NO se manda al toque: viaja con el check-out, igual que los
// pendientes nuevos y las resoluciones. Una visita abandonada a mitad no deja
// presencia suelta en la base.
//
// El alta de una persona nueva sí escribe en el momento: va contra `personal`,
// que existe independientemente de la visita, y es la única forma de tildar a
// alguien que todavía no está en la lista.
// ══════════════════════════════════════════════════════════════════════════════
export default function PresenciaPersonal({
  personal, cargando, presentes, setPresentes, confirmada, onConfirmar, onAgregada, onVolver,
}) {
  const [editando, setEditando] = useState(false);
  const [alta, setAlta] = useState(null);          // { nombre, rol }
  const [guardandoAlta, setGuardandoAlta] = useState(false);
  const [errorAlta, setErrorAlta] = useState(null);

  const marcada = (id) => presentes.includes(id);

  const toggle = (id) => setPresentes(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const toggleGrupo = (ids, todasMarcadas) => setPresentes(prev =>
    todasMarcadas ? prev.filter(x => !ids.includes(x)) : [...new Set([...prev, ...ids])]
  );

  // Sólo los roles que tienen gente: el CHECK acepta 'medica' pero el plantel
  // puede no tener ninguna cargada.
  const grupos = ROLES
    .map(rol => ({ rol, gente: personal.filter(p => p.rol === rol.id) }))
    .filter(g => g.gente.length > 0);

  const guardarAlta = async () => {
    const nombre = alta.nombre.trim();
    if (!nombre) { setErrorAlta("El nombre es obligatorio"); return; }
    setGuardandoAlta(true); setErrorAlta(null);
    try {
      const persona = await API.agregarPersona({ nombre, rol: alta.rol });
      if (persona) {
        onAgregada(persona);
        setPresentes(prev => prev.includes(persona.id) ? prev : [...prev, persona.id]);
      }
      setAlta(null);
    } catch (e) {
      setErrorAlta(e.message || "No se pudo agregar a la persona");
    } finally {
      setGuardandoAlta(false);
    }
  };

  // ─── CARGANDO ──────────────────────────────────────────────────────────────
  if (cargando) return (
    <Card style={{ textAlign:"center", padding:"36px 20px", color:T.muted }}>
      Cargando el plantel…
    </Card>
  );

  // ─── RESUMEN (ya confirmada) ───────────────────────────────────────────────
  if (confirmada && !editando) {
    const presentesPorRol = grupos
      .map(g => ({ ...g, gente: g.gente.filter(p => marcada(p.id)) }))
      .filter(g => g.gente.length > 0);

    return (
      <>
        <Card style={{ background:T.sageBg, border:`1px solid ${T.sage}44` }}>
          <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.sage, marginBottom:6 }}>
            ✓ Presencia registrada
          </div>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>
            {presentes.length === 0
              ? "No marcaste a nadie del plantel en esta visita."
              : `${presentes.length} ${presentes.length === 1 ? "persona" : "personas"} en esta visita. Se guarda con el check-out.`}
          </div>
        </Card>

        {presentesPorRol.map(({ rol, gente }) => (
          <Card key={rol.id}>
            <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>
              {rol.icono} {rol.label}
            </div>
            <div style={{ fontSize:14, color:T.text, lineHeight:1.7 }}>
              {gente.map(p => p.nombre).join(" · ")}
            </div>
          </Card>
        ))}

        <Btn onClick={onConfirmar}>Continuar a la encuesta →</Btn>
        <Btn variant="ghost" onClick={() => setEditando(true)} style={{ marginTop:8 }}>
          ✎ Editar presencia
        </Btn>
      </>
    );
  }

  // ─── PLANTEL VACÍO ─────────────────────────────────────────────────────────
  if (personal.length === 0) return (
    <>
      <Card style={{ textAlign:"center", padding:"32px 20px" }}>
        <div style={{ fontSize:34, marginBottom:10 }}>👥</div>
        <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep, marginBottom:6 }}>
          El plantel está vacío
        </div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
          No hay personal cargado. Podés seguir con la encuesta igual.
        </div>
      </Card>
      <Btn onClick={onConfirmar}>Continuar a la encuesta →</Btn>
      <Btn variant="ghost" onClick={onVolver} style={{ marginTop:8 }}>← Volver a pendientes</Btn>
    </>
  );

  // ─── CHECKLIST ─────────────────────────────────────────────────────────────
  return (
    <>
      <Card>
        <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep, marginBottom:4 }}>
          ¿Quiénes están hoy?
        </div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
          Marcá al personal que viste en la sucursal durante la visita.
        </div>
      </Card>

      {grupos.map(({ rol, gente }) => {
        const ids = gente.map(p => p.id);
        const marcadas = ids.filter(marcada).length;
        const todas = marcadas === ids.length;

        return (
          <Card key={rol.id}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.6px" }}>
                {rol.icono} {rol.label}
                {marcadas > 0 && <span style={{ color:T.primaryDeep }}> · {marcadas}</span>}
              </span>
              <BtnSm variant="ghost" onClick={() => toggleGrupo(ids, todas)}>
                {todas ? "Ninguna" : "Todas"}
              </BtnSm>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {gente.map(p => {
                const activa = marcada(p.id);
                return (
                  <button key={p.id} onClick={() => toggle(p.id)} style={{
                    display:"flex", alignItems:"center", gap:10, width:"100%", textAlign:"left",
                    padding:"11px 13px", borderRadius:12, cursor:"pointer",
                    border:`2px solid ${activa ? T.sage : T.border}`,
                    background:activa ? T.sageBg : T.inputBg,
                    fontFamily:F.body, fontSize:14, fontWeight:activa ? 700 : 500,
                    color:activa ? T.sage : T.text, transition:"all .12s",
                  }}>
                    <span style={{
                      width:20, height:20, borderRadius:6, flexShrink:0,
                      border:`2px solid ${activa ? T.sage : T.border}`,
                      background:activa ? T.sage : "transparent",
                      color:T.white, fontSize:13, lineHeight:"17px", textAlign:"center", fontWeight:700,
                    }}>{activa ? "✓" : ""}</span>
                    {p.nombre}
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* ─── ALTA DE PERSONA NUEVA ─────────────────────────────────────────── */}
      {alta ? (
        <Card>
          <div style={{ fontWeight:700, fontSize:14, color:T.primaryDeep, marginBottom:12 }}>
            Agregar al plantel
          </div>
          <Label>Nombre y apellido</Label>
          <Input
            value={alta.nombre}
            onChange={e => setAlta(a => ({ ...a, nombre: e.target.value }))}
            placeholder="Nombre completo"
          />
          <div style={{ marginTop:12 }}>
            <Label>Rol</Label>
            <Select value={alta.rol} onChange={e => setAlta(a => ({ ...a, rol: e.target.value }))}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.singular}</option>)}
            </Select>
          </div>
          {errorAlta && (
            <div style={{ fontSize:12, color:T.error, marginTop:10, lineHeight:1.5 }}>{errorAlta}</div>
          )}
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn disabled={guardandoAlta} onClick={guardarAlta} style={{ flex:2 }}>
              {guardandoAlta ? "Guardando…" : "Agregar y marcar presente"}
            </Btn>
            <Btn variant="ghost" onClick={() => { setAlta(null); setErrorAlta(null); }} style={{ flex:1 }}>
              Cancelar
            </Btn>
          </div>
        </Card>
      ) : (
        <Btn variant="ghost" onClick={() => setAlta({ nombre:"", rol:"operadora" })} style={{ marginBottom:12 }}>
          + Agregar a alguien que no está en la lista
        </Btn>
      )}

      {presentes.length > 0 ? (
        <Btn onClick={() => { setEditando(false); onConfirmar(); }}>
          Confirmar presencia · {presentes.length} {presentes.length === 1 ? "persona" : "personas"} →
        </Btn>
      ) : (
        <Btn variant="ghost" onClick={() => { setEditando(false); onConfirmar(); }}>
          Confirmar sin nadie presente →
        </Btn>
      )}

      <Btn variant="ghost" onClick={onVolver} style={{ marginTop:8 }}>
        ← Volver a pendientes
      </Btn>
    </>
  );
}
