/**
 * Seed script for NUSNextAlert
 * Run with: npx tsx scripts/seed.ts
 *
 * 1. Put serviceAccountKey.json in project root (from Firebase Console > Project Settings > Service Accounts > Generate new private key)
 * 2. Or set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local to the path of your key file
 * 3. Or set GOOGLE_APPLICATION_CREDENTIALS to the path of your key file
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { existsSync, readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { NUS_RESIDENCES } from '../lib/nusResidences';

// Resolve service account key path
const defaultPaths = ['serviceAccountKey.json', 'serviceAccount.json'];
const credPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  defaultPaths.map((p) => join(process.cwd(), p)).find((p) => existsSync(p));

// Initialize Firebase Admin
if (getApps().length === 0) {
  const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').trim();
  if (credPath && existsSync(credPath)) {
    const serviceAccount = JSON.parse(readFileSync(credPath, 'utf-8'));
    initializeApp({ credential: cert(serviceAccount), projectId: projectId || serviceAccount.project_id });
  } else {
    if (!projectId) {
      console.error('❌ Missing: Set NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local');
      console.error('   And put serviceAccount.json or serviceAccountKey.json in project root, or set GOOGLE_APPLICATION_CREDENTIALS');
      process.exit(1);
    }
    initializeApp({ projectId });
  }
}

const auth = getAuth();
const db = getFirestore();

const DEMO_PASSWORD = 'Demo123!';

// Demo residence (Temasek Hall)
const hostelId = 'temasek-hall';

// NUS coordinates (approximate - Temasek Hall)
const TEMASEK_LAT = 1.2926;
const TEMASEK_LNG = 103.7733;

// Generic fallback checkpoint near NUS Kent Ridge campus.
// These are intentionally "good enough" defaults so GPS check-in isn't blocked.
// You should update exact coordinates per residence in /admin.
const DEFAULT_NUS_LAT = 1.2966;
const DEFAULT_NUS_LNG = 103.7764;
const DEFAULT_RADIUS_METERS = 300;

interface DemoUser {
  email: string;
  studentId: string;
  role: 'resident' | 'ra' | 'office';
  roomNumber?: string;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const HOSTEL_DOCS = NUS_RESIDENCES.map((name) => ({
  id: slugify(name),
  name,
  model: 'hall',
}));

const demoUsers: DemoUser[] = [
  // Office - can assign RA access
  { email: 'office@e.ntu.edu.sg', studentId: 'OFFICE001', role: 'office' },
  // RAs
  { email: 'ra.floor3@e.ntu.edu.sg', studentId: 'A0001001X', role: 'ra' },
  { email: 'ra.floor4@e.ntu.edu.sg', studentId: 'A0001002Y', role: 'ra' },
  // Residents
  { email: 'resident1.f3@e.ntu.edu.sg', studentId: 'A0101001A', role: 'resident', roomNumber: '301' },
  { email: 'resident2.f3@e.ntu.edu.sg', studentId: 'A0101002B', role: 'resident', roomNumber: '302' },
  { email: 'resident3.f3@e.ntu.edu.sg', studentId: 'A0101003C', role: 'resident', roomNumber: '303' },
  { email: 'resident4.f3@e.ntu.edu.sg', studentId: 'A0101004D', role: 'resident', roomNumber: '304' },
  { email: 'resident5.f3@e.ntu.edu.sg', studentId: 'A0101005E', role: 'resident', roomNumber: '305' },
  { email: 'resident6.f3@e.ntu.edu.sg', studentId: 'A0101006F', role: 'resident', roomNumber: '306' },
  { email: 'resident1.f4@e.ntu.edu.sg', studentId: 'A0102001G', role: 'resident', roomNumber: '401' },
  { email: 'resident2.f4@e.ntu.edu.sg', studentId: 'A0102002H', role: 'resident', roomNumber: '402' },
  { email: 'resident3.f4@e.ntu.edu.sg', studentId: 'A0102003I', role: 'resident', roomNumber: '403' },
  { email: 'resident4.f4@e.ntu.edu.sg', studentId: 'A0102004J', role: 'resident', roomNumber: '404' },
  { email: 'resident5.f4@e.ntu.edu.sg', studentId: 'A0102005K', role: 'resident', roomNumber: '405' },
  { email: 'resident6.f4@e.ntu.edu.sg', studentId: 'A0102006L', role: 'resident', roomNumber: '406' },
];

async function seed() {
  console.log('🌱 Starting seed process...\n');

  try {
    // 1) Seed ALL NUS residences
    console.log('🏠 Seeding NUS residences (hostels)...');
    for (const r of HOSTEL_DOCS) {
      await db.collection('hostels').doc(r.id).set(
        {
          id: r.id,
          name: r.name,
          model: r.model,
          createdAt: Timestamp.now(),
        },
        { merge: true }
      );
    }
    console.log(`✅ Seeded ${HOSTEL_DOCS.length} residences\n`);

    // 2) Create one checkpoint per residence (evacuation assembly point)
    console.log('🏗️  Creating checkpoints for each residence...');

    for (const r of HOSTEL_DOCS) {
      const isTemasekDemo = r.id === hostelId;
      const checkpointId = `checkpoint-${r.id}`;
      await db.collection('checkpoints').doc(checkpointId).set(
        {
          id: checkpointId,
          hostelId: r.id,
          name: `${r.name} Assembly Point`,
          lat: isTemasekDemo ? TEMASEK_LAT : DEFAULT_NUS_LAT,
          lng: isTemasekDemo ? TEMASEK_LNG : DEFAULT_NUS_LNG,
          radiusMeters: isTemasekDemo ? 100 : DEFAULT_RADIUS_METERS,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }

    console.log('✅ Checkpoints created\n');

    // 5. Create users
    console.log('👥 Creating users...');
    for (const demoUser of demoUsers) {
      try {
        // Create auth user
        const userRecord = await auth.createUser({
          email: demoUser.email,
          password: DEMO_PASSWORD,
          emailVerified: true,
        });

        // Create user profile
        const isOffice = demoUser.role === 'office';
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: demoUser.email,
          studentId: demoUser.studentId,
          role: demoUser.role,
          hostelId: isOffice ? '' : hostelId,
          roomNumber: demoUser.roomNumber || null,
          createdAt: Timestamp.now(),
        }, { merge: true });

        console.log(`   ✅ ${demoUser.role.toUpperCase()}: ${demoUser.email} (${demoUser.studentId})`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`   ⚠️  User already exists: ${demoUser.email}`);
        } else {
          throw error;
        }
      }
    }

    // 6. Seed raAccess - add A0101001A as demo RA so workflow can be tested
    console.log('🔑 Seeding raAccess (RA access list)...');
    await db.collection('raAccess').doc('a0101001a').set(
      { studentId: 'A0101001A' },
      { merge: true }
    );
    console.log('   ✅ A0101001A has RA access (resident1.f3)\n');

    console.log('✨ Seed completed successfully!\n');
    console.log('📋 Demo Accounts (password: Demo123!):');
    console.log('   Office: office@e.ntu.edu.sg - Assign RA access, manage residences, start incidents\n');
    console.log('   RAs (assign via Office RA Access + RA Assignments):');
    console.log('   - ra.floor3@e.ntu.edu.sg (A0001001X)');
    console.log('   - ra.floor4@e.ntu.edu.sg (A0001002Y)\n');
    console.log('   Residents:');
    console.log('   - resident1.f3@e.ntu.edu.sg (A0101001A) - PRE-ASSIGNED RA in seed');
    console.log('   - resident2.f3@e.ntu.edu.sg (A0101002B) - No RA access\n');
    console.log('   Workflow: 1) Login as Office → assign student ID to RA Access');
    console.log('            2) Login as that student → should have RA access');
    console.log('            3) Login as resident2.f3 → should NOT have RA access\n');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
