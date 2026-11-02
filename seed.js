const { pool, testConnection } = require('./db');

// Sample Residents
const sampleResidents = [
  { name: 'Dr. Arjun Mehta', flat_no: 'A-101', phone: '9876543210', email: 'arjun.mehta@residence.com' },
  { name: 'Priya Sharma', flat_no: 'A-204', phone: '9812345678', email: 'priya.sharma@residence.com' },
  { name: 'Rohan Verma', flat_no: 'B-302', phone: '9823456789', email: 'rohan.v@techcorp.io' },
  { name: 'Ananya Deshmukh', flat_no: 'B-405', phone: '9834567890', email: 'ananya.d@designstudio.in' },
  { name: 'Col. Vikram Malhotra', flat_no: 'C-102', phone: '9845678901', email: 'vikram.m@veterans.org' },
  { name: 'Sneha & Rahul Roy', flat_no: 'C-501', phone: '9856789012', email: 'rahul.roy@finserve.net' },
  { name: 'Kavita Sundaram', flat_no: 'D-201', phone: '9867890123', email: 'kavita.s@analytics.com' }
];

// Sample Visitors
const sampleVisitors = [
  { name: 'Ramesh Patel', phone: '9123456701', vehicle_no: 'KA-01-AB-1234', purpose: 'Package Delivery (Amazon)' },
  { name: 'Sunil Rao', phone: '9123456702', vehicle_no: 'KA-05-MH-8899', purpose: 'Air Conditioning Maintenance' },
  { name: 'Deepak Joshi', phone: '9123456703', vehicle_no: 'KA-03-TR-4567', purpose: 'Family Guest Visit' },
  { name: 'Amitabh Sen', phone: '9123456704', vehicle_no: 'DL-08-CC-9012', purpose: 'Interior Decor Consultation' },
  { name: 'Mohit Reddy', phone: '9123456705', vehicle_no: 'KA-51-EF-3344', purpose: 'Grocery Delivery (Blinkit)' },
  { name: 'Sameer Khan', phone: '9123456706', vehicle_no: 'MH-02-XY-7788', purpose: 'Personal Guest / Dinner' },
  { name: 'Vandana Kulkarni', phone: '9123456707', vehicle_no: 'KA-04-P-5521', purpose: 'Physiotherapy Session' }
];

