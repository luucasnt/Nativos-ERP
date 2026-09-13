type PanelProps = {
  title?: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
};

export function Panel({ title, meta, children, className = "" }: PanelProps) {
  return (
    <div className={`mb-5 rounded-[4px] border border-border bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
          {meta && <span className="text-xs text-ink-500">{meta}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
