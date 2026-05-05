"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [loginNumber, setLoginNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDemoLogin() {
    setLoading(true);
    const res = await fetch("/api/auth/demo-login", { method: "POST" });
    setLoading(false);
    if (res.ok) {
      router.push("/admin/overview");
    } else {
      setError("訪客模式未啟用");
    }
  }

  useEffect(() => {
    if (isStaticExport) {
      router.replace("/admin/overview");
    }
  }, [isStaticExport, router]);

  if (isStaticExport) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginNumber, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError("登入號碼或密碼錯誤");
      return;
    }

    if (data.role === "MANAGER") {
      router.push("/admin/overview");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          團隊經費管理
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              登入號碼
            </label>
            <input
              type="text"
              value={loginNumber}
              onChange={(e) => setLoginNumber(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入登入號碼"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入密碼"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
        {isDemoMode && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              訪客模式（Demo）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
