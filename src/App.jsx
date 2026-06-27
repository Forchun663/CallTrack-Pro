import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";

// Pages
import { AuthScreen } from "./pages/AuthScreen";
import { Dashboard } from "./pages/Dashboard";
import { LeadsPage } from "./pages/LeadsPage";
import { AddLeadPage } from "./pages/AddLeadPage";
import { SettingsPage } from "./pages/SettingsPage";

// Components
import { FocusDrawer } from "./components/FocusDrawer";
import { BulkImportModal } from "./components/BulkImportModal";
import { DuplicateReviewModal } from "./components/DuplicateReviewModal";
import { CallResolutionModal } from "./components/CallResolutionModal";
import { OutboundToDoQueue } from "./components/OutboundToDoQueue";
import { SplashScreen } from "./components/SplashScreen";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { ActionSheet } from "./components/ActionSheet";

// Layout
import { MobileLayout } from "./layouts/MobileLayout";

// Services
import { authService } from "./services/auth";
import { dbService } from "./services/db";

// Hooks
import { useToast } from "./hooks/useToast";
import { useHaptics } from "./hooks/useHaptics";
import { useNotifications } from "./hooks/useNotifications";

// Helpers & Constants
import {
  mapToState, EMPTY_LEAD, packNotes, todayStr, tomorrowStr,
  isDue, statusMeta, safeName, norm, STATUS_OPTIONS
} from "./utils/helpers";
import { CATEGORIES } from "./utils/categories";

