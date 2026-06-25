# Design

## Theme

Atlántico gallego de mañana cambiante. Luz fría y clara, granito y eucalipto, mar de ría.
Tema claro por defecto (se usa de día, al aire libre, para decidir); modo oscuro como
alternativa fiel, no como "look de herramienta". La identidad la cargan **mar** y **monte**
—los dos polos de la decisión— y el **sol** solo como acento. El fondo es nítido y frío,
**nunca arena/cream** (ese tono cálido es el tic de IA que evitamos).

## Color (OKLCH)

Estrategia: **committed** sobre dos polos semánticos. Mar = playa, verde = montaña, ámbar = sol/acento.

| Rol                    | Claro                                             | Oscuro                          |
| ---------------------- | ------------------------------------------------- | ------------------------------- |
| `--bg`                 | `oklch(0.985 0.004 230)` (blanco frío, casi puro) | `oklch(0.18 0.012 240)` granito |
| `--surface`            | `oklch(1 0 0)`                                    | `oklch(0.225 0.014 240)`        |
| `--surface-2`          | `oklch(0.965 0.006 230)`                          | `oklch(0.27 0.016 240)`         |
| `--ink` (texto)        | `oklch(0.24 0.02 235)`                            | `oklch(0.95 0.005 230)`         |
| `--muted`              | `oklch(0.46 0.018 235)` (≥4.5:1)                  | `oklch(0.72 0.012 235)`         |
| `--border`             | `oklch(0.90 0.008 235)`                           | `oklch(0.32 0.014 240)`         |
| `--sea` (playa)        | `oklch(0.50 0.105 226)`                           | `oklch(0.72 0.11 226)`          |
| `--mountain` (montaña) | `oklch(0.50 0.10 150)`                            | `oklch(0.72 0.10 150)`          |
| `--sun` (acento)       | `oklch(0.74 0.162 68)` (semilla impeccable)       | `oklch(0.80 0.15 68)`           |

Escala de puntuación de marcadores (rojo→ámbar→verde), interpolada en OKLCH en `scoreColor`.
El color nunca es el único portador: el veredicto se nombra ("PRAIA"/"MONTAÑA").

## Typography

Eje de contraste serif + sans (no dos sans parecidas):

- **Display**: `Fraunces` (variable serif, con carácter) para el veredicto y títulos. `letter-spacing` ≥ −0.03em, `text-wrap: balance`.
- **Cuerpo/UI**: `Inter` + `system-ui`. Cuerpo ≤ 70ch.
- Sin gradient-text. Énfasis por peso y tamaño, no por degradado.

## Components

- **Veredicto (héroe)**: tarjeta con **tinte de fondo suave** del polo ganador (mar/monte/sol) y un icono guía. **Sin franja lateral de color** (`border-left` de acento está prohibido). Titular en Fraunces. El "Hoxe mellor…" es una entradilla en minúscula, no un eyebrow en mayúsculas.
- **Marcadores de mapa**: pastilla con el dato elegido (puntuación/agua/sol/viaje); color = puntuación. Base = estrella ámbar.
- **Lista/fichas**: una sola capa. **Nada de tarjetas anidadas**: las estadísticas de la ficha van en una fila limpia con divisores, no en cajitas dentro de la tarjeta.
- **Etiquetas**: minúscula natural, pequeñas y `--muted`. **Nada de mayúsculas con tracking** como scaffolding en cada sección.

## Layout & Motion

- Ritmo de espaciado variable; rejillas responsive con `repeat(auto-fit, minmax(…))`.
- Escala de z-index semántica, sin 999.
- Motion intencional y discreto (ease-out), con alternativa `prefers-reduced-motion`.

## Reglas duras heredadas de impeccable (no romper)

Sin fondo arena/cream · sin `border-left` de acento · sin eyebrows en mayúsculas tracked ·
sin tarjetas anidadas · sin gradient-text · contraste de cuerpo ≥ 4.5:1 · OKLCH.
