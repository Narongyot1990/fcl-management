HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EIR Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* Flex-column full-height layout so table area scrolls independently */
    html, body {
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      color: #222;
    }
    body { display: flex; flex-direction: column; }

    /* ── Header ─────────────────────────────────────────────── */
    .app-header {
      flex-shrink: 0;
      background: #1b3a5c;
      color: #fff;
      padding: 0 20px;
      height: 52px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 100;
      box-shadow: 0 2px 6px rgba(0,0,0,.25);
    }
    .header-title { font-size: 1rem; font-weight: 600; letter-spacing: .3px; }
    .header-badge {
      background: #2d6a9f;
      font-size: .72rem;
      padding: 2px 10px;
      border-radius: 20px;
      font-weight: 500;
    }
    .header-spacer { flex: 1; }
    .btn-icon {
      background: transparent;
      border: 1px solid rgba(255,255,255,.35);
      color: #fff;
      padding: 4px 12px;
      border-radius: 5px;
      cursor: pointer;
      font-size: .8rem;
    }
    .btn-icon:hover { background: rgba(255,255,255,.12); }

    /* ── Auth Banner ─────────────────────────────────────────── */
    #auth-banner {
      flex-shrink: 0;
      background: #fffbe6;
      border-bottom: 2px solid #f0c30f;
      padding: 10px 20px;
      display: none;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    #auth-banner span { font-size: .875rem; color: #555; }
    #key-input {
      flex: 1;
      min-width: 220px;
      max-width: 380px;
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: .875rem;
    }
    #save-key-btn {
      padding: 6px 18px;
      background: #1b3a5c;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: .875rem;
    }

    /* ── Filters ─────────────────────────────────────────────── */
    .filters {
      flex-shrink: 0;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 20px 10px;
    }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 7px 12px;
    }
    .fg label {
      display: block;
      font-size: .66rem;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: .6px;
      margin-bottom: 3px;
    }
    .fg input, .fg select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      font-size: .845rem;
      background: #fafafa;
    }
    .fg input:focus, .fg select:focus {
      outline: none;
      border-color: #2d6a9f;
      background: #fff;
    }
    .filter-actions { margin-top: 9px; display: flex; gap: 8px; }
    .btn-primary {
      padding: 7px 22px;
      background: #1b3a5c;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: .875rem;
      font-weight: 500;
    }
    .btn-primary:hover { background: #254e7f; }
    .btn-ghost {
      padding: 7px 16px;
      background: #fff;
      color: #555;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      cursor: pointer;
      font-size: .875rem;
    }
    .btn-ghost:hover { background: #f5f5f5; }

    /* ── Status bar ──────────────────────────────────────────── */
    .status-bar {
      flex-shrink: 0;
      padding: 4px 20px;
      font-size: .76rem;
      color: #888;
      background: #f8f8f8;
      border-bottom: 1px solid #eee;
    }

    /* ── Table container — takes remaining height, scrolls both axes ── */
    .table-wrap {
      flex: 1;
      overflow: auto;
      min-height: 0;        /* critical for flex children */
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: .835rem;
      min-width: 980px;
    }

    /* Sticky header: put on <th>, not <thead> */
    thead th {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #1b3a5c;
      color: #fff;
      padding: 9px 11px;
      text-align: left;
      white-space: nowrap;
      font-weight: 500;
      font-size: .76rem;
      letter-spacing: .3px;
      text-transform: uppercase;
    }

    td {
      padding: 7px 11px;
      border-bottom: 1px solid #ebebeb;
      white-space: nowrap;
    }
    tbody tr:hover td { background: #eef4fb; }
    tbody tr:nth-child(even) td { background: #f8fafb; }
    tbody tr:nth-child(even):hover td { background: #eef4fb; }

    .num-col { color: #bbb; font-size: .76rem; }
    .size-badge {
      display: inline-block;
      background: #dde8f8;
      color: #1b3a5c;
      padding: 1px 7px;
      border-radius: 4px;
      font-size: .76rem;
      font-weight: 600;
    }
    .mono { font-family: 'Courier New', monospace; font-size: .81rem; }
    .muted { color: #aaa; font-size: .76rem; }

    .empty-row td {
      text-align: center;
      color: #bbb;
      padding: 52px 20px;
      font-size: .9rem;
    }

    /* ── Action buttons ──────────────────────────────────────── */
    .act-btn {
      padding: 3px 9px;
      border-radius: 4px;
      border: 1px solid;
      cursor: pointer;
      font-size: .73rem;
      margin-right: 3px;
      white-space: nowrap;
    }
    .act-edit { background: #f0f4f8; border-color: #aab; color: #336; }
    .act-edit:hover { background: #e0e8f4; }
    .act-del  { background: #fff0f0; border-color: #e99; color: #c33; }
    .act-del:hover  { background: #ffe0e0; }

    /* ── Loading spinner ─────────────────────────────────────── */
    .spinner {
      display: inline-block;
      width: 12px; height: 12px;
      border: 2px solid #ccc;
      border-top-color: #1b3a5c;
      border-radius: 50%;
      animation: spin .6s linear infinite;
      vertical-align: middle;
      margin-right: 5px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Edit Modal ──────────────────────────────────────────── */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 500;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.open { display: flex; }
    .modal-box {
      background: #fff;
      border-radius: 8px;
      padding: 20px 24px 22px;
      width: 440px;
      max-width: 96vw;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,.22);
    }
    .modal-title {
      font-size: .92rem;
      font-weight: 600;
      color: #1b3a5c;
      margin-bottom: 14px;
    }
    .modal-grid {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 7px 10px;
      align-items: center;
    }
    .modal-grid label {
      font-size: .72rem;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .modal-grid input,
    .modal-grid select {
      width: 100%;
      padding: 6px 9px;
      border: 1px solid #d0d0d0;
      border-radius: 5px;
      font-size: .855rem;
    }
    .modal-grid input:focus, .modal-grid select:focus {
      outline: none;
      border-color: #2d6a9f;
    }
    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 18px;
    }

    /* ── Mobile ──────────────────────────────────────────────── */
    @media (max-width: 600px) {
      .app-header { padding: 0 12px; }
      .header-title { font-size: .88rem; }
      .filters { padding: 10px 12px 8px; }
      .filter-grid { grid-template-columns: 1fr 1fr; }
      td, thead th { padding: 6px 8px; }
      .status-bar { padding: 4px 12px; }
    }
  </style>
</head>
<body>

<!-- App Header -->
<header class="app-header">
  <span class="header-title">EIR Records</span>
  <span class="header-badge" id="count-badge">—</span>
  <span class="header-spacer"></span>
  <button class="btn-icon" id="key-toggle-btn">API Key</button>
</header>

<!-- Auth Banner -->
<div id="auth-banner">
  <span>Enter your API key to load records:</span>
  <input id="key-input" type="password" placeholder="X-API-Key..." autocomplete="current-password" />
  <button id="save-key-btn">Confirm</button>
</div>

<!-- Filters -->
<div class="filters">
  <div class="filter-grid">
    <div class="fg"><label>Date From</label><input type="date" id="f-date-from" /></div>
    <div class="fg"><label>Date To</label><input type="date" id="f-date-to" /></div>
    <div class="fg"><label>Shipper</label><input type="text" id="f-shipper" placeholder="Search..." /></div>
    <div class="fg"><label>Booking No</label><input type="text" id="f-booking" placeholder="Search..." /></div>
    <div class="fg"><label>Container No</label><input type="text" id="f-container" placeholder="Search..." /></div>
    <div class="fg">
      <label>Size</label>
      <select id="f-size">
        <option value="">All</option>
        <option>20GP</option><option>40GP</option><option>40HC</option>
        <option>45HC</option><option>20RF</option><option>40RF</option>
      </select>
    </div>
  </div>
  <div class="filter-actions">
    <button class="btn-primary" id="search-btn">Search</button>
    <button class="btn-ghost" id="clear-btn">Clear</button>
  </div>
</div>

<!-- Status bar -->
<div class="status-bar" id="status-bar">Ready</div>

<!-- Scrollable Table -->
<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th>Shipper</th>
        <th>Booking No</th>
        <th>Size</th>
        <th>Container No</th>
        <th>Seal</th>
        <th>Tare</th>
        <th>Truck</th>
        <th>Date / Time</th>
        <th>Saved At</th>
        <th style="width:100px">Actions</th>
      </tr>
    </thead>
    <tbody id="tbody">
      <tr class="empty-row"><td colspan="11">Enter API key to load records</td></tr>
    </tbody>
  </table>
</div>

<!-- Edit Modal -->
<div class="modal-overlay" id="edit-modal">
  <div class="modal-box">
    <div class="modal-title">Edit Record</div>
    <input type="hidden" id="edit-id" />
    <div class="modal-grid">
      <label>Shipper</label>    <input id="e-shipper"   type="text" />
      <label>Booking</label>    <input id="e-booking"   type="text" />
      <label>Size</label>
      <select id="e-size">
        <option value="">—</option>
        <option>20GP</option><option>40GP</option><option>40HC</option>
        <option>45HC</option><option>20RF</option><option>40RF</option>
      </select>
      <label>Container</label>  <input id="e-container" type="text" />
      <label>Seal</label>       <input id="e-seal"      type="text" />
      <label>Tare</label>       <input id="e-tare"      type="text" />
      <label>Truck</label>      <input id="e-truck"     type="text" />
      <label>Date/Time</label>  <input id="e-datetime"  type="text" placeholder="dd/mm/yyyy H:mm" />
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="cancel-edit-btn">Cancel</button>
      <button class="btn-primary" id="save-edit-btn">Save</button>
    </div>
  </div>
</div>

<script>
  // ── State ─────────────────────────────────────────────────────────────
  const KEY_STORAGE = 'eir_api_key';
  function getKey() { return localStorage.getItem(KEY_STORAGE) || ''; }
  function setKey(k) { localStorage.setItem(KEY_STORAGE, k); }

  let recordsMap = {};   // { _id: record } for edit lookup

  // ── Elements ──────────────────────────────────────────────────────────
  const authBanner = document.getElementById('auth-banner');
  const keyInput   = document.getElementById('key-input');
  const statusBar  = document.getElementById('status-bar');
  const countBadge = document.getElementById('count-badge');
  const tbody      = document.getElementById('tbody');
  const editModal  = document.getElementById('edit-modal');

  // ── Auth ──────────────────────────────────────────────────────────────
  document.getElementById('key-toggle-btn').addEventListener('click', () => {
    authBanner.style.display = authBanner.style.display === 'flex' ? 'none' : 'flex';
  });

  document.getElementById('save-key-btn').addEventListener('click', () => {
    const k = keyInput.value.trim();
    if (!k) return;
    setKey(k);
    authBanner.style.display = 'none';
    keyInput.value = '';
    loadRecords();
  });

  keyInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('save-key-btn').click(); });

  // ── Filters ───────────────────────────────────────────────────────────
  document.getElementById('search-btn').addEventListener('click', loadRecords);

  document.getElementById('clear-btn').addEventListener('click', () => {
    ['f-date-from','f-date-to','f-shipper','f-booking','f-container'].forEach(
      id => document.getElementById(id).value = ''
    );
    document.getElementById('f-size').value = '';
    loadRecords();
  });

  document.querySelectorAll('.fg input, .fg select').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') loadRecords(); });
  });

  // ── Load Records ──────────────────────────────────────────────────────
  async function loadRecords() {
    const key = getKey();
    if (!key) { authBanner.style.display = 'flex'; return; }

    setStatus('<span class="spinner"></span> Loading...');

    const v = id => document.getElementById(id).value.trim();
    const params = new URLSearchParams();
    if (v('f-date-from'))  params.set('date_from',      v('f-date-from'));
    if (v('f-date-to'))    params.set('date_to',         v('f-date-to'));
    if (v('f-shipper'))    params.set('shipper',          v('f-shipper'));
    if (v('f-booking'))    params.set('booking_no',       v('f-booking'));
    if (v('f-container'))  params.set('container_no',     v('f-container'));
    if (v('f-size'))       params.set('container_size',   v('f-size'));

    try {
      const res = await fetch('/api/records?' + params, { headers: { 'X-API-Key': key } });

      if (res.status === 401) {
        authBanner.style.display = 'flex';
        setStatus('Invalid API key');
        renderEmpty('Invalid API key');
        return;
      }
      if (!res.ok) { setStatus('Server error: ' + res.status); return; }

      const json = await res.json();
      render(json.records);
      countBadge.textContent = json.count + ' records';
      setStatus('Showing ' + json.count + (json.count !== 1 ? ' records' : ' record'));
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  }

  // ── Render Table ──────────────────────────────────────────────────────
  function render(records) {
    recordsMap = {};
    if (!records || records.length === 0) { renderEmpty('No records found'); return; }

    tbody.innerHTML = records.map((r, i) => {
      recordsMap[r._id] = r;
      return `
        <tr>
          <td class="num-col">${i + 1}</td>
          <td>${esc(r.shipper)}</td>
          <td class="mono">${esc(r.booking_no)}</td>
          <td><span class="size-badge">${esc(r.container_size)}</span></td>
          <td class="mono">${esc(r.container_no)}</td>
          <td>${esc(r.seal_no)}</td>
          <td>${esc(r.tare_weight)}</td>
          <td>${esc(r.truck_plate)}</td>
          <td>${esc(r.date_time)}</td>
          <td class="muted">${fmtDate(r.created_at)}</td>
          <td>
            <button class="act-btn act-edit" onclick="openEdit('${r._id}')">Edit</button>
            <button class="act-btn act-del"  onclick="delRecord('${r._id}')">Delete</button>
          </td>
        </tr>`;
    }).join('');
  }

  function renderEmpty(msg) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${msg}</td></tr>`;
    countBadge.textContent = '—';
  }

  function esc(v) {
    if (v == null || v === '') return '<span style="color:#ccc">—</span>';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' })
           + ' ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    } catch { return iso; }
  }

  function setStatus(html) { statusBar.innerHTML = html; }

  // ── Edit Modal ────────────────────────────────────────────────────────
  function openEdit(id) {
    const r = recordsMap[id];
    if (!r) return;
    document.getElementById('edit-id').value        = id;
    document.getElementById('e-shipper').value      = r.shipper        || '';
    document.getElementById('e-booking').value      = r.booking_no     || '';
    document.getElementById('e-size').value         = r.container_size || '';
    document.getElementById('e-container').value    = r.container_no   || '';
    document.getElementById('e-seal').value         = r.seal_no        || '';
    document.getElementById('e-tare').value         = r.tare_weight    || '';
    document.getElementById('e-truck').value        = r.truck_plate    || '';
    document.getElementById('e-datetime').value     = r.date_time      || '';
    editModal.classList.add('open');
  }

  function closeModal() { editModal.classList.remove('open'); }

  document.getElementById('cancel-edit-btn').addEventListener('click', closeModal);

  // Close on overlay click
  editModal.addEventListener('click', e => { if (e.target === editModal) closeModal(); });

  document.getElementById('save-edit-btn').addEventListener('click', async () => {
    const id  = document.getElementById('edit-id').value;
    const key = getKey();
    const data = {
      shipper:        document.getElementById('e-shipper').value,
      booking_no:     document.getElementById('e-booking').value,
      container_size: document.getElementById('e-size').value,
      container_no:   document.getElementById('e-container').value,
      seal_no:        document.getElementById('e-seal').value,
      tare_weight:    document.getElementById('e-tare').value,
      truck_plate:    document.getElementById('e-truck').value,
      date_time:      document.getElementById('e-datetime').value,
    };
    try {
      const res = await fetch('/api/records/' + id, {
        method: 'PUT',
        headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) { closeModal(); loadRecords(); }
      else { alert('Save failed (' + res.status + ')'); }
    } catch (e) { alert('Error: ' + e.message); }
  });

  // ── Delete ────────────────────────────────────────────────────────────
  async function delRecord(id) {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    const key = getKey();
    try {
      const res = await fetch('/api/records/' + id, {
        method: 'DELETE',
        headers: { 'X-API-Key': key },
      });
      if (res.ok) loadRecords();
      else alert('Delete failed (' + res.status + ')');
    } catch (e) { alert('Error: ' + e.message); }
  }

  // ── Init ──────────────────────────────────────────────────────────────
  if (getKey()) loadRecords();
  else authBanner.style.display = 'flex';
</script>
</body>
</html>"""