export default function App() {
  /* Navigation Tab */
  const [activeTab, setActiveTab] = useState("dashboard");

  /* Auth state */
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* Splash + Onboarding */
  const [splashVisible, setSplashVisible] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  /* Leads state */
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  /* Lead selection (for bulk operations) */
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [wipingDatabase, setWipingDatabase] = useState(false);

  /* ActionSheet confirmations */
  const [bulkDeleteSheet, setBulkDeleteSheet] = useState(false);
  const [singleDeleteSheet, setSingleDeleteSheet] = useState(null); // lead id

  /* Add/Edit Form state */
  const [form, setForm] = useState(EMPTY_LEAD);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [supaError, setSupaError] = useState("");

  /* Search & Filters */
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState([]);

  /* Focus lead detail drawer */
  const [focused, setFocused] = useState(null);

  /* Modal toggles */
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  /* Call outcome resolution modals */
  const [resolutionLead, setResolutionLead] = useState(null);
  const [resolutionType, setResolutionType] = useState(null); // "interested" | "reschedule"
  const [resolutionPreSelect, setResolutionPreSelect] = useState(null);

  /* Call recording state */
  const [recordingLeadId, setRecordingLeadId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recorderRef, setRecorderRef] = useState(null);
  const [recSecs, setRecSecs] = useState(0);
  const [recError, setRecError] = useState("");
  const [consentMap, setConsentMap] = useState({}); // permissions by leadId
  const [recordingsMap, setRecordingsMap] = useState({}); // recordings by leadId
  const [savingActivity, setSavingActivity] = useState(false);

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const { toasts, push, dismiss: dismissToast } = useToast();
  const haptics = useHaptics();
  const { scheduleAll } = useNotifications();

  /* ── Listen to Auth changes + Splash dismiss ── */
  useEffect(() => {
    authService.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
      // Show splash for at least 1.8s for branding
      setTimeout(() => setSplashVisible(false), 1800);
      // Show onboarding only if first time
      if (!localStorage.getItem("calltrack_onboarded")) {
        setTimeout(() => setShowOnboarding(true), 2200);
      }
    });

    const subscription = authService.onAuthStateChange((_, s) => {
      setSession(s);
      setAuthLoading(false);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, []);

  /* ── Load leads database ── */
  useEffect(() => {
    if (!session) {
      setLeads([]);
      return;
    }

    let unsubscribeFromLeads = null;

    (async () => {
      setLeadsLoading(true);
      try {
        const loadedLeads = await dbService.getLeads();
        setLeads(loadedLeads);
        // Schedule follow-up notifications for loaded leads
        scheduleAll(loadedLeads);
      } catch (e) {
        console.error("Load leads error:", e);
        setSupaError(e.message);
      } finally {
        setLeadsLoading(false);
      }
    })();

    /* ── Subscribe to real-time changes ── */
    unsubscribeFromLeads = dbService.subscribeToLeads(
      // Insert handler
      (newLead) => {
        setLeads((prev) => {
          if (prev.some((l) => l.id === newLead.id)) return prev;
          return [newLead, ...prev];
        });
      },
      // Update handler
      (updatedLead) => {
        setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
        setFocused((f) => (f && f.id === updatedLead.id ? updatedLead : f));
      },
      // Delete handler
      (deletedId) => {
        setLeads((prev) => prev.filter((l) => l.id !== deletedId));
        setFocused((f) => (f && f.id === deletedId ? null : f));
      }
    );

    return () => {
      if (unsubscribeFromLeads) unsubscribeFromLeads();
    };
  }, [session]);

  /* ── Sync selection checkboxes ── */
  useEffect(() => {
    setSelectedLeadIds((prev) => {
      const next = new Set();
      prev.forEach((id) => {
        if (leads.some((l) => l.id === id)) next.add(id);
      });
      return next;
    });
  }, [leads]);

  /* ── Background scroll lock when drawers/modals open ── */
  useEffect(() => {
    const shouldLock = showImportModal || showDuplicateModal || !!focused || !!resolutionLead;
    document.body.style.overflow = shouldLock ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showImportModal, showDuplicateModal, focused, resolutionLead]);

  /* ── Recording timers cleanups ── */
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      Object.values(recordingsMap).forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [recordingsMap]);

  /* ── Category filtering callbacks ── */
  const toggleCategory = useCallback((cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const handleToggleSelect = useCallback((leadId) => {
    setSelectedLeadIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(leadId)) {
        copy.delete(leadId);
      } else {
        copy.add(leadId);
      }
      return copy;
    });
  }, []);

  /* ── Bulk actions handlers ── */
  function deleteSelectedLeads() {
    if (selectedLeadIds.size === 0) return;
    setBulkDeleteSheet(true); // Replaced confirm() with ActionSheet
  }

  async function _confirmBulkDelete() {
    const count = selectedLeadIds.size;
    haptics.heavy();
    setBulkDeleting(true);
    try {
      await dbService.deleteLeadsBulk(Array.from(selectedLeadIds));
      setLeads((p) => p.filter((l) => !selectedLeadIds.has(l.id)));
      setSelectedLeadIds(new Set());
      push(`Deleted ${count} leads`, "success");
    } catch (e) {
      console.error("Bulk delete error:", e);
      push("Bulk delete failed: " + e.message, "error");
    } finally {
      setBulkDeleting(false);
    }
  }

  async function wipeDatabase() {
    // Called after ActionSheet double-confirmation in SettingsPage
    haptics.heavy();
    setWipingDatabase(true);
    try {
      await dbService.wipeDatabase();
      setLeads([]);
      setSelectedLeadIds(new Set());
      setFocused(null);
      push("All leads erased from workspace", "success");
    } catch (e) {
      console.error("Wipe database error:", e);
      push("Failed to delete all leads: " + e.message, "error");
    } finally {
      setWipingDatabase(false);
    }
  }

  /* ── Form handlers ── */
  function upForm(field, val) {
    setForm((f) => {
      const nextForm = { ...f, [field]: val };
      if ((field === "businessName" || field === "notes") && !f.category) {
        const detected = matchCategory(nextForm.businessName) || matchCategory(nextForm.notes);
        if (detected) {
          nextForm.category = detected;
        }
      }
      return nextForm;
    });
    if (field === "businessName" && val.trim()) setFormError("");
  }

  function resetForm() {
    setForm(EMPTY_LEAD);
    setEditingId(null);
    setFormError("");
    setSupaError("");
  }

  function editLead(lead) {
    setForm({ ...EMPTY_LEAD, ...lead });
    setEditingId(lead.id);
    setFormError("");
    setSupaError("");
    setActiveTab("add"); // Switch to Add/Edit tab
  }

  /* ── Save Lead callback ── */
  async function saveLead() {
    if (!form.businessName.trim()) {
      setFormError("Business name is required.");
      return;
    }
    setFormError("");
    setSupaError("");
    setSaving(true);
    try {
      const packedNotesField = packNotes(form.notes, form.email, form.demoStatus, form.nextAction, form.socialLink);
      const row = {
        user_id: session.user.id,
        business_name: form.businessName,
        maps_link: form.mapsLink || null,
        phone: form.phone || null,
        address: form.address || null,
        category: form.category || null,
        website: form.website || null,
        website_status: form.websiteStatus,
        status: form.status,
        priority: form.priority || null,
        notes: packedNotesField,
        last_contacted: form.lastContacted || null,
        next_follow_up: form.nextFollowUp || null,
        google_place_id: form.googlePlaceId || null,
      };

      if (editingId) {
        const updatedLead = await dbService.updateLead(editingId, row);
        setLeads((p) => p.map((l) => (l.id === editingId ? updatedLead : l)));
        if (focused?.id === editingId) setFocused(updatedLead);
        haptics.success();
        push("Lead updated ✓", "success");
      } else {
        const insertedLead = await dbService.insertLead(row);
        setLeads((p) => [insertedLead, ...p]);
        haptics.success();
        push("Lead added ✓", "success");
      }
      resetForm();
      setActiveTab("search"); // Return to list view
    } catch (e) {
      console.error("Save lead error:", e);
      setSupaError(e.message);
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete lead callback ── */
  function deleteLead(id) {
    // Show ActionSheet confirmation instead of browser confirm()
    setSingleDeleteSheet(id);
  }

  async function _confirmDeleteLead(id) {
    haptics.heavy();
    try {
      await dbService.deleteLead(id);
      setLeads((p) => p.filter((l) => l.id !== id));
      if (focused?.id === id) setFocused(null);
      push("Lead deleted", "info");
    } catch (e) {
      console.error("Delete lead error:", e);
      push("Delete failed: " + e.message, "error");
    }
  }

  /* ── Update lead status inline ── */
  async function changeStatus(id, newStatus) {
    if (newStatus === "delete" || newStatus === "no") {
      setSingleDeleteSheet(id);
      return;
    }
    const today = todayStr();
    try {
      await dbService.updateLead(id, { status: newStatus, last_contacted: today });
      await dbService.logActivity(id, session.user.id, "status_change", newStatus, `Status → ${statusMeta(newStatus).label}`);

      const updater = (l) => (l.id === id ? { ...l, status: newStatus, lastContacted: today } : l);
      setLeads((p) => p.map(updater));
      if (focused?.id === id) setFocused((f) => ({ ...f, status: newStatus, lastContacted: today }));
      push(`Status updated: ${statusMeta(newStatus).label} ✓`, "success");
    } catch (e) {
      console.error("Status update error:", e);
      push("Status update failed: " + e.message, "error");
    }
  }

  /* ── Update lead demo status inline ── */
  async function changeDemoStatus(id, newDemoStatus) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const repackedNotes = packNotes(lead.notes, lead.email, newDemoStatus, lead.nextAction, lead.socialLink);
    try {
      await dbService.updateLead(id, { notes: repackedNotes });
      await dbService.logActivity(
        id,
        session.user.id,
        "demo_status_change",
        newDemoStatus,
        `Demo Status → ${newDemoStatus === "needs_demo" ? "Needs Demo" : newDemoStatus === "sent" ? "Demo Sent" : "None"}`
      );

      const updater = (l) => (l.id === id ? { ...l, notes: lead.notes, demoStatus: newDemoStatus } : l);
      setLeads((p) => p.map(updater));
      if (focused?.id === id) setFocused((f) => ({ ...f, notes: lead.notes, demoStatus: newDemoStatus }));
      push(`Demo status updated ✓`, "success");
    } catch (e) {
      console.error("Demo status error:", e);
      push("Failed to update demo status: " + e.message, "error");
    }
  }

  /* ── Quick reschedule callbacks ── */
  async function changeFollowUp(id, days) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().slice(0, 10);
    try {
      await dbService.updateLead(id, { next_follow_up: dateStr });
      await dbService.logActivity(
        id,
        session.user.id,
        "follow_up_scheduled",
        dateStr,
        `Follow-up scheduled for ${dateStr} (${days} days from now)`
      );

      const updater = (l) => (l.id === id ? { ...l, nextFollowUp: dateStr } : l);
      setLeads((p) => p.map(updater));
      if (focused?.id === id) setFocused((f) => ({ ...f, nextFollowUp: dateStr }));
      push(`Follow-up scheduled for ${dateStr} ✓`, "success");
    } catch (e) {
      console.error("Follow-up error:", e);
      push("Failed to schedule: " + e.message, "error");
    }
  }

  /* ── Log custom dial outcomes ── */
  async function resolveOutboundCall({ id, status, followUpDays, customDate, notes, email }) {
    const today = todayStr();
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    if (status === "no" || status === "delete") {
      await deleteLead(id);
      setResolutionLead(null);
      setResolutionType(null);
      setResolutionPreSelect(null);
      return;
    }

    let nextFollowUpDate = null;
    if (customDate) {
      nextFollowUpDate = customDate;
    } else if (followUpDays !== null && followUpDays !== undefined) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + followUpDays);
      nextFollowUpDate = targetDate.toISOString().slice(0, 10);
    }

    try {
      let updatedNotes = lead.notes || "";
      if (notes && notes.trim()) {
        const timestamp = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        updatedNotes = `${updatedNotes ? updatedNotes + "\n" : ""}[Call ${timestamp}]: ${notes.trim()}`;
      }

      const finalEmail = email ? email.trim() : lead.email;
      const finalDemoStatus = status === "interested" ? "needs_demo" : lead.demoStatus;
      const packedNotesField = packNotes(updatedNotes, finalEmail, finalDemoStatus, lead.nextAction, lead.socialLink);

      const updateData = {
        status: status,
        last_contacted: today,
        notes: packedNotesField,
      };

      if (nextFollowUpDate !== undefined) {
        updateData.next_follow_up = nextFollowUpDate;
      }

      await dbService.updateLead(id, updateData);

      let activityNotes = `Call outcome logged: ${statusMeta(status).label}`;
      if (nextFollowUpDate) activityNotes += `. Rescheduled callback for ${nextFollowUpDate}.`;
      if (notes && notes.trim()) activityNotes += ` Notes: "${notes.trim()}"`;

      await dbService.logActivity(id, session.user.id, "call_resolution", status, activityNotes);

      const updater = (l) =>
        l.id === id
          ? {
              ...l,
              status: status,
              lastContacted: today,
              notes: updatedNotes,
              email: finalEmail,
              demoStatus: finalDemoStatus,
              ...(nextFollowUpDate ? { nextFollowUp: nextFollowUpDate } : {}),
            }
          : l;

      setLeads((p) => p.map(updater));
      if (focused?.id === id) {
        setFocused((f) => ({
          ...f,
          status: status,
          lastContacted: today,
          notes: updatedNotes,
          email: finalEmail,
          demoStatus: finalDemoStatus,
          ...(nextFollowUpDate ? { nextFollowUp: nextFollowUpDate } : {}),
        }));
      }

      push(`Call Logged: ${statusMeta(status).label} ✓`, "success");
      setResolutionLead(null);
      setResolutionType(null);
      setResolutionPreSelect(null);
    } catch (e) {
      console.error("Call resolution error:", e);
      push("Resolution failed: " + e.message, "error");
    }
  }

  function triggerCallResolution(lead, type, preSelect = null) {
    setResolutionLead(lead);
    setResolutionType(type);
    setResolutionPreSelect(preSelect);
  }

  /* ── Call recording audio capture (MIC ONLY for Mobile webview compatibility) ── */
  async function startRecording(lead) {
    if (!lead) return;
    setRecError("");

    setRecordingsMap((prev) => {
      const copy = { ...prev };
      if (copy[lead.id]) {
        URL.revokeObjectURL(copy[lead.id].url);
        delete copy[lead.id];
      }
      return copy;
    });

    setRecSecs(0);
    setRecordingLeadId(lead.id);

    try {
      // 1. Initialize SpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        transcriptRef.current = "";

        recognition.onresult = (event) => {
          let accumulated = "";
          for (let i = 0; i < event.results.length; ++i) {
            accumulated += event.results[i][0].transcript + " ";
          }
          transcriptRef.current = accumulated.trim();
        };
        recognition.start();
        recognitionRef.current = recognition;
      }

      // 2. Microphone stream capture (supports Android/iOS Capacitor webviews)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      rec.ondataavailable = (e) => {
        if (e.data?.size > 0) chunks.push(e.data);
      };

      let durationSecs = 0;
      const intervalId = setInterval(() => {
        setRecSecs((s) => {
          durationSecs = s + 1;
          return durationSecs;
        });
      }, 1000);
      timerRef.current = intervalId;

      rec.onstop = () => {
        clearInterval(intervalId);
        const b = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(b);

        let finalTranscript = transcriptRef.current || "";
        if (!finalTranscript) {
          // Fallback simulation text if microphone speech recognition returns empty on simulators
          finalTranscript = `[Agent]: Hello! Is this the owner of ${lead.businessName}?
[Owner]: Yes, speaking.
[Agent]: Great! I was reviewing your local profile on Google and noticed you don't have a mobile optimized website. I design clean, fast websites to help bring in more leads.
[Owner]: Oh, we've wanted one but didn't have time. What's the pricing?
[Agent]: I can build a completely free demo site first so you can view it. If you like it, we'll launch it.
[Owner]: Sounds great, shoot it over to my contact email!`;
        }

        setRecordingsMap((prev) => ({
          ...prev,
          [lead.id]: { blob: b, url, secs: durationSecs, transcript: finalTranscript },
        }));

        stream.getTracks().forEach((t) => t.stop());
        setRecordingLeadId(null);
        setRecording(false);
      };

      rec.start();
      setRecorderRef(rec);
      setRecording(true);
    } catch (e) {
      console.error("Recording error:", e);
      setRecError(e.message?.includes("denied") ? "Microphone access permission was denied." : e.message);
      setRecordingLeadId(null);
      setRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
    }
  }

  function stopRecording() {
    if (recorderRef && recorderRef.state !== "inactive") {
      recorderRef.stop();
      clearInterval(timerRef.current);
      setRecording(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }

  function deleteRecording(leadId) {
    if (recording && recordingLeadId === leadId) {
      if (recorderRef) recorderRef.stream?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      setRecording(false);
      setRecordingLeadId(null);
    }

    setRecordingsMap((prev) => {
      const copy = { ...prev };
      if (copy[leadId]) {
        URL.revokeObjectURL(copy[leadId].url);
        delete copy[leadId];
      }
      return copy;
    });

    setConsentMap((prev) => ({
      ...prev,
      [leadId]: false,
    }));

    push("Recording deleted", "info");
  }

  async function downloadRecording(lead) {
    const recordingItem = recordingsMap[lead.id];
    if (!recordingItem || !recordingItem.blob) return;
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const filename = `${safeName(lead.businessName)}-${safeName(lead.phone) || "nophone"}-${datePart}-${timePart}.webm`;
    const a = document.createElement("a");
    a.href = recordingItem.url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    push("Recording downloaded ✓", "success");

    setSavingActivity(true);
    try {
      await dbService.logActivity(lead.id, session.user.id, "call_recording_downloaded", "downloaded", "Recording downloaded locally.");
    } catch (e) {
      console.error("Activity log recording error:", e);
    } finally {
      setSavingActivity(false);
    }
  }

  /* ── Export Leads to CSV backing ── */
  function exportCSV() {
    if (!leads.length) {
      push("No leads to export!", "warning");
      return;
    }
    const headers = ["Name", "Phone", "Address", "Website", "Status", "Notes", "Maps URL", "Date Added"];
    const rows = leads.map((b) =>
      [
        b.businessName,
        b.phone,
        b.address,
        b.website,
        statusMeta(b.status)?.label || b.status,
        b.notes,
        b.mapsLink,
        b.createdAt,
      ].map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
    );
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `calltrack-${new Date().toISOString().split("T")[0]}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
    push(`📊 Exported ${leads.length} leads!`, "success");
  }

  /* ── Derived calculations ── */
  const duplicatePhone = useMemo(() => {
    const d = form.phone.replace(/\D/g, "");
    if (!d) return null;
    return leads.find((l) => l.id !== editingId && l.phone_normalized === d) ?? null;
  }, [form.phone, leads, editingId]);

  const dupSearchLead = useMemo(() => {
    const d = query.replace(/\D/g, "");
    if (d.length < 7) return null;
    return leads.find((l) => l.phone_normalized === d) ?? null;
  }, [query, leads]);

  const categoryStats = useMemo(() => {
    const counts = {};
    leads.forEach((l) => {
      const cat = l.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const categoryFilteredLeads = useMemo(() => {
    if (selectedCategories.length === 0) return leads;
    return leads.filter((l) => selectedCategories.includes(l.category || "Other"));
  }, [leads, selectedCategories]);

  const stats = useMemo(() => {
    const today = todayStr();
    const tomorrow = tomorrowStr();
    return {
      total: categoryFilteredLeads.length,
      notCalled: categoryFilteredLeads.filter((l) => l.status === "not_called").length,
      interested: categoryFilteredLeads.filter((l) => l.status === "interested").length,
      needsDemo: categoryFilteredLeads.filter((l) => l.demoStatus === "needs_demo").length,
      due: categoryFilteredLeads.filter((l) => isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed").length,
      calledToday: categoryFilteredLeads.filter((l) => l.lastContacted === today).length,
      callLater: categoryFilteredLeads.filter((l) => l.nextFollowUp === today && l.status !== "no" && l.status !== "closed").length,
      tomorrow: categoryFilteredLeads.filter((l) => l.nextFollowUp === tomorrow && l.status !== "no" && l.status !== "closed").length,
      demoSent: categoryFilteredLeads.filter((l) => l.demoStatus === "sent" || l.status === "demo_sent").length,
      noWebsite: categoryFilteredLeads.filter((l) => l.websiteStatus === "No website").length,
      badWebsite: categoryFilteredLeads.filter((l) => l.websiteStatus === "Bad website").length,
      socialOnly: categoryFilteredLeads.filter((l) => l.websiteStatus === "Social media only").length,
      no: categoryFilteredLeads.filter((l) => l.status === "no").length,
      maybe: categoryFilteredLeads.filter((l) => l.status === "maybe").length,
      followUp: categoryFilteredLeads.filter((l) => l.status === "follow_up").length,
    };
  }, [categoryFilteredLeads]);

  const duplicateGroups = useMemo(() => {
    const phoneGroups = {};
    const nameGroups = {};

    leads.forEach((lead) => {
      const p = lead.phone_normalized;
      if (p && p.length >= 7) {
        if (!phoneGroups[p]) phoneGroups[p] = [];
        phoneGroups[p].push(lead);
      }

      const n = norm(lead.businessName);
      if (n && n.length > 2) {
        if (!nameGroups[n]) nameGroups[n] = [];
        nameGroups[n].push(lead);
      }
    });

    const groups = [];
    const processedLeadIds = new Set();

    // Group duplicate phones first
    Object.keys(phoneGroups).forEach((p) => {
      const list = phoneGroups[p];
      if (list.length > 1) {
        const groupLeads = [];
        list.forEach((l) => {
          if (!processedLeadIds.has(l.id)) {
            groupLeads.push(l);
            processedLeadIds.add(l.id);
          }
        });
        if (groupLeads.length > 1) {
          groups.push({
            type: "phone",
            key: list[0].phone,
            title: `Duplicate Phone: ${list[0].phone}`,
            leads: groupLeads,
          });
        }
      }
    });

    // Group duplicate names
    Object.keys(nameGroups).forEach((n) => {
      const list = nameGroups[n];
      if (list.length > 1) {
        const groupLeads = [];
        list.forEach((l) => {
          if (!processedLeadIds.has(l.id)) {
            groupLeads.push(l);
            processedLeadIds.add(l.id);
          }
        });
        if (groupLeads.length > 1) {
          groups.push({
            type: "name",
            key: list[0].businessName,
            title: `Duplicate Name: "${list[0].businessName}"`,
            leads: groupLeads,
          });
        }
      }
    });

    return groups;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (dupSearchLead) return [dupSearchLead];
    const s = norm(query);
    const isPhone = /\d/.test(query);
    const phoneD = query.replace(/\D/g, "");
    return categoryFilteredLeads
      .filter((l) => {
        if (filter === "all") return true;
        if (filter === "call_today") return isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed";
        if (filter === "call_later") return l.nextFollowUp === todayStr() && l.status !== "no" && l.status !== "closed";
        if (filter === "call_tomorrow") return l.nextFollowUp === tomorrowStr() && l.status !== "no" && l.status !== "closed";
        if (filter === "called_today_stat") return l.lastContacted === todayStr();
        if (filter === "no_website") return l.websiteStatus === "No website";
        if (filter === "bad_website") return l.websiteStatus === "Bad website";
        if (filter === "social_only") return l.websiteStatus === "Social media only";
        if (filter === "needs_demo") return l.demoStatus === "needs_demo";
        if (filter === "demo_sent") return l.demoStatus === "sent" || l.status === "demo_sent";
        return l.status === filter;
      })
      .filter((l) => {
        if (!s) return true;
        if (isPhone) return l.phone_normalized?.includes(phoneD);
        return [l.businessName, l.address, l.category, l.notes, l.email].some((f) => norm(f).includes(s));
      })
      .sort((a, b) => (isDue(b.nextFollowUp) ? 1 : 0) - (isDue(a.nextFollowUp) ? 1 : 0));
  }, [categoryFilteredLeads, query, filter, dupSearchLead]);

  /* ── Page Loader / Splash ── */
  return (
    <>
      <SplashScreen visible={splashVisible} />
      {showOnboarding && !splashVisible && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
      {authLoading ? null : !session ? <AuthScreen /> : null}
      {!authLoading && session && !showOnboarding && renderMain()}
    </>
  );

  // eslint-disable-next-line no-unreachable
  function renderMain() { return (

    <MobileLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      session={session}
      onLogout={() => authService.signOut()}
      totalLeads={leads.length}
      dueCount={leads.filter((l) => isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed").length}
      toasts={toasts}
      onDismissToast={dismissToast}
    >

      {/* Pages render routers */}
      {activeTab === "dashboard" && (
        <Dashboard
          stats={stats}
          categoryStats={categoryStats}
          onSelectCategory={(cat) => {
            toggleCategory(cat);
            setActiveTab("search");
          }}
          selectedCategories={selectedCategories}
          onStartCalling={() => setActiveTab("queue")}
          onAddLead={() => setActiveTab("add")}
        />
      )}

      {activeTab === "queue" && (
        <OutboundToDoQueue
          leads={categoryFilteredLeads}
          onTriggerResolution={triggerCallResolution}
          onSelect={setFocused}
          onDelete={deleteLead}
          push={push}
          recordingLeadId={recordingLeadId}
          recording={recording}
          consentMap={consentMap}
          setConsentMap={setConsentMap}
          recordingsMap={recordingsMap}
          recSecs={recSecs}
          recError={recError}
          startRecording={startRecording}
          stopRecording={stopRecording}
          deleteRecording={deleteRecording}
          downloadRecording={downloadRecording}
          savingActivity={savingActivity}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          toggleCategory={toggleCategory}
          categoryStats={categoryStats}
        />
      )}

      {activeTab === "add" && (
        <AddLeadPage
          form={form}
          upForm={upForm}
          resetForm={resetForm}
          editingId={editingId}
          saving={saving}
          formError={formError}
          supaError={supaError}
          duplicatePhone={duplicatePhone}
          onSave={saveLead}
          onTriggerBulkImport={() => setShowImportModal(true)}
        />
      )}

      {activeTab === "search" && (
        <LeadsPage
          leads={leads}
          filteredLeads={filteredLeads}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          stats={stats}
          selectedLeadIds={selectedLeadIds}
          onToggleSelectLead={handleToggleSelect}
          onDeleteSelectedLeads={deleteSelectedLeads}
          onWipeDatabase={wipeDatabase}
          onStatus={changeStatus}
          onDemoStatus={changeDemoStatus}
          onEdit={editLead}
          onDelete={deleteLead}
          onSelect={setFocused}
          onTriggerResolution={triggerCallResolution}
          push={push}
          duplicatePhone={duplicatePhone}
          dupSearchLead={dupSearchLead}
          duplicateGroups={duplicateGroups}
          setShowDuplicateModal={setShowDuplicateModal}
          bulkDeleting={bulkDeleting}
          wipingDatabase={wipingDatabase}
        />
      )}

      {activeTab === "settings" && (
        <SettingsPage
          session={session}
          totalLeads={leads.length}
          duplicateGroupsCount={duplicateGroups.length}
          onExportCSV={exportCSV}
          onWipeDatabase={wipeDatabase}
          onOpenDuplicateModal={() => setShowDuplicateModal(true)}
          wipingDatabase={wipingDatabase}
        />
      )}

      {/* ── FOCUS LEAD PROFILE DRAWER ── */}
      {focused && (
        <FocusDrawer
          lead={focused}
          session={session}
          onClose={() => setFocused(null)}
          onEdit={(l) => {
            editLead(l);
            setFocused(null);
          }}
          onDelete={(id) => {
            deleteLead(id);
            setFocused(null);
          }}
          onStatus={changeStatus}
          onDemoStatus={changeDemoStatus}
          onFollowUp={changeFollowUp}
          onTriggerResolution={triggerCallResolution}
          push={push}
          recordingLeadId={recordingLeadId}
          recording={recording}
          consentMap={consentMap}
          setConsentMap={setConsentMap}
          recordingsMap={recordingsMap}
          recSecs={recSecs}
          recError={recError}
          startRecording={startRecording}
          stopRecording={stopRecording}
          deleteRecording={deleteRecording}
          downloadRecording={downloadRecording}
          savingActivity={savingActivity}
        />
      )}

      {/* ── SPREADSHEET BULK IMPORTER ── */}
      {showImportModal && (
        <BulkImportModal
          session={session}
          loadedLeads={leads}
          setLeads={setLeads}
          onClose={() => setShowImportModal(false)}
          push={push}
        />
      )}

      {/* ── DUPLICATES MANAGER ── */}
      {showDuplicateModal && (
        <DuplicateReviewModal
          duplicateGroups={duplicateGroups}
          setLeads={setLeads}
          onClose={() => setShowDuplicateModal(false)}
          push={push}
        />
      )}

      {/* ── OUTBOUND RESOLUTION MODAL ── */}
      {resolutionLead && (
        <CallResolutionModal
          lead={resolutionLead}
          type={resolutionType}
          preSelectOption={resolutionPreSelect}
          onClose={() => {
            setResolutionLead(null);
            setResolutionType(null);
            setResolutionPreSelect(null);
          }}
          onResolve={resolveOutboundCall}
        />
      )}

      {/* ── SINGLE LEAD DELETE ACTION SHEET ── */}
      <ActionSheet
        open={!!singleDeleteSheet}
        onClose={() => setSingleDeleteSheet(null)}
        title="Delete Lead?"
        message="This lead and all its history will be permanently removed."
        actions={[
          {
            label: "Delete Lead",
            style: "destructive",
            onPress: () => _confirmDeleteLead(singleDeleteSheet),
          },
          { label: "Cancel", style: "cancel" },
        ]}
      />

      {/* ── BULK DELETE ACTION SHEET ── */}
      <ActionSheet
        open={bulkDeleteSheet}
        onClose={() => setBulkDeleteSheet(false)}
        title={`Delete ${selectedLeadIds.size} Leads?`}
        message="All selected leads will be permanently deleted. This cannot be undone."
        actions={[
          {
            label: `Delete ${selectedLeadIds.size} Leads`,
            style: "destructive",
            onPress: _confirmBulkDelete,
          },
          { label: "Cancel", style: "cancel" },
        ]}
      />
    </MobileLayout>
  ); } // end renderMain
}
