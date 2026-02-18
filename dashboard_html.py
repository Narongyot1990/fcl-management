HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EIR Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      color: #222;
      min-height: 100vh;
    }

    /* ── Header ─────────────────────────────────────────────── */
    .header {
      background: #1b3a5c;
      color: #fff;
      padding: 0 20px;
      height: 52px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
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
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
      padding: 14px 20px 10px;
    }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px 12px;
    }
    .fg label {
      display: block;
      font-size: .68rem;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: .6px;
      margin-bottom: 3px;
    }
    .fg input, .fg select {
      width: 100%;
      padding: 6px 9px;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      font-size: .855rem;
      background: #fafafa;
      transition: border-color .15s;
    }
    .fg input:focus, .fg select:focus {
      outline: none;
      border-color: #2d6a9f;
      background: #fff;
    }
    .filter-actions {
      margin-top: 10px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
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
      padding: 5px 20px;
      font-size: .775rem;
      color: #888;
      background: #f8f8f8;
      border-bottom: 1px solid #eee;
    }

    /* ── Table ───────────────────────────────────────────────── */
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: .835rem;
      min-width: 900px;
    }
    thead {
      background: #1b3a5c;
      color: #fff;
      position: sticky;
      top: 52px;
      z-index: 50;
    }
    th {
      padding: 9px 12px;
      text-align: left;
      white-space: nowrap;
      font-weight: 500;
      font-size: .78rem;
      letter-spacing: .3px;
      text-transform: uppercase;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #ebebeb;
      white-space: nowrap;
    }
    tbody tr:hover td { background: #eef4fb; }
    tbody tr:nth-child(even) td { background: #f8fafb; }
    tbody tr:nth-child(even):hover td { background: #eef4fb; }

    .num-col { color: #bbb; font-size: .78rem; }
    .size-badge {
      display: inline-block;
      background: #dde8f8;
      color: #1b3a5c;
      padding: 1px 8px;
      border-radius: 4px;
      font-size: .78rem;
      font-weight: 600;
    }
    .mono { font-family: 'Courier New', monospace; font-size: .82rem; }
    .muted { color: #aaa; font-size: .78rem; }

    .empty-row td {
      text-align: center;
      color: #bbb;
      padding: 52px 20px;
      font-size: .9rem;
    }

    /* ── Loading spinner ─────────────────────────────────────── */
    .spinner {
      display: inline-block;
      width: 14px; height: 14px;
      border: 2px solid #ccc;
      border-top-color: #1b3a5c;
      border-radius: 50%;
      animation: spin .6s linear infinite;
      vertical-align: middle;
      margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Mobile ──────────────────────────────────────────────── */
    @media (max-width: 600px) {
      .header-title { font-size: .9rem; }
      .filters { padding: 10px 12px 8px; }
      .filter-grid { grid-template-columns: 1fr 1fr; }
      th, td { padding: 7px 9px; }
      .status-bar { padding: 4px 12px; }
    }
  </style>
</head>
<body>

<!-- Header -->
<header class="header">
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
    <div class="fg">
      <label>Date From</label>
      <input type="date" id="f-date-from" />
    </div>
    <div class="fg">
      <label>Date To</label>
      <input type="date" id="f-date-to" />
    </div>
    <div class="fg">
      <label>Shipper</label>
      <input type="text" id="f-shipper" placeholder="Search..." />
    </div>
    <div class="fg">
      <label>Booking No</label>
      <input type="text" id="f-booking" placeholder="Search..." />
    </div>
    <div class="fg">
      <label>Container No</label>
      <input type="text" id="f-container" placeholder="Search..." />
    </div>
    <div class="fg">
      <label>Size</label>
      <select id="f-size">
        <option value="">All sizes</option>
        <option>20GP</option>
        <option>40GP</option>
        <option>40HC</option>
        <option>45HC</option>
        <option>20RF</option>
        <option>40RF</option>
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

<!-- Table -->
<div class="table-scroll">
  <table>
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th>Shipper</th>
        <th>Booking No</th>
        <th>Size</th>
        <th>Container No</th>
        <th>Seal No</th>
        <th>Tare</th>
        <th>Truck</th>
        <th>Date / Time</th>
        <th>Saved At</th>
      </tr>
    </thead>
    <tbody id="tbody">
      <tr class="empty-row"><td colspan="10">Enter API key to load records</td></tr>
    </tbody>
  </table>
</div>

<script>
  // ── State ─────────────────────────────────────────────────────────────
  const KEY_STORAGE = 'eir_api_key';
  function getKey() { return localStorage.getItem(KEY_STORAGE) || ''; }
  function setKey(k) { localStorage.setItem(KEY_STORAGE, k); }

  // ── Elements ──────────────────────────────────────────────────────────
  const authBanner  = document.getElementById('auth-banner');
  const keyInput    = document.getElementById('key-input');
  const saveKeyBtn  = document.getElementById('save-key-btn');
  const keyToggle   = document.getElementById('key-toggle-btn');
  const statusBar   = document.getElementById('status-bar');
  const countBadge  = document.getElementById('count-badge');
  const tbody       = document.getElementById('tbody');
  const searchBtn   = document.getElementById('search-btn');
  const clearBtn    = document.getElementById('clear-btn');

  // ── Auth ──────────────────────────────────────────────────────────────
  keyToggle.addEventListener('click', () => {
    authBanner.style.display = authBanner.style.display === 'flex' ? 'none' : 'flex';
  });

  saveKeyBtn.addEventListener('click', () => {
    const k = keyInput.value.trim();
    if (!k) return;
    setKey(k);
    authBanner.style.display = 'none';
    keyInput.value = '';
    loadRecords();
  });

  keyInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveKeyBtn.click(); });

  // ── Filters ───────────────────────────────────────────────────────────
  function getFilters() {
    const v = id => document.getElementById(id).value.trim();
    return {
      date_from:      v('f-date-from'),
      date_to:        v('f-date-to'),
      shipper:        v('f-shipper'),
      booking_no:     v('f-booking'),
      container_no:   v('f-container'),
      container_size: v('f-size'),
    };
  }

  searchBtn.addEventListener('click', loadRecords);

  clearBtn.addEventListener('click', () => {
    ['f-date-from','f-date-to','f-shipper','f-booking','f-container'].forEach(
      id => document.getElementById(id).value = ''
    );
    document.getElementById('f-size').value = '';
    loadRecords();
  });

  // Enter key on any filter input triggers search
  document.querySelectorAll('.fg input, .fg select').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') loadRecords(); });
  });

  // ── Load Records ──────────────────────────────────────────────────────
  async function loadRecords() {
    const key = getKey();
    if (!key) {
      authBanner.style.display = 'flex';
      return;
    }

    setStatus('<span class="spinner"></span> Loading...');

    const params = new URLSearchParams();
    const filters = getFilters();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

    try {
      const res = await fetch('/api/records?' + params.toString(), {
        headers: { 'X-API-Key': key },
      });

      if (res.status === 401) {
        authBanner.style.display = 'flex';
        setStatus('Invalid API key — please re-enter');
        renderEmpty('Invalid API key');
        return;
      }

      if (!res.ok) {
        setStatus('Server error: ' + res.status);
        return;
      }

      const json = await res.json();
      render(json.records);
      countBadge.textContent = json.count + ' records';
      setStatus('Showing ' + json.count + ' record' + (json.count !== 1 ? 's' : ''));
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  function render(records) {
    if (!records || records.length === 0) {
      renderEmpty('No records found');
      return;
    }

    tbody.innerHTML = records.map((r, i) => `
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
      </tr>
    `).join('');
  }

  function renderEmpty(msg) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="10">${msg}</td></tr>`;
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
      const date = d.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });
      const time = d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
      return date + ' ' + time;
    } catch { return iso; }
  }

  function setStatus(html) {
    statusBar.innerHTML = html;
  }

  // ── Init ──────────────────────────────────────────────────────────────
  if (getKey()) {
    loadRecords();
  } else {
    authBanner.style.display = 'flex';
  }
</script>
</body>
</html>"""
