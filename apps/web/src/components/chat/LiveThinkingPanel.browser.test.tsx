import {
  EnvironmentId,
  ThreadId,
  TurnItemId,
  type OrchestrationV2ProjectedTurnItem,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";

const state = vi.hoisted(() => ({ items: [] as ReadonlyArray<OrchestrationV2ProjectedTurnItem> }));
vi.mock("../../state/entities", () => ({ useTimelineVisibleTurnItems: () => state.items }));

import { LiveThinkingPanel } from "./LiveThinkingPanel";

it("preserves incremental reasoning text and keeps following paused across updates", async () => {
  const threadRef = {
    environmentId: EnvironmentId.make("local"),
    threadId: ThreadId.make("thinking-test"),
  };
  state.items = [];
  await using screen = await render(<LiveThinkingPanel threadRef={threadRef} />);
  const stream = (text: string, streaming: boolean) => {
    state.items = [
      {
        position: 0,
        visibility: "local",
        sourceThreadId: threadRef.threadId,
        sourceItemId: TurnItemId.make("reasoning"),
        item: {
          id: TurnItemId.make("reasoning"),
          threadId: threadRef.threadId,
          runId: null,
          nodeId: null,
          providerThreadId: null,
          providerTurnId: null,
          nativeItemRef: null,
          parentItemId: null,
          ordinal: 0,
          status: streaming ? "running" : "completed",
          title: null,
          startedAt: null,
          completedAt: null,
          updatedAt: DateTime.makeUnsafe("2026-11-12T00:00:00.000Z"),
          type: "reasoning",
          text,
          streaming,
        },
      },
    ];
    return screen.rerender(<LiveThinkingPanel threadRef={threadRef} />);
  };
  const raw = "  <think>\n\t**literal**, λ, 你好\n";
  await stream(raw, true);
  expect(screen.container.querySelector("pre")?.textContent).toBe(raw);
  await expect.element(screen.getByRole("heading")).toHaveTextContent("Live thinking · streaming");
  await screen.getByRole("button", { name: "Following", exact: true }).click();
  const completed = raw + "</think>  ";
  await stream(completed, false);
  expect(screen.container.querySelector("pre")?.textContent).toBe(completed);
  await expect
    .element(screen.getByRole("button", { name: "Follow", exact: true }))
    .toHaveAttribute("aria-pressed", "false");
  await expect.element(screen.getByRole("heading")).toHaveTextContent("Live thinking");
});
