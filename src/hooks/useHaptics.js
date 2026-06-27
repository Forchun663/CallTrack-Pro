/**
 * useHaptics — Cross-platform haptic feedback hook
 * Uses navigator.vibrate() on web/Android PWA
 * Maps to native Capacitor Haptics when running in a Capacitor shell
 */
export function useHaptics() {
  function vibrate(pattern) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  }

  return {
    /** Lightest tap — nav tabs, chip selections */
    light: () => vibrate(8),

    /** Standard button press, toggles */
    medium: () => vibrate(18),

    /** Success: lead saved, call logged */
    success: () => vibrate([12, 60, 18]),

    /** Destructive: delete, wipe */
    heavy: () => vibrate([30, 80, 40]),

    /** Error: auth fail, save error */
    error: () => vibrate([15, 40, 15, 40, 25]),

    /** Selection: checkbox toggle, pill filter */
    selection: () => vibrate(6),

    /** Double-tap confirm */
    confirm: () => vibrate([10, 50, 10]),
  };
}
