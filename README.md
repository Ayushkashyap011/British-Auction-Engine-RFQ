# British Auction Engine in RFQ System
> **Full Stack Engineering Assessment | GoComet**  
> A production-ready Request for Quotation (RFQ) reverse-auction platform featuring **British Auction anti-sniping soft extensions**, **forced close hard ceilings**, **real-time carrier ranking ($L_1, L_2, \dots$)**, and **clean enterprise procurement UX**.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Language-Python%203.11-blue?style=flat-square&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/Frontend-React.js%2018-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-4479A1?style=flat-square&logo=mysql)](https://mysql.com)
[![SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy%202.0-D71F00?style=flat-square&logo=sqlalchemy)](https://www.sqlalchemy.org)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)

---

## 1. Overview & Business Problem

In logistics, ocean freight, and air freight procurement, a **Request for Quotation (RFQ)** invites vetted carriers and freight forwarders to quote competitive rates for moving cargo. Traditional reverse auctions frequently suffer from **Bid Sniping** (opportunistic quotes submitted in the dying seconds), leaving competing carriers zero window to counter-bid and costing enterprise buyers better clearing prices.

### What is a British Auction?
In an RFQ reverse-auction context, a **British Auction** provides:
1. **Dynamic Reverse Bidding**: Quotes are evaluated by Total Cost ($\text{Freight} + \text{Origin} + \text{Destination Charges}$). Suppliers continuously lower their quotes to compete for the **$L_1$** (lowest price) position.
2. **Automated Soft Extensions**: If qualifying bidding activity occurs inside a configurable **Trigger Window ($X$ mins)** before close, the auction automatically extends by **$Y$ mins**.
3. **Forced Close Hard Ceiling**: No extension can ever push the close time beyond the hard `Forced Bid Close Time`.
4. **Unique Carrier Active Bidding**: Each carrier has their best active quote highlighted on the leaderboard, with continuous counter-bidding support.
5. **Standardized Auto-Generated IDs**: Tracking codes automatically generated in standard nomenclature (`RFQ-YYYY-ORG-DST-XXXX`).
6. **Complete Audit Trail**: Every bid, price revision, rank change, extension, and clamping event is recorded with an explicit human-readable reason.

---

## 2. High-Level Architecture (HLD)

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (Frontend)"]
        UI["React.js SPA (Vite + TailwindCSS)"]
        Components["Listing Page | Live Cockpit | Re-bid Action | Audit Feed"]
        TimerHook["Live Countdown & Real-Time Sync Engine"]
    end

    subgraph APILayer ["API & Application Layer (FastAPI)"]
        FastAPIApp["FastAPI ASGI Application"]
        RFQRouter["/api/v1/rfqs (CRUD & Lifecycle)"]
        QuoteRouter["/api/v1/rfqs/{id}/quotes (Submission & Ranks)"]
        LogRouter["/api/v1/rfqs/{id}/activity-logs (Audit Logs)"]
        
        subgraph CoreEngine ["British Auction Core Engine"]
            Validator["Validation Engine (Start < Close < Forced)"]
            TriggerEvaluator["Trigger Evaluator (ANY_BID, ANY_RANK, L1_RANK)"]
            ExtensionClamper["Clamping Engine (min(close + Y, forced_close))"]
            RankingService["Dynamic Reverse Ranking Service (L1, L2, L3...)"]
            IDGenerator["Standardized Auto-Reference ID Generator"]
        end
    end

    subgraph DataLayer ["Persistence Layer"]
        DBPool["SQLAlchemy ORM Connection Pool"]
        MySQL[("MySQL 8.0 Database (ACID, Row Locking)")]
    end

    UI -->|REST APIs & Polling| FastAPIApp
    FastAPIApp --> RFQRouter
    FastAPIApp --> QuoteRouter
    FastAPIApp --> LogRouter
    
    QuoteRouter --> CoreEngine
    CoreEngine --> Validator
    CoreEngine --> TriggerEvaluator
    CoreEngine --> ExtensionClamper
    CoreEngine --> RankingService
    CoreEngine --> IDGenerator
    
    RFQRouter --> DBPool
    QuoteRouter --> DBPool
    LogRouter --> DBPool
    DBPool --> MySQL
```

---

## 3. Database Schema Design (MySQL)

```mermaid
erDiagram
    RFQS ||--|| AUCTION_CONFIGS : "configured with (1:1)"
    RFQS ||--o{ QUOTES : "receives (1:N)"
    RFQS ||--o{ AUCTION_ACTIVITY_LOGS : "logs (1:N)"

    RFQS {
        INT id PK
        VARCHAR reference_id UK
        VARCHAR title
        VARCHAR origin
        VARCHAR destination
        DATETIME pickup_date
        DATETIME bid_start_time
        DATETIME original_bid_close_time
        DATETIME current_bid_close_time
        DATETIME forced_bid_close_time
        VARCHAR status
        INT extension_count
        DATETIME created_at
        DATETIME updated_at
    }

    AUCTION_CONFIGS {
        INT id PK
        INT rfq_id FK
        BOOLEAN is_british_auction
        INT trigger_window_minutes
        INT extension_duration_minutes
        VARCHAR trigger_mode
        DATETIME created_at
    }

    QUOTES {
        INT id PK
        INT rfq_id FK
        VARCHAR carrier_name
        DECIMAL freight_charges
        DECIMAL origin_charges
        DECIMAL destination_charges
        DECIMAL total_price
        VARCHAR transit_time
        DATETIME validity_date
        INT calculated_rank
        DATETIME submitted_at
    }

    AUCTION_ACTIVITY_LOGS {
        INT id PK
        INT rfq_id FK
        VARCHAR event_type
        TEXT message
        DATETIME previous_close_time
        DATETIME new_close_time
        JSON metadata_payload
        DATETIME created_at
    }
```

---

## 4. Extension Rules & Decision Matrix

| Trigger Mode | Scenario in Last $X$ Minutes | Does Auction Extend? | Extension Reason Recorded |
| :--- | :--- | :---: | :--- |
| **`ANY_BID`** | Any carrier submits any valid quote | **YES** ($+Y$ mins, clamped to forced close) | *"New bid placed by [Carrier] in last X mins"* |
| **`ANY_RANK_CHANGE`** | Supplier underbids another, shifting ranks $L_2 \leftrightarrow L_3$ | **YES** | *"Supplier ranking changed following new bid from [Carrier]"* |
| **`ANY_RANK_CHANGE`** | Supplier submits quote but remains at same rank without shifting anyone | **NO** | *"Bid submitted without altering supplier rankings"* |
| **`L1_RANK_CHANGE`** | Supplier submits new overall lowest quote ($L_1$) | **YES** | *"New lowest bidder (L1) established by [Carrier]"* |
| **`L1_RANK_CHANGE`** | Supplier improves quote from $L_3$ to $L_2$, but $L_1$ unchanged | **NO** | *"Quote improved rank to L2, but L1 remained unchanged"* |
| **ANY MODE** | Calculated `close + Y > forced_close` | **CLAMPED** | *"Extended to Forced Bid Close Time ceiling"* |
| **ANY MODE** | `current_close == forced_close` | **NO** | *"Cannot extend: Forced Bid Close Time limit reached"* |

---

## 5. Project Directory Structure

```
British-Auction-Engine-RFQ/
├── docs/
│   ├── HLD.md                      # High-Level Architecture Design & Sequence Flows
│   ├── SCHEMA.md                   # Complete Database Schema & DDL
│   └── PRD.md                      # Product Requirements Document
├── backend/
│   ├── app/
│   │   ├── config.py               # Environment & Database settings
│   │   ├── database.py             # SQLAlchemy engine & MySQL session
│   │   ├── main.py                 # FastAPI ASGI entrypoint & CORS
│   │   ├── models/                 # SQLAlchemy ORM models (RFQ, Quote, Logs)
│   │   ├── schemas/                # Pydantic v2 schemas & validations
│   │   ├── services/
│   │   │   ├── auction_service.py  # British Auction extension & clamping engine
│   │   │   ├── rfq_service.py      # RFQ CRUD, status sync & auto-ID generator
│   │   │   └── quote_service.py    # Bid submission & ranking recalculation
│   │   └── routers/                # REST API controllers
│   ├── schema.sql                  # MySQL DDL script
│   ├── check_mysql.py              # Diagnostic script to verify MySQL connectivity
│   ├── seed_data.py                # Database seeder with realistic demo RFQs
│   ├── test_auction_engine.py      # Automated unit test suite verifying all trigger modes
│   ├── requirements.txt            # Python dependencies
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.js           # REST API client
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Clean header with branding & action trigger
│   │   │   ├── StatusBadge.jsx     # Modern pastel badges (ACTIVE, EXTENDED, etc.)
│   │   │   ├── CountdownTimer.jsx  # Live timer with Trigger Window visual alerts
│   │   │   ├── LeaderboardTable.jsx# Reverse-bidding rankings with Re-bid action
│   │   │   ├── ActivityLogTimeline.jsx # Audit trail of all bids & extensions
│   │   │   ├── QuoteSubmitModal.jsx# Carrier quote submission with live price calc
│   │   │   └── RFQCreateModal.jsx  # RFQ creator with live ID preview & validations
│   │   ├── pages/
│   │   │   ├── RFQListingPage.jsx  # White-themed dashboard with KPI cards
│   │   │   └── AuctionDetailsPage.jsx # Dual-pane live auction cockpit
│   │   └── utils/formatters.js     # Currency & date formatters
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 6. Getting Started Locally

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**
- **MySQL 8.0**

### 6.1 Backend Setup (FastAPI + SQLAlchemy + MySQL)
1. Open a terminal in `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure `.env` with your MySQL credentials:
   ```env
   DATABASE_URL=mysql+mysqldb://root:YOUR_PASSWORD@localhost:3306/british_auction_rfq
   USE_SQLITE_FALLBACK=False
   ```
5. Verify MySQL connection:
   ```bash
   python check_mysql.py
   ```
6. Seed demo RFQs into MySQL:
   ```bash
   python seed_data.py
   ```
7. Run automated verification tests:
   ```bash
   python test_auction_engine.py
   ```
8. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
   - Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 6.2 Frontend Setup (React.js + Vite)
1. In a second terminal, navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser:
   👉 **[http://localhost:5173](http://localhost:5173)**

---

## 7. Deployment Guide

### 7.1 Backend Deployment (Render / Railway / AWS / Docker)
- **Start Command**:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- **Environment Variables**:
  - `DATABASE_URL`: Your managed MySQL database connection string (e.g. AWS RDS, PlanetScale, Railway MySQL, or Aiven).
  - `USE_SQLITE_FALLBACK`: `False` (for production MySQL).
  - `DEBUG`: `False`

### 7.2 Frontend Deployment (Vercel / Netlify)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**:
  - `VITE_API_URL`: URL of your deployed FastAPI backend (e.g. `https://british-auction-backend.onrender.com`).

---

## 8. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/rfqs` | Create an RFQ with British Auction configuration (auto-generates Reference ID) |
| `GET` | `/api/v1/rfqs` | List all RFQs with current status, $L_1$ price, and close times |
| `GET` | `/api/v1/rfqs/{id}` | Get full details, deduplicated active quotes, and audit logs |
| `POST` | `/api/v1/rfqs/{id}/quotes` | Submit or revise quote; evaluates trigger mode & time extension |
| `GET` | `/api/v1/rfqs/{id}/quotes` | Get all active quotes ranked ($L_1, L_2 \dots$) ascending |
| `GET` | `/api/v1/rfqs/{id}/activity-logs` | Retrieve chronological audit trail of bids and extensions |
| `GET` | `/api/health` | Health check and database connection status |

---

## 9. Verification & Test Suite

The test suite in `backend/test_auction_engine.py` validates all core auction behaviors:
- ✅ **Test 1 (`ANY_BID`)**: Verified that any incoming quote inside the trigger window extends the auction by $Y$ mins.
- ✅ **Test 2 (`L1_RANK_CHANGE`)**: Verified that non-L1 quotes do NOT extend the auction, but a quote unseating $L_1$ immediately extends it.
- ✅ **Test 3 (`ANY_RANK_CHANGE`)**: Verified that rank shifts between middle-tier carriers ($L_2 \leftrightarrow L_3$) trigger extensions.
- ✅ **Test 4 (`Hard Ceiling Clamping`)**: Verified that extensions never exceed `forced_bid_close_time`, and extensions are rejected once the ceiling is reached.

Run tests anytime with:
```bash
python backend/test_auction_engine.py
```
