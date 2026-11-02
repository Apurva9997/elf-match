// One picture for every link a person pastes into a chat. A JPEG at this
// size is what WhatsApp keeps; a generated PNG, or a square, is what it drops.
export const SHARE_IMAGE = "https://elfmatch.com/share.jpg";

export const shareImage = {
  url: SHARE_IMAGE,
  width: 1200,
  height: 630,
  type: "image/jpeg" as const,
  alt: "Elf Match — Secret Santa, drawn in private",
};
