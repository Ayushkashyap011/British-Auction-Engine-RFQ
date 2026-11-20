# High-Level Design (HLD)
# British Auction in RFQ System

## 1. System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (Frontend)"]
        UI["React.js SPA (Vite + TailwindCSS)"]
        Components["Views: Listing Page | Cockpit | Create RFQ | Submit Quote"]
        TimerHook["Live Countdown & Real-Time Sync Engine"]
    end

    subgraph APILayer ["API & Application Layer (FastAPI)"]
        FastAPIApp["FastAPI Application (ASGI)"]
        RFQRouter["/api/v1/rfqs (CRUD & Lifecycle)"]
        QuoteRouter["/api/v1/rfqs/{id}/quotes (Submission & Ranks)"]
        LogRouter["/api/v1/rfqs/{id}/activity-logs (Audit Trail)"]
        
        subgraph CoreEngine ["British Auction Engine"]
            Validator["Validation Engine (Window & Rules)"]
            TriggerEvaluator["Trigger Evaluator (Modes: ANY_BID, ANY_RANK, L1_RANK)"]
            ExtensionClamper["Clamping Engine (min(close + Y, forced_close))"]
            RankingService["Dynamic Reverse Ranking Service (L1, L2, L3...)"]
        end
    end

    subgraph DataLayer ["Persistence Layer"]
        DBPool["SQLAlchemy ORM Connection Pool"]
        MySQL[("MySQL 8.0 Database (ACID, Row Locking)")]
    end

    UI -->|REST API Requests & Polling| FastAPIApp
    FastAPIApp --> RFQRouter
    FastAPIApp --> QuoteRouter
    FastAPIApp --> LogRouter
    
    QuoteRouter --> CoreEngine
    CoreEngine --> Validator
    CoreEngine --> TriggerEvaluator
    CoreEngine --> ExtensionClamper
    CoreEngine --> RankingService
    
    RFQRouter --> DBPool
    QuoteRouter --> DBPool
    LogRouter --> DBPool
    DBPool --> MySQL
```

---

## 2. Core Components Description

### 2.1 React Frontend
- **RFQ Listing View**: Displays all active, scheduled, extended, and closed RFQs with live countdowns, current $L_1$ quotes, and quick navigation.
- **RFQ Details / Live Cockpit**: Dual-pane command center showing:
  - Top header with dynamic status badge, close countdown, and British Auction settings ($X$, $Y$, Trigger Mode).
  - Supplier Ranking Board ($L_1, L_2 \dots$) and itemized cost breakdown.
  - Interactive Quote Submission form for testing carrier bidding.
  - Chronological Activity Log showing every bid, extension, and human-readable reason.
- **RFQ Creation Modal**: Form with input validation ensuring `Bid Start < Bid Close < Forced Close`, and $X, Y > 0$.

### 2.2 FastAPI Backend
- **Layered Architecture**: Routers $\rightarrow$ Services $\rightarrow$ Data Models $\rightarrow$ Database.
- **Concurrency & Transaction Safety**: In MySQL, quotes and RFQ close time updates are wrapped in an atomic database transaction. Using `SELECT ... FOR UPDATE` on the RFQ record ensures concurrent bids within the trigger window are serialized and evaluated safely.
- **Clean RESTful Contracts**: Pydantic v2 models validate all inbound payloads and format outgoing responses.

---

## 3. Bid Submission & Extension Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor Carrier as Carrier / Supplier
    participant Frontend as React Client
    participant API as FastAPI Quote Router
    participant Engine as British Auction Service
    participant DB as MySQL Database

    Carrier->>Frontend: Fill Quote (Freight, Origin, Dest, Transit)
    Frontend->>API: POST /api/v1/rfqs/{rfq_id}/quotes
    API->>DB: Begin Transaction & Lock RFQ (SELECT FOR UPDATE)
    API->>Engine: Validate Status (Must be ACTIVE or EXTENDED)
    
    alt Auction Closed or Not Started
        Engine-->>API: Reject (400 Bad Request)
        API-->>Frontend: Display Error Notice
    else Auction Is Active
        Engine->>Engine: Compute Total Price & Rank against existing quotes
        Engine->>DB: Insert New Quote Record
        Engine->>Engine: Check if Current Time in [Close - X mins, Close]
        
        alt Within Trigger Window
            Engine->>Engine: Evaluate Configured Trigger Mode
            alt Trigger Condition Satisfied
                Engine->>Engine: Calculate new_close = min(current_close + Y, forced_close)
                alt new_close > current_close
                    Engine->>DB: Update RFQ current_bid_close_time & increment extension_count
                    Engine->>DB: Insert Log (AUCTION_EXTENDED, Reason)
                else Already at Forced Close
                    Engine->>DB: Insert Log (EXTENSION_CLAMPED, Reason: Reached Hard Ceiling)
                end
            else Trigger Condition Not Met
                Engine->>DB: Insert Log (BID_SUBMITTED, Reason: Rank unchanged or condition not met)
            end
        else Outside Trigger Window
            Engine->>DB: Insert Log (BID_SUBMITTED, Reason: Normal bid outside trigger window)
        end
        
        API->>DB: Commit Transaction
        API-->>Frontend: Return 201 Created (Updated Quote, New Rank, New Close Time)
        Frontend->>Frontend: Update Leaderboard, Timers, and Audit Timeline
    end
```

---

## 4. Reverse Ranking & Extension Decision Matrix

| Trigger Mode | Scenario in Last $X$ Minutes | Does Auction Extend? | Extension Reason Logged |
| :--- | :--- | :---: | :--- |
| **`ANY_BID`** | Any carrier submits any valid quote | **YES** (by $+Y$ mins, clamped to forced close) | *"New bid placed by [Carrier] in last X mins"* |
| **`ANY_RANK_CHANGE`** | Supplier B beats Supplier A, shifting ranks $L_2 \leftrightarrow L_3$ | **YES** | *"Supplier ranking changed (Carrier jumped from L3 to L2)"* |
| **`ANY_RANK_CHANGE`** | Supplier submits quote but remains at rank $L_4$ without altering any rank | **NO** | *"Bid submitted without altering supplier rankings"* |
| **`L1_RANK_CHANGE`** | Supplier submits new overall lowest quote ($L_1$) | **YES** | *"New lowest bidder (L1) established by [Carrier]"* |
| **`L1_RANK_CHANGE`** | Supplier improves their own quote from $L_3$ to $L_2$, but $L_1$ stays intact | **NO** | *"Quote improved rank to L2, but L1 remained unchanged"* |
| **ANY MODE** | Calculated `close + Y > forced_close` | **CLAMPED** | *"Extended to hard ceiling: Forced Close Time reached"* |
| **ANY MODE** | `current_close == forced_close` | **NO** | *"Cannot extend: Forced Bid Close Time limit reached"* |
