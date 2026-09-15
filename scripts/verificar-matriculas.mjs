/**
 * Revisa una por una las matrículas de los técnicos, contra producción.
 *
 * No mira solo el cartelito del panel: descarga cada archivo y verifica que
 * tenga contenido de verdad y que sea del tipo que dice ser. También prueba a
 * los que figuran SIN matrícula, por si el archivo existe y lo que falla es el
 * indicador — que es exactamente lo que pasaba antes del arreglo del 15/9.
 *
 * Uso:
 *   node scripts/verificar-matriculas.mjs <TOKEN_ADMIN>
 *
 * El token sale del panel: F12 → Application → Local Storage → "token".
 * Dura 2 días y se invalida cambiando la contraseña de administrador.
 */

const API = process.env.API_URL || "https://catalogo-ayp-v2-production.up.railway.app/api";
const TOKEN = process.argv[2] || process.env.ADMIN_TOKEN;

if (!TOKEN) {
  console.error("\nFalta el token de admin.\n\n  node scripts/verificar-matriculas.mjs <TOKEN>\n");
  process.exit(1);
}

const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  mal: (s) => `\x1b[31m${s}\x1b[0m`,
  aviso: (s) => `\x1b[33m${s}\x1b[0m`,
  gris: (s) => `\x1b[90m${s}\x1b[0m`,
};

const auth = { Authorization: `Bearer ${TOKEN}` };

/** Firma real del archivo, sin confiar en lo que declara el servidor. */
function tipoReal(buf) {
  const b = new Uint8Array(buf);
  const empieza = (...bytes) => bytes.every((v, i) => b[i] === v);
  if (empieza(0x25, 0x50, 0x44, 0x46)) return "PDF";
  if (empieza(0xff, 0xd8, 0xff)) return "JPG";
  if (empieza(0x89, 0x50, 0x4e, 0x47)) return "PNG";
  if (empieza(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45) return "WEBP";
  if (empieza(0x47, 0x49, 0x46)) return "GIF";
  return "desconocido";
}

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function main() {
  const res = await fetch(`${API}/users?status=all`, { headers: auth });
  // Se corta con exitCode y no con process.exit(): cortar el proceso con una
  // petición todavía abierta deja un "Assertion failed" de Node en Windows que
  // parece un error grave y no lo es.
  if (res.status === 401) {
    console.error("\nEl token no sirve o venció. Sacá uno nuevo del panel.\n");
    process.exitCode = 1;
    return;
  }
  if (!res.ok) {
    console.error(`\nEl listado respondió ${res.status}.\n`);
    process.exitCode = 1;
    return;
  }
  const users = await res.json();
  console.log(`\n${users.length} técnicos registrados\n`);

  const bien = [];
  const rotas = [];
  const fantasma = []; // el panel dice que no hay, pero el archivo existe
  const sinNada = [];

  for (const u of users) {
    const r = await fetch(`${API}/users/${u._id}/matricula`, { headers: auth });

    if (!u.hasMatricula) {
      // Si el panel dice que no hay, el endpoint tiene que decir lo mismo.
      if (r.ok) {
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 0) {
          fantasma.push({ u, bytes: buf.byteLength, tipo: tipoReal(buf) });
          continue;
        }
      }
      sinNada.push({ u });
      continue;
    }

    if (!r.ok) {
      rotas.push({ u, motivo: `el archivo no se pudo bajar (${r.status})` });
      continue;
    }
    const buf = await r.arrayBuffer();
    const tipo = tipoReal(buf);
    const declarado = r.headers.get("content-type") || "";

    if (buf.byteLength === 0) {
      rotas.push({ u, motivo: "el archivo está vacío (0 bytes)" });
    } else if (tipo === "desconocido") {
      rotas.push({ u, motivo: `no parece una imagen ni un PDF (${kb(buf.byteLength)}, dice ser ${declarado})` });
    } else {
      bien.push({ u, tipo, bytes: buf.byteLength, declarado });
    }
  }

  const linea = (nombre, extra) => `   ${String(nombre).slice(0, 28).padEnd(30)} ${extra}`;

  console.log(c.ok(`✔ Matrículas que abren bien: ${bien.length}`));
  for (const b of bien) {
    console.log(c.gris(linea(b.u.name, `${b.tipo}  ${kb(b.bytes)}  ${b.u.status}`)));
  }

  if (fantasma.length) {
    console.log(c.mal(`\n✘ El archivo existe pero el panel dice que NO hay: ${fantasma.length}`));
    console.log(c.gris("   (esto es un problema del indicador, no del archivo)"));
    for (const f of fantasma) console.log(c.mal(linea(f.u.name, `${f.tipo}  ${kb(f.bytes)}`)));
  }

  if (rotas.length) {
    console.log(c.mal(`\n✘ Marcadas como cargadas pero no se pueden ver: ${rotas.length}`));
    for (const x of rotas) console.log(c.mal(linea(x.u.name, x.motivo)));
  }

  console.log(c.aviso(`\n· Sin matrícula cargada: ${sinNada.length}`));
  for (const s of sinNada) {
    console.log(c.gris(linea(s.u.name, s.u.status === "awaiting" ? "ya se le pidió" : s.u.status)));
  }

  const problemas = fantasma.length + rotas.length;
  console.log(
    problemas === 0
      ? c.ok(`\nTodo bien: las ${bien.length} matrículas cargadas se descargan y son archivos válidos.\n`)
      : c.mal(`\n${problemas} con problemas — ver el detalle arriba.\n`)
  );
  process.exitCode = problemas ? 1 : 0;
}

main().catch((e) => {
  console.error("\nNo se pudo completar la verificación:", e.message, "\n");
  process.exitCode = 1;
});
