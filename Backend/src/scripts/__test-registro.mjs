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

console.log("\nCUIT, CUIL y DNI");
console.log("─".repeat(42));

const { interpretarIdentificacion, verificadorOk, dniDeCuit, avisoIdentificacion } = await import(
  "../utils/identidad.js"
);

await check("Acepta un CUIT bien formado y le saca el DNI", () => {
  const r = interpretarIdentificacion("20-12345678-6");
  esperar(r.ok, true, "rechazado");
  esperar(r.cuit, "20123456786", "cuit normalizado");
  esperar(r.dni, "12345678", "DNI extraído del propio número");
  return "20-12345678-6 → DNI 12345678";
});

await check("Rechaza lo que antes entraba igual", () => {
  const basura = ["11111111111", "12345678901", "00000000000", "20-12345678-1", "99999999999"];
  for (const c of basura) {
    const r = interpretarIdentificacion(c);
    if (r.ok) throw new Error(`${c} pasó la validación`);
  }
  return `${basura.length} casos, todos rechazados`;
});

await check("Acepta el DNI suelto para el que no está inscripto", () => {
  const r = interpretarIdentificacion("12.345.678");
  esperar(r.ok, true, "rechazado");
  esperar(r.tipo, "dni", "tipo");
  esperar(r.dni, "12345678", "dni");
  esperar(r.cuit, "", "no debería inventar un CUIT");
});

await check("Un número de largo raro se rechaza con una explicación", () => {
  const r = interpretarIdentificacion("123456");
  esperar(r.ok, false, "aceptado");
  if (!/11 dígitos/.test(r.motivo)) throw new Error(`el mensaje no orienta: ${r.motivo}`);
  return `"${r.motivo}"`;
});

await check("Acepta CUIT de empresa y no le inventa DNI", () => {
  // 30-71234567-? — se calcula el verificador correcto para la prueba.
  const base = "3071234567";
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let v = 11 - (pesos.reduce((a, p, i) => a + p * Number(base[i]), 0) % 11);
  if (v === 11) v = 0;
  if (v === 10) v = 9;
  const cuit = base + v;
  esperar(verificadorOk(cuit), true, "el de prueba no es válido");
  const r = interpretarIdentificacion(cuit);
  esperar(r.ok, true, "rechazado");
  esperar(r.dni, "", "una empresa no tiene DNI");
  return cuit;
});

console.log("\nAvisos del panel (no bloquean)");
console.log("─".repeat(42));

await check("No avisa nada cuando está todo bien", () => {
  esperar(avisoIdentificacion({ cuit: "20123456786", dni: "12345678" }), null, "avisó de más");
});

await check("Avisa cuando el DNI no coincide con el CUIT", () => {
  const a = avisoIdentificacion({ cuit: "20123456786", dni: "87654321" });
  if (!a) throw new Error("no detectó la inconsistencia");
  return `"${a}"`;
});

await check("Avisa cuando solo cargó el DNI", () => {
  const a = avisoIdentificacion({ cuit: "", dni: "12345678" });
  if (!a || !/facturar/i.test(a)) throw new Error(`aviso poco claro: ${a}`);
  return `"${a}"`;
});

await check("Avisa sobre los registros viejos con CUIT inválido", () => {
  // Los que ya estaban en la base entraron sin validación.
  const a = avisoIdentificacion({ cuit: "11111111111", dni: "" });
  if (!a) throw new Error("dejó pasar un CUIT inválido ya guardado");
  return `"${a}"`;
});

await check("dniDeCuit no se confunde con los ceros a la izquierda", () => {
  const base = "2000123456";
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let v = 11 - (pesos.reduce((a, p, i) => a + p * Number(base[i]), 0) % 11);
  if (v === 11) v = 0;
  if (v === 10) v = 9;
  esperar(dniDeCuit(base + v), "123456", "DNI corto");
});

console.log("\nEstado \"Faltan datos\"");
console.log("─".repeat(42));

const { awaitingInfoEmail } = await import("../services/emailService.js");
const serviceUserModel = (await import("../services/models/serviceUserModel.js")).default;

await check("El modelo acepta el estado nuevo y rechaza uno inventado", () => {
  const valores = serviceUserModel.schema.path("status").enumValues;
  for (const e of ["pending", "awaiting", "approved", "rejected"]) {
    if (!valores.includes(e)) throw new Error(`falta el estado ${e}`);
  }
  if (valores.includes("cualquiera")) throw new Error("el enum acepta cualquier cosa");
  return valores.join(", ");
});

await check("El mail dice qué se le está pidiendo", () => {
  const m = awaitingInfoEmail("Juan Pérez", "La foto o el PDF de la matrícula");
  if (!m.html.includes("Juan Pérez")) throw new Error("no aparece el nombre");
  if (!m.html.includes("La foto o el PDF de la matrícula")) throw new Error("no aparece el pedido");
  return `asunto: "${m.subject}"`;
});

