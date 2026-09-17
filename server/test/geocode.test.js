import test from "node:test";
import assert from "node:assert/strict";
import { selectBestGeocodeResult } from "../src/lib/geocode.js";

test("prefers an exact named place over a nearby municipality", () => {
  const result = selectBestGeocodeResult(
    [
      {
        name: "Lazi",
        display_name: "Lazi, Siquijor, Philippines",
        category: "place",
        addresstype: "municipality",
        lat: "9.128",
        lon: "123.635",
        importance: 0.6,
      },
      {
        name: "Cambugahay Falls",
        display_name: "Cambugahay Falls, Lazi, Siquijor, Philippines",
        category: "natural",
        addresstype: "waterfall",
        lat: "9.13955",
        lon: "123.62775",
        importance: 0.3,
      },
    ],
    "Cambugahay Falls, Lazi",
    "Siquijor",
    { requireExact: true },
  );
  assert.equal(result?.name, "Cambugahay Falls");
});

test("does not replace a pin with an approximate administrative result", () => {
  const result = selectBestGeocodeResult(
    [
      {
        name: "Lazi",
        display_name: "Lazi, Siquijor, Philippines",
        category: "place",
        addresstype: "municipality",
        lat: "9.128",
        lon: "123.635",
      },
    ],
    "Cambugahay Falls, Lazi",
    "Siquijor",
    { requireExact: true },
  );
  assert.equal(result, null);
});

test("matches common map-name abbreviations", () => {
  const result = selectBestGeocodeResult(
    [
      {
        name: "Mount Bandilaan",
        display_name: "Mount Bandilaan, Siquijor, Philippines",
        category: "natural",
        addresstype: "peak",
        lat: "9.178",
        lon: "123.575",
      },
    ],
    "Mt. Bandilaan",
    "Siquijor",
    { requireExact: true },
  );
  assert.equal(result?.name, "Mount Bandilaan");
});
