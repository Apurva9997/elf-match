import assert from "node:assert/strict";
import {
  exclusionEdges,
  explainBlockedDraw,
  findDerangement,
  validateProvidedPairs,
} from "./draw.ts";

const people = ["a", "b", "c", "d"];

function assertDerangement(ids, pairs, blocked = new Set()) {
  assert.equal(pairs.length, ids.length);
  const givers = new Set(pairs.map((pair) => pair.giverId));
  const receivers = new Set(pairs.map((pair) => pair.receiverId));
  assert.equal(givers.size, ids.length);
  assert.equal(receivers.size, ids.length);
  for (const id of ids) {
    assert.ok(givers.has(id), `${id} is not a giver`);
    assert.ok(receivers.has(id), `${id} is not a receiver`);
  }
  for (const pair of pairs) {
    assert.notEqual(pair.giverId, pair.receiverId);
    assert.equal(blocked.has(`${pair.giverId}:${pair.receiverId}`), false);
  }
}

const open = findDerangement(people, new Set(), () => 0.3);
assert.ok(open);
assertDerangement(people, open);

const mutual = exclusionEdges([
  { member1Id: "a", member2Id: "b", bidirectional: true },
]);
const keptApart = findDerangement(people, mutual, () => 0.2);
assert.ok(keptApart);
assertDerangement(people, keptApart, mutual);
assert.equal(
  keptApart.some(
    (pair) =>
      (pair.giverId === "a" && pair.receiverId === "b") ||
      (pair.giverId === "b" && pair.receiverId === "a")
  ),
  false
);

// Three people who each cannot give to either of the others.
const impossible = exclusionEdges([
  { member1Id: "a", member2Id: "b", bidirectional: true },
  { member1Id: "b", member2Id: "c", bidirectional: true },
  { member1Id: "a", member2Id: "c", bidirectional: true },
]);
assert.match(
  explainBlockedDraw(["a", "b", "c"], impossible) || "",
  /no one left|no way/i
);
assert.equal(findDerangement(["a", "b", "c"], impossible), null);

// A mutual exclusion in a group of three is impossible: both people
// have only the third person left to give to.
const couple = exclusionEdges([
  { member1Id: "a", member2Id: "b", bidirectional: true },
]);
assert.match(explainBlockedDraw(["a", "b", "c"], couple) || "", /no way/i);
assert.equal(findDerangement(["a", "b", "c"], couple), null);

// One direction still draws: A does not give to B, but B may give to A.
const oneWay = exclusionEdges([
  { member1Id: "a", member2Id: "b", bidirectional: false },
]);
const trio = findDerangement(["a", "b", "c"], oneWay, () => 0.9);
assert.ok(trio);
assertDerangement(["a", "b", "c"], trio, oneWay);

const stale = validateProvidedPairs(
  people,
  new Set(),
  [
    { giverId: "a", receiverId: "b" },
    { giverId: "b", receiverId: "c" },
    { giverId: "c", receiverId: "a" },
  ]
);
assert.equal(stale.ok, false);
assert.match(stale.reason, /group changed|new preview/i);

const self = validateProvidedPairs(
  ["a", "b", "c"],
  new Set(),
  [
    { giverId: "a", receiverId: "a" },
    { giverId: "b", receiverId: "c" },
    { giverId: "c", receiverId: "b" },
  ]
);
assert.equal(self.ok, false);

const forbidden = validateProvidedPairs(
  ["a", "b", "c"],
  oneWay,
  [
    { giverId: "a", receiverId: "b" },
    { giverId: "b", receiverId: "c" },
    { giverId: "c", receiverId: "a" },
  ]
);
assert.equal(forbidden.ok, false);
assert.match(forbidden.reason, /keep apart/i);

const current = validateProvidedPairs(
  ["a", "b", "c"],
  oneWay,
  [
    { giverId: "a", receiverId: "c" },
    { giverId: "c", receiverId: "b" },
    { giverId: "b", receiverId: "a" },
  ]
);
assert.equal(current.ok, true);

// Same seed must not be required: twenty draws of an open group all hold.
for (let i = 0; i < 20; i++) {
  const pairs = findDerangement(people, new Set());
  assert.ok(pairs);
  assertDerangement(people, pairs);
}

console.log("draw checks passed");
