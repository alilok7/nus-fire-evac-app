import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Checkpoint = {
  id: string;
  hostelId: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
};

export async function fetchCheckpoints(hostelId: string): Promise<Checkpoint[]> {
  const snap = await getDocs(
    query(collection(db, "checkpoints"), where("hostelId", "==", hostelId))
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  })) as Checkpoint[];
}

export async function createCheckpoint(data: Omit<Checkpoint, "id">) {
  await addDoc(collection(db, "checkpoints"), data);
}

export async function removeCheckpoint(checkpointId: string) {
  await deleteDoc(doc(db, "checkpoints", checkpointId));
}
