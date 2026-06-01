// =========================================================
//   CALLTRACK PRO — App Logic v2
// =========================================================

const STORAGE_KEY = 'calltracker_v2';

// ── STATUS CONFIG ──────────────────────────────────────────
const STATUS = {
  none:           { label:'Not Called',     emoji:'⬜', color:'#6b7280',  bg:'rgba(107,114,128,0.10)', border:'rgba(107,114,128,0.25)' },
  interested:     { label:'Interested',     emoji:'✅', color:'#22c55e',  bg:'rgba(34,197,94,0.10)',   border:'rgba(34,197,94,0.30)' },
  'not-interested':{ label:'Not Interested',emoji:'❌', color:'#ef4444',  bg:'rgba(239,68,68,0.10)',   border:'rgba(239,68,68,0.30)' },
  maybe:          { label:'Follow Up',      emoji:'🟡', color:'#f59e0b',  bg:'rgba(245,158,11,0.10)',  border:'rgba(245,158,11,0.30)' },
  'no-answer':    { label:'No Answer',      emoji:'📵', color:'#3b82f6',  bg:'rgba(59,130,246,0.10)',  border:'rgba(59,130,246,0.30)' },
  'do-not-call':  { label:'Do Not Call',    emoji:'⛔', color:'#dc2626',  bg:'rgba(185,28,28,0.12)',   border:'rgba(185,28,28,0.30)' },
};

// ── STATE ──────────────────────────────────────────────────
let businesses  = [];
let activeFilter = 'all';
let searchQuery  = '';
let sortBy       = 'date-desc';
let currentView  = 'grid';
let deleteTargetId = null;
let editingId    = null;

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  businesses = load();
  setupListeners();
  renderAll();
});

// ── STORAGE ────────────────────────────────────────────────
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(businesses));
  if (typeof syncGlobals === 'function') syncGlobals();
  window.businesses = businesses;
}

// ── LISTENERS ─────────────────────────────────────────────
function setupListeners() {
  // Open add modal
  ['btn-open-add','btn-open-add-hero'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => openAddModal());
  });

  // Close add modal
  document.getElementById('close-add-modal').addEventListener('click', closeAddModal);
  document.getElementById('btn-cancel-add').addEventListener('click', closeAddModal);
  document.getElementById('add-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('add-modal-overlay')) closeAddModal();
  });

  // Form submit
  document.getElementById('add-form').addEventListener('submit', handleSubmit);

  // Phone duplicate check on input
  document.getElementById('input-phone').addEventListener('input', checkDuplicate);

  // Search
  const searchEl = document.getElementById('search-input');
  const clearEl  = document.getElementById('search-clear');
  searchEl.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    clearEl.style.display = searchQuery ? 'flex' : 'none';
    renderCards(); updateCount();
  });

  // Sort
  document.getElementById('sort-select').addEventListener('change', e => {
    sortBy = e.target.value; renderCards();
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', exportCSV);

  // Delete modal
  document.getElementById('modal-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmDelete);
  document.getElementById('delete-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('delete-modal-overlay')) closeDeleteModal();
  });

  // Active filter badge (click to clear)
  document.getElementById('active-filter-badge').addEventListener('click', () => setFilter('all'));

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAddModal(); closeDeleteModal(); }
  });

  // Stat cards keyboard
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilter(card.dataset.filter); }
    });
  });
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').style.display = 'none';
  searchQuery = '';
  renderCards(); updateCount();
}

