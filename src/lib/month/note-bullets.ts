/** Persist month notes as one bullet per non-empty line. */

export function bulletsFromBody(body: string): string[] {
  const lines = body
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trimEnd())
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [""];
}

export function bodyFromBullets(bullets: string[]): string {
  return bullets
    .map((bullet) => bullet.trim())
    .filter(Boolean)
    .join("\n");
}

export function bulletsEqual(a: string[], b: string[]): boolean {
  return bodyFromBullets(a) === bodyFromBullets(b);
}
