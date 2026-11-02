/**
 * APARTMENT VISITOR MANAGEMENT SYSTEM - DASHBOARD CONTROLLER
 * Real-time stats, recent visits table, and quick action modals
 */

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
  initDashboardQuickActions();
});

// Load real-time dashboard data from MySQL
async function loadDashboardStats() {
  const tableBody = document.getElementById('recent-visits-tbody');
  const emptyState = document.getElementById('recent-visits-empty');

  try {
    const response = await fetch('/api/stats');
    const result = await response.json();

    if (!result.success) {
      Toast.error('Data Error', result.message || 'Unable to fetch dashboard statistics');
      return;
    }

    const {
      totalResidents,
      totalVisitors,
      totalVisits,
      currentlyInside,
      todayVisits,
      recentVisits,
      purposeBreakdown
    } = result.data;

    // Update Counter Elements
    animateCounter('stat-total-residents', totalResidents);
    animateCounter('stat-total-visitors', totalVisitors);
    animateCounter('stat-total-visits', totalVisits);
    animateCounter('stat-inside-count', currentlyInside);
    animateCounter('stat-today-visits', todayVisits);

    // Render Recent Visits Table
    if (!recentVisits || recentVisits.length === 0) {
      if (tableBody) tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      renderRecentVisitsTable(recentVisits);
    }

    // Render Purpose Breakdown
    renderPurposeBreakdown(purposeBreakdown, totalVisits);
  } catch (error) {
    console.error('Failed to load dashboard statistics:', error);
    Toast.error('Connection Error', 'Could not reach server to retrieve real-time data.');
  }
}

// Render Purpose Breakdown Bars
function renderPurposeBreakdown(breakdown, totalVisits) {
  const container = document.getElementById('purpose-breakdown-list');
  if (!container) return;

  if (!breakdown || breakdown.length === 0 || totalVisits === 0) {
    container.innerHTML = '<p style="color:var(--color-text-muted); font-size:0.88rem;">No visit activity recorded yet.</p>';
    return;
  }

  container.innerHTML = breakdown.map(item => {
    const pct = totalVisits > 0 ? Math.round((item.count / totalVisits) * 100) : 0;
    return `
      <div class="purpose-bar-item">
        <div class="purpose-bar-meta">
          <span>${escapeHtml(item.purpose)}</span>
          <span>${item.count} visit${item.count === 1 ? '' : 's'} (${pct}%)</span>
        </div>
        <div class="purpose-progress-track">
          <div class="purpose-progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Counter animation
function animateCounter(id, targetValue) {
  const el = document.getElementById(id);
  if (!el) return;

  const target = parseInt(targetValue, 10) || 0;
  let current = 0;
  const duration = 600;
  const stepTime = 30;
  const totalSteps = duration / stepTime;
  const increment = target / totalSteps;

  if (target === 0) {
    el.textContent = '0';
    return;
  }

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      clearInterval(timer);
      el.textContent = target.toLocaleString();
    } else {
      el.textContent = Math.floor(current).toLocaleString();
    }
  }, stepTime);
}

// Render Recent Visits rows
function renderRecentVisitsTable(visits) {
  const tbody = document.getElementById('recent-visits-tbody');
  if (!tbody) return;

  tbody.innerHTML = visits.map(v => {
    const isInside = v.status === 'Inside';
    const statusBadge = isInside
      ? `<span class="badge-status inside"><span class="badge-pulse"></span> Inside</span>`
      : `<span class="badge-status completed"><span class="badge-check"></span> Completed</span>`;

    const checkoutBtn = isInside
      ? `<button class="btn btn-checkout btn-sm" onclick="handleDashboardCheckout(${v.visit_id}, '${escapeHtml(v.visitor_name)}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Check Out
        </button>`
      : `<span style="color:#9CA3AF; font-size:0.78rem;">Checked Out</span>`;

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
          <span class="vehicle-pill">${escapeHtml(v.vehicle_no || 'Walk-in / N/A')}</span>
        </td>
        <td style="max-width: 180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${escapeHtml(v.purpose || 'General Visit')}
        </td>
        <td style="font-size:0.82rem; white-space:nowrap;">
          ${formatDateTime(v.entry_time)}
        </td>
        <td>${statusBadge}</td>
        <td>${checkoutBtn}</td>
      </tr>
    `;
  }).join('');
}

