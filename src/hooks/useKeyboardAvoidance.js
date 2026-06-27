import { useEffect, useRef, useState } from "react";

/**
 * useKeyboardAvoidance — Tracks the visual viewport to detect keyboard open state.
 * Returns `keyboardOpen` (bool) and `keyboardHeight` (px).
 * Use to shift form containers above the software keyboard.
 */
export function useKeyboardAvoidance() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const baseHeight = useRef(window.innerHeight);

  useEffect(() => {
    function update() {
      const vv = window.visualViewport;
      if (!vv) return;

      const visible = vv.height;
      const total = window.screen.height;
      const diff = baseHeight.current - visible;

      if (diff > 80) {
        setKeyboardHeight(diff);
        setKeyboardOpen(true);
      } else {
        setKeyboardHeight(0);
        setKeyboardOpen(false);
      }
    }

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    } else {
      // Fallback: listen to window resize
      window.addEventListener("resize", update);
    }

    return () => {
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, []);

  return { keyboardOpen, keyboardHeight };
}