// ── ADD MODAL ─────────────────────────────────────────────
function openAddModal(biz = null) {
  editingId = biz ? biz.id : null;
  const titleEl = document.getElementById('add-modal-title');
  const submitEl = document.getElementById('btn-submit-add');

  if (biz) {
    titleEl.textContent = 'Edit Business';
    submitEl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes`;
    document.getElementById('input-name').value    = biz.name    || '';
    document.getElementById('input-phone').value   = biz.phone   || '';
    document.getElementById('input-address').value = biz.address || '';
    document.getElementById('input-website').value = biz.website || '';
    document.getElementById('input-maps').value    = biz.mapsUrl || '';
    document.getElementById('input-notes').value   = biz.notes   || '';
  } else {
    titleEl.textContent = 'Add New Business';
    submitEl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Business`;
    document.getElementById('add-form').reset();
    hideDuplicateWarning();
  }

  document.getElementById('add-modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('input-name').focus(), 100);
}

function closeAddModal() {
  document.getElementById('add-modal-overlay').classList.remove('open');
  document.getElementById('add-form').reset();
  hideDuplicateWarning();
  editingId = null;
}

// ── FORM SUBMIT ────────────────────────────────────────────
function handleSubmit(e) {
  e.preventDefault();
  const name    = document.getElementById('input-name').value.trim();
  const phone   = document.getElementById('input-phone').value.trim();
  const address = document.getElementById('input-address').value.trim();
  const website = document.getElementById('input-website').value.trim();
  const mapsUrl = document.getElementById('input-maps').value.trim();
  const notes   = document.getElementById('input-notes').value.trim();

  if (!name && !phone) {
    showToast('Please enter at least a name or phone number.', 'warning'); return;
  }

  // Duplicate check (skip for edits of same record)
  const normPhone = normalizePhone(phone);
  if (phone) {
    const dupe = businesses.find(b => normalizePhone(b.phone) === normPhone && b.id !== editingId);
    if (dupe) { showDuplicateWarning(dupe); return; }
  }

  if (editingId) {
    // EDIT
    const biz = businesses.find(b => b.id === editingId);
    if (biz) {
      Object.assign(biz, { name, phone, address, website, mapsUrl, notes, dateModified: new Date().toISOString() });
      save(); renderAll(); closeAddModal();
      showToast(`✏️ "${name || phone}" updated!`, 'success');
    }
  } else {
    // ADD
    const newBiz = {
      id: uid(), name, phone, address, website, mapsUrl, notes,
      status: 'none', callCount: 0,
      dateAdded: new Date().toISOString(), dateModified: new Date().toISOString(),
    };
    businesses.unshift(newBiz);
    save(); renderAll(); closeAddModal();
    showToast(`✅ "${name || phone}" added!`, 'success');
  }
}

// ── DUPLICATE CHECK ────────────────────────────────────────
function checkDuplicate() {
  const phone = normalizePhone(document.getElementById('input-phone').value.trim());
  if (!phone) { hideDuplicateWarning(); return; }
  const dupe = businesses.find(b => normalizePhone(b.phone) === phone && b.id !== editingId);
  if (dupe) showDuplicateWarning(dupe);
  else hideDuplicateWarning();
}

function showDuplicateWarning(dupe) {
  const cfg = STATUS[dupe.status] || STATUS.none;
  document.getElementById('duplicate-warning-text').innerHTML =
    `Already tracked: <strong>${esc(dupe.name || 'Unnamed')}</strong> — Status: ${cfg.emoji} <strong>${cfg.label}</strong>. Scroll down to find them.`;
  document.getElementById('duplicate-warning').classList.add('show');
}
function hideDuplicateWarning() {
  document.getElementById('duplicate-warning').classList.remove('show');
}

// ── STATUS UPDATE ──────────────────────────────────────────
function updateStatus(id, newStatus) {
  const biz = businesses.find(b => b.id === id);
  if (!biz) return;
  biz.status      = biz.status === newStatus ? 'none' : newStatus;
  biz.callCount   = (biz.callCount || 0) + 1;
  biz.dateModified = new Date().toISOString();
  save(); renderAll();
  const cfg = STATUS[biz.status];
  showToast(`${cfg.emoji} ${biz.name || biz.phone || 'Business'} → ${cfg.label}`, toastType(biz.status));
}
function toastType(s) {
  return {interested:'success','not-interested':'error','do-not-call':'error',maybe:'warning','no-answer':'info',none:'info'}[s]||'info';
}

// ── NOTES ─────────────────────────────────────────────────
function toggleNotes(id) {
  const body = document.getElementById(`nb-${id}`);
  const btn  = document.getElementById(`nt-${id}`);
  if (!body) return;
  const open = body.classList.toggle('open');
  btn.innerHTML = open ? arrowUpSVG + ' Hide Notes' : arrowDownSVG + (document.getElementById(`nta-${id}`)?.value.trim() ? ' Notes 📝' : ' Add Notes');
}
function saveNotes(id) {
  const biz = businesses.find(b => b.id === id);
  if (!biz) return;
  biz.notes = document.getElementById(`nta-${id}`)?.value || '';
  biz.dateModified = new Date().toISOString();
  save();
  showToast('📝 Notes saved!', 'success');
}

// ── DELETE ─────────────────────────────────────────────────
function promptDelete(id) {
  deleteTargetId = id;
  const biz = businesses.find(b => b.id === id);
  document.getElementById('modal-business-name').textContent = biz?.name || biz?.phone || 'this business';
  document.getElementById('delete-modal-overlay').classList.add('open');
}
function closeDeleteModal() {
  document.getElementById('delete-modal-overlay').classList.remove('open');
  deleteTargetId = null;
}
function confirmDelete() {
  const biz = businesses.find(b => b.id === deleteTargetId);
  businesses = businesses.filter(b => b.id !== deleteTargetId);
  save(); renderAll(); closeDeleteModal();
  showToast(`🗑️ "${biz?.name || biz?.phone || 'Business'}" deleted`, 'info');
}

// ── FILTER ────────────────────────────────────────────────
function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.stat-card').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  const badge = document.getElementById('active-filter-badge');
  if (filter !== 'all') {
    const cfg = STATUS[filter];
    badge.textContent = cfg ? `${cfg.emoji} ${cfg.label}` : filter;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
  renderCards(); updateCount();
}

// ── VIEW TOGGLE ────────────────────────────────────────────
function setView(view) {
  currentView = view;
  const grid = document.getElementById('businesses-grid');
  grid.classList.toggle('view-list', view === 'list');
  document.getElementById('view-grid').classList.toggle('active', view === 'grid');
  document.getElementById('view-list').classList.toggle('active', view === 'list');
  renderCards();
}

// ── RENDER ────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderCards();
  updateCount();
  updateWelcomeHero();
}

