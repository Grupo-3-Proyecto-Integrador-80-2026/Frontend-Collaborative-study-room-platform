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

# Entorno de ejecución
VITE_APP_ENV=development
```

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
