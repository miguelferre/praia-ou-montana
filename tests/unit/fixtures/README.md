# Fixtures congeladas de tests

Datos reales recortados y **versionados aquí a propósito**, para que los tests unitarios
no dependan del catálogo vivo (`public/data/catalog/*.json`), que la ingesta regenera y
el bot commitea sin correr esta suite. Congelar el dato desacopla el test de lógica de la
regeneración de datos (auditoría F20 / T2).

## `horizon-beaches.json`

Dos playas reales de la ría de Muros con su perfil de horizonte PVGIS (48 puntos), usadas
por `tests/unit/core/effective-sunset.test.ts`. Regenerar si esas playas cambian:

```bash
python -c "
import json
playas = json.load(open('public/data/catalog/playas.json', encoding='utf-8'))
by_id = {p['id']: p for p in playas}
out = [{'id': p['id'], 'nombre': p['nombre'], 'lat': p['lat'], 'lon': p['lon'],
        'curado': p.get('curado', False), 'concello': p['concello'],
        'ideGaliciaId': p.get('ideGaliciaId', p['id']), 'travel': p.get('travel', {}),
        'horizonProfile': p['horizonProfile']}
       for p in (by_id['carnota-area-maior'], by_id['ancoradoiro-muros'])]
json.dump(out, open('tests/unit/fixtures/horizon-beaches.json','w', encoding='utf-8'), ensure_ascii=False, indent=2)
"
```
