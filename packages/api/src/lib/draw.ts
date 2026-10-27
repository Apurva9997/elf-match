/**
 * Secret Santa draw.
 *
 * A valid draw is a derangement: every joined participant is a giver exactly
 * once, a recipient exactly once, and never their own recipient. An exclusion
 * is a forbidden directed edge. A mutual exclusion stores both directions.
 */

export interface Pair {
  giverId: string;
  receiverId: string;
}

export interface DrawFailure {
  ok: false;
  /** Why no derangement exists, in language an organizer can act on. */
  reason: string;
}

export interface DrawSuccess {
  ok: true;
  pairs: Pair[];
}

export type DrawResult = DrawSuccess | DrawFailure;

function edge(from: string, to: string): string {
  return `${from}:${to}`;
}

function allowedRecipients(
  giverId: string,
  memberIds: string[],
  blocked: Set<string>
): string[] {
  return memberIds.filter(
    (receiverId) =>
      receiverId !== giverId && !blocked.has(edge(giverId, receiverId))
  );
}

/**
 * A derangement is impossible when someone has nowhere legal to give,
 * or when the forbidden edges disconnect the group into components that
 * cannot cover every seat. Hall's condition on the allowed graph catches
 * both without searching.
 */
export function explainBlockedDraw(
  memberIds: string[],
  blocked: Set<string>
): string | null {
  if (memberIds.length < 3) {
    return "A draw needs at least three people who have joined.";
  }

  const allowed = new Map(
    memberIds.map((id) => [id, allowedRecipients(id, memberIds, blocked)])
  );

  const stuck = memberIds.filter((id) => (allowed.get(id) || []).length === 0);
  if (stuck.length > 0) {
    return "Someone has no one left they can give to. Remove an exclusion, or wait for another person to join.";
  }

  const n = memberIds.length;
  // Hall's condition is cheap for a group an organizer would draw by
  // hand. Above this, the search itself reports impossibility.
  if (n <= 12) {
    const subsets = 1 << n;
    for (let mask = 1; mask < subsets; mask++) {
      const givers: string[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) givers.push(memberIds[i]);
      }
      const receivers = new Set<string>();
      for (const giver of givers) {
        for (const receiver of allowed.get(giver) || []) {
          receivers.add(receiver);
        }
      }
      if (receivers.size < givers.length) {
        return "These exclusions leave no way for everyone to give and receive exactly once. Remove one exclusion, or invite another person.";
      }
    }
  }

  return null;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Search a derangement. `random` is injectable so tests can force a
 * known arrangement without waiting on Math.random.
 */
export function findDerangement(
  memberIds: string[],
  blocked: Set<string>,
  random: () => number = Math.random,
  maxAttempts = 200
): Pair[] | null {
  const unique = [...new Set(memberIds)];
  if (unique.length !== memberIds.length) return null;
  if (explainBlockedDraw(unique, blocked)) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const receivers = shuffle(unique, random);
    const used = new Set<string>();
    const pairs: Pair[] = [];
    let valid = true;

    for (let i = 0; i < unique.length; i++) {
      const giverId = unique[i];
      const receiverId = receivers[i];
      if (
        giverId === receiverId ||
        used.has(receiverId) ||
        blocked.has(edge(giverId, receiverId))
      ) {
        valid = false;
        break;
      }
      used.add(receiverId);
      pairs.push({ giverId, receiverId });
    }

    if (valid && used.size === unique.length) return pairs;
  }

  // The random search can miss a sparse but legal graph. Fall back to
  // an exact search so "impossible" means impossible.
  return exactDerangement(unique, blocked, random);
}

function exactDerangement(
  memberIds: string[],
  blocked: Set<string>,
  random: () => number
): Pair[] | null {
  const order = shuffle(memberIds, random);
  const used = new Set<string>();
  const pairs: Pair[] = [];

  const place = (index: number): boolean => {
    if (index === order.length) return true;
    const giverId = order[index];
    const options = shuffle(
      allowedRecipients(giverId, memberIds, blocked).filter(
        (id) => !used.has(id)
      ),
      random
    );
    for (const receiverId of options) {
      used.add(receiverId);
      pairs.push({ giverId, receiverId });
      if (place(index + 1)) return true;
      pairs.pop();
      used.delete(receiverId);
    }
    return false;
  };

  return place(0) ? pairs : null;
}

export function validateProvidedPairs(
  memberIds: string[],
  blocked: Set<string>,
  pairs: Pair[]
): { ok: true } | { ok: false; reason: string } {
  const members = new Set(memberIds);
  if (pairs.length !== members.size) {
    return {
      ok: false,
      reason:
        "The group changed since this preview. Generate a new preview before sending.",
    };
  }

  const givers = new Set<string>();
  const receivers = new Set<string>();
  for (const pair of pairs) {
    if (!members.has(pair.giverId) || !members.has(pair.receiverId)) {
      return {
        ok: false,
        reason:
          "Someone in this preview is no longer in the draw. Generate a new preview before sending.",
      };
    }
    if (pair.giverId === pair.receiverId) {
      return {
        ok: false,
        reason: "A person cannot be assigned to themselves.",
      };
    }
    if (blocked.has(edge(pair.giverId, pair.receiverId))) {
      return {
        ok: false,
        reason:
          "This preview matches a pair you asked to keep apart. Generate a new preview.",
      };
    }
    if (givers.has(pair.giverId) || receivers.has(pair.receiverId)) {
      return {
        ok: false,
        reason:
          "Each person must give once and receive once. Generate a new preview.",
      };
    }
    givers.add(pair.giverId);
    receivers.add(pair.receiverId);
  }

  if (givers.size !== members.size || receivers.size !== members.size) {
    return {
      ok: false,
      reason:
        "The group changed since this preview. Generate a new preview before sending.",
    };
  }

  return { ok: true };
}

export function exclusionEdges(
  rules: Array<{
    member1Id: string;
    member2Id: string;
    bidirectional: boolean | null;
  }>
): Set<string> {
  const blocked = new Set<string>();
  for (const rule of rules) {
    blocked.add(edge(rule.member1Id, rule.member2Id));
    if (rule.bidirectional !== false) {
      blocked.add(edge(rule.member2Id, rule.member1Id));
    }
  }
  return blocked;
}
