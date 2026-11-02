# Greenwood Residences — Apartment Visitor Management System

A complete, professional, modern, and fully functional **Apartment Visitor Management System** built with **HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js**, and a real **MySQL** database.

Designed with a premium gated-community visual identity inspired by luxury residential architecture, featuring emerald-green and warm-gold accents, real-time statistics, check-in/checkout workflows, and complete CRUD operations with relational foreign-key integrity.

---

## 🌟 Features

- **Executive Security Dashboard**:
  - Live aggregate statistics calculated directly from MySQL (`residents`, `visitors`, `visits`).
  - Active visitor tracking: real-time count of visitors currently *Inside* the premises.
  - Today's visits tracking.
  - Real-time recent security visits table with immediate single-click **Check Out** capability.
  - **Visitor Category Distribution**: Live analytics widget showing breakdown of visits by purpose (deliveries, guests, maintenance, etc.) with animated progress bars.
  - Quick action modals for recording visits, adding residents, and registering visitors directly from the dashboard.
- **Residents Management (Full CRUD)**:
  - Add new residents (Name, Flat Number, Phone, Email) with server-side validation.
  - View searchable and sortable table with total hosted visits count.
  - **Flat Visit History Modal**: One-click modal displaying all historical visits received by any flat.
  - Edit existing resident details in a prefilled modal.
  - Delete resident with **Foreign-Key Constraint Protection**: prevents deletion if historical visit records are attached, maintaining compliance and security audit trails.
- **Visitors Management (Full CRUD)**:
  - Register visitors (Name, Phone, Vehicle Number, Purpose) with validation.
  - Searchable and sortable directory showing real-time presence (*Inside Now* vs *Inactive*).
  - **Visitor Entry History Modal**: View all past entries and hosts visited by a specific visitor.
  - Edit visitor information.
  - Delete visitor with referential-integrity protection preserving security logs.
- **Visits Management & Gate Operations (Full CRUD)**:
  - Register new visits with dynamic host-resident and visitor dropdowns pulled live from MySQL.
  - Automatic timestamping to current date-time and initial status set to `Inside`.
  - Comprehensive SQL `JOIN` queries showing Visitor name, phone, vehicle, purpose, Resident name, and flat number.
  - Advanced multi-filter toolbar: filter by **Resident/Flat**, **Visitor**, **Status** (`All`, `Inside`, `Completed`), **Entry Date**, and global search.
  - **Check-Out Action**: sets `exit_time` to the current timestamp and updates status to `Completed`. Prevents repeat checkouts on already completed visits.
  - **Printable Gate Pass Slip**: Generates an official, printable Security Gate Pass slip with QR badge styling, authorization stamps, and timestamps.
  - **CSV Export**: One-click export of filtered or all visit logs for security audits and reporting.
  - Edit visit details and safe record deletion.
- **Security Staff Authentication Portal**:
  - Staff login with Supervisor account or quick 4-digit Guard PIN access.
  - Session verification and topbar live indicator.
- **Luxury UI/UX Design System**:
  - Deep emerald green (`#064E3B`), primary green (`#047857`), and warm gold (`#D4A72C`).
  - High-resolution architectural background imagery with contrast-preserving overlays.
  - Non-intrusive toast notifications for feedback.
  - Responsive layouts for desktops, tablets, and smartphones.
  - Dedicated print stylesheet for clean gate pass printouts (`@media print`).

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL Server 8.0 |
| **DB Driver** | `mysql2/promise` (Connection Pooling) |
| **Environment Config** | `dotenv` |
| **Communication** | REST APIs (`fetch` with JSON payloads) |

---

## 🗄️ Database Architecture

The system connects to the `apartment_visitor_db` database using the exact existing tables and relationships:

### 1. `residents`
- `resident_id` INT PRIMARY KEY AUTO_INCREMENT
- `name` VARCHAR(100) NOT NULL
- `flat_no` VARCHAR(20) NOT NULL
- `phone` VARCHAR(15)
- `email` VARCHAR(100)

### 2. `visitors`
- `visitor_id` INT PRIMARY KEY AUTO_INCREMENT
- `name` VARCHAR(100) NOT NULL
- `phone` VARCHAR(15)
- `vehicle_no` VARCHAR(30)
- `purpose` VARCHAR(150)

### 3. `visits`
- `visit_id` INT PRIMARY KEY AUTO_INCREMENT
- `resident_id` INT (FOREIGN KEY REFERENCES `residents.resident_id`)
- `visitor_id` INT (FOREIGN KEY REFERENCES `visitors.visitor_id`)
- `entry_time` DATETIME DEFAULT CURRENT_TIMESTAMP
- `exit_time` DATETIME NULL
- `status` VARCHAR(20) DEFAULT 'Inside'

---

## 📁 Project Structure

