import assert from "node:assert/strict";
import { inviteShareMessage } from "./invite-share.ts";

const message = inviteShareMessage({
  hostName: "Apurv Garg",
  exchangeName: "Cousins, December",
  url: "https://elfmatch.com/invite/abc",
  budgetMin: "500",
  budgetMax: "1000",
  currency: "INR",
  wishlistDeadline: "2026-12-10",
  exchangeDate: "2026-12-24",
});

assert.match(message, /^Apurv is inviting you to Cousins, December on Elf Match\./);
assert.match(message, /free Secret Santa/);
assert.match(message, /only the person buying for you can read it/);
assert.match(message, /Spend between ₹500 and ₹1,000\./);
assert.match(message, /Wishlists are due 10 December 2026\./);
assert.match(message, /Gifts change hands on 24 December 2026\./);
assert.match(message, /1\. Name the exchange/);
assert.match(message, /2\. Send one invite link/);
assert.match(message, /3\. Keep couples or close relatives from matching/);
assert.match(message, /4\. Preview the pairings/);
assert.match(message, /Free\. No card\./);
assert.equal(message.trimEnd().endsWith("https://elfmatch.com/invite/abc"), true);
assert.doesNotMatch(message, /card required|password/i);

const sparse = inviteShareMessage({
  hostName: "",
  exchangeName: "Office",
  url: "https://elfmatch.com/invite/xyz",
});
assert.match(sparse, /^You are invited to Office on Elf Match\./);
assert.doesNotMatch(sparse, /Spend |Wishlists are due|Gifts change hands/);
assert.match(sparse, /4\. Preview the pairings/);

console.log("invite share message checks passed");
