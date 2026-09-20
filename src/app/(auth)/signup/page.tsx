import Link from "next/link";

import { signUp } from "@/app/actions/auth";
import { PrimaryButton } from "@/components/ui/surface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F1F9] p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_6px_20px_rgba(28,27,41,0.06)]">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
          <span className="text-lg font-extrabold">financeX</span>
        </div>
        <h1 className="text-[22px] font-extrabold">Create account</h1>
        <p className="mt-1 text-sm font-semibold text-[#6E6B82]">
          Start tracking your income, spending, and savings
        </p>
        <form action={signUp} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <PrimaryButton type="submit" className="w-full">
            Create account
          </PrimaryButton>
        </form>
        <p className="mt-4 text-center text-sm font-semibold text-[#6E6B82]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#6C3FD1] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
