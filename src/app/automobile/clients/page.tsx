import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, Plus, Search, Car, Mail, Phone, MapPin, ArrowRight, ShieldCheck, ChevronRight } from "lucide-react";
import ClientListClient from "@/components/clients/ClientListClient";

export default async function AutomobileClientsPage() {
  const { workspace, user } = await requireWorkspace("automobile");

  // Requête serveur avec isolation STRICTE sur workspaceId
  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    include: {
      projects: { select: { id: true, title: true, vehicleMake: true, vehicleModel: true, status: true } },
      documents: { select: { id: true, documentNumber: true, totalTtc: true, status: true, documentType: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <ClientListClient
        workspace={workspace}
        user={user}
        initialClients={clients}
        workspaceSlug="automobile"
      />
    </WorkspaceLayout>
  );
}
