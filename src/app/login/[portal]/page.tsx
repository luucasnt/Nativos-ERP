import { notFound } from "next/navigation";
import { isLoginPortal } from "../login-panel";
import { LoginScreen } from "../login-screen";

export default async function PortalLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ portal: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ portal }, { next }] = await Promise.all([params, searchParams]);

  if (!isLoginPortal(portal)) {
    notFound();
  }

  return <LoginScreen portal={portal} next={next} />;
}

