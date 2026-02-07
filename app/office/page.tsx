"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function OfficeResidencePage() {
  const params = useParams();
  const hostelId = String(params.hostelId);

  const [hostelName, setHostelName] = useState(hostelId);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [blockCount, setBlockCount] = useState(0);
  const [floorCount, setFloorCount] = useState(0);

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

        // blocks / floors counts (so we can start incidents later)
        const blocksSnap = await getDocs(
          query(collection(db, "blocks"), where("hostelId", "==", hostelId))
        );
        const floorsSnap = await getDocs(
          query(collection(db, "floors"), where("hostelId", "==", hostelId))
        );

        setBlockCount(blocksSnap.size);
        setFloorCount(floorsSnap.size);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [hostelId]);

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
        <Link href="/office" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          ← Back
        </Link>
      </div>

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
    </main>
  );
}
