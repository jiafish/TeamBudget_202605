import Link from "next/link";

const REPO_URL = "https://github.com/jiafish/TeamBudget_202605";

/**
 * GitHub Pages 靜態匯出首頁：完整功能需 Node + 資料庫，無法在純靜態環境運作。
 */
export default function StaticHome() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-md p-8 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          團隊經費管理工具
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          此網址為{" "}
          <strong className="text-gray-800">GitHub Pages 靜態展示</strong>
          ，不包含後端 API 與資料庫，無法登入或使用管理／成員功能。
        </p>
        <p className="text-gray-600 text-sm leading-relaxed">
          完整版為 Next.js + SQLite（Prisma），請使用{" "}
          <strong className="text-gray-800">Vercel</strong>、
          <strong className="text-gray-800">Docker</strong> 或{" "}
          <strong className="text-gray-800">VPS</strong> 部署；說明見專案
          README。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href={REPO_URL}
            className="flex-1 text-center bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg transition"
          >
            原始碼與 README
          </a>
          <Link
            href="/login"
            className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition"
          >
            登入頁（靜態預覽）
          </Link>
        </div>
        <p className="text-xs text-gray-400 text-center pt-2">
          靜態站由 <code className="bg-gray-100 px-1 rounded">npm run build:gh-pages</code>{" "}
          產生
        </p>
      </div>
    </div>
  );
}
