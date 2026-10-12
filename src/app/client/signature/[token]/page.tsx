import ClientSignatureViewClient from "./ClientSignatureViewClient";

export function generateStaticParams() {
  return [{ token: "preview" }];
}

export default function ClientSignaturePage() {
  return <ClientSignatureViewClient />;
}
