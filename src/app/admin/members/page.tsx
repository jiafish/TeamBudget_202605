"use client";

import { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/app/components/AdminHeader";

interface Member {
  id: number;
  name: string;
  loginNumber: string;
  role: string;
  monthlyAllocation: number;
  balance: number;
}

interface Category {
  id: number;
  name: string;
}

interface AllocationHistoryRow {
  id: number;
  monthlyAllocationAfter: number;
  requestedBackfillFromMonth: string | null;
  requestedBackfillToMonth: string | null;
  effectiveBackfillFromMonth: string | null;
  effectiveBackfillToMonth: string | null;
  backfilledMonthsCount: number;
  createdAt: string;
  managerName: string;
}

function money(n: number): string {
  return `$${n.toLocaleString()}`;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // 新增成員
  const [name, setName] = useState("");
  const [loginNumber, setLoginNumber] = useState("");
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState("");

  // 重設密碼
  const [resetTargetId, setResetTargetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // 支出類別
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // 刪除成員
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // 設定分配
  const [editAllocationMember, setEditAllocationMember] = useState<Member | null>(null);
  const [allocationInput, setAllocationInput] = useState("");
  const [allocationBackfillFrom, setAllocationBackfillFrom] = useState("");
  const [allocationBackfillTo, setAllocationBackfillTo] = useState("");
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [allocationFeedback, setAllocationFeedback] = useState<string | null>(null);
  const [allocationHistory, setAllocationHistory] = useState<AllocationHistoryRow[]>([]);
  const [allocationHistoryLoading, setAllocationHistoryLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/admin/members");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, loginNumber, password }),
    });
    if (!res.ok) {
      const d = await res.json();
      setCreateError(d.error ?? "建立失敗");
      return;
    }
    setName("");
    setLoginNumber("");
    setPassword("");
    fetchMembers();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    if (resetTargetId === null) return;
    const res = await fetch(`/api/admin/members/${resetTargetId}/reset-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) {
      const d = await res.json();
      setResetError(d.error ?? "重設失敗");
      return;
    }
    setResetSuccess("密碼已重設");
    setNewPassword("");
    setTimeout(() => {
      setResetTargetId(null);
      setResetSuccess("");
    }, 1500);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleteSubmitting(true);
    const res = await fetch(`/api/admin/members/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleteSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setDeleteError(d.error ?? "刪除失敗");
      return;
    }
    setDeleteTarget(null);
    fetchMembers();
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError("");
    const categoryName = newCategoryName.trim();
    if (!categoryName) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName }),
    });
    if (res.ok) {
      setNewCategoryName("");
      fetchCategories();
    } else {
      const d = await res.json().catch(() => ({}));
      setCategoryError(d.error ?? "新增失敗");
    }
  }

  async function handleDeleteCategory(id: number) {
    setCategoryError("");
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchCategories();
    } else {
      const d = await res.json().catch(() => ({}));
      setCategoryError(d.error ?? "刪除失敗");
    }
  }

  async function openAllocationModal(member: Member) {
    setEditAllocationMember(member);
    setAllocationInput(String(member.monthlyAllocation));
    setAllocationBackfillFrom("");
    setAllocationBackfillTo("");
    setAllocationError(null);
    setAllocationHistory([]);
    setAllocationHistoryLoading(true);
    const res = await fetch(`/api/admin/members/${member.id}/allocation-history`);
    if (res.ok) setAllocationHistory(await res.json());
    setAllocationHistoryLoading(false);
  }

  async function handleSetAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!editAllocationMember) return;
    const from = allocationBackfillFrom.trim();
    const to = allocationBackfillTo.trim();
    if ((from && !to) || (!from && to)) {
      setAllocationError("分配起月與分配迄月須一併填寫，或兩者皆留空。");
      return;
    }
    const payload: Record<string, unknown> = {
      monthlyAllocation: parseInt(allocationInput, 10),
    };
    if (from && to) {
      payload.backfillFromMonth = from;
      payload.backfillToMonth = to;
    }
    const res = await fetch(
      `/api/admin/members/${editAllocationMember.id}/allocation`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      if (typeof d.backfilledMonths === "number" && d.backfilledMonths > 0) {
        setAllocationFeedback(
          `已補齊 ${d.backfilledMonths} 個缺漏月配入帳（成員餘額已同步增加）。`
        );
      }
      setEditAllocationMember(null);
      setAllocationInput("");
      setAllocationBackfillFrom("");
      setAllocationBackfillTo("");
      setAllocationError(null);
      fetchMembers();
    } else {
      const err = await res.json().catch(() => ({}));
      setAllocationError(
        typeof err?.error === "string" ? err.error : "儲存失敗，請稍後再試。"
      );
    }
  }

  if (loading) return <div className="p-8 text-gray-500">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">成員帳號管理</h1>

        {allocationFeedback && (
          <div className="flex items-start justify-between gap-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <span>{allocationFeedback}</span>
            <button
              type="button"
              onClick={() => setAllocationFeedback(null)}
              className="shrink-0 text-emerald-600 hover:underline"
            >
              關閉
            </button>
          </div>
        )}

        {/* 新增成員 */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">新增成員</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="姓名"
              required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={loginNumber}
              onChange={(e) => setLoginNumber(e.target.value)}
              placeholder="登入號碼"
              required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="初始密碼"
              required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {createError && (
              <p className="sm:col-span-3 text-red-500 text-sm">{createError}</p>
            )}
            <button
              type="submit"
              className="sm:col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm"
            >
              新增
            </button>
          </form>
        </section>

        {/* 成員列表 */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">成員列表</h2>
          {members.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無成員</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">姓名</th>
                  <th className="pb-2">登入號碼</th>
                  <th className="pb-2">角色</th>
                  <th className="pb-2">月分配</th>
                  <th className="pb-2">餘額</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2">{m.name}</td>
                    <td className="py-2">{m.loginNumber}</td>
                    <td className="py-2">
                      {m.role === "MANAGER" ? "管理者" : "成員"}
                    </td>
                    <td className="py-2">{money(m.monthlyAllocation)}</td>
                    <td className={`py-2 ${m.balance < 0 ? "text-red-500" : ""}`}>
                      {money(m.balance)}
                    </td>
                    <td className="py-2 whitespace-nowrap text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openAllocationModal(m)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        設定分配
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetTargetId(m.id);
                          setResetError("");
                          setResetSuccess("");
                        }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        重設密碼
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(m);
                          setDeleteError("");
                        }}
                        className="text-red-500 hover:underline text-xs"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        {/* 支出類別管理 */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">支出類別管理</h2>
          <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="新類別名稱"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              新增
            </button>
          </form>
          {categoryError && (
            <p className="text-red-500 text-sm mb-3">{categoryError}</p>
          )}
          {categories.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無類別，請先新增</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                >
                  {c.name}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-gray-400 hover:text-red-500 text-xs leading-none"
                    title="刪除類別"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 重設密碼 Modal */}
      {resetTargetId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">重設密碼</h3>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密碼"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              {resetError && <p className="text-red-500 text-sm">{resetError}</p>}
              {resetSuccess && <p className="text-green-600 text-sm">{resetSuccess}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
                >
                  確認
                </button>
                <button
                  type="button"
                  onClick={() => setResetTargetId(null)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-2">刪除成員</h3>
            <p className="text-sm text-gray-600 mb-4">
              確定刪除「{deleteTarget.name}」嗎？此操作將停用該帳號，歷史記錄仍保留。
            </p>
            {deleteError && <p className="text-red-500 text-sm mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {deleteSubmitting ? "刪除中…" : "確認刪除"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 設定分配 Modal */}
      {editAllocationMember !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-1">
              設定月分配金額 — {editAllocationMember.name}
            </h3>

            {/* 目前設定 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p className="font-medium text-gray-700 mb-1">目前設定</p>
              {allocationHistoryLoading ? (
                <p className="text-gray-400">載入中…</p>
              ) : allocationHistory.length > 0 ? (
                <p>
                  {money(allocationHistory[0].monthlyAllocationAfter)} ／月
                  {allocationHistory[0].requestedBackfillFromMonth ?? "—"}
                  {" "}～{" "}
                  {allocationHistory[0].requestedBackfillToMonth ?? "—"}
                </p>
              ) : (
                <p className="text-gray-400">尚無設定紀錄</p>
              )}
            </div>

            <p className="text-xs text-gray-500 mb-3">
              此為每月發給該成員之額度；儲存後會依起迄或預設規則補齊缺漏月份的入帳紀錄。
            </p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    分配起月（選填）
                  </label>
                  <input
                    type="month"
                    value={allocationBackfillFrom}
                    onChange={(e) => setAllocationBackfillFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    分配迄月（選填）
                  </label>
                  <input
                    type="month"
                    value={allocationBackfillTo}
                    onChange={(e) => setAllocationBackfillTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                僅在起迄皆選定時才限制補帳區間；留空則自帳號建立月至本月補齊缺漏月配。
              </p>
              {allocationError && (
                <p className="text-red-500 text-sm">{allocationError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
                >
                  確認
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditAllocationMember(null);
                    setAllocationBackfillFrom("");
                    setAllocationBackfillTo("");
                    setAllocationError(null);
                  }}
                  className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
