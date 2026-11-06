export function WorkspaceRouteLoading({
  title,
  kind = "list",
}: {
  title: string;
  kind?: "list" | "dashboard" | "settings" | "inbox";
}) {
  return (
    <div
      className="mx-auto min-h-[100svh] max-w-[100rem] p-4 text-white sm:p-6"
      role="status"
      aria-label={`Opening ${title}`}
      aria-busy="true"
    >
      <span className="sr-only">
        Opening {title}. Your workspace data is on its way.
      </span>
      <div
        aria-hidden="true"
        className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"
      >
        <aside className="hidden min-h-[80svh] rounded-2xl border border-white/10 bg-white/[.025] p-5 lg:block">
          <div className="mb-10 h-7 w-28 rounded-md bg-white/10" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="mb-5 h-5 w-3/4 rounded bg-white/[.055]" />
          ))}
        </aside>
        <main className="min-w-0">
          <div className="mb-7 flex h-14 items-center rounded-xl border border-white/10 bg-white/[.025] px-4 lg:hidden">
            <div className="h-6 w-20 rounded bg-white/10" />
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="mb-8 mt-3 h-4 w-2/3 max-w-sm rounded bg-white/5" />
          {kind === "dashboard" ? (
            <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl border border-white/10 p-4"
                >
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                  <div className="mt-5 h-7 w-2/3 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : null}
          <div
            className={`min-h-80 overflow-hidden rounded-2xl border border-white/10 ${kind === "inbox" ? "grid md:grid-cols-[280px_1fr]" : ""}`}
          >
            <div className="p-5">
              <div className="mb-6 h-10 max-w-sm rounded-lg bg-white/5" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex min-h-16 items-center gap-5 border-t border-white/5"
                >
                  <div className="size-8 shrink-0 rounded-lg bg-white/5" />
                  <div className="h-4 w-1/3 rounded bg-white/5" />
                  <div className="ml-auto h-4 w-1/5 rounded bg-white/5" />
                </div>
              ))}
            </div>
            {kind === "inbox" ? (
              <div className="hidden border-l border-white/10 p-6 md:block">
                <div className="h-20 w-3/4 rounded-2xl bg-white/5" />
                <div className="ml-auto mt-6 h-16 w-2/3 rounded-2xl bg-white/5" />
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
