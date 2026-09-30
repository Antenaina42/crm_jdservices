import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UsersSettingsClient from "@/components/settings/UsersSettingsClient";

export default async function UsersSettingsPage() {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    redirect("/workspace-select");
  }

  const users = await prisma.user.findMany({
    include: {
      workspaceUsers: {
        include: { workspace: { select: { slug: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <UsersSettingsClient initialUsers={users} currentUserId={session.id} />;
}
