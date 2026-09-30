import { redirect } from "next/navigation";

export default function SignTokenPage({ params }: { params: { token: string } }) {
  redirect(`/client/signature/${params.token}`);
}
