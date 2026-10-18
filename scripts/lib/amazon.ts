import type { Dimensions } from "../../src/domain/types.ts";

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const DIMENSIONS = new RegExp(
  String.raw`Dimensions[\s\S]{0,400}?${NUMBER}\s*x\s*${NUMBER}\s*x\s*${NUMBER}\s*cm`,
);

export function parseAmazonDimensions(html: string): Dimensions | null {
  const match = DIMENSIONS.exec(html);
  if (!match) {
    return null;
  }
  const [thickness, width, height] = match
    .slice(1, 4)
    .map((n) => Number(n.replace(",", ".")))
    .sort((a, b) => a - b);
  return { width, thickness, height };
}

export function isCaptchaPage(html: string): boolean {
  return /validateCaptcha|captchacharacters/i.test(html);
}

export function isbn13ToAsin(isbn: string): string | null {
  const digits = isbn.replace(/[^0-9]/g, "");
  if (digits.length !== 13 || !digits.startsWith("978")) {
    return null;
  }
  const core = digits.slice(3, 12);
  const sum = core.split("").reduce((acc, d, i) => acc + Number(d) * (10 - i), 0);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}
