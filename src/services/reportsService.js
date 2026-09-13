import { getDbService } from "./firebaseDb";
import { getFunctionsService } from "./firebaseFunctions";
import { getStorageService } from "./firebaseStorage";

const REPORT_YEAR = "2025";
const REPORT_PATH = `public-reports/${REPORT_YEAR}/report.pdf`;
const MAX_REPORT_SIZE = 25 * 1024 * 1024;

export { MAX_REPORT_SIZE, REPORT_YEAR };

export async function getPublicReport(year = REPORT_YEAR) {
  const { db, doc, getDoc } = await getDbService(["doc", "getDoc"]);
  const snapshot = await getDoc(doc(db, "publicReports", year));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function getPublicReportUrl(report) {
  if (!report?.path) return null;
  const { storage, ref, getDownloadURL } = await getStorageService();
  const url = await getDownloadURL(ref(storage, report.path));
  const version = report.publishedAt?.seconds ?? "";
  return version ? `${url}${url.includes("?") ? "&" : "?"}v=${version}` : url;
}

export async function finalizePublicReport2025() {
  const { functions, httpsCallable } = await getFunctionsService();
  return (await httpsCallable(functions, "publishPublicReport2025")()).data;
}

export async function publishReport2025(file, onProgress) {
  if (!(file instanceof File) || file.type !== "application/pdf") {
    throw new Error("Selecione um arquivo PDF.");
  }
  if (file.size <= 0 || file.size > MAX_REPORT_SIZE) {
    throw new Error("O PDF deve ter no máximo 25 MB. Comprima o arquivo antes de enviar.");
  }

  const { storage, ref, uploadBytesResumable } = await getStorageService();
  const upload = uploadBytesResumable(ref(storage, REPORT_PATH), file, {
    contentType: "application/pdf",
    cacheControl: "public, max-age=3600",
    customMetadata: { originalFileName: file.name },
  });

  await new Promise((resolve, reject) => upload.on("state_changed", (snapshot) => {
    onProgress?.(snapshot.bytesTransferred, snapshot.totalBytes);
  }, reject, resolve));

  return finalizePublicReport2025();
}
