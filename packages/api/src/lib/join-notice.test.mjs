import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./email.ts", import.meta.url), "utf8");
const notice = readFileSync(new URL("./join-notice.ts", import.meta.url), "utf8");

assert.match(source, /export async function sendMemberJoinedEmail/);
assert.match(source, /joinedCount >= 3/);
assert.match(source, /which is enough to draw/);
assert.match(source, /A draw needs three/);
assert.match(source, /shared invite link/);
assert.match(source, /accepted the invitation/);
assert.doesNotMatch(source, /sendMemberJoinedEmail\([\s\S]*members\.map/);

assert.match(notice, /team\.createdBy === joiner\.id\) return/);
assert.match(notice, /invitationStatus, "accepted"/);
assert.match(notice, /sendMemberJoinedEmail/);

console.log("join notice checks passed");
