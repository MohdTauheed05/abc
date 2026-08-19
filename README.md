# ABC Lubricants

A full-viewport, animated figurine hero built for ABC Lubricants — toon characters hold the
grade they represent (Motor Oil, Diesel Oil, Brake Fluid, Coolant, Heavy Duty Grease) in a
depth-layered carousel — plus an Admin dashboard (Firebase Auth + Firestore + Storage) for
managing the catalog and uploading character/bottle art.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- react-router-dom
- lucide-react
- Firebase: Authentication (email/password), Firestore (product catalog), Storage (images)

## Run locally

```bash
npm install
cp .env.example .env   # fill in your Firebase config (see below)
npm run dev
```

The app runs **without Firebase configured** too — it falls back to the local demo catalog in
`src/data/products.ts` and the storefront works fully, but `/login` and `/admin` stay disabled
until you add credentials.

## 1. Create the Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com/) → **Add project**.
2. Inside the project, click **Add app → Web** and register the app. Copy the `firebaseConfig`
   values into your `.env` file (same keys as `.env.example`).
3. **Authentication** → Sign-in method → enable **Email/Password**.
4. **Authentication** → Users → **Add user** to create your first admin login (email + password).
5. **Firestore Database** → Create database → start in production mode, pick a region.
6. **Storage** → Get started → same region as Firestore.

## 2. Deploy the security rules

This repo ships `firestore.rules` and `storage.rules`:
- Anyone can **read** the product catalog and images (public storefront).
- Only a **signed-in** user can create, edit, or delete products / upload images.

Deploy with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init   # select Firestore + Storage, point at this project, keep existing rules files
firebase deploy --only firestore:rules,storage:rules
```

(Or paste the contents of each file into the Firebase console's Rules tab for Firestore and
Storage directly.)

## 3. Load the starter catalog

Sign in at `/login` with the user you created, go to `/admin`. If Firestore's `products`
collection is empty you'll see a **Load starter catalog** button — it seeds the same grades
from `src/data/products.ts` (Motor Oil 20W-50 / 5W-30, Diesel 15W-40 / 10W-30, Brake Fluid
DOT 3/4, Coolant OAT/Extended Life, Heavy Duty Grease Lithium/Moly EP2). From there, use
**New grade** to add more, or click a grade to edit its copy, colors, spec sheet, or upload a
character/bottle image (falls back to a generated toon figurine when no image is set).

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo (framework preset: **Vite**).
3. Add the six `VITE_FIREBASE_*` environment variables from your `.env` in the Vercel project
   settings (Production, Preview, and Development).
4. Deploy. `vercel.json` is included so client-side routes (`/login`, `/admin`) resolve
   correctly on refresh.
5. Back in the Firebase console → Authentication → Settings → **Authorized domains**, add your
   Vercel domain (and any custom domain) so sign-in works in production.

Every push to your GitHub default branch redeploys automatically once the Vercel project is
connected — that's the whole CI/CD loop, no extra config needed.

## Project structure

```
src/
  components/       Hero carousel, nav, spec drawer, figurine art, admin product form
  context/          AuthContext (Firebase Authentication state)
  data/products.ts  Seed / demo catalog
  hooks/useProducts.ts   Realtime Firestore subscription with demo-mode fallback
  pages/            Login.tsx, Admin.tsx
  types/product.ts  Product & category types
  firebase.ts       Firebase app/auth/db/storage initialization
```

## Notes

- The default figurine art (`BottleFigurine.tsx`) is generated entirely from each product's
  color palette and grade code — no external image dependency. Uploading an image in Admin
  overrides it for that grade.
- `isFirebaseConfigured` in `src/firebase.ts` gates the app between "demo mode" (no env vars)
  and full Firebase mode, so the repo is presentable immediately after `npm install && npm run dev`.
