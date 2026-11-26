# Salón de Estudio Colaborativo en Tiempo Real — Frontend

Aplicación web colaborativa desarrollada con **React, TypeScript, Vite y Tailwind CSS**. Este repositorio contiene el frontend desacoplado del sistema, diseñado bajo pautas de accesibilidad **WCAG 2.2 Nivel AA** y desplegado en **Vercel**.

---

## Requisitos Previos

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior (o Yarn / pnpm)
- **Docker**: (Para ejecución contenerizada) v24.0 o superior

---

## Configuración del Entorno Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Grupo-3-Proyecto-Integrador-80-2026/Frontend-Collaborative-study-room-platform.git

   cd Frontend-Collaborative-study-room-platform
   ```


## Configuración de Variables de Entorno

Antes de iniciar la aplicación, crea el archivo de variables locales a partir de la plantilla:

```bash
# Estando en la raíz del proyecto frontend
cp .env.example .env
```

Define los valores necesarios dentro de tu archivo `.env`:

```env
# URL de la API REST desplegada en Render (o local si estás desarrollando)
VITE_API_URL=https://tu-backend-api.onrender.com
VITE_REALTIME_URL=https://tu-backend-realtime.onrender.com

# Entorno de ejecución
VITE_APP_ENV=development
```

### Comprobar US-07 en la aplicación publicada

Configura ambas URLs en Vercel antes de compilar. El servicio de tiempo real debe permitir el origen del frontend (`FRONTEND_ORIGIN`).

1. Con una cuenta anfitriona, abre una sala desde el panel. Abre `/salas/<id>` en otra sesión autenticada con una cuenta invitada.
2. Desde **Acciones de la sala → Editar nombre**, intenta guardar solo espacios. Luego guarda un nombre válido. Comprueba el título en las dos sesiones y la tarjeta del panel al volver.
3. En el panel, abre **Eliminar** y cancela con `Esc`: la tarjeta debe seguir ahí y el foco volver al botón. Repite y confirma. Si era la última sala, el panel debe quedar vacío.
4. En la sesión invitada, verifica que no aparezcan acciones de edición o eliminación. Tras la eliminación debe volver al panel con el aviso del anfitrión. Una sesión en otra sala no debe recibirlo.

Para el DUE, captura el error de validación y el resultado en ambas sesiones con la URL de producción visible.

### Comprobar US-08: unirse a una sala

La API debe incluir `GET /api/rooms/:id` de US-08. La presencia se obtiene del ACK de `room:join` y de los eventos `presence:joined` y `presence:left` del servicio de tiempo real.

1. Copia el ID de una sala como anfitrión. Desde otra cuenta, pégalo con espacios al principio y al final en **Panel → Unirse a una sala**. Pulsa `Enter`: verifica el nombre, el rol de participante y el contador en ambas sesiones. Sal de la sala y comprueba que el contador del anfitrión disminuye.
2. Prueba con un campo en blanco, con un ID incompleto y con un ID de 20 caracteres que no exista. Verifica que puedas corregirlo con el teclado y que el lector de pantalla anuncie el error.
3. Abre `/salas/<id>` con sesión y en una ventana privada. En el segundo caso, inicia sesión y comprueba que vuelves a la misma sala, incluso si Google solicita completar el perfil.
4. Para el DUE, registra el éxito y el error con la URL publicada visible y la revisión de accesibilidad en móvil y escritorio.

### Comprobar US-10: mensajería instantánea

El chat utiliza el socket autenticado de la sala. Envía `message:send` con `{roomId, text}`: el emisor confirma su burbuja con el ACK del servidor y los demás reciben `message:new`. El servidor de US-10 entrega el nombre del autor y la fecha. Un timeout deja el envío **sin confirmar**; no se reenvía automáticamente.

1. En la aplicación publicada abre A y B en una sala y C en otra. Envía desde A mediante `Enter`: A y B deben ver un solo mensaje con autor, hora y texto; C no debe recibirlo.
2. Comprueba que `Shift+Enter` inserta un salto de línea y que no se pueden enviar espacios solos.
3. Con suficientes mensajes para desplazar el chat, sube en B y escribe un borrador. Envía desde A: B debe conservar la posición, el foco y el borrador. Activa **Mensajes nuevos** para ver el último. Repite al final del chat para comprobar el desplazamiento automático.
4. Desconecta la red en B: debe aparecer un aviso y bloquearse el envío hasta reconectar. Verifica con teclado y lector de pantalla que se anuncien los mensajes sin mover el foco; captura el éxito y el error con la URL de producción visible.

### Comprobar US-11: historial de chat

El frontend consulta `GET /api/rooms/:id/messages?limit=50` con el token de sesión. La API debe incluir US-11 y tener listo en Firestore el índice compuesto `messages: roomId ASC, createdAt DESC` definido en `Backend-API/firestore.indexes.json`. Si la ruta aparece en Swagger y los registros de la API muestran `FAILED_PRECONDITION` al consultar, verifica el estado de ese índice. Debe desplegarlo quien administra el proyecto Firebase con `firebase deploy --only firestore:indexes`; la cuenta de servicio de la API puede consultarlo, pero no crearlo.

1. Abre una sala vacía. Envía mensajes desde dos cuentas y recarga: deben reaparecer en orden, con autor y hora, sin duplicados.
2. En una sala con más de 50 mensajes, selecciona **Cargar mensajes anteriores** por teclado. Deben aparecer antes de los que estabas leyendo, sin saltar al final ni contarse como mensajes nuevos. Al llegar al principio desaparece el botón.
3. Interrumpe la consulta del historial y reintenta. Si falla una página anterior, deben conservarse los mensajes ya visibles y el borrador. Desconecta una sesión, envía desde la otra y reconecta para comprobar que se recupera lo que faltaba.
4. Registra en producción el éxito y el error controlado con la URL visible. Comprueba que el lector de pantalla anuncia el resumen de la carga en lugar de leer cada mensaje anterior.

---

## Ejecución en Modo Local (Desarrollo)

Para entrar a salas en desarrollo se necesitan **la API y el servicio Socket.IO**. En el `.env` del frontend usa `VITE_API_URL=http://localhost:3000` y `VITE_REALTIME_URL=http://localhost:3001`.

