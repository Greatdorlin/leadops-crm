import Link from "next/link";

export default function FormNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
          <span className="text-2xl font-bold text-slate-400">404</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
          Form not found
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          The form you are looking for does not exist or is no longer available.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
