# Política de seguridad

## Cómo informar de una vulnerabilidad

Usa el aviso privado de GitHub: pestaña **Security** → **Report a vulnerability**
del repositorio. No abras un issue público con los detalles.

Respuesta orientativa: acuse de recibo en una semana. Es un proyecto personal sin
garantía de plazos.

## Alcance

- El sitio es estático: no tiene backend, cuentas de usuario ni base de datos.
- Las claves de API (por ejemplo `ORS_API_KEY`) viven solo en GitHub Secrets y las usa
  la ingesta en CI. Nunca llegan al navegador.
- Si encuentras una clave o un dato personal en el repositorio o en su historial,
  avisa por el mismo canal.
