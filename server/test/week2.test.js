import test from "node:test";
import assert from "node:assert/strict";
import { hasCoordinates, googleMapsDirectionsUrl, pinsGeoJson } from "../../client/src/lib/mapData.js";
import { csvCell, tripCalendar, foldCalendarLine } from "../../client/src/lib/tripExports.js";
import { publicTrip } from "../src/lib/publicTrip.js";
import { startingPointFor } from "../src/lib/startingPoint.js";

test("Cubao defaults only when no starting point is saved", () => {
  assert.equal(startingPointFor(null), "Cubao, Quezon City, Philippines");
  assert.equal(startingPointFor("  "), "Cubao, Quezon City, Philippines");
  assert.equal(startingPointFor(" Tokyo, Japan "), "Tokyo, Japan");
});

test("map rejects missing and out-of-range coordinates but accepts zero", () => {
  assert.equal(hasCoordinates({latitude:0, longitude:0}), true);
  for (const point of [{latitude:null, longitude:120}, {latitude:91, longitude:120}, {latitude:12, longitude:181}, {latitude:NaN, longitude:120}]) assert.equal(hasCoordinates(point), false);
});
test("directions preserve international origin and exact coordinates", () => {
  const url = new URL(googleMapsDirectionsUrl([{latitude:10, longitude:123}, {latitude:11, longitude:124}], "Tokyo, Japan"));
  assert.equal(url.searchParams.get("origin"), "Tokyo, Japan");
  assert.equal(url.searchParams.get("waypoints"), "10,123");
  assert.equal(url.searchParams.get("destination"), "11,124");
  assert.equal(googleMapsDirectionsUrl(Array(5).fill({latitude:10,longitude:123}), "Manila"), "");
});
test("GeoJSON uses longitude first and excludes invalid pins", () => {
  const data = pinsGeoJson([{latitude:10,longitude:123,title:"Cebu"}, {latitude:null,longitude:null}]);
  assert.equal(data.features.length, 1);
  assert.deepEqual(data.features[0].geometry.coordinates, [123,10]);
});
test("CSV neutralizes formula prefixes and escapes quotes", () => {
  assert.equal(csvCell('=HYPERLINK("test")'), '"\'=HYPERLINK(""test"")"');
  assert.equal(csvCell('hello, "Cebu"'), '"hello, ""Cebu"""');
  assert.equal(csvCell(" @SUM(1)"), '"\' @SUM(1)"');
});
test("calendar uses Philippine time, handles midnight, and escapes newlines", () => {
  const value = tripCalendar({days:[{date:"2026-09-27",activities:[{id:"one",title:"A\r\nB",startTime:"23:30",durationMin:120}]}]}, new Date("2026-09-23T00:00:00Z"));
  assert.match(value, /DTSTAMP:20260923T000000Z/);
  assert.match(value, /DTSTART:20260927T153000Z/);
  assert.match(value, /DTEND:20260927T173000Z/);
  assert.ok(value.includes("SUMMARY:A\\nB"));
  assert.ok(value.endsWith("END:VCALENDAR\r\n"));
});
test("calendar folds UTF-8 lines without splitting Unicode characters", () => {
  const original = "SUMMARY:" + "🌴".repeat(50);
  const folded = foldCalendarLine(original);
  assert.equal(folded.replaceAll("\r\n ", ""), original);
  for (const line of folded.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
});
test("public sharing omits private fields at every nesting level", () => {
  const output = publicTrip({name:"Cebu",userId:"PRIVATE",notes:"PRIVATE",baseAddress:"PRIVATE",futureSecret:"PRIVATE",destination:{name:"Cebu",futureSecret:"PRIVATE"},days:[{id:"day",notes:"PRIVATE",activities:[{id:"activity",title:"Museum",notes:"PRIVATE",referenceNumber:"PRIVATE",phone:"PRIVATE",futureSecret:"PRIVATE"}]}]});
  assert.equal(JSON.stringify(output).includes("PRIVATE"), false);
  assert.equal(output.days[0].activities[0].title, "Museum");
});
