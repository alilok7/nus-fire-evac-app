"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

  const [blockCount, setBlockCount] = useState(0);
  const [floorCount, setFloorCount] = useState(0);

  const [raStudentId, setRaStudentId] = useState("");
  const [raAssignments, setRaAssignments] = useState<{ id: string; raStudentId: string; hostelId: string }[]>([]);
  const [assignmentBusy, setAssignmentBusy] = useState(false);

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

        // blocks
        const blocksSnap = await getDocs(
          query(collection(db, "blocks"), where("hostelId", "==", hostelId))
        );

        // floors
        const floorsSnap = await getDocs(
          query(collection(db, "floors"), where("hostelId", "==", hostelId))
        );

        setBlockCount(blocksSnap.size);
        setFloorCount(floorsSnap.size);

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
      const floorsSnap = await getDocs(
        query(collection(db, "floors"), where("hostelId", "==", hostelId))
      );

      if (floorsSnap.size === 0) {
        alert("No floors exist for this residence yet. Create floors first.");
        return;
      }

      await Promise.all(
        floorsSnap.docs.map(async (d) => {
          const f = d.data() as any;
          await addDoc(collection(db, "incidents"), {
            hostelId,
            blockId: f.blockId,
            floorId: d.id,
            status: "active",
            startedAt: Timestamp.now(),
          });
        })
      );

      alert(`Started incidents for ${floorsSnap.size} floors.`);
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
            status: "resolved",
            resolvedAt: Timestamp.now(),
          });
        })
      );

      alert(`Ended ${activeSnap.size} active incidents.`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/office"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back
        </Link>
      </div>

      {/* CARD 1: Hostel Info + Incidents */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900">{hostelName}</h1>
        <p className="text-sm text-gray-600 mt-1">Residence ID: {hostelId}</p>

        <div className="mt-4 text-sm text-gray-700">
          {loading ? (
            <p>Loading blocks/floors…</p>
          ) : (
            <p>
              Blocks: <b>{blockCount}</b> · Floors: <b>{floorCount}</b>
            </p>
          )}
        </div>

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
      </div>

      {/* CARD 2: Assign RA to accommodation */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
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
      </div>

      {/* CARD 3: Checkpoints */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
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
      </div>
    </main>
  );
}
