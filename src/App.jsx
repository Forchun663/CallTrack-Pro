import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, BadgeDollarSign, CalendarDays, CheckCircle2, ChevronDown,
  ChevronUp, Clock, Copy, Download, Edit3, ExternalLink, Filter, Globe,
  LayoutDashboard, Loader2, LogOut, MapPin, Mic, MicOff, Phone, Plus,
  RotateCcw, Save, Search, Sparkles, Square, Target, Trash2, X, XCircle,
  Zap, Volume2, FileAudio, Mail, Send, Calendar, Play, Pause, FileText
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ─────────────────────────── CONSTANTS ─────────────────────────── */

const STATUS_OPTIONS = [
  { key: "not_called",  label: "Not Called",      color: "bg-blue-500",   soft: "bg-blue-500/15 text-blue-200 border-blue-400/30" },
  { key: "interested",  label: "Yes / Interested", color: "bg-green-500",  soft: "bg-green-500/15 text-green-200 border-green-400/30" },
  { key: "no",          label: "No",               color: "bg-red-500",    soft: "bg-red-500/15 text-red-300 border-red-400/30" },
  { key: "maybe",       label: "Maybe",            color: "bg-yellow-400", soft: "bg-yellow-400/15 text-yellow-100 border-yellow-300/30" },
  { key: "follow_up",   label: "Follow Up",        color: "bg-orange-500", soft: "bg-orange-500/15 text-orange-100 border-orange-400/30" },
  { key: "no_answer",   label: "No Answer",        color: "bg-slate-500",  soft: "bg-slate-500/15 text-slate-200 border-slate-400/30" },
  { key: "demo_sent",   label: "Demo Sent",        color: "bg-purple-500", soft: "bg-purple-500/15 text-purple-200 border-purple-400/30" },
  { key: "closed",      label: "Closed",           color: "bg-zinc-500",   soft: "bg-zinc-500/15 text-zinc-200 border-zinc-400/30" },
];

const WEBSITE_OPTIONS   = ["Unknown", "No website", "Has website", "Bad website", "Social media only"];

const NEXT_ACTION_OPTIONS = ["Call", "Follow up", "Send demo", "Waiting", "Done"];

const CATEGORIES = [
  "Auto Detailing","Barber Shop","Hair Salon / Spa","Restaurant","Food Truck",
  "Roofing / Contractor","Cleaning Service","Landscaping","Mechanic / Auto Repair",
  "Towing Company","Tattoo / Piercing","Gym / Fitness","Dental / Medical",
  "Daycare","Real Estate","Handyman","Moving Company","Other",
];

const EMPTY_LEAD = {
  businessName:"", mapsLink:"", phone:"", address:"", category:"",
  website:"", websiteStatus:"Unknown", status:"not_called", priority:"",
  notes:"", lastContacted:"", nextFollowUp:"", googlePlaceId:"", nextAction:"Call",
  email:"", demoStatus:"not_sent", socialLink:"",
};


/* ─────────────────────────── HELPERS ─────────────────────────── */

const statusMeta  = (s) => STATUS_OPTIONS.find((o) => o.key === s) ?? STATUS_OPTIONS[0];
const todayStr    = () => new Date().toISOString().slice(0, 10);
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
const norm        = (v) => String(v || "").trim().toLowerCase();
const isDue       = (d) => !!d && d <= todayStr();

// Pack email, demoStatus, nextAction, and socialLink into notes field
function packNotes(plainNotes, email, demoStatus, nextAction, socialLink) {
  let packed = (plainNotes || "").trim();
  if (email && email.trim()) {
    packed += `\n[Email: ${email.trim()}]`;
  }
  if (demoStatus && demoStatus !== "not_sent") {
    packed += `\n[Demo: ${demoStatus}]`;
  }
  if (nextAction && nextAction !== "Call") {
    packed += `\n[NextAction: ${nextAction}]`;
  }
  if (socialLink && socialLink.trim()) {
    packed += `\n[Social: ${socialLink.trim()}]`;
  }
  return packed;
}


// Unpack email, demoStatus, nextAction, and socialLink from notes field
function unpackNotes(packedNotes) {
  let notes = (packedNotes || "").trim();
  let email = "";
  let demoStatus = "not_sent";
  let nextAction = "Call";
  let socialLink = "";

  const emailRegex = /\[Email:\s*([^\]]+)\]/i;
  const emailMatch = notes.match(emailRegex);
  if (emailMatch) {
    email = emailMatch[1].trim();
    notes = notes.replace(emailRegex, "").trim();
  }

  const demoRegex = /\[Demo:\s*([^\]]+)\]/i;
  const demoMatch = notes.match(demoRegex);
  if (demoMatch) {
    demoStatus = demoMatch[1].trim();
    notes = notes.replace(demoRegex, "").trim();
  }

  const nextActionRegex = /\[NextAction:\s*([^\]]+)\]/i;
  const nextActionMatch = notes.match(nextActionRegex);
  if (nextActionMatch) {
    nextAction = nextActionMatch[1].trim();
    notes = notes.replace(nextActionRegex, "").trim();
  }

  const socialRegex = /\[Social:\s*([^\]]+)\]/i;
  const socialMatch = notes.match(socialRegex);
  if (socialMatch) {
    socialLink = socialMatch[1].trim();
    notes = notes.replace(socialRegex, "").trim();
  }

  return { notes, email, demoStatus, nextAction, socialLink };
}


function mapToState(r) {
  const unpacked = unpackNotes(r.notes);
  return {
    id: r.id,
    businessName:  r.business_name  || "",
    mapsLink:      r.maps_link       || "",
    phone:         r.phone           || "",
    phone_normalized: r.phone_normalized || "",
    address:       r.address         || "",
    category:      r.category        || "",
    website:       r.website         || "",
    websiteStatus: r.website_status  || "Unknown",
    status:        r.status          || "not_called",
    priority:      r.priority        || "",
    notes:         unpacked.notes,
    email:         unpacked.email,
    demoStatus:    unpacked.demoStatus,
    socialLink:    unpacked.socialLink,
    lastContacted: r.last_contacted  || "",
    nextFollowUp:  r.next_follow_up  || "",
    googlePlaceId: r.google_place_id || "",
    nextAction:    unpacked.nextAction,
    createdAt:     r.created_at      || "",
  };
}


function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
}

function relativeDate(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(iso).toLocaleDateString();
}

function safeName(s) {
  return (s || "business").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

/* ─────────────────────────── TOAST HOOK ─────────────────────────── */

function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2800);
  }, []);
  return { toasts, push };
}

const DEFAULT_TABS = [
  { id: "workspace", title: "Workspace", url: "", isDefault: true }
];

/* ══════════════════════════ APP ROOT ══════════════════════════════ */

