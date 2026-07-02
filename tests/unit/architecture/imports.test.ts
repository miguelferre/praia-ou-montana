import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Hace EJECUTABLE la convención dura del proyecto (CLAUDE.md): `beaches/` y
 * `routes/` no se importan entre sí, y `core/` no depende de ninguna capa de
 * dominio ni de composición. Se verifica leyendo el código fuente, no ejecutándolo.
 */
/** Módulos importados por el código de `dir` (solo `import … from '…'` reales,
 *  ignorando los comentarios que mencionan otras capas en prosa). */
function importsOf(dir: string): string[] {
  const abs = resolve(process.cwd(), 'src', 'lib', dir);
  const src = readdirSync(abs)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(join(abs, f), 'utf-8'))
    .join('\n');
  return [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1] as string);
}

describe('arquitectura — beaches y routes son independientes', () => {
  it('beaches NO importa routes', () => {
    expect(importsOf('beaches').some((i) => i.includes('lib/routes'))).toBe(false);
  });

  it('routes NO importa beaches', () => {
    expect(importsOf('routes').some((i) => i.includes('lib/beaches'))).toBe(false);
  });

  it('beaches NO importa la capa de composición (planner/verdict)', () => {
    expect(importsOf('beaches').some((i) => /lib\/(planner|verdict)/.test(i))).toBe(false);
  });

  it('routes NO importa la capa de composición (planner/verdict)', () => {
    expect(importsOf('routes').some((i) => /lib\/(planner|verdict)/.test(i))).toBe(false);
  });
});

describe('arquitectura — core es puro (sin dominio ni composición)', () => {
  it('core NO importa beaches, routes, verdict ni planner', () => {
    expect(importsOf('core').some((i) => /lib\/(beaches|routes|verdict|planner)/.test(i))).toBe(
      false,
    );
  });
});
