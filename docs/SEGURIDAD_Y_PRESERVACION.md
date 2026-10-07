# Dos bases sin modificar el historial

## Alcance

La app conserva `src/firebase.ts` con el proyecto histórico
`chromatic-pride-0ttsj` y la base `ai-studio-f947253c-4469-4545-9268-02ec4d0ccde0`.
Su adaptador únicamente tiene operaciones de lectura. Las encuestas y respuestas
nuevas se guardan exclusivamente en `newDb`, en OTRO proyecto bajo control del usuario.
La configuración ausente o incompleta bloquea escrituras; nunca vuelve al destino antiguo.
`firebase-applet-config.json` sigue intacto y no determina el destino nuevo.

La revisión del código no ejecuta operaciones contra Firebase. El usuario creó
la base `encuestas-nuevas` en `gen-lang-client-0958943545`, confirmó la publicación
de las reglas y habilitó su cuenta administradora. La captura del comando confirma
la reclamación `admin: true`; las reglas y el acceso de la app aún requieren
verificación en producción. No se migraron respuestas ni se modificó el historial.

## Lecturas, origen y conflictos

- El portal consulta definiciones de ambas bases. Respuestas y sus contadores
  se consultan únicamente tras autenticarse como administrador del proyecto NUEVO.
- Los registros se combinan por ID. Si el mismo ID tiene contenido idéntico,
  cuenta una vez y su origen es `ambas`. Si difiere, se bloquea la combinación
  para revisión: no se elige ni sobrescribe silenciosamente una versión.
- El panel indica los totales por origen y el historial de respuestas identifica
  histórica/nueva/ambas. El JSON incluye los mapas de procedencia separados;
  no agrega metadatos ni normaliza documentos originales.
- Una lectura antigua fallida muestra aviso de totales parciales y bloquea el
  respaldo integral. La base nueva puede seguir atendiendo sus encuestas preparadas.
  Una lectura nueva fallida impide mostrar datos como si fueran completos.
- No se copian respaldos privados al código, al cliente público ni a GitHub.
- No se pueden endurecer las reglas antiguas sin permisos del propietario. El
  login nuevo limita la interfaz; NO protege una base antigua cuyas reglas permiten
  lecturas públicas. No se afirma que esa exposición haya quedado resuelta.
- Si las reglas antiguas requieren autenticación en su propio proyecto, el token
  del nuevo no sirve. La lectura histórica puede fallar. Requiere permisos originales
  o una incorporación privada y controlada de respaldos, no habilitada automáticamente.

## Preparación de encuestas antiguas para nuevos envíos

El administrador pulsa `Habilitar nuevos envíos para encuestas históricas`.
Esta operación explícita lee las definiciones históricas y crea copias exactas
solo en la nueva base, con los mismos IDs, preguntas, opciones y traducciones.
No copia respuestas. No actualiza ni elimina documentos de ninguna base.

La transacción nueva acepta de 1 a 250 definiciones. Si una copia idéntica ya
existe, se omite. Si un ID existente tiene contenido distinto, cancela el lote
completo. Repetir la preparación no crea duplicados. Abrir la app no prepara ni
escribe nada automáticamente. La lectura antigua y la transacción nueva no
constituyen una instantánea atómica entre proyectos.

El público puede enviar respuestas antiguas únicamente cuando existe su copia
en la nueva base. Si falta, el envío muestra error y conserva las respuestas del
formulario. Cada respuesta nueva recibe el UUID del flujo existente. Las reglas
nuevas solo permiten creación, nunca sobrescritura ni borrado. No se garantiza
deduplicación entre sesiones, dispositivos o envíos con resultado incierto.

## Administración, importación y reglas nuevas

- Firebase Authentication Email/Password y claim booleano `admin: true` pertenecen
  exclusivamente al proyecto nuevo. No reutilizar una clave incluida en JavaScript.
- El servidor verifica tokens con `FIREBASE_PROJECT_ID` del proyecto nuevo y
  credenciales válidas. Sin proyecto configurado, la API administradora rechaza acceso.
- Las reglas de `firestore.rules` se publican SOLO en la nueva base. Permiten
  lectura pública de encuestas, lectura privada de respuestas, creación administradora
  de encuestas y creación pública de respuestas de estructura válida con padre existente.
  Niegan toda actualización y borrado, incluso a administradores.
- La importación exige metadatos explícitos, máximo 250 registros, IDs únicos y
  encuestas preparadas. Consulta IDs antiguos y rechaza importarlos nuevamente.
  Si el historial no puede consultarse, falla sin escribir. Conflictos en la nueva
  base cancelan la transacción completa. Los respaldos de respuestas no se cargan
  automáticamente al preparar encuestas.
