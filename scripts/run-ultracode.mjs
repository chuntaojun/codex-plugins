#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await import(path.join(__dirname, "dist/main.js"));
