import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TaxSettingsClient from "@/components/settings/TaxSettingsClient";

export default async function TaxSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [taxRates, workspaces] = await Promise.all([
    prisma.taxRate.findMany({
      include: { workspace: { select: { slug: true, name: true } } },
      orderBy: { rate: "desc" },
    }),
    prisma.workspace.findMany({
      select: { id: true, slug: true, name: true },
    }),
  ]);

  return <TaxSettingsClient initialTaxRates={taxRates} workspaces={workspaces} />;
}
