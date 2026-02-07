/**
 * Seed script for EvacTrack
 * Run with: npx tsx scripts/seed.ts
 *
 * What it does:
 * 1) Seeds ALL NUS residences into Firestore (hostels collection)
 *    - Halls, Houses, Residential Colleges, Student Residences
 * 2) For each residence, creates a basic structure so the app can work:
 *    - 1 block (Block A)
 *    - 3 floors (Floor 1-3)
 *    - 3 checkpoints (one per floor) with a safe default coordinate near NUS
 * 3) Keeps the existing Temasek demo accounts (RAs + residents) so you can log in immediately.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { NUS_RESIDENCES } from '../lib/nusResidences';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const auth = getAuth();
const db = getFirestore();

const DEMO_PASSWORD = 'Demo123!';

// Demo data structure
const hostelId = 'temasek-hall';
const blockId = 'block-a';
const floor3Id = 'floor-3';
const floor4Id = 'floor-4';

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
  role: 'resident' | 'ra';
  floorId: string;
  roomNumber?: string;
}

const demoUsers: DemoUser[] = [
  // Floor 3 RA
  { email: 'ra.floor3@e.ntu.edu.sg', studentId: 'A0001001X', role: 'ra', floorId: floor3Id },
  
  // Floor 3 Residents
  { email: 'resident1.f3@e.ntu.edu.sg', studentId: 'A0101001A', role: 'resident', floorId: floor3Id, roomNumber: '301' },
  { email: 'resident2.f3@e.ntu.edu.sg', studentId: 'A0101002B', role: 'resident', floorId: floor3Id, roomNumber: '302' },
  { email: 'resident3.f3@e.ntu.edu.sg', studentId: 'A0101003C', role: 'resident', floorId: floor3Id, roomNumber: '303' },
  { email: 'resident4.f3@e.ntu.edu.sg', studentId: 'A0101004D', role: 'resident', floorId: floor3Id, roomNumber: '304' },
  { email: 'resident5.f3@e.ntu.edu.sg', studentId: 'A0101005E', role: 'resident', floorId: floor3Id, roomNumber: '305' },
  { email: 'resident6.f3@e.ntu.edu.sg', studentId: 'A0101006F', role: 'resident', floorId: floor3Id, roomNumber: '306' },
  
  // Floor 4 RA
  { email: 'ra.floor4@e.ntu.edu.sg', studentId: 'A0001002Y', role: 'ra', floorId: floor4Id },
  
  // Floor 4 Residents
  { email: 'resident1.f4@e.ntu.edu.sg', studentId: 'A0102001G', role: 'resident', floorId: floor4Id, roomNumber: '401' },
  { email: 'resident2.f4@e.ntu.edu.sg', studentId: 'A0102002H', role: 'resident', floorId: floor4Id, roomNumber: '402' },
  { email: 'resident3.f4@e.ntu.edu.sg', studentId: 'A0102003I', role: 'resident', floorId: floor4Id, roomNumber: '403' },
  { email: 'resident4.f4@e.ntu.edu.sg', studentId: 'A0102004J', role: 'resident', floorId: floor4Id, roomNumber: '404' },
  { email: 'resident5.f4@e.ntu.edu.sg', studentId: 'A0102005K', role: 'resident', floorId: floor4Id, roomNumber: '405' },
  { email: 'resident6.f4@e.ntu.edu.sg', studentId: 'A0102006L', role: 'resident', floorId: floor4Id, roomNumber: '406' },
];

async function seed() {
  console.log('🌱 Starting seed process...\n');

  try {
    // 1) Seed ALL NUS residences
    console.log('🏠 Seeding NUS residences (hostels)...');
    for (const r of NUS_RESIDENCES) {
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
    console.log(`✅ Seeded ${NUS_RESIDENCES.length} residences\n`);

    // 2) Create a basic structure (Block A + Floor 1-3 + checkpoints) for every residence.
    // IMPORTANT: Block/Floor document IDs must be globally unique (top-level collections),
    // so we prefix them with the hostelId.
    console.log('🏗️  Creating blocks, floors, checkpoints for each residence...');

    for (const r of NUS_RESIDENCES) {
      // Keep legacy Temasek IDs so existing demo accounts still work.
      const isTemasekDemo = r.id === hostelId;
      const blockDocId = isTemasekDemo ? blockId : `${r.id}-block-a`;

      await db.collection('blocks').doc(blockDocId).set(
        {
          id: blockDocId,
          hostelId: r.id,
          name: 'Block A',
          createdAt: Timestamp.now(),
        },
        { merge: true }
      );

      // Floors + checkpoints
      const floorNumbers = isTemasekDemo ? [3, 4] : [1, 2, 3];
      for (const n of floorNumbers) {
        const floorDocId = isTemasekDemo ? `floor-${n}` : `${r.id}-floor-${n}`;

        await db.collection('floors').doc(floorDocId).set(
          {
            id: floorDocId,
            hostelId: r.id,
            blockId: blockDocId,
            name: `Floor ${n}`,
            createdAt: Timestamp.now(),
          },
          { merge: true }
        );

        const checkpointId = `checkpoint-${floorDocId}`;
        const isTemasek = isTemasekDemo;
        await db.collection('checkpoints').doc(checkpointId).set(
          {
            id: checkpointId,
            hostelId: r.id,
            blockId: blockDocId,
            floorId: floorDocId,
            latitude: isTemasek ? TEMASEK_LAT + n * 0.00001 : DEFAULT_NUS_LAT,
            longitude: isTemasek ? TEMASEK_LNG : DEFAULT_NUS_LNG,
            radiusMeters: isTemasek ? 100 : DEFAULT_RADIUS_METERS,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
      }
    }

    console.log('✅ Blocks, floors, checkpoints created\n');

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
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: demoUser.email,
          studentId: demoUser.studentId,
          role: demoUser.role,
          hostelId,
          blockId,
          floorId: demoUser.floorId,
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

    console.log('\n✨ Seed completed successfully!\n');
    console.log('📋 Demo Accounts:');
    console.log('   All accounts use password: Demo123!\n');
    console.log('   RAs:');
    console.log('   - ra.floor3@e.ntu.edu.sg (Floor 3)');
    console.log('   - ra.floor4@e.ntu.edu.sg (Floor 4)\n');
    console.log('   Residents (sample):');
    console.log('   - resident1.f3@e.ntu.edu.sg (Floor 3, Room 301)');
    console.log('   - resident1.f4@e.ntu.edu.sg (Floor 4, Room 401)\n');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
