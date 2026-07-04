import { Router } from "express";
import multer from "multer";
import { ApiError, asyncHandler } from "../middleware/error.js";
import { Attachment, Receipt } from "../models.js";
import {
  ALLOWED_ATTACHMENT_TYPES,
  ALLOWED_RECEIPT_TYPES,
  MAX_FILE_SIZE,
  deleteFile,
  downloadStream,
  uploadBuffer,
} from "../services/gridfs.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

export const filesRouter = Router();

// Csatolmány feltöltése (pdf, jpg, png, xlsx, doc/docx, gif — max 5 MB)
filesRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw new ApiError(400, "Hiányzó fájl", "NO_FILE");
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimetype)) {
      throw new ApiError(400, "Nem engedélyezett fájltípus", "BAD_TYPE");
    }
    const fileId = await uploadBuffer(file.buffer, file.originalname, file.mimetype);
    const attachment = await Attachment.create({
      userId: req.userId,
      fileId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
    res.status(201).json(attachment);
  }),
);

// Csatolmány letöltése/megjelenítése
filesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const attachment = await Attachment.findOne({ _id: req.params.id, userId: req.userId });
    if (!attachment) throw new ApiError(404, "A csatolmány nem található", "NOT_FOUND");
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(attachment.filename)}"`);
    downloadStream(String(attachment.fileId))
      .on("error", () => res.status(404).end())
      .pipe(res);
  }),
);

filesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const attachment = await Attachment.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!attachment) throw new ApiError(404, "A csatolmány nem található", "NOT_FOUND");
    await deleteFile(String(attachment.fileId));
    res.json({ ok: true });
  }),
);

export const receiptsRouter = Router();

// Blokk kép feltöltése (mobil kamera vagy fájlválasztó)
receiptsRouter.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw new ApiError(400, "Hiányzó fájl", "NO_FILE");
    if (!ALLOWED_RECEIPT_TYPES.has(file.mimetype)) {
      throw new ApiError(400, "A blokk csak kép formátumban tölthető fel", "BAD_TYPE");
    }
    const fileId = await uploadBuffer(file.buffer, file.originalname, file.mimetype);
    const receipt = await Receipt.create({
      userId: req.userId,
      fileId,
      filename: file.originalname,
      mimeType: file.mimetype,
    });
    res.status(201).json(receipt);
  }),
);

// Feldolgozatlan blokkok száma (fejléc notification)
receiptsRouter.get(
  "/unprocessed-count",
  asyncHandler(async (req, res) => {
    const count = await Receipt.countDocuments({ userId: req.userId, processed: false });
    res.json({ count });
  }),
);

// Blokk kép megjelenítése
receiptsRouter.get(
  "/:id/image",
  asyncHandler(async (req, res) => {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.userId });
    if (!receipt) throw new ApiError(404, "A blokk nem található", "NOT_FOUND");
    res.setHeader("Content-Type", receipt.mimeType);
    downloadStream(String(receipt.fileId))
      .on("error", () => res.status(404).end())
      .pipe(res);
  }),
);
