import { format, kes } from '@kodibox/core';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-3 p-8">
      <h1 className="text-4xl font-semibold text-brand">Kodibox</h1>
      <p className="text-muted">Rent and property management for Kenya.</p>
      <p className="rounded-lg bg-amber px-3 py-1 font-mono text-sm">{format(kes(123_400n))}</p>
    </main>
  );
}
