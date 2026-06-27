import React, { useState, useRef, useMemo } from "react";
import {
  Loader2, Plus, Download, Globe, CheckCircle2,
  AlertTriangle, RotateCcw, X, Phone, MapPin, Mail, ExternalLink
} from "lucide-react";
import { Field } from "./Field";
import {
  parseSpreadsheetText, matchCategory, norm,
  STATUS_OPTIONS, packNotes, GOOGLE_MAPS_COLUMNS, mapToState
} from "../utils/helpers";
import { CATEGORIES } from "../utils/categories";
import { dbService } from "../services/db";

const inputCls = "w-full rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-cyan-400/30 transition";

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
  for (const cell of row) {
    const text = String(cell || "").trim();
    if (!text) continue;
    if (/^\d+/.test(text) && streetRegex.test(text) && !text.includes("http") && !/\d{3}-\d{4}/.test(text)) {
      return text;
    }
  }
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
    if (/^https?:\/\//i.test(text)) {
      const lower = text.toLowerCase();
      if (!lower.includes("google.com") && !lower.includes("gstatic.com") && !lower.includes("ggpht.com") && !lower.includes("schema.org") && !lower.includes("w3.org")) {
        return text;
      }
      continue;
    }
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
  const h = headerRow.map(item => String(item || "").toLowerCase().trim());
  const isGmapsHeader = h.some(v => v === "hfpxzc href" || v === "qbf1pd" || v === "usdlk" || v === "mw4etd");
  const firstCell = String(headerRow[0] || "");
  const isGmapsData = firstCell.includes("google.com/maps/place/") || firstCell.includes("google.com/maps/dir/") || firstCell.includes("google.com/maps/search/");

  if (!isGmapsHeader && !isGmapsData) return null;

  const mapping = {};
  LEAD_FIELDS.forEach(f => { mapping[f.key] = ""; });
  Object.entries(GOOGLE_MAPS_COLUMNS).forEach(([field, colIdx]) => {
    if (mapping.hasOwnProperty(field)) mapping[field] = colIdx;
  });

  return mapping;
}

