import express from "express";
import { internalAuth } from "./shared/middleware/internalAuth.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { attachmentsRouter } from "./attachments/attachments.routes.js";

export const app = express();

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/attachments", internalAuth, attachmentsRouter);

app.use(errorHandler);
