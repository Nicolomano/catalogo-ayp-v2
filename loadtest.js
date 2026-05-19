import http from "k6/http";
import { sleep, check } from "k6";

// ← Reemplazá con la URL real de tu backend en Railway
// Ejemplo: "https://catalogo-ayp-production.up.railway.app/api"
const BASE = "https://TU-BACKEND.up.railway.app/api";

export const options = {
  scenarios: {
    // 1. Smoke test: 2 usuarios, 1 min — verifica que todo funcione antes del test real
    smoke: {
      executor: "constant-vus",
      vus: 2,
      duration: "1m",
      tags: { scenario: "smoke" },
    },
    // 2. Carga normal: simula tráfico real, rampa hasta 50 usuarios concurrentes
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 20 },  // sube a 20 usuarios
        { duration: "3m", target: 50 },  // sube a 50 usuarios
        { duration: "2m", target: 50 },  // mantiene 50 usuarios
        { duration: "1m", target: 0 },   // baja a 0
      ],
      startTime: "1m30s",                // empieza después del smoke
      tags: { scenario: "load" },
    },
    // 3. Stress test: empuja hasta 150 usuarios para ver dónde quiebra
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "2m", target: 100 },
        { duration: "2m", target: 150 },
        { duration: "1m", target: 0 },
      ],
      startTime: "10m",                  // empieza al terminar el load test
      tags: { scenario: "stress" },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],   // 95% de requests deben responder en menos de 2s
    http_req_failed:   ["rate<0.05"],    // menos del 5% de errores
  },
};

// Simula un usuario navegando el catálogo
export default function () {
  // Carga inicial de la app (3 llamadas en paralelo al abrir la web)
  const batch = http.batch([
    ["GET", `${BASE}/site-config/`],
    ["GET", `${BASE}/products/landing`],
    ["GET", `${BASE}/products/meta/categories`],
  ]);
  batch.forEach((r) =>
    check(r, { "carga inicial ok (200)": (r) => r.status === 200 })
  );
  sleep(1);

  // Navega el catálogo (primera página)
  const catalog = http.get(`${BASE}/products/?page=1&limit=24`);
  check(catalog, { "catálogo ok (200)": (r) => r.status === 200 });
  sleep(1);

  // Busca un producto sin tilde (caso real de un service)
  const search = http.get(`${BASE}/products/?search=compresor&page=1&limit=24`);
  check(search, { "búsqueda ok (200)": (r) => r.status === 200 });
  sleep(2);

  // Navega a una segunda página del catálogo
  const catalog2 = http.get(`${BASE}/products/?page=2&limit=24`);
  check(catalog2, { "página 2 ok (200)": (r) => r.status === 200 });
  sleep(1);
}
