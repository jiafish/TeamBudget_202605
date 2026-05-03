"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/app/components/AdminHeader";
import ExpenseForm from "@/app/components/ExpenseForm";

interface SummaryMember {
  id: number;
  name: string;
  loginNumber: string;
  role: string;
  monthlyAllocation: number;
  balance: number;
  totalExpense: number;
  displayRemaining: number;
}

interface SummaryTotals {
  sumMonthlyAllocation: number;
  sumTotalExpense: number;
  teamDisplayRemaining: number;
}

interface ExpenseRecord {
  id: number;
  userId: number;
  memberName: string;
  amount: number;
  date: string;
  description: string;
  receiptPath: string | null;
}

interface Aggregate {
  totalAmount: number;
  perMember: Record<string, number>;
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

type OverviewTab = "monthly" | "reimbursement" | "expense";

const TAB_LABELS: Record<OverviewTab, string> = {
  monthly: "月份支出統計",
  reimbursement: "核銷補發",
  expense: "登錄支出",
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const manualSupplementRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<OverviewTab>("monthly");
  const [month, setMonth] = useState(currentMonth());
  const [members, setMembers] = useState<SummaryMember[]>([]);
  const [totals, setTotals] = useState<SummaryTotals | null>(null);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editAllocationId, setEditAllocationId] = useState<number | null>(null);
  const [allocationInput, setAllocationInput] = useState("");
  const [reimbursements, setReimbursements] = useState<ReimbursementRow[]>([]);
  const [reimburseTarget, setReimburseTarget] = useState<SummaryMember | null>(
    null
  );
  const [reimburseDoPay, setReimburseDoPay] = useState(true);
  const [reimburseCredit, setReimburseCredit] = useState("");
  const [reimburseNote, setReimburseNote] = useState("");
  const [reimburseError, setReimburseError] = useState("");
  const [reimburseSubmitting, setReimburseSubmitting] = useState(false);