- **API:** desde `Backend-API/`, con su `.env` configurado, ejecuta `npm run dev`. Comprueba en `http://localhost:3000/api-docs/` que `/api/rooms/{id}` incluye **GET**, además de PATCH y DELETE.
- **Tiempo real:** en otra terminal, desde `Backend-API/`, con las dependencias de `backend-realtime` instaladas y Node 22+, ejecuta:
  ```bash
  npm --prefix backend-realtime run build
  PORT=3001 FRONTEND_ORIGIN=http://localhost:5173 node --env-file=.env backend-realtime/dist/server.js
  ```
  El proceso usa la credencial de Firebase configurada en el `.env` de la API. `http://localhost:3001/health` debe responder `{"status":"ok"}`. Abre Vite con el origen exacto configurado en `FRONTEND_ORIGIN`.

Sigue estos pasos para compilar y ejecutar el frontend en tu máquina local:

1. **Instalar dependencias del proyecto:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo con Vite:**
   ```bash
   npm run dev
   ```

3. **Acceder a la aplicación:**  
   Abre tu navegador e ingresa a:  
   `http://localhost:5173`

4. **Verificar tipos y compilar para producción (Build):**
   ```bash
   npm run build
   ```

5. **Previsualizar la versión de producción localmente:**
   ```bash
   npm run preview
   ```

---

## Ejecución con Docker

El frontend cuenta con un `Dockerfile` multi-stage que compila los estáticos con Node.js y los distribuye mediante un servidor Nginx ligero y optimizado:

1. **Construir la imagen de Docker:**
   ```bash
   docker build -t salon-estudio-frontend .
   ```

2. **Levantar el contenedor:**
   ```bash
   docker run -d -p 8080:80 --name salon-frontend-app salon-estudio-frontend
   ```

3. **Acceder al contenedor:**  
   Abre en tu navegador: `http://localhost:8080`

4. **Detener el contenedor:**
   ```bash
   docker stop salon-frontend-app && docker rm salon-frontend-app
   ```
