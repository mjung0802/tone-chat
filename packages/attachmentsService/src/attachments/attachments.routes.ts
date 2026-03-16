import { Router } from "express";
import { upload } from "./upload.middleware.js";
import { uploadFile, getFile } from "./attachments.controller.js";

export const attachmentsRouter = Router();

attachmentsRouter.post("/upload", upload.single("file"), uploadFile);
attachmentsRouter.get("/:attachmentId", getFile);