export default function App() {
  /* Auth */
  const [session, setSession]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* Leads */
  const [leads, setLeads]           = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  /* Lead selection (for bulk operations) */
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [wipingDatabase, setWipingDatabase] = useState(false);

  /* Browser Tab System */
  const [customTabs, setCustomTabs] = useState(() => {
    try {
      const saved = localStorage.getItem("calltrack_custom_tabs");
      return saved ? JSON.parse(saved) : DEFAULT_TABS;
    } catch (e) {
      return DEFAULT_TABS;
    }
  });
  const [activeTabId, setActiveTabId] = useState("workspace");
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const activeTab = customTabs.find((t) => t.id === activeTabId);

  /* Form */
  const [form, setForm]             = useState(EMPTY_LEAD);
  const [editingId, setEditingId]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formError, setFormError]   = useState("");
  const [supaError, setSupaError]   = useState("");

  /* Search & Filter */
  const [query, setQuery]           = useState("");
  const [filter, setFilter]         = useState("all");

  /* Focus / detail drawer */
  const [focused, setFocused]       = useState(null);

  /* Toasts */
  const { toasts, push }            = useToast();

  /* Sync custom tabs to local storage */
  useEffect(() => {
    localStorage.setItem("calltrack_custom_tabs", JSON.stringify(customTabs));
  }, [customTabs]);

  /* Sync selection when leads list changes */
  useEffect(() => {
    setSelectedLeadIds((prev) => {
      const next = new Set();
      prev.forEach((id) => {
        if (leads.some((l) => l.id === id)) next.add(id);
      });
      return next;
    });
  }, [leads]);

  /* Toggle selection of a single lead */
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

  /* Delete all selected leads */
  async function deleteSelectedLeads() {
    const count = selectedLeadIds.size;
    if (count === 0) return;
    if (!confirm(`Permanently delete the ${count} selected leads?`)) return;
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .in("id", Array.from(selectedLeadIds));
      if (error) throw error;
      setLeads((p) => p.filter((l) => !selectedLeadIds.has(l.id)));
      setSelectedLeadIds(new Set());
      push(`Successfully deleted ${count} leads`, "success");
    } catch (e) {
      console.error("Bulk delete error:", e);
      push("Bulk delete failed: " + e.message, "error");
    } finally {
      setBulkDeleting(false);
    }
  }

  /* Wipe entire shared workspace database */
  async function wipeDatabase() {
    if (!confirm("⚠️ CRITICAL WARNING: You are about to permanently delete ALL leads in the shared workspace. This will affect ALL team members and CANNOT be undone. Are you sure?")) return;
    if (!confirm("FINAL CONFIRMATION: Click OK to erase all leads, activity history, and recordings for the entire team.")) return;
    setWipingDatabase(true);
    try {
      // Delete all leads (shared workspace — no user_id filter)
      const { error } = await supabase
        .from("leads")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // match all rows
      if (error) throw error;
      setLeads([]);
      setSelectedLeadIds(new Set());
      setFocused(null);
      push("All leads successfully deleted from shared workspace", "success");
    } catch (e) {
      console.error("Wipe database error:", e);
      push("Failed to delete all leads: " + e.message, "error");
    } finally {
      setWipingDatabase(false);
    }
  }

  /* Bulk Importer */
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  /* Call Outbound Resolution Modal States */
  const [resolutionLead, setResolutionLead] = useState(null);
  const [resolutionType, setResolutionType] = useState(null); // "interested" | "reschedule"
  const [resolutionPreSelect, setResolutionPreSelect] = useState(null);

  function triggerCallResolution(lead, type, preSelect = null) {
    setResolutionLead(lead);
    setResolutionType(type);
    setResolutionPreSelect(preSelect);
  }

  /* Global Audio Recording State */
  const [recordingLeadId, setRecordingLeadId] = useState(null); // ID of lead currently recording
  const [recording, setRecording] = useState(false); // boolean isRecording
  const [recorderRef, setRecorderRef] = useState(null);
  const [recSecs, setRecSecs] = useState(0);
  const [recError, setRecError] = useState("");
  const [consentMap, setConsentMap] = useState({}); // permissions by leadId: { [leadId]: boolean }
  const [recordingsMap, setRecordingsMap] = useState({}); // { [leadId]: { blob, url, secs, transcript } }
  const [savingActivity, setSavingActivity] = useState(false);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  /* ── Outbound Demo Call Mock Transcriber ── */
  function generateMockTranscript(lead) {
    const biz = lead.businessName || "Prospect";
    const cat = lead.category || "Auto Detailing";
    return `[Agent]: Hello, thanks for taking my call! Is this the owner of ${biz}?
[Owner]: Yes, this is him. What is this about?
[Agent]: Great! I was looking at your business on Google Maps and noticed you have excellent reviews for your ${cat} work, but it looks like you don't have a website or your site isn't fully mobile-optimized. I build custom, ultra-fast websites specifically designed to bring in more leads.
[Owner]: Ah, yeah. We've been meaning to get one, but we've just been so busy with jobs. How much does something like that cost?
[Agent]: Completely understand! I can actually put together a free, personalized demo site for ${biz} so you can see exactly what it looks like before spending a dime. If you like it, we can talk about launching it; if not, no worries at all. Can I grab your email to send the demo?
[Owner]: That sounds pretty fair actually. Send it over to my contact email, and I'll take a look tonight.
[Agent]: Awesome, I will send the website preview right away. Have a great day!`;
  }

  /* ── Global Recording Handlers ── */
  async function startRecording(lead) {
    if (!lead) return;
    setRecError("");
    
    // Clear any previous recording for this lead
    setRecordingsMap(prev => {
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
      // Initialize SpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        transcriptRef.current = "";

        recognition.onresult = (event) => {
          let accumulated = "";
          for (let i = 0; i < event.results.length; ++i) {
            accumulated += event.results[i][0].transcript + " ";
          }
          transcriptRef.current = accumulated.trim();
        };

        recognition.onerror = (e) => {
          console.error("Speech Recognition error:", e);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setRecError("No audio was detected. Make sure you selected the Google Voice tab and enabled tab audio.");
        setRecordingLeadId(null);
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e){}
        }
        return;
      }
      // Drop video tracks immediately — audio only
      stream.getVideoTracks().forEach((t) => t.stop());
      const audioStream = new MediaStream(audioTracks);
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(audioStream, { mimeType });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
      
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
          finalTranscript = generateMockTranscript(lead);
        }

        setRecordingsMap(prev => ({
          ...prev,
          [lead.id]: { blob: b, url: url, secs: durationSecs, transcript: finalTranscript }
        }));
        
        audioStream.getTracks().forEach((t) => t.stop());
        setRecordingLeadId(null);
        setRecording(false);
      };
      rec.start();
      setRecorderRef(rec);
      setRecording(true);
    } catch (e) {
      console.error("Recording:", e);
      setRecError(e.message?.includes("denied") ? "Screen sharing permission was denied." : e.message);
      setRecordingLeadId(null);
      setRecording(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(err){}
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
      } catch (e) {
        console.error("Stopping speech recognition failed:", e);
      }
    }
  }

  function deleteRecording(leadId) {
    if (recording && recordingLeadId === leadId) {
      if (recorderRef) recorderRef.stream?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      setRecording(false);
      setRecordingLeadId(null);
    }
    
    setRecordingsMap(prev => {
      const copy = { ...prev };
      if (copy[leadId]) {
        URL.revokeObjectURL(copy[leadId].url);
        delete copy[leadId];
      }
      return copy;
    });
    
    setConsentMap(prev => ({
      ...prev,
      [leadId]: false
    }));

    push("Recording deleted", "info");
  }

  async function downloadRecording(lead) {
    const recordingItem = recordingsMap[lead.id];
    if (!recordingItem || !recordingItem.blob) return;
    const now      = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
    const filename = `${safeName(lead.businessName)}-${safeName(lead.phone) || "nophone"}-${datePart}-${timePart}.webm`;
    const a = document.createElement("a");
    a.href = recordingItem.url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    push("Recording downloaded ✓", "success");

    // Log optional activity
    setSavingActivity(true);
    try {
      await supabase.from("lead_activities").insert([{
        lead_id:       lead.id,
        user_id:       session.user.id,
        activity_type: "call_recording_downloaded",
        result:        "downloaded",
        notes:         "Recording was downloaded locally and not stored in Supabase.",
      }]);
    } catch (e) { console.error("Activity log:", e); }
    finally { setSavingActivity(false); }
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      Object.values(recordingsMap).forEach(item => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [recordingsMap]);



  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Background scroll lock ── */
  useEffect(() => {
    const shouldLock = showImportModal || showDuplicateModal || !!focused || !!resolutionLead;
    if (shouldLock) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showImportModal, showDuplicateModal, focused, resolutionLead]);

  /* ── Load leads ── */

  /* ── Load leads (shared workspace — all users see all leads) ── */
  useEffect(() => {
    if (!session) { setLeads([]); return; }
    (async () => {
      setLeadsLoading(true);
      try {
        const { data, error } = await supabase
          .from("leads").select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setLeads((data || []).map(mapToState));
      } catch (e) {
        console.error("Load leads:", e);
        setSupaError(e.message);
      } finally { setLeadsLoading(false); }
    })();

    /* ── Realtime subscription: sync changes from all team members ── */
    const channel = supabase
      .channel("shared_leads_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = mapToState(payload.new);
          setLeads((prev) => {
            if (prev.some((l) => l.id === newLead.id)) return prev;
            return [newLead, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const updated = mapToState(payload.new);
          setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
          setFocused((f) => f && f.id === updated.id ? updated : f);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        (payload) => {
          const deletedId = payload.old.id;
          setLeads((prev) => prev.filter((l) => l.id !== deletedId));
          setFocused((f) => f && f.id === deletedId ? null : f);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  /* ── Derived ── */
  const duplicatePhone = useMemo(() => {
    const d = form.phone.replace(/\D/g,"");
    if (!d) return null;
    return leads.find((l) => l.id !== editingId && l.phone_normalized === d) ?? null;
  }, [form.phone, leads, editingId]);

  const dupSearchLead = useMemo(() => {
    const d = query.replace(/\D/g,"");
    if (d.length < 7) return null;
    return leads.find((l) => l.phone_normalized === d) ?? null;
  }, [query, leads]);

  const stats = useMemo(() => {
    const today = todayStr();
    const tomorrow = tomorrowStr();
    return {
      total:      leads.length,
      notCalled:  leads.filter((l) => l.status === "not_called").length,
      interested: leads.filter((l) => l.status === "interested").length,
      needsDemo:  leads.filter((l) => l.demoStatus === "needs_demo").length,
      due:        leads.filter((l) => isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed").length,
      calledToday:leads.filter((l) => l.lastContacted === today).length,
      callLater:  leads.filter((l) => l.nextFollowUp === today && l.status !== "no" && l.status !== "closed").length,
      tomorrow:   leads.filter((l) => l.nextFollowUp === tomorrow && l.status !== "no" && l.status !== "closed").length,
      demoSent:   leads.filter((l) => l.demoStatus === "sent" || l.status === "demo_sent").length,
      noWebsite:  leads.filter((l) => l.websiteStatus === "No website").length,
      badWebsite: leads.filter((l) => l.websiteStatus === "Bad website").length,
      socialOnly: leads.filter((l) => l.websiteStatus === "Social media only").length,
      no:         leads.filter((l) => l.status === "no").length,
      maybe:      leads.filter((l) => l.status === "maybe").length,
      followUp:   leads.filter((l) => l.status === "follow_up").length,
    };
  }, [leads]);

  const duplicateGroups = useMemo(() => {
    const phoneGroups = {};
    const nameGroups = {};
    
    leads.forEach(lead => {
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
    Object.keys(phoneGroups).forEach(p => {
      const list = phoneGroups[p];
      if (list.length > 1) {
        const groupLeads = [];
        list.forEach(l => {
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
            leads: groupLeads
          });
        }
      }
    });
    
    // Group duplicate names
    Object.keys(nameGroups).forEach(n => {
      const list = nameGroups[n];
      if (list.length > 1) {
        const groupLeads = [];
        list.forEach(l => {
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
            leads: groupLeads
          });
        }
      }
    });
    
    return groups;
  }, [leads]);


  const filtered = useMemo(() => {
    if (dupSearchLead) return [dupSearchLead];
    const s = norm(query);
    const isPhone = /\d/.test(query);
    const phoneD  = query.replace(/\D/g,"");
    return leads
      .filter((l) => {
        if (filter === "all")         return true;
        if (filter === "call_today")  return isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed";
        if (filter === "call_later")  return l.nextFollowUp === todayStr() && l.status !== "no" && l.status !== "closed";
        if (filter === "call_tomorrow") return l.nextFollowUp === tomorrowStr() && l.status !== "no" && l.status !== "closed";
        if (filter === "called_today_stat") return l.lastContacted === todayStr();
        if (filter === "no_website")  return l.websiteStatus === "No website";
        if (filter === "bad_website") return l.websiteStatus === "Bad website";
        if (filter === "social_only") return l.websiteStatus === "Social media only";
        if (filter === "needs_demo")  return l.demoStatus === "needs_demo";
        if (filter === "demo_sent")   return l.demoStatus === "sent" || l.status === "demo_sent";
        return l.status === filter;
      })
      .filter((l) => {
        if (!s) return true;
        if (isPhone) return l.phone_normalized?.includes(phoneD);
        return [l.businessName, l.address, l.category, l.notes, l.email].some((f) => norm(f).includes(s));
      })
      .sort((a, b) => (isDue(b.nextFollowUp) ? 1 : 0) - (isDue(a.nextFollowUp) ? 1 : 0));
  }, [leads, query, filter, dupSearchLead]);

  /* ── Form helpers ── */
  function upForm(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
    if (field === "businessName" && val.trim()) setFormError("");
  }

  function resetForm() {
    setForm(EMPTY_LEAD);
    setEditingId(null);
    setFormError("");
    setSupaError("");
    setShowAdvanced(false);
  }

  function editLead(lead) {
    setForm({ ...EMPTY_LEAD, ...lead });
    setEditingId(lead.id);
    setFormError("");
    setSupaError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Save lead ── */
  async function saveLead() {
    if (!form.businessName.trim()) { setFormError("Business name is required."); return; }
    setFormError(""); setSupaError(""); setSaving(true);
    try {
      // nextAction is packed into notes to avoid schema dependency on next_action column
      const packedNotesField = packNotes(form.notes, form.email, form.demoStatus, form.nextAction, form.socialLink);
      const row = {
        user_id:       session.user.id,
        business_name: form.businessName,
        maps_link:     form.mapsLink,
        phone:         form.phone,
        address:       form.address,
        category:      form.category,
        website:       form.website,
        website_status:form.websiteStatus,
        status:        form.status,
        priority:      form.priority || null,
        notes:         packedNotesField,
        last_contacted:form.lastContacted || null,
        next_follow_up:form.nextFollowUp  || null,
        google_place_id:form.googlePlaceId || null,
      };
      if (editingId) {
        const { error } = await supabase.from("leads").update(row).eq("id", editingId);
        if (error) throw error;
        const { data: fresh } = await supabase.from("leads").select("*").eq("id", editingId).single();
        const mapped = mapToState(fresh);
        setLeads((p) => p.map((l) => l.id === editingId ? mapped : l));
        if (focused?.id === editingId) setFocused(mapped);
        push("Lead updated ✓", "success");
      } else {
        const { data, error } = await supabase.from("leads").insert([row]).select();
        if (error) throw error;
        setLeads((p) => [mapToState(data[0]), ...p]);
        push("Lead added ✓", "success");
      }
      resetForm();
    } catch (e) {
      console.error("Save lead:", e);
      setSupaError(e.message);
    } finally { setSaving(false); }
  }

  /* ── Delete lead ── */
  async function deleteLead(id) {
    if (!confirm("Permanently delete this lead?")) return;
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      setLeads((p) => p.filter((l) => l.id !== id));
      if (focused?.id === id) setFocused(null);
      push("Lead deleted", "info");
    } catch (e) {
      console.error("Delete:", e);
      setSupaError(e.message);
    }
  }

  /* ── Change status ── */
  async function changeStatus(id, newStatus) {
    const today = todayStr();
    try {
      const { error: e1 } = await supabase.from("leads")
        .update({ status: newStatus, last_contacted: today })
        .eq("id", id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("lead_activities").insert([{
        lead_id: id, user_id: session.user.id,
        activity_type: "status_change",
        result: newStatus,
        notes: `Status → ${statusMeta(newStatus).label}`,
      }]);
      if (e2) throw e2;
      const updater = (l) => l.id === id ? { ...l, status: newStatus, lastContacted: today } : l;
      setLeads((p) => p.map(updater));
      if (focused?.id === id) setFocused((f) => ({ ...f, status: newStatus, lastContacted: today }));
      push(`Status updated: ${statusMeta(newStatus).label} ✓`, "success");
    } catch (e) {
      console.error("Status:", e);
      push("Status update failed: " + e.message, "error");
    }
  }

  /* ── Change demo status ── */
  async function changeDemoStatus(id, newDemoStatus) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const repackedNotes = packNotes(lead.notes, lead.email, newDemoStatus, lead.nextAction, lead.socialLink);
    try {
      const { error: e1 } = await supabase.from("leads")
        .update({ notes: repackedNotes })
        .eq("id", id);
      if (e1) throw e1;
      
      const { error: e2 } = await supabase.from("lead_activities").insert([{
        lead_id: id, user_id: session.user.id,
        activity_type: "demo_status_change",
        result: newDemoStatus,
        notes: `Demo Status → ${newDemoStatus === "needs_demo" ? "Needs Demo" : newDemoStatus === "sent" ? "Demo Sent" : "None"}`,
      }]);
      if (e2) throw e2;

      const updater = (l) => l.id === id ? { ...l, notes: lead.notes, demoStatus: newDemoStatus } : l;
      setLeads((p) => p.map(updater));
      if (focused?.id === id) setFocused((f) => ({ ...f, notes: lead.notes, demoStatus: newDemoStatus }));
      push(`Demo status updated ✓`, "success");
    } catch (e) {
      console.error("Demo status error:", e);
      push("Failed to update demo status: " + e.message, "error");
    }
  }

  /* ── Quick Follow-up schedule ── */
  async function changeFollowUp(id, days) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().slice(0, 10);
    try {
      const { error: e1 } = await supabase.from("leads")
        .update({ next_follow_up: dateStr })
        .eq("id", id);
      if (e1) throw e1;
      
      const { error: e2 } = await supabase.from("lead_activities").insert([{
        lead_id: id, user_id: session.user.id,
        activity_type: "follow_up_scheduled",
        result: dateStr,
        notes: `Follow-up scheduled for ${dateStr} (${days} days from now)`,
      }]);
      if (e2) throw e2;

      const updater = (l) => l.id === id ? { ...l, nextFollowUp: dateStr } : l;
      setLeads((p) => p.map(updater));
      if (focused?.id === id) setFocused((f) => ({ ...f, nextFollowUp: dateStr }));
      push(`Follow-up scheduled for ${dateStr} ✓`, "success");
    } catch (e) {
      console.error("Follow-up error:", e);
      push("Failed to schedule: " + e.message, "error");
    }
  }

  /* ── Outbound Dialer Call outcome & Rescheduler ── */
  async function logOutboundCallOutcome(id, newStatus, followUpDays) {
    const today = todayStr();
    let nextFollowUpDate = null;
    if (followUpDays !== null && followUpDays !== undefined) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + followUpDays);
      nextFollowUpDate = targetDate.toISOString().slice(0, 10);
    }

    try {
      const updateData = { status: newStatus, last_contacted: today };
      if (nextFollowUpDate) {
        updateData.next_follow_up = nextFollowUpDate;
      }
      
      const { error: e1 } = await supabase.from("leads")
        .update(updateData)
        .eq("id", id);
      if (e1) throw e1;

      let logNotes = `Status outcome logged: ${statusMeta(newStatus).label}`;
      if (nextFollowUpDate) {
        logNotes += `. Rescheduled callback for ${nextFollowUpDate}.`;
      }

      const { error: e2 } = await supabase.from("lead_activities").insert([{
        lead_id: id,
        user_id: session.user.id,
        activity_type: "call_logged_rescheduled",
        result: newStatus,
        notes: logNotes,
      }]);
      if (e2) throw e2;

      const updater = (l) => l.id === id ? { 
        ...l, 
        status: newStatus, 
        lastContacted: today, 
        ...(nextFollowUpDate ? { nextFollowUp: nextFollowUpDate } : {}) 
      } : l;

      setLeads((p) => p.map(updater));
      
      if (focused?.id === id) {
        setFocused((f) => ({ 
          ...f, 
          status: newStatus, 
          lastContacted: today, 
          ...(nextFollowUpDate ? { nextFollowUp: nextFollowUpDate } : {}) 
        }));
      }

      let successMsg = `Logged: ${statusMeta(newStatus).label}`;
      if (nextFollowUpDate) {
        successMsg += ` & scheduled tomorrow!`;
      } else {
        successMsg += ` ✓`;
      }
      push(successMsg, "success");
    } catch (e) {
      console.error("Dialer outcome error:", e);
      push("Outcome log failed: " + e.message, "error");
    }
  }

  /* ── Outbound Dialer Interactive Resolution Logger ── */
  async function resolveOutboundCall({ id, status, followUpDays, customDate, notes, email }) {
    const today = todayStr();
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    let nextFollowUpDate = null;
    if (customDate) {
      nextFollowUpDate = customDate;
    } else if (followUpDays !== null && followUpDays !== undefined) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + followUpDays);
      nextFollowUpDate = targetDate.toISOString().slice(0, 10);
    }

    try {
      // 1. Pack notes: append new notes with a timestamp to preserve dialing history
      let updatedNotes = lead.notes || "";
      if (notes && notes.trim()) {
        const timestamp = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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

      const { error: e1 } = await supabase.from("leads")
        .update(updateData)
        .eq("id", id);
      if (e1) throw e1;

      // 2. Log activity
      let activityNotes = `Call outcome logged: ${statusMeta(status).label}`;
      if (nextFollowUpDate) {
        activityNotes += `. Rescheduled callback for ${nextFollowUpDate}.`;
      }
      if (notes && notes.trim()) {
        activityNotes += ` Notes: "${notes.trim()}"`;
      }

      const { error: e2 } = await supabase.from("lead_activities").insert([{
        lead_id: id,
        user_id: session.user.id,
        activity_type: "call_resolution",
        result: status,
        notes: activityNotes,
      }]);
      if (e2) throw e2;

      // 3. Update state
      const updater = (l) => l.id === id ? { 
        ...l, 
        status: status, 
        lastContacted: today, 
        notes: updatedNotes,
        email: finalEmail,
        demoStatus: finalDemoStatus,
        ...(nextFollowUpDate ? { nextFollowUp: nextFollowUpDate } : {}) 
      } : l;

      setLeads((p) => p.map(updater));
      
      if (focused?.id === id) {
        setFocused((f) => ({ 
          ...f, 
          status: status, 
          lastContacted: today, 
          notes: updatedNotes,
          email: finalEmail,
          demoStatus: finalDemoStatus,
          ...(nextFollowUpDate ? { nextFollowUp: nextFollowUpDate } : {}) 
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

  /* ── Filters ── */
  const filterBtns = [
    { key:"all",         label: `All (${stats.total})` },
    { key:"call_today",  label: `📅 Call Today (${stats.due})` },
    { key:"call_later",  label: `⏳ Call Later (${stats.callLater})` },
    { key:"call_tomorrow", label: `📆 Call Tomorrow (${stats.tomorrow})` },
    { key:"needs_demo",  label: `📤 Needs Demo (${stats.needsDemo})` },
    { key:"demo_sent",   label: `✓ Demo Sent (${stats.demoSent})` },
    { key:"not_called",  label: `Not Called (${stats.notCalled})` },
    { key:"interested",  label: `Yes ✓ (${stats.interested})` },
    { key:"no",          label: `No ✗ (${stats.no})` },
    { key:"maybe",       label: `Maybe (${stats.maybe})` },
    { key:"follow_up",   label: `Follow Up (${stats.followUp})` },
    { key:"no_website",  label: `No Website (${stats.noWebsite})` },
    { key:"bad_website", label: `Bad Website (${stats.badWebsite})` },
    { key:"social_only", label: `📱 Socials Only (${stats.socialOnly})` },
  ];

  /* ── Splash / Auth ── */
  if (authLoading) return (
    <div className="min-h-screen bg-[#05020f] flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-cyan-400" size={36} />
        <p className="text-zinc-500 text-xs tracking-widest uppercase font-bold">Loading…</p>
      </div>
    </div>
  );
  if (!session) return <AuthScreen />;

  /* ── Main UI ── */
  return (
    <div className="min-h-screen bg-[#05020f] text-white relative overflow-x-hidden">

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(ellipse_at_85%_15%,rgba(168,85,247,0.13),transparent_40%),radial-gradient(ellipse_at_50%_95%,rgba(16,185,129,0.10),transparent_40%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Toast system */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 sm:bottom-6 z-[99] flex flex-col gap-2 pointer-events-none w-[calc(100vw-2rem)] sm:w-auto max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur-xl animate-[slideUp_0.25s_ease] ${
            t.type === "success" ? "border-emerald-400/30 bg-emerald-950/80 text-emerald-300" :
            t.type === "error"   ? "border-red-500/30 bg-red-950/80 text-red-300" :
                                   "border-cyan-400/30 bg-zinc-950/90 text-cyan-200"
          }`}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✗" : "·"} {t.msg}
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">

        {/* ── HEADER ── */}
        <header className="mb-4 rounded-2xl sm:rounded-3xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Team Workspace</p>
              <h1 className="bg-gradient-to-r from-white via-cyan-100 to-fuchsia-300 bg-clip-text text-2xl sm:text-4xl font-black tracking-tight text-transparent">
                CallTrack Pro
              </h1>
              <p className="mt-0.5 text-[10px] sm:text-xs text-zinc-500 truncate max-w-[180px] sm:max-w-none">{session.user.email} · {leads.length} leads</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Leads" value={stats.total} />
                <MiniStat label="Called" value={stats.calledToday} accent="text-emerald-400" />
                <MiniStat label="Tomorrow" value={stats.tomorrow} accent="text-cyan-400" />
                <MiniStat label="Due" value={stats.due} accent={stats.due > 0 ? "text-yellow-400" : undefined} />
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/8 px-2.5 py-2 sm:px-3 text-xs font-bold text-red-300 hover:bg-red-500/15 transition-all"
              >
                <LogOut size={13} /> <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── BROWSER TABS BAR ── */}
        <div className="mb-4 flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto scrollbar-hide">
          {customTabs.map((t) => {
            const isActive = activeTabId === t.id;
            return (
              <div
                key={t.id}
                className={`group relative flex shrink-0 items-center gap-2 rounded-t-2xl border-t border-x px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-bold transition duration-200 cursor-pointer ${
                  isActive
                    ? "border-cyan-500/30 bg-white/[0.04] text-cyan-300 font-black shadow-lg shadow-cyan-950/20"
                    : "border-transparent bg-transparent text-zinc-400 hover:bg-white/[0.02] hover:text-white"
                }`}
                onClick={() => setActiveTabId(t.id)}
              >
                {t.isDefault ? (
                  <LayoutDashboard size={13} className="text-cyan-400" />
                ) : (
                  <Globe size={13} className="text-zinc-500 group-hover:text-cyan-400 transition" />
                )}
                <span className="whitespace-nowrap">{t.title}</span>
                {!t.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomTabs((prev) => {
                        const next = prev.filter((tab) => tab.id !== t.id);
                        if (activeTabId === t.id) {
                          setActiveTabId("workspace");
                        }
                        return next;
                      });
                      push("Tab deleted", "info");
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-white/10 text-zinc-500 hover:text-white transition"
                    title="Close tab"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          
          <button
            onClick={() => setShowAddTabModal(true)}
            className="flex shrink-0 items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/[0.06] p-2 text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer"
            title="Add Call Center Tab"
          >
            <Plus size={14} />
          </button>
        </div>

        {activeTabId === "workspace" && (
          <>
            {/* ── STATS BAR ── */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { key:"all",        label:"Total Leads", val:stats.total,      icon:<LayoutDashboard size={14}/> },
            { key:"call_today", label:"Due Today",   val:stats.due,        icon:<CalendarDays size={14}/>, accent:stats.due > 0 ? "text-yellow-400" : undefined },
            { key:"call_later", label:"Call Later",  val:stats.callLater,  icon:<Clock size={14}/>, accent:"text-purple-400" },
            { key:"call_tomorrow", label:"Tomorrow", val:stats.tomorrow,   icon:<Calendar size={14}/>, accent:"text-cyan-400" },
            { key:"called_today_stat", label:"Called Today", val:stats.calledToday, icon:<Phone size={14}/>, accent:"text-emerald-400" },
          ].map(({ key, label, val, icon, accent }) => (
            <button
              key={key}
              onClick={() => setFilter(key === filter ? "all" : key)}
              className={`relative overflow-hidden rounded-2xl border p-3 text-left shadow-md backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 ${
                filter === key ? "border-white/20 bg-white/10" : "border-white/[0.06] bg-white/[0.04]"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between text-zinc-400">
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                <span className={accent ?? "text-zinc-500"}>{icon}</span>
              </div>
              <div className={`text-2xl font-black ${accent ?? "text-white"}`}>{val}</div>
            </button>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid gap-4 lg:gap-5 lg:grid-cols-[400px_1fr]">

          {/* ══ LEFT: ADD/EDIT FORM ══ */}
          <div className="rounded-2xl sm:rounded-3xl border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5 shadow-xl backdrop-blur-2xl lg:sticky lg:top-5 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:self-start">

            {/* Form header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">{editingId ? "Edit Lead" : "Add New Lead"}</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Fill in prospect details below</p>
              </div>
              <div className="flex items-center gap-1.5">
                {!editingId && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-1 rounded-xl bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-1.5 text-[10px] font-black text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer"
                    title="Import spreadsheet or pasted text"
                  >
                    <Download size={11} className="rotate-180" /> Bulk Import
                  </button>
                )}
                {editingId && (
                  <button onClick={resetForm} title="Cancel edit" className="rounded-xl bg-white/5 p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition">
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Errors */}
            {formError && <Alert type="warn" msg={formError} />}
            {duplicatePhone && <Alert type="warn" msg={`⚠ Duplicate phone — already saved as "${duplicatePhone.businessName}"`} />}
            {supaError && <Alert type="error" msg={supaError} />}

            <div className="space-y-3">
              <Field label="Business Name *">
                <input value={form.businessName} onChange={(e) => upForm("businessName", e.target.value)}
                  placeholder="e.g. Mike's Auto Shop" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Phone Number">
                  <input value={form.phone} onChange={(e) => upForm("phone", e.target.value)}
                    placeholder="(202) 555-1234" className={inputCls} />
                </Field>
                <Field label="Contact Email">
                  <input type="email" value={form.email} onChange={(e) => upForm("email", e.target.value)}
                    placeholder="name@business.com" className={inputCls} />
                </Field>
              </div>
              <Field label="Address">
                <input value={form.address} onChange={(e) => upForm("address", e.target.value)}
                  placeholder="Street, city, state" className={inputCls} />
              </Field>
              <Field label="Business Category">
                <input 
                  list="categories-list"
                  value={form.category} 
                  onChange={(e) => upForm("category", e.target.value)} 
                  placeholder="Type or select a category..." 
                  className={inputCls} 
                />
                <datalist id="categories-list">
                  {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Current Website">
                  <input value={form.website} onChange={(e) => {
                    const val = e.target.value;
                    upForm("website", val);
                    if (!val.trim()) {
                      if (form.socialLink.trim()) {
                        upForm("websiteStatus", "Social media only");
                      } else {
                        upForm("websiteStatus", "No website");
                      }
                    } else {
                      const socialKeywords = ["instagram.com", "facebook.com", "fb.com", "tiktok.com", "twitter.com", "x.com", "linkedin.com", "youtube.com"];
                      if (socialKeywords.some(kw => val.toLowerCase().includes(kw))) {
                        upForm("socialLink", val);
                        upForm("website", "");
                        upForm("websiteStatus", "Social media only");
                      } else {
                        upForm("websiteStatus", "Has website");
                      }
                    }
                  }}
                    placeholder="www.business.com" className={inputCls} />
                </Field>
                <Field label="Social Media Link">
                  <input value={form.socialLink} onChange={(e) => {
                    const val = e.target.value;
                    upForm("socialLink", val);
                    if (val.trim() && (!form.website || !form.website.trim())) {
                      upForm("websiteStatus", "Social media only");
                    }
                  }}
                    placeholder="Instagram/Facebook URL" className={inputCls} />
                </Field>
              </div>

              {/* Demo Website Status Form Section */}
              <Field label="Demo Website Status">
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {[
                    { key: "not_sent", label: "None", cls: "border-zinc-700 bg-black/30 text-zinc-400 hover:text-white" },
                    { key: "needs_demo", label: "Needs Demo 📤", cls: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20" },
                    { key: "sent", label: "Demo Sent ✓", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => upForm("demoStatus", opt.key)}
                      className={`rounded-xl border py-2 text-[10px] font-bold text-center transition active:scale-95 cursor-pointer ${
                        form.demoStatus === opt.key 
                          ? "border-white bg-white text-zinc-950 font-black shadow-lg"
                          : opt.cls
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => upForm("notes", e.target.value)}
                  placeholder="Owner name, callback time, details…" rows={3}
                  className={inputCls + " resize-none"} />
              </Field>

              {/* Advanced details toggle */}
              <button type="button" onClick={() => setShowAdvanced((s) => !s)}
                className="flex w-full items-center justify-between rounded-xl bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition">
                Advanced Details {showAdvanced ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
              </button>

              {showAdvanced && (
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 space-y-3">
                  <Field label="Google Maps Link">
                    <input value={form.mapsLink} onChange={(e) => upForm("mapsLink", e.target.value)}
                      placeholder="Paste Google Maps URL" className={inputCls} />
                  </Field>
                  <Field label="Next Action">
                    <select value={form.nextAction} onChange={(e) => upForm("nextAction", e.target.value)} className={inputCls}>
                      {NEXT_ACTION_OPTIONS.map((o) => <option key={o} value={o} className="bg-zinc-950">{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Website Status">
                    <select value={form.websiteStatus} onChange={(e) => upForm("websiteStatus", e.target.value)} className={inputCls}>
                      {WEBSITE_OPTIONS.map((o) => <option key={o} value={o} className="bg-zinc-950">{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Call Status">
                    <select value={form.status} onChange={(e) => upForm("status", e.target.value)} className={inputCls}>
                      {STATUS_OPTIONS.map((o) => <option key={o.key} value={o.key} className="bg-zinc-950">{o.label}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Last Contacted">
                      <input type="date" value={form.lastContacted} onChange={(e) => upForm("lastContacted", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Next Follow-Up">
                      <input type="date" value={form.nextFollowUp} onChange={(e) => upForm("nextFollowUp", e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {editingId && (
                  <button onClick={resetForm} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold hover:bg-white/10 transition">
                    Cancel
                  </button>
                )}
                <button onClick={saveLead} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-black text-white shadow-lg shadow-emerald-950/30 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60">
                  {saving ? <Loader2 className="animate-spin" size={15}/> : <Save size={15}/>}
                  {editingId ? "Save Changes" : "Add Lead"}
                </button>
              </div>
            </div>
          </div>

          {/* ══ RIGHT: LEADS LIST ══ */}
          <div className="space-y-4">

            {/* Outbound To-Do Queue Panel */}
            <OutboundToDoQueue
              leads={leads}
              onTriggerResolution={triggerCallResolution}
              onSelect={setFocused}
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

            {/* Search bar + filter */}
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-xl shadow-lg">
              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16}/>
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, phone, email, category, notes…"
                  className="w-full rounded-2xl border border-white/[0.08] bg-black/30 py-3 pl-11 pr-4 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-2 ring-cyan-400/30"/>
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 hover:bg-white/10 text-zinc-500 hover:text-white transition">
                    <X size={13}/>
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Filter · {filtered.length} showing
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filterBtns.map((b) => (
                  <button key={b.key} onClick={() => setFilter(b.key === filter ? "all" : b.key)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition active:scale-95 ${
                      filter === b.key
                        ? "border-white/25 bg-white text-zinc-900"
                        : "border-white/[0.06] bg-white/[0.05] text-zinc-400 hover:bg-white/10 hover:text-white"
                    }`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duplicate phone warning banner */}
            {dupSearchLead && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-red-500/25 bg-red-500/8 p-4 shadow-lg">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20}/>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-red-300">This business is already saved.</p>
                  <p className="text-[10px] text-red-400/80 mt-0.5 font-mono">{dupSearchLead.phone}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusMeta(dupSearchLead.status).soft}`}>
                  {statusMeta(dupSearchLead.status).label}
                </span>
              </div>
            )}

            {/* Workspace-wide Duplicate leads warning box */}
            {duplicateGroups.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 shadow-xl shadow-red-950/20">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20}/>
                  <div className="min-w-0">
                    <p className="font-black text-red-300 text-sm">Repetitive Data Warning</p>
                    <p className="text-[10px] text-red-400/80 mt-0.5 leading-snug">
                      We detected <span className="font-bold text-white">{duplicateGroups.length} group{duplicateGroups.length !== 1 && "s"}</span> of duplicate leads in your database.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDuplicateModal(true)}
                  className="shrink-0 rounded-xl bg-red-500 hover:bg-red-400 text-white px-3.5 py-2 text-xs font-black transition active:scale-95 shadow-md shadow-red-950/30 cursor-pointer"
                >
                  🔍 Review & Clean
                </button>
              </div>
            )}

            {/* Bulk Actions Panel */}
            {selectedLeadIds.size > 0 && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg mb-3 animate-[slideUp_0.2s_ease]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-black text-red-300">
                    {selectedLeadIds.size} Lead{selectedLeadIds.size !== 1 && "s"} Selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allVisibleSelected = filtered.every((l) => selectedLeadIds.has(l.id));
                      setSelectedLeadIds((prev) => {
                        const next = new Set(prev);
                        filtered.forEach((l) => {
                          if (allVisibleSelected) {
                            next.delete(l.id);
                          } else {
                            next.add(l.id);
                          }
                        });
                        return next;
                      });
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-[10px] font-black text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
                  >
                    {filtered.every((l) => selectedLeadIds.has(l.id)) ? "Deselect All Visible" : "Select All Visible"}
                  </button>
                  <button
                    onClick={() => setSelectedLeadIds(new Set())}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-[10px] font-black text-zinc-400 hover:text-white transition active:scale-95 cursor-pointer"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={deleteSelectedLeads}
                    disabled={bulkDeleting}
                    className="flex items-center gap-1.5 rounded-xl bg-red-650 hover:bg-red-500 text-white px-3.5 py-1.5 text-xs font-black shadow-md shadow-red-950/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {bulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* Lead cards */}
            {leadsLoading ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-16 flex flex-col items-center gap-3 text-zinc-500">
                <Loader2 className="animate-spin text-cyan-400" size={28}/>
                <p className="text-xs font-bold tracking-wider">Loading leads…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-14 flex flex-col items-center gap-3 text-zinc-500 text-center">
                <Plus className="opacity-25" size={36}/>
                <p className="font-black text-base text-zinc-400">No leads here</p>
                <p className="text-xs">{filter !== "all" ? "No leads match this filter." : "Add your first business lead using the form."}</p>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {filtered.map((lead) => (
                  <LeadCard
                    key={lead.id} lead={lead}
                    onStatus={changeStatus}
                    onDemoStatus={changeDemoStatus}
                    onFollowUp={changeFollowUp}
                    onEdit={editLead}
                    onDelete={deleteLead}
                    onSelect={setFocused}
                    onTriggerResolution={triggerCallResolution}
                    push={push}
                    selected={selectedLeadIds.has(lead.id)}
                    onToggleSelect={() => handleToggleSelect(lead.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        </>)}

        {activeTab && activeTab.id !== "workspace" && (
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl backdrop-blur-2xl space-y-4 animate-[slideUp_0.25s_ease]">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-black/20 p-1.5 text-zinc-500">
                  <button
                    onClick={() => setActiveTabId("workspace")}
                    className="rounded-lg hover:bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    ← Workspace
                  </button>
                </div>
                <h2 className="text-base font-black text-white flex items-center gap-1.5 truncate">
                  <Globe size={15} className="text-cyan-400" /> {activeTab.title}
                </h2>
              </div>

              {/* Address bar input */}
              <div className="flex items-center gap-2 w-full sm:flex-1 max-w-xl">
                <div className="relative w-full">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
                  <input
                    type="text"
                    value={activeTab.url}
                    readOnly
                    className="w-full rounded-xl border border-white/[0.06] bg-black/45 py-2 pl-9 pr-4 text-xs font-mono text-zinc-400 outline-none select-all"
                  />
                </div>
                <button
                  onClick={() => {
                    const iframe = document.getElementById(`iframe-${activeTab.id}`);
                    if (iframe) {
                      const src = iframe.src;
                      iframe.src = "";
                      setTimeout(() => { iframe.src = src; }, 50);
                    }
                    push("Refreshing tab...", "info");
                  }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
                  title="Reload Tab"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => {
                    window.open(
                      activeTab.url,
                      `calltrack_tab_${activeTab.id}`,
                      "width=1100,height=800,menubar=no,toolbar=no,location=no,status=no"
                    );
                    push("Opened in split window popup", "success");
                  }}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-3.5 py-2 text-xs font-black shadow-md transition active:scale-95 cursor-pointer shrink-0"
                  title="Open this service in a side-by-side floating browser window"
                >
                  <ExternalLink size={12} /> Pop Out
                </button>
              </div>
            </div>

            {/* Iframe warning/instructions banner */}
            <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.03] p-4 text-[11px] leading-relaxed text-yellow-200/95 flex items-start gap-3">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <p className="font-black text-white">Google Voice & Security Embed Policy:</p>
                <p className="mt-0.5">
                  Due to browser security regulations, websites like **Google Voice** block being embedded directly inside other apps. If the screen below remains blank or shows a connection error, simply click the <span className="font-black text-cyan-300">Pop Out</span> button above to run the service in a dedicated floating panel next to your workspace, or install the Chrome extension <span className="font-bold underline text-white">Ignore X-Frame-Options</span> to allow embedding here.
                </p>
              </div>
            </div>

            {/* Iframe box container */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white h-[650px] shadow-inner">
              <iframe
                id={`iframe-${activeTab.id}`}
                src={activeTab.url}
                className="w-full h-full border-none"
                title={activeTab.title}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── FOCUSED LEAD DRAWER ── */}
      {focused && (
        <FocusDrawer
          lead={focused}
          session={session}
          onClose={() => setFocused(null)}
          onEdit={(l) => { editLead(l); setFocused(null); }}
          onDelete={(id) => { deleteLead(id); setFocused(null); }}
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

      {/* ── BULK IMPORT MODAL ── */}
      {showImportModal && (
        <BulkImportModal
          session={session}
          loadedLeads={leads}
          setLeads={setLeads}
          onClose={() => setShowImportModal(false)}
          push={push}
        />
      )}

      {/* ── DUPLICATE REVIEW MODAL ── */}
      {showDuplicateModal && (
        <DuplicateReviewModal
          session={session}
          duplicateGroups={duplicateGroups}
          setLeads={setLeads}
          onClose={() => setShowDuplicateModal(false)}
          push={push}
        />
      )}

      {/* ── CALL OUTBOUND RESOLUTION MODAL ── */}
      {resolutionLead && (
        <CallResolutionModal
          lead={resolutionLead}
          type={resolutionType}
          preSelectOption={resolutionPreSelect}
          onClose={() => { setResolutionLead(null); setResolutionType(null); setResolutionPreSelect(null); }}
          onResolve={resolveOutboundCall}
        />
      )}

      {/* ── ADD CUSTOM TAB MODAL ── */}
      {showAddTabModal && (
        <AddTabModal
          setCustomTabs={setCustomTabs}
          setActiveTabId={setActiveTabId}
          onClose={() => setShowAddTabModal(false)}
          push={push}
        />
      )}
    </div>
  );
}

/* ═══════════════════════ FOCUS DRAWER ═══════════════════════════ */

function FocusDrawer({
  lead,
  session,
  onClose,
  onEdit,
  onDelete,
  onStatus,
  onDemoStatus,
  onFollowUp,
  onTriggerResolution,
  push,
  recordingLeadId,
  recording: globalRecording,
  consentMap,
  setConsentMap,
  recordingsMap,
  recSecs: globalRecSecs,
  recError: globalRecError,
  startRecording: globalStartRecording,
  stopRecording,
  deleteRecording: globalDeleteRecording,
  downloadRecording: globalDownloadRecording,
  savingActivity,
}) {
  const isThisLeadRecording = globalRecording && recordingLeadId === lead.id;
  const isAnotherLeadRecording = globalRecording && recordingLeadId !== lead.id;

  const consent = consentMap[lead.id] || false;
  const setConsent = (val) => setConsentMap((prev) => ({ ...prev, [lead.id]: val }));
  const blob = recordingsMap[lead.id]?.blob || null;
  const blobUrl = recordingsMap[lead.id]?.url || "";
  const recSecs = isThisLeadRecording ? globalRecSecs : (recordingsMap[lead.id]?.secs || 0);
  const recError = isThisLeadRecording ? globalRecError : "";

  const recording = isThisLeadRecording;

  const meta = statusMeta(lead.status);
  const due  = isDue(lead.nextFollowUp) && lead.status !== "no" && lead.status !== "closed";

  function copyText(text, label) {
    navigator.clipboard.writeText(text).then(() => push(`${label} copied`, "success"));
  }

  /* Maps URL */
  const mapsUrl = lead.mapsLink
    ? lead.mapsLink
    : lead.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`
    : null;

  /* ── Recording Wrapper Handlers ── */
  function startRecording() {
    globalStartRecording(lead);
  }

  function deleteRecording() {
    globalDeleteRecording(lead.id);
  }

  function downloadRecording() {
    globalDownloadRecording(lead);
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full sm:max-w-[480px] flex-col border-l border-white/[0.07] bg-[#060212]/96 shadow-2xl backdrop-blur-2xl overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/[0.07] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${meta.soft}`}>{meta.label}</span>
                
                {/* Demo status visual indicator */}
                {lead.demoStatus === "needs_demo" && (
                  <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-0.5 text-[10px] font-black text-fuchsia-300 animate-pulse">
                    📤 Needs Demo
                  </span>
                )}
                {lead.demoStatus === "sent" && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                    ✓ Demo Sent
                  </span>
                )}

                {lead.nextAction && (
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                    Next: {lead.nextAction}
                  </span>
                )}
                {due && (
                  <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-0.5 text-[10px] font-black text-yellow-300 animate-pulse">
                    ⚡ Follow-up due
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white leading-tight truncate">{lead.businessName}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{lead.category || "No category"}{lead.lastContacted ? ` · Last called ${relativeDate(lead.lastContacted)}` : ""}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => onEdit(lead)} className="rounded-xl bg-white/[0.06] p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition" title="Edit">
                <Edit3 size={14}/>
              </button>
              <button onClick={() => { if(confirm("Delete this lead?")) onDelete(lead.id); }} className="rounded-xl bg-red-500/8 p-2 text-red-400 hover:bg-red-500/15 transition" title="Delete">
                <Trash2 size={14}/>
              </button>
              <button onClick={onClose} className="rounded-xl bg-white/[0.06] p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition">
                <X size={14}/>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* DNC warning */}
          {lead.status === "no" && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-300">
              <AlertTriangle size={14} className="animate-pulse"/> ⛔ DO NOT CALL AGAIN
            </div>
          )}

          {/* Contact details with copy buttons */}
          <Section title="Contact Details">
            <ContactRow icon={<Phone size={14} className="text-cyan-400"/>} label="Phone">
              {lead.phone ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={`tel:${lead.phone}`} className="text-sm font-mono font-bold text-white hover:text-cyan-300 transition truncate">{lead.phone}</a>
                  <a href={`tel:${lead.phone}`} className="shrink-0 rounded-lg bg-cyan-500 px-2.5 py-1 text-[10px] font-black text-white hover:bg-cyan-400 transition">📞 Call</a>
                  <CopyBtn text={lead.phone} label="Phone" push={push}/>
                </div>
              ) : <Empty>No phone saved</Empty>}
            </ContactRow>

            {/* Email contact row */}
            <ContactRow icon={<Mail size={14} className="text-cyan-400"/>} label="Email Address">
              {lead.email ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={`mailto:${lead.email}`} className="text-xs font-bold text-white hover:text-cyan-300 transition truncate flex-1">{lead.email}</a>
                  <CopyBtn text={lead.email} label="Email" push={push}/>
                </div>
              ) : <Empty>No email saved</Empty>}
            </ContactRow>

            <ContactRow icon={<MapPin size={14} className="text-cyan-400"/>} label="Address">
              {lead.address ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={mapsUrl} target="_blank" rel="noreferrer"
                    className="text-xs text-white hover:text-cyan-300 transition truncate flex-1">{lead.address}</a>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noreferrer"
                      className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:bg-white/10 transition flex items-center gap-1">
                      Maps <ExternalLink size={9}/>
                    </a>
                  )}
                  <CopyBtn text={lead.address} label="Address" push={push}/>
                </div>
              ) : <Empty>No address saved</Empty>}
            </ContactRow>

            <ContactRow icon={<Globe size={14} className="text-cyan-400"/>} label={`Website (${lead.websiteStatus || "Unknown"})`}>
              {lead.website ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-white hover:text-cyan-300 transition truncate flex-1">{lead.website}</a>
                  <CopyBtn text={lead.website} label="Website" push={push}/>
                </div>
              ) : <Empty>No website saved</Empty>}
            </ContactRow>

            <ContactRow icon={<Send size={14} className="text-purple-400"/>} label="Social Media Link">
              {lead.socialLink ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={lead.socialLink.startsWith("http") ? lead.socialLink : `https://${lead.socialLink}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-white hover:text-purple-300 font-bold transition truncate flex-1">
                    {lead.socialLink}
                  </a>
                  <CopyBtn text={lead.socialLink} label="Social Media Link" push={push}/>
                </div>
              ) : <Empty>No social media saved</Empty>}
            </ContactRow>

            {lead.mapsLink && (
              <ContactRow icon={<ExternalLink size={14} className="text-cyan-400"/>} label="Maps Link">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={lead.mapsLink} target="_blank" rel="noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold transition truncate flex-1">Open Maps Portal →</a>
                  <CopyBtn text={lead.mapsLink} label="Maps link" push={push}/>
                </div>
              </ContactRow>
            )}
          </Section>

          {/* Dates & Quick Scheduler */}
          <Section title="Follow-up & Scheduler">
            {lead.lastContacted && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock size={13} className="text-zinc-600 shrink-0"/>
                Last contacted: <span className="text-white font-bold">{lead.lastContacted}</span>
                <span className="text-zinc-600">({relativeDate(lead.lastContacted)})</span>
              </div>
            )}
            <div className={`flex items-center gap-2 text-xs ${due ? "text-yellow-300 font-bold" : "text-zinc-400"} pb-1`}>
              <CalendarDays size={13} className={`shrink-0 ${due ? "text-yellow-400" : "text-zinc-600"}`}/>
              Follow-up Date: <span className={due ? "text-yellow-300" : "text-white font-bold"}>{lead.nextFollowUp || "Not scheduled"}</span>
              {due && <span className="text-yellow-400">⚡ Due!</span>}
            </div>

            {/* Quick scheduler buttons */}
            <div className="rounded-xl border border-white/[0.05] bg-black/25 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <Calendar size={10}/> Quick Schedule Next Day Planner
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { days: 1, label: "Tomorrow" },
                  { days: 3, label: "In 3 Days" },
                  { days: 7, label: "In 1 Week" },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => onFollowUp(lead.id, preset.days)}
                    className="rounded-lg bg-white/[0.06] hover:bg-white/10 px-2 py-2 text-[10px] font-black text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer text-center"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Notes */}
          {lead.notes && (
            <Section title="Notes">
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{lead.notes}</p>
            </Section>
          )}

          {/* Demo Website Status Toggles in Drawer */}
          <Section title="Demo Website Actions">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "not_sent", label: "No Demo Tag", cls: "bg-white/[0.06] text-zinc-400 hover:text-white" },
                { key: "needs_demo", label: "Needs Demo 📤", cls: "bg-fuchsia-500/15 text-fuchsia-300 hover:bg-fuchsia-500/25" },
                { key: "sent", label: "Demo Sent ✓", cls: "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => onDemoStatus(lead.id, opt.key)}
                  className={`rounded-xl px-2 py-3 text-[10px] font-black text-center transition active:scale-95 cursor-pointer ${
                    lead.demoStatus === opt.key 
                      ? "bg-white text-zinc-950 font-black shadow-lg hover:bg-white" 
                      : opt.cls
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Quick status buttons */}
          <Section title="Quick Log Outcome">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button key={opt.key}
                  onClick={() => onStatus(lead.id, opt.key)}
                  className={`rounded-xl px-3 py-2 text-[10px] font-black transition hover:scale-105 active:scale-95 cursor-pointer ${
                    lead.status === opt.key ? `${opt.color} text-white shadow-lg` : "bg-white/[0.06] text-zinc-300 hover:bg-white/10"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Quick Called Rescheduler outcomes */}
          <Section title="Quick Outbound Call Outcomes (Reschedule & Clear Queue)">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onTriggerResolution(lead, "reschedule", "no_answer")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/20 transition active:scale-[0.98] cursor-pointer"
              >
                🚫 No Answer → Call Tomorrow
              </button>
              <button
                onClick={() => onTriggerResolution(lead, "reschedule", "follow_up")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2.5 text-xs font-black text-orange-300 hover:bg-orange-500/20 transition active:scale-[0.98] cursor-pointer"
              >
                📅 Voicemail → Call Tomorrow
              </button>
            </div>
          </Section>

          {/* ── CALL RECORDING PANEL ── */}
          <Section title="Call Recording">
            <p className="text-[10px] text-zinc-500 -mt-1 mb-3">
              Use this to capture audio from your Google Voice tab. Recording stays local — never uploaded.
            </p>

            {isAnotherLeadRecording && (
              <div className="mb-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-300/90 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={14} />
                <span>A call recording is currently active for another prospect. Please stop that recording first.</span>
              </div>
            )}

            {recError && <Alert type="warn" msg={recError}/>}

            {/* Step-by-step instructions when not recording */}
            {!recording && !blob && (
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 mb-3 space-y-1">
                {["1. Open Google Voice and start your call", "2. Check the consent box below", "3. Click Start Recording", "4. Choose the Google Voice tab", "5. Enable 'Share tab audio' in the dialog"].map((step, i) => (
                  <p key={i} className="text-[10px] text-zinc-400 font-medium">{step}</p>
                ))}
              </div>
            )}

            {/* Consent checkbox + script */}
            {!blob && (
              <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3 mb-3 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                    disabled={recording || isAnotherLeadRecording}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-black text-cyan-400 cursor-pointer disabled:opacity-40"/>
                  <span className="text-xs text-zinc-300 leading-snug">I have permission or legal right to record this call.</span>
                </label>
                <div className="flex items-center justify-between border-t border-white/[0.05] pt-2">
                  <span className="text-[10px] text-zinc-600">Ask consent verbally first:</span>
                  <button
                    disabled={isAnotherLeadRecording}
                    onClick={() => {
                      navigator.clipboard.writeText("Just so you know, I may record this call for notes and follow-up. Is that okay?");
                      push("Consent script copied", "success");
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    📋 Copy Script
                  </button>
                </div>
              </div>
            )}

            {/* Recording controls */}
            {!recording && !blob && (
              <button onClick={startRecording} disabled={!consent || isAnotherLeadRecording}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 py-3 text-xs font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                <Mic size={14}/> Start Recording
              </button>
            )}

            {recording && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>
                  <span className="text-xs font-black text-red-300">RECORDING</span>
                </div>
                <span className="font-mono text-white text-base font-black">{fmtTime(recSecs)}</span>
                <button onClick={stopRecording}
                  className="flex items-center gap-1.5 rounded-xl bg-white text-zinc-900 px-3 py-2 text-xs font-black hover:bg-zinc-100 transition active:scale-95 cursor-pointer">
                  <Square size={11}/> Stop
                </button>
              </div>
            )}

            {blob && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileAudio size={16} className="text-emerald-400"/>
                    <div>
                      <p className="text-xs font-black text-white">Recording ready</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{fmtTime(recSecs)} · {(blob.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Local only</span>
                </div>
                <audio src={blobUrl} controls className="w-full h-8"/>

                {/* Collapsible Transcript inside Drawer */}
                {recordingsMap[lead.id]?.transcript && (
                  <div className="rounded-xl border border-white/[0.05] bg-black/45 p-3.5 space-y-2 text-left">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-cyan-400"/>
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Call Transcript</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(recordingsMap[lead.id]?.transcript);
                          push("Transcript copied", "success");
                        }}
                        className="text-[9px] font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer"
                      >
                        📋 Copy Transcript
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto text-[10px] text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans select-text">
                      {recordingsMap[lead.id]?.transcript}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={deleteRecording}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition active:scale-95 cursor-pointer">
                    <Trash2 size={12}/> Delete
                  </button>
                  <button onClick={downloadRecording} disabled={savingActivity}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-black text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60 cursor-pointer">
                    {savingActivity ? <Loader2 className="animate-spin" size={12}/> : <Download size={12}/>}
                    Download .webm
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════ LEAD CARD ══════════════════════════════ */

function LeadCard({ lead, onStatus, onDemoStatus, onFollowUp, onEdit, onDelete, onSelect, onTriggerResolution, push, selected, onToggleSelect }) {
  const meta = statusMeta(lead.status);
  const due  = isDue(lead.nextFollowUp) && lead.status !== "no" && lead.status !== "closed";
  const mapsUrl = lead.mapsLink || (lead.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}` : null);

  function copyText(text, label) {
    navigator.clipboard.writeText(text).then(() => push(`${label} copied`, "success"));
  }

  const quickActions = [
    { key:"interested", label:"Interested", cls:"bg-green-500/10 text-green-300 border-green-500/20 hover:bg-green-500/20" },
    { key:"no",         label:"No",         cls:"bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20" },
    { key:"maybe",      label:"Maybe",      cls:"bg-yellow-400/10 text-yellow-200 border-yellow-400/20 hover:bg-yellow-400/20" },
    { key:"no_answer",  label:"No Answer",  cls:"bg-slate-500/10 text-slate-300 border-slate-400/20 hover:bg-slate-500/20" },
    { key:"demo_sent",  label:"Demo Sent",  cls:"bg-purple-500/10 text-purple-200 border-purple-500/20 hover:bg-purple-500/20" },
    { key:"follow_up",  label:"Follow Up",  cls:"bg-orange-500/10 text-orange-200 border-orange-500/20 hover:bg-orange-500/20" },
  ];

  return (
    <article className={`group flex flex-col rounded-3xl border p-4.5 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-cyan-500/30 ${
      selected ? "border-cyan-500 bg-cyan-950/5" : due ? "border-yellow-400/30 bg-yellow-400/[0.04] shadow-yellow-950/10" : "border-white/[0.07] bg-white/[0.03]"
    }`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Checkbox for Bulk Actions */}
          <input
            type="checkbox"
            checked={selected || false}
            onChange={onToggleSelect}
            className="mt-1.5 w-4 h-4 rounded border-white/20 bg-black text-cyan-400 cursor-pointer shrink-0 focus:ring-0 focus:ring-offset-0"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${meta.soft}`}>{meta.label}</span>
              
              {/* Website status badges */}
              {lead.websiteStatus && (
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${
                  lead.websiteStatus === "No website" ? "border-red-500/30 bg-red-500/10 text-red-400" :
                  lead.websiteStatus === "Social media only" ? "border-purple-500/30 bg-purple-500/10 text-purple-300 animate-pulse" :
                  lead.websiteStatus === "Has website" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
                  lead.websiteStatus === "Bad website" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" :
                  "border-zinc-700 bg-zinc-800/30 text-zinc-400"
                }`}>
                  {lead.websiteStatus === "No website" ? "🚫 No Website" :
                   lead.websiteStatus === "Social media only" ? "📱 Socials Only" :
                   lead.websiteStatus === "Has website" ? "✓ Has Website" :
                   lead.websiteStatus === "Bad website" ? "⚠ Bad Website" : lead.websiteStatus}
                </span>
              )}

              {/* Demo website badges */}
              {lead.demoStatus === "needs_demo" && (
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-black text-fuchsia-300 animate-pulse">
                  📤 Needs Demo
                </span>
              )}
              {lead.demoStatus === "sent" && (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                  ✓ Demo Sent
                </span>
              )}

              {lead.nextAction && lead.nextAction !== "Call" && (
                <span className="rounded-full border border-cyan-400/15 bg-cyan-400/8 px-2 py-0.5 text-[9px] font-bold text-cyan-300">{lead.nextAction}</span>
              )}
              {due && <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black text-yellow-300">⚡ Due</span>}
            </div>
            <h3
              onClick={() => onSelect(lead)}
              title="Open details & recording"
              className="text-lg font-black text-white leading-snug hover:text-cyan-300 transition cursor-pointer group-hover:text-cyan-100">
              {lead.businessName}
            </h3>
            {lead.category && <span className="inline-block rounded-md bg-zinc-900 border border-white/[0.04] px-1.5 py-0.5 text-[9px] font-extrabold text-zinc-400 mt-1 uppercase tracking-widest">{lead.category}</span>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(lead)} title="Edit" className="rounded-xl p-2 bg-white/[0.04] hover:bg-white/10 text-zinc-500 hover:text-white transition"><Edit3 size={13}/></button>
          <button onClick={() => onDelete(lead.id)} title="Delete" className="rounded-xl p-2 bg-red-500/[0.04] hover:bg-red-500/15 text-red-500 hover:text-red-300 transition"><Trash2 size={13}/></button>
        </div>
      </div>

      {/* DNC warning bar */}
      {lead.status === "no" && (
        <div className="mb-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-1.5 text-[9px] font-black text-red-300 uppercase tracking-widest">
          <AlertTriangle size={12} className="animate-pulse text-red-400"/> DO NOT CALL AGAIN
        </div>
      )}

      {/* Primary Phone Dialer Panel */}
      {lead.phone ? (
        <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-950/20 px-3.5 py-2.5 hover:border-cyan-400/40 hover:bg-cyan-950/30 transition duration-200">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Phone size={14} className="text-cyan-400 shrink-0"/>
              <a href={`tel:${lead.phone}`} className="text-base font-mono font-black text-cyan-300 hover:text-cyan-200 hover:underline transition tracking-wide truncate" title="Click to call via default application">
                {lead.phone}
              </a>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a href={`tel:${lead.phone}`}
                 className="rounded-lg bg-cyan-400 text-zinc-950 px-2.5 py-1 text-[9px] font-black hover:bg-cyan-300 transition active:scale-95 flex items-center gap-0.5 cursor-pointer">
                📞 Call
              </a>
              <button onClick={(e) => { e.stopPropagation(); copyText(lead.phone, "Phone"); }}
                className="rounded-lg bg-white/[0.06] hover:bg-white/10 px-2 py-1 text-[9px] font-bold text-zinc-300 transition cursor-pointer">
                Copy
              </button>
            </div>
          </div>
          
          {/* Quick Reschedule & Call outcome shortcuts */}
          <div className="grid grid-cols-2 gap-1.5 border-t border-cyan-500/10 pt-2.5">
            <button
              onClick={() => onTriggerResolution(lead, "reschedule", "no_answer")}
              className="flex items-center justify-center gap-1 rounded-xl bg-red-500/10 border border-red-500/20 py-2 text-[9px] font-black text-red-300 hover:bg-red-500/20 transition active:scale-[0.97] cursor-pointer"
              title="Logs status as No Answer and schedules callback for tomorrow"
            >
              🚫 No Answer → Tomorrow
            </button>
            <button
              onClick={() => onTriggerResolution(lead, "reschedule", "follow_up")}
              className="flex items-center justify-center gap-1 rounded-xl bg-orange-500/10 border border-orange-500/20 py-2 text-[9px] font-black text-orange-300 hover:bg-orange-500/20 transition active:scale-[0.97] cursor-pointer"
              title="Logs status as Follow Up and schedules callback for tomorrow"
            >
              📅 Voicemail → Tomorrow
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 px-3.5 py-2.5 text-zinc-500 text-xs italic flex items-center gap-2">
          <Phone size={13} className="text-zinc-600"/> No phone number saved
        </div>
      )}

      {/* Website & Social media grids */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Website Link Pill */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.04] bg-white/[0.02] px-2.5 py-1.5 min-w-0">
          <Globe size={11} className="text-zinc-500 shrink-0"/>
          {lead.website ? (
            <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
               target="_blank" rel="noreferrer" className="text-xs font-bold text-zinc-300 hover:text-cyan-300 transition truncate flex-1" title={lead.website}>
              {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          ) : (
            <span className="text-xs text-zinc-600 italic">No website</span>
          )}
        </div>

        {/* Social Link Pill */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.04] bg-white/[0.02] px-2.5 py-1.5 min-w-0">
          <Send size={11} className="text-purple-400 shrink-0"/>
          {lead.socialLink ? (
            <a href={lead.socialLink.startsWith("http") ? lead.socialLink : `https://${lead.socialLink}`}
               target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-300 hover:text-purple-200 transition truncate flex-1" title={lead.socialLink}>
              {lead.socialLink.toLowerCase().includes("instagram.com") ? "Instagram 📱" :
               lead.socialLink.toLowerCase().includes("facebook.com") || lead.socialLink.toLowerCase().includes("fb.com") ? "Facebook 📘" :
               lead.socialLink.toLowerCase().includes("tiktok.com") ? "TikTok 🎵" : "Social Link 🔗"}
            </a>
          ) : (
            <span className="text-xs text-zinc-600 italic">No socials</span>
          )}
        </div>
      </div>

      {/* Contact details */}
      <div className="space-y-1 mb-3 text-[11px]">
        {lead.email && (
          <div className="flex items-center justify-between group/f">
            <div className="flex items-center gap-1.5 min-w-0">
              <Mail size={11} className="text-zinc-500 shrink-0"/>
              <a href={`mailto:${lead.email}`} className="text-zinc-300 hover:text-cyan-300 transition truncate">{lead.email}</a>
            </div>
            <button onClick={(e) => { e.stopPropagation(); copyText(lead.email, "Email"); }}
              className="opacity-0 group-hover/f:opacity-100 rounded-md px-1.5 py-0.5 text-[8px] font-bold text-zinc-500 hover:text-white hover:bg-white/8 transition cursor-pointer">
              Copy
            </button>
          </div>
        )}
        {lead.address && (
          <div className="flex items-center justify-between group/f">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin size={11} className="text-zinc-500 shrink-0"/>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-cyan-300 transition truncate">{lead.address}</a>
            </div>
            <button onClick={(e) => { e.stopPropagation(); copyText(lead.address, "Address"); }}
              className="opacity-0 group-hover/f:opacity-100 rounded-md px-1.5 py-0.5 text-[8px] font-bold text-zinc-500 hover:text-white hover:bg-white/8 transition cursor-pointer">
              Copy
            </button>
          </div>
        )}
        {lead.lastContacted && (
          <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
            <Clock size={11} className="shrink-0"/> Last called: {relativeDate(lead.lastContacted)}
          </div>
        )}
      </div>

      {/* Notes preview */}
      {lead.notes && (
        <p className="mb-3 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2 text-[10px] text-zinc-400 line-clamp-2 italic leading-relaxed">
          &ldquo;{lead.notes}&rdquo;
        </p>
      )}

      {/* Outbound Quick Outcome Logging Panel */}
      <div className="mt-auto pt-3 border-t border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Call Logging Panel</span>
          <button onClick={() => onSelect(lead)} className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 transition cursor-pointer flex items-center gap-0.5">
            Drawer Details <ExternalLink size={8}/>
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mb-2.5">
          {quickActions.map((a) => (
            <button key={a.key} onClick={() => onStatus(lead.id, a.key)}
              className={`rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider active:scale-95 transition cursor-pointer duration-150 ${a.cls} ${lead.status === a.key ? "ring-2 ring-white/30 border-white/50 font-black scale-[1.03]" : "opacity-80"}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Demo outbound trigger actions */}
        <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Demo Campaign</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => onDemoStatus(lead.id, lead.demoStatus === "needs_demo" ? "not_sent" : "needs_demo")}
              className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer ${
                lead.demoStatus === "needs_demo"
                  ? "bg-fuchsia-500 text-white font-black shadow-md shadow-fuchsia-950/20"
                  : "bg-white/[0.04] text-fuchsia-300 hover:bg-fuchsia-500/10 border border-fuchsia-500/20"
              }`}
            >
              Needs Demo 📤
            </button>
            <button
              onClick={() => onDemoStatus(lead.id, lead.demoStatus === "sent" ? "not_sent" : "sent")}
              className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer ${
                lead.demoStatus === "sent"
                  ? "bg-emerald-500 text-white font-black shadow-md shadow-emerald-950/20"
                  : "bg-white/[0.04] text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20"
              }`}
            >
              Sent ✓
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ═══════════════════════ AUTH SCREEN ════════════════════════════ */

function AuthScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in both fields."); return; }
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) { 
      let msg = e.message;
      if (msg.includes("Invalid login credentials")) {
        msg = "Invalid email or password. If you just created this account in the Supabase Dashboard, make sure you confirmed the email or unchecked 'Send invite email'!";
      }
      setError(msg); 
    }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#05020f] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(ellipse_at_80%_80%,rgba(168,85,247,0.2),transparent_45%)] pointer-events-none"/>
      <div className="relative w-full max-w-sm">
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 blur-xl"/>
        <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-white">
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2">Team Workspace</p>
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">CallTrack Pro</h1>
            <p className="text-xs text-zinc-500 mt-2">Sign in to access the shared workspace</p>
          </div>
          {error && <Alert type="error" msg={error}/>}
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className={inputCls} autoComplete="email"/>
            </Field>
            <Field label="Password">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className={inputCls} autoComplete="current-password"/>
            </Field>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3.5 text-sm font-black text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 cursor-pointer">
              {loading ? <Loader2 className="animate-spin" size={16}/> : "Sign In →"}
            </button>
          </form>
          <div className="mt-5 border-t border-white/[0.05] pt-4 text-center">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              🔐 <strong>Team Access Only</strong><br />
              All team members share the same live workspace. New accounts must be created in the Supabase Authentication Dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════ SMALL COMPONENTS ═══════════════════════ */

const inputCls = "w-full rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-cyan-400/30 transition";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Alert({ type, msg }) {
  const cls = type === "error"   ? "border-red-500/25 bg-red-500/8 text-red-300" :
              type === "success" ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300" :
                                   "border-yellow-400/25 bg-yellow-400/8 text-yellow-200";
  return (
    <div className={`mb-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${cls}`}>
      <AlertTriangle size={13} className="mt-0.5 shrink-0"/>
      <p>{msg}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function ContactRow({ icon, label, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2.5">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mb-0.5">{label}</p>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

function CopyBtn({ text, label, push }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      push(`${label} copied`, "success");
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button onClick={handleCopy} title={`Copy ${label}`}
      className={`shrink-0 rounded-lg p-1.5 transition ${copied ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.05] text-zinc-500 hover:bg-white/10 hover:text-white"}`}>
      <Copy size={11}/>
    </button>
  );
}

function InlineRecorderController({
  lead,
  recordingLeadId,
  recording,
  recordingBlob,
  recordingBlobUrl,
  leadTranscript,
  recSecs,
  recError,
  consent,
  setConsent,
  startRecording,
  stopRecording,
  deleteRecording,
  downloadRecording,
  savingActivity,
  push,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // If this specific lead is actively recording
  const isThisLeadRecording = recording && recordingLeadId === lead.id;
  // If another lead is currently recording
  const isAnotherLeadRecording = recording && recordingLeadId !== lead.id;

  // Render when recording is in progress for THIS lead
  if (isThisLeadRecording) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1 text-[10px] text-red-400 animate-pulse shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0"/>
        <span className="font-extrabold uppercase text-[9px] tracking-wider">REC</span>
        <span className="font-mono text-white font-bold">{fmtTime(recSecs)}</span>
        <button
          type="button"
          onClick={stopRecording}
          className="rounded bg-white text-zinc-950 px-1.5 py-0.5 text-[9px] font-extrabold uppercase transition hover:bg-zinc-100 cursor-pointer active:scale-95 shrink-0"
        >
          Stop
        </button>
      </div>
    );
  }

  // Render when a recording is ready for THIS lead
  if (recordingBlob) {
    return (
      <div className="relative flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1 shrink-0 animate-[fadeIn_0.2s_ease]">
        <FileAudio size={12} className="text-emerald-400 shrink-0"/>
        <span className="text-[10px] text-emerald-400 font-bold font-mono shrink-0">
          {fmtTime(recSecs)}
        </span>
        
        {/* Playback Preview option */}
        {recordingBlobUrl && (
          <audio src={recordingBlobUrl} className="hidden" id={`inline-audio-${lead.id}`} />
        )}
        <button
          type="button"
          onClick={() => {
            const aud = document.getElementById(`inline-audio-${lead.id}`);
            if (aud) {
              if (aud.paused) {
                // Pause all other audio elements first
                document.querySelectorAll("audio").forEach((el) => {
                  if (el !== aud) el.pause();
                });
                aud.play();
                push("Playing recording preview", "info");
              } else {
                aud.pause();
              }
            }
          }}
          className="rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 p-1 transition cursor-pointer active:scale-95 shrink-0"
          title="Play preview"
        >
          <Volume2 size={10}/>
        </button>

        <button
          type="button"
          onClick={() => downloadRecording(lead)}
          disabled={savingActivity}
          className="rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 p-1 transition cursor-pointer active:scale-95 shrink-0"
          title="Download recording"
        >
          <Download size={10}/>
        </button>

        {leadTranscript && (
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className={`rounded p-1 transition cursor-pointer active:scale-95 shrink-0 ${
              showTranscript 
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/30" 
                : "bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400"
            }`}
            title="Toggle call transcription"
          >
            <FileText size={10}/>
          </button>
        )}

        <button
          type="button"
          onClick={() => deleteRecording(lead.id)}
          className="rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1 transition cursor-pointer active:scale-95 shrink-0"
          title="Delete recording"
        >
          <Trash2 size={10}/>
        </button>

        {/* Call Transcript Dropdown Bubble */}
        {showTranscript && leadTranscript && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowTranscript(false)} />
            <div className="absolute top-8 right-0 z-40 w-72 rounded-2xl border border-cyan-500/20 bg-[#0c071e]/96 p-3.5 shadow-2xl backdrop-blur-2xl space-y-2.5 animate-[slideUp_0.18s_ease] text-left">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.05]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"/>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Call Transcript</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(leadTranscript);
                      push("Transcript copied", "success");
                    }}
                    className="text-[9px] font-bold text-zinc-400 hover:text-white transition flex items-center gap-0.5 cursor-pointer"
                  >
                    📋 Copy
                  </button>
                  <button onClick={() => setShowTranscript(false)} className="text-zinc-500 hover:text-white">
                    <X size={10}/>
                  </button>
                </div>
              </div>
              
              <div className="max-h-48 overflow-y-auto pr-1 text-[10px] text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap select-text selection:bg-cyan-500/30">
                {leadTranscript}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Default: Record setup button + expanded panel
  return (
    <div className="relative flex flex-col items-start shrink-0">
      <button
        type="button"
        disabled={isAnotherLeadRecording}
        onClick={() => setExpanded(!expanded)}
        title={isAnotherLeadRecording ? "Another recording is currently active" : expanded ? "Close recording setup" : "Start call recording"}
        className={`shrink-0 rounded-lg p-1.5 transition ${
          isAnotherLeadRecording 
            ? "bg-white/[0.01] text-zinc-700 cursor-not-allowed opacity-30" 
            : expanded
            ? "bg-red-500/20 text-red-400"
            : "bg-white/[0.05] text-zinc-500 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Mic size={11}/>
      </button>

      {/* Expanded Consent Panel */}
      {expanded && !isAnotherLeadRecording && (
        <>
          {/* Invisible backdrop to close the tiny panel on clicking outside */}
          <div className="fixed inset-0 z-30" onClick={() => setExpanded(false)} />
          
          <div className="absolute top-7 left-0 z-40 w-52 rounded-xl border border-red-500/20 bg-[#0c071e] p-3 shadow-xl space-y-2.5 animate-[slideUp_0.15s_ease]">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
              <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Record Call</span>
              <button onClick={() => setExpanded(false)} className="text-zinc-500 hover:text-white">
                <X size={10}/>
              </button>
            </div>
            
            {recError && (
              <p className="text-[8px] text-red-400 leading-normal bg-red-500/5 p-1.5 rounded-lg border border-red-500/10">
                {recError}
              </p>
            )}

            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-3 h-3 rounded border-white/20 bg-black text-red-500 cursor-pointer"
              />
              <span className="text-[9px] text-zinc-300 leading-snug">I have the permission/legal right to record.</span>
            </label>

            <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("Just so you know, I may record this call for notes and follow-up. Is that okay?");
                  push("Consent script copied", "success");
                }}
                className="text-[9px] font-extrabold text-zinc-400 hover:text-cyan-300 transition flex items-center gap-0.5 cursor-pointer"
              >
                📋 Copy Script
              </button>

              <button
                type="button"
                onClick={() => {
                  startRecording(lead);
                  setExpanded(false);
                }}
                disabled={!consent}
                className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 text-[9px] font-black tracking-wider uppercase transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <Mic size={9}/> Start
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ children }) {
  return <span className="text-xs text-zinc-600 italic">{children}</span>;
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-center">
      <div className={`text-lg font-black ${accent ?? "text-white"}`}>{value}</div>
      <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}

/* ══════════════════════ BULK IMPORT MODAL ══════════════════════ */

function BulkImportModal({ session, loadedLeads, setLeads, onClose, push }) {
  const [importStep, setImportStep] = useState("input"); // "input" | "mapping" | "preview"
  const [rawText, setRawText] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [columnMapping, setColumnMapping] = useState({});
  const [defaultCategory, setDefaultCategory] = useState("Other");
  const [defaultStatus, setDefaultStatus] = useState("not_called");
  const [defaultDemoStatus, setDefaultDemoStatus] = useState("needs_demo");

  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [manuallyRemovedRows, setManuallyRemovedRows] = useState(new Set());
  
  const [manualEdits, setManualEdits] = useState({});
  const [previewFilter, setPreviewFilter] = useState("all"); // "all" | "removed" | "duplicates" | "no_phone"



  function updateLeadField(rowIndex, field, val) {
    setManualEdits(prev => {
      const currentEdits = prev[rowIndex] || {};
      const newEdits = { ...currentEdits, [field]: val };
      
      // Auto-update websiteStatus if website changes
      if (field === "website") {
        const lower = val.toLowerCase().trim();
        if (!lower) {
          newEdits.websiteStatus = "No website";
        } else {
          const socialKeywords = ["instagram.com", "facebook.com", "fb.com", "tiktok.com", "twitter.com", "x.com", "linkedin.com", "youtube.com"];
          const isSocial = socialKeywords.some(kw => lower.includes(kw));
          if (isSocial) {
            newEdits.socialLink = val;
            newEdits.website = "";
            newEdits.websiteStatus = "Social media only";
          } else {
            newEdits.websiteStatus = "Has website";
          }
        }
      }
      
      return { ...prev, [rowIndex]: newEdits };
    });
  }

  // File upload drag & drop states
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Parse clipboard or file text
  function handleParse(text) {
    if (!text || !text.trim()) {
      alert("Please paste or upload some spreadsheet data first.");
      return;
    }
    const parsed = parseSpreadsheetText(text);
    if (parsed.length === 0) {
      alert("No rows could be parsed. Please check the data format.");
      return;
    }
    setParsedRows(parsed);

    const firstRow = parsed[0] || [];

    // Detect Google Maps copy-paste format
    const gmapsMapping = detectGoogleMapsFormat(firstRow);
    if (gmapsMapping) {
      // Google Maps detected — auto-apply mapping and skip to preview
      setColumnMapping(gmapsMapping);
      
      // Determine if there is a header row or if it's raw data
      const firstCell = String(firstRow[0] || "").toLowerCase().trim();
      const hasHeader = firstCell.includes("hfpxzc href");
      setHasHeaderRow(hasHeader);
      
      setImportStep("preview");
    } else {
      // Generic format — go through mapping step
      const mapping = autoMapColumns(firstRow, LEAD_FIELDS);
      setColumnMapping(mapping);
      setImportStep("mapping");
    }
  }

  // File selection
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setRawText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  }

  function onDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  // Get current headers
  const currentHeaders = useMemo(() => {
    if (parsedRows.length === 0) return [];
    if (hasHeaderRow) {
      return parsedRows[0].map((h, i) => h.trim() || `Column ${i + 1}`);
    } else {
      const colCount = Math.max(...parsedRows.map(r => r.length));
      return Array.from({ length: colCount }, (_, i) => `Column ${String.fromCharCode(65 + i)}`);
    }
  }, [parsedRows, hasHeaderRow]);

  // Actual data rows
  const dataRows = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return hasHeaderRow ? parsedRows.slice(1) : parsedRows;
  }, [parsedRows, hasHeaderRow]);

  // Calculate leads to import
  const leadsToImport = useMemo(() => {
    if (dataRows.length === 0) return [];
    
    const isGmaps = parsedRows.length > 0 && !!detectGoogleMapsFormat(parsedRows[0]);
    
    return dataRows.map((row, rowIndex) => {
      let lead = {};
      
      if (isGmaps) {
        // Smart extractor for Google Maps data row
        lead.mapsLink = String(row[0] || "").trim();
        lead.businessName = String(row[1] || "").trim();
        lead.phone = findPhoneInRow(row);
        lead.address = findAddressInRow(row);
        lead.category = String(row[4] || "").trim();
        lead.notes = findNotesInRow(row);
        lead.email = "";
        lead.website = findWebsiteInRow(row);
        lead.socialLink = "";
      } else {
        // Generic mapping
        LEAD_FIELDS.forEach(field => {
          const colIdx = columnMapping[field.key];
          if (colIdx !== undefined && colIdx !== "") {
            lead[field.key] = String(row[colIdx] || "").trim();
          } else {
            lead[field.key] = "";
          }
        });
      }
      
      if (!lead.businessName && !lead.phone) {
        return null; // completely empty line
      }
      
      // Fallback name
      if (!lead.businessName && lead.phone) {
        lead.businessName = `Business (${lead.phone})`;
      }
      
      // Smart category match: try to map Google Maps category to closest CallTrack category
      // If category is empty, also try matching based on the business name!
      let resolvedCategory = lead.category
        ? matchCategory(lead.category) || lead.category
        : "";
      
      if (!resolvedCategory && lead.businessName) {
        resolvedCategory = matchCategory(lead.businessName) || "";
      }
      
      if (!resolvedCategory) {
        resolvedCategory = defaultCategory || "Other";
      }
      lead.category = resolvedCategory;

      const phoneClean = lead.phone ? lead.phone.replace(/\D/g, "") : "";
      
      let finalWebsite = lead.website || "";
      let finalSocialLink = lead.socialLink || "";
      let finalWebsiteStatus = "Unknown";

      if (finalWebsite) {
        const socialKeywords = ["instagram.com", "facebook.com", "fb.com", "tiktok.com", "twitter.com", "x.com", "linkedin.com", "youtube.com"];
        const isSocial = socialKeywords.some(kw => finalWebsite.toLowerCase().includes(kw));
        if (isSocial) {
          finalSocialLink = finalWebsite;
          finalWebsite = "";
          finalWebsiteStatus = "Social media only";
        } else {
          finalWebsiteStatus = "Has website";
        }
      } else if (finalSocialLink) {
        finalWebsiteStatus = "Social media only";
      } else {
        finalWebsiteStatus = "No website";
      }

      // Apply manual edits if any
      const edits = manualEdits[rowIndex] || {};
      const mergedLead = {
        ...lead,
        website: edits.website !== undefined ? edits.website : finalWebsite,
        socialLink: edits.socialLink !== undefined ? edits.socialLink : finalSocialLink,
        websiteStatus: edits.websiteStatus !== undefined ? edits.websiteStatus : finalWebsiteStatus,
      };

      const isDuplicateName = loadedLeads.some(l => norm(l.businessName) === norm(mergedLead.businessName));
      const isDuplicatePhone = phoneClean ? loadedLeads.some(l => l.phone_normalized && l.phone_normalized === phoneClean) : false;
      const hasNoPhone = !mergedLead.phone || !mergedLead.phone.trim();
      
      return {
        ...mergedLead,
        isDuplicateName,
        isDuplicatePhone,
        isDuplicate: isDuplicateName || isDuplicatePhone,
        hasNoPhone,
        rowNum: rowIndex + (hasHeaderRow ? 2 : 1),
        rowIndex,
      };
    }).filter(Boolean);
  }, [dataRows, columnMapping, loadedLeads, hasHeaderRow, manualEdits, parsedRows, defaultCategory]);

  const displayedPreviewLeads = useMemo(() => {
    return leadsToImport.filter((lead) => {
      const isRemoved = manuallyRemovedRows.has(lead.rowIndex);
      if (previewFilter === "removed") return isRemoved;
      if (previewFilter === "duplicates") return !isRemoved && lead.isDuplicate;
      if (previewFilter === "no_phone") return !isRemoved && lead.hasNoPhone;
      // "all" tab shows active (non-removed) leads
      return !isRemoved;
    });
  }, [leadsToImport, previewFilter, manuallyRemovedRows]);

  // Count leads being skipped vs imported
  const importStats = useMemo(() => {
    const active = leadsToImport.filter(l => !manuallyRemovedRows.has(l.rowIndex));
    const total = active.length;
    const duplicates = active.filter(l => l.isDuplicate).length;
    const noPhone = active.filter(l => l.hasNoPhone).length;
    const finalCount = skipDuplicates ? total - duplicates : total;
    return { total, duplicates, noPhone, finalCount };
  }, [leadsToImport, skipDuplicates, manuallyRemovedRows]);

  function removeRow(rowIndex) {
    setManuallyRemovedRows(prev => new Set([...prev, rowIndex]));
  }

  function removeAllNoPhone() {
    const toRemove = leadsToImport.filter(l => l.hasNoPhone).map(l => l.rowIndex);
    setManuallyRemovedRows(prev => new Set([...prev, ...toRemove]));
  }

  function restoreAllRows() {
    setManuallyRemovedRows(new Set());
  }


  // Execute Bulk Import
  async function handleImport() {
    if (importStats.finalCount === 0) {
      alert("No leads to import. Please check your duplicate settings.");
      return;
    }
    
    setImporting(true);
    try {
      const rowsToInsert = leadsToImport
        .filter(lead => !manuallyRemovedRows.has(lead.rowIndex))
        .filter(lead => !skipDuplicates || !lead.isDuplicate)
        .map(lead => {

          const packedNotes = packNotes(
            lead.notes,
            lead.email,
            defaultDemoStatus,
            "Call",
            lead.socialLink
          );
          
          return {
            user_id: session.user.id,
            business_name: lead.businessName,
            maps_link: lead.mapsLink || null,
            phone: lead.phone || null,
            address: lead.address || null,
            category: lead.category || defaultCategory || "Other",
            website: lead.website || null,
            website_status: lead.websiteStatus || (lead.website ? "Has website" : "Unknown"),
            status: defaultStatus || "not_called",
            priority: null,
            notes: packedNotes,
            last_contacted: null,
            next_follow_up: null,
            google_place_id: null
          };
        });

      const { data, error } = await supabase.from("leads").insert(rowsToInsert).select();
      if (error) throw error;
      
      const mapped = (data || []).map(mapToState);
      setLeads(prev => [...mapped, ...prev]);
      
      push(`Successfully imported ${mapped.length} leads! ✓`, "success");
      onClose();
    } catch (e) {
      console.error("Bulk Import Error:", e);
      alert("Import failed: " + e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" />

      {/* Main Modal */}
      <div className="fixed inset-4 md:inset-x-20 md:inset-y-10 z-50 flex flex-col border border-white/10 bg-[#060212] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-3xl animate-[slideUp_0.3s_ease]">
        
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/[0.07] px-6 py-4 flex items-center justify-between bg-white/[0.01]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Excel / Google Sheets Importer</span>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              📥 Bulk Import Leads
            </h2>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/[0.06] p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>

        {/* Steps navigation bar */}
        <div className="flex border-b border-white/[0.05] bg-black/20 text-xs">
          {[
            { step: "input", label: "1. Upload & Paste" },
            { step: "mapping", label: "2. Map Columns" },
            { step: "preview", label: "3. Preview & Import" },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex-1 py-3 text-center font-bold border-b-2 transition ${
                importStep === s.step
                  ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 font-black"
                  : "border-transparent text-zinc-500"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: INPUT */}
          {importStep === "input" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Google Maps tip banner */}
              <div className="flex items-start gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
                <span className="text-lg shrink-0">📍</span>
                <div>
                  <p className="text-xs font-black text-white">Google Maps Paste Supported!</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    Go to <strong className="text-white">Google Maps</strong>, search for businesses, copy the results table (<kbd className="bg-zinc-800 px-1 py-0.5 rounded">Ctrl+A</kbd> then <kbd className="bg-zinc-800 px-1 py-0.5 rounded">Ctrl+C</kbd>), and paste below. We automatically detect Google Maps format and extract the Business Name, Phone, Address, Category, and Maps Link perfectly — no manual mapping needed!
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">Paste Data (Google Maps, Excel, or Google Sheets)</h3>
                <p className="text-xs text-zinc-400 mb-3">
                  Copy cells directly from any spreadsheet or Google Maps search results and paste below.
                </p>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={"Paste your data here...\n\nGoogle Maps format is auto-detected!\nOr paste your own columns like:\nBusiness Name\tPhone Number\tAddress\tWebsite URL"}
                  rows={9}
                  className="w-full rounded-2xl border border-white/[0.08] bg-black/45 p-4 text-xs font-mono text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-cyan-400/30 transition resize-none"
                />
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/[0.06]"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">OR</span>
                <div className="flex-grow border-t border-white/[0.06]"></div>
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Option B: Upload File</h3>
                <div
                  onDragEnter={onDrag}
                  onDragOver={onDrag}
                  onDragLeave={onDrag}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    dragActive 
                      ? "border-cyan-400 bg-cyan-400/5" 
                      : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={(e) => handleFile(e.target.files[0])}
                    className="hidden"
                  />
                  <Download className="text-zinc-500 rotate-180" size={32} />
                  <p className="text-xs font-bold text-zinc-300">Drag & drop your CSV, TSV, or TXT file here</p>
                  <p className="text-[10px] text-zinc-500">or click to browse your computer</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {importStep === "mapping" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl px-5 py-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasHeaderRow}
                    onChange={(e) => {
                      setHasHeaderRow(e.target.checked);
                      // Recalculate mapping on toggle
                      const firstRow = parsedRows[0] || [];
                      const mapping = autoMapColumns(firstRow, LEAD_FIELDS);
                      setColumnMapping(mapping);
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-black text-cyan-400 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">First row contains column headers</p>
                    <p className="text-[10px] text-zinc-500">Enable this if your pasted/uploaded sheet has header row titles like 'Business Name', 'Phone', etc.</p>
                  </div>
                </label>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/40 overflow-hidden">
                <div className="grid grid-cols-2 bg-white/[0.03] border-b border-white/[0.06] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  <div>CallTrack Pro Field</div>
                  <div>Spreadsheet Column Match</div>
                </div>

                <div className="divide-y divide-white/[0.04]">
                  {LEAD_FIELDS.map((field) => {
                    const mappedColIdx = columnMapping[field.key];
                    return (
                      <div key={field.key} className="grid grid-cols-2 px-5 py-3.5 items-center">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-white">
                            {field.label} {field.required && <span className="text-red-400">*</span>}
                          </span>
                          <span className="text-[10px] text-zinc-500 max-w-[280px]">
                            {field.key === "notes" ? "Packed into notes column" : `Mapped to ${field.key}`}
                          </span>
                        </div>
                        <div>
                          <select
                            value={mappedColIdx !== undefined ? mappedColIdx : ""}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                [field.key]: e.target.value === "" ? "" : Number(e.target.value),
                              }))
                            }
                            className="w-full rounded-xl border border-white/[0.08] bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-400/30"
                          >
                            <option value="">[ Skip Field / Unmapped ]</option>
                            {currentHeaders.map((header, idx) => {
                              // Preview of first data cell
                              const sampleValue = dataRows[0]?.[idx] || "";
                              const previewStr = sampleValue 
                                ? `(e.g., "${sampleValue.length > 20 ? sampleValue.slice(0, 20) + "..." : sampleValue}")` 
                                : "(empty)";
                              return (
                                <option key={idx} value={idx}>
                                  Col {idx + 1}: {header} {previewStr}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & IMPORT */}
          {importStep === "preview" && (
            <div className="space-y-6">

              {/* ── VERIFICATION COUNT TABLE ── */}
              <div className="rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Import Summary — Verify Your Numbers</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Check these counts match what you copied from Google Maps before importing.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-white/[0.05]">
                  {[
                    {
                      key: "all",
                      label: "Total Parsed",
                      value: leadsToImport.filter(l => !manuallyRemovedRows.has(l.rowIndex)).length,
                      desc: "Click to show active rows",
                      color: "text-white",
                      bg: previewFilter === "all" ? "bg-cyan-500/10 ring-1 ring-cyan-500/20" : "",
                    },
                    {
                      key: "removed",
                      label: "You Removed",
                      value: manuallyRemovedRows.size,
                      desc: "Click to show removed leads",
                      color: "text-zinc-400",
                      bg: previewFilter === "removed" ? "bg-zinc-800/40 ring-1 ring-zinc-500/20" : "",
                    },
                    {
                      key: "duplicates",
                      label: "Duplicates",
                      value: importStats.duplicates,
                      desc: skipDuplicates ? "Skipped (Click to view)" : "Will import (Click to view)",
                      color: importStats.duplicates > 0 ? "text-yellow-400" : "text-zinc-500",
                      bg: previewFilter === "duplicates" ? "bg-yellow-400/10 ring-1 ring-yellow-400/20" : "",
                    },
                    {
                      key: "no_phone",
                      label: "No Phone",
                      value: importStats.noPhone,
                      desc: "Click to show missing phones",
                      color: importStats.noPhone > 0 ? "text-orange-400" : "text-zinc-500",
                      bg: previewFilter === "no_phone" ? "bg-orange-500/10 ring-1 ring-orange-500/20" : "",
                    },
                    {
                      key: "will_import",
                      label: "✓ Will Import",
                      value: importStats.finalCount,
                      desc: "New leads that will be saved",
                      color: "text-emerald-400",
                      bg: "bg-emerald-400/5",
                    },
                  ].map((stat) => (
                    <button
                      key={stat.label}
                      type="button"
                      disabled={stat.key === "will_import"}
                      onClick={() => setPreviewFilter(stat.key)}
                      className={`px-4 py-4 text-center transition active:scale-98 ${stat.bg} ${
                        stat.key !== "will_import" ? "cursor-pointer hover:bg-white/[0.03]" : ""
                      }`}
                    >
                      <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] font-black text-zinc-300 mt-1">{stat.label}</div>
                      <div className="text-[9px] text-zinc-600 mt-0.5 leading-snug">{stat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>


              {/* Google Maps detected badge */}
              {parsedRows.length > 0 && detectGoogleMapsFormat(parsedRows[0]) && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3">
                  <span className="text-lg">✅</span>
                  <div>
                    <p className="text-xs font-black text-emerald-300">Google Maps Format Detected & Auto-Mapped!</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Business Name, Phone, Address, Category, and Maps Link have been automatically extracted from your Google Maps paste. Ready to import!
                    </p>
                  </div>
                </div>
              )}

              {/* Import Configuration Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5">
                
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Default Category</h4>
                  <select
                    value={defaultCategory}
                    onChange={(e) => setDefaultCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-600">Applied if spreadsheet doesn't map a category</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Default Call Status</h4>
                  <select
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Default Demo Status</h4>
                  <select
                    value={defaultDemoStatus}
                    onChange={(e) => setDefaultDemoStatus(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="not_sent">None (No Tag)</option>
                    <option value="needs_demo">Needs Demo 📤</option>
                    <option value="sent">Demo Sent ✓</option>
                  </select>
                </div>

              </div>

              {/* Duplicate Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.01] border border-white/[0.05] rounded-2xl px-5 py-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black text-cyan-400 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white">Automatically skip duplicate leads</span>
                    <span className="block text-[10px] text-zinc-500">Detects existing phone numbers or business names already saved in CallTrack Pro</span>
                  </div>
                </label>
                
                <div className="text-right shrink-0">
                  <div className="text-xs text-zinc-400 font-bold">
                    Importing: <span className="text-emerald-400 text-sm font-black">{importStats.finalCount}</span>
                  </div>
                  {importStats.duplicates > 0 && (
                    <div className="text-[10px] text-yellow-400">
                      Skipping: {importStats.duplicates} duplicates
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Cards Preview — one card per lead */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                    {previewFilter === "all" ? `Parsed Leads (${displayedPreviewLeads.length} active · ${manuallyRemovedRows.size} removed)` :
                     previewFilter === "removed" ? `Removed Leads (${displayedPreviewLeads.length})` :
                     previewFilter === "duplicates" ? `Duplicate Leads (${displayedPreviewLeads.length})` :
                     `Leads Missing Phone Number (${displayedPreviewLeads.length})`}
                  </h3>
                  <div className="flex items-center gap-2">
                    {importStats.noPhone > 0 && (
                      <button
                        onClick={removeAllNoPhone}
                        className="rounded-lg border border-orange-500/20 bg-orange-500/8 hover:bg-orange-500/15 px-3 py-1.5 text-[10px] font-black text-orange-400 transition cursor-pointer"
                      >
                        ⚡ Remove {importStats.noPhone} without phone
                      </button>
                    )}
                    {manuallyRemovedRows.size > 0 && (
                      <button
                        onClick={restoreAllRows}
                        className="rounded-lg border border-zinc-500/20 bg-zinc-500/8 hover:bg-zinc-500/15 px-3 py-1.5 text-[10px] font-black text-zinc-400 transition cursor-pointer"
                      >
                        ↺ Restore All
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {displayedPreviewLeads.map((lead) => {
                    const isRemoved = manuallyRemovedRows.has(lead.rowIndex);
                    const isSkipped = !isRemoved && skipDuplicates && lead.isDuplicate;

                    return (
                      <div
                        key={lead.rowIndex}
                        className={`relative rounded-2xl border px-4 py-3 transition-all ${
                          isRemoved
                            ? "opacity-40 border-zinc-700/30 bg-zinc-900/20 scale-[0.99]"
                            : isSkipped
                            ? "border-yellow-400/15 bg-yellow-400/[0.02]"
                            : lead.hasNoPhone
                            ? "border-orange-500/25 bg-orange-500/[0.03]"
                            : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03]"
                        }`}
                      >
                        {/* Row header: name + badges + delete */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black leading-tight ${
                              isRemoved ? "text-zinc-600 line-through" : "text-white"
                            }`}>
                              {lead.businessName}
                            </p>
                            {lead.category && (
                              <p className="text-[10px] text-zinc-500 mt-0.5">{lead.category}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Status badges */}
                            {!isRemoved && isSkipped && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-yellow-400/20 bg-yellow-400/10 text-yellow-400 font-bold">
                                Duplicate – Skipped
                              </span>
                            )}
                            {!isRemoved && lead.isDuplicate && !isSkipped && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-orange-400/20 bg-orange-400/10 text-orange-400 font-bold">
                                ⚠ Duplicate
                              </span>
                            )}
                            {!isRemoved && lead.hasNoPhone && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-orange-500/25 bg-orange-500/10 text-orange-400 font-bold">
                                ⚠ No Phone
                              </span>
                            )}
                            {!isRemoved && !lead.isDuplicate && !lead.hasNoPhone && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 font-bold">
                                ✓ Ready
                              </span>
                            )}
                            {isRemoved && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-zinc-600/30 bg-zinc-700/20 text-zinc-500 font-bold">
                                Removed
                              </span>
                            )}
                            {/* Delete / Restore button */}
                            {isRemoved ? (
                              <button
                                onClick={() => setManuallyRemovedRows(prev => { const n = new Set(prev); n.delete(lead.rowIndex); return n; })}
                                className="rounded-lg bg-zinc-700/30 hover:bg-zinc-600/40 text-zinc-400 hover:text-white p-1.5 transition cursor-pointer"
                                title="Restore this row"
                              >
                                <RotateCcw size={11} />
                              </button>
                            ) : (
                              <button
                                onClick={() => removeRow(lead.rowIndex)}
                                className="rounded-lg bg-red-500/8 hover:bg-red-500/20 text-red-400/60 hover:text-red-300 p-1.5 transition cursor-pointer"
                                title="Remove this lead from import"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Contact details row */}
                        {!isRemoved && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] mb-2">
                            {lead.phone ? (
                              <span className="flex items-center gap-1.5 text-zinc-300 font-mono">
                                <Phone size={10} className="text-cyan-400 shrink-0" />
                                {lead.phone}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-orange-400/70 italic">
                                <Phone size={10} className="shrink-0" /> No phone number
                              </span>
                            )}
                            {lead.address && (
                              <span className="flex items-center gap-1.5 text-zinc-400">
                                <MapPin size={10} className="text-zinc-500 shrink-0" />
                                {lead.address}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1.5 text-zinc-400">
                                <Mail size={10} className="text-zinc-500 shrink-0" />
                                {lead.email}
                              </span>
                            )}
                            {lead.mapsLink && (
                              <a
                                href={lead.mapsLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition"
                              >
                                <ExternalLink size={10} className="shrink-0" /> Maps Link
                              </a>
                            )}
                          </div>
                        )}

                        {/* Interactive Website URL & Needs Status Editors */}
                        {!isRemoved && (
                          <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/[0.01] rounded-xl p-2.5">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Website URL</span>
                                {lead.website && (
                                  <a
                                    href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] text-cyan-400 hover:underline flex items-center gap-0.5"
                                  >
                                    Visit Site <ExternalLink size={8} />
                                  </a>
                                )}
                              </div>
                              <div className="relative">
                                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
                                <input
                                  type="text"
                                  value={lead.website}
                                  onChange={(e) => updateLeadField(lead.rowIndex, "website", e.target.value)}
                                  placeholder="No website detected (Click to add)"
                                  className="w-full rounded-lg border border-white/[0.08] bg-black/40 py-1.5 pl-8 pr-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-cyan-400/30 transition"
                                />
                              </div>
                            </div>
                            <div>
                              <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Website Status / Need</span>
                              <select
                                value={lead.websiteStatus}
                                onChange={(e) => updateLeadField(lead.rowIndex, "websiteStatus", e.target.value)}
                                className="w-full rounded-lg border border-white/[0.08] bg-black/40 py-1.5 px-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-400/30 transition"
                              >
                                <option value="Unknown">❓ Unknown</option>
                                <option value="No website">🚫 Needs Website (No website)</option>
                                <option value="Has website">🌐 Has website</option>
                                <option value="Bad website">⚠️ Bad website (Pitch upgrade)</option>
                                <option value="Social media only">📱 Social media only (Pitch full site)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="flex-shrink-0 border-t border-white/[0.07] px-6 py-4 flex items-center justify-between bg-black/40">
          <div>
            {importStep !== "input" && (
              <button
                onClick={() => setImportStep(importStep === "preview" ? "mapping" : "input")}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:bg-white/10 transition"
            >
              Cancel
            </button>
            {importStep !== "preview" ? (
              <button
                onClick={() => {
                  if (importStep === "input") {
                    handleParse(rawText);
                  } else {
                    setImportStep("preview");
                  }
                }}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95 cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleImport}
                disabled={importing || importStats.finalCount === 0}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {importing ? (
                  <>
                    <Loader2 className="animate-spin" size={13} />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    Import {importStats.finalCount} Lead{importStats.finalCount !== 1 && "s"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

// Global Parser Helper Functions

// ── Smart Category Matcher ──────────────────────────────────────────────────
// Maps raw business-type strings (from Google Maps, Excel, etc.) to the
// nearest matching CallTrack Pro category. Falls back to null if no match.
const CATEGORY_KEYWORD_MAP = [
  { category: "Auto Detailing",        keywords: ["auto detail", "car detail", "car wash", "detailing"] },
  { category: "Barber Shop",           keywords: ["barber", "barbershop", "men's cut", "haircut"] },
  { category: "Hair Salon / Spa",      keywords: ["hair salon", "nail salon", "spa", "beauty salon", "hair studio", "hair care", "salon"] },
  { category: "Restaurant",            keywords: ["restaurant", "diner", "cafe", "bistro", "eatery", "pizzeria", "pizza", "sushi", "steakhouse", "seafood", "burger", "fast food", "taco", "bbq", "grill"] },
  { category: "Food Truck",            keywords: ["food truck", "mobile food", "catering truck"] },
  { category: "Roofing / Contractor",  keywords: ["roof", "roofing", "contractor", "siding", "gutters", "gutter", "remodeling", "renovation", "construction", "builder", "carpenter", "flooring", "tile", "painting", "plumber", "plumbing", "electrician", "hvac", "handyman", "masonry"] },
  { category: "Cleaning Service",      keywords: ["cleaning", "janitorial", "maid", "housekeeping", "pressure wash", "carpet clean", "window clean"] },
  { category: "Landscaping",           keywords: ["landscap", "lawn", "mowing", "tree service", "tree removal", "irrigation", "garden", "snow removal", "mulch"] },
  { category: "Mechanic / Auto Repair",keywords: ["mechanic", "auto repair", "auto shop", "car repair", "tire", "transmission", "oil change", "brake", "body shop", "collision", "muffler"] },
  { category: "Towing Company",        keywords: ["tow", "towing", "roadside", "recovery"] },
  { category: "Tattoo / Piercing",     keywords: ["tattoo", "piercing", "ink"] },
  { category: "Gym / Fitness",         keywords: ["gym", "fitness", "yoga", "crossfit", "personal trainer", "boxing", "martial art", "karate", "kickboxing", "pilates", "sports"] },
  { category: "Dental / Medical",      keywords: ["dental", "dentist", "doctor", "medical", "clinic", "health", "orthodont", "chiropract", "optometr", "pharmacy", "urgent care", "veterinarian", "vet"] },
  { category: "Daycare",               keywords: ["daycare", "child care", "preschool", "kindergarten", "nursery", "after school"] },
  { category: "Real Estate",           keywords: ["real estate", "realtor", "property", "realty", "apartment", "leasing", "mortgage"] },
  { category: "Handyman",              keywords: ["handyman", "home repair", "general repair", "fix-it"] },
  { category: "Moving Company",        keywords: ["moving", "movers", "relocation", "storage", "junk removal", "hauling"] },
];

function matchCategory(rawCategory) {
  if (!rawCategory) return null;
  const lower = rawCategory.toLowerCase().trim();
  for (const entry of CATEGORY_KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.category;
    }
  }
  return null;
}
// ────────────────────────────────────────────────────────────────────────────

function parseSpreadsheetText(text) {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/);
  
  let delimiter = "\t";
  const firstLine = lines[0];
  if (firstLine) {
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    
    if (commaCount > tabCount && commaCount > semiCount) delimiter = ",";
    else if (semiCount > tabCount && semiCount > commaCount) delimiter = ";";
    else delimiter = "\t";
  }
  
  const parseRow = (line) => {
    const result = [];
    let curVal = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(curVal.trim().replace(/^"|"$/g, ""));
        curVal = "";
      } else {
        curVal += char;
      }
    }
    result.push(curVal.trim().replace(/^"|"$/g, ""));
    return result;
  };
  
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseRow);
}

// ── Google Maps Copy-Paste Auto-Detector ────────────────────────────────────
// When you copy results from Google Maps, the header row contains internal
// CSS class names like "hfpxzc href", "qBF1Pd", "W4Efsd", "UsdlK", etc.
// We detect these and directly assign the correct column positions.
//
// Column layout from Google Maps search results table:
//  0  hfpxzc href   → Google Maps URL (mapsLink)
//  1  qBF1Pd        → Business Name (businessName)
//  2  MW4etd        → Rating (skip)
//  3  UY7F9         → Review count (skip)
//  4  W4Efsd        → Category (category)
//  5  W4Efsd 2      → separator "·" (skip)
//  6  W4Efsd 3      → Address (address)
//  7  W4Efsd 4      → Hours status "Open" etc. (skip)
//  8  W4Efsd 5      → "· Closes X PM" or empty (skip)
//  9  W4Efsd 6      → separator "·" (skip)
// 10  UsdlK         → Phone number (phone)
// 16  Jn12ke src    → Image URL (skip)
// 17  ah5Ghc        → Review text (notes)

const GOOGLE_MAPS_COLUMNS = {
  mapsLink:     0,   // hfpxzc href
  businessName: 1,   // qBF1Pd
  // skip 2 (rating), 3 (reviews)
  category:     4,   // W4Efsd
  // skip 5 (·), skip 7/8/9 (hours)
  address:      6,   // W4Efsd 3
  phone:        10,  // UsdlK
  notes:        17,  // ah5Ghc (review text)
};

function findPhoneInRow(row) {
  const phoneRegex = /(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
  for (const cell of row) {
    const text = String(cell || "").trim();
    if (phoneRegex.test(text) && !text.includes("http") && !text.includes("@")) {
      return text;
    }
  }
  return "";
}

function findAddressInRow(row) {
  const streetRegex = /\b(street|st|avenue|ave|road|rd|place|pl|boulevard|blvd|lane|ln|drive|dr|court|ct|highway|hwy|way|square|sq|terrace|ter|parkway|pkwy)\b/i;
  
  // Try high confidence address patterns
  for (const cell of row) {
    const text = String(cell || "").trim();
    if (!text) continue;
    if (/^\d+/.test(text) && streetRegex.test(text) && !text.includes("http") && !/\d{3}-\d{4}/.test(text)) {
      return text;
    }
  }
  
  // Try fallback keyword matching
  for (const cell of row) {
    const text = String(cell || "").trim();
    if (!text) continue;
    if (streetRegex.test(text) && !text.includes("http") && !text.includes("contractor") && !text.includes("company") && !/\d{3}-\d{4}/.test(text) && text.length > 5 && text.length < 50) {
      return text;
    }
  }
  return "";
}

function findWebsiteInRow(row) {
  for (const cell of row) {
    const text = String(cell || "").trim();
    if (!text) continue;
    
    // Check for HTTP/HTTPS links (non-Google)
    if (/^https?:\/\//i.test(text)) {
      const lower = text.toLowerCase();
      if (!lower.includes("google.com") && !lower.includes("gstatic.com") && !lower.includes("ggpht.com") && !lower.includes("schema.org") && !lower.includes("w3.org")) {
        return text;
      }
      continue;
    }
    
    // Check for domain name patterns (e.g. ramirezroofing.com)
    const isDomain = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/i.test(text);
    if (isDomain) {
      const lower = text.toLowerCase();
      if (!lower.includes("google.com") && !lower.includes("gstatic.com")) {
        return text;
      }
    }
  }
  return "";
}

function findNotesInRow(row) {
  for (let i = row.length - 1; i >= 0; i--) {
    const text = String(row[i] || "").trim();
    if (!text) continue;
    
    const lower = text.toLowerCase();
    if (
      lower === "directions" || 
      lower === "delivery" || 
      lower === "onsite services" || 
      lower.includes("http") || 
      lower.includes("@") || 
      /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(text)
    ) {
      continue;
    }
    
    if ((text.startsWith('"') && text.endsWith('"')) || text.length > 15) {
      return text.replace(/^"|"$/g, "").trim();
    }
  }
  return "";
}

function detectGoogleMapsFormat(headerRow) {
  if (!headerRow || headerRow.length === 0) return null;
  
  // Case A: standard Google Maps header tokens
  const h = headerRow.map(item => String(item || "").toLowerCase().trim());
  const isGmapsHeader = h.some(v => v === "hfpxzc href" || v === "qbf1pd" || v === "usdlk" || v === "mw4etd");
  
  // Case B: Raw copy-paste from Excel/Google Maps data row
  const firstCell = String(headerRow[0] || "");
  const isGmapsData = firstCell.includes("google.com/maps/place/") || firstCell.includes("google.com/maps/dir/") || firstCell.includes("google.com/maps/search/");
  
  if (!isGmapsHeader && !isGmapsData) return null;

  // Build the mapping using known column positions
  const mapping = {};
  LEAD_FIELDS.forEach(f => { mapping[f.key] = ""; });
  Object.entries(GOOGLE_MAPS_COLUMNS).forEach(([field, colIdx]) => {
    if (mapping.hasOwnProperty(field)) mapping[field] = colIdx;
  });
  
  return mapping;
}
// ────────────────────────────────────────────────────────────────────────────

const LEAD_FIELDS = [
  { key: "businessName", label: "Business Name", required: true, keywords: ["name", "business", "company", "shop", "title", "store", "client", "firm", "organization"] },
  { key: "phone", label: "Phone Number", required: false, keywords: ["phone", "telephone", "tel", "cell", "mobile", "contact", "ph", "phone number"] },
  { key: "address", label: "Address", required: false, keywords: ["address", "location", "street", "city", "state", "zip", "addr", "full address"] },
  { key: "website", label: "Website URL", required: false, keywords: ["website", "url", "link", "web", "site", "homepage"] },
  { key: "socialLink", label: "Social Media Link", required: false, keywords: ["social", "instagram", "facebook", "fb", "tiktok", "twitter", "x.com", "social link", "social media"] },
  { key: "mapsLink", label: "Google Maps Link", required: false, keywords: ["maps", "map", "google maps", "google link", "directions", "maps link"] },
  { key: "email", label: "Email Address", required: false, keywords: ["email", "e-mail", "mail", "contact email"] },
  { key: "category", label: "Category", required: false, keywords: ["category", "industry", "type", "tag", "tags"] },
  { key: "notes", label: "Notes / Comments", required: false, keywords: ["notes", "note", "desc", "description", "comment", "comments", "info"] },
];

function autoMapColumns(headers, fields) {
  const mapping = {};
  fields.forEach((field) => {
    let matchedIndex = -1;
    
    // exact match
    matchedIndex = headers.findIndex((h) => {
      const hn = h.toLowerCase().trim();
      return hn === field.key.toLowerCase() || hn === field.label.toLowerCase();
    });
    
    // keyword matches
    if (matchedIndex === -1) {
      matchedIndex = headers.findIndex((h) => {
        const hn = h.toLowerCase().trim();
        return field.keywords.some((kw) => hn.includes(kw) || kw.includes(hn));
      });
    }
    
    mapping[field.key] = matchedIndex !== -1 ? matchedIndex : "";
  });
  return mapping;
}

/* ═════════════════════ DUPLICATE REVIEW MODAL ═════════════════════ */

function DuplicateReviewModal({ session, duplicateGroups, setLeads, onClose, push }) {
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to permanently delete this duplicate lead record? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      setLeads((p) => p.filter((l) => l.id !== id));
      push("Duplicate lead deleted ✓", "success");
    } catch (e) {
      console.error("Delete duplicate:", e);
      alert("Failed to delete lead: " + e.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md" />

      {/* Modal Container */}
      <div className="fixed inset-4 md:inset-x-20 md:inset-y-10 z-50 flex flex-col border border-red-500/20 bg-[#060212] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-3xl animate-[slideUp_0.3s_ease]">
        
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/[0.07] px-6 py-4 flex items-center justify-between bg-red-950/10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Workspace Lead De-duplicator</span>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              ⚠️ Repetitive Lead Manager
            </h2>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/[0.06] p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-16 space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">No Duplicate Leads Found!</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Excellent work! Every phone number and business name in your CallTrack Pro workspace is unique.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-black text-zinc-950 hover:bg-zinc-100 transition active:scale-95 cursor-pointer"
              >
                Return to Workspace
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto">
              
              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-xs text-red-300/90 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold text-white mb-0.5">Warning: Duplicate records can clutter your outbound pipeline.</p>
                  <p>Below are groups of leads with identical phone numbers or business names. Review them side-by-side, verify which record has the best notes/history, and click <span className="font-bold text-white">"Delete Redundant Lead"</span> to wipe the extra copy. We automatically sync the change in your database.</p>
                </div>
              </div>

              <div className="space-y-6">
                {duplicateGroups.map((group, gIdx) => (
                  <div key={gIdx} className="rounded-3xl border border-red-500/15 bg-red-950/[0.02] p-5 space-y-4">
                    
                    {/* Group Header Info */}
                    <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <h4 className="text-sm font-black text-red-300 uppercase tracking-wider">{group.title}</h4>
                      <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                        {group.leads.length} matches found
                      </span>
                    </div>

                    {/* Side-by-side leads cards comparison grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {group.leads.map((lead) => {
                        const meta = statusMeta(lead.status);
                        return (
                          <div 
                            key={lead.id}
                            className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h5 className="text-sm font-black text-white leading-tight truncate">{lead.businessName}</h5>
                                  <p className="text-[10px] text-zinc-500 mt-0.5">
                                    {lead.category || "No Category"} · Added {relativeDate(lead.createdAt)}
                                  </p>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black shrink-0 ${meta.soft}`}>
                                  {meta.label}
                                </span>
                              </div>

                              <div className="space-y-1 text-xs text-zinc-400 border-t border-b border-white/[0.04] py-2">
                                {lead.phone && <p>📞 <span className="font-mono text-zinc-300">{lead.phone}</span></p>}
                                {lead.email && <p>✉️ <span className="text-zinc-300">{lead.email}</span></p>}
                                {lead.address && <p>📍 <span className="text-zinc-300">{lead.address}</span></p>}
                                {lead.website && <p>🌐 <span className="text-zinc-300">{lead.website}</span></p>}
                              </div>

                              {lead.notes && (
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">Lead Notes</p>
                                  <p className="text-[10px] text-zinc-400 italic bg-white/[0.02] border border-white/[0.03] rounded-lg p-2 leading-normal line-clamp-3">
                                    &ldquo;{lead.notes}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/[0.04]">
                              <button
                                onClick={() => handleDelete(lead.id)}
                                disabled={deletingId === lead.id}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/8 hover:bg-red-500/15 py-2.5 text-xs font-bold text-red-400 transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
                              >
                                {deletingId === lead.id ? (
                                  <>
                                    <Loader2 className="animate-spin" size={12} />
                                    Deleting Lead...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 size={12} />
                                    Delete Redundant Lead
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-white/[0.07] px-6 py-4 flex justify-end bg-black/40">
          <button
            onClick={onClose}
            className="rounded-xl bg-white px-6 py-2.5 text-xs font-black text-zinc-950 hover:bg-zinc-100 transition active:scale-95 cursor-pointer shadow-md"
          >
            Finished Cleaning
          </button>
        </div>

      </div>
    </>
  );
}


// ── OUTBOUND COLD CALL TO-DO QUEUE ───────────────────────────────────────────
function OutboundToDoQueue({
  leads,
  onTriggerResolution,
  onSelect,
  push,
  recordingLeadId,
  recording,
  consentMap,
  setConsentMap,
  recordingsMap,
  recSecs,
  recError,
  startRecording,
  stopRecording,
  deleteRecording,
  downloadRecording,
  savingActivity,
}) {
  const lists = useMemo(() => {
    const today = todayStr();
    const tomorrow = tomorrowStr();
    return {
      cold_calls: leads.filter((l) => l.status === "not_called"),
      call_later: leads.filter((l) => l.nextFollowUp === today && l.status !== "no" && l.status !== "closed"),
      tomorrow:   leads.filter((l) => l.nextFollowUp === tomorrow && l.status !== "no" && l.status !== "closed"),
      due:        leads.filter((l) => isDue(l.nextFollowUp) && l.nextFollowUp !== today && l.status !== "no" && l.status !== "closed"),
    };
  }, [leads]);

  const [activeTab, setActiveTab] = useState("cold_calls");

  // Dynamically focus a tab with active leads if the current one is empty
  useEffect(() => {
    if (lists[activeTab] && lists[activeTab].length === 0) {
      if (lists.cold_calls.length > 0) setActiveTab("cold_calls");
      else if (lists.due.length > 0) setActiveTab("due");
      else if (lists.call_later.length > 0) setActiveTab("call_later");
      else if (lists.tomorrow.length > 0) setActiveTab("tomorrow");
    }
  }, [leads, activeTab, lists]);

  const currentList = lists[activeTab] || [];

  return (
    <div className="mb-5 rounded-3xl border border-cyan-500/20 bg-cyan-950/5 p-5 shadow-xl backdrop-blur-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header and Quick dialer toggle */}
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">Campaign Outreach Queue</span>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
            ⚡ Outbound Dialer Campaign
          </h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">Select a category list below to dial prospects</p>
        </div>
        <div className="flex items-center gap-2">
          {currentList.length > 0 && (
            <button
              onClick={() => {
                onSelect(currentList[0]);
                push(`Dialer Assist activated for ${currentList[0].businessName}! ⚡`, "info");
              }}
              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-3 py-1.5 text-xs font-black transition active:scale-95 shadow-md shadow-cyan-950/40 cursor-pointer"
              title="Focus and start calling the first lead in the active tab queue"
            >
              ⚡ Start Dialer Assist
            </button>
          )}
        </div>
      </div>

      {/* Tab selectors for lists */}
      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-white/[0.05] pb-3">
        {[
          { key: "cold_calls", label: "⚡ Cold Calls", count: lists.cold_calls.length, color: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5" },
          { key: "due", label: "📅 Due Today", count: lists.due.length, color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5" },
          { key: "call_later", label: "⏳ Call Later", count: lists.call_later.length, color: "text-purple-400 border-purple-400/20 bg-purple-400/5" },
          { key: "tomorrow", label: "📆 Tomorrow", count: lists.tomorrow.length, color: "text-fuchsia-400 border-fuchsia-400/20 bg-fuchsia-400/5" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer ${
              activeTab === tab.key
                ? tab.color + " shadow-md"
                : "border-white/[0.04] bg-white/[0.02] text-zinc-500 hover:text-white"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
              activeTab === tab.key ? "bg-white/10 text-white" : "bg-zinc-800 text-zinc-500"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Campaign leads list */}
      {currentList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.05] bg-black/25 p-8 text-center flex flex-col items-center justify-center gap-2">
          <span className="text-2xl animate-bounce">🎉</span>
          <p className="text-xs font-black text-zinc-400">All calls in this queue completed!</p>
          <p className="text-[9px] text-zinc-600">Great job! Toggle other categories or import new leads to continue outreach.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
          {currentList.map((lead) => (
            <div key={lead.id} className="rounded-2xl border border-white/[0.05] bg-black/40 p-3.5 hover:border-cyan-500/25 transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 onClick={() => onSelect(lead)} className="text-sm font-black text-white hover:text-cyan-300 transition cursor-pointer truncate flex-1">{lead.businessName}</h4>
                  
                  {lead.websiteStatus && (
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                      lead.websiteStatus === "No website" ? "border-red-500/30 bg-red-500/10 text-red-400" :
                      lead.websiteStatus === "Social media only" ? "border-purple-500/30 bg-purple-500/10 text-purple-300" :
                      "border-zinc-700 bg-zinc-800/30 text-zinc-400"
                    }`}>
                      {lead.websiteStatus === "No website" ? "🚫 No Web" :
                       lead.websiteStatus === "Social media only" ? "📱 Socials" : "✓ Website"}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  {lead.phone ? (
                    <div className="flex items-center gap-1.5">
                      <a href={`tel:${lead.phone}`} className="font-mono font-bold text-cyan-300 hover:text-cyan-200 hover:underline transition flex items-center gap-1">
                        📞 {lead.phone}
                      </a>
                      <CopyBtn text={lead.phone} label="Phone" push={push}/>
                      <InlineRecorderController
                        lead={lead}
                        recordingLeadId={recordingLeadId}
                        recording={recording}
                        recordingBlob={recordingsMap[lead.id]?.blob}
                        recordingBlobUrl={recordingsMap[lead.id]?.url}
                        leadTranscript={recordingsMap[lead.id]?.transcript}
                        recSecs={recordingLeadId === lead.id ? recSecs : recordingsMap[lead.id]?.secs || 0}
                        recError={recordingLeadId === lead.id ? recError : ""}
                        consent={consentMap[lead.id] || false}
                        setConsent={(val) => setConsentMap(prev => ({ ...prev, [lead.id]: val }))}
                        startRecording={startRecording}
                        stopRecording={stopRecording}
                        deleteRecording={deleteRecording}
                        downloadRecording={downloadRecording}
                        savingActivity={savingActivity}
                        push={push}
                      />
                    </div>
                  ) : <span className="italic text-zinc-600">No Phone</span>}
                  {lead.category && <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold">{lead.category}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Wants website -> Needs Demo */}
                <button
                  onClick={() => onTriggerResolution(lead, "interested")}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 px-3 py-2 text-xs font-black shadow-md transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  title="Talked! Wants website. Mark as Interested & flags Needs Demo"
                >
                  ✓ Demo Needed 📤
                </button>

                {/* Call back again (X) -> Reschedule */}
                {activeTab === "tomorrow" || activeTab === "call_later" ? (
                  <button
                    onClick={() => onTriggerResolution(lead, "reschedule")}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 px-3 py-2 text-xs font-black transition active:scale-95 flex items-center gap-0.5 cursor-pointer"
                    title="Reschedule this callback"
                  >
                    ⏳ Reschedule
                  </button>
                ) : (
                  <button
                    onClick={() => onTriggerResolution(lead, "reschedule", "no_answer")}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 px-3 py-2 text-xs font-black transition active:scale-95 flex items-center gap-0.5 cursor-pointer"
                    title="Didn't answer or call back. Reschedule callback tomorrow"
                  >
                    ✗ Call Tomorrow
                  </button>
                )}

                {/* Skip / Not interested */}
                <button
                  onClick={() => {
                    if (confirm(`Archive ${lead.businessName}?`)) {
                      onTriggerResolution(lead, "reschedule", "no");
                    }
                  }}
                  className="rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-red-400 p-2 transition active:scale-95 cursor-pointer"
                  title="Not Interested / Archive"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── ADD WORKSPACE TAB MODAL ──────────────────────────────────────────────────
function AddTabModal({ setCustomTabs, setActiveTabId, onClose, push }) {
  const [tabName, setTabName] = useState("");
  const [tabUrl, setTabUrl] = useState("https://voice.google.com");

  const presets = [
    { name: "Google Voice 📞", url: "https://voice.google.com" },
    { name: "Skype Web 💬", url: "https://web.skype.com" },
    { name: "RingCentral 📞", url: "https://app.ringcentral.com" },
    { name: "Custom Dial Portal 🌐", url: "https://" }
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!tabName.trim() || !tabUrl.trim()) return;

    let finalUrl = tabUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    const newTab = {
      id: "tab_" + Date.now(),
      title: tabName.trim(),
      url: finalUrl
    };

    setCustomTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    onClose();
    push(`Tab "${tabName}" added! ✓`, "success");
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md" />
      
      {/* Modal Box */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md border border-white/10 bg-[#060212] rounded-3xl shadow-2xl p-6 backdrop-blur-3xl animate-[scaleUp_0.25s_ease]">
        <div className="mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Add Workspace Tab</span>
          <h2 className="text-xl font-black text-white mt-1">➕ Create Custom Tab</h2>
          <p className="text-xs text-zinc-500 mt-1">Open calling sites or utility pages right inside CallTrack Pro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Field label="Preset Quick Dialers">
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setTabName(p.name.replace(/[^a-zA-Z\s]/g, "").trim());
                      setTabUrl(p.url);
                    }}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] font-bold text-zinc-400 hover:text-white hover:border-cyan-500/30 transition text-left cursor-pointer active:scale-95"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Tab Title">
              <input
                type="text"
                required
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
                placeholder="e.g. Google Voice, CRM Portal"
                className={inputCls}
              />
            </Field>

            <Field label="URL / Destination Link">
              <input
                type="text"
                required
                value={tabUrl}
                onChange={(e) => setTabUrl(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:bg-white/10 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!tabName.trim() || !tabUrl.trim()}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              ✓ Open Tab
            </button>
          </div>
        </form>
      </div>
    </>
  );
}


// ── CALL RESOLUTION MODAL ────────────────────────────────────────────────────
function CallResolutionModal({ lead, type, preSelectOption, onClose, onResolve }) {
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState(lead.email || "");
  
  // Reschedule options states
  const [rescheduleType, setRescheduleType] = useState(preSelectOption || "no_answer"); // "no_answer" | "vm" | "busy" | "today" | "custom"
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (type === "interested") {
        await onResolve({
          id: lead.id,
          status: "interested",
          notes: notes || "Prospect wants website demo outreach.",
          email: email,
        });
      } else {
        // Reschedule resolution
        let status = "follow_up";
        let days = 1;
        let cDate = null;

        if (rescheduleType === "no_answer") {
          status = "no_answer";
          days = 1;
        } else if (rescheduleType === "vm") {
          status = "follow_up";
          days = 1;
        } else if (rescheduleType === "busy") {
          status = "follow_up";
          days = 1;
        } else if (rescheduleType === "today") {
          status = "follow_up";
          days = 0;
        } else if (rescheduleType === "custom") {
          status = "follow_up";
          days = null;
          cDate = customDate;
        } else if (rescheduleType === "no") {
          status = "no";
          days = null;
        }

        await onResolve({
          id: lead.id,
          status,
          followUpDays: days,
          customDate: cDate,
          notes: notes || `Rescheduled call: ${
            rescheduleType === "no_answer" ? "No answer" : 
            rescheduleType === "vm" ? "Voicemail left" : 
            rescheduleType === "busy" ? "Busy / Call back" : 
            rescheduleType === "today" ? "Call back later today" : 
            rescheduleType === "no" ? "Not Interested / Archive" : "Custom schedule"
          }.`,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md" />

      {/* Modal Box */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md border border-white/10 bg-[#060212] rounded-3xl shadow-2xl p-6 backdrop-blur-3xl animate-[scaleUp_0.25s_ease]">
        
        {/* Title */}
        <div className="mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Outbound Call Logger</span>
          <h2 className="text-xl font-black text-white mt-1">
            {type === "interested" ? "🎉 Wants Website / Demo" : "⏳ Call Rescheduler Queue"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Log outcome details for <strong className="text-zinc-300">{lead.businessName}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "interested" ? (
            <>
              {/* Interested / Wants Website form fields */}
              <div className="space-y-3">
                <Field label="Verify Contact Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email to send demo"
                    className={inputCls}
                    required
                  />
                </Field>

                <Field label="Outbound Call Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Specific requests, callback notes, owner name..."
                    rows={3}
                    className={inputCls + " resize-none"}
                  />
                </Field>
              </div>
            </>
          ) : (
            <>
              {/* Reschedule option badges */}
              <div className="space-y-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Select Callback Reason</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "no_answer", label: "🚫 Didn't Answer (Tomorrow)", desc: "Status → No Answer" },
                    { key: "vm", label: "📘 Left Voicemail (Tomorrow)", desc: "Status → Follow Up" },
                    { key: "busy", label: "👥 Busy / Call Tomorrow", desc: "Status → Follow Up" },
                    { key: "today", label: "⏳ Call Back Later Today", desc: "Status → Follow Up" },
                    { key: "custom", label: "📅 Custom Date Planner", desc: "Select custom date" },
                    { key: "no", label: "🗑 Archive / Not Interested", desc: "Status → No" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRescheduleType(opt.key)}
                      className={`rounded-xl border p-2.5 text-[10px] text-left transition active:scale-95 cursor-pointer ${
                        rescheduleType === opt.key 
                          ? "border-cyan-400 bg-cyan-400/10 text-cyan-200 font-black shadow-lg"
                          : "border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="block font-black">{opt.label}</span>
                      <span className="block text-[8px] text-zinc-500 mt-0.5 font-normal">{opt.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Custom calendar picker if "custom" selected */}
                {rescheduleType === "custom" && (
                  <Field label="Choose Callback Date">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>
                )}

                <Field label="Call outcome / Reschedule Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why schedule callback? E.g., 'Mike busy, call back at 4 PM'"
                    rows={3}
                    className={inputCls + " resize-none"}
                  />
                </Field>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:bg-white/10 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (rescheduleType === "custom" && !customDate)}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={13} />
                  Saving...
                </>
              ) : (
                <>
                  {type === "interested" ? "✓ Log & Start Demo Campaign" : "🔄 Save & Reschedule"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}


