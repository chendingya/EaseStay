import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "docs", "ppt-assets");
const outDir = path.join(assetsDir, "images");

const pages = [
  { in: "arch-overview.html", out: "arch-overview.png" },
  { in: "arch-mobile.html", out: "arch-mobile.png" },
  { in: "arch-admin.html", out: "arch-admin.png" },
  { in: "arch-server.html", out: "arch-server.png" }
];

await fs.mkdir(outDir, { recursive: true });

for (const item of pages) {
  const inPath = path.join(assetsDir, item.in);
  const outPath = path.join(outDir, item.out);
  const url = `file:///${inPath.replace(/\\/g, "/")}`;
  const cmd = `npx --yes playwright screenshot --viewport-size=1920,1080 "${url}" "${outPath}"`;
  execSync(cmd, { stdio: "inherit", cwd: root });
  console.log(`captured: ${path.relative(root, outPath)}`);
}
