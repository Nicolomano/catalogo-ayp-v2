import { useEffect, useState } from "react";
import API from "../api/axios";

export default function WhatsappFloat() {
  const [number, setNumber] = useState("");

  useEffect(() => {
    API.get("/site-config")
      .then((r) => setNumber(r.data?.whatsapp || ""))
      .catch(() => {});
  }, []);

  if (!number) return null;

  const clean = number.replace(/\D/g, "");

  return (
    <a
      href={`https://wa.me/${clean}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
      className="fixed right-4 md:right-6 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl transition-all hover:scale-110 active:scale-95 group md:bottom-6 bottom-[92px]"
      style={{ background: "#25D366", boxShadow: "0 8px 24px rgba(37,211,102,0.4), 0 0 0 3px var(--accent-tint)" }}
    >
      {/* Label tooltip — solo desktop */}
      <span
        className="absolute right-16 whitespace-nowrap text-sm font-semibold text-white px-3 py-1.5 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 hidden md:block"
        style={{ background: "#25D366", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
      >
        Consultar por WhatsApp
      </span>

      <svg viewBox="0 0 32 32" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.003 2.667C8.638 2.667 2.667 8.638 2.667 16c0 2.358.627 4.67 1.817 6.694L2.667 29.333l6.825-1.789A13.29 13.29 0 0016.003 29.333c7.365 0 13.33-5.97 13.33-13.333S23.368 2.667 16.003 2.667zm0 24.267a11.056 11.056 0 01-5.635-1.543l-.404-.24-4.05 1.062 1.08-3.944-.264-.415a10.986 10.986 0 01-1.694-5.854c0-6.085 4.952-11.04 11.04-11.04 2.948 0 5.717 1.148 7.799 3.233a10.97 10.97 0 013.227 7.807c-.003 6.088-4.955 11.04-11.099 11.04v-.106zm6.059-8.27c-.331-.167-1.96-.968-2.264-1.079-.305-.107-.527-.167-.748.166-.223.33-.86 1.079-1.054 1.3-.196.222-.39.248-.72.083-.331-.166-1.398-.515-2.663-1.643-.984-.878-1.648-1.962-1.843-2.293-.194-.33-.02-.51.146-.674.15-.149.33-.389.496-.583.167-.194.222-.332.333-.554.11-.222.055-.416-.028-.583-.083-.167-.748-1.803-1.025-2.47-.27-.648-.545-.56-.748-.57l-.637-.011c-.222 0-.582.083-.888.415-.305.33-1.164 1.137-1.164 2.773 0 1.637 1.192 3.218 1.358 3.44.167.222 2.346 3.584 5.685 5.027.795.343 1.415.547 1.899.7.798.253 1.525.217 2.099.132.64-.096 1.97-.806 2.247-1.584.278-.778.278-1.445.194-1.584-.083-.14-.305-.222-.637-.389z"/>
      </svg>

      <span
        className="absolute inset-0 rounded-full wa-pulse"
        style={{ background: "#25D366" }}
      />
    </a>
  );
}
