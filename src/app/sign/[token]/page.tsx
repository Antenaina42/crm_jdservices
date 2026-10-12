import ClientRedirect from "./ClientRedirect";

export function generateStaticParams() {
  return [{ token: "preview" }];
}

export default function SignTokenPage() {
  return <ClientRedirect />;
}
