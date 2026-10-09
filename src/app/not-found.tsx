import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="text-3xl font-extrabold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">That page does not exist. Your data is safe on this phone.</p>
      <Link href="/today/" className="press mt-6 inline-flex min-h-tap items-center justify-center rounded-full bg-accent px-6 font-bold text-white">
        Back to Today
      </Link>
    </main>
  );
}
