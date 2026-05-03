"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ExpenseForm from "@/app/components/ExpenseForm";

interface ExpenseRecord {
  id: number;
  amount: number;
  date: string;
  description: string;
  receiptPath: string | null;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.ok) {
      const me = await res.json();
      setBalance(me.balance);
      setName(me.name);
    }
  }, [router]);

  const fetchRecords = useCallback(async () => {
    const res = await fetch(`/api/expenses?month=${month}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [month]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    setLoading(true);
    fetchRecords();
  }, [fetchRecords]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function openReceipt(recordId: number) {
    setPreviewLoading(true);
    const res = await fetch(`/api/expenses/${recordId}/receipt`);
    if (res.ok) {
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    }
    setPreviewLoading(false);
  }

  const monthTotal = records.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-gray-800">團隊經費管理</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{name}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600">
            登出
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Balance card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">目前餘額</p>
          <p
            className={`text-4xl font-bold ${
              balance !== null && balance < 0 ? "text-red-500" : "text-gray-800"
            }`}
          >
            {balance !== null ? `$${balance.toLocaleString()}` : "—"}
          </p>
        </div>

        {/* Expense form */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            登錄支出
          </h2>
          <ExpenseForm
            onSuccess={(newBalance) => {
              setBalance(newBalance);
              fetchRecords();
            }}
          />
        </div>

        {/* Monthly records */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">支出記錄</h2>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
            />
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">載入中...</p>
          ) : records.length === 0 ? (
            <p className="text-gray-400 text-sm">本月尚無支出記錄</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">日期</th>
                    <th className="pb-2">金額</th>
                    <th className="pb-2">說明</th>
                    <th className="pb-2">收據</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">
                        {new Date(r.date).toLocaleDateString("zh-TW")}
                      </td>
                      <td className="py-2">${r.amount.toLocaleString()}</td>
                      <td className="py-2">{r.description}</td>
                      <td className="py-2">
                        {r.receiptPath ? (
                          <button
                            onClick={() => openReceipt(r.id)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {previewLoading ? "載入中" : "查看"}
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-gray-500 text-right">
                本月合計：
                <span className="font-semibold text-gray-700">
                  ${monthTotal.toLocaleString()}
                </span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Receipt preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="max-w-lg max-h-[80vh] overflow-auto bg-white rounded-2xl p-2 shadow-xl">
            <img src={previewUrl} alt="收據" className="max-w-full rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
