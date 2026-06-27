import { CATEGORIES } from "./categories";

/* ─────────────────────────── CONSTANTS ─────────────────────────── */

export const STATUS_OPTIONS = [
  { key: "not_called", label: "Not Called", color: "bg-blue-500", soft: "bg-blue-500/15 text-blue-200 border-blue-400/30" },
  { key: "interested", label: "Yes / Interested", color: "bg-green-500", soft: "bg-green-500/15 text-green-200 border-green-400/30" },
  { key: "maybe", label: "Maybe", color: "bg-yellow-400", soft: "bg-yellow-400/15 text-yellow-100 border-yellow-300/30" },
  { key: "follow_up", label: "Follow Up", color: "bg-orange-500", soft: "bg-orange-500/15 text-orange-100 border-orange-400/30" },
  { key: "no_answer", label: "No Answer", color: "bg-slate-500", soft: "bg-slate-500/15 text-slate-200 border-slate-400/30" },
  { key: "demo_sent", label: "Demo Sent", color: "bg-purple-500", soft: "bg-purple-500/15 text-purple-200 border-purple-400/30" },
  { key: "closed", label: "Closed", color: "bg-zinc-500", soft: "bg-zinc-500/15 text-zinc-200 border-zinc-400/30" },
];

export const WEBSITE_OPTIONS = ["Unknown", "No website", "Has website", "Bad website", "Social media only"];

export const NEXT_ACTION_OPTIONS = ["Call", "Follow up", "Send demo", "Waiting", "Done"];

export const EMPTY_LEAD = {
  businessName: "", mapsLink: "", phone: "", address: "", category: "",
  website: "", websiteStatus: "Unknown", status: "not_called", priority: "",
  notes: "", lastContacted: "", nextFollowUp: "", googlePlaceId: "", nextAction: "Call",
  email: "", demoStatus: "not_sent", socialLink: "",
};

/* ── Google Maps Copy-Paste Auto-Detector ── */
export const GOOGLE_MAPS_COLUMNS = {
  mapsLink: 0,       // hfpxzc href
  businessName: 1,   // qBF1Pd
  category: 4,       // W4Efsd
  address: 6,        // W4Efsd 3
  phone: 10,         // UsdlK
  notes: 17,         // ah5Ghc
};

