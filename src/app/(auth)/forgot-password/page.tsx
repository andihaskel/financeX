import Link from "next/link";

import { requestPasswordReset } from "@/app/actions/auth";
import { PrimaryButton } from "@/components/ui/surface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F1F9] p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_6px_20px_rgba(28,27,41,0.06)]">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
          <span className="text-lg font-extrabold">financeX</span>
        </div>
        <h1 className="text-[22px] font-extrabold">Reset password</h1>
        <p className="mt-1 text-sm font-semibold text-[#6E6B82]">
          We’ll email you a link to choose a new password
        </p>

        {params.sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-[14px] bg-[#EAF7F0] px-4 py-3 text-sm font-semibold text-[#0F9D58]">
              Check your email for a reset link.
            </p>
            <Link
              href="/login"
              className="block text-center text-sm font-bold text-[#6C3FD1] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form action={requestPasswordReset} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              {params.error && (
                <p className="text-sm font-semibold text-red-600">{params.error}</p>
              )}
              <PrimaryButton type="submit" className="w-full">
                Send reset link
              </PrimaryButton>
            </form>
            <p className="mt-4 text-center text-sm font-semibold text-[#6E6B82]">
              <Link href="/login" className="font-bold text-[#6C3FD1] hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
