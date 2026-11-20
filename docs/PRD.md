# Product Requirements Document (PRD)
# British Auction in RFQ System

## 1. Background & Context
An **RFQ (Request for Quotation)** is a procurement process where a buyer invites multiple logistics suppliers / carriers to submit competitive quotes for a freight shipment or service.

A **British Auction** in this reverse-procurement context introduces a dynamic anti-sniping bidding mechanism:
- Suppliers can submit quotes and continuously lower their rates to outbid competitors.
- If qualifying bidding activity occurs inside a configured **Trigger Window** ($X$ minutes before auction end), the auction **automatically extends by $Y$ minutes**.
- The auction enforces a strict **Forced Bid Close Time** (hard ceiling) that no extension can ever exceed.
- Provides real-time transparency into supplier rankings ($L_1, L_2, \dots$), price breakdowns, and audit trails.

---

## 2. Product Objectives
- Prevent last-second bid sniping manipulation.
- Encourage transparent competition among carriers.
- Assist enterprise buyers in discovering optimal market rates.
- Ensure bounded auction durations with an unbreachable forced close cutoff.

---

## 3. Core Functional Requirements

### 3.1 RFQ Creation & Configuration
1. **RFQ Metadata**:
   - RFQ Reference ID (e.g., `RFQ-2026-DEL-BOM-01`)
   - Title / Shipment Name
   - Origin & Destination
   - Pickup / Service Date
   - Bid Start Date & Time
   - Bid Close Date & Time
   - Forced Bid Close Date & Time
2. **British Auction Settings**:
   - `is_british_auction` (boolean, default: true)
   - `trigger_window_minutes` ($X$): Time window before close to monitor activity (e.g. 10 mins).
   - `extension_duration_minutes` ($Y$): Duration to extend if triggered (e.g. 5 mins).
   - `trigger_mode`:
     - `ANY_BID`: Any new quote submitted within last $X$ minutes.
     - `ANY_RANK_CHANGE`: Any quote that alters any supplier's ranking position within last $X$ minutes.
     - `L1_RANK_CHANGE`: Any quote that unseats the lowest bidder ($L_1$) within last $X$ minutes.

### 3.2 Quote Submission (Reverse Bidding)
- Suppliers submit quote line items:
  - Carrier Name
  - Freight Charges ($\ge 0$)
  - Origin Charges ($\ge 0$)
  - Destination Charges ($\ge 0$)
  - Transit Time (e.g. "3 Days", "48 Hours")
  - Validity Date
- Calculated `Total Price = Freight + Origin + Destination Charges`.
- Continuous bidding: Suppliers can submit lower quotes to improve their rank while the auction is active.

### 3.3 Auction Extension & Validation Rules
- **Rule 1**: Forced Bid Close Time must always be strictly greater than Bid Close Time.
- **Rule 2**: Bid Close Time must be strictly greater than Bid Start Time.
- **Rule 3**: Extensions must never exceed Forced Bid Close Time:
  $$\text{New Close Time} = \min(\text{Current Close Time} + Y, \text{Forced Close Time})$$
  If `Current Close Time == Forced Close Time`, no further extension is granted.

### 3.4 Auction Status Lifecycle
- `SCHEDULED`: Current time is before `bid_start_time`.
- `ACTIVE`: Current time is between `bid_start_time` and `current_bid_close_time`.
- `EXTENDED`: Currently active, and at least one extension has occurred.
- `CLOSED`: Current time has reached `current_bid_close_time` naturally.
- `FORCE_CLOSED`: Current time has reached `forced_bid_close_time`.

### 3.5 Auction Listing & Cockpit
- **Listing View**: All British Auctions with RFQ ID, Current L1 Price, Current Close Time, Forced Close Time, and Status Badge.
- **Details View**:
  - Live countdown clock.
  - Configuration details ($X$, $Y$, Trigger Mode).
  - Supplier ranking board sorted by total price ascending ($L_1, L_2, L_3 \dots$).
  - Full quote breakdown table.
  - Interactive quote submission form.
  - Chronological activity log showing bid events, extensions, and exact extension reasons.
