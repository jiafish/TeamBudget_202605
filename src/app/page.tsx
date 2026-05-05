import { redirect } from "next/navigation";

export default function Home() {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "1") {
    redirect("/admin/overview");
  }
  if (process.env.DEMO_MODE === "true") {
    redirect("/admin/overview");
  }
  redirect("/login");
}
