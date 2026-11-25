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

---

## Ejecución en Modo Local (Desarrollo)

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
