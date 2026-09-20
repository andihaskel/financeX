import Link from "next/link";
import { notFound } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { getUser } from "@/lib/supabase/server";

export default async function AppsPortalPage() {
  const user = await getUser();
  if (!user) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-10 sm:py-16">
      <div className="w-full max-w-[720px]">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
          <div className="text-base font-extrabold">Your space</div>
        </div>
        <h1 className="mb-1.5 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
          Good to see you
        </h1>
        <p className="mb-10 text-[15px] font-semibold text-[#6E6B82]">
          Pick an app to open.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          <Link
            href="/home"
            className="rounded-[22px] bg-white p-6 shadow-[0_6px_20px_rgba(28,27,41,0.06)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(28,27,41,0.08)]"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] text-xl font-extrabold text-white">
              $
            </div>
            <div className="mb-1 text-base font-extrabold">financeX</div>
            <div className="text-[13px] font-semibold text-[#6E6B82]">
              Household money, movements &amp; commitments
            </div>
          </Link>

          <div
            aria-disabled
            className="rounded-[22px] bg-white p-6 opacity-50 shadow-[0_6px_20px_rgba(28,27,41,0.06)]"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EDEAF7] text-xl text-[#B3AFC4]">
              +
            </div>
            <div className="mb-1 text-base font-extrabold text-[#9E9AB0]">
              More coming soon
            </div>
            <div className="text-[13px] font-semibold text-[#B3AFC4]">
              New apps will show up here
            </div>
          </div>
        </div>

        <form action={signOut} className="mt-12">
          <button
            type="submit"
            className="text-sm font-semibold text-[#9E9AB0] hover:text-[#6E6B82]"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