/* ── Smart Category Matcher ── */
export const CATEGORY_KEYWORD_MAP = [
  { category: "Kitchen Remodelers", keywords: ["kitchen remodel", "kitchen renovation", "kitchen design"] },
  { category: "Bathroom Remodelers", keywords: ["bathroom remodel", "bathroom renovation", "bath remodel"] },
  { category: "Remodeling Contractors", keywords: ["remodeler", "remodeling", "home renovation", "renovation contractor"] },
  { category: "General Contractors", keywords: ["general contractor", "contracting", "builder", "home builder"] },
  { category: "Water Damage Restoration Companies", keywords: ["water damage", "flood cleanup", "leak restoration", "mold remediation"] },
  { category: "Fire Damage Restoration Companies", keywords: ["fire damage", "smoke damage", "soot cleanup"] },
  { category: "Restoration Companies", keywords: ["restoration service", "damage restoration", "disaster cleanup"] },
  { category: "Commercial Cleaning Companies", keywords: ["commercial cleaning", "office cleaning", "janitorial service"] },
  { category: "Carpet Cleaning Companies", keywords: ["carpet cleaning", "rug cleaning", "upholstery cleaning"] },
  { category: "Cleaning Companies", keywords: ["cleaning service", "house cleaning", "maid service", "housekeeper", "cleaning company", "cleaning companies"] },
  { category: "Mobile Detailers", keywords: ["mobile detailing", "mobile detailer", "on-site detailing"] },
  { category: "Auto Detailing Companies", keywords: ["auto detailing", "car detailing", "car wash and detail"] },
  { category: "Mobile Mechanics", keywords: ["mobile mechanic", "roadside mechanic"] },
  { category: "Transmission Shops", keywords: ["transmission repair", "transmission shop"] },
  { category: "Tire Shops", keywords: ["tire shop", "tire sales", "wheel alignment"] },
  { category: "Auto Body Shops", keywords: ["auto body", "collision center", "collision repair", "body shop"] },
  { category: "Auto Repair Shops", keywords: ["auto repair", "car repair", "mechanic shop", "auto service", "mechanic", "automotive repair"] },
  { category: "Orthodontists", keywords: ["orthodontist", "braces", "invisalign", "teeth alignment"] },
  { category: "Dentists", keywords: ["dentist", "dental clinic", "teeth cleaning", "family dentistry", "dental"] },
  { category: "Real Estate Teams", keywords: ["real estate team", "realtor team", "home group"] },
  { category: "Real Estate Brokerages", keywords: ["real estate brokerage", "realtor", "real estate agent", "realty", "brokerage", "real estate"] },
  { category: "Managed IT Providers", keywords: ["managed it", "msp", "managed services"] },
  { category: "Computer Repair Shops", keywords: ["computer repair", "laptop repair", "pc repair", "macbook repair"] },
  { category: "IT Service Companies", keywords: ["it support", "it services", "tech support", "computer help", "it company"] },
  { category: "Alarm Installation Companies", keywords: ["alarm installation", "security system installation", "cctv install"] },
  { category: "Security Companies", keywords: ["security company", "security guard", "patrol service"] },
  { category: "Roofing Companies", keywords: ["roofing", "roofer", "roofs"] },
  { category: "HVAC Companies", keywords: ["hvac", "heating", "air conditioning", "ac repair", "cooling", "furnace", "air condition"] },
  { category: "Plumbing Companies", keywords: ["plumbing", "plumber", "drain cleaning", "clogged drain", "pipe repair"] },
  { category: "Electricians", keywords: ["electrician", "electrical", "wiring", "power outlet"] },
  { category: "Concrete Contractors", keywords: ["concrete", "cement contractor", "driveway paving", "paving contractor"] },
  { category: "Fence Companies", keywords: ["fence", "fencing", "gate installation"] },
  { category: "Deck Builders", keywords: ["deck builder", "deck building", "patio builder", "pergola"] },
  { category: "Flooring Companies", keywords: ["flooring", "hardwood floor", "carpet installation", "tile installation"] },
  { category: "Painting Companies", keywords: ["painting", "painter", "house painting", "exterior paint"] },
  { category: "Drywall Contractors", keywords: ["drywall", "sheetrock", "plastering", "drywall repair"] },
  { category: "Siding Contractors", keywords: ["siding contractor", "stucco", "vinyl siding", "cladding"] },
  { category: "Window Installation Companies", keywords: ["window installation", "window replacement", "glazier", "glass window"] },
  { category: "Garage Door Companies", keywords: ["garage door", "garage gate"] },
  { category: "Insulation Contractors", keywords: ["insulation contractor", "attic insulation", "fiberglass insulation"] },
  { category: "Solar Installation Companies", keywords: ["solar panel", "solar installation", "solar energy", "photovoltaic"] },
  { category: "Landscaping Companies", keywords: ["landscaping", "landscape design", "gardener", "garden design"] },
  { category: "Tree Service Companies", keywords: ["tree service", "tree removal", "arborist", "stump grinding", "tree trimming"] },
  { category: "Lawn Care Companies", keywords: ["lawn care", "mowing", "grass cutting", "weed control", "lawn service"] },
  { category: "Irrigation Companies", keywords: ["irrigation", "sprinkler repair", "sprinkler system"] },
  { category: "Pest Control Companies", keywords: ["pest control", "exterminator", "termite control", "bug control", "rodent control"] },
  { category: "Junk Removal Companies", keywords: ["junk removal", "trash hauling", "rubbish removal", "waste disposal"] },
  { category: "Pressure Washing Companies", keywords: ["pressure washing", "power washing", "roof cleaning", "pressure cleaner"] },
  { category: "Pool Service Companies", keywords: ["pool service", "pool cleaning", "pool maintenance", "spa service"] },
  { category: "Pool Builders", keywords: ["pool builder", "swimming pool construction", "pool contractor"] },
  { category: "Moving Companies", keywords: ["moving company", "movers", "relocation service", "local movers"] },
  { category: "Storage Facilities", keywords: ["storage facility", "self storage", "storage unit", "warehousing"] },
  { category: "Property Management Companies", keywords: ["property management", "property manager", "rental management"] },
  { category: "Home Inspectors", keywords: ["home inspector", "home inspection", "building inspector"] },
  { category: "Appraisers", keywords: ["appraiser", "property appraisal", "home valuation"] },
  { category: "Insurance Agencies", keywords: ["insurance agency", "insurance broker", "insurance agent", "insurance"] },
  { category: "Mortgage Brokers", keywords: ["mortgage broker", "home loan", "mortgage lender", "mortgage"] },
  { category: "Financial Advisors", keywords: ["financial advisor", "wealth management", "financial planner", "investment advisor"] },
  { category: "Accountants", keywords: ["accountant", "accounting firm", "cpa", "certified public accountant"] },
  { category: "Tax Preparation Services", keywords: ["tax preparation", "tax prep", "tax return helper"] },
  { category: "Bookkeepers", keywords: ["bookkeeper", "bookkeeping"] },
  { category: "Law Firms", keywords: ["law firm", "attorneys", "law office", "legal services", "lawyer", "legal"] },
  { category: "Personal Injury Lawyers", keywords: ["personal injury", "accident lawyer", "car accident attorney"] },
  { category: "Family Lawyers", keywords: ["family lawyer", "divorce attorney", "child custody lawyer"] },
  { category: "Estate Planning Lawyers", keywords: ["estate planning", "will and trust", "probate lawyer"] },
  { category: "Bankruptcy Lawyers", keywords: ["bankruptcy lawyer", "bankruptcy attorney"] },
  { category: "Immigration Lawyers", keywords: ["immigration lawyer", "visa attorney", "green card lawyer"] },
  { category: "Chiropractors", keywords: ["chiropractor", "chiropractic", "spinal adjustment"] },
  { category: "Physical Therapists", keywords: ["physical therapist", "physical therapy", "physiotherapy"] },
  { category: "Med Spas", keywords: ["med spa", "medical spa", "botox clinic", "laser hair removal"] },
  { category: "Dermatologists", keywords: ["dermatology", "dermatologist", "skin clinic", "skin doctor"] },
  { category: "Veterinarians", keywords: ["veterinarian", "veterinary clinic", "animal hospital", "pet vet", "vet"] },
  { category: "Mental Health Practices", keywords: ["mental health", "therapy center", "psychotherapist", "counselor", "psychiatrist"] },
  { category: "Urgent Care Clinics", keywords: ["urgent care", "walk-in clinic", "immediate care"] },
  { category: "Private Medical Practices", keywords: ["medical practice", "family medicine", "pediatrician office", "doctor office", "clinic"] },
  { category: "Optometrists", keywords: ["optometrist", "eye doctor", "optometry", "vision care"] },
  { category: "Barbershops", keywords: ["barbershop", "barber shop", "barber"] },
  { category: "Hair Salons", keywords: ["hair salon", "hair stylist", "haircut"] },
  { category: "Nail Salons", keywords: ["nail salon", "manicure", "pedicure", "nails spa", "nails"] },
  { category: "Beauty Salons", keywords: ["beauty salon", "aesthetician", "facial spa", "salon"] },
  { category: "Massage Therapists", keywords: ["massage therapist", "massage therapy", "bodywork"] },
  { category: "Gyms", keywords: ["gym", "fitness center", "crossfit box", "fitness"] },
  { category: "Personal Trainers", keywords: ["personal trainer", "fitness coach", "personal training"] },
  { category: "Martial Arts Schools", keywords: ["martial arts", "karate school", "taekwondo", "jiu jitsu academy"] },
  { category: "Yoga Studios", keywords: ["yoga studio", "yoga class", "yoga"] },
  { category: "Coffee Shops", keywords: ["coffee shop", "coffeehouse", "espresso bar"] },
  { category: "Bakeries", keywords: ["bakery", "cake shop", "donut shop", "pastry shop"] },
  { category: "Catering Companies", keywords: ["catering", "caterer", "event food"] },
  { category: "Food Trucks", keywords: ["food truck", "mobile kitchen"] },
  { category: "Event Venues", keywords: ["event venue", "banquet hall", "reception center"] },
  { category: "Wedding Venues", keywords: ["wedding venue", "marriage hall"] },
  { category: "Restaurants", keywords: ["restaurant", "cafe", "bistro", "diner", "eatery", "sushi bar", "pizzeria", "steakhouse", "grill", "pub"] },
  { category: "Photography Studios", keywords: ["photography studio", "photographer", "portrait photo"] },
  { category: "Videographers", keywords: ["videographer", "video production", "filmmaker"] },
  { category: "DJ Services", keywords: ["dj service", "disc jockey", "wedding dj", "dj"] },
  { category: "Daycares", keywords: ["daycare", "child care", "childcare"] },
  { category: "Preschools", keywords: ["preschool", "pre-k"] },
  { category: "Tutoring Centers", keywords: ["tutoring", "tutor", "math help", "learning center"] },
  { category: "Private Schools", keywords: ["private school", "academy", "prep school"] },
  { category: "Pet Groomers", keywords: ["pet grooming", "dog groomer", "pet spa", "groomer"] },
  { category: "Dog Trainers", keywords: ["dog training", "dog trainer", "k9 training"] },
  { category: "Boarding Kennels", keywords: ["boarding kennel", "dog boarding", "pet boarding"] },
  { category: "Web Design Agencies", keywords: ["web design", "website design", "web development agency"] },
  { category: "Marketing Agencies", keywords: ["marketing agency", "advertising agency", "seo agency", "digital marketing"] },
  { category: "Sign Companies", keywords: ["sign company", "sign shop", "custom signs"] },
  { category: "Printing Companies", keywords: ["print shop", "printing company", "copy shop"] },
  { category: "Staffing Agencies", keywords: ["staffing agency", "employment agency", "temp agency"] },
  { category: "Recruiting Firms", keywords: ["recruiting firm", "executive search", "recruiter"] },
  { category: "Courier Services", keywords: ["courier service", "delivery messenger"] },
  { category: "Delivery Services", keywords: ["delivery service", "parcel delivery"] },
  { category: "Funeral Homes", keywords: ["funeral home", "mortuary", "cremation service"] },
  { category: "Senior Care Agencies", keywords: ["senior care", "elderly care", "home care agency", "in-home care"] },
  { category: "Assisted Living Facilities", keywords: ["assisted living", "nursing home", "retirement home"] },
  { category: "Nonprofit Organizations", keywords: ["nonprofit", "non-profit", "charity organization", "foundation"] },
  { category: "Churches", keywords: ["church", "chapel", "parish", "cathedral", "worship center"] },
  { category: "Construction Companies", keywords: ["construction company", "building contractor", "builder", "construction"] },
  { category: "Engineering Firms", keywords: ["engineering firm", "civil engineering", "structural engineer"] },
  { category: "Architecture Firms", keywords: ["architecture firm", "architects"] },
  { category: "Surveying Companies", keywords: ["surveying company", "land surveyor", "boundary survey"] },
  { category: "Manufacturing Companies", keywords: ["manufacturing company", "manufacturer", "factory"] },
  { category: "Wholesale Distributors", keywords: ["wholesale distributor", "wholesaler", "wholesale supply"] }
];

