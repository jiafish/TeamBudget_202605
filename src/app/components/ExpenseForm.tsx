"use client";

import { useState } from "react";

interface ExpenseFormProps {
  onSuccess: (newBalance: number) => void;
}

export default function ExpenseForm({ onSuccess }: ExpenseFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const amountNum = parseInt(amount);
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      setError("金額必須為正整數");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("amount", String(amountNum));
    formData.append("date", date);
    formData.append("description", description);
    if (receipt) formData.append("receipt", receipt);

    const res = await fetch("/api/expenses", {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "登錄失敗");
      return;
    }

    // Fetch updated balance
    const balanceRes = await fetch("/api/auth/me");
    if (balanceRes.ok) {
      const me = await balanceRes.json();
      onSuccess(me.balance);
    }

    setAmount("");
    setDate(today);
    setDescription("");
    setReceipt(null);
    const fileInput = document.getElementById("receipt-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            日期
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            金額（元）
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="例如 500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          說明
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="請輸入用途說明"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          收據（選填，JPEG/PNG/WebP，最大 10MB）
        </label>
        <input
          id="receipt-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
      >
        {loading ? "登錄中..." : "登錄支出"}
      </button>
    </form>
  );
}
