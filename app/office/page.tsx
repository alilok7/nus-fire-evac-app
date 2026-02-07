"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, setDoc, onSnapshot, addDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NUS_RESIDENCES } from "@/lib/nusResidences";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";

type HostelDoc = {
  id: string;
  name: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function OfficePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hostels, setHostels] = useState<HostelDoc[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [raAccessList, setRaAccessList] = useState<{ id: string; studentId: string }[]>([]);
  const [raAccessStudentId, setRaAccessStudentId] = useState("");
  const [raAccessBusy, setRaAccessBusy] = useState(false);
  const [activeIncidentCount, setActiveIncidentCount] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || !profile || profile.role !== "office")) {
      router.push("/login");
    }
  }, [user, profile, authLoading, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hostels;
    return hostels.filter((h) => h.name.toLowerCase().includes(q));
  }, [hostels, search]);

  const loadHostels = async () => {
    const snap = await getDocs(collection(db, "hostels"));
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as HostelDoc[];
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    setHostels(list);
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await loadHostels();
      setLoading(false);
    };
    run();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "raAccess"), (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        studentId: (d.data() as { studentId: string }).studentId,
      }));
      setRaAccessList(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "incidents"), where("status", "==", "active")),
      (snapshot) => setActiveIncidentCount(snapshot.size)
    );
    return () => unsub();
  }, []);

  const handleGrantRaAccess = async () => {
    const sid = raAccessStudentId.trim();
    if (!sid) return alert("Enter student ID");
    if (raAccessList.some((r) => r.studentId === sid)) {
      alert("This student ID already has RA access");
      return;
    }
    setRaAccessBusy(true);
    try {
      await addDoc(collection(db, "raAccess"), { studentId: sid });
      setRaAccessStudentId("");
    } catch (e: unknown) {
      const err = e as Error;
      alert(err?.message || "Failed to grant RA access");
    } finally {
      setRaAccessBusy(false);
    }
  };

  const handleRevokeRaAccess = async (docId: string, studentId: string) => {
    if (!confirm(`Revoke RA access for ${studentId}?`)) return;
    setRaAccessBusy(true);
    try {
      await deleteDoc(doc(db, "raAccess", docId));
    } catch (e: unknown) {
      const err = e as Error;
      alert(err?.message || "Failed to revoke RA access");
    } finally {
      setRaAccessBusy(false);
    }
  };

  const seedResidences = async () => {
    setSeeding(true);
    try {
      await Promise.all(
        NUS_RESIDENCES.map(async (name) => {
          const id = slugify(name);
          await setDoc(doc(db, "hostels", id), { id, name, createdAt: new Date() }, { merge: true });
        })
      );
      await loadHostels();
      alert("Seeded NUS residences into Firestore (hostels collection).");
    } catch (e: unknown) {
      const err = e as Error;
      console.error(e);
      alert(err?.message || "Seeding failed. Check Firestore permissions.");
    } finally {
      setSeeding(false);
    }
  };

  if (authLoading || !user || !profile || profile.role !== "office") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold text-gray-900">Residences</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor and manage incidents, checkpoints, and RAs for each residence.
        </p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={item}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <p className="text-sm text-gray-600">Total Residences</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{hostels.length}</p>
        </motion.div>
        <motion.div
          variants={item}
          className="rounded-xl border border-red-200 bg-red-50 p-6"
        >
          <p className="text-sm text-red-700">Active Incidents</p>
          <p className="mt-1 text-3xl font-bold text-red-900">{activeIncidentCount}</p>
        </motion.div>
        <motion.div
          variants={item}
          className="rounded-xl border border-blue-200 bg-blue-50 p-6"
        >
          <p className="text-sm text-blue-700">RAs Assigned</p>
          <p className="mt-1 text-3xl font-bold text-blue-900">{raAccessList.length}</p>
        </motion.div>
      </motion.div>

      <motion.div
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="mb-4 font-semibold text-gray-900">Manage Residences</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedResidences}
            disabled={seeding}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {seeding ? "Seeding..." : "Seed NUS residences (17)"}
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search residence..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </motion.div>

      <motion.div
        id="ra-access"
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="mb-3 font-semibold text-gray-900">RA Access</h2>
        <p className="text-sm text-gray-600 mb-4">
          Assign which student IDs have RA access. The system will detect RA status automatically when users log in.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="raAccessStudentId" className="block text-xs font-medium text-gray-600 mb-1">
              Student ID to grant RA access
            </label>
            <input
              id="raAccessStudentId"
              value={raAccessStudentId}
              onChange={(e) => setRaAccessStudentId(e.target.value)}
              placeholder="e.g. A0001001X"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <button
            onClick={handleGrantRaAccess}
            disabled={raAccessBusy}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {raAccessBusy ? "Adding..." : "Grant RA Access"}
          </button>
        </div>
        {raAccessList.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Current RAs (by student ID):</p>
            <ul className="divide-y border rounded-lg">
              {raAccessList.map((r) => (
                <li key={r.id} className="px-3 py-2 flex justify-between items-center text-sm">
                  <span>{r.studentId}</span>
                  <button
                    onClick={() => handleRevokeRaAccess(r.id, r.studentId)}
                    disabled={raAccessBusy}
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

      <motion.div
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="mb-4 font-semibold text-gray-900">Residences</h2>

        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-600">No residences found. Click &quot;Seed&quot; first.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filtered.map((h, i) => (
              <motion.li
                key={h.id}
                className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <div>
                  <p className="font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-500">ID: {h.id}</p>
                </div>
                <Link
                  href={`/office/${h.id}`}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  Open →
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
