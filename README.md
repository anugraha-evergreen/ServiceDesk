# Anugraha Evergreen Layout Residents' Association (AELRA) Portal

A mobile-first, responsive web application built with **Next.js (App Router)**, **Tailwind CSS**, and **Supabase** for the **Anugraha Evergreen Layout Residents' Association** to manage plot-specific NOCs, compliance checklists, security deposits, and documents.

Designed in a **light mode** theme with **forest green and clean white** primary colors.

---

## Key Features & Highlights

### 1. Two-Role Authentication & Strict Privacy Rules
- **Generic Owner Login**:
  - Residents select/enter their **Plot Number**, **Name**, and **Phone Number**.
  - Access is scoped strictly to their plot.
  - Owners can raise requests and check live status badges (`Submitted`, `Under Review`, `Checklist Pending`, `NOC Approved`, `Completed`).
  - **STRICT PRIVACY ENFORCEMENT**: Owners can **NEVER** view, preview, or download any uploaded documents or generated PDFs after submission. Document viewing, downloading, and PDF generation are restricted exclusively to the Association Admin login.
- **Association Admin Login**:
  - Protected with environment-configured passcode (`ADMIN_PASSCODE`, default: `evergreen2026`).
  - Full management suite: request review queue, document previews in Google Drive, compliance checklists, security deposit tracking, PDF generation, and refund calculations.

---

### 2. Plot-Centric Workflows

#### A. Construction NOC & Security Deposit Management
- **Mandatory Rules Acceptance**: Displays the complete *Anugraha Evergreen Layout Mandatory Construction Rules and Guidelines (16 Nov 2026)* with an interactive modal and mandatory acceptance checkbox.
- **Statutory Uploads**: Government-approved building plan, local authority construction permit, latest property tax receipt, and site management phone numbers (Contractor, Supervisor, 24/7 Emergency).
- **Optional Uploads**: Neighbour permission letters, masked labourer IDs.
- **Admin Pre-Construction 7-Point Checklist**:
  1. Statutory documents verified.
  2. ₹1,000 lifetime Association membership fee cleared.
  3. Up-to-date maintenance dues cleared.
  4. ₹20,000 security deposit paid (records bank UTR, date, and depositor bank).
  5. On-site temporary labourer toilet/bathroom installed and verified.
  6. BESCOM temporary power & water arrangements verified.
  7. Labourers registered with supervisor and layout security desk.
- **Official Construction NOC PDF**: Admin can generate and download a printable/downloadable official NOC PDF with Association letterhead, watermark, layout seal, and certificate metadata.
- **Post-Construction Refund Module**:
  - Management Committee (MC) physical inspection checklist (debris removed, roads/drains undamaged, rainwater harvesting & recharge pit verified).
  - **Interactive Deduction Calculator**: Base deposit ₹20,000. Supports full refund (₹20,000), partial refund with itemized deductions, or excess damage recovery (> ₹20,000).
  - Bank payout voucher / screenshot upload.

#### B. Re-Measurement NOC
- Owner uploads Tahsildar / Revenue site survey sketch.
- Admin boundary and encroachment verification checklist.
- Re-Measurement NOC PDF certificate generation.

#### C. Sale Deed & Ownership Transfer
- Owner uploads registered Sale Deed and conveyance information (previous seller, new purchaser, deed number, registration date, SRO).
- Admin verifies the deed and updates the master plot ownership directory with one click.

#### D. Plot Amalgamation
- Multi-plot owner selects adjacent plots they own (e.g., Plot #14 and Plot #15).
- Uploads statutory amalgamation sanction or joint deed.
- Admin approves and merges the records into a single unified entity (e.g. `Plot 14 & 15`) for maintenance tracking while preserving historical plot records.

---

### 3. Google Drive Resumable Direct Uploads
- Direct browser-to-Drive chunked PUT upload session initiated via Next.js server route.
- **Bypasses Vercel's 4.5 MB serverless limit**: High-resolution mobile phone camera photos and large multi-page blueprints upload directly from the device to Google Drive.
- **Automatic Organization**: Files and NOC PDFs are automatically cataloged into:
  `/Anugraha_Evergreen_Records/Plot_[Number]/[Category]/`

---

## Dual-Mode Architecture (Run Offline or Connect Cloud)

This app works **instantly without entering any credentials**:
1. **Zero-Config Local Mode (Active by Default)**:
   - Comes pre-seeded with sample plots (Plot 12, 27, 42, 58, 14, 15, 73, 88) and sample requests in different stages.
   - Mock upload simulator handles camera photos and files of any size without errors.
2. **Production Cloud Mode**:
   - Easily activated whenever you are ready by adding your Supabase and Google Service Account credentials to `.env.local`.

---

## Step-by-Step Setup Guides

### A. How to Set Up Supabase (When You Are Ready)
1. Sign in to [Supabase](https://supabase.com) and click **New Project** named `anugraha-evergreen`.
2. Go to **SQL Editor** in the left sidebar.
3. Open `supabase/schema.sql` from this codebase, copy all the SQL, and paste it into the Supabase SQL Editor. Click **Run**.
4. Go to **Project Settings > API** and copy:
   - `Project URL`
   - `Project API Keys > anon (public)`
   - `Project API Keys > service_role (secret)`
5. Open `.env.local` in this project and paste them:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```

### B. How to Set Up Google Drive Service Account (When You Are Ready)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. `Anugraha-Evergreen-Portal`).
2. Go to **APIs & Services > Library**, search for **Google Drive API**, and click **Enable**.
3. Go to **IAM & Admin > Service Accounts**, click **Create Service Account**, name it `drive-uploader`, and create it.
4. Click on the newly created Service Account, open the **Keys** tab, click **Add Key > Create new key > JSON**, and download the JSON key file.
5. In your Google Drive account, create a new folder named `Anugraha_Evergreen_Records`.
6. Right-click the folder, click **Share**, and paste the Service Account's email address (e.g. `drive-uploader@your-project.iam.gserviceaccount.com`), giving it **Editor** permissions.
7. Copy the folder ID from the Google Drive URL (the string after `folders/`).
8. Add the credentials to `.env.local`:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=drive-uploader@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgI...\n-----END PRIVATE KEY-----\n"
   GOOGLE_DRIVE_ROOT_FOLDER_ID=your_folder_id_here
   ```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Open in browser
open http://localhost:3000
```
