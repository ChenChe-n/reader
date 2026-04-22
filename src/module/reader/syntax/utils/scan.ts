export function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

export function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char);
}

export function readQuotedString(line: string, start: number): number {
  const quote = line[start];
  let index = start + 1;
  while (index < line.length) {
    const char = line[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    index += 1;
    if (char === quote) break;
  }
  return index;
}

export function readTemplateString(line: string, start: number): number {
  let index = start + 1;
  while (index < line.length) {
    const char = line[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    index += 1;
    if (char === "`") break;
  }
  return index;
}

export function nextNonSpace(line: string, start: number): string {
  let index = start;
  while (index < line.length && /\s/.test(line[index])) index += 1;
  return line[index] || "";
}

