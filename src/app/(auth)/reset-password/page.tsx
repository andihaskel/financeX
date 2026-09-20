import Link from "next/link";
import { redirect } from "next/navigation";

import { updatePassword } from "@/app/actions/auth";
import { PrimaryButton } from "@/components/ui/surface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUser } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = await getUser();

  if (!user) {
    redirect("/login?error=" + encodeURIComponent("Open the reset link from your email"));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F1F9] p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_6px_20px_rgba(28,27,41,0.06)]">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
          <span className="text-lg font-extrabold">financeX</span>
        </div>
        <h1 className="text-[22px] font-extrabold">Choose a new password</h1>
        <p className="mt-1 text-sm font-semibold text-[#6E6B82]">
          Enter a new password for {user.email}
        </p>
        <form action={updatePassword} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {params.error && (
            <p className="text-sm font-semibold text-red-600">{params.error}</p>
          )}
          <PrimaryButton type="submit" className="w-full">
            Update password
          </PrimaryButton>
        </form>
        <p className="mt-4 text-center text-sm font-semibold text-[#6E6B82]">
          <Link href="/login" className="font-bold text-[#6C3FD1] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
