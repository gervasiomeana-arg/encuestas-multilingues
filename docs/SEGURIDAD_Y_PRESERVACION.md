# Seguridad sin modificar información existente

Esta rama cambia código y reglas. No ejecuta migraciones, lecturas de producción,
borrados, restauraciones ni escrituras de datos. Los dos archivos de cuestionarios
y registros incorporados permanecen idénticos a `405d8df`.

## Comportamiento preparado

- Abrir o sincronizar el portal únicamente lee cuestionarios; no los crea.
- El público no descarga documentos de respuestas ni su contador histórico.
- Administración usa Firebase Authentication y una reclamación verificada
  `admin: true`, en lugar de una clave incluida en JavaScript.
- Las reglas niegan actualizar o borrar cualquier cuestionario o respuesta,
  incluso al administrador. No cambian ni vuelven a guardar documentos existentes.
- Los cuestionarios nuevos se crean con un ID nuevo. Trabajar desde una plantilla
  guarda una copia; la original y sus respuestas no se alteran.
- Las traducciones del visitante permanecen en memoria, sin escribir en Firestore.
- La importación valida el lote y rechaza IDs existentes o repetidos. La
  transacción se cancela completa si hay un conflicto o falla una escritura.
  Máximo: 250 respuestas; todas deben apuntar a cuestionarios que ya existen.
- El botón que borraba encuestas para restaurar Mauritania y la incorporación
  automática de los ocho registros incluidos se retiraron de la interfaz. Los
  archivos originales siguen conservados en el repositorio.
- El respaldo JSON incluye todos los cuestionarios y respuestas descargados por
  el administrador. Es una instantánea de la sesión: para respaldar, sincronizar
  primero y comprobar los conteos. No reemplaza backups de infraestructura ni
  garantiza un corte atómico entre colecciones mientras llegan nuevas respuestas.
- El importador admite el JSON anterior (array) y el nuevo formato, pero añade
  únicamente respuestas; no restaura definiciones ni reemplaza registros.
- Los promedios excluyen vacíos y valores fuera de escala. El CSV neutraliza
  fórmulas de planilla. El PDF señala muestras parciales y no afirma que la base
  esté auditada ni que todos los textos libres estén traducidos.
- El parser de documentos exige una sesión administradora. La traducción pública
  mantiene su uso sin login, con un límite por IP y por instancia. Los errores de
  IA no devuelven contenido crudo. El servidor no publica su código ni sus mapas.

## Configuración antes de activar

1. Obtener y comprobar un respaldo integral de producción, con conteos e IDs,
   usando acceso de solo lectura. Esta rama no ejecuta esa operación.
2. Confirmar que el proyecto y la base siguen siendo los de `src/firebase.ts`:
   proyecto `chromatic-pride-0ttsj` y base
   `ai-studio-f947253c-4469-4545-9268-02ec4d0ccde0`. El archivo
   `firebase-applet-config.json` apunta a OTRO proyecto/base de un remix.
   No sustituir la conexión, no crear una base nueva y no migrar registros.
3. Habilitar Email/Password en Authentication del proyecto original y confirmar
   el dominio autorizado. Crear o seleccionar la cuenta administradora, por
   canales privados. Nunca incluir contraseñas o claves de servicio en GitHub.
4. Un responsable con permisos del proyecto debe asignar `admin: true` al UID
   correcto mediante Firebase Admin SDK, conservando las otras reclamaciones.
   Referencia: https://firebase.google.com/docs/auth/admin/custom-claims
   Volver a iniciar sesión o renovar el token después. Esta rama no asigna roles
   ni cambia cuentas de producción.
5. En el servidor, `FIREBASE_PROJECT_ID` debe coincidir con el proyecto original;
   el valor por defecto ya coincide. No usar el proyecto del remix.
6. Probar autenticación y reglas en un entorno separado. Publicar reglas solo
   en la base nombrada original, con acceso de administrador ya comprobado.
   Coordinar el cambio de app y reglas: la app antigua usa una clave local y no
   podrá leer respuestas con las nuevas reglas. No desplegar solo una mitad.
7. Comparar conteos e IDs antes/después. No ejecutar herramientas de restauración
   o scripts de migración durante la activación. Las reglas afectan permisos,
   no contenidos. Un rollback no debe volver a abrir las reglas anteriores.

## Verificación reproducible

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run test:rules
npm run build
```

Las pruebas de reglas usan exclusivamente el proyecto `demo-survey-preservation`
y el emulador local (`127.0.0.1:8085`). Nunca configurar su ejecución contra una
base real. `npm test` omite las pruebas de reglas cuando no hay emulador;
`npm run test:rules` debe ejecutarlas efectivamente antes de activar permisos.

## Pendiente en esta primera corrección

- No se han activado la cuenta, las reglas ni el despliegue en producción.
- Las nuevas respuestas siguen siendo públicas para no exigir una cuenta a cada
  encuestado. Las reglas validan estructura y existencia del cuestionario;
  no verifican semánticamente cada respuesta ni impiden todo envío automatizado.
  Para abuso a escala: App Check, cuotas y límites compartidos de infraestructura.
- El límite de API es por instancia; no es una cuota global multiinstancia ni un
  límite fiable por persona cuando el proxy agrupa IPs. No se confía en encabezados
  de IP suministrados por el cliente. Revisar el proxy al desplegar.
- Los textos, opciones, traducciones almacenadas, aliases históricos y la
  fórmula de porcentaje de selección múltiple se conservan.
- No se garantiza la exactitud semántica de la IA: revisar documentos y
  traducciones antes de crear una encuesta nueva.
- El respaldo de datos reales y la prueba con la cuenta final requieren acceso
  al proyecto original; no se dieron por realizadas.

## Segunda etapa: controles del formulario y documentos

Estos controles se aplican a formularios nuevos; no corrigen, normalizan ni
vuelven a guardar las respuestas históricas:

- Rechazar el consentimiento impide avanzar y enviar el formulario. Se reconoce
  la misma opción en las traducciones guardadas, sin modificar sus textos.
- Se rechazan textos obligatorios vacíos o con solo espacios, opciones ajenas al
  cuestionario y puntajes inválidos. Se aplica el máximo indicado en el enunciado
  y se mantiene «Ninguna» como opción excluyente.
- El selector de idioma también está disponible al abrir un enlace directo a
  una única encuesta y durante el formulario. Al cambiar de idioma, la selección se reconoce por su posición en las opciones
  de origen. No se normalizan respuestas guardadas ni se hace clasificación difusa.
- Las traducciones parciales indican su cobertura. Una traducción nueva incompleta
  no sustituye la anterior, ni siquiera en memoria. La traducción completa se
  conserva exclusivamente durante la sesión y puede iniciarse desde la lista.
- El contenido hassanía usa dirección RTL. El texto de preguntas con dos puntos
  se conserva salvo los prefijos de bloque que ya son títulos de navegación.
- El parser no mezcla una pregunta numerada con las opciones de la anterior y no
  pierde la primera pregunta cuando el archivo no tiene título. Las listas numéricas
  ambiguas se conservan como preguntas y se exige revisión del borrador. No se
  promete una extracción literal perfecta de cualquier documento.
- Se validan tipos, IDs únicos y opciones en borradores importados. La API de
  traducción limita cantidad y longitud antes de consultar IA, y comprueba que la
  salida cubra todas las preguntas y opciones.

La validación de respuestas descrita aquí es del formulario: un cliente externo
puede intentar crear respuestas directamente en Firestore. Las reglas protegen
lectura, modificación y borrado y validan estructura, pero no reproducen toda la
semántica del formulario. No se verificó ni activó producción.
