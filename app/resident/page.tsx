'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { collection, query, where, onSnapshot, addDoc, getDocs, Timestamp,  doc, setDoc, updateDoc  } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Incident, Checkpoint, AttendanceRecord, LocationState, HelpRequest } from '@/lib/types';
import { getCurrentPosition, calculateDistance, formatDistance, getGPSConfidence } from '@/lib/utils';


export default function ResidentPage() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
 
  const [incident, setIncident] = useState<Incident | null>(null);
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [helpRequest, setHelpRequest] = useState<HelpRequest | null>(null);


  // Redirect if not authenticated or not a resident
  useEffect(() => {
    if (!authLoading && (!user || !profile || profile.role !== 'resident')) {
      router.push('/login');
    }
  }, [user, profile, authLoading, router]);

  // Listen to active incident for this resident's floor
  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'incidents'),
      where('hostelId', '==', profile.hostelId),
      where('blockId', '==', profile.blockId),
      where('floorId', '==', profile.floorId),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const incidentData = snapshot.docs[0].data() as Incident;
        setIncident({ ...incidentData, id: snapshot.docs[0].id });
      } else {
        setIncident(null);
        setAttendance(null);
      }
    });

    return () => unsubscribe();
  }, [profile]);

  // Fetch checkpoint when incident is active
  useEffect(() => {
    if (!incident || !profile) return;

    const fetchCheckpoint = async () => {
      const q = query(
        collection(db, 'checkpoints'),
        where('hostelId', '==', profile.hostelId),
        where('blockId', '==', profile.blockId),
        where('floorId', '==', profile.floorId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const checkpointData = snapshot.docs[0].data() as Checkpoint;
        setCheckpoint({ ...checkpointData, id: snapshot.docs[0].id });
      }
    };

    fetchCheckpoint();
  }, [incident, profile]);

  // Listen to attendance record for current incident
  useEffect(() => {
    if (!incident || !user) return;

    const q = query(
      collection(db, 'attendance'),
      where('incidentId', '==', incident.id),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const attendanceData = snapshot.docs[0].data() as AttendanceRecord;
        setAttendance({ ...attendanceData, id: snapshot.docs[0].id });
      } else {
        setAttendance(null);
      }
    });

    return () => unsubscribe();
  }, [incident, user]);

  // Get location on page load if incident is active
  useEffect(() => {
    if (incident && !attendance && checkpoint) {
      getLocation();
    }
  }, [incident, attendance, checkpoint]);

  const getLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
   
    try {
      const position = await getCurrentPosition();
      const newLocation: LocationState = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      setLocation(newLocation);

      // Calculate distance to checkpoint
      if (checkpoint) {
        const dist = calculateDistance(
          newLocation.latitude,
          newLocation.longitude,
          checkpoint.latitude,
          checkpoint.longitude
        );
        setDistance(dist);
      }
    } catch (error: any) {
      setLocationError(error.message);
    } finally {
      setLocationLoading(false);
    }
  };
 
  useEffect(() => {
  if (!incident || !user) return;

  const ref = doc(db, 'helpRequests', `${incident.id}_${user.uid}`);
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) setHelpRequest({ ...(snap.data() as any), id: snap.id });
    else setHelpRequest(null);
  });

  return () => unsub();
}, [incident, user]);

  const handleCheckIn = async () => {
    if (!incident || !checkpoint || !location || !user || !profile) return;

    const dist = calculateDistance(
      location.latitude,
      location.longitude,
      checkpoint.latitude,
      checkpoint.longitude
    );

    if (dist > checkpoint.radiusMeters) {
      setLocationError(`You are ${formatDistance(dist)} away from the checkpoint. You must be within ${checkpoint.radiusMeters}m to check in.`);
      return;
    }

    setCheckingIn(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        incidentId: incident.id,
        userId: user.uid,
        studentId: profile.studentId,
        accountedAt: Timestamp.now(),
        method: 'gps',
        latitude: location.latitude,
        longitude: location.longitude,
        gpsAccuracy: location.accuracy,
      });
    } catch (error: any) {
      setLocationError('Failed to check in: ' + error.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const requestHelp = async () => {
  if (!incident || !user || !profile) return;

  await setDoc(doc(db, 'helpRequests', `${incident.id}_${user.uid}`), {
    incidentId: incident.id,
    userId: user.uid,
    studentId: profile.studentId,
    roomNumber: profile.roomNumber || null,
    status: 'open',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    });
  };

  const resolveHelp = async () => {
    if (!incident || !user) return;

    await updateDoc(doc(db, 'helpRequests', `${incident.id}_${user.uid}`), {
      status: 'resolved',
      updatedAt: Timestamp.now(),
    });
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canCheckIn = incident && checkpoint && location && distance !== null && distance <= checkpoint.radiusMeters && !attendance;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">EvacTrack</h1>
            <p className="text-sm text-gray-600">{profile.studentId} • {profile.roomNumber}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Incident Status Card */}
        <div className={`rounded-xl p-6 ${incident ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${incident ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <h2 className="text-lg font-bold text-gray-900">
              {incident ? 'EVACUATION IN PROGRESS' : 'No Active Incident'}
            </h2>
          </div>
          <p className="text-sm text-gray-700">
            {incident
              ? `Evacuation started at ${incident.startedAt instanceof Timestamp ? incident.startedAt.toDate().toLocaleTimeString() : new Date(incident.startedAt).toLocaleTimeString()}`
              : 'You will be notified when an evacuation is initiated.'}
          </p>
        </div>

        {/* Attendance Status */}
        {incident && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Attendance Status</h3>
           
            {attendance ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-green-900">You are accounted for!</span>
                </div>
                <p className="text-sm text-green-700">
                  Checked in at {attendance.accountedAt instanceof Timestamp ? attendance.accountedAt.toDate().toLocaleTimeString() : new Date(attendance.accountedAt).toLocaleTimeString()}
                  {attendance.method === 'gps' && attendance.gpsAccuracy && (
                    <span className="ml-2">
                      (GPS accuracy: {Math.round(attendance.gpsAccuracy)}m)
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-semibold text-yellow-900">Not yet accounted</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Please proceed to the evacuation checkpoint and check in.
                </p>
              </div>
            )}
          </div>
        )}
       
        {/* Emergency */}
        {incident && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Emergency</h3>

            {helpRequest?.status === 'open' ? (
              <button
                onClick={resolveHelp}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-lg"
              >
                I’m safe now (cancel help request)
              </button>
            ) : (
              <button
                onClick={requestHelp}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg"
              >
                I NEED HELP
              </button>
            )}

            <p className="text-xs text-gray-500 mt-2">
              This alerts the RA for your floor and shows your room number.
            </p>
          </div>
        )}


        {/* Location & Check-in */}
        {incident && checkpoint && !attendance && (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Check-in</h3>

            {/* Checkpoint Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">Evacuation Checkpoint</p>
              <p className="text-xs text-blue-700">
                {profile.floorId.replace('-', ' ').toUpperCase()} • {checkpoint.radiusMeters}m radius
              </p>
            </div>

            {/* Location Status */}
            {location && distance !== null && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Distance to checkpoint:</span>
                  <span className={`font-semibold ${distance <= checkpoint.radiusMeters ? 'text-green-600' : 'text-red-600'}`}>
                    {formatDistance(distance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">GPS accuracy:</span>
                  <span className="font-semibold text-gray-900">
                    ±{Math.round(location.accuracy)}m
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${
                      getGPSConfidence(location.accuracy) === 'high' ? 'bg-green-100 text-green-700' :
                      getGPSConfidence(location.accuracy) === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {getGPSConfidence(location.accuracy)}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {locationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {locationError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={getLocation}
                disabled={locationLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition"
              >
                {locationLoading ? 'Getting location...' : location ? 'Retry Location' : 'Get My Location'}
              </button>

              {canCheckIn && (
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-lg transition"
                >
                  {checkingIn ? 'Checking in...' : 'Check In Now'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Info Card */}
        {!incident && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex gap-2">
                <span>1.</span>
                <span>When an evacuation is initiated, you will see an alert on this page.</span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span>Proceed to your floor's evacuation checkpoint.</span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span>Use the "Get My Location" button and check in when within 100m of the checkpoint.</span>
              </li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}