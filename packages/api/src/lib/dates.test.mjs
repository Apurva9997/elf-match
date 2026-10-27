import assert from "node:assert/strict";
import { parseIsoDate } from "./dates.ts";

assert.equal(parseIsoDate("2026-12-24"), "2026-12-24");
assert.equal(parseIsoDate("2026-02-31"), null);
assert.equal(parseIsoDate("<2026-12-24>"), null);
assert.equal(parseIsoDate("2026-12-24<script>"), null);
assert.equal(parseIsoDate(""), null);

console.log("date checks passed");
