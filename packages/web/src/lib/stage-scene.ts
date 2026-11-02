import { films } from "@/lib/media";

export type StageSceneId =
  | "write"
  | "gather"
  | "wait"
  | "preview"
  | "prepare"
  | "send"
  | "done";

export type StageScene = {
  id: StageSceneId;
  still: string;
  film: string | null;
  caption: string;
};

const scenes: Record<StageSceneId, StageScene> = {
  write: {
    id: "write",
    still: "/film/stages/write.jpg",
    film: films.write,
    caption: "A blank card is waiting.",
  },
  gather: {
    id: "gather",
    still: "/film/stages/gather.jpg",
    film: films.gather,
    caption: "The group is still gathering.",
  },
  wait: {
    id: "wait",
    still: "/film/stages/wait.jpg",
    film: films.wait,
    caption: "The letter is sealed. The names are not drawn yet.",
  },
  preview: {
    id: "preview",
    still: "/film/stages/preview.jpg",
    film: films.preview,
    caption: "Enough people have joined to preview the pairings.",
  },
  prepare: {
    id: "prepare",
    still: "/film/stages/prepare.jpg",
    film: films.prepare,
    caption: "The gift is being prepared.",
  },
  send: {
    id: "send",
    still: "/film/stages/send.jpg",
    film: films.send,
    caption: "The gift is on its way.",
  },
  done: {
    id: "done",
    still: "/film/stages/send.jpg",
    film: null,
    caption: "Marked delivered.",
  },
};

export function stageScene(id: StageSceneId): StageScene {
  return scenes[id];
}

/**
 * The picture above the journey. An organizer who has not drawn yet sees
 * the group. Pending invitations do not block a preview once three people
 * have joined. After the draw, and for a member, the picture follows that
 * person's own gift.
 */
export function exchangeStage(input: {
  isOrganizer: boolean;
  drawn: boolean;
  joined: number;
  letterSkipped: boolean;
  hasWish: boolean;
  giftStatus: string | null | undefined;
}): StageSceneId {
  if (!input.drawn && input.isOrganizer) {
    if (input.joined < 3) return "gather";
    return "preview";
  }
  if (input.letterSkipped) return "wait";
  if (!input.hasWish) return "write";
  if (!input.drawn) return "wait";
  const status = input.giftStatus || "pending";
  if (status === "delivered") return "done";
  if (status === "shipped") return "send";
  return "prepare";
}
