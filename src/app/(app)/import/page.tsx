import { format } from "date-fns";
import Link from "next/link";

import { ImportUploader } from "@/components/import/import-uploader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccounts, getImports } from "@/lib/queries/finance";

export default async function ImportPage() {
  const [accounts, imports] = await Promise.all([getAccounts(), getImports()]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload Santander bank and credit card CSV exports
        </p>
      </div>

      <ImportUploader accounts={accounts} />

      {imports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {imports.map((imp) => (
              <Link
                key={imp.id}
                href={imp.status === "review" ? `/review/${imp.id}` : `/review/${imp.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{imp.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(imp.imported_at), "MMMM yyyy")} · {imp.transaction_count} transactions
                  </p>
                </div>
                <Badge variant={imp.status === "completed" ? "secondary" : "outline"}>
                  {imp.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
