"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NUS_RESIDENCES } from "@/lib/nusResidences";
import Link from "next/link";

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
  const [hostels, setHostels] = useState<HostelDoc[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

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

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900">Office Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Select a residence to manage incidents, checkpoints, and RAs.
        </p>

        <div className="mt-5 flex gap-3">
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
            className="flex-1 border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Residences</h2>

        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-600">No residences found. Click &quot;Seed&quot; first.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((h) => (
              <li key={h.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-500">ID: {h.id}</p>
                </div>
                <Link
                  href={`/office/${h.id}`}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
