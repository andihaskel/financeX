import Link from "next/link";

export function TargetYearNav({ year }: { year: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Link
        href={`/target/annual?year=${year - 1}`}
        className="flex size-9 items-center justify-center rounded-full bg-white text-base font-bold text-[#6E6B82] shadow-[0_2px_8px_rgba(28,27,41,0.06)] transition-colors hover:text-[#6C3FD1]"
        aria-label="Previous year"
      >
        ‹
      </Link>
      <span className="rounded-[12px] bg-white px-4 py-2.5 text-[13px] font-bold shadow-[0_2px_8px_rgba(28,27,41,0.06)]">
        {year}
      </span>
      <Link
        href={`/target/annual?year=${year + 1}`}
        className="flex size-9 items-center justify-center rounded-full bg-white text-base font-bold text-[#6E6B82] shadow-[0_2px_8px_rgba(28,27,41,0.06)] transition-colors hover:text-[#6C3FD1]"
        aria-label="Next year"
      >
        ›
      </Link>
    </div>
  );
}
