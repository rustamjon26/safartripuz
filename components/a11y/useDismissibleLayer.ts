"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard and focus behaviour for an open drawer or modal.
 *
 * The panel layouts all shipped a click-only `<div>` backdrop: a keyboard user
 * could open the drawer, could not close it, and could still Tab into the page
 * behind it. This adds the three things a dialog needs — Escape to close, focus
 * moved into the layer, and Tab kept inside it — without pulling in a library.
 *
 * Returns a ref to put on the panel element.
 */
export function useDismissibleLayer<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const panelRef = useRef<T | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    // Focus the panel itself rather than its first control: reading the drawer
    // from the top is more useful than landing on a random link.
    panel?.focus({ preventScroll: true });

    function focusableIn(el: HTMLElement): HTMLElement[] {
      return [
        ...el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((node) => node.offsetParent !== null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = focusableIn(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusTo.current?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  return panelRef;
}
