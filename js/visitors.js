/**
 * APARTMENT VISITOR MANAGEMENT SYSTEM - VISITORS MANAGEMENT
 * Full CRUD, search, sorting, and linked visits preservation
 */

let allVisitors = [];

document.addEventListener('DOMContentLoaded', () => {
  loadVisitors();
  initVisitorsEventListeners();
});

// Load visitors from MySQL REST API
async function loadVisitors(searchTerm = '', sortField = 'name', sortOrder = 'ASC') {
  const tbody = document.getElementById('visitors-tbody');
  const countEl = document.getElementById('visitors-count');
  const emptyState = document.getElementById('visitors-empty');

  try {
    const url = `/api/visitors?search=${encodeURIComponent(searchTerm)}&sort=${encodeURIComponent(sortField)}&order=${encodeURIComponent(sortOrder)}`;
    const res = await fetch(url);
    const result = await res.json();

    if (!result.success) {
      Toast.error('Load Error', result.message);
      return;
    }

    allVisitors = result.data;
    if (countEl) countEl.textContent = `${result.count} Visitor${result.count === 1 ? '' : 's'}`;

    if (!allVisitors || allVisitors.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      renderVisitorsTable(allVisitors);
    }
  } catch (error) {
    console.error('Error loading visitors:', error);
    Toast.error('Network Error', 'Failed to load visitors from server');
  }
}

// Render Visitors table
function renderVisitorsTable(visitors) {
  const tbody = document.getElementById('visitors-tbody');
  if (!tbody) return;

  tbody.innerHTML = visitors.map(v => {
    const isCurrentlyInside = parseInt(v.active_visits, 10) > 0;
    const activeBadge = isCurrentlyInside 
      ? `<span class="badge-status inside"><span class="badge-pulse"></span> Inside Now</span>` 
      : `<span style="color:#9CA3AF; font-size:0.78rem;">Inactive</span>`;

    return `
      <tr>
        <td><strong>#${v.visitor_id}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--color-emerald-deep);">${escapeHtml(v.name)}</div>
        </td>
        <td>
          <span style="font-family:monospace; color:var(--color-text-main); font-size:0.88rem;">${escapeHtml(v.phone || '—')}</span>
        </td>
        <td>
          <span class="vehicle-pill">${escapeHtml(v.vehicle_no || 'Walk-in / None')}</span>
        </td>
        <td>
          <span style="color:var(--color-text-muted); font-size:0.86rem;">${escapeHtml(v.purpose || 'General Visit')}</span>
        </td>
        <td>
          <span class="badge-status" style="background:#F3F4F6; color:#374151; border:1px solid #E5E7EB; cursor:pointer;" title="Click to view all visits for this visitor" onclick="viewVisitorVisits(${v.visitor_id}, '${escapeHtml(v.name)}')">
            ${v.total_visits || 0} visit${v.total_visits === 1 ? '' : 's'}
          </span>
        </td>
        <td>${activeBadge}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" title="View Visit History" onclick="viewVisitorVisits(${v.visitor_id}, '${escapeHtml(v.name)}')">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="btn-icon" title="Edit Visitor" onclick="openEditVisitorModal(${v.visitor_id})">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn-icon delete" title="Delete Visitor" onclick="handleDeleteVisitor(${v.visitor_id}, '${escapeHtml(v.name)}')">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Event Listeners for Visitors page
function initVisitorsEventListeners() {
  const searchInput = document.getElementById('search-visitors');
  const sortSelect = document.getElementById('sort-visitors');
  const addForm = document.getElementById('form-add-visitor');
  const editForm = document.getElementById('form-edit-visitor');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const term = searchInput.value;
        const sortVal = sortSelect ? sortSelect.value : 'name';
        loadVisitors(term, sortVal);
      }, 300);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const term = searchInput ? searchInput.value : '';
      loadVisitors(term, sortSelect.value);
    });
  }

  // Add Visitor
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addForm);
      const payload = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        vehicle_no: formData.get('vehicle_no'),
        purpose: formData.get('purpose')
      };

      try {
        const res = await fetch('/api/visitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          Toast.success('Visitor Registered', data.message);
          addForm.reset();
          closeModal('modal-add-visitor');
          loadVisitors();
        } else {
          Toast.error('Registration Error', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not register visitor');
      }
    });
  }

  // Edit Visitor
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(editForm);
      const visitorId = formData.get('visitor_id');
      const payload = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        vehicle_no: formData.get('vehicle_no'),
        purpose: formData.get('purpose')
      };

      try {
        const res = await fetch(`/api/visitors/${visitorId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          Toast.success('Visitor Updated', data.message);
          closeModal('modal-edit-visitor');
          loadVisitors();
        } else {
          Toast.error('Update Failed', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not update visitor details');
      }
    });
  }
}

