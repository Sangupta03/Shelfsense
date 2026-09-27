import "./lib/env.js"; // first, so every other file sees the .env values
import { createApp } from "./app.js";
import { readEnv } from "./lib/env.js";

const port = Number(readEnv("PORT", "3000"));

createApp().listen(port, () => {
  console.log(`ShelfSense API listening on http://localhost:${port}`);
});