function updateWelcomeHero() {
  const show = businesses.length === 0;
  document.getElementById('welcome-hero').style.display    = show ? 'block' : 'none';
  document.getElementById('stats-section').style.display   = show ? 'none'  : 'block';
  document.getElementById('toolbar').style.display         = show ? 'none'  : 'flex';
  document.getElementById('list-header').style.display     = show ? 'none'  : 'flex';
}

function renderStats() {
  const count = key => key === 'all' ? businesses.length : businesses.filter(b => b.status === key).length;
  ['all','interested','not-interested','maybe','no-answer','do-not-call','none'].forEach(k => {
    const el = document.getElementById(`stat-${k.replace(/-/g,'_') === 'not_interested' ? 'not-interested' : k}`);
    if (el) {
      const old = parseInt(el.textContent) || 0;
      const nw  = count(k);
      if (old !== nw) { el.textContent = nw; el.style.animation = 'none'; void el.offsetHeight; el.style.animation = ''; }
    }
  });
}

function getFiltered() {
  let list = [...businesses];
  if (activeFilter !== 'all') list = list.filter(b => b.status === activeFilter);
  if (searchQuery) list = list.filter(b =>
    (b.name||'').toLowerCase().includes(searchQuery) ||
    (b.phone||'').toLowerCase().includes(searchQuery) ||
    (b.address||'').toLowerCase().includes(searchQuery) ||
    (b.notes||'').toLowerCase().includes(searchQuery)
  );
  list.sort((a,b) => {
    if (sortBy==='date-desc') return new Date(b.dateAdded)-new Date(a.dateAdded);
    if (sortBy==='date-asc')  return new Date(a.dateAdded)-new Date(b.dateAdded);
    if (sortBy==='name-asc')  return (a.name||'').localeCompare(b.name||'');
    if (sortBy==='name-desc') return (b.name||'').localeCompare(a.name||'');
    if (sortBy==='status')    return (a.status||'').localeCompare(b.status||'');
    if (sortBy==='calls-desc')return (b.callCount||0)-(a.callCount||0);
    return 0;
  });
  return list;
}

