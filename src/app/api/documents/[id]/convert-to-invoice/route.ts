import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateNextDocumentNumber } from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { AuditAction, DocumentType, DocumentStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const conversionType: "FULL" | "ADVANCE" | "BALANCE" = body.conversionType || "FULL";
  const advanceAmountTtc: number = parseFloat(body.advanceAmountTtc || "0");
  const advanceDescription: string = body.advanceDescription || "";

  const proforma = await prisma.documentRecord.findUnique({
    where: { id: params.id },
    include: {
      lines: true,
      workspace: true,
      client: true,
    },
  });

  if (!proforma) {
    return NextResponse.json({ error: "Proforma introuvable" }, { status: 404 });
  }

  // Vérifier les documents déjà liés à cette proforma
  const existingDocs = await prisma.documentRecord.findMany({
    where: { proformaId: proforma.id },
    include: { lines: true },
  });

  const existingFinalInvoice = existingDocs.find((d) => d.documentType === DocumentType.INVOICE);
  const existingAdvances = existingDocs.filter((d) => d.documentType === DocumentType.ADVANCE_PAYMENT);

  // CAS 1 : FACTURE D'ACOMPTE
  if (conversionType === "ADVANCE") {
    if (existingFinalInvoice) {
      return NextResponse.json(
        {
          error: `Une facture finale (${existingFinalInvoice.documentNumber}) a déjà été émise pour cette proforma. Impossible de créer un nouvel acompte.`,
        },
        { status: 400 }
      );
    }

    if (advanceAmountTtc <= 0) {
      return NextResponse.json(
        { error: "Veuillez spécifier un montant d'acompte TTC supérieur à 0 €." },
        { status: 400 }
      );
    }

    const previousAdvancesTotal = existingAdvances.reduce((acc, a) => acc + a.totalTtc, 0);
    const maxRemaining = proforma.totalTtc - previousAdvancesTotal;
    if (advanceAmountTtc > maxRemaining) {
      return NextResponse.json(
        {
          error: `Le montant d'acompte (${advanceAmountTtc.toFixed(2)} €) ne peut pas dépasser le reste à facturer de la proforma (${maxRemaining.toFixed(2)} €).`,
        },
        { status: 400 }
      );
    }

    // Calcul HT et TVA standard (20%)
    const taxRate = 20.0;
    const advanceHt = Math.round((advanceAmountTtc / (1 + taxRate / 100)) * 100) / 100;
    const advanceTax = Math.round((advanceAmountTtc - advanceHt) * 100) / 100;

    const { documentNumber, sequentialIndex, year } = await generateNextDocumentNumber(
      proforma.workspaceId,
      DocumentType.ADVANCE_PAYMENT
    );

    const advanceInvoice = await prisma.documentRecord.create({
      data: {
        workspaceId: proforma.workspaceId,
        clientId: proforma.clientId,
        projectId: proforma.projectId,
        documentType: DocumentType.ADVANCE_PAYMENT,
        documentNumber,
        sequentialIndex,
        year,
        status: DocumentStatus.DRAFT,
        proformaId: proforma.id,
        date: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15j pour un acompte
        validityDays: 15,
        paymentTerms: "Paiement à réception par virement ou carte bancaire.",
        notes: proforma.notes,
        internalNotes: `Facture d'acompte émise sur la proforma ${proforma.documentNumber}`,
        specialMentions:
          "Facture d'acompte émise conformément à l'article 289-I-1-c du Code Général des Impôts. TVA acquittée sur les encaissements. Escompte pour paiement anticipé : néant.",
        totalHt: advanceHt,
        totalTax: advanceTax,
        totalTtc: advanceAmountTtc,
        totalPaid: 0,
        balanceDue: advanceAmountTtc,
        advancePercentage: proforma.totalTtc > 0 ? (advanceAmountTtc / proforma.totalTtc) * 100 : 0,
        isImmutable: false,
        lines: {
          create: [
            {
              sortOrder: 1,
              designation: advanceDescription || "Acompte de réservation",
              description: `Acompte contractuel relatif au dossier proforma n° ${proforma.documentNumber}`,
              quantity: 1,
              unit: "Forfait",
              unitPriceHt: advanceHt,
              taxRate: taxRate,
              taxRateName: "TVA 20%",
              totalHt: advanceHt,
              totalTax: advanceTax,
              totalTtc: advanceAmountTtc,
            },
          ],
        },
      },
    });

    // Mettre la proforma en ACCEPTED
    await prisma.documentRecord.update({
      where: { id: proforma.id },
      data: { status: DocumentStatus.ACCEPTED },
    });

    await logAudit({
      workspaceId: proforma.workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
      action: AuditAction.CREATED,
      entityType: "Document",
      entityId: advanceInvoice.id,
      entityReference: advanceInvoice.documentNumber,
      newValue: {
        action: "Création Facture d'Acompte",
        proformaNumber: proforma.documentNumber,
        advanceNumber: advanceInvoice.documentNumber,
        totalTtc: advanceInvoice.totalTtc,
      },
    });

    return NextResponse.json({
      success: true,
      invoice: advanceInvoice,
      message: `Facture d'acompte ${advanceInvoice.documentNumber} (${advanceAmountTtc.toFixed(2)} € TTC) générée avec succès.`,
    });
  }

  // CAS 2 : FACTURE DE SOLDE (après un ou plusieurs acomptes)
  if (conversionType === "BALANCE") {
    if (existingFinalInvoice) {
      return NextResponse.json(
        {
          error: `Une facture de solde (${existingFinalInvoice.documentNumber}) a déjà été émise pour cette proforma.`,
          invoiceId: existingFinalInvoice.id,
        },
        { status: 400 }
      );
    }

    const { documentNumber, sequentialIndex, year } = await generateNextDocumentNumber(
      proforma.workspaceId,
      DocumentType.INVOICE
    );

    // Lignes de base de la proforma
    const baseLines = proforma.lines.map((l, idx) => ({
      sortOrder: idx + 1,
      designation: l.designation,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPriceHt: l.unitPriceHt,
      taxRate: l.taxRate,
      taxRateName: l.taxRateName,
      totalHt: l.totalHt,
      totalTax: l.totalTax,
      totalTtc: l.totalTtc,
    }));

    // Lignes de déduction pour chaque acompte émis
    let deductedHt = 0;
    let deductedTax = 0;
    let deductedTtc = 0;

    const advanceDeductionLines = existingAdvances.map((adv, idx) => {
      deductedHt += adv.totalHt;
      deductedTax += adv.totalTax;
      deductedTtc += adv.totalTtc;

      return {
        sortOrder: baseLines.length + idx + 1,
        designation: `Moins acompte déduit (Facture n° ${adv.documentNumber})`,
        description: `Règlement d'acompte facturé le ${new Date(adv.date).toLocaleDateString("fr-FR")}`,
        quantity: 1,
        unit: "Forfait",
        unitPriceHt: -Math.abs(adv.totalHt),
        taxRate: 20.0,
        taxRateName: "TVA 20%",
        totalHt: -Math.abs(adv.totalHt),
        totalTax: -Math.abs(adv.totalTax),
        totalTtc: -Math.abs(adv.totalTtc),
      };
    });

    const netHt = Math.max(0, proforma.totalHt - deductedHt);
    const netTax = Math.max(0, proforma.totalTax - deductedTax);
    const netTtc = Math.max(0, proforma.totalTtc - deductedTtc);

    const advanceRefString = existingAdvances.map((a) => a.documentNumber).join(", ");

    const finalInvoice = await prisma.documentRecord.create({
      data: {
        workspaceId: proforma.workspaceId,
        clientId: proforma.clientId,
        projectId: proforma.projectId,
        documentType: DocumentType.INVOICE,
        documentNumber,
        sequentialIndex,
        year,
        status: DocumentStatus.DRAFT,
        proformaId: proforma.id,
        date: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        validityDays: 30,
        paymentTerms: proforma.paymentTerms || "Règlement du solde à réception.",
        notes: proforma.notes,
        internalNotes: `Facture de solde d'après proforma ${proforma.documentNumber}. Acomptes déduits : ${advanceRefString}`,
        specialMentions: `Facture de solde définitive. Référence proforma d'origine : ${proforma.documentNumber}. Acomptes déduits : ${advanceRefString}.`,
        totalHt: netHt,
        totalTax: netTax,
        totalTtc: netTtc,
        totalPaid: 0,
        balanceDue: netTtc,
        advancePercentage: proforma.totalTtc > 0 ? (deductedTtc / proforma.totalTtc) * 100 : 0,
        isImmutable: false,
        lines: {
          create: [...baseLines, ...advanceDeductionLines],
        },
      },
    });

    await prisma.documentRecord.update({
      where: { id: proforma.id },
      data: { status: DocumentStatus.ACCEPTED },
    });

    await logAudit({
      workspaceId: proforma.workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
      action: AuditAction.CREATED,
      entityType: "Document",
      entityId: finalInvoice.id,
      entityReference: finalInvoice.documentNumber,
      newValue: {
        action: "Génération Facture de Solde avec déduction acomptes",
        proformaNumber: proforma.documentNumber,
        invoiceNumber: finalInvoice.documentNumber,
        deductedTtc,
        netTtc: finalInvoice.totalTtc,
      },
    });

    return NextResponse.json({
      success: true,
      invoice: finalInvoice,
      message: `Facture de solde ${finalInvoice.documentNumber} créée avec succès (${netTtc.toFixed(2)} € TTC restants).`,
    });
  }

  // CAS 3 : FACTURE COMPLÈTE (100%)
  if (existingFinalInvoice) {
    return NextResponse.json(
      {
        error: `Une facture comptable existe déjà pour cette proforma : ${existingFinalInvoice.documentNumber}`,
        invoiceId: existingFinalInvoice.id,
      },
      { status: 400 }
    );
  }

  const { documentNumber, sequentialIndex, year } = await generateNextDocumentNumber(
    proforma.workspaceId,
    DocumentType.INVOICE
  );

  const invoice = await prisma.documentRecord.create({
    data: {
      workspaceId: proforma.workspaceId,
      clientId: proforma.clientId,
      projectId: proforma.projectId,
      documentType: DocumentType.INVOICE,
      documentNumber,
      sequentialIndex,
      year,
      status: DocumentStatus.DRAFT,
      proformaId: proforma.id,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      validityDays: 30,
      paymentTerms: proforma.paymentTerms,
      notes: proforma.notes,
      internalNotes: `Facture générée d'après la proforma acceptée ${proforma.documentNumber}`,
      specialMentions: proforma.specialMentions,
      totalHt: proforma.totalHt,
      totalTax: proforma.totalTax,
      totalTtc: proforma.totalTtc,
      totalPaid: 0,
      balanceDue: proforma.totalTtc,
      advancePercentage: proforma.advancePercentage,
      isImmutable: false,
      lines: {
        create: proforma.lines.map((l) => ({
          sortOrder: l.sortOrder,
          designation: l.designation,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPriceHt: l.unitPriceHt,
          taxRate: l.taxRate,
          taxRateName: l.taxRateName,
          totalHt: l.totalHt,
          totalTax: l.totalTax,
          totalTtc: l.totalTtc,
        })),
      },
    },
  });

  await prisma.documentRecord.update({
    where: { id: proforma.id },
    data: {
      status: DocumentStatus.ACCEPTED,
    },
  });

  await logAudit({
    workspaceId: proforma.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.CREATED,
    entityType: "Document",
    entityId: invoice.id,
    entityReference: invoice.documentNumber,
    newValue: {
      action: "Conversion de proforma en facture comptable",
      proformaNumber: proforma.documentNumber,
      invoiceNumber: invoice.documentNumber,
      totalTtc: invoice.totalTtc,
    },
  });

  return NextResponse.json({
    success: true,
    invoice,
    message: `Facture ${invoice.documentNumber} créée avec succès.`,
  });
}
