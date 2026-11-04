function singular(count: number): boolean {
  return new Intl.PluralRules("en").select(count) === "one";
}

export function emailsNotSent(count: number): string {
  return singular(count)
    ? `${count} email has not been sent.`
    : `${count} emails have not been sent.`;
}

export function peopleNotEmailed(count: number): string {
  return singular(count)
    ? `${count} person has not been emailed their recipient.`
    : `${count} people have not been emailed their recipient.`;
}

export function peopleStillInvited(count: number): string {
  return singular(count)
    ? `${count} person is still invited and will be left out.`
    : `${count} people are still invited and will be left out.`;
}

export function peopleNotJoined(count: number): string {
  return singular(count)
    ? `${count} person has not joined. They will not be in this draw, and they cannot be added after you send it.`
    : `${count} people have not joined. They will not be in this draw, and they cannot be added after you send it.`;
}

export function peopleNotIncluded(count: number): string {
  return singular(count)
    ? `${count} person is still invited and will not be included.`
    : `${count} people are still invited and will not be included.`;
}

export function exclusionsKept(count: number): string {
  return singular(count)
    ? `${count} exclusion will be kept.`
    : `${count} exclusions will be kept.`;
}
