export default function PublicFormLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
          <div className="mb-8 space-y-3">
            <div className="h-8 w-1/2 rounded-lg bg-slate-200" />
            <div className="h-4 w-3/4 rounded-lg bg-slate-200" />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded-md bg-slate-200" />
              <div className="h-12 w-full rounded-xl bg-slate-200" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-md bg-slate-200" />
              <div className="h-12 w-full rounded-xl bg-slate-200" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 rounded-md bg-slate-200" />
              <div className="h-32 w-full rounded-xl bg-slate-200" />
            </div>
            <div className="h-14 w-full rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
