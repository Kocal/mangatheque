import { describe, expect, test } from "vite-plus/test";
import { isbn13ToAsin, isCaptchaPage, parseAmazonDimensions } from "./amazon.ts";

const detailLine = (value: string) =>
  `<li><span class="a-list-item"> <span class="a-text-bold">Dimensions
    &rlm;
    :
    &lrm;
  </span>                <span>${value}</span>       </span></li>`;

describe("parseAmazonDimensions", () => {
  test("parses dimensions with dots", () => {
    expect(parseAmazonDimensions(detailLine("11.5 x 1.9 x 18 cm"))).toEqual({
      width: 11.5,
      thickness: 1.9,
      height: 18,
    });
  });

  test("parses dimensions with commas", () => {
    expect(parseAmazonDimensions(detailLine("15 x 3,2 x 21 cm"))).toEqual({
      width: 15,
      thickness: 3.2,
      height: 21,
    });
  });

  test("sorts the three numbers whatever their order", () => {
    expect(parseAmazonDimensions(detailLine("18 x 11.5 x 1.9 cm"))).toEqual({
      width: 11.5,
      thickness: 1.9,
      height: 18,
    });
  });

  test("ignores sizes that are not under the Dimensions label", () => {
    expect(parseAmazonDimensions(`<span>Poster 40 x 50 x 1 cm</span>`)).toBeNull();
  });

  test("returns null without dimensions", () => {
    expect(parseAmazonDimensions("<html><body>Rien ici</body></html>")).toBeNull();
  });
});

describe("isCaptchaPage", () => {
  test("detects a captcha page", () => {
    expect(isCaptchaPage(`<form action="/errors/validateCaptcha">`)).toBe(true);
  });

  test("accepts a product page", () => {
    expect(isCaptchaPage(detailLine("11.5 x 1.9 x 18 cm"))).toBe(false);
  });
});

describe("isbn13ToAsin", () => {
  test("converts an ISBN-13 to an ISBN-10 ASIN", () => {
    expect(isbn13ToAsin("9782723489904")).toBe("2723489906");
  });

  test("uses X as check digit when needed", () => {
    expect(isbn13ToAsin("9782020000307")).toBe("202000030X");
  });

  test("returns null for an ISBN-13 without the 978 prefix", () => {
    expect(isbn13ToAsin("9791032708227")).toBeNull();
  });

  test("returns null for a malformed ISBN", () => {
    expect(isbn13ToAsin("12345")).toBeNull();
  });
});