  const [manualTargetId, setManualTargetId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    const [summaryRes, expensesRes, reimbRes] = await Promise.all([
      fetch("/api/admin/summary"),
      fetch(`/api/admin/expenses?month=${month}`),
      fetch("/api/admin/reimbursements"),
    ]);

    if (
      summaryRes.status === 401 ||
      expensesRes.status === 401 ||
      reimbRes.status === 401
    ) {
      router.push("/login");
      return;
    }

    if (summaryRes.ok) {
      const d = await summaryRes.json();
      setMembers(d.members ?? []);
      setTotals(d.totals ?? null);
    }
    if (expensesRes.ok) {
      const d = await expensesRes.json();
      setRecords(d.records);
      setAggregate(d.aggregate);
    }
    if (reimbRes.ok) setReimbursements(await reimbRes.json());
    setLoading(false);
  }, [month, router]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  async function handleSetAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (editAllocationId === null) return;
    const res = await fetch(`/api/admin/members/${editAllocationId}/allocation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyAllocation: parseInt(allocationInput) }),
    });
    if (res.ok) {
      setEditAllocationId(null);
      setAllocationInput("");
      fetchData();
    }
  }

  async function openReceipt(recordId: number) {
    const res = await fetch(`/api/expenses/${recordId}/receipt`);
    if (res.ok) {
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    }
  }

  function openReimburseModal(m: SummaryMember) {
    setActiveTab("reimbursement");
    setReimburseTarget(m);
    setReimburseDoPay(true);
    const deficit = m.displayRemaining < 0 ? -m.displayRemaining : 0;
    setReimburseCredit(deficit > 0 ? String(deficit) : "");
    setReimburseNote("");
    setReimburseError("");
  }

  function focusManualSupplementForMember(m: SummaryMember) {
    setActiveTab("reimbursement");
    setManualTargetId(String(m.id));
    setManualError("");
    window.setTimeout(() => {
      manualSupplementRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  async function handleManualSupplement(e: React.FormEvent) {
    e.preventDefault();
    setManualError("");
    const targetUserId = parseInt(manualTargetId, 10);
    const creditAmount = parseInt(manualAmount, 10);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      setManualError("請選擇補發對象");
      return;
    }
    if (!Number.isInteger(creditAmount) || creditAmount <= 0) {
      setManualError("補發金額必須為正整數");
      return;
    }
    setManualSubmitting(true);
    const res = await fetch("/api/admin/manual-supplement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId,
        creditAmount,
        note: manualNote.trim() || undefined,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setManualSubmitting(false);
    if (!res.ok) {
      setManualError(d.error ?? "補發失敗");
      return;
    }
    setManualAmount("");
    setManualNote("");
    fetchData();
  }

  async function handleReimburseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reimburseTarget) return;
    setReimburseError("");
    setReimburseSubmitting(true);
    const credit = parseInt(reimburseCredit, 10);
    const res = await fetch(
      `/api/admin/members/${reimburseTarget.id}/reimbursement`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reimbursed: reimburseDoPay,
          creditAmount: reimburseDoPay ? credit : 0,
          note: reimburseNote || undefined,
        }),
      }
    );
    const d = await res.json().catch(() => ({}));
    setReimburseSubmitting(false);
    if (!res.ok) {
      setReimburseError(d.error ?? "提交失敗");
      return;
    }
    setReimburseTarget(null);
    fetchData();
  }

  if (loading) return <div className="p-8 text-gray-500">載入中...</div>;

  const maxReimburseCredit =
    reimburseTarget && reimburseTarget.displayRemaining < 0
      ? -reimburseTarget.displayRemaining
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">總覽指標</h2>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">團隊總支出</p>
              <p className="text-2xl font-bold text-gray-800">
                {totals !== null
                  ? `$${totals.sumTotalExpense.toLocaleString()}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">團隊剩餘餘額累計</p>
              <p
                className={`text-2xl font-bold ${
                  totals && totals.teamDisplayRemaining < 0
                    ? "text-red-500"
                    : "text-gray-800"
                }`}
              >
                {totals !== null
                  ? `$${totals.teamDisplayRemaining.toLocaleString()}`
                  : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            「團隊總支出」為全歷史支出加總。「團隊剩餘餘額累計」為全員月分配加總減去全歷史支出加總（與帳本 balance
            欄位定義不同）。依月份之支出分析請至下方「{TAB_LABELS.monthly}」頁籤。
          </p>
        </section>

        {/* Balance summary */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">成員餘額摘要</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">姓名</th>
                <th className="pb-2">月分配金額</th>
                <th className="pb-2">目前餘額</th>
                <th className="pb-2">狀態</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2">{m.name}</td>
                  <td className="py-2">${m.monthlyAllocation.toLocaleString()}</td>
                  <td
                    className={`py-2 font-medium ${
                      m.displayRemaining < 0 ? "text-red-500" : "text-gray-800"
                    }`}
                  >
                    ${m.displayRemaining.toLocaleString()}
                  </td>
                  <td className="py-2">
                    {m.displayRemaining < 0 ? (
                      <button
                        type="button"
                        onClick={() => focusManualSupplementForMember(m)}
                        className="inline-block rounded-full bg-amber-100 text-amber-900 text-xs px-2 py-0.5 font-medium cursor-pointer hover:bg-amber-200"
                      >
                        需補發經費
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditAllocationId(m.id);
                        setAllocationInput(String(m.monthlyAllocation));
                      }}
                      className="text-blue-600 hover:underline text-xs mr-2"
                    >
                      設定分配
                    </button>
                    {m.role === "MEMBER" && m.displayRemaining < 0 && (
                      <button
                        type="button"
                        onClick={() => openReimburseModal(m)}
                        className="text-amber-700 hover:underline text-xs"
                      >
                        核銷／補發
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-4">
            {(Object.keys(TAB_LABELS) as OverviewTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 -mb-px transition-colors ${
                  activeTab === tab
                    ? "bg-white border-gray-200 text-gray-800"
                    : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {activeTab === "monthly" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs text-gray-500 mb-1">統計月份</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {aggregate && (
                <div>
                  <h3 className="text-base font-semibold text-gray-700 mb-3">
                    {month} 支出統計（依支出日期）
                  </h3>
                  <p className="text-2xl font-bold text-gray-800 mb-3">
                    當月總支出：${aggregate.totalAmount.toLocaleString()}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(aggregate.perMember).map(([name, total]) => (
                      <div key={name} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">{name}</p>
                        <p className="font-semibold text-gray-700">
                          ${total.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-3">支出記錄</h3>
                {records.length === 0 ? (
                  <p className="text-gray-400 text-sm">本月尚無支出記錄</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">日期</th>
                        <th className="pb-2">登記人</th>
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
                          <td className="py-2">{r.memberName}</td>
                          <td className="py-2">${r.amount.toLocaleString()}</td>
                          <td className="py-2">{r.description}</td>
                          <td className="py-2">
                            {r.receiptPath ? (
                              <button
                                type="button"
                                onClick={() => openReceipt(r.id)}
                                className="text-blue-600 hover:underline text-xs"
                              >
                                查看
                              </button>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "reimbursement" && (
            <div className="space-y-8">
              <div ref={manualSupplementRef}>
                <h3 className="text-base font-semibold text-gray-700 mb-3">
                  手動補發經費
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  指定補發對象與金額後入帳至帳本餘額，並列入本頁籤之核銷／補發紀錄。
                </p>
                <form
                  onSubmit={handleManualSupplement}
                  className="space-y-3 max-w-md"
                >
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      補發對象
                    </label>
                    <select
                      value={manualTargetId}
                      onChange={(e) => setManualTargetId(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">請選擇</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}（{m.role === "MANAGER" ? "管理者" : "成員"}）
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      補發金額（元）
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      備註（選填）
                    </label>
                    <input
                      type="text"
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="例如：實驗室補貼"
                    />
                  </div>
                  {manualError && (
                    <p className="text-red-500 text-sm">{manualError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={manualSubmitting}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {manualSubmitting ? "送出中…" : "確認補發"}
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-3">
                  核銷／補發紀錄
                </h3>
                {reimbursements.length === 0 ? (
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
            </div>
          )}

          {activeTab === "expense" && (
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-2">
                管理者本人支出
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                以下登錄會從您的管理者帳戶餘額扣款，與成員儀表板使用相同 API。
              </p>
              <ExpenseForm onSuccess={() => fetchData()} />
            </div>
          )}
        </section>
      </div>

      {reimburseTarget !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-1">核銷／補發</h3>
            <p className="text-sm text-gray-500 mb-4">
              成員：{reimburseTarget.name}（月分配減支出後餘額 $
              {reimburseTarget.displayRemaining.toLocaleString()}）
            </p>
            <form onSubmit={handleReimburseSubmit} className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={reimburseDoPay}
                  onChange={(e) => setReimburseDoPay(e.target.checked)}
                />
                執行補發（加回餘額）
              </label>
              {reimburseDoPay && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    補發金額（元，不可超過透支額）
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxReimburseCredit > 0 ? maxReimburseCredit : undefined}
                    step={1}
                    required={reimburseDoPay}
                    value={reimburseCredit}
                    onChange={(e) => setReimburseCredit(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">備註（選填）</label>
                <input
                  type="text"
                  value={reimburseNote}
                  onChange={(e) => setReimburseNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="例如：實驗室補貼"
                />
              </div>
              {reimburseError && (
                <p className="text-red-500 text-sm">{reimburseError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={reimburseSubmitting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {reimburseSubmitting ? "送出中…" : "確認紀錄"}
                </button>
                <button
                  type="button"
                  onClick={() => setReimburseTarget(null)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set allocation modal */}
      {editAllocationId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-72 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">設定月分配金額</h3>
            <form onSubmit={handleSetAllocation} className="space-y-3">
              <input
                type="number"
                value={allocationInput}
                onChange={(e) => setAllocationInput(e.target.value)}
                min="0"
                step="1"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="輸入金額（元）"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
                >
                  確認
                </button>
                <button
                  type="button"
                  onClick={() => setEditAllocationId(null)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt preview */}
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
