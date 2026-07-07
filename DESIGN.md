# Design

Refleja lo que hay implementado (`src/styles/tokens.css` + `global.css`). Si cambias los tokens, actualiza esta ficha.

## Theme

Atlántico gallego de mañana cambiante. Luz fría y clara, granito y eucalipto, mar de ría.
**Tema claro único** (se usa de día, al aire libre, para decidir): fondo nítido y frío,
**nunca arena/cream** (ese tono cálido es el tic de IA que evitamos). La identidad la cargan
**mar** y **monte** —los dos polos de la decisión— y el **sol** solo como acento.

> Modo oscuro: **no implementado** (no hay `prefers-color-scheme` en el CSS). Es trabajo
> futuro; cuando se haga, debe ser una alternativa fiel, no un "look de herramienta".

## Color (OKLCH)

Estrategia: **committed** sobre dos polos semánticos. Mar = playa, verde = montaña, ámbar = sol/acento.
Todo color es un token en `tokens.css`; los componentes nunca llevan hex ni OKLCH suelto
(excepción acotada: los textos claros sobre el héroe del veredicto, ver `global.css`).

| Rol                     | Token              | Valor (claro)            |
| ----------------------- | ------------------ | ------------------------ |
| Fondo                   | `--bg`             | `oklch(0.984 0.005 225)` |
| Superficie              | `--surface`        | `oklch(1 0 0)`           |
| Panel                   | `--panel`          | `oklch(0.966 0.006 225)` |
| Texto                   | `--ink`            | `oklch(0.26 0.022 240)`  |
| Texto atenuado (≥4.5:1) | `--muted`          | `oklch(0.475 0.016 240)` |
| Borde                   | `--border`         | `oklch(0.91 0.006 235)`  |
| Mar / acento (playa)    | `--accent`/`--sea` | `oklch(0.53 0.1 215)`    |
| Montaña                 | `--mountain`       | `oklch(0.52 0.11 150)`   |
| Sol (acento)            | `--sun`            | `oklch(0.72 0.15 70)`    |

Escala de puntuación de los marcadores (rojo→ámbar→verde), interpolada en OKLCH en
`scoreColor` (`src/lib/ui/format.ts`), anclada al rango real de notas (≈35–72) y no a 0–100.
Anclas: `--score-bad oklch(0.58 0.16 25)`, `--score-mid oklch(0.72 0.14 70)`,
`--score-good oklch(0.6 0.13 150)`. El color nunca es el único portador: el veredicto se
nombra ("PRAIA"/"MONTAÑA").

## Typography

Eje de contraste serif + sans (no dos sans parecidas):

- **Display**: `Newsreader` (serif variable) para el veredicto y títulos. `letter-spacing` negativo, `text-wrap: balance`.
- **Cuerpo/UI**: `Hanken Grotesk` + `system-ui`.
- Sin gradient-text. Énfasis por peso y tamaño, no por degradado.

## Components

- **Veredicto (héroe)**: tarjeta con **tinte de fondo suave** del polo ganador (`--sea-wash`/`--mountain-wash`/`--sun-wash`) sobre un scrim, y el titular en Newsreader. **Sin franja lateral de color** (`border-left` de acento está prohibido). El "Hoxe mellor…" es una entradilla en minúscula, no un eyebrow en mayúsculas. Bajo el desglose puede aparecer, en su caso, el aviso de forecast no actualizado y la desventaja estacional de la playa (reglas legibles, no pesos ocultos).
- **Marcadores de mapa**: pastilla con el dato elegido (puntuación/agua/sol/viaje); color = puntuación. Base = estrella ámbar.
- **Controles de peso**: escala 1–5 con círculos numerados (`RatingControl`), navegable por teclado, con una ⓘ que explica cada factor. Los objetivos de ruta (km/desnivel) son sliders aparte (`RoutePrefs`), visibles solo cuando el modo incluye rutas.
- **Lista/fichas**: una sola capa. **Nada de tarjetas anidadas**: las estadísticas van en una fila limpia con divisores, no en cajitas dentro de la tarjeta.
- **Etiquetas**: minúscula natural, pequeñas y `--muted`. **Nada de mayúsculas con tracking** como scaffolding en cada sección.

## Layout & Motion

- Métricas: `--radius 14px`, `--gap 18px`, `--maxw 1200px`, radios redondeados y con aire (referencia outdoor).
- Rejillas responsive con `repeat(auto-fit, minmax(…))`.
- Escala de z-index semántica (`--z-sticky/-overlay/-marker`), sin 999.
- Motion intencional y discreto (`--ease-out`), con alternativa `prefers-reduced-motion` (respetada en `global.css`).

## Reglas duras heredadas de impeccable (no romper)

Sin fondo arena/cream · sin `border-left` de acento · sin eyebrows en mayúsculas tracked ·
sin tarjetas anidadas · sin gradient-text · contraste de cuerpo ≥ 4.5:1 · color por token OKLCH.
