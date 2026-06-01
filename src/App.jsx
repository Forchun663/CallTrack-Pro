import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, BadgeDollarSign, CalendarDays, CheckCircle2, ChevronDown,
  ChevronUp, Clock, Copy, Download, Edit3, ExternalLink, Filter, Globe,
  LayoutDashboard, Loader2, LogOut, MapPin, Mic, MicOff, Phone, Plus,
  RotateCcw, Save, Search, Sparkles, Square, Target, Trash2, X, XCircle,
  Zap, Volume2, FileAudio, Mail, Send, Calendar
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

const WEBSITE_OPTIONS   = ["Unknown", "No website", "Has website", "Bad website"];
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
  email:"", demoStatus:"not_sent",
};

/* ─────────────────────────── HELPERS ─────────────────────────── */

const statusMeta  = (s) => STATUS_OPTIONS.find((o) => o.key === s) ?? STATUS_OPTIONS[0];
const todayStr    = () => new Date().toISOString().slice(0, 10);
const norm        = (v) => String(v || "").trim().toLowerCase();
const isDue       = (d) => !!d && d <= todayStr();

// Pack email, demoStatus, and nextAction into notes field
function packNotes(plainNotes, email, demoStatus, nextAction) {
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
  return packed;
}

// Unpack email, demoStatus, and nextAction from notes field
function unpackNotes(packedNotes) {
  let notes = (packedNotes || "").trim();
  let email = "";
  let demoStatus = "not_sent";
  let nextAction = "Call";

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

  return { notes, email, demoStatus, nextAction };
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

/* ══════════════════════════ APP ROOT ══════════════════════════════ */

export default function App() {
  /* Auth */
  const [session, setSession]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* Leads */
  const [leads, setLeads]           = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

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

  /* ── Load leads ── */
  useEffect(() => {
    if (!session) { setLeads([]); return; }
    (async () => {
      setLeadsLoading(true);
      try {
        const { data, error } = await supabase
          .from("leads").select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setLeads((data || []).map(mapToState));
      } catch (e) {
        console.error("Load leads:", e);
        setSupaError(e.message);
      } finally { setLeadsLoading(false); }
    })();
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

  const stats = useMemo(() => ({
    total:      leads.length,
    notCalled:  leads.filter((l) => l.status === "not_called").length,
    interested: leads.filter((l) => l.status === "interested").length,
    needsDemo:  leads.filter((l) => l.demoStatus === "needs_demo").length,
    due:        leads.filter((l) => isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed").length,
  }), [leads]);

  const filtered = useMemo(() => {
    if (dupSearchLead) return [dupSearchLead];
    const s = norm(query);
    const isPhone = /\d/.test(query);
    const phoneD  = query.replace(/\D/g,"");
    return leads
      .filter((l) => {
        if (filter === "all")         return true;
        if (filter === "call_today")  return isDue(l.nextFollowUp) && l.status !== "no" && l.status !== "closed";
        if (filter === "no_website")  return l.websiteStatus === "No website";
        if (filter === "bad_website") return l.websiteStatus === "Bad website";
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
      const packedNotesField = packNotes(form.notes, form.email, form.demoStatus, form.nextAction);
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
        const { error } = await supabase.from("leads").update(row).eq("id", editingId).eq("user_id", session.user.id);
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
      const { error } = await supabase.from("leads").delete().eq("id", id).eq("user_id", session.user.id);
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
        .eq("id", id).eq("user_id", session.user.id);
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
    const repackedNotes = packNotes(lead.notes, lead.email, newDemoStatus, lead.nextAction);
    try {
      const { error: e1 } = await supabase.from("leads")
        .update({ notes: repackedNotes })
        .eq("id", id).eq("user_id", session.user.id);
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
        .eq("id", id).eq("user_id", session.user.id);
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

  /* ── Filters ── */
  const filterBtns = [
    { key:"all",         label:"All" },
    { key:"call_today",  label:"📅 Call Today" },
    { key:"needs_demo",  label:"📤 Needs Demo" },
    { key:"demo_sent",   label:"✓ Demo Sent" },
    { key:"not_called",  label:"Not Called" },
    { key:"interested",  label:"Yes ✓" },
    { key:"no",          label:"No ✗" },
    { key:"maybe",       label:"Maybe" },
    { key:"follow_up",   label:"Follow Up" },
    { key:"no_website",  label:"No Website" },
    { key:"bad_website", label:"Bad Website" },
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
      <div className="fixed bottom-6 right-6 z-[99] flex flex-col gap-2 pointer-events-none">
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

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── HEADER ── */}
        <header className="mb-5 rounded-3xl border border-white/[0.07] bg-white/[0.04] px-6 py-4 backdrop-blur-2xl shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Sales Workspace</p>
              <h1 className="bg-gradient-to-r from-white via-cyan-100 to-fuchsia-300 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
                CallTrack Pro
              </h1>
              <p className="mt-1 text-xs text-zinc-500">{session.user.email} · {leads.length} leads tracked</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Leads" value={stats.total} />
                <MiniStat label="Hot" value={stats.interested} accent="text-emerald-400" />
                <MiniStat label="Needs Demo" value={stats.needsDemo} accent="text-fuchsia-400" />
                <MiniStat label="Due" value={stats.due} accent={stats.due > 0 ? "text-yellow-400" : undefined} />
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/15 transition-all"
              >
                <LogOut size={13} /> Log Out
              </button>
            </div>
          </div>
        </header>

        {/* ── STATS BAR ── */}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { key:"all",        label:"Total Leads", val:stats.total,      icon:<LayoutDashboard size={14}/> },
            { key:"needs_demo", label:"Needs Demo",  val:stats.needsDemo,  icon:<Send size={14}/>, accent:"text-fuchsia-400" },
            { key:"interested", label:"Interested",  val:stats.interested, icon:<CheckCircle2 size={14}/>, accent:"text-emerald-400" },
            { key:"call_today", label:"Due Today",   val:stats.due,        icon:<CalendarDays size={14}/>, accent:stats.due > 0 ? "text-yellow-400" : undefined },
            { key:"not_called", label:"Not Called",  val:stats.notCalled,  icon:<Phone size={14}/> },
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
        <div className="grid gap-5 lg:grid-cols-[400px_1fr]">

          {/* ══ LEFT: ADD/EDIT FORM ══ */}
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-xl backdrop-blur-2xl lg:sticky lg:top-5 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:self-start">

            {/* Form header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">{editingId ? "Edit Lead" : "Add New Lead"}</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Fill in prospect details below</p>
              </div>
              {editingId && (
                <button onClick={resetForm} title="Cancel edit" className="rounded-xl bg-white/5 p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition">
                  <X size={15} />
                </button>
              )}
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
              <Field label="Current Website">
                <input value={form.website} onChange={(e) => upForm("website", e.target.value)}
                  placeholder="Leave empty if none" className={inputCls} />
              </Field>

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
                    push={push}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
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
          push={push}
        />
      )}
    </div>
  );
}

/* ═══════════════════════ FOCUS DRAWER ═══════════════════════════ */

function FocusDrawer({ lead, session, onClose, onEdit, onDelete, onStatus, onDemoStatus, onFollowUp, push }) {
  /* Recording state (local-only, no Supabase storage) */
  const [consent,        setConsent]        = useState(false);
  const [recording,      setRecording]      = useState(false);
  const [recorderRef,    setRecorderRef]    = useState(null);
  const [blob,           setBlob]           = useState(null);
  const [blobUrl,        setBlobUrl]        = useState("");
  const [recSecs,        setRecSecs]        = useState(0);
  const [recError,       setRecError]       = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const timerRef = useRef(null);

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

  /* ── Recording ── */
  async function startRecording() {
    setRecError(""); setBlob(null);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(""); }
    setRecSecs(0);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setRecError("No audio was detected. Make sure you selected the Google Voice tab and enabled tab audio.");
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
      rec.onstop = () => {
        const b = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(b);
        setBlob(b); setBlobUrl(url);
        audioStream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
      };
      rec.start();
      setRecorderRef(rec);
      setRecording(true);
      timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch (e) {
      console.error("Recording:", e);
      setRecError(e.message?.includes("denied") ? "Screen sharing permission was denied." : e.message);
    }
  }

  function stopRecording() {
    if (recorderRef && recorderRef.state !== "inactive") {
      recorderRef.stop();
      clearInterval(timerRef.current);
      setRecording(false);
    }
  }

  function deleteRecording() {
    if (recorderRef) recorderRef.stream?.getTracks().forEach((t) => t.stop());
    setBlob(null);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(""); }
    setRecSecs(0); setRecording(false); setConsent(false);
    clearInterval(timerRef.current);
    push("Recording deleted", "info");
  }

  async function downloadRecording() {
    if (!blob) return;
    const now      = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
    const filename = `${safeName(lead.businessName)}-${safeName(lead.phone) || "nophone"}-${datePart}-${timePart}.webm`;
    const a = document.createElement("a");
    a.href = blobUrl; a.download = filename;
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

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-white/[0.07] bg-[#060212]/96 shadow-2xl backdrop-blur-2xl overflow-hidden">

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

            <ContactRow icon={<Globe size={14} className="text-cyan-400"/>} label="Website">
              {lead.website ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-white hover:text-cyan-300 transition truncate flex-1">{lead.website}</a>
                  <CopyBtn text={lead.website} label="Website" push={push}/>
                </div>
              ) : <Empty>No website saved</Empty>}
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

          {/* ── CALL RECORDING PANEL ── */}
          <Section title="Call Recording">
            <p className="text-[10px] text-zinc-500 -mt-1 mb-3">
              Use this to capture audio from your Google Voice tab. Recording stays local — never uploaded.
            </p>

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
                    disabled={recording}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-black text-cyan-400 cursor-pointer disabled:opacity-40"/>
                  <span className="text-xs text-zinc-300 leading-snug">I have permission or legal right to record this call.</span>
                </label>
                <div className="flex items-center justify-between border-t border-white/[0.05] pt-2">
                  <span className="text-[10px] text-zinc-600">Ask consent verbally first:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("Just so you know, I may record this call for notes and follow-up. Is that okay?");
                      push("Consent script copied", "success");
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer">
                    📋 Copy Script
                  </button>
                </div>
              </div>
            )}

            {/* Recording controls */}
            {!recording && !blob && (
              <button onClick={startRecording} disabled={!consent}
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

function LeadCard({ lead, onStatus, onDemoStatus, onFollowUp, onEdit, onDelete, onSelect, push }) {
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
    <article className={`group flex flex-col rounded-3xl border p-4 shadow-md backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg ${
      due ? "border-yellow-400/25 bg-yellow-400/[0.04]" : "border-white/[0.07] bg-white/[0.03]"
    }`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${meta.soft}`}>{meta.label}</span>
            
            {/* Demo website badges */}
            {lead.demoStatus === "needs_demo" && (
              <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-black text-fuchsia-300 animate-pulse">
                ⚡ Needs Demo
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
            className="text-base font-black text-white leading-tight hover:text-cyan-200 transition cursor-pointer group-hover:text-cyan-100">
            {lead.businessName}
          </h3>
          {lead.category && <p className="text-[10px] text-zinc-500 mt-0.5">{lead.category}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(lead)} title="Edit" className="rounded-xl p-2 bg-white/[0.04] hover:bg-white/10 text-zinc-500 hover:text-white transition"><Edit3 size={13}/></button>
          <button onClick={() => onDelete(lead.id)} title="Delete" className="rounded-xl p-2 bg-red-500/[0.04] hover:bg-red-500/15 text-red-500 hover:text-red-300 transition"><Trash2 size={13}/></button>
        </div>
      </div>

      {/* DNC */}
      {lead.status === "no" && (
        <div className="mb-2.5 flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/8 px-3 py-1.5 text-[10px] font-black text-red-300">
          <AlertTriangle size={12} className="animate-pulse"/> DO NOT CALL AGAIN
        </div>
      )}

      {/* Contact fields */}
      <div className="space-y-1.5 mb-3">
        {lead.phone && (
          <div className="flex items-center justify-between group/f">
            <div className="flex items-center gap-2 min-w-0">
              <Phone size={11} className="text-zinc-600 shrink-0"/>
              <a href={`tel:${lead.phone}`} className="text-xs font-mono text-zinc-300 hover:text-cyan-300 transition truncate">{lead.phone}</a>
            </div>
            <button onClick={(e) => { e.stopPropagation(); copyText(lead.phone, "Phone"); }}
              className="opacity-0 group-hover/f:opacity-100 rounded-md px-2 py-0.5 text-[9px] font-bold text-zinc-500 hover:text-white hover:bg-white/8 transition cursor-pointer">
              Copy
            </button>
          </div>
        )}
        {/* Render Email if available */}
        {lead.email && (
          <div className="flex items-center justify-between group/f">
            <div className="flex items-center gap-2 min-w-0">
              <Mail size={11} className="text-zinc-600 shrink-0"/>
              <a href={`mailto:${lead.email}`} className="text-xs text-zinc-300 hover:text-cyan-300 transition truncate">{lead.email}</a>
            </div>
            <button onClick={(e) => { e.stopPropagation(); copyText(lead.email, "Email"); }}
              className="opacity-0 group-hover/f:opacity-100 rounded-md px-2 py-0.5 text-[9px] font-bold text-zinc-500 hover:text-white hover:bg-white/8 transition cursor-pointer">
              Copy
            </button>
          </div>
        )}
        {lead.address && (
          <div className="flex items-center justify-between group/f">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={11} className="text-zinc-600 shrink-0"/>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-300 hover:text-cyan-300 transition truncate">{lead.address}</a>
            </div>
            <button onClick={(e) => { e.stopPropagation(); copyText(lead.address, "Address"); }}
              className="opacity-0 group-hover/f:opacity-100 rounded-md px-2 py-0.5 text-[9px] font-bold text-zinc-500 hover:text-white hover:bg-white/8 transition cursor-pointer">
              Copy
            </button>
          </div>
        )}
        <div className="flex items-center justify-between group/f">
          <div className="flex items-center gap-2 min-w-0">
            <Globe size={11} className="text-zinc-600 shrink-0"/>
            {lead.website ? (
              <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank" rel="noreferrer" className="text-xs text-zinc-300 hover:text-cyan-300 transition truncate">{lead.website}</a>
            ) : (
              <span className="text-xs text-zinc-600 italic">No website</span>
            )}
          </div>
          {lead.website && (
            <button onClick={(e) => { e.stopPropagation(); copyText(lead.website, "Website"); }}
              className="opacity-0 group-hover/f:opacity-100 rounded-md px-2 py-0.5 text-[9px] font-bold text-zinc-500 hover:text-white hover:bg-white/8 transition cursor-pointer">
              Copy
            </button>
          )}
        </div>
        {lead.lastContacted && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <Clock size={10} className="shrink-0"/> Last called: {relativeDate(lead.lastContacted)}
          </div>
        )}
      </div>

      {/* Notes preview */}
      {lead.notes && (
        <p className="mb-3 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2 text-[10px] text-zinc-400 line-clamp-2 italic">
          &ldquo;{lead.notes}&rdquo;
        </p>
      )}

      {/* Quick actions */}
      <div className="mt-auto pt-3 border-t border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Quick Log Outcome</span>
          <button onClick={() => onSelect(lead)} className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer">
            Details & Recording →
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.phone && (
            <a href={`tel:${lead.phone}`}
              className="rounded-xl bg-cyan-400 text-zinc-900 px-3 py-1.5 text-[10px] font-black hover:bg-cyan-300 active:scale-95 transition flex items-center gap-1 cursor-pointer">
              📞 Call
            </a>
          )}
          {quickActions.map((a) => (
            <button key={a.key} onClick={() => onStatus(lead.id, a.key)}
              className={`rounded-xl border px-2.5 py-1.5 text-[10px] font-bold active:scale-95 transition cursor-pointer ${a.cls} ${lead.status === a.key ? "ring-1 ring-white/20" : ""}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Quick Demo toggle under lead card */}
        <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
          <span className="text-[9px] font-bold text-zinc-600 uppercase">Demo Actions</span>
          <div className="flex gap-1">
            <button
              onClick={() => onDemoStatus(lead.id, lead.demoStatus === "needs_demo" ? "not_sent" : "needs_demo")}
              className={`rounded-lg px-2 py-1 text-[9px] font-black transition active:scale-95 cursor-pointer ${
                lead.demoStatus === "needs_demo"
                  ? "bg-fuchsia-500 text-white font-black"
                  : "bg-white/[0.04] text-fuchsia-300 hover:bg-fuchsia-500/10 border border-fuchsia-500/20"
              }`}
            >
              Needs Demo 📤
            </button>
            <button
              onClick={() => onDemoStatus(lead.id, lead.demoStatus === "sent" ? "not_sent" : "sent")}
              className={`rounded-lg px-2 py-1 text-[9px] font-black transition active:scale-95 cursor-pointer ${
                lead.demoStatus === "sent"
                  ? "bg-emerald-500 text-white font-black"
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
    <div className="min-h-screen bg-[#05020f] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(ellipse_at_80%_80%,rgba(168,85,247,0.2),transparent_45%)] pointer-events-none"/>
      <div className="relative w-full max-w-sm">
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 blur-xl"/>
        <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-2xl text-white">
          <div className="text-center mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2">Sales Portal</p>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">CallTrack Pro</h1>
            <p className="text-xs text-zinc-500 mt-2">Sign in to your workspace</p>
          </div>
          {error && <Alert type="error" msg={error}/>}
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className={inputCls}/>
            </Field>
            <Field label="Password">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className={inputCls}/>
            </Field>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3.5 text-sm font-black text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 cursor-pointer">
              {loading ? <Loader2 className="animate-spin" size={16}/> : "Sign In"}
            </button>
          </form>
          <div className="mt-6 border-t border-white/[0.05] pt-4 text-center">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              🔐 <strong>Registration Disabled</strong><br />
              Account creation is managed securely. Authorized users must be added directly from the Supabase Authentication Dashboard.
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
