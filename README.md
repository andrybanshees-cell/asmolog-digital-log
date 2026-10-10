# Set Log

Build a full offline-first mobile & iPad web app named "asmolog" (a modern digital camera logging app for film sets). Use React, Tailwind CSS, Dexie.js (for offline IndexedDB storage), and Supabase (for online database sync and authentication). 

DESIGN SYSTEM & VISUAL STYLE (Airbnb-Inspired Clean Minimalism):

- Typography: Use a crisp, modern geometric sans-serif font stack (Inter / Plus Jakarta Sans). Focus on strong typographic hierarchy with bold prominent headings, clear labels, and soft muted body text.

- Color Palette: Dual mode support (Light/Dark). Light mode uses soft warm off-white backgrounds (#FAFAFA), clean white cards (#FFFFFF), deep charcoal text (#222222), and soft 1px borders (#EBEBEB). Dark mode uses matte slate tones (#121212 / #1E1E1E) for low-light set environments. Use a single refined accent color (e.g., warm coral #FF385C or amber) sparingly for active states, CTAs, and primary highlights.

- Components: Large touch-friendly targets, rounded corners (rounded-2xl / 16px), subtle diffused shadows (shadow-sm), clean navigation list rows with right-aligned pill badges, and generous whitespace/padding for effortless scanning on iPad.

KEY FEATURES & FLOW:

1. OFFLINE-FIRST & SYNC SYSTEM:

- Save all data locally to IndexedDB via Dexie.js first so the app functions 100% offline without internet.

- Show a persistent "Online / Offline / Syncing" status badge in the header.

- When internet connection is restored, auto-sync pending local Dexie.js records to the Supabase PostgreSQL database.

2. PROJECT SETUP & MASTER METADATA SCREEN:

- Create a screen to create and manage active Projects.

- Form Fields & Structure:

  a. Project Title & Production Name text inputs.

  b. Media Type: Segmented selector [Digital (Default), Film, Custom].

  c. Clean Navigation Rows with item counter badges (e.g., "[ 3 lenses ] >") that open a Modal/Sheet to add/remove dynamic tags:

     - Lens Types (e.g., 18mm, 35mm, 50mm)

     - Filters (e.g., ND 0.9, Pola, Clear)

     - Character Names (for continuity logging)

     - LUTs (e.g., Rec709_Base, FilmLook_V1)

     - Aspect Ratios (Presets: 16:9, 2.39:1, 4:3, 1.85:1 + Custom input)

     - Formats (Presets: ProRes 4444, RAW, H.264 + Custom input)

     - Resolutions (Presets: 4K DCI, 1080p, 8K + Custom input)

3. DAILY CAMERA LOGGING SHEET (Per-Take Input):

- Main operational view for DIT / Camera Crew on set.

- Numerical/Text Inputs: Scene, Shot, Take number (with auto-increment feature on new take), Camera Roll ID, Sound Roll ID.

- Dynamic Dropdowns: Populated directly from the active Project's Master Metadata (Lens, Filter, Character, LUT, Aspect Ratio, Format, Resolution).

- Additional Inputs: FPS, Shutter Angle, WB (Kelvin), ISO, Lens Aperture (T-stop), "Good Take" toggle switch, and Notes textarea.

- Prominent "Save Take Log" button that instantly writes to local Dexie.js.

4. LOGS HISTORY & EXPORT VIEW:

- Minimalist Table/Card view displaying recorded takes grouped by Scene/Shot.

- Search and filter controls (by Scene, Good Take status, or Camera Roll).

- Features to export logs as CSV and a clean formatted PDF summary report.

5. USER ROLES & RBAC (Supabase RLS Ready):

- Role badge indicator for active user: Admin (Full access & project setup), DIT/Clapper (Add/Edit logs & metadata), Viewer/Client (Read-only access to dashboard and PDF export).

Ensure all inputs feel spacious, touch-optimized, and "fat-finger proof" for quick operation on set.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://asmolog-digital-log.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6d01bd06-4529-4b80-8cc5-648bcc257db5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
