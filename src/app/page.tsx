import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";

export default async function HomePage() {
  const session = await getAdminSession();
  redirect(session ? appRoutes.dashboard : appRoutes.login);
}
