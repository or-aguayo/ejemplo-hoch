# Chatbot para analizar licitaciones

Aplicación web sencilla que usa modelos de OpenRouter para identificar:

- Requerimientos funcionales
- Requerimientos no funcionales
- Ambigüedades y puntos que necesitan aclaración

## Requisitos

- Node.js 18+ (usa `fetch` nativo y servidor HTTP básico)
- Variable de entorno `OPENROUTER_API_KEY` con tu clave de OpenRouter (puedes definirla en el entorno o en un archivo `.env`)

## Uso

1. Instala las dependencias (no se necesitan paquetes externos).
2. Define la clave:
   - Por entorno: `export OPENROUTER_API_KEY="sk-..."`
   - O crea un archivo `.env` junto a `server.js` con `OPENROUTER_API_KEY=sk-...`
3. Inicia el servidor:
   ```bash
   npm start
   ```
4. Abre `http://localhost:3000` y:
   - Selecciona un modelo gratuito.
   - Pega o escribe el texto de la licitación.
   - Adjunta un archivo de texto (opcional); su contenido se añadirá al prompt.
   - Envía la consulta para recibir los requerimientos y ambigüedades.

## Personalización

- Ajusta la lista de modelos en `public/index.html`.
- Modifica el mensaje del sistema en `server.js` si necesitas otro formato de respuesta.
