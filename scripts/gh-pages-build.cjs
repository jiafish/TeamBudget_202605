/**
 * 產出 GitHub Pages 用靜態檔（out/）。
 * Next.js 靜態匯出不支援 App Router 的 Route Handlers，故建置前暫時移開 src/app/api。
 *
 * 環境變數：
 *   STATIC_BASE_PATH — 專案站路徑前綴，預設 /TeamBudget_202605（依你的 repo 名稱修改）
 */
const { existsSync, mkdirSync, renameSync, rmSync } = require("fs");
const { join } = require("path");
const { execSync } = require("child_process");

const root = join(__dirname, "..");
const apiDir = join(root, "src/app/api");
const stashParent = join(root, ".gh-pages-stash");
const stashDir = join(stashParent, "api");

function stashApi() {
  if (!existsSync(apiDir)) {
    throw new Error("找不到 src/app/api，無法進行靜態匯出。");
  }
  mkdirSync(stashParent, { recursive: true });
  if (existsSync(stashDir)) {
    rmSync(stashDir, { recursive: true });
  }
  renameSync(apiDir, stashDir);
}

function restoreApi() {
  if (existsSync(stashDir) && !existsSync(apiDir)) {
    renameSync(stashDir, apiDir);
  }
}

const basePath = process.env.STATIC_BASE_PATH || "/TeamBudget_202605";

stashApi();
try {
  execSync("npm run build", {
    stdio: "inherit",
    cwd: root,
    env: {
      ...process.env,
      STATIC_EXPORT: "1",
      NEXT_PUBLIC_STATIC_EXPORT: "1",
      STATIC_BASE_PATH: basePath,
    },
  });
} finally {
  restoreApi();
}
