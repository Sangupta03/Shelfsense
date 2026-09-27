import { Router } from "express";
import multer from "multer";
import { HttpError } from "../lib/httpError.js";
import { parseImage, parseText } from "../lib/parserClient.js";
import { parseLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { parseTextInput } from "../validators/validate.js";

export const parseRouter = Router();

// memoryStorage = the photo stays in RAM as a Buffer and is never written to disk.
// Once the request ends it's garbage collected. Nothing to leak, nothing to clean up.
const upload = multer({
  storage: multer.memoryStorage(),
  // 4 MB, not 5: Vercel rejects any request body over 4.5 MB before it reaches us
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new HttpError(415, "That file isn't an image. Try a JPG or PNG."));
      return;
    }
    cb(null, true);
  },
});

// Both routes need a login, otherwise any stranger could burn through our API credit.
parseRouter.use(requireAuth, parseLimiter);

parseRouter.post("/text", async (req, res) => {
  const parsed = parseTextInput(req.body);
  if (!parsed.ok) throw new HttpError(400, "Nothing to read yet.", parsed.errors);
  res.json(await parseText(parsed.value.text));
});

parseRouter.post("/image", upload.single("image"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Choose a photo of the label first.");
  res.json(await parseImage(req.file.buffer, req.file.mimetype));
});
