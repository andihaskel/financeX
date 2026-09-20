"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useImportDialog } from "@/components/import/import-dialog-store";

export function OpenImportOnQuery() {
  const searchParams = useSearchParams();
  const { open } = useImportDialog();

  useEffect(() => {
    if (searchParams.get("import") === "1") {
      open();
    }
  }, [searchParams, open]);

  return null;
}
