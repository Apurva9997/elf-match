import assert from "node:assert/strict";
import { exchangeStage } from "./stage-scene.ts";

const base = {
  isOrganizer: false,
  drawn: false,
  joined: 1,
  letterSkipped: false,
  hasWish: false,
  giftStatus: "pending",
};

assert.equal(exchangeStage({ ...base, isOrganizer: true, joined: 2 }), "gather");
assert.equal(
  exchangeStage({ ...base, isOrganizer: true, joined: 4 }),
  "preview",
  "pending invitations do not block a preview once three have joined"
);
assert.equal(
  exchangeStage({ ...base, isOrganizer: true, joined: 2, hasWish: true, drawn: true }),
  "prepare"
);
assert.equal(exchangeStage({ ...base, letterSkipped: true }), "wait");
assert.equal(exchangeStage({ ...base, hasWish: true }), "wait");
assert.equal(exchangeStage({ ...base, hasWish: true, drawn: true }), "prepare");
assert.equal(
  exchangeStage({ ...base, hasWish: true, drawn: true, giftStatus: "shipped" }),
  "send"
);
assert.equal(
  exchangeStage({ ...base, hasWish: true, drawn: true, giftStatus: "delivered" }),
  "done"
);
assert.equal(exchangeStage(base), "write");

console.log("stage scene checks passed");