// Open Edit Visitor Modal with prefilled data
async function openEditVisitorModal(id) {
  try {
    const res = await fetch(`/api/visitors/${id}`);
    const data = await res.json();

    if (!data.success) {
      Toast.error('Error', data.message);
      return;
    }

    const visitor = data.data;
    document.getElementById('edit-visitor-id').value = visitor.visitor_id;
    document.getElementById('edit-visitor-name').value = visitor.name;
    document.getElementById('edit-visitor-phone').value = visitor.phone || '';
    document.getElementById('edit-visitor-vehicle').value = visitor.vehicle_no || '';
    document.getElementById('edit-visitor-purpose').value = visitor.purpose || '';

    openModal('modal-edit-visitor');
  } catch (err) {
    Toast.error('Error', 'Could not fetch visitor details for editing');
  }
}

// Delete Visitor with linked records validation
async function handleDeleteVisitor(id, name) {
  if (!confirm(`Are you sure you want to delete visitor "${name}"?\n\nNote: If this visitor has recorded visits in the security history, deletion will be blocked to maintain the security audit trail.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/visitors/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (res.status === 409) {
      // Linked visits block
      alert(`⚠️ DELETION PREVENTED (Security History Protected):\n\n${data.message}`);
      Toast.warning('Cannot Delete Visitor', 'Visitor has linked visit records in database.');
      return;
    }

    if (data.success) {
      Toast.success('Deleted', data.message);
      loadVisitors();
    } else {
      Toast.error('Delete Failed', data.message);
    }
  } catch (err) {
    console.error('Delete error:', err);
    Toast.error('Network Error', 'Failed to delete visitor record');
  }
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

// Fetch and display visit history for a specific visitor
async function viewVisitorVisits(visitorId, visitorName) {
  const modalTitle = document.getElementById('visitor-visits-modal-title');
  const tbody = document.getElementById('visitor-visits-table-body');
  const emptyState = document.getElementById('visitor-visits-empty');

  if (modalTitle) {
    modalTitle.textContent = `Entry History for ${visitorName}`;
  }
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Loading visit logs from MySQL...</td></tr>';
  }

  openModal('modal-visitor-visits');

  try {
    const res = await fetch(`/api/visits?visitor_id=${visitorId}`);
    const data = await res.json();

    if (!data.success || !data.data || data.data.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = data.data.map(v => {
      const isInside = v.status === 'Inside';
      const statusBadge = isInside
        ? `<span class="badge-status inside"><span class="badge-pulse"></span> Inside</span>`
        : `<span class="badge-status completed"><span class="badge-check"></span> Completed</span>`;

      return `
        <tr>
          <td><strong>#${v.visit_id}</strong></td>
          <td><strong>${escapeHtml(v.resident_name)}</strong></td>
          <td><span class="flat-pill">${escapeHtml(v.flat_no)}</span></td>
          <td><span class="vehicle-pill">${escapeHtml(v.vehicle_no || 'Walk-in / None')}</span></td>
          <td>${escapeHtml(v.purpose || 'General')}</td>
          <td style="font-size:0.82rem;">${formatDateTime(v.entry_time)}</td>
          <td style="font-size:0.82rem;">${v.exit_time ? formatDateTime(v.exit_time) : '<span style="color:#D97706;">Still Inside</span>'}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching visitor visits:', err);
    Toast.error('Load Error', 'Failed to retrieve visits for this visitor');
  }
}

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