function autoMapColumns(headers, fields) {
  const mapping = {};
  fields.forEach((field) => {
    let matchedIndex = -1;
    matchedIndex = headers.findIndex((h) => {
      const hn = h.toLowerCase().trim();
      return hn === field.key.toLowerCase() || hn === field.label.toLowerCase();
    });
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

export function BulkImportModal({ session, loadedLeads, setLeads, onClose, push }) {
  const [importStep, setImportStep] = useState("input");
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
  const [previewFilter, setPreviewFilter] = useState("all");

  function updateLeadField(rowIndex, field, val) {
    setManualEdits(prev => {
      const currentEdits = prev[rowIndex] || {};
      const newEdits = { ...currentEdits, [field]: val };

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

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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
    const gmapsMapping = detectGoogleMapsFormat(firstRow);
    if (gmapsMapping) {
      setColumnMapping(gmapsMapping);
      const firstCell = String(firstRow[0] || "").toLowerCase().trim();
      const hasHeader = firstCell.includes("hfpxzc href");
      setHasHeaderRow(hasHeader);
      setImportStep("preview");
    } else {
      const mapping = autoMapColumns(firstRow, LEAD_FIELDS);
      setColumnMapping(mapping);
      setImportStep("mapping");
    }
  }

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

  const currentHeaders = useMemo(() => {
    if (parsedRows.length === 0) return [];
    if (hasHeaderRow) {
      return parsedRows[0].map((h, i) => h.trim() || `Column ${i + 1}`);
    } else {
      const colCount = Math.max(...parsedRows.map(r => r.length));
      return Array.from({ length: colCount }, (_, i) => `Column ${String.fromCharCode(65 + i)}`);
    }
  }, [parsedRows, hasHeaderRow]);

  const dataRows = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return hasHeaderRow ? parsedRows.slice(1) : parsedRows;
  }, [parsedRows, hasHeaderRow]);

  const leadsToImport = useMemo(() => {
    if (dataRows.length === 0) return [];
    const isGmaps = parsedRows.length > 0 && !!detectGoogleMapsFormat(parsedRows[0]);

    return dataRows.map((row, rowIndex) => {
      let lead = {};
      if (isGmaps) {
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
        LEAD_FIELDS.forEach(field => {
          const colIdx = columnMapping[field.key];
          if (colIdx !== undefined && colIdx !== "") {
            lead[field.key] = String(row[colIdx] || "").trim();
          } else {
            lead[field.key] = "";
          }
        });
      }

      if (!lead.businessName && !lead.phone) return null;
      if (!lead.businessName && lead.phone) {
        lead.businessName = `Business (${lead.phone})`;
      }

      let resolvedCategory = lead.category
        ? matchCategory(lead.category) || lead.category
        : "";

      if (!resolvedCategory && lead.businessName) {
        resolvedCategory = matchCategory(lead.businessName) || "";
      }

      const rawPhone = lead.phone || "";
      const phoneClean = rawPhone.replace(/\D/g, "");
      const isDuplicateName = loadedLeads.some(l => norm(l.businessName) === norm(lead.businessName));
      const isDuplicatePhone = phoneClean ? loadedLeads.some(l => l.phone_normalized && l.phone_normalized === phoneClean) : false;

      const mergedLead = {
        ...lead,
        category: resolvedCategory,
        phone_normalized: phoneClean,
        rowIndex,
        isDuplicateName,
        isDuplicatePhone,
        isDuplicate: isDuplicateName || isDuplicatePhone,
        hasNoPhone: !phoneClean,
        websiteStatus: lead.websiteStatus || (lead.website ? "Has website" : "Unknown")
      };

      const edits = manualEdits[rowIndex] || {};
      return { ...mergedLead, ...edits };
    }).filter(Boolean);
  }, [dataRows, columnMapping, parsedRows, manualEdits, loadedLeads]);

  const displayedPreviewLeads = useMemo(() => {
    return leadsToImport.filter(lead => {
      const isRemoved = manuallyRemovedRows.has(lead.rowIndex);
      if (previewFilter === "all") return !isRemoved;
      if (previewFilter === "removed") return isRemoved;
      if (previewFilter === "duplicates") return !isRemoved && lead.isDuplicate;
      if (previewFilter === "no_phone") return !isRemoved && lead.hasNoPhone;
      return true;
    });
  }, [leadsToImport, previewFilter, manuallyRemovedRows]);

  const importStats = useMemo(() => {
    const active = leadsToImport.filter(l => !manuallyRemovedRows.has(l.rowIndex));
    const total = active.length;
    const noPhone = active.filter(l => l.hasNoPhone).length;
    const duplicates = active.filter(l => l.isDuplicate).length;
    const finalCount = skipDuplicates ? total - duplicates : total;
    return { total, duplicates, noPhone, finalCount };
  }, [leadsToImport, skipDuplicates, manuallyRemovedRows]);

  function removeRow(rowIndex) {
    setManuallyRemovedRows(prev => {
      const copy = new Set(prev);
      copy.add(rowIndex);
      return copy;
    });
  }

  function removeAllNoPhone() {
    leadsToImport.forEach(l => {
      if (l.hasNoPhone) removeRow(l.rowIndex);
    });
    push("Removed all leads without phone numbers", "info");
  }

  function restoreAllRows() {
    setManuallyRemovedRows(new Set());
    push("Restored all removed rows", "info");
  }

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

      const importedLeads = await dbService.insertLeadsBulk(rowsToInsert);
      setLeads(prev => [...importedLeads, ...prev]);
      push(`Successfully imported ${importedLeads.length} leads! ✓`, "success");
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
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" />
      <div className="fixed inset-4 md:inset-x-20 md:inset-y-10 z-50 flex flex-col border border-white/10 bg-[#060212] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-3xl animate-[slideUp_0.3s_ease]">
        <div className="flex-shrink-0 border-b border-white/[0.07] px-6 py-4 flex items-center justify-between bg-white/[0.01]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Excel / Google Sheets Importer</span>
            <h2 className="text-xl font-black text-white flex items-center gap-2">📥 Bulk Import Leads</h2>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/[0.06] p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-white/[0.05] bg-black/20 text-xs">
          {[
            { step: "input", label: "1. Upload & Paste" },
            { step: "mapping", label: "2. Map Columns" },
            { step: "preview", label: "3. Preview & Import" },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex-grow py-3 text-center font-bold border-b-2 transition ${importStep === s.step
                ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 font-black"
                : "border-transparent text-zinc-500"
                }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {importStep === "input" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-start gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
                <span className="text-lg shrink-0">📍</span>
                <div>
                  <p className="text-xs font-black text-white">Google Maps Paste Supported!</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    Go to <strong className="text-white">Google Maps</strong>, search for businesses, copy the results table (<kbd className="bg-zinc-800 px-1 py-0.5 rounded">Ctrl+A</kbd> then <kbd className="bg-zinc-800 px-1 py-0.5 rounded">Ctrl+C</kbd>), and paste below. We automatically detect Google Maps format and extract the Business Name, Phone, Address, Category, and Maps Link perfectly.
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">Paste Data (Google Maps, Excel, or Google Sheets)</h3>
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
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${dragActive
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

          {importStep === "mapping" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl px-5 py-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasHeaderRow}
                    onChange={(e) => {
                      setHasHeaderRow(e.target.checked);
                      const firstRow = parsedRows[0] || [];
                      const mapping = autoMapColumns(firstRow, LEAD_FIELDS);
                      setColumnMapping(mapping);
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-black text-cyan-400 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">First row contains column headers</p>
                    <p className="text-[10px] text-zinc-500">Enable this if your pasted/uploaded sheet has header row titles.</p>
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

          {importStep === "preview" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Import Summary — Verify Your Numbers</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-white/[0.05]">
                  {[
                    {
                      key: "all",
                      label: "Total Parsed",
                      value: leadsToImport.filter(l => !manuallyRemovedRows.has(l.rowIndex)).length,
                      desc: "Show active rows",
                      color: "text-white",
                      bg: previewFilter === "all" ? "bg-cyan-500/10 ring-1 ring-cyan-500/20" : "",
                    },
                    {
                      key: "removed",
                      label: "You Removed",
                      value: manuallyRemovedRows.size,
                      desc: "Show removed leads",
                      color: "text-zinc-400",
                      bg: previewFilter === "removed" ? "bg-zinc-800/40 ring-1 ring-zinc-500/20" : "",
                    },
                    {
                      key: "duplicates",
                      label: "Duplicates",
                      value: importStats.duplicates,
                      desc: skipDuplicates ? "Skipped" : "Will import",
                      color: importStats.duplicates > 0 ? "text-yellow-400" : "text-zinc-500",
                      bg: previewFilter === "duplicates" ? "bg-yellow-400/10 ring-1 ring-yellow-400/20" : "",
                    },
                    {
                      key: "no_phone",
                      label: "No Phone",
                      value: importStats.noPhone,
                      desc: "Show missing phones",
                      color: importStats.noPhone > 0 ? "text-orange-400" : "text-zinc-500",
                      bg: previewFilter === "no_phone" ? "bg-orange-500/10 ring-1 ring-orange-500/20" : "",
                    },
                    {
                      key: "will_import",
                      label: "✓ Will Import",
                      value: importStats.finalCount,
                      desc: "Leads that will save",
                      color: "text-emerald-400",
                      bg: "bg-emerald-400/5",
                    },
                  ].map((stat) => (
                    <button
                      key={stat.label}
                      type="button"
                      disabled={stat.key === "will_import"}
                      onClick={() => setPreviewFilter(stat.key)}
                      className={`px-4 py-4 text-center transition active:scale-98 ${stat.bg} ${stat.key !== "will_import" ? "cursor-pointer hover:bg-white/[0.03]" : ""}`}
                    >
                      <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] font-black text-zinc-300 mt-1">{stat.label}</div>
                      <div className="text-[9px] text-zinc-600 mt-0.5 leading-snug">{stat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {parsedRows.length > 0 && detectGoogleMapsFormat(parsedRows[0]) && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3">
                  <span className="text-lg">✅</span>
                  <div>
                    <p className="text-xs font-black text-emerald-300">Google Maps Format Detected & Auto-Mapped!</p>
                  </div>
                </div>
              )}

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
                  </div>
                </label>
                <div className="text-right shrink-0">
                  <div className="text-xs text-zinc-400 font-bold">Importing: <span className="text-emerald-400 text-sm font-black">{importStats.finalCount}</span></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                    {previewFilter === "all" ? `Parsed Leads (${displayedPreviewLeads.length} active)` :
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
                        className={`relative rounded-2xl border px-4 py-3 transition-all ${isRemoved
                          ? "opacity-40 border-zinc-700/30 bg-zinc-900/20 scale-[0.99]"
                          : isSkipped
                            ? "border-yellow-400/15 bg-yellow-400/[0.02]"
                            : lead.hasNoPhone
                              ? "border-orange-500/25 bg-orange-500/[0.03]"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03]"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black leading-tight ${isRemoved ? "text-zinc-600 line-through" : "text-white"}`}>{lead.businessName}</p>
                            {lead.category && <p className="text-[10px] text-zinc-500 mt-0.5">{lead.category}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isRemoved && isSkipped && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-yellow-400/20 bg-yellow-400/10 text-yellow-400 font-bold">Duplicate – Skipped</span>
                            )}
                            {!isRemoved && lead.isDuplicate && !isSkipped && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-orange-400/20 bg-orange-400/10 text-orange-400 font-bold">⚠ Duplicate</span>
                            )}
                            {!isRemoved && lead.hasNoPhone && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-orange-500/25 bg-orange-500/10 text-orange-400 font-bold">⚠ No Phone</span>
                            )}
                            {!isRemoved && !lead.isDuplicate && !lead.hasNoPhone && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 font-bold">✓ Ready</span>
                            )}
                            {isRemoved && (
                              <span className="text-[9px] rounded-full px-2 py-0.5 border border-zinc-600/30 bg-zinc-700/20 text-zinc-500 font-bold">Removed</span>
                            )}
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
                                title="Remove this lead"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </div>

                        {!isRemoved && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] mb-2">
                            {lead.phone ? (
                              <span className="flex items-center gap-1.5 text-zinc-300 font-mono">
                                <Phone size={10} className="text-cyan-400 shrink-0" />
                                {lead.phone}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-orange-400/70 italic">
                                <Phone size={10} className="shrink-0" /> No phone
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
                                  placeholder="No website detected"
                                  className="w-full rounded-lg border border-white/[0.08] bg-black/40 py-1.5 pl-8 pr-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-400/30 transition"
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
                                <option value="No website">🚫 Needs Website</option>
                                <option value="Has website">🌐 Has website</option>
                                <option value="Bad website">⚠️ Bad website</option>
                                <option value="Social media only">📱 Social media only</option>
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
                    Import {importStats.finalCount} Leads
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
