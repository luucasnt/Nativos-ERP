import { LoginPanel } from "./login-panel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <LoginPanel next={next} />;
}
