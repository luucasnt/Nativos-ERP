import { LoginScreen } from "./login-screen";
import { isLoginPortal } from "./login-panel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; portal?: string }>;
}) {
  const { next, portal } = await searchParams;

  return <LoginScreen next={next} portal={isLoginPortal(portal) ? portal : "admin"} />;
}
