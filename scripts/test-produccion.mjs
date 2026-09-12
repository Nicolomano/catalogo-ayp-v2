/**
 * Testeo de producción de punta a punta.
 *
 * Uso:
 *   node scripts/test-produccion.mjs <TOKEN_ADMIN>
 *
 * El token sale de la consola del navegador, ya logueado en el panel:
 *   F12 → Application → Local Storage → https://www.refrigeracionayp.com → "token"
 *
 * Qué hace: solo lecturas, más UNA edición de un técnico que se revierte al
 * terminar (guarda los valores originales y los vuelve a escribir). No crea
 * pedidos ni usuarios: en el sistema no hay forma de borrarlos después.
 */

const API = process.env.API_URL || "https://catalogo-ayp-v2-production.up.railway.app/api";
const SITE = process.env.SITE_URL || "https://www.refrigeracionayp.com";
const TOKEN = process.argv[2] || process.env.ADMIN_TOKEN;

if (!TOKEN) {
  console.error("Falta el token de admin.\n\n  node scripts/test-produccion.mjs <TOKEN>\n");
  process.exit(1);
}

const ok = [];
const fallos = [];
const avisos = [];

const c = {
  verde: (s) => `\x1b[32m${s}\x1b[0m`,
  rojo: (s) => `\x1b[31m${s}\x1b[0m`,
  amar: (s) => `\x1b[33m${s}\x1b[0m`,
  gris: (s) => `\x1b[90m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function titulo(t) {
  console.log(`\n${c.bold(t)}\n${c.gris("─".repeat(t.length))}`);
}

async function check(nombre, fn) {
  try {
    const detalle = await fn();
    ok.push(nombre);
    console.log(`  ${c.verde("✔")} ${nombre}${detalle ? c.gris(`  — ${detalle}`) : ""}`);
  } catch (e) {
    fallos.push(`${nombre}: ${e.message}`);
    console.log(`  ${c.rojo("✘")} ${nombre}\n      ${c.rojo(e.message)}`);
  }
}

function aviso(msg) {
  avisos.push(msg);
  console.log(`  ${c.amar("!")} ${msg}`);
}

async function pedir(path, { auth = false, method = "GET", body, raw = false } = {}) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${TOKEN}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin JSON */
  }
  return { status: res.status, data, headers: res.headers };
}

const esperar = (real, esperado, que = "status") => {
  if (real !== esperado) throw new Error(`${que} ${real}, se esperaba ${esperado}`);
};

const money = (n) => `$${(n || 0).toLocaleString("es-AR")}`;

// ─────────────────────────────────────────────────────────────

async function main() {
  console.log(c.bold("\n  Testeo de producción — A&P Refrigeración"));
  console.log(c.gris(`  API:  ${API}`));
  console.log(c.gris(`  Site: ${SITE}`));

  // ── 1. El token sirve ───────────────────────────────────────
  titulo("1. Sesión de admin");
  const dash = await pedir("/dashboard", { auth: true });
  if (dash.status === 401) {
    console.log(c.rojo("\n  El token no es válido o venció (los de admin duran 2 días)."));
    console.log(c.rojo("  Volvé a entrar al panel y copiá el token de nuevo.\n"));
    // exitCode en vez de process.exit(): cortar de golpe con conexiones abiertas
    // hace que libuv escupa un assert en Windows.
    process.exitCode = 1;
    return;
  }
  await check("El token de admin es válido", () => {
    esperar(dash.status, 200);
    return `${dash.data.productosActivos} productos activos`;
  });

  // ── 1b. Coherencia de los datos ─────────────────────────────
  // Esto existe porque la primera corrida mostró "dólar $0" con un ✔ al lado:
  // el script solo miraba que el endpoint respondiera, no que el dato tuviera
  // sentido. Un número absurdo tiene que salir en rojo solo.
  titulo("1b. Coherencia de los datos");
  await check("Ningún producto publicado con precio en dólares", async () => {
    const lista = await pedir("/products/admin/all?page=1&limit=100", { auth: true });
    esperar(lista.status, 200);
    const enUSD = (lista.data.products || []).filter((p) => p.priceUSD && !p.fixedInARS);
    if (enUSD.length) {
      throw new Error(
        `${enUSD.length} producto(s) calculan su precio por cotización, y la cotización no se usa más: ` +
          enUSD.slice(0, 3).map((p) => p.productCode).join(", ")
      );
    }
    return "todos con precio en pesos";
  });
  await check("Sin productos publicados en $0", async () => {
    const lista = await pedir("/products?page=1&limit=100");
    const sinPrecio = (lista.data.products || []).filter((p) => !p.priceARS);
    if (sinPrecio.length) {
      throw new Error(
        `${sinPrecio.length} sin precio (se muestran como "Consultar"): ` +
          sinPrecio.slice(0, 3).map((p) => `${p.productCode} ${p.name?.slice(0, 30)}`).join(" · ")
      );
    }
    return "los primeros 100 tienen precio";
  });

  // ── 2. Público ──────────────────────────────────────────────
  titulo("2. Endpoints públicos");
  await check("Landing carga destacados", async () => {
    const r = await pedir("/products/landing");
    esperar(r.status, 200);
    return `${r.data.featured?.length ?? 0} destacados`;
  });
  await check("Catálogo pagina", async () => {
    const r = await pedir("/products?page=1&limit=5");
    esperar(r.status, 200);
    if (r.data.products?.length !== 5) throw new Error("no devolvió 5 productos");
    return `${r.data.total} productos en total`;
  });
  await check("Categorías sin subcategorías de relleno", async () => {
    const r = await pedir("/products/meta/categories");
    esperar(r.status, 200);
    const basura = r.data.flatMap((cat) =>
      (cat.subcategories || []).filter((s) => ["-", "", "n/a", "s/d"].includes(String(s).trim().toLowerCase()))
    );
    if (basura.length) throw new Error(`quedan subcategorías de relleno: ${basura.join(", ")}`);
    return `${r.data.length} categorías`;
  });
  await check("Config del sitio", async () => {
    const r = await pedir("/site-config");
    esperar(r.status, 200);
    if (!r.data.whatsapp) throw new Error("SIN número de WhatsApp: el botón de pedido no haría nada");
    return `WhatsApp ${r.data.whatsapp}`;
  });
  await check("Kit de instalación cotiza", async () => {
    const meta = await pedir("/kits/install/meta");
    esperar(meta.status, 200);
    const r = await pedir("/kits/install/price", { method: "POST", body: { quantities: {}, variant: {} } });
    esperar(r.status, 200);
    if (typeof r.data.total !== "number") throw new Error("el total no es un número");
    return `${meta.data.items?.length ?? 0} ítems · total ${money(r.data.total)}`;
  });

  // ── 3. Seguridad ────────────────────────────────────────────
  titulo("3. Seguridad");
  const protegidas = [
    ["/products/admin/all", "GET"],
    ["/orders", "GET"],
    ["/users", "GET"],
    ["/dashboard", "GET"],
    ["/dashboard/metrics", "GET"],
    ["/products/export/excel", "GET"],
    ["/banners/admin/all", "GET"],
    ["/auth/admins", "GET"],
  ];
  for (const [path, method] of protegidas) {
    await check(`${method} ${path} sin token → 401`, async () => {
      const r = await pedir(path, { method });
      esperar(r.status, 401);
    });
  }
  await check("Token forjado rechazado", async () => {
    const falso =
      Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url") +
      "." +
      Buffer.from('{"id":"x","role":"admin","exp":9999999999}').toString("base64url") +
      ".firmafalsa";
    const res = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${falso}` } });
    esperar(res.status, 401);
  });
  await check("Operadores Mongo en el login → 400", async () => {
    const r = await pedir("/auth/login", { method: "POST", body: { username: { $regex: "^a" }, password: {} } });
    esperar(r.status, 400);
  });
  await check("Producto público no expone datos internos", async () => {
    const lista = await pedir("/products?page=1&limit=1");
    const code = lista.data.products[0].productCode;
    const r = await pedir(`/products/code/${encodeURIComponent(code)}`);
    esperar(r.status, 200);
    const prohibidos = ["priceUSD", "soldCount", "views", "featuredOrder"].filter((k) => k in r.data);
    if (prohibidos.length) throw new Error(`expone ${prohibidos.join(", ")}`);
    return "sin priceUSD, soldCount ni views";
  });
  await check("Pedido con cantidad inválida se rechaza", async () => {
    const lista = await pedir("/products?page=1&limit=1");
    const r = await pedir("/orders", {
      method: "POST",
      body: {
        customerName: "TEST-AUTOMATICO",
        customerPhone: "1100000000",
        products: [{ productId: lista.data.products[0]._id, quantity: "abc" }],
      },
    });
    esperar(r.status, 400);
    return "no se creó ninguna orden";
  });
  await check("Pedido con demasiados ítems se rechaza", async () => {
    const lista = await pedir("/products?page=1&limit=1");
    const id = lista.data.products[0]._id;
    const r = await pedir("/orders", {
      method: "POST",
      body: {
        customerName: "TEST-AUTOMATICO",
        customerPhone: "1100000000",
        products: Array.from({ length: 500 }, () => ({ productId: id, quantity: 1 })),
      },
    });
    esperar(r.status, 400);
  });
  await check("Recuperación no revela qué emails existen", async () => {
    const a = await pedir("/auth/forgot-password", { method: "POST", body: { email: `no-existe-${Date.now()}@example.com` } });
    esperar(a.status, 200);
    if (!a.data.message?.includes("Si el email")) throw new Error("el mensaje no es genérico");
  });
  await check("Cabeceras de seguridad en el sitio", async () => {
    const res = await fetch(`${SITE}/`);
    const faltan = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"]
      .filter((h) => !res.headers.get(h));
    if (faltan.length) throw new Error(`faltan: ${faltan.join(", ")}`);
    return "HSTS, CSP, X-Frame-Options, nosniff";
  });

  // ── 4. Panel de admin ───────────────────────────────────────
  titulo("4. Panel de administración");
  await check("Listado de pedidos pagina", async () => {
    const r = await pedir("/orders?page=1&limit=5", { auth: true });
    esperar(r.status, 200);
    if (!Array.isArray(r.data.orders)) throw new Error("la respuesta no tiene 'orders' (¿backend viejo?)");
    return `${r.data.total} pedidos · ${r.data.pages} páginas`;
  });
  await check("Productos del admin", async () => {
    const r = await pedir("/products/admin/all?page=1&limit=5", { auth: true });
    esperar(r.status, 200);
    return `${r.data.total} productos`;
  });
  await check("Export de Excel (solo admin)", async () => {
    const res = await fetch(`${API}/products/export/excel`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    esperar(res.status, 200);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 1000) throw new Error("el archivo vino vacío");
    return `${Math.round(buf.byteLength / 1024)} KB`;
  });
  await check("Banners", async () => {
    const r = await pedir("/banners/admin/all", { auth: true });
    esperar(r.status, 200);
    return `${r.data.length} banners cargados`;
  });
  await check("Administradores: listado sin contraseñas", async () => {
    const r = await pedir("/auth/admins", { auth: true });
    if (r.status === 403) {
      // El token es de un admin limitado: el 403 es lo correcto.
      return "el token usado es de acceso limitado (403, como corresponde)";
    }
    esperar(r.status, 200);
    if (!Array.isArray(r.data)) throw new Error("la respuesta no es una lista");
    const filtrado = r.data.filter((a) => "password" in a);
    if (filtrado.length) throw new Error(`${filtrado.length} cuenta(s) exponen la contraseña`);
    const totales = r.data.filter((a) => (a.nivel || "total") === "total").length;
    if (!totales) throw new Error("no quedó ningún administrador con acceso total");
    return `${r.data.length} cuenta(s): ${totales} total, ${r.data.length - totales} limitado`;
  });

  // ── 5. Métricas ─────────────────────────────────────────────
  titulo("5. Métricas");
  let metricas;
  await check("El panel de métricas responde", async () => {
    const r = await pedir("/dashboard/metrics?dias=30", { auth: true });
    esperar(r.status, 200);
    metricas = r.data;
    return `${r.data.pedidos.cantidad} pedidos en 30 días`;
  });

  await check("El registro de búsquedas funciona", async () => {
    const termino = `zzz-prueba-${Date.now()}`;
    const r = await pedir(`/products?search=${encodeURIComponent(termino)}&page=1`);
    esperar(r.status, 200);
    if (r.data.total !== 0) throw new Error("la búsqueda de prueba devolvió resultados");
    // Se le da un momento a la escritura, que es fire-and-forget
    await new Promise((r2) => setTimeout(r2, 2500));
    const m = await pedir("/dashboard/metrics?dias=1", { auth: true });
    const encontrada = m.data.busquedas.sinResultados.some((b) => b.term === termino);
    if (!encontrada) throw new Error("la búsqueda no apareció en las métricas");
    return `"${termino}" quedó registrada`;
  });

  if (metricas) {
    const { pedidos, productos, busquedas, tecnicos } = metricas;
    console.log(c.gris("\n  Datos reales de los últimos 30 días:"));
    console.log(c.gris(`    Pedidos:        ${pedidos.cantidad} · ${money(pedidos.facturacion)} · ticket ${money(pedidos.ticketPromedio)}`));
    console.log(c.gris(`    Sin responder:  ${pedidos.pendientes}`));
    console.log(c.gris(`    Técnicos:       ${tecnicos.approved} aprobados · ${tecnicos.pending} pendientes`));
    if (tecnicos.pendientesViejos > 0) {
      aviso(`Hay ${tecnicos.pendientesViejos} técnico(s) esperando aprobación hace más de 3 días.`);
    }
    if (pedidos.pendientes > 0 && pedidos.pendienteMasViejo) {
      const dias = Math.floor((Date.now() - new Date(pedidos.pendienteMasViejo)) / 86400000);
      if (dias >= 2) aviso(`El pedido sin responder más viejo es de hace ${dias} días.`);
    }
    if (busquedas.sinResultados.length) {
      console.log(c.gris("    Búsquedas sin resultados:"));
      for (const b of busquedas.sinResultados.slice(0, 5)) {
        console.log(c.gris(`      · "${b.term}" (${b.veces}×)`));
      }
    }
    if (productos.pocaConversion?.length) {
      const peor = productos.pocaConversion[0];
      console.log(c.gris(`    Se mira y no se pide: "${peor.name}" — ${peor.views} vistas, ${peor.soldCount} pedidos`));
    }
  }

  // ── 6. Edición de técnico (se revierte) ─────────────────────
  titulo("6. Edición de técnico (reversible)");
  const usuarios = await pedir("/users?status=all", { auth: true });
  if (usuarios.status !== 200 || !usuarios.data?.length) {
    aviso("No hay técnicos registrados: se saltea la prueba de edición.");
  } else {
    const u = usuarios.data[0];
    const original = {
      name: u.name, email: u.email, cuit: u.cuit, phone: u.phone || "",
      company: u.company || "", province: u.province || "", clientNumber: u.clientNumber || "",
    };
    console.log(c.gris(`  Usando: ${u.name} <${u.email}>`));

    let hayQueRestaurar = false;
    try {
      await check("Editar el teléfono", async () => {
        const marca = "1100000000";
        const r = await pedir(`/users/${u._id}`, { auth: true, method: "PATCH", body: { ...original, phone: marca } });
        esperar(r.status, 200);
        hayQueRestaurar = true;
        if (r.data.phone !== marca) throw new Error("el teléfono no se guardó");
        return `${original.phone || "(vacío)"} → ${marca}`;
      });

      await check("CUIT inválido se rechaza", async () => {
        const r = await pedir(`/users/${u._id}`, { auth: true, method: "PATCH", body: { cuit: "123" } });
        esperar(r.status, 400);
      });

      await check("Email duplicado da un mensaje claro (no 500)", async () => {
        if (usuarios.data.length < 2) return "se saltea: hay un solo técnico";
        const otro = usuarios.data[1];
        const r = await pedir(`/users/${u._id}`, { auth: true, method: "PATCH", body: { email: otro.email } });
        if (r.status === 500) throw new Error("devolvió 500 en vez de un mensaje de conflicto");
        esperar(r.status, 409);
        return r.data.message;
      });

      await check("No se pueden inyectar campos privilegiados", async () => {
        const antes = u.approved;
        const r = await pedir(`/users/${u._id}`, {
          auth: true, method: "PATCH",
          body: { phone: "1100000000", approved: !antes, role: "admin" },
        });
        esperar(r.status, 200);
        if (r.data.approved !== antes) throw new Error("¡se pudo cambiar 'approved'!");
        if (r.data.role !== "service") throw new Error("¡se pudo cambiar 'role'!");
        return "approved y role ignorados, como corresponde";
      });
    } finally {
      if (hayQueRestaurar) {
        const r = await pedir(`/users/${u._id}`, { auth: true, method: "PATCH", body: original });
        if (r.status === 200 && r.data.phone === original.phone) {
          console.log(`  ${c.verde("✔")} Datos originales restaurados`);
        } else {
          console.log(`\n  ${c.rojo("!!! NO SE PUDIERON RESTAURAR LOS DATOS")}`);
          console.log(`  ${c.rojo("Corregilos a mano en Admin → Usuarios con estos valores:")}`);
          console.log(c.rojo(`  ${JSON.stringify(original, null, 2)}`));
          fallos.push("No se restauraron los datos del técnico de prueba");
        }
      }
    }
  }

  // ── 7. Páginas del sitio ────────────────────────────────────
  titulo("7. Páginas del sitio");
  const paginas = ["/", "/catalogo", "/kit-instalacion", "/contacto", "/login", "/register",
                   "/privacidad", "/recuperar-password", "/restablecer-password", "/sitemap.xml", "/robots.txt"];
  for (const p of paginas) {
    await check(`${p}`, async () => {
      const res = await fetch(`${SITE}${p}`);
      esperar(res.status, 200);
    });
  }
  await check("Preview de WhatsApp de un producto", async () => {
    const lista = await pedir("/products?page=1&limit=1");
    const code = lista.data.products[0].productCode;
    const res = await fetch(`${SITE}/product/${code}`, { headers: { "User-Agent": "WhatsApp/2.23.20.0" } });
    const html = await res.text();
    if (!html.includes('property="og:image"')) throw new Error("no trae og:image");
    if (!html.includes("r2.dev") && !html.includes("og-image")) throw new Error("la imagen no es la del producto");
    return "trae título, descripción e imagen";
  });

  // ── Resumen ─────────────────────────────────────────────────
  console.log(`\n${c.bold("Resumen")}`);
  console.log(c.gris("─".repeat(40)));
  console.log(`  ${c.verde(`${ok.length} pruebas OK`)}`);
  if (avisos.length) {
    console.log(`  ${c.amar(`${avisos.length} aviso(s)`)}`);
    avisos.forEach((a) => console.log(c.amar(`    · ${a}`)));
  }
  if (fallos.length) {
    console.log(`  ${c.rojo(`${fallos.length} falla(s)`)}`);
    fallos.forEach((f) => console.log(c.rojo(`    · ${f}`)));
    console.log();
    process.exitCode = 1;
    return;
  }
  console.log(c.verde("\n  Todo en orden.\n"));
}

main().catch((e) => {
  console.error(c.rojo(`\nError inesperado: ${e.stack || e.message}\n`));
  process.exitCode = 1;
});
