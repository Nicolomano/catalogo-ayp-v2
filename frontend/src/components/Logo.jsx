// Logo de A&P recoloreable por tema.
// Usa el asset /logo-mark.png (silueta blanca con fondo transparente) como
// máscara y lo rellena con `color`. Por defecto usa var(--logo) (azul en modo
// claro, blanco en modo oscuro); pasá color="#fff" para fondos oscuros fijos.

const LOGO_RATIO = 1604 / 656; // proporción real del artwork (evita deformar)

export default function Logo({ height = 40, color = "var(--logo)", className = "", style = {} }) {
  const maskProps = {
    WebkitMaskImage: "url(/logo-mark.png)",
    maskImage: "url(/logo-mark.png)",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };

  return (
    <span
      role="img"
      aria-label="A&P Refrigeración"
      className={className}
      style={{
        display: "inline-block",
        height: `${height}px`,
        width: `${Math.round(height * LOGO_RATIO)}px`,
        backgroundColor: color,
        flexShrink: 0,
        ...maskProps,
        ...style,
      }}
    />
  );
}
