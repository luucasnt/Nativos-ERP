import { LoginPattern } from "@/components/brand/login-pattern";
import { LoginPanel } from "./login-panel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1">
      <div className="relative hidden w-[42%] shrink-0 overflow-hidden bg-forest lg:block">
        <LoginPattern />
      </div>
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        style={{
          background:
            "radial-gradient(120% 100% at 15% 0%, #fffdf8 0%, var(--color-cream) 55%)",
        }}
      >
        <LoginPanel next={next} />
      </div>
    </main>
  );
}
