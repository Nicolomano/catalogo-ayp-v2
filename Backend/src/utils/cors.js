const enProduccion = process.env.NODE_ENV === "production";

// Ojo: CORS no es control de acceso — solo le dice al navegador si puede leer la
// respuesta. Un curl sin header Origin pasa igual. La protección real es el JWT.
const allowedOrigins = [
  "https://refrigeracionayp.com",
  "https://www.refrigeracionayp.com",
];

// Los puertos de desarrollo no tienen por qué estar habilitados contra la API de
// producción. Se saca también catalogoayp.vercel.app (el sitio v1): si ese
// proyecto se borra o renombra, el subdominio queda libre para que lo reclame
// cualquiera, y quedaría con credentials:true contra esta API.
if (!enProduccion) {
  allowedOrigins.push(
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173"
  );
}

if (process.env.FRONTEND_URL) {
  const url = process.env.FRONTEND_URL.trim();
  if (!allowedOrigins.includes(url)) allowedOrigins.push(url);
}

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

export default corsOptions;
