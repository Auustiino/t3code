import type { OrchestrationV2ProjectedTurnItem, ScopedThreadRef } from "@t3tools/contracts";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { useTimelineVisibleTurnItems } from "../../state/entities";
import { Button } from "../ui/button";
import { ThreadDetailsSection } from "./ThreadDetailsSection";

type ReasoningItem = Extract<OrchestrationV2ProjectedTurnItem["item"], { type: "reasoning" }>;

const ThinkingBlock = memo(function ThinkingBlock({ item }: { item: ReasoningItem }) {
  return (
    <pre
      data-thinking-item={item.id}
      data-streaming={item.streaming || undefined}
      className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere] [content-visibility:auto]"
    >
      {item.text}
    </pre>
  );
});

export function LiveThinkingPanel({ threadRef }: { threadRef: ScopedThreadRef }) {
  const items = useTimelineVisibleTurnItems(threadRef);
  const reasoning = items.flatMap(({ item }) =>
    item.type === "reasoning" && item.text.length > 0 ? [item] : [],
  );
  const streaming = reasoning.some((item) => item.streaming);
  const characters = reasoning.reduce((count, item) => count + item.text.length, 0);
  const viewport = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);
  const [actionStatus, setActionStatus] = useState("");

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- follows the DOM scroll height as live reasoning arrives, until the user scrolls up
  useLayoutEffect(() => {
    if (following && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  });

  const text = () => reasoning.map((item) => item.text).join("\n\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      setActionStatus("Copied");
    } catch {
      setActionStatus("Copy failed. Select the text or download it instead.");
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text()], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `thinking-${threadRef.threadId}.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <ThreadDetailsSection
      headingId="thread-details-thinking-heading"
      title={streaming ? "Live thinking · streaming" : "Live thinking"}
      data-live-thinking-panel
      actions={
        <>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Copy reasoning text"
            title="Copy reasoning text"
            disabled={reasoning.length === 0}
            onClick={copy}
          >
            <CopyIcon aria-hidden />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Download reasoning text"
            title="Download reasoning text"
            disabled={reasoning.length === 0}
            onClick={download}
          >
            <DownloadIcon aria-hidden />
          </Button>
        </>
      }
    >
      <div data-thread-thinking-overflow>
        <div className="mb-2 flex items-center justify-between gap-2 px-2.5 text-2xs text-muted-foreground">
          <span>{characters.toLocaleString()} chars · loaded history</span>
          <Button
            size="xs"
            variant="ghost"
            aria-pressed={following}
            onClick={() => setFollowing(!following)}
          >
            {following ? "Following" : "Follow"}
          </Button>
        </div>
        <div
          ref={viewport}
          role="region"
          aria-label="Live model reasoning"
          tabIndex={0}
          onScroll={(event) => {
            const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
            setFollowing(scrollHeight - scrollTop - clientHeight < 8);
          }}
          className="flex h-[clamp(12rem,calc(100dvh-27rem),50rem)] min-h-24 resize-y flex-col gap-4 overflow-auto overscroll-contain rounded-lg bg-background/50 px-2.5 py-2 select-text"
        >
          {reasoning.length > 0 ? (
            reasoning.map((item) => <ThinkingBlock key={item.id} item={item} />)
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Waiting for reasoning output. Model loading and prompt processing can happen before
              the first text arrives. Thinking must be enabled in your model server.
            </p>
          )}
        </div>
        <p className="mt-2 px-2.5 text-2xs leading-relaxed text-muted-foreground">
          {actionStatus || "Provider reasoning text, unchanged. Updates as chunks arrive."}
        </p>
      </div>
    </ThreadDetailsSection>
  );
}
