// Las 7 sucursales, espejo de SUCURSALES_INIT en src/constants.js.
//
// ⚠ Duplicación consciente, y la única del proyecto. Las sucursales viven en
// localStorage (bv_sucursales) y no en Neon, así que el cliente las tiene y el
// servidor no. Para la app eso nunca fue problema: el cruce contra visitas y
// pendientes pasa en el navegador, que es donde está la lista.
//
// El cron rompe esa suposición. Corre sin navegador, y la alerta que tiene que
// producir —"esta sucursal no se visita hace 15 días"— es justo la que no se
// puede derivar de la base: un GROUP BY sobre visitas no devuelve la fila de una
// sucursal que nunca fue visitada, que es el caso más grave de todos.
//
// Deuda anotada: mover sucursales a una tabla y que las dos puntas lean de ahí.
// Mientras tanto, si se agrega una sucursal desde el panel hay que agregarla acá
// también, o el mail no la va a mirar nunca.
export const SUCURSALES = [
  { id: 1, nombre: 'Caballito' },
  { id: 2, nombre: 'Belgrano' },
  { id: 3, nombre: 'Palermo' },
  { id: 4, nombre: 'Olivos' },
  { id: 5, nombre: 'Urquiza' },
  { id: 6, nombre: 'Ramos Mejía' },
  { id: 7, nombre: 'San Fernando' },
];
