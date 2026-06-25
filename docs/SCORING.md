# SCORING.md — motor de recomendación

Explicable y configurable (PAIR): cada destino expone su desglose y los pesos son sliders del usuario. Implementado en `src/lib/core/scoring.ts` (núcleo genérico), `src/lib/beaches/` y `src/lib/routes/` (factores), `src/lib/verdict/` (veredicto).

## Puntuación de un destino

`score = Σ(peso_i · factor_i) / Σpesos`, factores normalizados a `[0,1]`, resultado `0..100`. Añadir o quitar factores no rompe la escala (los pesos se normalizan).

### Factores de PLAYA (`src/lib/beaches/index.ts`)

| Factor         | Peso def. | Cálculo (0..1)                                                                    |
| -------------- | --------- | --------------------------------------------------------------------------------- |
| `clima`        | 0.30      | `0.4·temp(16–26) + 0.25·(1−lluvia%) + 0.2·(1−nubes) + 0.15·(1−viento)`            |
| `cercania`     | 0.20      | `1 − min(viajeMin / maxViajeMin, 1)`                                              |
| `solEfectivo`  | 0.20      | minutos de sol de tarde (mediodía solar → puesta efectiva) ÷ mejor del set        |
| `tempAgua`     | 0.10      | banda `linear(14–21 °C)` (>=21 ideal)                                             |
| `masificacion` | 0.10      | proxy de espacio: `linear(longitud 100–1500 m)`; sin dato, neutro. **Estimación** |
| `servicios`    | 0.05      | `linear(chiringuitos 0–4)`                                                        |

Filtros DUROS (excluyen del ranking, no puntúan): `viajeMin > maxViajeMin`; si `requierePmr`, la playa debe tener rampa o silla anfibia.

### Factores de RUTA (`src/lib/routes/index.ts`)

| Factor          | Peso def. | Cálculo (0..1)                                                     |
| --------------- | --------- | ------------------------------------------------------------------ |
| `clima`         | 0.30      | confort templado (ideal ~16 °C) + lluvia con más peso que en playa |
| `cercania`      | 0.20      | igual que playa                                                    |
| `dificultadFit` | 0.20      | cercanía de (km, desnivel) a la preferencia del usuario            |
| `circular`      | 0.10      | 1 si circular, 0 si lineal                                         |

## Veredicto del día (`src/lib/verdict/index.ts`)

Se deriva del ranking, no se inventa aparte:

```
mejor_playa = top de playas que pasan filtros
mejor_ruta  = top de rutas que pasan filtros
modo solo_playa → PLAYA ; modo solo_ruta → MONTAÑA
modo auto:
  margen = (mejor_playa.score − handicapEstacional) − mejor_ruta.score
  |margen| < 8  → "ambas"
  si no         → el de mayor score
```

**Gate estacional** (regla legible, no peso oculto): la playa parte con desventaja en invierno o con agua fría.
`handicap = (dic–feb: +8 | mar,nov: +4) + (agua <15 °C: +10 | <17 °C: +5)`.

## Por qué scoring ponderado y no un modelo entrenado

No hay datos de entrenamiento (producto nuevo, uso personal) y la transparencia ES el producto: depurable, explicable, ajustable con sliders. Si hubiera uso real, los pesos elegidos por usuarios serían la semilla para aprender.
