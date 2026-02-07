# EvacTrack

**NUS Hostel Evacuation Attendance System**

A real-time GPS-based evacuation attendance tracking system for NUS hostels, built for hackathon MVP demonstration.

## 🎯 Features

- **Resident Interface**: GPS-based check-in when within 100m of evacuation checkpoint
- **RA Dashboard**: Real-time attendance monitoring, manual check-in capability, incident management
- **Admin Panel**: Configure checkpoint locations and radius for each floor
- **Real-time Updates**: Firestore listeners for instant status synchronization
- **Mobile-First Design**: Optimized for residents on mobile, desktop-friendly for RAs
- **Audit Trail**: Complete logging of RA actions for accountability

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication + Firestore)
- **Geolocation**: Browser Geolocation API with Haversine distance calculation
- **Real-time**: Firestore real-time listeners

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled

## 🚀 Setup Instructions

### 1. Clone and Install

```bash
cd evactrack
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** > **Email/Password** sign-in method
3. Enable **Firestore Database** in production mode
4. Go to **Project Settings** > **General** and copy your Firebase config

### 3. Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Fill in your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Seed Demo Data

**Important**: Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable or authenticate with Firebase Admin:

```bash
# Option 1: Using service account key (recommended for local dev)
# Download service account key from Firebase Console > Project Settings > Service Accounts
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"

# Option 2: Using gcloud CLI
gcloud auth application-default login

# Run seed script
npm run seed
```

This creates:
- **All NUS residences** (hostels collection)
  - Halls, Houses, Residential Colleges, Student Residences
- For **each** residence: **Block A + Floors 1–3 + a checkpoint per floor**
  - Checkpoints start with a safe default coordinate near NUS so GPS check-in isn't blocked during local testing
  - Update exact coordinates per residence in `/admin`

Plus a small set of **Temasek Hall demo users** (RAs + residents) so you can log in immediately.

**Demo Accounts** (all use password: `Demo123!`):
- RA Floor 3: `ra.floor3@e.ntu.edu.sg`
- RA Floor 4: `ra.floor4@e.ntu.edu.sg`
- Resident Floor 3: `resident1.f3@e.ntu.edu.sg` (Room 301)
- Resident Floor 4: `resident1.f4@e.ntu.edu.sg` (Room 401)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎬 2-Minute Demo Flow

### Step 1: RA Starts Incident (30 seconds)

1. Login as RA: `ra.floor3@e.ntu.edu.sg` / `Demo123!`
2. Click **"Start Incident"** button
3. Observe the statistics dashboard showing all residents as "Missing"

### Step 2: Resident GPS Check-in (45 seconds)

1. Open a new incognito/private window
2. Login as Resident: `resident1.f3@e.ntu.edu.sg` / `Demo123!`
3. See the red "EVACUATION IN PROGRESS" alert
4. Click **"Get My Location"** (grant location permission if prompted)
5. Observe distance calculation and GPS accuracy
6. **Note**: In real demo, you need to be within 100m of checkpoint (1.2927, 103.7733)
   - For testing: Temporarily modify checkpoint coordinates in admin panel to match your location
   - Or use browser dev tools to mock geolocation

### Step 3: RA Manual Check-in (30 seconds)

1. Switch back to RA dashboard
2. See real-time update: resident1 now shows "Accounted (GPS)" with green badge
3. Find a "Missing" resident in the table
4. Click **"Mark Present"**
5. Enter reason: "Checked in at physical checkpoint"
6. Confirm - observe real-time status change to "Accounted (Manual)" with blue badge

### Step 4: RA Ends Incident (15 seconds)

1. Review final statistics
2. Click **"End Incident"**
3. Observe incident status change
4. (Optional) Check admin panel to view/edit checkpoint locations

## 📱 User Roles & Pages

### Resident (`/resident`)
- View incident status (active/inactive)
- See distance to checkpoint and GPS accuracy
- Check in via GPS when within radius
- View accounted status and timestamp

### RA (`/ra`)
- Start/End incidents for their floor
- View real-time roster with status badges:
  - 🟢 Accounted (GPS) - with low GPS warning if accuracy > 25m
  - 🔵 Accounted (Manual) - with RA reason
  - 🔴 Missing
- Manually mark residents present with reason
- Search and filter residents
- View statistics dashboard

### Admin (`/admin`)
- Configure checkpoint coordinates (latitude, longitude)
- Set check-in radius (default 100m)
- View all checkpoints across floors

## 🗂️ Project Structure

```
evactrack/
├── app/
│   ├── login/page.tsx          # Authentication page
│   ├── resident/page.tsx       # Resident interface
│   ├── ra/page.tsx             # RA dashboard
│   ├── admin/page.tsx          # Admin panel
│   ├── layout.tsx              # Root layout with AuthProvider
│   └── page.tsx                # Role-based routing
├── lib/
│   ├── firebase.ts             # Firebase configuration
│   ├── AuthContext.tsx         # Auth context provider
│   ├── types.ts                # TypeScript interfaces
│   └── utils.ts                # Utility functions (Haversine, GPS confidence)
├── scripts/
│   └── seed.ts                 # Database seeding script
└── .env.local.example          # Environment variables template
```

## 🔒 Security Considerations

**⚠️ This is an MVP for demonstration purposes. Production deployment requires:**

1. **Firestore Security Rules**: Currently in test mode. Add proper rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth.uid == userId;
       }
       match /incidents/{incidentId} {
         allow read: if request.auth != null;
         allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ra';
       }
       match /attendance/{attendanceId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null;
       }
       // Add more rules for other collections
     }
   }
   ```