/* ─────────────────────────── HELPERS ─────────────────────────── */

export const statusMeta = (s) => STATUS_OPTIONS.find((o) => o.key === s) ?? STATUS_OPTIONS[0];

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export const norm = (v) => String(v || "").trim().toLowerCase();

export const isDue = (d) => !!d && d <= todayStr();

// Pack email, demoStatus, nextAction, and socialLink into notes field
export function packNotes(plainNotes, email, demoStatus, nextAction, socialLink) {
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
export function unpackNotes(packedNotes) {
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

export function mapToState(r) {
  const unpacked = unpackNotes(r.notes);
  return {
    id: r.id,
    businessName: r.business_name || "",
    mapsLink: r.maps_link || "",
    phone: r.phone || "",
    phone_normalized: r.phone_normalized || "",
    address: r.address || "",
    category: r.category || "",
    website: r.website || "",
    websiteStatus: r.website_status || "Unknown",
    status: r.status || "not_called",
    priority: r.priority || "",
    notes: unpacked.notes,
    email: unpacked.email,
    demoStatus: unpacked.demoStatus,
    socialLink: unpacked.socialLink,
    lastContacted: r.last_contacted || "",
    nextFollowUp: r.next_follow_up || "",
    googlePlaceId: r.google_place_id || "",
    nextAction: unpacked.nextAction,
    createdAt: r.created_at || "",
  };
}

export function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function relativeDate(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(iso).toLocaleDateString();
}

export function safeName(s) {
  return (s || "business").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

export function matchCategory(rawCategory) {
  if (!rawCategory) return null;
  const lower = rawCategory.toLowerCase().trim();
  for (const entry of CATEGORY_KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.category;
    }
  }
  return null;
}

export function parseSpreadsheetText(text) {
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
