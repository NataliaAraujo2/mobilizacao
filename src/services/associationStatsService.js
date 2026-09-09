import { getDbService } from "./firebaseDb";

const STATS_COLLECTION = "publicStats";
const CAMPAIGN_DOCUMENT = "associationCampaign";

export async function getNewAssociatesCount() {
  const { db, doc, getDoc } = await getDbService(["doc", "getDoc"]);
  const snapshot = await getDoc(doc(db, STATS_COLLECTION, CAMPAIGN_DOCUMENT));
  const value = snapshot.exists() ? snapshot.data().newAssociates : 0;
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export async function updateNewAssociatesCount(newAssociates, userId) {
  const value = Number(newAssociates);
  if (!Number.isSafeInteger(value) || value < 0 || value > 99_999_999) {
    throw new Error("Informe uma quantidade válida de associados.");
  }

  const { db, doc, setDoc, serverTimestamp } = await getDbService(["doc", "setDoc", "serverTimestamp"]);
  await setDoc(doc(db, STATS_COLLECTION, CAMPAIGN_DOCUMENT), {
    newAssociates: value,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });

  return value;
}
