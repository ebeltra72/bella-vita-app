import { T, F } from "../theme";
import { ENCUESTA_V2, CAMPOS, TOTAL_PREGUNTAS } from "../encuesta/schema";
import { Badge, Card, Label } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – ENCUESTA (solo lectura)
//
// La encuesta dejó de ser editable desde la app: las 18 preguntas viven en
// src/encuesta/schema.js porque tienen secciones, lógica condicional y campos
// obligatorios que no se pueden expresar con un alta libre de preguntas.
// Esta pantalla existe para ver exactamente qué se le pregunta a Adrián.
// ══════════════════════════════════════════════════════════════════════════════
export default function EncuestaPanel() {
  return (
    <div style={{ padding:"18px 16px" }}>
      <Card>
        <div style={{ fontFamily:F.serif, fontSize:21, fontWeight:700, color:T.primaryDeep, marginBottom:6 }}>
          Encuesta de visita
        </div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>
          {TOTAL_PREGUNTAS} preguntas en {ENCUESTA_V2.length} secciones. Cuando una
          respuesta marca un problema, la app abre campos adicionales y ofrece
          crear un pendiente.
        </div>
        <div style={{ background:T.activeSoft, borderRadius:12, padding:"12px 14px", marginTop:14 }}>
          <div style={{ fontSize:12, color:T.primaryDeep, lineHeight:1.6 }}>
            Esta encuesta es fija y no se edita desde la app. Para cambiar una
            pregunta, agregar otra o mover una sección, hay que tocar el archivo{" "}
            <code style={{ background:T.white, padding:"1px 5px", borderRadius:4, fontSize:11 }}>
              src/encuesta/schema.js
            </code>.
          </div>
        </div>
      </Card>

      {ENCUESTA_V2.map((seccion, si) => (
        <Card key={seccion.id} style={{ padding:0, overflow:"hidden" }}>
          <div style={{
            padding:"13px 16px", background:T.cardSoft,
            display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>{seccion.icono}</span>
              <span style={{ fontFamily:F.serif, fontSize:17, fontWeight:700, color:T.primaryDeep }}>
                {seccion.titulo}
              </span>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:T.muted }}>
              {seccion.preguntas.length} {seccion.preguntas.length === 1 ? "pregunta" : "preguntas"}
            </span>
          </div>

          <div style={{ padding:"4px 16px 14px" }}>
            {seccion.preguntas.map((p, i) => {
              // Cuál es la respuesta que dispara los campos extra
              const invertida = p.negativa.includes("Sí");

              return (
                <div key={p.id} style={{ paddingTop:14, marginTop:10, borderTop:`1px solid ${T.divider}` }}>
                  <div style={{ display:"flex", gap:7, marginBottom:8 }}>
                    <span style={{ fontSize:11, color:T.muted2, fontWeight:700, minWidth:16, paddingTop:2 }}>
                      {si + 1}.{i + 1}
                    </span>
                    <span style={{ fontSize:14, color:T.text, lineHeight:1.5, flex:1 }}>{p.texto}</span>
                  </div>

                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8, paddingLeft:23 }}>
                    {p.opciones.map(op => (
                      <span key={op} style={{
                        padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
                        border:`1px solid ${p.negativa.includes(op) ? T.error : T.border}`,
                        background: p.negativa.includes(op) ? T.errorBg : T.inputBg,
                        color: p.negativa.includes(op) ? T.error : T.muted,
                      }}>{op}</span>
                    ))}
                  </div>

                  <div style={{ paddingLeft:23 }}>
                    {invertida && (
                      <div style={{ marginBottom:6 }}>
                        <Badge color="amber">Pregunta invertida · el hallazgo es el "Sí"</Badge>
                      </div>
                    )}
                    <div style={{ fontSize:11, color:T.muted, lineHeight:1.6 }}>
                      Si responde <strong style={{ color:T.error }}>{p.negativa.join(" o ")}</strong> se abren:{" "}
                      {p.extra.map((clave, k) => {
                        const campo = CAMPOS[clave];
                        const req = (p.requerido || []).includes(clave);
                        return (
                          <span key={clave}>
                            {k > 0 && ", "}
                            <span style={{ color: req ? T.text : T.muted, fontWeight: req ? 600 : 400 }}>
                              {campo?.label || clave}{req ? " *" : ""}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card>
        <Label>Referencias</Label>
        <div style={{ fontSize:12, color:T.muted, lineHeight:1.8 }}>
          <div><span style={{ color:T.error, fontWeight:700 }}>Rojo</span> · la opción que se considera un hallazgo</div>
          <div><strong style={{ color:T.text }}>Negrita *</strong> · campo obligatorio para poder describir el hallazgo</div>
          <div>Los pendientes creados desde cada sección heredan su categoría</div>
        </div>
      </Card>
    </div>
  );
}
