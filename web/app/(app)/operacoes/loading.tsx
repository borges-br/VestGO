export default function OperacoesLoading() {
  return (
    <div className="vg-dark-fix px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <div className="space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full max-w-xl animate-pulse rounded bg-gray-200" />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[14px] border border-gray-100 bg-white"
              />
            ))}
          </div>
        </div>

        <div className="h-20 animate-pulse rounded-[14px] border border-gray-100 bg-white" />

        <section className="rounded-[14px] border border-gray-100 bg-white/70 p-3">
          <div className="grid gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-[76px] animate-pulse rounded-[14px] border border-gray-100 bg-white"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

