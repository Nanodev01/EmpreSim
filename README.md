# Simulando Emprendedores

Simulador de gestión empresarial para el aula. Los equipos compiten en un mercado durante siete períodos, sin ver los valores que cargan los demás. No requiere cuentas.

Se puede jugar de dos formas:

- **Cada equipo en su dispositivo:** quien crea la partida comparte un código o link y cada equipo se une con el nombre que elija. Su navegador queda asociado al equipo; si cambia de dispositivo, el coordinador puede liberarlo para retomarlo.
- **Una sola computadora:** los equipos cargan por turnos en la misma pantalla. Ideal para practicar antes de un certamen.

Quien crea la partida la coordina desde ese navegador. Si lo pierde (otro dispositivo, cookies borradas), la recupera en `/recuperar` con el código de coordinador que se muestra en la partida; el código cambia con cada uso.

Se puede instalar como app (PWA) desde el navegador cuando se sirve por HTTPS. El service worker guarda solo archivos públicos versionados: las páginas y la API siempre van a la red, y sin conexión se muestra un aviso. El inicio ofrece un botón para instalarla y, en iPhone y iPad, las instrucciones para agregarla a inicio.

## Historial de commits

| Commit | Mensaje |
|--------|---------|
| `7e90c91` | Initial commit from Create Next App |
| `38c44fd` | INIT |
| `97d0ba2` | INIT |
| `6f9ca78` | chore(main): excluir credenciales y datos locales del repositorio |
| `d234009` | build(main): actualizar Next.js 15 y React 19 sin vulnerabilidades conocidas |
| `f768501` | fix(main): aplicar redondeo bancario y validar el motor contra el reporte oficial |
| `d2731bc` | feat(main): proteger la API con clave anónima de navegador, validación y límites de uso |
| `f789940` | fix(main): usar claves de IA solo en el servidor y enviarlas al proveedor correcto |
| `3679b50` | feat(main): cargar decisiones por turnos con tarjetas vacías y finalizar el ciclo por modo |
| `8a4e026` | fix(main): ajustar la tarjeta de decisiones para campos vacíos y muchos equipos |
| `d1ae05f` | feat(main): preparar el despliegue en internet con HTTPS, backups y CI |
| `535b8da` | docs(main): completar el registro de commits e historias de usuario |
| `bfb3034` | feat(main): mostrar el ranking entre rondas en modo competitivo |
| `9b15a53` | feat(main): agregar API para unirse a partidas online con código y sin cuentas |
| `6f3e0fc` | feat(main): agregar sala online y elección entre varios dispositivos o una computadora |
| `8b07dba` | fix(main): evitar que el encabezado de la partida corte el título en celulares |
| `755c867` | docs(main): completar los hashes del registro de commits |
| `2d73dfa` | feat(main): permitir recuperar la coordinación de una partida con un código secreto |
| `41f7e01` | docs(main): registrar el hash de la recuperación de coordinación |
| `0305469` | feat(main): permitir instalar la aplicación como PWA |
| `00d6319` | fix(main): adaptar todas las pantallas a celulares, tablets y escritorio |
| `cf5162b` | docs(main): registrar los hashes de PWA y diseño adaptable |
| `e5fab03` | feat(main): ofrecer la instalación y priorizar unirse a una partida en el inicio |
| `feb95b3` | docs(main): registrar el hash de la instalación desde el inicio |
| `fba35d4` | fix(main): permitir el despliegue en Coolify sobre volúmenes existentes y con proxy externo |
| `60d233c` | docs(main): registrar el hash del arreglo de despliegue |
| `54f454b` | fix(main): restaurar los backups con la aplicación detenida |
| `2c7c66d` | fix(main): publicar la aplicación en el puerto 5111 del servidor |
| `1538049` | docs(main): registrar el hash de la publicación del puerto |
| `aa86140` | fix(main): actualizar el modelo de Gemini por defecto a gemini-3.8-flash |
| `a097b31` | docs(main): registrar el hash de la actualización del modelo |
| `67c4cc5` | docs(main): renombrar el registro a historial de commits y quitar las historias de usuario |
