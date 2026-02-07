# EvacTrack - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup
1. Go to https://console.firebase.google.com
2. Create new project
3. Enable **Authentication** > Email/Password
4. Enable **Firestore Database** (test mode)
5. Copy config from Project Settings

### 3. Configure Environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your Firebase credentials
```

### 4. Seed Database
```bash
# Download service account key from Firebase Console
# Project Settings > Service Accounts > Generate new private key
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
npm run seed
```

### 5. Run
```bash
npm run dev
```

## 🎮 Quick Demo

### Login Credentials
- **RA**: ra.floor3@e.ntu.edu.sg / Demo123!
- **Resident**: resident1.f3@e.ntu.edu.sg / Demo123!

### Demo Flow (2 minutes)
1. **RA Login** → Start Incident
2. **Resident Login** (new window) → Get Location → Check In
3. **RA Dashboard** → See real-time update → Mark another resident manually
4. **RA** → End Incident

### Testing GPS Check-in
**Option A**: Modify checkpoint location
- Login to `/admin`
- Edit checkpoint to your current location (use Google Maps to get coordinates)

**Option B**: Mock browser location
- Chrome DevTools → Sensors → Set location to `1.2927, 103.7733`

## 🔧 Common Issues

**Seed fails**: Check `GOOGLE_APPLICATION_CREDENTIALS` is set correctly

**Location denied**: Enable location in browser settings, ensure HTTPS

**Real-time not working**: Check Firestore rules allow read access

## 📚 Full Documentation
See [README.md](./README.md) for complete documentation.
