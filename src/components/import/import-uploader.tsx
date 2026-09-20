"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import {
  parseUploadedFiles,
  processImport,
  type ParsedFilePreview,
} from "@/app/actions/import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, AccountType } from "@/types/database";
import {
  defaultAccountForPreview,
  matchAccountForImport,
} from "@/lib/accounts/helpers";

interface ImportUploaderProps {
  accounts: Account[];
}

export function ImportUploader({ accounts }: ImportUploaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [previews, setPreviews] = useState<ParsedFilePreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [accountMappings, setAccountMappings] = useState<
    Record<string, { accountId?: string; createName?: string }>
  >({});

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    startTransition(async () => {
      const result = await parseUploadedFiles(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPreviews(result.previews ?? []);
      setErrors(result.errors ?? []);

      const mappings: typeof accountMappings = {};
      for (const preview of result.previews ?? []) {
        const match = matchAccountForImport(
          {
            accountType: preview.accountType,
            currency: preview.currency,
            institution: preview.institution,
          },
          accounts
        );
        mappings[preview.filename] = {
          accountId: match.account?.id,
          createName: defaultAccountForPreview({
            accountType: preview.accountType,
            currency: preview.currency,
            institution: preview.institution,
          }).name,
        };
      }
      setAccountMappings(mappings);
    });
  }

  async function handleImport() {
    startTransition(async () => {
      const mappings: Record<
        string,
        {
          accountId?: string;
          createAccount?: { name: string; institution: string; type: AccountType };
        }
      > = {};

      for (const preview of previews) {
        const mapping = accountMappings[preview.filename];
        if (mapping?.accountId) {
          mappings[preview.filename] = { accountId: mapping.accountId };
        } else {
          mappings[preview.filename] = {
            createAccount: defaultAccountForPreview({
              accountType: preview.accountType,
              currency: preview.currency,
              institution: preview.institution,
            }),
          };
        }
      }

      const result = await processImport(previews, mappings);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Imported ${result.totalImported} transactions. ${result.totalSkipped} duplicates skipped.`
      );

      if (result.redirectTo) {
        router.push(result.redirectTo);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <label
            htmlFor="csv-upload"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-12 transition-colors hover:bg-muted/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Drag your files here</p>
            <p className="mt-1 text-sm text-muted-foreground">or choose files</p>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              multiple
              className="mt-4 max-w-xs"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <ul className="space-y-1 text-sm text-destructive">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {previews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{previews.length} files detected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previews.map((preview) => (
              <div
                key={preview.filename}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{preview.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {preview.institution} · {preview.accountType === "credit_card" ? "Credit card" : "Bank account"} · {preview.currency} · {preview.transactionCount} transactions
                    {preview.confidence !== "high" && " · verify account mapping"}
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <Label className="sr-only">Account</Label>
                  <Select
                    value={accountMappings[preview.filename]?.accountId ?? "new"}
                    onValueChange={(value) =>
                      setAccountMappings((prev) => ({
                        ...prev,
                        [preview.filename]: {
                          ...prev[preview.filename],
                          accountId:
                            !value || value === "new" ? undefined : value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Create new account</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button onClick={handleImport} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Processing..." : "Review import"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
