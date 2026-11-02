/**
 * Films live on Gumlet so the site does not ship the bytes.
 * Stills stay in public/ because this account has no Gumlet image source.
 * Workspace: https://dash.gumlet.com/video/?workspace=6ad67ca7aa4040a9352d1a7c
 */
const workspace = "6ad67ca7aa4040a9352d1a7c";

function film(assetId: string): string {
  return `https://video.gumlet.io/${workspace}/${assetId}/main.mp4`;
}

export const films = {
  hero: film("6ae8659d719f4d7764eaa894"),
  write: film("6ae865c3719f4d7764eaa8e8"),
  gather: film("6ae865c76046b11d6643a302"),
  wait: film("6ae865cb830ec73d3b6d4208"),
  preview: film("6ae865ce719f4d7764eaa90f"),
  prepare: film("6ae865d1830ec73d3b6d4225"),
  send: film("6ae865d5830ec73d3b6d422a"),
};
