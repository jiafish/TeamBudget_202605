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

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [loginNumber, setLoginNumber] = useState("");
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState("");
  const [resetTargetId, setResetTargetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

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
    const res = await fetch(
      `/api/admin/members/${resetTargetId}/reset-password`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      }
    );
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

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError("");
    const name = newCategoryName.trim();
    if (!name) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
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

  if (loading) return <div className="p-8 text-gray-500">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">成員帳號管理</h1>

      {/* Create member form */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
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

      {/* Member list */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
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
                  <td className="py-2">${m.monthlyAllocation.toLocaleString()}</td>
                  <td className={`py-2 ${m.balance < 0 ? "text-red-500" : ""}`}>
                    ${m.balance.toLocaleString()}
                  </td>
                  <td className="py-2">
                    {m.role !== "MANAGER" && (
                      <button
                        onClick={() => {
                          setResetTargetId(m.id);
                          setResetError("");
                          setResetSuccess("");
                        }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        重設密碼
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Category management */}
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

      {/* Reset password modal */}
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
              {resetError && (
                <p className="text-red-500 text-sm">{resetError}</p>
              )}
              {resetSuccess && (
                <p className="text-green-600 text-sm">{resetSuccess}</p>
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
      </div>
    </div>
  );
}
