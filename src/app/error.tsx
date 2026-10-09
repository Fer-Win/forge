'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted">Your logged data is stored on this phone and has not been touched. Try again, or reload the app.</p>
      <button type="button" onClick={reset} className="press mt-6 inline-flex min-h-tap items-center justify-center rounded-full bg-accent px-6 font-bold text-white">
        Try again
      </button>
    </main>
  );
}
