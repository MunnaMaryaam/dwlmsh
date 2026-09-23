DIAMOND WORLD LTD — UNIVERSAL JEWELRY STOCK ERP
================================================

START
-----
1. Install Node.js 20+.
2. Double-click START_APP.bat.
3. The app opens at http://localhost:3000.

OWNER LOGIN
-----------
Username: admin
Password: 0000
Owner: MD Shahadat Hossen

SECURITY / ACCESS
-----------------
- New signup accounts remain PENDING until the owner approves them.
- Forgot Password creates a recovery request for the owner; it does not auto-reset access.
- The owner account is immutable and cannot be deleted/revoked from the app.
- Other approved users are restricted to analysis, data upload and export workflows.
- Passwords are stored server-side as scrypt hashes, not plain text.

ALLOCATION ENGINE
-----------------
The Allocation workspace follows PRD_ALLOCATION_ENGINE.md.
It is universal for jewelry items such as Nosepin, Earring, Finger Ring, Locket,
Bracelet, Necklace, Solitaire variants, SKU/Variant codes, etc.

LIVE LOGIC
----------
A. Contribution deserve = Enterprise Live Stock × Sales Contribution.
B. High velocity (3M sold >= 10): safety target = 1.5 × 3M sold quantity,
   with optional growth multiplier.
C. Low velocity (3M sold <= 8 and current stock >= 23): retain exactly 10 pcs;
   excess enters the pooling queue.
D. When ideal branch targets exceed enterprise live stock, proportional compression
   is applied and a 1–2 pc floor is preserved where stock permits.
E. Status flags: ⚠️ Overstock, 📉 Less Stock, ✓ Balanced, 🏢 Warehouse.

INPUT
-----
The parser dynamically detects branch + item/SKU/variant columns. No branch code
or product name is used as a hardcoded allocation key.

BUILD NOTE
----------
If the project is opened on a machine without node_modules, START_APP.bat runs
npm install automatically. The final source was syntax-transpiled successfully
(41 TS/TSX files, 0 syntax diagnostics). Full npm/Vite build could not be run in
this packaging environment because package registry access timed out.
