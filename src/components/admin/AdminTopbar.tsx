import type { ReactNode } from "react";

export function AdminTopbar({
  title,
  actions,
  searchSlot,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  searchSlot?: ReactNode;
}) {
  return (
    <header className="border-b border-white/10 pb-4 pt-2 sm:pb-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-[1_1_16rem]">
          <h1 className="break-words text-2xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-3xl">
            {title}
          </h1>
        </div>
        {actions ? (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 [&>*]:max-w-full">
            {actions}
          </div>
        ) : null}
      </div>
      {searchSlot ? <div className="mt-4 min-w-0">{searchSlot}</div> : null}
    </header>
  );
}
