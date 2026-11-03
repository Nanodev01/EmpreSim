# Registro de commits e historias de usuario

Lista de funcionalidades e ítems de trabajo del proyecto **Simulando Emprendedores**.
Cada fila relaciona un commit con la historia de usuario que resuelve.

| Commit | Mensaje | Historia de usuario |
|--------|---------|---------------------|
| `7e90c91` | Initial commit from Create Next App | Como cliente quiero una base de proyecto web para poder usar el simulador desde el navegador. |
| `38c44fd` | INIT | Como cliente quiero jugar partidas con el motor del simulador, bots y devolución por equipo para practicar gestión empresarial sin el programa de escritorio original. |
| `97d0ba2` | INIT | Como cliente quiero instalar la aplicación con Docker para ejecutarla igual en cualquier servidor. |
| `6f9ca78` | chore(main): excluir credenciales y datos locales del repositorio | Como cliente quiero que las credenciales y los datos locales queden fuera del repositorio y de la imagen para que no se filtren al publicar la aplicación. |
| `d234009` | build(main): actualizar Next.js 15 y React 19 sin vulnerabilidades conocidas | Como cliente quiero que la aplicación use versiones sin vulnerabilidades conocidas para que nadie pueda aprovecharlas cuando esté publicada en internet. |
| `f768501` | fix(main): aplicar redondeo bancario y validar el motor contra el reporte oficial | Como cliente quiero que los resultados se calculen como en el simulador original y estén comparados con sus reportes para confiar en las posiciones de la competencia. |
| `d2731bc` | feat(main): proteger la API con clave anónima de navegador, validación y límites de uso | Como cliente quiero que solo mi navegador pueda ver y modificar mis partidas, sin crear una cuenta, y que no se puedan cargar valores imposibles para que la competencia sea justa y nadie borre mi trabajo. |
| `f789940` | fix(main): usar claves de IA solo en el servidor y enviarlas al proveedor correcto | Como cliente quiero que las claves de inteligencia artificial estén solo en el servidor para no exponerlas en el navegador ni enviarlas a un proveedor equivocado. |
| `3679b50` | feat(main): cargar decisiones por turnos con tarjetas vacías y finalizar el ciclo por modo | Como cliente quiero que cada equipo complete su tarjeta vacía por turno, sin ver lo que cargaron los demás, y finalizar el ciclo al terminar todos, para ver los resultados en modo práctica o pasar a la ronda siguiente en modo competitivo. |
| `8a4e026` | fix(main): ajustar la tarjeta de decisiones para campos vacíos y muchos equipos | Como cliente quiero ver una tarjeta clara, sin montos falsos en campos vacíos y con todos los equipos a la vista, para saber qué falta completar y a quién le toca. |
| `d1ae05f` | feat(main): preparar el despliegue en internet con HTTPS, backups y CI | Como cliente quiero acceder a la aplicación por HTTPS, con copias de seguridad automáticas y verificaciones en cada cambio, para usarla por internet sin miedo a perder datos ni exponer información. |
| `535b8da` | docs(main): completar el registro de commits e historias de usuario | Como cliente quiero una lista de los cambios con su historia de usuario para saber qué funcionalidades tiene la aplicación y por qué se hicieron. |
| *(pendiente)* | feat(main): mostrar el ranking entre rondas en modo competitivo | Como cliente quiero ver el ranking después de cada ronda competitiva, sin los precios ni el marketing de los demás, para saber cómo voy sin que se revele la estrategia de cada equipo. |
