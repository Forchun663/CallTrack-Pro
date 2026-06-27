import { useCallback, useEffect, useRef } from "react";

/**
 * useNotifications — Local push notification scheduler
 * Requests Notification permission, schedules reminders for follow-up dates.
 */
export function useNotifications() {
  const permissionRef = useRef(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  /** Request permission on first use */
  async function requestPermission() {
    if (typeof Notification === "undefined") return "denied";
    if (permissionRef.current === "granted") return "granted";
    try {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
      return result;
    } catch (_) {
      return "denied";
    }
  }

  /**
   * Schedule a follow-up reminder for a given lead on the follow-up date at 9AM.
   * @param {object} lead
   */
  const scheduleFollowUp = useCallback(async (lead) => {
    if (!lead?.nextFollowUp || !lead?.businessName) return;

    const perm = await requestPermission();
    if (perm !== "granted") return;

    const followUpDate = new Date(lead.nextFollowUp + "T09:00:00");
    const now = Date.now();
    const msUntil = followUpDate.getTime() - now;

    // Only schedule if follow-up is in the future (within 7 days)
    if (msUntil <= 0 || msUntil > 7 * 24 * 60 * 60 * 1000) return;

    const notifKey = `notif_${lead.id}_${lead.nextFollowUp}`;
    if (sessionStorage.getItem(notifKey)) return; // Already scheduled this session

    sessionStorage.setItem(notifKey, "1");

    setTimeout(() => {
      try {
        new Notification("📞 CallTrack Follow-Up", {
          body: `Time to call ${lead.businessName}${lead.phone ? ` — ${lead.phone}` : ""}`,
          icon: "/icon-192.png",
          badge: "/badge-72.png",
          tag: `calltrack-followup-${lead.id}`,
          requireInteraction: true,
          silent: false,
        });
      } catch (e) {
        console.warn("Notification error:", e);
      }
    }, msUntil);
  }, []);

  /** Schedule notifications for all leads with upcoming follow-ups */
  const scheduleAll = useCallback(
    async (leads) => {
      if (!leads?.length) return;
      for (const lead of leads) {
        await scheduleFollowUp(lead);
      }
    },
    [scheduleFollowUp]
  );

  /** Check if notifications are supported and permitted */
  function getPermissionState() {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  }

  return { scheduleFollowUp, scheduleAll, requestPermission, getPermissionState };
}
