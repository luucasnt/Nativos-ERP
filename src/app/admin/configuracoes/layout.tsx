export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1280px]">
      {children}
    </div>
  );
}
