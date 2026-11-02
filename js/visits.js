/**
 * APARTMENT VISITOR MANAGEMENT SYSTEM - VISITS MANAGEMENT
 * Full CRUD, SQL JOINs, Status Filters, Resident/Visitor Filters, Check-in, Checkout & Gate Pass
 */

let allVisits = [];
let allResidentsList = [];
let allVisitorsList = [];

document.addEventListener('DOMContentLoaded', () => {
  loadVisits();
  loadResidentsAndVisitorsOptions();
  initVisitsEventListeners();
});

// Load visits from MySQL REST API with active filters
async function loadVisits() {
  const tbody = document.getElementById('visits-tbody');
  const countEl = document.getElementById('visits-count');
  const emptyState = document.getElementById('visits-empty');

  const search = document.getElementById('search-visits')?.value || '';
  const status = document.getElementById('filter-status')?.value || 'All';
  const date = document.getElementById('filter-date')?.value || '';
  const residentId = document.getElementById('filter-resident')?.value || '';
  const visitorId = document.getElementById('filter-visitor')?.value || '';

  try {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (status && status !== 'All') params.append('status', status);
    if (date.trim()) params.append('date', date.trim());
    if (residentId.trim()) params.append('resident_id', residentId.trim());
    if (visitorId.trim()) params.append('visitor_id', visitorId.trim());

    const res = await fetch(`/api/visits?${params.toString()}`);
    const result = await res.json();

    if (!result.success) {
      Toast.error('Load Error', result.message);
      return;
    }

    allVisits = result.data;
    if (countEl) countEl.textContent = `${result.count} Visit Log${result.count === 1 ? '' : 's'}`;

    if (!allVisits || allVisits.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      renderVisitsTable(allVisits);
    }
  } catch (error) {
    console.error('Error loading visits:', error);
    Toast.error('Network Error', 'Failed to retrieve visit records');
  }
}

