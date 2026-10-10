# SHWE KYAL TAGON IT & MOBILE (ရွှေကြယ်တံခွန်)
## Master System Specification, Business Rules & Architectural Knowledge Base

> **CRITICAL DIRECTIVE FOR ALL FUTURE TURNS & SESSIONS:**
> This document records the finalized user requirements, operational rules, and architecture established directly with the business owner and Managing Director (Daw Su Myat Win).
> Every future change must strictly conform to these rules without regression.

---

### 0. LOCKED ARCHITECTURE: DATA SYNC AND LOGIN (do NOT change, rewrite or "simplify")

These files were written and tested on purpose. AI assistants have broken them before by rewriting them
back to an older design that lost data. Do not edit them, even if you see an error that seems related:

* `src/utils/cloudSync.ts`, `src/utils/syncEngine.ts`, `src/utils/authProfile.ts`, `src/hooks/useFirebaseSession.ts`,
  `src/components/FirebaseLogin.tsx`, `src/components/StaffAccountsPanel.tsx`, `src/components/CloudSyncNotice.tsx`,
  `src/firebase.ts`, `firestore.rules`, `vercel.json`.
* Data lives in Firestore as ONE DOCUMENT PER RECORD: `erp/{collection}/items/{recordId}`. Never store the whole
  database in a single document. Never write to `sktg_sync/main_v3`.
* Login is Firebase Auth email + password only. Accounts are created by hand in the Firebase Console. The staff
  profile (role, branch) is `users/{firebaseUid}`, created by the MD with the "Staff login accounts" panel.
* Forbidden: `signInAnonymously`, `createUserWithEmailAndPassword`, a sign-up screen, passwords or PINs written in
  source code, any `/api/sync` route, any API key typed into source code, an in-app "switch user" that skips login.
* "No VPN" support works by a pure pass-through (`vercel.json` rewrites + `?proxy=1`). It does not hold credentials.
  Security is enforced by Firestore rules, so rules must never be loosened to make something "work".
* If sync or login shows an error, report it to the owner. Do not change these files to hide it.

---

### 1. Language & UI Display Rules
* **NO BURMESE TEXT ON OFFICIAL VOUCHERS & DOCUMENTS (100% Clean English Only):**
  * All official accounting documents, payslips (single and batch), sales invoices, POS vouchers, and action dialogs must strictly use **Clean English labels**.
  * **Strictly Prohibited:** Adding Burmese translations in parentheses on vouchers (e.g., `Basic Pay (အခြေခံလစာ)`, `Deductions (ဖြတ်တောက်ငွေများ)`, `Authorized Signature (ခွင့်ပြုသူ လက်မှတ်)`).
  * Use standard English only: `Basic Pay`, `Service Allowance`, `Duty Allowance`, `Attendance Bonus`, `Sales Commission`, `Meal Allowance`, `Overtime`, `Extra Days Pay`, `Performance Bonus`, `Deductions`, `Late Deduct`, `Absent Deduct`, `Social Security (SSB)`, `NET PAYABLE`, `Authorized Signature`, and `Receiver Signature`.

---

### 2. Company Identity & Organization Structure
* **Company:** Shwe Kyal Tagon Co., Ltd. (ရွှေကြယ်တံခွန် IT & Mobile)
* **Managing Director (MD):** Daw Su Myat Win
* **Store Branches:**
  1. **Shop 1 (`branch-1` / `CS-01`):** Shwe Kyal Tagon (Shop 1) — Nawade Shop House, Hlaing Tharyar (East)
  2. **Shop 2 (`branch-2` / `CS-02`):** Shwe Kyal Tagon (Shop 2) — Anawrahta Main Road, Hlaing Tharyar
  3. **Shop 3 (`branch-3` / `CS-03`):** Shwe Kyal Tagon (Shop 3) — No. (506/A+B), (20) Ward, Anawrahta Main Road
  4. **System II (`branch-sys2` / `System II`):** System II — Nawade Shop House, Kyansittha Road

---