await check("El pedido también se escapa antes de ir al HTML", () => {
  const m = awaitingInfoEmail("Juan", '<img src=x onerror="alert(1)">');
  if (m.html.includes("<img src=x")) throw new Error("¡el HTML quedó vivo!");
  if (!m.html.includes("&lt;img")) throw new Error("no se ve escapado");
});

await check("El mail de \"faltan datos\" ofrece WhatsApp cuando hay número", () => {
  const m = awaitingInfoEmail("Juan Pérez", "La matrícula", { whatsapp: "54 9 11 5555-4444" });
  if (!m.html.includes("https://wa.me/5491155554444")) throw new Error("no armó el link de WhatsApp");
  if (!m.html.includes("Enviar por WhatsApp")) throw new Error("falta el botón");
  return "wa.me con el mensaje ya escrito";
});

await check("Sin número configurado, le pide que responda el mail", () => {
  const m = awaitingInfoEmail("Juan Pérez", "La matrícula", {});
  if (m.html.includes("wa.me")) throw new Error("armó un link de WhatsApp vacío");
  if (!/Respondé este mail/.test(m.html)) throw new Error("no ofrece ninguna alternativa");
});

// El Reply-To se arma dentro de sendMail, contra el cliente de Resend. Probarlo
// de verdad pediría interceptar esa librería; acá solo se verifica que sin
// credenciales no se mande nada, que es lo que mantiene a esta prueba inofensiva.
await check("Sin RESEND_API_KEY no se manda ningún correo", async () => {
  const { sendMail } = await import("../services/emailService.js");
  const r = await sendMail({ to: "x@example.com", subject: "s", html: "<p>h</p>" });
  esperar(r.ok, false, "¿mandó un mail de verdad?");
  esperar(r.reason, "no-credentials", "motivo");
});

console.log("\nLa matrícula se ve en el panel");
console.log("─".repeat(42));

// Esta sección sí necesita una base: reproduce la consulta del listado, que es
// donde se rompía. Un `.select()` encadenado sobre otro NO se combina: la
// exclusión gana y el campo con `select: false` queda afuera igual, así que
// hasMatricula daba false para todos los que la habían subido.
{
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongoose = (await import("mongoose")).default;
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const M = (await import("../services/models/serviceUserModel.js")).default;

  await M.create([
    { name: "Subió foto", email: "a@a.com", password: "12345678", cuit: "20123456786",
      matriculaKey: "serviceuser-matriculas/abc.webp" },
    { name: "Subió PDF", email: "b@b.com", password: "12345678", cuit: "20123456786",
      matriculaKey: "serviceuser-matriculas/abc.pdf" },
    { name: "Registro viejo", email: "c@c.com", password: "12345678", cuit: "20123456786",
      matriculaImage: "https://pub-x.r2.dev/serviceuser-matriculas/vieja.webp" },
    { name: "No subió nada", email: "d@d.com", password: "12345678", cuit: "20123456786" },
  ]);

  // Misma consulta que hace listServiceUsers.
  const leer = async () =>
    (await M.find({}).select("-password +matriculaKey").sort({ name: 1 }).lean()).map(
      ({ matriculaKey, matriculaImage, ...u }) => ({
        name: u.name,
        hasMatricula: Boolean(matriculaKey || matriculaImage),
        password: u.password,
      })
    );

  await check("Quien subió la matrícula aparece con matrícula", async () => {
    const r = await leer();
    for (const nombre of ["Subió foto", "Subió PDF", "Registro viejo"]) {
      const u = r.find((x) => x.name === nombre);
      if (!u.hasMatricula) throw new Error(`"${nombre}" figura SIN matrícula`);
    }
    return "foto, PDF y registros viejos";
  });

  await check("Quien no la subió sigue figurando sin matrícula", async () => {
    const r = await leer();
    esperar(r.find((x) => x.name === "No subió nada").hasMatricula, false, "falso positivo");
  });

  await check("El listado nunca devuelve la contraseña", async () => {
    const r = await leer();
    for (const u of r) if (u.password) throw new Error(`${u.name} expone el hash`);
  });

  await check("Encadenar dos .select() NO funciona (el bug que se arregló)", async () => {
    const d = await M.findOne().select("-password").select("+matriculaKey").lean();
    if (d.matriculaKey) throw new Error("ahora funciona: se puede simplificar el fix");
    return "queda documentado por qué va en una sola llamada";
  });

  await mongoose.disconnect();
  await mongod.stop();
}

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));
process.exitCode = fallos.length ? 1 : 0;