- El formulario valida consentimiento, espacios vacíos, opciones, escala entera
  1–10, máximos de selecciones y exclusión de Ninguna. Las reglas no reproducen
  toda la semántica del formulario ni eliminan el abuso automatizado.
- Traducciones nuevas completas se conservan en memoria. Las incompletas almacenadas
  se señalan, sin corregir documentos históricos. Creación con traducción solicitada
  exige cobertura completa y conserva el borrador ante fallos.
- La API limita solicitudes y archivos, exige token para parsear documentos y
  devuelve errores seguros. El límite por IP/instancia no es una cuota global.
- CSV conserva valores originales separados de interpretación y protege fórmulas.
  PDF y gráficos explican bases y puntajes válidos. No se inventa país o fecha.

## Configuración y activación pendiente

1. Destino confirmado: proyecto `gen-lang-client-0958943545`, base Standard
   `encuestas-nuevas`. Las dos bases Enterprise del remix quedan intactas.
2. `src/newFirebaseConfig.ts` contiene los parámetros públicos confirmados de la
   app web y ese destino. Funciona sin configurar variables VITE adicionales.
   Para cambiarlo, definir los cinco `VITE_NEW_FIREBASE_*` juntos; un conjunto
   parcial bloquea la conexión. Recompilar tras modificar configuración.
3. Habilitar Email/Password, crear/seleccionar la cuenta administradora, conservar
   contraseñas en canales privados, asignar `admin: true` con Admin SDK conservando
   otras reclamaciones y comprobar dominios autorizados. Renovar token/iniciar sesión.
4. El servidor usa por defecto el mismo proyecto confirmado. Si se configura
   `FIREBASE_PROJECT_ID`, debe coincidir con el cliente. Mantener credenciales de
   verificación válidas; nunca subir claves de servicio al repositorio.
   Comprobar el login y la API con la cuenta final.
5. `firebase.production.json` apunta exclusivamente a `encuestas-nuevas`.
   Si se publica con CLI, indicar explícitamente el proyecto:
   `firebase deploy --only firestore:rules --config firebase.production.json --project gen-lang-client-0958943545`.
   No ejecutar este despliegue en chromatic-pride-0ttsj. No cambiar sus reglas.
6. Coordinar publicación de reglas nuevas y app. Confirmar lectura histórica y
   conteos actuales; preparar definiciones con el botón de administración.
7. Descargar el respaldo integral y comparar los registros originales con los
   archivos previos. Confirmar que un envío autorizado llega solo a la nueva base.
   No introducir respuestas ficticias en producción sin un plan explícito de prueba.
8. Compartir el enlace vigente de `survey_mauritania_dos` con la clienta. Identificar
   las ocho respuestas ya presentes y cargar únicamente las 26 faltantes.
   Si no hubo otros envíos, esperar 34 respuestas de Mauritania y 385 totales.
   Mantener también la otra versión de Mauritania; no fusionar sus preguntas ni borrar IDs.

La configuración y pruebas de producción requieren acceso del usuario a la cuenta
nueva. No se dieron por verificadas. Tampoco se verificaron llamadas reales a IA,
Safari ni teléfono físico. La versión anterior puede seguir escribiendo en la base
antigua si conserva esas facultades; esta rama no puede revocarlas sin su propietario.

## Respaldo recibido y límites

El 6 de octubre se verificaron offline cuatro JSON: Mali 190, Sáhara 160,
Mauritania 8 y Diáspora 1. Son 359 IDs únicos. El 7 de octubre se recibió un JSON
con SIETE encuestas, incluidas `survey_mauritania_dos` y `survey_mauritania_perfecta`,
ambas con 42 preguntas. Cada traducción fr/haa cubre 7 preguntas; la Diáspora con
ID numérico no tiene traducciones guardadas. No se modifican ni se completan esos datos.
El paquete privado conserva los cinco archivos originales y sus huellas SHA-256.
No es una instantánea atómica, no prueba el estado actual de Firebase ni localiza
las otras 26 respuestas recordadas. Ningún archivo de datos reales se agrega a GitHub.

## Verificación local

```sh
npm ci --ignore-scripts
npm run lint
npm run test:rules
npm run build
npm run check:backup -- respaldo_integral.json
npm run check:backup -- antes.json despues.json
```

Las pruebas de reglas usan solo el emulador con proyecto demo-survey-preservation.
El verificador de respaldos lee archivos offline: detecta IDs duplicados, pérdidas,
cambios y adiciones sin imprimir nombres/respuestas. La comparación de respaldo
integral no puede reconstruir las definiciones ausentes en los viejos arrays.
Los dos archivos originales incorporados al repositorio siguen idénticos.

Referencias oficiales:
- https://firebase.google.com/docs/auth/admin/custom-claims
- https://firebase.google.com/docs/firestore/manage-databases
