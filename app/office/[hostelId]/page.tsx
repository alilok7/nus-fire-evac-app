"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import {
  fetchCheckpoints,
  createCheckpoint,
  removeCheckpoint,
  Checkpoint,
} from "@/lib/checkpointService";

import { useJsApiLoader } from "@react-google-maps/api";
import PlaceSearch from "@/components/PlaceSearch";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// (optional but good practice) keep this outside the component
const GOOGLE_LIBRARIES: ("places")[] = ["places"];

export default function OfficeResidencePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const hostelId = String(params.hostelId);

  // ✅ Step D: load Google Maps JS + Places library
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_LIBRARIES,
  });

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [cpName, setCpName] = useState("");
  const [cpLat, setCpLat] = useState("");
  const [cpLng, setCpLng] = useState("");
  const [cpRadius, setCpRadius] = useState("80");

  const [hostelName, setHostelName] = useState(hostelId);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [raStudentId, setRaStudentId] = useState("");
  const [raAssignments, setRaAssignments] = useState<{ id: string; raStudentId: string; hostelId: string }[]>([]);
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [activeIncident, setActiveIncident] = useState<{ id: string; startedAt: Timestamp } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !profile || profile.role !== "office")) {
      router.push("/login");
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        // hostel name
        const hostelSnap = await getDoc(doc(db, "hostels", hostelId));
        if (hostelSnap.exists()) {
          const data = hostelSnap.data() as any;
          setHostelName(data?.name || hostelId);
        } else {
          setHostelName(hostelId);
        }

        // checkpoints
        const cps = await fetchCheckpoints(hostelId);
        setCheckpoints(cps);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [hostelId]);

  useEffect(() => {
    const q = query(
      collection(db, "incidents"),
      where("hostelId", "==", hostelId),
      where("status", "==", "active")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        setActiveIncident({
          id: doc.id,
          startedAt: data.startedAt as Timestamp,
        });
      } else {
        setActiveIncident(null);
      }
    });
    return () => unsub();
  }, [hostelId]);

  useEffect(() => {
    const q = query(
      collection(db, "raAssignments"),
      where("hostelId", "==", hostelId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data() as { raStudentId: string; hostelId: string };
        return { id: d.id, raStudentId: data.raStudentId, hostelId: data.hostelId };
      });
      setRaAssignments(list);
    });
    return () => unsub();
  }, [hostelId]);

  const handleAddRaAssignment = async () => {
    if (!raStudentId.trim()) {
      alert("Enter RA Student ID");
      return;
    }
    setAssignmentBusy(true);
    try {
      await addDoc(collection(db, "raAssignments"), {
        raStudentId: raStudentId.trim(),
        hostelId,
      });
      setRaStudentId("");
    } catch (e: unknown) {
      const err = e as Error;
      console.error(e);
      alert(err?.message || "Failed to add assignment");
    } finally {
      setAssignmentBusy(false);
    }
  };

  const handleAddCheckpoint = async () => {
    if (!cpName.trim()) return alert("Enter checkpoint name");
    if (!cpLat.trim() || !cpLng.trim()) return alert("Enter lat and lng");

    const lat = Number(cpLat);
    const lng = Number(cpLng);
    const radiusMeters = Number(cpRadius);

    if (Number.isNaN(lat) || Number.isNaN(lng))
      return alert("Lat/Lng must be numbers");
    if (Number.isNaN(radiusMeters) || radiusMeters <= 0)
      return alert("Radius must be > 0");

    try {
      setBusy(true);

      await createCheckpoint({
        hostelId,
        name: cpName.trim(),
        lat,
        lng,
        radiusMeters,
      });

      const cps = await fetchCheckpoints(hostelId);
      setCheckpoints(cps);

      setCpName("");
      setCpLat("");
      setCpLng("");
      setCpRadius("80");
    } catch (e) {
      console.error(e);
      alert("Failed to create checkpoint");
    } finally {
      setBusy(false);
    }
  };

  const startResidenceIncident = async () => {
    setBusy(true);
    setError(null);

    try {
      const existing = await getDocs(
        query(
          collection(db, "incidents"),
          where("hostelId", "==", hostelId),
          where("status", "==", "active")
        )
      );
      if (!existing.empty) {
        alert("An incident is already active for this residence.");
        return;
      }

      await addDoc(collection(db, "incidents"), {
        hostelId,
        status: "active",
        startedAt: Timestamp.now(),
      });

      alert("Incident started for this residence.");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const endAllActiveIncidents = async () => {
    setBusy(true);
    setError(null);

    try {
      const activeSnap = await getDocs(
        query(
          collection(db, "incidents"),
          where("hostelId", "==", hostelId),
          where("status", "==", "active")
        )
      );

      await Promise.all(
        activeSnap.docs.map(async (d) => {
          await updateDoc(doc(db, "incidents", d.id), {
            status: "ended",
            endedAt: Timestamp.now(),
          });
        })
      );

      alert(`Ended ${activeSnap.size} active incident(s).`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Link
          href="/office"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
        >
          ← Back to Residences
        </Link>
      </motion.div>

      {/* CARD 1: Hostel Info + Incidents */}
      <motion.div
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">{hostelName}</h1>
        <p className="text-sm text-gray-600 mt-1">Residence ID: {hostelId}</p>

        {activeIncident && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <div className="h-3 w-3 shrink-0 rounded-full bg-red-500 animate-pulse" />
            <div>
              <p className="font-semibold text-red-900">Active incident in progress</p>
              <p className="text-sm text-red-700">
                Started at{" "}
                {activeIncident.startedAt instanceof Timestamp
                  ? activeIncident.startedAt.toDate().toLocaleTimeString()
                  : new Date(activeIncident.startedAt as any).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={startResidenceIncident}
            disabled={busy}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {busy ? "Working..." : "Start incident (whole residence)"}
          </button>

          <button
            onClick={endAllActiveIncidents}
            disabled={busy}
            className="bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {busy ? "Working..." : "End all active incidents"}
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="font-semibold">Error</div>
            <div className="mt-1">{error}</div>
          </div>
        )}
      </motion.div>

      {/* CARD 2: Assign RA to accommodation */}
      <motion.div
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-semibold text-gray-900 mb-3">Assign RA to this accommodation</h2>
        <p className="text-sm text-gray-600 mb-4">
          Assign an RA (by student ID) to this accommodation. The RA will see all residents in {hostelName} on their dashboard.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="raStudentId" className="block text-xs font-medium text-gray-600 mb-1">RA Student ID</label>
            <input
              id="raStudentId"
              value={raStudentId}
              onChange={(e) => setRaStudentId(e.target.value)}
              placeholder="e.g. A0001001X"
              className="border rounded-lg px-3 py-2 w-40"
            />
          </div>
          <button
            onClick={handleAddRaAssignment}
            disabled={assignmentBusy}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {assignmentBusy ? "Adding..." : "Add assignment"}
          </button>
        </div>
        {raAssignments.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">RAs assigned to this accommodation:</p>
            <ul className="divide-y border rounded-lg">
              {raAssignments.map((a) => (
                <li key={a.id} className="px-3 py-2 text-sm text-gray-800">
                  RA {a.raStudentId}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

      {/* CARD 3: Checkpoints */}
      <motion.div
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="font-semibold text-gray-900 mb-3">Checkpoints</h2>

        {/* ✅ Google Places search bar */}
        {isLoaded ? (
          <div className="mb-3">
            <PlaceSearch
              onPick={({ name, lat, lng }) => {
                if (!cpName.trim()) setCpName(name);
                setCpLat(String(lat));
                setCpLng(String(lng));
              }}
            />
            <p className="text-xs text-gray-500 mt-2">
              Search a place, select it, and we’ll auto-fill latitude/longitude.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mb-3">Loading map search…</p>
        )}

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={cpName}
            onChange={(e) => setCpName(e.target.value)}
            placeholder="Checkpoint name"
            className="border rounded-lg px-3 py-2 md:col-span-2"
          />
          <input
            value={cpLat}
            onChange={(e) => setCpLat(e.target.value)}
            placeholder="Latitude"
            className="border rounded-lg px-3 py-2"
          />
          <input
            value={cpLng}
            onChange={(e) => setCpLng(e.target.value)}
            placeholder="Longitude"
            className="border rounded-lg px-3 py-2"
          />
          <input
            value={cpRadius}
            onChange={(e) => setCpRadius(e.target.value)}
            placeholder="Radius (m)"
            className="border rounded-lg px-3 py-2"
          />
        </div>

        <button
          onClick={handleAddCheckpoint}
          disabled={busy}
          className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg"
        >
          {busy ? "Saving..." : "Add checkpoint"}
        </button>

        {/* List */}
        <div className="mt-5">
          {checkpoints.length === 0 ? (
            <p className="text-sm text-gray-600">No checkpoints yet.</p>
          ) : (
            <ul className="divide-y">
              {checkpoints.map((cp) => (
                <li
                  key={cp.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">{cp.name}</div>
                    <div className="text-xs text-gray-500">
                      {cp.lat}, {cp.lng} · radius {cp.radiusMeters}m
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await removeCheckpoint(cp.id);
                        const cps = await fetchCheckpoints(hostelId);
                        setCheckpoints(cps);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="text-red-600 font-semibold"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}
