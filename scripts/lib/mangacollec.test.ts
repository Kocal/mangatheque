import { describe, expect, test } from "vite-plus/test";
import { extractServerData, fromApiResponse, toCollection } from "./mangacollec.ts";

const store = {
  series: {
    data: {
      s1: { id: "s1", title: "One Piece", kinds_ids: ["k-shonen", "k-action"] },
      s2: { id: "s2", title: "GTO Shonan 14 days", kinds_ids: ["k-action"] },
      s3: { id: "s3", title: "Unowned", kinds_ids: ["k-seinen"] },
    },
  },
  editions: {
    data: {
      e1: { id: "e1", title: null, series_id: "s1" },
      e2: { id: "e2", title: "Edition collector", series_id: "s1" },
      e3: { id: "e3", title: null, series_id: "s2" },
      e4: { id: "e4", title: null, series_id: "s3" },
    },
  },
  volumes: {
    data: {
      v1: {
        id: "v1",
        number: 1,
        isbn: "9782723489904",
        asin: "2723489906",
        edition_id: "e1",
        image_url: "https://img/v1.jpg",
      },
      v2: { id: "v2", number: 2, isbn: null, asin: null, edition_id: "e1" },
      v3: { id: "v3", number: 1, isbn: null, asin: null, edition_id: "e2" },
      v4: { id: "v4", number: 1, isbn: null, asin: null, edition_id: "e3" },
      v5: { id: "v5", number: 1, isbn: null, asin: null, edition_id: "e4" },
    },
  },
  publicCollection: {
    kocal: [
      [[], [{ volume_id: "v3" }, { volume_id: "v2" }, { volume_id: "v1" }, { volume_id: "v4" }]],
      [[], []],
      [[], []],
    ],
  },
};

const kinds = [
  { id: "k-shonen", title: "Shōnen" },
  { id: "k-seinen", title: "Seinen" },
  { id: "k-action", title: "Action" },
];

describe("toCollection", () => {
  test("keeps only owned volumes and resolves the audience", () => {
    const collection = toCollection("kocal", store, kinds, "2026-10-16T00:00:00Z");

    expect(collection).toEqual({
      user: "kocal",
      fetchedAt: "2026-10-16T00:00:00Z",
      series: [
        {
          id: "s2",
          title: "GTO Shonan 14 days",
          audience: null,
          editions: [
            {
              id: "e3",
              title: null,
              volumes: [{ id: "v4", number: 1, isbn: null, asin: null, imageUrl: null }],
            },
          ],
        },
        {
          id: "s1",
          title: "One Piece",
          audience: "Shōnen",
          editions: [
            {
              id: "e1",
              title: null,
              volumes: [
                {
                  id: "v1",
                  number: 1,
                  isbn: "9782723489904",
                  asin: "2723489906",
                  imageUrl: "https://img/v1.jpg",
                },
                { id: "v2", number: 2, isbn: null, asin: null, imageUrl: null },
              ],
            },
            {
              id: "e2",
              title: "Edition collector",
              volumes: [{ id: "v3", number: 1, isbn: null, asin: null, imageUrl: null }],
            },
          ],
        },
      ],
    });
  });

  test("throws when the user is missing from the page", () => {
    expect(() => toCollection("someone", store, kinds, "now")).toThrow(/someone/);
  });
});

describe("extractServerData", () => {
  test("reads the session token and the data store", () => {
    const html = `<script>
       globalThis.APP$SERVERDATA = {
         SESSION_TOKEN: {"access_token":"abc","kind":"App"},
         DATA_STORE: {"series":{"data":{}}},
       };
    </script>`;

    expect(extractServerData(html)).toEqual({ token: "abc", store: { series: { data: {} } } });
  });

  test("throws when the page has no server data", () => {
    expect(() => extractServerData("<html></html>")).toThrow();
  });
});

describe("fromApiResponse", () => {
  test("reads the logged-in API response like the public page", () => {
    const api = {
      series: Object.values(store.series.data),
      editions: Object.values(store.editions.data),
      volumes: Object.values(store.volumes.data),
      possessions: store.publicCollection.kocal[0][1],
    };

    expect(fromApiResponse("kocal", api, kinds, "now")).toEqual(
      toCollection("kocal", store, kinds, "now"),
    );
  });
});
