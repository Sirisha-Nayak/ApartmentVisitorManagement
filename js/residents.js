/**
 * APARTMENT VISITOR MANAGEMENT SYSTEM - RESIDENTS MANAGEMENT
 * Full CRUD, search, sorting, and foreign-key constraint protection
 */

let allResidents = [];

document.addEventListener('DOMContentLoaded', () => {
  loadResidents();
  initResidentsEventListeners();
});

// Load residents from MySQL REST API
async function loadResidents(searchTerm = '', sortField = 'name', sortOrder = 'ASC') {
  const tbody = document.getElementById('residents-tbody');
  const countEl = document.getElementById('residents-count');
  const emptyState = document.getElementById('residents-empty');

  try {
    const url = `/api/residents?search=${encodeURIComponent(searchTerm)}&sort=${encodeURIComponent(sortField)}&order=${encodeURIComponent(sortOrder)}`;
    const res = await fetch(url);
    const result = await res.json();

    if (!result.success) {
      Toast.error('Load Error', result.message);
      return;
    }

    allResidents = result.data;
    if (countEl) countEl.textContent = `${result.count} Resident${result.count === 1 ? '' : 's'}`;

    if (!allResidents || allResidents.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      renderResidentsTable(allResidents);
    }
  } catch (error) {
    console.error('Error loading residents:', error);
    Toast.error('Network Error', 'Failed to load residents from server');
  }
}

// Render Residents table
function renderResidentsTable(residents) {
  const tbody = document.getElementById('residents-tbody');
  if (!tbody) return;

  tbody.innerHTML = residents.map(r => `
    <tr>
      <td><strong>#${r.resident_id}</strong></td>
      <td>
        <div style="font-weight:600; color:var(--color-emerald-deep);">${escapeHtml(r.name)}</div>
      </td>
      <td>
        <span class="flat-pill">${escapeHtml(r.flat_no)}</span>
      </td>
      <td>
        <span style="font-family:monospace; color:var(--color-text-main); font-size:0.88rem;">${escapeHtml(r.phone || '—')}</span>
      </td>
      <td>
        <span style="color:var(--color-text-muted); font-size:0.86rem;">${escapeHtml(r.email || '—')}</span>
      </td>
      <td>
        <span class="badge-status ${r.total_visits > 0 ? 'completed' : ''}" style="background:#F3F4F6; color:#374151; border:1px solid #E5E7EB; cursor:pointer;" title="Click to view all visits for this resident" onclick="viewResidentVisits(${r.resident_id}, '${escapeHtml(r.name)}', '${escapeHtml(r.flat_no)}')">
          ${r.total_visits || 0} visit${r.total_visits === 1 ? '' : 's'}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-icon" title="View Hosted Visits" onclick="viewResidentVisits(${r.resident_id}, '${escapeHtml(r.name)}', '${escapeHtml(r.flat_no)}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="btn-icon" title="Edit Resident" onclick="openEditResidentModal(${r.resident_id})">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon delete" title="Delete Resident" onclick="handleDeleteResident(${r.resident_id}, '${escapeHtml(r.name)}', '${escapeHtml(r.flat_no)}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Event Listeners for search, sorting and forms
function initResidentsEventListeners() {
  const searchInput = document.getElementById('search-residents');
  const sortSelect = document.getElementById('sort-residents');
  const addForm = document.getElementById('form-add-resident');
  const editForm = document.getElementById('form-edit-resident');

  // Debounced search
  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const term = searchInput.value;
        const sortVal = sortSelect ? sortSelect.value : 'name';
        loadResidents(term, sortVal);
      }, 300);
    });
  }

  // Sort change
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const term = searchInput ? searchInput.value : '';
      loadResidents(term, sortSelect.value);
    });
  }

  // Add Resident Submit
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addForm);
      const payload = {
        name: formData.get('name'),
        flat_no: formData.get('flat_no'),
        phone: formData.get('phone'),
        email: formData.get('email')
      };

      try {
        const res = await fetch('/api/residents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          Toast.success('Resident Created', data.message);
          addForm.reset();
          closeModal('modal-add-resident');
          loadResidents();
        } else {
          Toast.error('Validation Error', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not save resident to database');
      }
    });
  }

  // Edit Resident Submit
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(editForm);
      const residentId = formData.get('resident_id');
      const payload = {
        name: formData.get('name'),
        flat_no: formData.get('flat_no'),
        phone: formData.get('phone'),
        email: formData.get('email')
      };

      try {
        const res = await fetch(`/api/residents/${residentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          Toast.success('Resident Updated', data.message);
          closeModal('modal-edit-resident');
          loadResidents();
        } else {
          Toast.error('Update Failed', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not update resident record');
      }
    });
  }
}

// Open Edit Resident Modal with prefilled data
async function openEditResidentModal(id) {
  try {
    const res = await fetch(`/api/residents/${id}`);
    const data = await res.json();

    if (!data.success) {
      Toast.error('Error', data.message);
      return;
    }

    const resident = data.data;
    document.getElementById('edit-resident-id').value = resident.resident_id;
    document.getElementById('edit-resident-name').value = resident.name;
    document.getElementById('edit-resident-flat').value = resident.flat_no;
    document.getElementById('edit-resident-phone').value = resident.phone || '';
    document.getElementById('edit-resident-email').value = resident.email || '';

    openModal('modal-edit-resident');
  } catch (err) {
    Toast.error('Error', 'Could not fetch resident details for editing');
  }
}

// Delete Resident with foreign key validation handling
async function handleDeleteResident(id, name, flatNo) {
  if (!confirm(`Are you sure you want to delete resident "${name}" (Flat ${flatNo})?\n\nNote: If this resident has any linked visit history records, deletion will be blocked to safeguard audit trails.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/residents/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (res.status === 409) {
      // Foreign Key Conflict Alert
      alert(`⚠️ DELETION BLOCKED (Foreign Key Constraint):\n\n${data.message}`);
      Toast.warning('Cannot Delete Resident', 'Resident has historical visit logs linked in database.');
      return;
    }

    if (data.success) {
      Toast.success('Deleted', data.message);
      loadResidents();
    } else {
      Toast.error('Delete Failed', data.message);
    }
  } catch (err) {
    console.error('Delete error:', err);
    Toast.error('Network Error', 'Failed to delete resident');
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

// Fetch and display visit history for a specific resident
async function viewResidentVisits(residentId, residentName, flatNo) {
  const modalTitle = document.getElementById('resident-visits-modal-title');
  const tbody = document.getElementById('resident-visits-table-body');
  const emptyState = document.getElementById('resident-visits-empty');

  if (modalTitle) {
    modalTitle.textContent = `Visits for Flat ${flatNo} (${residentName})`;
  }
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Loading visit logs from MySQL...</td></tr>';
  }

  openModal('modal-resident-visits');

  try {
    const res = await fetch(`/api/visits?resident_id=${residentId}`);
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
          <td><strong>${escapeHtml(v.visitor_name)}</strong></td>
          <td style="font-family:monospace;">${escapeHtml(v.visitor_phone || '—')}</td>
          <td><span class="vehicle-pill">${escapeHtml(v.vehicle_no || 'Walk-in / None')}</span></td>
          <td>${escapeHtml(v.purpose || 'General')}</td>
          <td style="font-size:0.82rem;">${formatDateTime(v.entry_time)}</td>
          <td style="font-size:0.82rem;">${v.exit_time ? formatDateTime(v.exit_time) : '<span style="color:#D97706;">Still Inside</span>'}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching resident visits:', err);
    Toast.error('Load Error', 'Failed to retrieve visits for this resident');
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