### 3. Security, Authentication & Role-Based Access Control (RBAC)
* **Strict Whitelist & Default-Deny Security:**
  * Only verified company personnel registered in Firebase Authentication and Firestore `/users` collection are granted database access.
  * Public read/write permissions are **strictly forbidden** (`allow read, write: if false;` as default fallback in `firestore.rules`).
  * Unauthorized accounts are immediately denied entry, signed out of Firebase Auth, and blocked from initiating cloud synchronization.
* **Authorized Primary Accounts:**
  * `sumyatwin.sktg@gmail.com` — Managing Director (MD / Owner)
  * `wahwahlwin.1990@gmail.com` — Developer / Owner Account
  * `yaminnwe@sktg.com` — Senior Operations Manager / Editor
  * `ayethandar@sktg.com` — Admin / Branch Manager
  * `hninhninaye@sktg.com` — Cashier / Staff
  * `eieithein@sktg.com` — Cashier / Staff
  * `nunuwin@sktg.com` — Cashier / Staff
  * Any authorized `@sktg.com` account registered with `status: 'active'` in Firestore `/users`.
* **Role Hierarchy & Permissions:**
  * **Managing Director (MD):** Highest executive authority (`branchId: 'ALL'`). MD is the only role authorized to delete salary records, manage user accounts, assign roles, and alter system-wide financial structures.
  * **Editor (Ma Yamin Nwe):** Full stock management, inventory auditing, purchase order recording, supplier RMA/benefit handling. Cannot be deleted by regular staff.
  * **Admin / Manager:** Branch operations, employee management, sales operations, inventory oversight.
  * **Staff / Cashier:** POS sales, customer vouchers, shifts, daily transactions within assigned branch.

---

### 4. HR, Payroll & Compensation Logic
* **Working Days Standard:** Standard working days per month is typically 26 days (or Month Total Days minus 3 off-days).
* **Extra Days Pay:** Staff working beyond the standard monthly working days receive proportional extra days compensation.
* **Service Allowance:** 20,000 MMK per completed full year of continuous service (commences after 1 full year).
* **Duty Allowance:** Position / responsibility allowance attached to executive/supervisor duties.
* **Attendance Bonus:** Regular attendance bonus awarded when absent days = 0.
* **Sales Commission:** Monthly sales commission earned from mobile, laptop, and accessory sales.
* **Deductions:**
  * Late Deduct: Fixed penalty multiplied by late arrival occurrences.
  * Absent Deduct: Daily rate deduction multiplied by unexcused absent days.
  * Unpaid Leave: Daily rate deduction for sanctioned unpaid leave days.
  * Social Security (SSB): Statutory employee deduction when registered.
* **Payslip Printing Standards:**
  * **Direct Iframe Printing Engine:** Direct trigger to native print preview dialog without opening blank popup tabs or triggering unwanted HTML file downloads.
  * **Batch Payslips (All Staff):** Formatted to fit strictly 2 slips per A5 page with dashed cut line for physical disbursement.
  * **Dual Signatures:** Formatted with signature lines for `Authorized Signature` and `Receiver Signature`.

---

### 5. Sales, POS & Inventory Movements
* **IMEI / Serial Number Integrity:** Mobile phones and laptops track unique IMEI / serial numbers. Deductions from stock immediately retire IMEIs; voided sales restore them into inventory.
* **Strict Stock Movement Auditing:**
  * Every sale records a `STOCK_OUT` movement.
  * Every voided sale records a `STOCK_IN` (Restock from Void) movement.
  * Ground audits record an `AUDIT_ADJUSTMENT` movement with authorized audit notes.
  * Inter-branch transfers record a `TRANSFER` movement with departure and destination branches.
* **Cashier Shift Management (Z-Report):**
  * Shift opening float recording.
  * Shift closing actual cash counting with discrepancy calculation (`Actual - Expected`).
  * Automatic synchronization to local cache and treasury ledger.

---

### 6. Financial Ledger & Cloud Synchronization
* **Collection-by-Collection Cloud Sync:** One document per record in Firestore to eliminate data loss and race conditions.
* **Offline Resilience:** Local storage cache ensures seamless operations even during internet disconnections; automatic reconciliation resumes when connection is restored.
* **Treasury Balances:** Multi-account treasury (Cash in Hand, KBZPay, WavePay, Banking channels) tracking inbound and outbound liquidity.
