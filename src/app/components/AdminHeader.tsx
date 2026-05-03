"use client";

import { useRouter, usePathname } from "next/navigation";

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const onOverview = pathname === "/admin/overview" || pathname === "/admin";
  const onMembers = pathname?.startsWith("/admin/members");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-800">經費管理總覽</h1>
        <nav className="flex gap-3 text-sm text-gray-500">
          <a
            href="/admin/overview"
            className={
              onOverview ? "text-blue-600 font-medium" : "hover:text-gray-700"
            }
          >
            總覽
          </a>
          <a
            href="/admin/members"
            className={onMembers ? "text-blue-600 font-medium" : "hover:text-gray-700"}
          >
            成員管理
          </a>
        </nav>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        登出
      </button>
    </div>
  );
}
