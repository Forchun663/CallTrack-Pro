import { useCallback, useState, useRef } from "react";

const DURATION = 3200;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timeouts = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((p) => p.map((t) => t.id === id ? { ...t, hiding: true } : t));
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, 350);
  }, []);

  const push = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-3), { id, msg, type, hiding: false }]); // max 4 toasts
    timeouts.current[id] = setTimeout(() => dismiss(id), DURATION);
    return id;
  }, [dismiss]);

  return { toasts, push, dismiss };
}
