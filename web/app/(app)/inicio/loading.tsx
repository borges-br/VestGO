export default function InicioLoading() {
  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="rounded-[2rem] bg-white p-4 shadow-card sm:p-5 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="h-12 w-40 animate-pulse rounded-2xl bg-surface" />
            <div className="hidden h-10 w-96 animate-pulse rounded-full bg-surface lg:block" />
          </div>
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-56 animate-pulse rounded-[1.75rem] bg-primary-deeper/90" />
            <div className="h-56 animate-pulse rounded-[1.75rem] bg-surface" />
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-[1.5rem] bg-white shadow-card" />
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="h-80 animate-pulse rounded-[2rem] bg-white shadow-card" />
          <div className="h-80 animate-pulse rounded-[2rem] bg-white shadow-card" />
        </section>
      </div>
    </div>
  );
}