```
ApartmentVisitorManagement/
├── .env                  # Local MySQL credentials (git-ignored)
├── .env.example          # Template for environment configuration
├── .gitignore            # Git ignore file
├── package.json          # Node dependencies & run scripts
├── server.js             # Express application & API server entry point
├── db.js                 # MySQL connection pool & health diagnostics
├── seed.js               # Idempotent database sample data seeder
├── README.md             # Complete system documentation
├── index.html            # Executive Dashboard page
├── residents.html        # Residents Management CRUD page
├── visitors.html         # Visitors Directory CRUD page
├── visits.html           # Visits Log & Check-Out CRUD page
├── login.html            # Security Gate Access Login page
├── css/
│   └── style.css         # Complete emerald & gold design system
├── js/
│   ├── script.js         # Common utilities, live clock, toasts, modals
│   ├── dashboard.js      # Dashboard stats & recent visits controller
│   ├── residents.js      # Residents CRUD & constraint alerts
│   ├── visitors.js       # Visitors CRUD & presence badges
│   ├── visits.js         # Visits CRUD, filters & checkout actions
│   └── login.js          # Security staff login & session management
├── routes/
│   ├── residents.js      # /api/residents endpoints
│   ├── visitors.js       # /api/visitors endpoints
│   ├── visits.js         # /api/visits endpoints & checkout
│   ├── stats.js          # /api/stats real-time MySQL metrics
│   └── auth.js           # /api/auth login & verification
└── assets/
    └── images/
        ├── luxury-apartment.jpg   # High-resolution architectural background
        ├── community-banner.jpg   # Gated community hero banner
        ├── security-gate.jpg      # Gate exterior
        ├── logo.svg               # Luxury residence emblem
        └── pattern.svg            # Subtle architectural texture
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or v20.x+)
- **MySQL Server** (8.0+) running locally on port 3306.

### 2. Configure Environment (`.env`)
Create or edit your `.env` file in the project root:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root147369
DB_NAME=apartment_visitor_db
```

### 3. Install Dependencies
```bash
npm install
```

### 4. (Optional) Run Sample Data Seeder
Populate realistic residents, visitors, and active/completed visits:
```bash
npm run seed
```
> **Note**: The seed script is completely idempotent. It verifies existing records before inserting to prevent duplicate entries and never deletes or overwrites existing records.

### 5. Start the Server
```bash
npm start
```
Or with automatic restart in development mode:
```bash
npm run dev
```

### 6. Access the Application
Open your web browser and navigate to:
- **Dashboard**: [http://localhost:3000/](http://localhost:3000/) or [http://localhost:3000/index.html](http://localhost:3000/index.html)
- **Residents**: [http://localhost:3000/residents.html](http://localhost:3000/residents.html)
- **Visitors**: [http://localhost:3000/visitors.html](http://localhost:3000/visitors.html)
- **Visits**: [http://localhost:3000/visits.html](http://localhost:3000/visits.html)
- **Security Login**: [http://localhost:3000/login.html](http://localhost:3000/login.html)

---

## 🔐 Staff Login Credentials

The system includes preconfigured security personnel credentials for testing:

| Role | Login Method | Username / PIN | Password |
|---|---|---|---|
| **Gate Security Guard** | PIN Access | PIN: `5678` | N/A |
| **Security Supervisor** | Password Access | Username: `admin` | `password123` |
| **Security Supervisor** | PIN Access | PIN: `1234` | N/A |

*Quick autofill buttons are provided on the login page.*

---

## 📡 REST API Reference

### Health & Statistics
- `GET /api/health`: Database and server connection diagnostics.
- `GET /api/stats`: Real-time aggregate counts (`totalResidents`, `totalVisitors`, `totalVisits`, `currentlyInside`, `todayVisits`) and recent visits.

### Residents
- `GET /api/residents`: List residents (`?search=...&sort=name&order=ASC`).
- `GET /api/residents/:id`: Single resident details with total hosted visits count.
- `POST /api/residents`: Create resident `{ name, flat_no, phone, email }`.
- `PUT /api/residents/:id`: Update resident record.
- `DELETE /api/residents/:id`: Delete resident (Protected: returns `409 Conflict` if visits are linked).

### Visitors
- `GET /api/visitors`: List visitors with active presence flag (`?search=...&sort=name`).
- `GET /api/visitors/:id`: Single visitor details.
- `POST /api/visitors`: Register visitor `{ name, phone, vehicle_no, purpose }`.
- `PUT /api/visitors/:id`: Update visitor record.
- `DELETE /api/visitors/:id`: Delete visitor (Protected: returns `409 Conflict` if visits are linked).

### Visits
- `GET /api/visits`: Retrieve visits with SQL JOINs (`?search=...&status=Inside&date=YYYY-MM-DD`).
- `GET /api/visits/:id`: Single visit record with joined resident & visitor information.
- `POST /api/visits`: Record entry `{ resident_id, visitor_id, entry_time, status: 'Inside' }`.
- `PUT /api/visits/:id`: Update visit details.
- `PUT /api/visits/:id/checkout`: Check out visitor (sets `exit_time = NOW()`, `status = 'Completed'`).
- `DELETE /api/visits/:id`: Delete visit record.