// Dashboard Quick Checkout
async function handleDashboardCheckout(visitId, visitorName) {
  if (!confirm(`Confirm checkout for visitor "${visitorName}"? This will record the exit time and mark the visit as Completed.`)) {
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
      loadDashboardStats(); // Refresh table and counter numbers
    } else {
      Toast.error('Checkout Failed', data.message);
    }
  } catch (err) {
    console.error('Checkout error:', err);
    Toast.error('Network Error', 'Failed to check out visitor');
  }
}

// Quick Actions Modal logic on Dashboard
function initDashboardQuickActions() {
  // Quick Add Resident
  const quickResidentForm = document.getElementById('form-quick-add-resident');
  if (quickResidentForm) {
    quickResidentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(quickResidentForm);
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
          Toast.success('Resident Added', data.message);
          quickResidentForm.reset();
          closeModal('modal-quick-add-resident');
          loadDashboardStats();
        } else {
          Toast.error('Validation Error', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not create resident record');
      }
    });
  }

  // Quick Register Visitor
  const quickVisitorForm = document.getElementById('form-quick-add-visitor');
  if (quickVisitorForm) {
    quickVisitorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(quickVisitorForm);
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
          quickVisitorForm.reset();
          closeModal('modal-quick-add-visitor');
          loadDashboardStats();
        } else {
          Toast.error('Validation Error', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not register visitor');
      }
    });
  }

  // Quick Record Visit Modal: populate dropdowns on open
  const openRecordVisitBtn = document.getElementById('btn-open-quick-visit');
  if (openRecordVisitBtn) {
    openRecordVisitBtn.addEventListener('click', async () => {
      await populateResidentAndVisitorDropdowns('quick-visit-resident', 'quick-visit-visitor');
      // Set default entry time to current local datetime-local
      const entryTimeInput = document.getElementById('quick-visit-entry-time');
      if (entryTimeInput) {
        entryTimeInput.value = getLocalDatetimeValue();
      }
      openModal('modal-quick-record-visit');
    });
  }

  const quickVisitForm = document.getElementById('form-quick-record-visit');
  if (quickVisitForm) {
    quickVisitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(quickVisitForm);
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
          quickVisitForm.reset();
          closeModal('modal-quick-record-visit');
          loadDashboardStats();
        } else {
          Toast.error('Record Failed', data.errors ? data.errors.join('<br>') : data.message);
        }
      } catch (err) {
        Toast.error('Submission Failed', 'Could not record visit');
      }
    });
  }
}

// Populate resident and visitor dropdowns from MySQL
async function populateResidentAndVisitorDropdowns(residentSelectId, visitorSelectId) {
  const residentSelect = document.getElementById(residentSelectId);
  const visitorSelect = document.getElementById(visitorSelectId);

  try {
    const [resResp, visResp] = await Promise.all([
      fetch('/api/residents?sort=flat_no&order=ASC'),
      fetch('/api/visitors?sort=name&order=ASC')
    ]);

    const resData = await resResp.json();
    const visData = await visResp.json();

    if (residentSelect && resData.success) {
      residentSelect.innerHTML = '<option value="">-- Choose Host Resident --</option>' +
        resData.data.map(r => `<option value="${r.resident_id}">Flat ${escapeHtml(r.flat_no)} - ${escapeHtml(r.name)}</option>`).join('');
    }

    if (visitorSelect && visData.success) {
      visitorSelect.innerHTML = '<option value="">-- Choose Registered Visitor --</option>' +
        visData.data.map(v => `<option value="${v.visitor_id}">${escapeHtml(v.name)} (${escapeHtml(v.phone || 'No phone')})</option>`).join('');
    }
  } catch (err) {
    console.error('Error populating dropdowns:', err);
    Toast.error('Data Load Error', 'Could not load residents or visitors list for dropdowns');
  }
}

// Helper: Format MySQL datetime string to friendly readable format
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

// Helper: Format local date for <input type="datetime-local">
function getLocalDatetimeValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