function renderCards() {
  const container = document.getElementById('businesses-grid');
  const list = getFiltered();

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-icon">${businesses.length === 0 ? '📋' : '🔍'}</span>
      <h3>${businesses.length === 0 ? 'No businesses yet' : 'No results found'}</h3>
      <p>${businesses.length === 0 ? 'Add your first business to get started.' : 'Try a different search or filter.'}</p>
    </div>`;
    return;
  }

  container.innerHTML = list.map((biz, i) => buildCard(biz, i)).join('');
}

function buildCard(biz, i) {
  const cfg  = STATUS[biz.status] || STATUS.none;
  const date = fmt(biz.dateAdded);
  const hasNotes = !!(biz.notes && biz.notes.trim());

  const statusBtns = Object.entries(STATUS)
    .filter(([k]) => k !== 'none')
    .map(([k, v]) => `
      <button class="status-btn${biz.status===k?' active':''}" data-status="${k}"
        onclick="updateStatus('${biz.id}','${k}')" title="${v.label}">${v.emoji} ${v.label}</button>
    `).join('');

  const metaRows = [
    biz.phone   && `<div class="card-meta-row"><span class="meta-icon">📞</span><a href="tel:${esc(biz.phone)}">${esc(biz.phone)}</a></div>`,
    biz.address && `<div class="card-meta-row"><span class="meta-icon">📍</span><span>${esc(biz.address)}</span></div>`,
    biz.mapsUrl && `<div class="card-meta-row"><span class="meta-icon">🗺️</span><a href="${esc(biz.mapsUrl)}" target="_blank" rel="noopener">Open in Maps</a></div>`,
    biz.website && `<div class="card-meta-row"><span class="meta-icon">🌐</span><a href="${esc(biz.website)}" target="_blank" rel="noopener">${esc(biz.website.replace(/^https?:\/\//,''))}</a></div>`,
  ].filter(Boolean).join('');

  const delay = Math.min(i * 0.04, 0.4);

  return `
    <div class="business-card" data-status="${biz.status}" id="card-${biz.id}" style="animation-delay:${delay}s">
      <div class="card-top">
        <div style="flex:1; min-width:0;">
          <div class="card-name">${esc(biz.name || 'Unnamed Business')}</div>
          <span class="status-badge" style="color:${cfg.color}; background:${cfg.bg}; border-color:${cfg.border};">
            ${cfg.emoji} ${cfg.label}
          </span>
        </div>
        <div class="card-header-right">
          <button class="btn-icon" onclick="openAddModal(businesses.find(b=>b.id==='${biz.id}'))" title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="promptDelete('${biz.id}')" title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>

      <div class="card-meta">${metaRows || '<div class="card-meta-row" style="color:var(--text-3);font-size:0.8rem;">No contact info added</div>'}</div>

      <div class="status-btns">${statusBtns}</div>

      <div class="card-footer">
        <div class="card-date">Added ${date}</div>
        ${biz.callCount > 0 ? `<div class="call-badge">📞 ${biz.callCount} call${biz.callCount!==1?'s':''}</div>` : ''}
      </div>

      <div class="card-notes">
        <button class="notes-toggle-btn" id="nt-${biz.id}" onclick="toggleNotes('${biz.id}')">
          ${arrowDownSVG} ${hasNotes ? 'Notes 📝' : 'Add Notes'}
        </button>
        <div class="notes-body${hasNotes?' open':''}" id="nb-${biz.id}">
          <textarea class="notes-textarea" id="nta-${biz.id}"
            placeholder="e.g. Spoke to John (owner). Call back Thursday morning."
            onblur="saveNotes('${biz.id}')"
          >${esc(biz.notes||'')}</textarea>
          <div class="notes-save-row">
            <button class="btn btn-ghost btn-sm" onclick="saveNotes('${biz.id}')">💾 Save Notes</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateCount() {
  const list = getFiltered();
  document.getElementById('businesses-count').textContent =
    `Showing ${list.length} of ${businesses.length} business${businesses.length!==1?'es':''}`;
}

// ── EXPORT CSV ────────────────────────────────────────────
function exportCSV() {
  if (!businesses.length) { showToast('No businesses to export!', 'warning'); return; }
  const headers = ['Name','Phone','Address','Website','Status','Call Count','Notes','Maps URL','Date Added'];
  const rows = businesses.map(b => [
    b.name, b.phone, b.address, b.website,
    STATUS[b.status]?.label || b.status,
    b.callCount||0, b.notes, b.mapsUrl,
    fmt(b.dateAdded),
  ].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`));
  const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
    download:`calltrack-${new Date().toISOString().split('T')[0]}.csv`,
  });
  a.click(); URL.revokeObjectURL(a.href);
  showToast(`📊 Exported ${businesses.length} businesses!`, 'success');
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type='info') {
  const ct = document.getElementById('toast-container');
  const t  = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  ct.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(24px)'; t.style.transition='all 0.3s ease'; setTimeout(()=>t.remove(),300); }, 3200);
}

// ── UTILS ─────────────────────────────────────────────────
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function normalizePhone(p) { return p.replace(/\D/g,''); }
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

const arrowDownSVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const arrowUpSVG   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;

// Expose globals needed by inline onclick handlers
window.businesses    = businesses;
window.openAddModal  = openAddModal;
window.updateStatus  = updateStatus;
window.promptDelete  = promptDelete;
window.toggleNotes   = toggleNotes;
window.saveNotes     = saveNotes;
window.setFilter     = setFilter;
window.setView       = setView;
window.clearSearch   = clearSearch;

// Keep window.businesses array in sync after every save
function syncGlobals() { window.businesses = businesses; }
