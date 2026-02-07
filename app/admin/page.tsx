'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { collection, query, onSnapshot, updateDoc, doc, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Checkpoint, Floor } from '@/lib/types';

export default function AdminPage() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  const [floors, setFloors] = useState<Floor[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [saving, setSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch floors
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'floors'), (snapshot) => {
      const floorList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      } as Floor));
      setFloors(floorList);
    });

    return () => unsubscribe();
  }, []);

  // Fetch checkpoints
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'checkpoints'), (snapshot) => {
      const checkpointList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      } as Checkpoint));
      setCheckpoints(checkpointList);
    });

    return () => unsubscribe();
  }, []);

  const handleEdit = (checkpoint: Checkpoint) => {
    setEditingCheckpoint(checkpoint);
    setLatitude(checkpoint.latitude.toString());
    setLongitude(checkpoint.longitude.toString());
    setRadius(checkpoint.radiusMeters.toString());
  };

  const handleSave = async () => {
    if (!editingCheckpoint) return;
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      alert('Please enter valid numbers');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'checkpoints', editingCheckpoint.id), {
        latitude: lat,
        longitude: lng,
        radiusMeters: rad,
        updatedAt: new Date(),
      });
      
      setEditingCheckpoint(null);
      setLatitude('');
      setLongitude('');
      setRadius('100');
    } catch (error) {
      console.error('Failed to update checkpoint:', error);
      alert('Failed to update checkpoint');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingCheckpoint(null);
    setLatitude('');
    setLongitude('');
    setRadius('100');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-600">Checkpoint Configuration</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Note:</span> Configure evacuation checkpoint locations for each floor. 
            Residents must be within the specified radius to check in via GPS.
          </p>
        </div>

        {/* Checkpoints Table */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900">Checkpoints</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latitude</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Longitude</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Radius (m)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {checkpoints.map((checkpoint) => {
                  const floor = floors.find(f => f.id === checkpoint.floorId);
                  const isEditing = editingCheckpoint?.id === checkpoint.id;

                  return (
                    <tr key={checkpoint.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {floor?.name || checkpoint.floorId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.000001"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        ) : (
                          checkpoint.latitude.toFixed(6)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.000001"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        ) : (
                          checkpoint.longitude.toFixed(6)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {isEditing ? (
                          <input
                            type="number"
                            value={radius}
                            onChange={(e) => setRadius(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        ) : (
                          checkpoint.radiusMeters
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="text-green-600 hover:text-green-800 font-medium disabled:text-green-300"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={saving}
                              className="text-gray-600 hover:text-gray-800 font-medium disabled:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(checkpoint)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reference Coordinates */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Reference Coordinates</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><span className="font-medium">Temasek Hall (approx):</span> 1.2926, 103.7733</p>
            <p className="text-xs text-gray-500 mt-2">
              Tip: Use Google Maps to find exact coordinates. Right-click on a location and select "What's here?"
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
