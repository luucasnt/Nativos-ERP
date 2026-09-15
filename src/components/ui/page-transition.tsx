type PageTransitionProps = {
  children: React.ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  return <div className="page-enter w-full min-w-0 max-w-full">{children}</div>;
}
