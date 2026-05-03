import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const recordId = parseInt(id);
  if (isNaN(recordId)) {
    return NextResponse.json({ error: "無效的記錄 ID" }, { status: 400 });
  }

  const record = await prisma.expenseRecord.findUnique({
    where: { id: recordId },
  });

  if (!record) {
    return NextResponse.json({ error: "記錄不存在" }, { status: 404 });
  }

  // Only the record owner or a MANAGER can access the receipt
  if (session.role !== "MANAGER" && record.userId !== session.userId) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  if (!record.receiptPath) {
    return NextResponse.json({ error: "此記錄無收據" }, { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "uploads",
    "receipts",
    record.receiptPath
  );

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "收據檔案不存在" }, { status: 404 });
  }

  const ext = record.receiptPath.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentTypeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const contentType = contentTypeMap[ext] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: { "Content-Type": contentType },
  });
}
