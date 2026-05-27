import { useCallback } from "react";

export function useReveal(options = {}) {
  return useCallback((el) => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px", ...options }
    );
    observer.observe(el);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
