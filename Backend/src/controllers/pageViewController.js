import PageView from "../services/models/pageViewModel.js";
import SearchLog from "../services/models/searchLogModel.js";

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
const MAX_TERMINO = 64;

/**
 * Registra una búsqueda TERMINADA. Público, lo llama el navegador.
 *
 * Antes esto se hacía dentro del endpoint de búsqueda, que el catálogo dispara
 * cada 400 ms mientras alguien tipea. El resultado era que las métricas medían
 * teclas y no intención: "ma", "mani" y "manifold" figuraban como tres
 * búsquedas distintas, y "tubo n" / "tubo ni" / "tubo nitr" como tres fracasos
 * cuando era uno solo.
 *
 * Ahora el catálogo llama acá una sola vez, cuando la persona dejó de escribir,
 * con el término y la cantidad de resultados que efectivamente vio.
 */
export const registrarBusqueda = async (req, res) => {
  // 204 de entrada: es telemetría, no puede hacer esperar a nadie.
  res.status(204).end();

  try {
    if (BOT_RE.test(req.headers["user-agent"] || "")) return;

    const { term, resultCount } = req.body || {};
    if (typeof term !== "string") return;

    const termino = term.trim().slice(0, MAX_TERMINO).toLowerCase();
    if (termino.length < 2) return;

    const cuenta = Number(resultCount);
    await SearchLog.create({
      term: termino,
      resultCount: Number.isFinite(cuenta) && cuenta >= 0 ? Math.trunc(cuenta) : 0,
    });
  } catch (error) {
    console.error("No se pudo registrar la búsqueda:", error.message);
  }
};
