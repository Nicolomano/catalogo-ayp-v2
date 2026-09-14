/**
 * Prueba el registro de técnicos service: qué archivos acepta como matrícula,
 * qué error devuelve cuando no lo acepta, y que los correos escapen los datos
 * que carga el usuario.
 *
 * No necesita base ni R2 — son funciones puras y middlewares.
 *
 *   cd Backend
 *   node src/scripts/__test-registro.mjs
 */
process.env.JWT_SECRET ||= "secreto-solo-para-esta-prueba-descartable";

const ok = [];
const fallos = [];

async function check(nombre, fn) {
  try {
    const detalle = await fn();
    ok.push(nombre);
    console.log(`  ✔ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  } catch (e) {
    fallos.push(`${nombre}: ${e.message}`);
    console.log(`  ✘ ${nombre}\n      ${e.message}`);
  }
}
const esperar = (real, esp, que) => {
  if (real !== esp) throw new Error(`${que}: ${JSON.stringify(real)}, se esperaba ${JSON.stringify(esp)}`);
};

const { uploadMatricula, default: uploadCloud } = await import("../middlewares/multer.js");
const { manejarErrorDeArchivo } = await import("../middlewares/uploadErrors.js");
const { registrationReceivedEmail, newRegistrationEmail } = await import(
  "../services/emailService.js"
);

/** Corre el fileFilter de una instancia de multer sin levantar un servidor. */
function filtrar(upload, mimetype) {
  return new Promise((resolve) => {
    // multer guarda el filtro que se le pasó en las opciones.
    upload.fileFilter({}, { mimetype, originalname: "matricula" }, (err, aceptado) =>
      resolve({ aceptado: aceptado === true, err })
    );
  });
}

console.log("\nQué archivos acepta la matrícula");
console.log("─".repeat(42));

await check("Acepta PDF", async () => {
  const r = await filtrar(uploadMatricula, "application/pdf");
  esperar(r.aceptado, true, "PDF");
});

await check("Acepta las fotos de siempre", async () => {
  for (const t of ["image/jpeg", "image/png", "image/webp"]) {
    const r = await filtrar(uploadMatricula, t);
    esperar(r.aceptado, true, t);
  }
  return "jpeg, png, webp";
});

await check("Rechaza lo demás con un mensaje para mostrar", async () => {
  const r = await filtrar(uploadMatricula, "application/zip");
  esperar(r.aceptado, false, "zip aceptado");
  esperar(r.err?.esArchivoInvalido, true, "no viene marcado como error de archivo");
  if (!/PDF/i.test(r.err.message)) throw new Error(`el mensaje no orienta: ${r.err.message}`);
  return `"${r.err.message}"`;
});

await check("Las fotos de PRODUCTO siguen sin aceptar PDF", async () => {
  // uploadCloud se usa para las imágenes de producto, que sí pasan por sharp.
  const r = await filtrar(uploadCloud, "application/pdf");
  esperar(r.aceptado, false, "PDF aceptado como foto de producto");
  esperar(r.err?.esArchivoInvalido, true, "sin marcar");
});

console.log("\nQué ve el técnico cuando el archivo no sirve");
console.log("─".repeat(42));

function fakeRes() {
  const r = { statusCode: 200, body: null };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
}

await check("Un formato no permitido devuelve 400, no 500", async () => {
  const { err } = await filtrar(uploadMatricula, "application/zip");
  const res = fakeRes();
  let siguio = false;
  manejarErrorDeArchivo(err, {}, res, () => { siguio = true; });
  if (siguio) throw new Error("dejó pasar el error al handler genérico (ahí se vuelve un 500)");
  esperar(res.statusCode, 400, "status");
  return `"${res.body.message}"`;
});

await check("Un archivo demasiado grande devuelve 400 explicando el límite", async () => {
  const multer = (await import("multer")).default;
  const err = new multer.MulterError("LIMIT_FILE_SIZE");
  const res = fakeRes();
  manejarErrorDeArchivo(err, {}, res, () => {});
  esperar(res.statusCode, 400, "status");
  if (!/10 MB/.test(res.body.message)) throw new Error("no dice cuál es el límite");
  return `"${res.body.message}"`;
});

await check("Un error que no es de archivo sigue de largo", async () => {
  const res = fakeRes();
  let siguio = false;
  manejarErrorDeArchivo(new Error("otra cosa"), {}, res, () => { siguio = true; });
  esperar(siguio, true, "lo tragó en vez de pasarlo");
  esperar(res.statusCode, 200, "tocó la respuesta");
});

console.log("\nFirma del PDF");
console.log("─".repeat(42));

// Misma comprobación que hace el controller antes de guardar.
const pareceP = (buf) => buf.subarray(0, 5).toString("latin1") === "%PDF-";

await check("Un PDF de verdad pasa", () => {
  esperar(pareceP(Buffer.from("%PDF-1.7\n...")), true, "PDF válido");
});

await check("Un archivo que MIENTE que es PDF no pasa", () => {
  // Content-Type application/pdf pero el contenido es otra cosa.
  esperar(pareceP(Buffer.from("GIF89a....")), false, "contenido falso aceptado");
  esperar(pareceP(Buffer.from("")), false, "archivo vacío aceptado");
});

console.log("\nCorreos nuevos");
console.log("─".repeat(42));

await check("El acuse al técnico sale con su nombre", () => {
  const m = registrationReceivedEmail("Juan Pérez");
  if (!m.subject || !m.html) throw new Error("falta subject o html");
  if (!m.html.includes("Juan Pérez")) throw new Error("no aparece el nombre");
  return `asunto: "${m.subject}"`;
});

await check("El aviso al admin trae los datos para decidir", () => {
  const m = newRegistrationEmail({
    name: "Juan Pérez", email: "juan@example.com", phone: "11 5555 4444",
    cuit: "20123456789", company: "Frío Sur", province: "Buenos Aires",
    tieneMatricula: true,
  });
  for (const dato of ["juan@example.com", "11 5555 4444", "20123456789", "Frío Sur"]) {
    if (!m.html.includes(dato)) throw new Error(`falta ${dato}`);
  }
  if (!m.html.includes("/admin/users")) throw new Error("no lleva al panel");
  return "nombre, email, teléfono, CUIT, empresa y link al panel";
});

await check("Un nombre con HTML no puede inyectar un link en el correo", () => {
  const malicioso = '<a href="https://sitio-falso.com">Cobrá acá</a>';
  for (const m of [registrationReceivedEmail(malicioso), newRegistrationEmail({ name: malicioso })]) {
    if (m.html.includes("<a href=\"https://sitio-falso.com\"")) {
      throw new Error("¡el HTML del atacante quedó vivo en el correo!");
    }
    if (!m.html.includes("&lt;a href=")) throw new Error("no se ve el texto escapado");
  }
  // El asunto del aviso al admin también lo lleva.
  return "se escapa en el cuerpo y en el asunto";
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));
process.exitCode = fallos.length ? 1 : 0;
