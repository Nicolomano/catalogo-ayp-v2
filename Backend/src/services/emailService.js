import nodemailer from "nodemailer";
import config from "../config/config.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.emailAccount,
    pass: config.emailPassword,
  },
});

/**
 * Envía un email. Si las credenciales no están configuradas, loguea y sigue.
 */
export async function sendMail({ to, subject, html }) {
  if (!config.emailAccount || !config.emailPassword) {
    console.warn("[emailService] Credenciales de Gmail no configuradas, email omitido.");
    return;
  }
  try {
    await transporter.sendMail({
      from: `"A&P Refrigeración" <${config.emailAccount}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[emailService] Error enviando email:", err.message);
  }
}

export function approvalEmail(userName) {
  return {
    subject: "¡Tu cuenta fue aprobada! — A&P Refrigeración",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#0033CC;margin-bottom:8px">¡Bienvenido, ${userName}!</h2>
        <p style="color:#374151">Tu cuenta de <strong>Precio Service</strong> en A&P Refrigeración fue <strong style="color:#16A34A">aprobada</strong>.</p>
        <p style="color:#374151">A partir de ahora podés iniciar sesión y acceder a los precios especiales para técnicos matriculados.</p>
        <a href="https://catalogoayp.vercel.app/login"
           style="display:inline-block;margin-top:16px;padding:10px 24px;background:#0033CC;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Iniciar sesión
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9CA3AF">A&P Refrigeración — Buenos Aires, Argentina</p>
      </div>`,
  };
}

export function rejectionEmail(userName, reason) {
  return {
    subject: "Actualización sobre tu solicitud — A&P Refrigeración",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#DC2626;margin-bottom:8px">Solicitud no aprobada</h2>
        <p style="color:#374151">Hola ${userName}, lamentablemente tu solicitud de cuenta service no pudo ser aprobada en este momento.</p>
        ${reason ? `<p style="color:#374151"><strong>Motivo:</strong> ${reason}</p>` : ""}
        <p style="color:#374151">Si tenés dudas, escribinos por WhatsApp o email y lo resolvemos.</p>
        <p style="margin-top:24px;font-size:12px;color:#9CA3AF">A&P Refrigeración — Buenos Aires, Argentina</p>
      </div>`,
  };
}