2. **Environment Variables**: Never commit `.env.local` to version control
3. **Admin Role**: Implement proper admin authentication
4. **Rate Limiting**: Add rate limits for check-in operations
5. **GPS Spoofing**: Implement server-side validation and anomaly detection

## 🧪 Testing GPS Functionality

### Option 1: Modify Checkpoint Location (Easiest)
1. Login as admin (or RA)
2. Go to `/admin`
3. Edit checkpoint coordinates to your current location
4. Use Google Maps > Right-click > "What's here?" to get coordinates

### Option 2: Mock Geolocation in Browser
1. Open Chrome DevTools > Sensors (Ctrl+Shift+P > "Show Sensors")
2. Set custom location near checkpoint (1.2927, 103.7733)
3. Refresh resident page and test check-in

### Option 3: Physical Testing
1. Deploy to production or use ngrok for HTTPS
2. Access on mobile device
3. Visit actual checkpoint location

## 🐛 Troubleshooting

### "Location permission denied"
- Check browser location permissions
- Ensure HTTPS (required for geolocation API)
- Try different browser

### "Firebase: Error (auth/...)"
- Verify `.env.local` credentials
- Check Firebase Authentication is enabled
- Ensure Email/Password provider is active

### Seed script fails
- Verify `GOOGLE_APPLICATION_CREDENTIALS` is set
- Check Firebase project ID matches `.env.local`
- Ensure Firestore is enabled

### Real-time updates not working
- Check Firestore rules allow read access
- Verify network connectivity
- Check browser console for errors

## 📊 Database Schema

### Collections

- **hostels**: Hostel metadata
- **blocks**: Block metadata
- **floors**: Floor metadata
- **checkpoints**: GPS coordinates and radius per floor
- **users**: User profiles with role and location assignment
- **incidents**: Evacuation incidents with status and timestamps
- **attendance**: Check-in records with GPS data or manual reason
- **auditLogs**: RA action logs for accountability

## 🎨 Design Decisions

1. **No Background Tracking**: Privacy-first approach - location only checked on demand
2. **100m Radius**: Balance between accuracy and practical outdoor GPS limitations
3. **GPS Confidence Levels**: 
   - High: ≤25m accuracy
   - Medium: 26-50m accuracy
   - Low: >50m accuracy (flagged for RA review)
4. **Manual Override**: RAs can mark residents present with required reason
5. **Real-time Sync**: Firestore listeners ensure all RAs see updates instantly

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm run build
# Deploy to Vercel
vercel --prod
```

### Environment Variables on Vercel
Add all `NEXT_PUBLIC_FIREBASE_*` variables in Vercel project settings.

## 📝 License

MIT License - Built for NUS Hackathon MVP Demo

## 👥 Demo Accounts Summary

| Role | Email | Password | Floor | Room |
|------|-------|----------|-------|------|
| RA | ra.floor3@e.ntu.edu.sg | Demo123! | Floor 3 | - |
| RA | ra.floor4@e.ntu.edu.sg | Demo123! | Floor 4 | - |
| Resident | resident1.f3@e.ntu.edu.sg | Demo123! | Floor 3 | 301 |
| Resident | resident2.f3@e.ntu.edu.sg | Demo123! | Floor 3 | 302 |
| Resident | resident1.f4@e.ntu.edu.sg | Demo123! | Floor 4 | 401 |
| Resident | resident2.f4@e.ntu.edu.sg | Demo123! | Floor 4 | 402 |

*12 total residents across 2 floors*

---

**Built with ❤️ for NUS Hostel Safety**