// Render Visits table
function renderVisitsTable(visits) {
  const tbody = document.getElementById('visits-tbody');
  if (!tbody) return;

  tbody.innerHTML = visits.map(v => {
    const isInside = v.status === 'Inside';
    const statusBadge = isInside
      ? `<span class="badge-status inside"><span class="badge-pulse"></span> Inside</span>`
      : `<span class="badge-status completed"><span class="badge-check"></span> Completed</span>`;

    const checkoutAction = isInside
      ? `<button class="btn btn-checkout btn-sm" onclick="handleVisitCheckout(${v.visit_id}, '${escapeHtml(v.visitor_name)}')">
           <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
           Check Out
         </button>`
      : `<button class="btn btn-secondary btn-sm" disabled style="opacity:0.6; cursor:default;">
           Checked Out
         </button>`;

    return `
      <tr>
        <td><strong>#${v.visit_id}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--color-emerald-deep);">${escapeHtml(v.visitor_name)}</div>
          <div style="font-size:0.78rem; color:var(--color-text-muted);">${escapeHtml(v.visitor_phone || 'No phone')}</div>
        </td>
        <td>
          <span class="flat-pill">${escapeHtml(v.flat_no)}</span>
          <div style="font-size:0.78rem; color:var(--color-text-muted); margin-top:2px;">${escapeHtml(v.resident_name)}</div>
        </td>
        <td>
          <span class="vehicle-pill">${escapeHtml(v.vehicle_no || 'Walk-in / None')}</span>
        </td>
        <td style="max-width: 160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${escapeHtml(v.purpose || 'General Visit')}
        </td>
        <td style="font-size:0.82rem; white-space:nowrap;">
          ${formatDateTime(v.entry_time)}
        </td>
        <td style="font-size:0.82rem; white-space:nowrap;">
          ${v.exit_time ? formatDateTime(v.exit_time) : '<span style="color:#D97706; font-style:italic;">Still Inside</span>'}
        </td>
        <td>${statusBadge}</td>
        <td>${checkoutAction}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" title="Print Gate Pass" onclick="openGatePassModal(${v.visit_id})">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect><polyline points="6 9 6 2 18 2 18 9"></polyline></svg>
            </button>
            <button class="btn-icon" title="Edit Visit" onclick="openEditVisitModal(${v.visit_id})">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn-icon delete" title="Delete Visit Record" onclick="handleDeleteVisit(${v.visit_id})">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Load dropdown data for residents and visitors from MySQL
async function loadResidentsAndVisitorsOptions() {
  try {
    const [resResp, visResp] = await Promise.all([
      fetch('/api/residents?sort=flat_no&order=ASC'),
      fetch('/api/visitors?sort=name&order=ASC')
    ]);

    const resData = await resResp.json();
    const visData = await visResp.json();

    if (resData.success) {
      allResidentsList = resData.data;
      // Populate filter dropdown
      const filterRes = document.getElementById('filter-resident');
      if (filterRes) {
        filterRes.innerHTML = '<option value="">All Residents / Flats</option>' +
          allResidentsList.map(r => `<option value="${r.resident_id}">Flat ${escapeHtml(r.flat_no)} - ${escapeHtml(r.name)}</option>`).join('');
      }
    }

    if (visData.success) {
      allVisitorsList = visData.data;
      // Populate filter dropdown
      const filterVis = document.getElementById('filter-visitor');
      if (filterVis) {
        filterVis.innerHTML = '<option value="">All Visitors</option>' +
          allVisitorsList.map(v => `<option value="${v.visitor_id}">${escapeHtml(v.name)}</option>`).join('');
      }
    }

    populateDropdown('add-visit-resident', allResidentsList, 'resident');
    populateDropdown('add-visit-visitor', allVisitorsList, 'visitor');
    populateDropdown('edit-visit-resident', allResidentsList, 'resident');
    populateDropdown('edit-visit-visitor', allVisitorsList, 'visitor');
  } catch (err) {
    console.error('Error fetching dropdown choices:', err);
    Toast.error('Load Error', 'Could not load residents/visitors for selection');
  }
}

function populateDropdown(selectId, items, type) {
  const select = document.getElementById(selectId);
  if (!select) return;

  if (type === 'resident') {
    select.innerHTML = '<option value="">-- Select Host Resident --</option>' +
      items.map(r => `<option value="${r.resident_id}">Flat ${escapeHtml(r.flat_no)} - ${escapeHtml(r.name)}</option>`).join('');
  } else {
    select.innerHTML = '<option value="">-- Select Registered Visitor --</option>' +
      items.map(v => `<option value="${v.visitor_id}">${escapeHtml(v.name)} (${escapeHtml(v.phone || 'No phone')})</option>`).join('');
  }
}

// Check out action
async function handleVisitCheckout(visitId, visitorName) {
  if (!confirm(`Confirm checkout for visitor "${visitorName}" (Visit #${visitId})?\n\nThis will stamp the current date and time as exit_time and change the status to Completed.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/visits/${visitId}/checkout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (data.success) {
      Toast.success('Visitor Checked Out', data.message);
      loadVisits();
    } else {
      Toast.error('Checkout Failed', data.message);
    }
  } catch (err) {
    console.error('Checkout error:', err);
    Toast.error('Network Error', 'Failed to check out visitor');
  }
}

// Open Gate Pass Modal
function openGatePassModal(visitId) {
  const visit = allVisits.find(v => v.visit_id === visitId);
  if (!visit) {
    Toast.error('Error', 'Visit details not found');
    return;
  }

  document.getElementById('pass-log-id').textContent = `PASS #${visit.visit_id}`;
  document.getElementById('pass-visitor-name').textContent = visit.visitor_name;
  document.getElementById('pass-visitor-phone').textContent = visit.visitor_phone || 'N/A';
  document.getElementById('pass-host-flat').textContent = `Flat ${visit.flat_no} (${visit.resident_name})`;
  document.getElementById('pass-vehicle-no').textContent = visit.vehicle_no || 'Walk-in / None';
  document.getElementById('pass-purpose').textContent = visit.purpose || 'General Visit';
  document.getElementById('pass-entry-time').textContent = formatDateTime(visit.entry_time);
  document.getElementById('pass-exit-time').textContent = visit.exit_time ? formatDateTime(visit.exit_time) : 'Active Inside';
  document.getElementById('pass-status').textContent = visit.status;

  openModal('modal-gate-pass');
}

// Export visits to CSV
function exportVisitsToCsv() {
  if (!allVisits || allVisits.length === 0) {
    Toast.warning('No Records', 'There are no visits to export in current view');
    return;
  }

  const headers = ['Visit ID', 'Visitor Name', 'Visitor Phone', 'Vehicle', 'Host Resident', 'Flat No', 'Purpose', 'Entry Time', 'Exit Time', 'Status'];
  const rows = allVisits.map(v => [
    v.visit_id,
    `"${(v.visitor_name || '').replace(/"/g, '""')}"`,
    `"${(v.visitor_phone || '').replace(/"/g, '""')}"`,
    `"${(v.vehicle_no || '').replace(/"/g, '""')}"`,
    `"${(v.resident_name || '').replace(/"/g, '""')}"`,
    `"${(v.flat_no || '').replace(/"/g, '""')}"`,
    `"${(v.purpose || '').replace(/"/g, '""')}"`,
    `"${v.entry_time || ''}"`,
    `"${v.exit_time || ''}"`,
    `"${v.status || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `greenwood_visits_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  Toast.success('Export Successful', `Exported ${allVisits.length} visit logs to CSV`);
}

// Initialize event listeners
function initVisitsEventListeners() {
  const searchInput = document.getElementById('search-visits');
  const statusFilter = document.getElementById('filter-status');
  const dateFilter = document.getElementById('filter-date');
  const residentFilter = document.getElementById('filter-resident');
  const visitorFilter = document.getElementById('filter-visitor');
  const btnClearFilters = document.getElementById('btn-clear-filters');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const addForm = document.getElementById('form-add-visit');
  const editForm = document.getElementById('form-edit-visit');
  const btnOpenAdd = document.getElementById('btn-open-record-visit');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadVisits, 300);
    });
  }

  if (statusFilter) statusFilter.addEventListener('change', loadVisits);
  if (dateFilter) dateFilter.addEventListener('change', loadVisits);
  if (residentFilter) residentFilter.addEventListener('change', loadVisits);
  if (visitorFilter) visitorFilter.addEventListener('change', loadVisits);

  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', exportVisitsToCsv);
  }

  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'All';
      if (dateFilter) dateFilter.value = '';
      if (residentFilter) residentFilter.value = '';
      if (visitorFilter) visitorFilter.value = '';
      loadVisits();
    });
  }

  // Open Record Visit Modal
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', () => {
      const entryInput = document.getElementById('add-visit-entry-time');
      if (entryInput) entryInput.value = getLocalDatetimeValue();
      openModal('modal-add-visit');
    });
  }

  // Add Visit Submit
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addForm);
      const payload = {
        resident_id: formData.get('resident_id'),
        visitor_id: formData.get('visitor_id'),
        entry_time: formData.get('entry_time'),
        status: 'Inside'
      };

      try {
        const res = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          Toast.success('Visit Recorded', data.message);
          addForm.reset();
          closeModal('modal-add-visit');
          loadVisits();
        } else {
          Toast.error('Registration Error', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not record visit');
      }
    });
  }

  // Edit Visit Submit
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(editForm);
      const visitId = formData.get('visit_id');
      const payload = {
        resident_id: formData.get('resident_id'),
        visitor_id: formData.get('visitor_id'),
        entry_time: formData.get('entry_time'),
        exit_time: formData.get('exit_time') || null,
        status: formData.get('status')
      };

      try {
        const res = await fetch(`/api/visits/${visitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          Toast.success('Visit Updated', data.message);
          closeModal('modal-edit-visit');
          loadVisits();
        } else {
          Toast.error('Update Failed', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not update visit');
      }
    });
  }
}

// Open Edit Visit Modal
async function openEditVisitModal(id) {
  try {
    const res = await fetch(`/api/visits/${id}`);
    const data = await res.json();

    if (!data.success) {
      Toast.error('Error', data.message);
      return;
    }

    const visit = data.data;
    document.getElementById('edit-visit-id').value = visit.visit_id;
    document.getElementById('edit-visit-resident').value = visit.resident_id;
    document.getElementById('edit-visit-visitor').value = visit.visitor_id;
    
    if (visit.entry_time) {
      document.getElementById('edit-visit-entry-time').value = toDatetimeLocalString(visit.entry_time);
    }
    if (visit.exit_time) {
      document.getElementById('edit-visit-exit-time').value = toDatetimeLocalString(visit.exit_time);
    } else {
      document.getElementById('edit-visit-exit-time').value = '';
    }

    document.getElementById('edit-visit-status').value = visit.status;

    openModal('modal-edit-visit');
  } catch (err) {
    Toast.error('Error', 'Could not fetch visit details for editing');
  }
}

// Delete Visit with confirmation
async function handleDeleteVisit(id) {
  if (!confirm(`Are you sure you want to delete visit record #${id}?\n\nThis will permanently remove this entry from the visits database.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/visits/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (data.success) {
      Toast.success('Deleted', data.message);
      loadVisits();
    } else {
      Toast.error('Delete Failed', data.message);
    }
  } catch (err) {
    console.error('Delete error:', err);
    Toast.error('Network Error', 'Failed to delete visit record');
  }
}

// Helpers
function formatDateTime(dtStr) {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return dtStr;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getLocalDatetimeValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDatetimeLocalString(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return '';
  return getLocalDatetimeValue(d);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
