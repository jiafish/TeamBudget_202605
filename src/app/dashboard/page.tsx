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
  category: { id: number; name: string } | null;
}

interface LastAllocationSetting {
  requestedBackfillFromMonth: string | null;
  requestedBackfillToMonth: string | null;
  effectiveBackfillFromMonth: string | null;
  effectiveBackfillToMonth: string | null;
  monthlyAllocationAfter: number;
  backfilledMonthsCount: number;
  createdAt: string;
  managerName: string;
}

interface BudgetSummary {
  monthlyAllocation: number;
  totalAllocatedFromLogs: number;
  totalSupplementCreditsReimbursed?: number;
  totalAllocationAndSupplements?: number;
  totalExpenseAllTime: number;
  availableAfterAllocationsAndSupplements?: number;
  availableFromAllocations: number;
  lastAllocationSetting?: LastAllocationSetting | null;
}

interface ReimbursementRow {
  id: number;
  targetUserId: number;
  targetName: string;
  managerUserId: number;
  managerName: string;
  reimbursed: boolean;
  creditAmount: number;
  note: string | null;
  createdAt: string;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [reimbursements, setReimbursements] = useState<ReimbursementRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.ok) {
      const me = await res.json();
      setName(me.name);
    }
  }, [router]);

  const fetchBudgetAndReimbursements = useCallback(async () => {
    setSummaryLoading(true);
    const [sumRes, reimbRes] = await Promise.all([
      fetch("/api/member/budget-summary"),
      fetch("/api/member/reimbursements"),
    ]);
    if (sumRes.status === 401 || reimbRes.status === 401) {
      router.push("/login");
      setSummaryLoading(false);
      return;
    }
    if (sumRes.ok) {
      setBudgetSummary(await sumRes.json());
    } else {
      setBudgetSummary(null);
    }
    if (reimbRes.ok) {
      setReimbursements(await reimbRes.json());
    } else {
      setReimbursements([]);
    }
    setSummaryLoading(false);
  }, [router]);

  const fetchRecords = useCallback(async () => {
    const res = await fetch(`/api/expenses?month=${month}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [month]);

  useEffect(() => {
    fetchMe();
    fetchBudgetAndReimbursements();
  }, [fetchMe, fetchBudgetAndReimbursements]);

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
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-1">預算摘要</h2>
          <p className="text-xs text-gray-500 mb-4">
            「月分配金額（每月額度）」為每月發放之設定額；「分配經費＋補發加總」＝月配實際入帳加總加上已入帳之補發金額；可用餘額＝該加總 −
            全期總支出。
          </p>
          {summaryLoading ? (
            <p className="text-gray-400 text-sm">載入中...</p>
          ) : budgetSummary ? (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">月分配金額（每月額度）</dt>
                  <dd className="text-lg font-semibold text-gray-800">
                    ${budgetSummary.monthlyAllocation.toLocaleString()}
                  </dd>
                  <dd className="text-xs text-gray-400 mt-1">
                    與管理者端相同：此欄為每月發放額度，非歷月已入帳加總。
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">分配經費＋補發加總</dt>
                  <dd className="text-lg font-semibold text-gray-800">
                    $
                    {(
                      budgetSummary.totalAllocationAndSupplements ??
                      budgetSummary.totalAllocatedFromLogs
                    ).toLocaleString()}
                  </dd>
                  <dd className="text-xs text-gray-400 mt-1">
                    月配入帳 $
                    {budgetSummary.totalAllocatedFromLogs.toLocaleString()}
                    ／補發入帳 $
                    {(budgetSummary.totalSupplementCreditsReimbursed ?? 0).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">總支出</dt>
                  <dd className="text-lg font-semibold text-gray-800">
                    ${budgetSummary.totalExpenseAllTime.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">可用餘額</dt>
                  <dd
                    className={`text-lg font-semibold ${
                      (budgetSummary.availableAfterAllocationsAndSupplements ??
                        budgetSummary.availableFromAllocations) < 0
                        ? "text-red-500"
                        : "text-gray-800"
                    }`}
                  >
                    $
                    {(
                      budgetSummary.availableAfterAllocationsAndSupplements ??
                      budgetSummary.availableFromAllocations
                    ).toLocaleString()}
                  </dd>
                </div>
              </dl>
              {budgetSummary.lastAllocationSetting && (
                <p className="text-xs text-gray-500 mt-4 border-t border-gray-100 pt-3">
                  最近一次管理者儲存紀錄（{budgetSummary.lastAllocationSetting.managerName}，「
                  {new Date(
                    budgetSummary.lastAllocationSetting.createdAt
                  ).toLocaleString("zh-TW")}
                  」）：請求區間{" "}
                  {budgetSummary.lastAllocationSetting.requestedBackfillFromMonth ??
                    "—"}
                  ～
                  {budgetSummary.lastAllocationSetting.requestedBackfillToMonth ??
                    "—"}
                  ；實際補帳區間{" "}
                  {budgetSummary.lastAllocationSetting.effectiveBackfillFromMonth ??
                    "—"}
                  ～
                  {budgetSummary.lastAllocationSetting.effectiveBackfillToMonth ??
                    "—"}
                  （當次補入 {budgetSummary.lastAllocationSetting.backfilledMonthsCount}{" "}
                  個月）
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm">無法載入摘要</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">核銷／補發紀錄</h2>
          {summaryLoading ? (
            <p className="text-gray-400 text-sm">載入中...</p>
          ) : reimbursements.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無紀錄</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">時間</th>
                    <th className="pb-2">成員</th>
                    <th className="pb-2">操作者</th>
                    <th className="pb-2">補發</th>
                    <th className="pb-2">金額</th>
                    <th className="pb-2">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursements.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("zh-TW")}
                      </td>
                      <td className="py-2">{r.targetName}</td>
                      <td className="py-2">{r.managerName}</td>
                      <td className="py-2">{r.reimbursed ? "是" : "否"}</td>
                      <td className="py-2">${r.creditAmount.toLocaleString()}</td>
                      <td className="py-2 text-gray-600 max-w-[12rem] truncate">
                        {r.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expense form */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            登錄支出
          </h2>
          <ExpenseForm
            onSuccess={() => {
              fetchRecords();
              fetchBudgetAndReimbursements();
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
                    <th className="pb-2">類別</th>
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
                        {r.category ? (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                            {r.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
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
