import {
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type WithFieldValue,
  type DocumentData,
  serverTimestamp,
} from 'firebase/firestore';

export const createConverter = <T extends DocumentData>(): FirestoreDataConverter<T> => ({
  toFirestore(data: WithFieldValue<T>): DocumentData {
    return {
      ...data,
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
    } as unknown as T;
  },
});
