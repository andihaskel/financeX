/** Decode Santander Uruguay CSV exports (often Latin-1 / Windows-1252). */
export function decodeCsvContent(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("iso-8859-1").decode(buffer);
}

export async function readCsvFile(file: File): Promise<string> {
  return decodeCsvContent(await file.arrayBuffer());
}
