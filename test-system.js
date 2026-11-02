const { pool, testConnection } = require('./db');
const http = require('http');

let app;
let server;
let baseUrl = '';

async function runTests() {
  console.log('====================================================');
  console.log('  APARTMENT VISITOR MANAGEMENT - SYSTEM VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Verify MySQL Connection
  console.log('[1/8] Verifying Database Connection...');
  const connStatus = await testConnection();
  assert(connStatus.connected === true, `Connected to database "${connStatus.database}" on port ${connStatus.port}`);

  // 2. Verify Tables
  console.log('\n[2/8] Verifying Database Tables & Schema...');
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  assert(tableNames.includes('residents'), 'Table "residents" exists in database');
  assert(tableNames.includes('visitors'), 'Table "visitors" exists in database');
  assert(tableNames.includes('visits'), 'Table "visits" exists in database');

  // Start internal test HTTP server
  app = require('./server');
  // Note: server.js already starts listening on PORT, but let's make requests to it
  const port = process.env.PORT || 3000;
  baseUrl = `http://localhost:${port}`;

  // Helper for HTTP requests
  async function api(path, options = {}) {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)).catch(async () => {
      // Node 18+ has native fetch
      return global.fetch(...args);
    });

    const res = await (global.fetch || fetch)(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const json = await res.json();
    return { status: res.status, data: json };
  }

  // 3. Test Residents CRUD
  console.log('\n[3/8] Testing Residents CRUD...');
  // CREATE
  const createRes = await api('/api/residents', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Verification Resident',
      flat_no: 'TEST-101',
      phone: '9999900001',
      email: 'test.resident@test.com'
    })
  });
  assert(createRes.status === 201 && createRes.data.success, 'Create Resident (POST /api/residents)');
  const testResidentId = createRes.data.data.resident_id;

  // READ
  const getRes = await api(`/api/residents/${testResidentId}`);
  assert(getRes.status === 200 && getRes.data.data.flat_no === 'TEST-101', 'Read Resident by ID (GET /api/residents/:id)');

  // UPDATE
  const updateRes = await api(`/api/residents/${testResidentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: 'Verification Resident Updated',
      flat_no: 'TEST-101B',
      phone: '9999900002',
      email: 'test.updated@test.com'
    })
  });
  assert(updateRes.status === 200 && updateRes.data.data.name === 'Verification Resident Updated', 'Update Resident (PUT /api/residents/:id)');

  // 4. Test Visitors CRUD
  console.log('\n[4/8] Testing Visitors CRUD...');
  // CREATE
  const createVis = await api('/api/visitors', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Verification Visitor',
      phone: '9999988881',
      vehicle_no: 'TEST-01-XX-99',
      purpose: 'System Verification Testing'
    })
  });
  assert(createVis.status === 201 && createVis.data.success, 'Create Visitor (POST /api/visitors)');
  const testVisitorId = createVis.data.data.visitor_id;

  // READ
  const getVis = await api(`/api/visitors/${testVisitorId}`);
  assert(getVis.status === 200 && getVis.data.data.name === 'Verification Visitor', 'Read Visitor by ID (GET /api/visitors/:id)');

  // UPDATE
  const updateVis = await api(`/api/visitors/${testVisitorId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: 'Verification Visitor Updated',
      phone: '9999988882',
      vehicle_no: 'TEST-01-XX-88',
      purpose: 'Verified Diagnostics'
    })
  });
  assert(updateVis.status === 200 && updateVis.data.data.vehicle_no === 'TEST-01-XX-88', 'Update Visitor (PUT /api/visitors/:id)');

  // 5. Test Visits CRUD & Check-In
  console.log('\n[5/8] Testing Visits CRUD & Check-In...');
  const createVisit = await api('/api/visits', {
    method: 'POST',
    body: JSON.stringify({
      resident_id: testResidentId,
      visitor_id: testVisitorId,
      status: 'Inside'
    })
  });
  assert(createVisit.status === 201 && createVisit.data.data.status === 'Inside', 'Record Visit Check-In (POST /api/visits)');
  const testVisitId = createVisit.data.data.visit_id;

  // READ with JOIN
  const getVisit = await api(`/api/visits/${testVisitId}`);
  assert(
    getVisit.status === 200 && 
    getVisit.data.data.resident_name === 'Verification Resident Updated' &&
    getVisit.data.data.visitor_name === 'Verification Visitor Updated',
    'Read Visit with relational SQL JOIN (GET /api/visits/:id)'
  );

  // 6. Test Foreign Key Constraint Protection
  console.log('\n[6/8] Testing Referential Integrity & Foreign Key Protection...');
  // Try deleting resident while visit exists
  const delResFail = await api(`/api/residents/${testResidentId}`, { method: 'DELETE' });
  assert(delResFail.status === 409 && delResFail.data.success === false, 'Blocked resident deletion due to linked visit record (409 Conflict)');

  // Try deleting visitor while visit exists
  const delVisFail = await api(`/api/visitors/${testVisitorId}`, { method: 'DELETE' });
  assert(delVisFail.status === 409 && delVisFail.data.success === false, 'Blocked visitor deletion due to linked visit record (409 Conflict)');

  // 7. Test Check-Out Workflow & Duplicate Checkout Prevention
  console.log('\n[7/8] Testing Checkout Workflow...');
  const checkoutRes = await api(`/api/visits/${testVisitId}/checkout`, { method: 'PUT' });
  assert(
    checkoutRes.status === 200 && 
    checkoutRes.data.data.status === 'Completed' &&
    checkoutRes.data.data.exit_time !== null,
    'Checkout active visitor (PUT /api/visits/:id/checkout sets exit_time and status=Completed)'
  );

  // Test repeat checkout prevention
  const repeatCheckout = await api(`/api/visits/${testVisitId}/checkout`, { method: 'PUT' });
  assert(repeatCheckout.status === 400 && repeatCheckout.data.success === false, 'Prevent duplicate checkout on completed visit (returns 400)');

  // Clean up test records
  console.log('\n[8/8] Testing Clean Deletions after Visit Removal...');
  const delVisit = await api(`/api/visits/${testVisitId}`, { method: 'DELETE' });
  assert(delVisit.status === 200 && delVisit.data.success, 'Delete Visit record (DELETE /api/visits/:id)');

  const delRes = await api(`/api/residents/${testResidentId}`, { method: 'DELETE' });
  assert(delRes.status === 200 && delRes.data.success, 'Delete Resident safely once unlinked (DELETE /api/residents/:id)');

  const delVis = await api(`/api/visitors/${testVisitorId}`, { method: 'DELETE' });
  assert(delVis.status === 200 && delVis.data.success, 'Delete Visitor safely once unlinked (DELETE /api/visitors/:id)');

  // Test Dashboard stats endpoint
  const statsRes = await api('/api/stats');
  assert(
    statsRes.status === 200 && 
    typeof statsRes.data.data.totalResidents === 'number' &&
    typeof statsRes.data.data.currentlyInside === 'number',
    'Real-time Dashboard statistics from MySQL (GET /api/stats)'
  );

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
