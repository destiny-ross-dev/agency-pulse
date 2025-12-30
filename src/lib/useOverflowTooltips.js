import { useEffect } from "react";

function getCellText(cell) {
  return (cell.textContent || "").replace(/\s+/g, " ").trim();
}

function updateOverflowTooltips() {
  const cells = document.querySelectorAll(".table td, .funnel-table td");

  cells.forEach((cell) => {
    const text = getCellText(cell);
    if (!text) {
      cell.removeAttribute("title");
      return;
    }

    const isOverflowing = cell.scrollWidth > cell.clientWidth;
    if (isOverflowing) {
      cell.setAttribute("title", text);
    } else {
      cell.removeAttribute("title");
    }
  });
}

export default function useOverflowTooltips() {
  useEffect(() => {
    let rafId = null;
    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateOverflowTooltips();
      });
    };

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);
}
