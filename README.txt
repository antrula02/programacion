# Portal 86 — web + reservas reales (SQLite)

## Sobre Stranger Things
No es posible incluir imágenes oficiales ni la marca "Stranger Things" sin licencia.
Este proyecto usa un look original de terror sobrenatural ochentero.

## Requisitos
- Node.js 18+ y npm

## Arrancar
1) Descomprime
2) En terminal dentro de la carpeta:
   npm install
   npm start
3) Abre: http://localhost:3000

## Reservas (cómo funciona)
- El calendario consulta disponibilidad real:
  GET /api/availability?month=YYYY-MM
- Al confirmar:
  POST /api/book
- Se guarda en SQLite: server/reservas.sqlite
- La hora pasa a ROJO (ocupada) automáticamente.

## Cambiar horarios o días cerrados
Edita: server/config.json
- closedWeekdays: 0=Dom ... 6=Sáb (por defecto cerrado lunes=1)
- times: lista de horarios
