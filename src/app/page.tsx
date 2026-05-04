import { redirect } from "next/navigation";
import StaticHome from "./static-home";

export default function Home() {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "1") {
    return <StaticHome />;
  }
  redirect("/login");
}
