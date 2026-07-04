import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import { ApiError } from "../middleware/error.js";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB / fájl

export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const ALLOWED_RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function bucket(): GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) throw new ApiError(500, "Nincs adatbázis-kapcsolat", "NO_DB");
  return new GridFSBucket(db, { bucketName: "uploads" });
}

export function uploadBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<ObjectId> {
  return new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(filename, { contentType: mimeType });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id));
    stream.end(buffer);
  });
}

export function downloadStream(fileId: string) {
  return bucket().openDownloadStream(new ObjectId(fileId));
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    await bucket().delete(new ObjectId(fileId));
  } catch {
    // már törölt / hiányzó fájl nem hiba törléskor
  }
}