async function seed() {
  console.log('====================================================');
  console.log('  APARTMENT VISITOR MANAGEMENT - SEED SCRIPT');
  console.log('====================================================');

  const dbStatus = await testConnection();
  if (!dbStatus.connected) {
    console.error(`✗ Cannot connect to database: ${dbStatus.error}`);
    process.exit(1);
  }

  console.log(`✓ Connected to ${dbStatus.database} on ${dbStatus.host}:${dbStatus.port}`);

  try {
    // 1. Seed Residents (Idempotent - checks if flat_no already exists)
    console.log('\n[1/3] Checking and seeding Residents...');
    const residentMap = new Map(); // flat_no -> resident_id

    for (const res of sampleResidents) {
      const [existing] = await pool.query(
        'SELECT resident_id, name, flat_no FROM residents WHERE flat_no = ?',
        [res.flat_no]
      );

      if (existing.length > 0) {
        residentMap.set(res.flat_no, existing[0].resident_id);
        console.log(`  - Preserved existing resident: ${existing[0].name} (${existing[0].flat_no}) [ID: ${existing[0].resident_id}]`);
      } else {
        const [result] = await pool.query(
          'INSERT INTO residents (name, flat_no, phone, email) VALUES (?, ?, ?, ?)',
          [res.name, res.flat_no, res.phone, res.email]
        );
        residentMap.set(res.flat_no, result.insertId);
        console.log(`  + Inserted new resident: ${res.name} (${res.flat_no}) [ID: ${result.insertId}]`);
      }
    }

    // 2. Seed Visitors (Idempotent - checks if phone already exists)
    console.log('\n[2/3] Checking and seeding Visitors...');
    const visitorMap = new Map(); // phone -> visitor_id

    for (const vis of sampleVisitors) {
      const [existing] = await pool.query(
        'SELECT visitor_id, name, phone FROM visitors WHERE phone = ?',
        [vis.phone]
      );

      if (existing.length > 0) {
        visitorMap.set(vis.phone, existing[0].visitor_id);
        console.log(`  - Preserved existing visitor: ${existing[0].name} (${vis.phone}) [ID: ${existing[0].visitor_id}]`);
      } else {
        const [result] = await pool.query(
          'INSERT INTO visitors (name, phone, vehicle_no, purpose) VALUES (?, ?, ?, ?)',
          [vis.name, vis.phone, vis.vehicle_no, vis.purpose]
        );
        visitorMap.set(vis.phone, result.insertId);
        console.log(`  + Inserted new visitor: ${vis.name} [ID: ${result.insertId}]`);
      }
    }

    // 3. Seed Visits with realistic timestamps and statuses
    console.log('\n[3/3] Checking and seeding Visits...');

    // Helper for formatting MySQL DATETIME
    const formatSqlDate = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

    const now = new Date();

    // Define planned sample visits
    const sampleVisitsConfig = [
      {
        residentFlat: 'A-101',
        visitorPhone: '9123456701', // Ramesh (Amazon)
        entryTime: new Date(now.getTime() - 25 * 60 * 1000), // 25 mins ago
        exitTime: null,
        status: 'Inside'
      },
      {
        residentFlat: 'B-302',
        visitorPhone: '9123456702', // Sunil Rao (AC Maintenance)
        entryTime: new Date(now.getTime() - 75 * 60 * 1000), // 1 hour 15 mins ago
        exitTime: null,
        status: 'Inside'
      },
      {
        residentFlat: 'C-501',
        visitorPhone: '9123456707', // Vandana (Physiotherapy)
        entryTime: new Date(now.getTime() - 40 * 60 * 1000), // 40 mins ago
        exitTime: null,
        status: 'Inside'
      },
      {
        residentFlat: 'A-204',
        visitorPhone: '9123456703', // Deepak Joshi (Family Guest)
        entryTime: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        exitTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        status: 'Completed'
      },
      {
        residentFlat: 'B-405',
        visitorPhone: '9123456704', // Amitabh Sen (Decor consultation)
        entryTime: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        exitTime: new Date(now.getTime() - 4.5 * 60 * 60 * 1000), // 4.5 hours ago
        status: 'Completed'
      },
      {
        residentFlat: 'D-201',
        visitorPhone: '9123456705', // Mohit Reddy (Grocery Blinkit)
        entryTime: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
        exitTime: new Date(now.getTime() - 2.8 * 60 * 60 * 1000), // 2.8 hours ago
        status: 'Completed'
      },
      {
        residentFlat: 'C-102',
        visitorPhone: '9123456706', // Sameer Khan (Personal Guest)
        entryTime: new Date(now.getTime() - 26 * 60 * 60 * 1000), // Yesterday
        exitTime: new Date(now.getTime() - 22 * 60 * 60 * 1000),
        status: 'Completed'
      }
    ];

    let insertedVisits = 0;
    for (const vConfig of sampleVisitsConfig) {
      const resId = residentMap.get(vConfig.residentFlat);
      const visId = visitorMap.get(vConfig.visitorPhone);

      if (!resId || !visId) {
        console.warn(`  ! Skipping visit due to missing mapped ID (Flat: ${vConfig.residentFlat}, Phone: ${vConfig.visitorPhone})`);
        continue;
      }

      // Check if similar visit already exists
      const [existingVisits] = await pool.query(
        'SELECT visit_id FROM visits WHERE resident_id = ? AND visitor_id = ? AND status = ?',
        [resId, visId, vConfig.status]
      );

      if (existingVisits.length > 0) {
        console.log(`  - Preserved existing visit record [ID: ${existingVisits[0].visit_id}] (Status: ${vConfig.status})`);
      } else {
        const [res] = await pool.query(
          'INSERT INTO visits (resident_id, visitor_id, entry_time, exit_time, status) VALUES (?, ?, ?, ?, ?)',
          [
            resId,
            visId,
            formatSqlDate(vConfig.entryTime),
            vConfig.exitTime ? formatSqlDate(vConfig.exitTime) : null,
            vConfig.status
          ]
        );
        insertedVisits++;
        console.log(`  + Inserted visit #${res.insertId} (Status: ${vConfig.status})`);
      }
    }

    // Print summary stats
    const [totRes] = await pool.query('SELECT COUNT(*) as c FROM residents');
    const [totVis] = await pool.query('SELECT COUNT(*) as c FROM visitors');
    const [totVst] = await pool.query('SELECT COUNT(*) as c FROM visits');
    const [totInside] = await pool.query("SELECT COUNT(*) as c FROM visits WHERE status = 'Inside'");

    console.log('\n====================================================');
    console.log('✓ SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`  Total Residents in DB:   ${totRes[0].c}`);
    console.log(`  Total Visitors in DB:    ${totVis[0].c}`);
    console.log(`  Total Visits in DB:      ${totVst[0].c}`);
    console.log(`  Visitors currently Inside: ${totInside[0].c}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await pool.end();
  }
}

seed();
