'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Incident, UserProfile, AttendanceRecord, ResidentStatus, HelpRequest } from '@/lib/types';
import { getGPSConfidence } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function RAPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
 
  const [incident, setIncident] = useState<Incident | null>(null);
  const [raAssignmentHostelId, setRaAssignmentHostelId] = useState<string | null>(null);
  const [residents, setResidents] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [residentStatuses, setResidentStatuses] = useState<ResidentStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'accounted_gps' | 'accounted_manual' | 'missing'>('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [manualCheckInUser, setManualCheckInUser] = useState<UserProfile | null>(null);
  const [manualReason, setManualReason] = useState('');
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);

  // Redirect if not authenticated or not an RA
  useEffect(() => {
    if (!authLoading && (!user || !profile || profile.role !== 'ra')) {
      router.push('/login');
    }
  }, [user, profile, authLoading, router]);

  // Listen to active incident for this RA's residence (from raAssignment)
  useEffect(() => {
    if (!profile) return;

    const effectiveHostelId = raAssignmentHostelId ?? profile.hostelId;
    if (!effectiveHostelId) return;

    const q = query(
      collection(db, 'incidents'),
      where('hostelId', '==', effectiveHostelId),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const incidentData = snapshot.docs[0].data() as Incident;
        setIncident({ ...incidentData, id: snapshot.docs[0].id });
      } else {
        setIncident(null);
        setAttendance([]);
      }
    });

    return () => unsubscribe();
  }, [profile, raAssignmentHostelId]);

  // Get hostelId from raAssignments or fall back to profile
  useEffect(() => {
    if (!profile) return;

    const unsub = onSnapshot(
      query(collection(db, 'raAssignments'), where('raStudentId', '==', profile.studentId)),
      (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as { hostelId: string };
          setRaAssignmentHostelId(data.hostelId);
        } else {
          setRaAssignmentHostelId(null);
        }
      },
      (err) => console.error('raAssignments listener error:', err)
    );

    return () => unsub();
  }, [profile]);

  // Fetch residents by hostelId (from raAssignment or profile)
  useEffect(() => {
    if (!profile) return;

    const effectiveHostelId = raAssignmentHostelId ?? profile.hostelId;
    const q = query(
      collection(db, 'users'),
      where('hostelId', '==', effectiveHostelId),
      where('role', '==', 'resident')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const residentList = snapshot.docs.map(d => d.data() as UserProfile);
      setResidents(residentList);
    });

    return () => unsubscribe();
  }, [profile, raAssignmentHostelId]);

  // Listen to attendance records for current incident
  useEffect(() => {
    if (!incident) return;

    const q = query(
      collection(db, 'attendance'),
      where('incidentId', '==', incident.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attendanceList = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
      } as AttendanceRecord));
      setAttendance(attendanceList);
    });

    return () => unsubscribe();
  }, [incident]);

  useEffect(() => {
  if (!incident) {
    setHelpRequests([]);
    return;
  }

  const q = query(
    collection(db, 'helpRequests'),
    where('incidentId', '==', incident.id)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as HelpRequest[];
      // filter in code (avoids composite index issues)
      setHelpRequests(list.filter((r) => r.status === 'open'));
      console.log('Help requests (open):', list.filter((r) => r.status === 'open').length);
    },
    (err) => {
      console.error('helpRequests listener error:', err);
    }
  );

  return () => unsub();
}, [incident]);




  // Calculate resident statuses
  useEffect(() => {
    const statuses: ResidentStatus[] = residents.map(resident => {
      const record = attendance.find(a => a.userId === resident.uid);
     
      if (record) {
        const status = record.method === 'gps' ? 'accounted_gps' : 'accounted_manual';
        const gpsConfidence = record.gpsAccuracy ? getGPSConfidence(record.gpsAccuracy) : undefined;
       
        return {
          user: resident,
          status: status as 'accounted_gps' | 'accounted_manual',
          record,
          gpsConfidence,
        };
      }
     
      return {
        user: resident,
        status: 'missing' as const,
      };
    });

    setResidentStatuses(statuses);
  }, [residents, attendance]);

  const handleStartIncident = async () => {
    if (!profile || !user) return;

    const effectiveHostelId = raAssignmentHostelId ?? profile.hostelId;
    if (!effectiveHostelId) return;
   
    setActionLoading(true);
    try {
      const newIncident = await addDoc(collection(db, 'incidents'), {
        hostelId: effectiveHostelId,
        status: 'active',
        startedAt: Timestamp.now(),
        startedBy: user.uid,
      });

      // Log action
      await addDoc(collection(db, 'auditLogs'), {
        incidentId: newIncident.id,
        raUid: user.uid,
        raStudentId: profile.studentId,
        action: 'start_incident',
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error('Failed to start incident:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndIncident = async () => {
    if (!incident || !profile || !user) return;
   
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'incidents', incident.id), {
        status: 'ended',
        endedAt: Timestamp.now(),
        endedBy: user.uid,
      });

      // Log action
      await addDoc(collection(db, 'auditLogs'), {
        incidentId: incident.id,
        raUid: user.uid,
        raStudentId: profile.studentId,
        action: 'end_incident',
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error('Failed to end incident:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!incident || !manualCheckInUser || !user || !profile || !manualReason.trim()) return;
   
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        incidentId: incident.id,
        userId: manualCheckInUser.uid,
        studentId: manualCheckInUser.studentId,
        accountedAt: Timestamp.now(),
        accountedBy: user.uid,
        method: 'manual',
        manualReason: manualReason.trim(),
      });

      // Log action
      await addDoc(collection(db, 'auditLogs'), {
        incidentId: incident.id,
        raUid: user.uid,
        raStudentId: profile.studentId,
        action: 'manual_checkin',
        targetUserId: manualCheckInUser.uid,
        targetStudentId: manualCheckInUser.studentId,
        reason: manualReason.trim(),
        timestamp: Timestamp.now(),
      });

      // Reset form
      setManualCheckInUser(null);
      setManualReason('');
    } catch (error) {
      console.error('Failed to manually check in:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter and search
  const filteredStatuses = residentStatuses.filter(status => {
    const matchesSearch = status.user.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         status.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (status.user.roomNumber && status.user.roomNumber.includes(searchTerm));
   
    const matchesFilter = filterStatus === 'all' || status.status === filterStatus;
   
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: residents.length,
    accountedGPS: residentStatuses.filter(s => s.status === 'accounted_gps').length,
    accountedManual: residentStatuses.filter(s => s.status === 'accounted_manual').length,
    missing: residentStatuses.filter(s => s.status === 'missing').length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
        {/* Incident Controls */}
        <motion.div
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Incident Control</h2>
              <p className="text-sm text-gray-600">
                {incident ? `Active since ${incident.startedAt instanceof Timestamp ? incident.startedAt.toDate().toLocaleTimeString() : new Date(incident.startedAt).toLocaleTimeString()}` : 'No active incident'}
              </p>
            </div>
            <div>
              {incident ? (
                <motion.button
                  onClick={handleEndIncident}
                  disabled={actionLoading}
                  className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition disabled:bg-red-300 hover:bg-red-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  End Incident
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleStartIncident}
                  disabled={actionLoading}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition disabled:bg-blue-300 hover:bg-blue-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start Incident
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Statistics */}
        {incident && (
          <motion.div
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            layout
          >
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-1 text-sm text-gray-600">Total Residents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="mb-1 text-sm text-green-700">Accounted (GPS)</p>
              <p className="text-3xl font-bold text-green-900">{stats.accountedGPS}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="mb-1 text-sm text-blue-700">Accounted (Manual)</p>
              <p className="text-3xl font-bold text-blue-900">{stats.accountedManual}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="mb-1 text-sm text-red-700">Missing</p>
              <motion.p
                className="text-3xl font-bold text-red-900"
                key={stats.missing}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {stats.missing}
              </motion.p>
            </div>
          </motion.div>
        )}
       
        {incident && (
          <motion.div
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="mb-4 font-semibold text-gray-900">Help requests</h3>

            {helpRequests.length === 0 ? (
              <p className="text-sm text-gray-600">No open help requests.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {helpRequests.map((r) => (
                  <motion.li
                    key={r.id}
                    className="flex justify-between py-3 transition-colors hover:bg-gray-50"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className="text-sm font-medium text-gray-900">{r.studentId}</span>
                    <span className="text-sm text-gray-600">Room {r.roomNumber || '-'}</span>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        )}


        {/* Roster Table */}
        {incident && (
          <motion.div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-900 mb-4">Resident Roster</h3>
             
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by student ID, email, or room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="accounted_gps">Accounted (GPS)</option>
                  <option value="accounted_manual">Accounted (Manual)</option>
                  <option value="missing">Missing</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStatuses.map((status) => (
                    <motion.tr
                      key={status.user.uid}
                      className="transition-colors hover:bg-gray-50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ backgroundColor: 'rgba(249, 250, 251, 1)' }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {status.user.studentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {status.user.roomNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status.status === 'accounted_gps' && (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Accounted (GPS)
                            </span>
                            {status.gpsConfidence === 'low' && (
                              <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                                Low GPS
                              </span>
                            )}
                          </div>
                        )}
                        {status.status === 'accounted_manual' && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Accounted (Manual)
                          </span>
                        )}
                        {status.status === 'missing' && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {status.record ? (
                          status.record.accountedAt instanceof Timestamp
                            ? status.record.accountedAt.toDate().toLocaleTimeString()
                            : new Date(status.record.accountedAt).toLocaleTimeString()
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {status.status === 'missing' && (
                          <button
                            onClick={() => setManualCheckInUser(status.user)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Mark Present
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {!incident && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-gray-600">Start an incident to view and manage resident attendance.</p>
          </div>
        )}

      {/* Manual Check-in Modal */}
      <AnimatePresence>
        {manualCheckInUser && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setManualCheckInUser(null); setManualReason(''); }}
          >
            <motion.div
              className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Manual Check-in</h3>
            <p className="text-sm text-gray-600 mb-4">
              Mark <span className="font-semibold">{manualCheckInUser.studentId}</span> as present
            </p>
           
            <textarea
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="Reason for manual check-in (required)"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
            />
           
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setManualCheckInUser(null);
                  setManualReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleManualCheckIn}
                disabled={!manualReason.trim() || actionLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-4 py-2 rounded-lg transition"
              >
                Confirm
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}