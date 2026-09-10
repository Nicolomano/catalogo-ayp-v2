import PageView from "../services/models/pageViewModel.js";

const MAX_PATH = 200;
const MAX_CANAL = 40;
const MAX_SID = 40;

// Los robots no ejecutan JavaScript, así que casi ninguno llega hasta acá. Igual
// se filtran los que sí lo hacen, para que no inflen las visitas.
const BOT_RE =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegram|slack|discord|preview|headless|lighthouse|pingdom|uptime/i;

const esTexto = (v) => typeof v === "string";

/**
 * Registra una visita. Público y sin autenticación: lo llama el navegador de
 * cualquier visitante.
 */
export const registrarVisita = async (req, res) => {
  // Se responde 204 siempre y cuanto antes: es telemetría, nunca puede hacer
  // esperar ni fallar la navegación de quien está mirando el sitio.
  res.status(204).end();

  try {
    if (BOT_RE.test(req.headers["user-agent"] || "")) return;

    const { path, canal, sid } = req.body || {};
    if (!esTexto(path) || !esTexto(sid) || !path || !sid) return;
    // Solo rutas del propio sitio.
    if (!path.startsWith("/") || path.startsWith("//")) return;
    // El panel de administración no se cuenta como visita del público.
    if (path.startsWith("/admin")) return;

    await PageView.create({
      path: path.slice(0, MAX_PATH),
      canal: (esTexto(canal) && canal ? canal : "directo").slice(0, MAX_CANAL),
      sid: sid.slice(0, MAX_SID),
    });
  } catch (error) {
    console.error("No se pudo registrar la visita:", error.message);
  }
};
