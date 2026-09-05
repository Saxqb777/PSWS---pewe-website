import type { ReactNode } from "react";

export function ErpHead({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 border-b-2 border-ink pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[27px] leading-tight sm:text-[31px]">{title}</h1>
          {lede && (
            <p className="mt-2 max-w-3xl text-[15.5px] leading-[1.68] text-ink-2">{lede}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
