import { describe, it, expect } from "vitest";
import {
  resolveWalkTalkMode,
  getWalkTalkModeLabel,
  getWalkTalkErrorMessage,
  isUuidValue,
  createClientMessageId,
  WALK_TALK_START_PATTERNS,
  WALK_TALK_STOP_PATTERNS,
  LOCATION_INSIGHT_PATTERNS,
} from "@/pages/zoe-infinity/zoeUnlockedUtils";
import { isRelationshipCommand, getTimeAgo, formatMessageTime } from "@/components/zoe/orbConversationUtils";

describe("zoeUnlockedUtils", () => {
  it("resolves walk & talk modes", () => {
    expect(resolveWalkTalkMode("tell me the history here")).toBe("history");
    expect(resolveWalkTalkMode("just walk")).toBe("discovery");
    expect(getWalkTalkModeLabel("nature")).toBe("nature");
  });

  it("matches walk & talk voice patterns", () => {
    expect(WALK_TALK_START_PATTERNS.some((p) => p.test("Zoe, walk with me"))).toBe(true);
    expect(WALK_TALK_STOP_PATTERNS.some((p) => p.test("stop walk & talk"))).toBe(true);
    expect(LOCATION_INSIGHT_PATTERNS.some((p) => p.test("where am I"))).toBe(true);
  });

  it("validates and generates uuids", () => {
    expect(isUuidValue("not-a-uuid")).toBe(false);
    expect(isUuidValue(createClientMessageId())).toBe(true);
  });

  it("falls back to a friendly location error", () => {
    expect(getWalkTalkErrorMessage(new Error("boom"))).toContain("location");
  });
});

describe("orbConversationUtils", () => {
  it("detects relationship commands", () => {
    expect(isRelationshipCommand("Zoe inform my son to call me")).toBe(true);
    expect(isRelationshipCommand("what is the weather")).toBe(false);
  });

  it("formats relative time", () => {
    expect(getTimeAgo(new Date())).toBe("just now");
    expect(getTimeAgo(new Date(Date.now() - 2 * 3600_000))).toBe("2 hours ago");
  });

  it("handles invalid timestamps", () => {
    expect(formatMessageTime(undefined)).toBe("");
    expect(formatMessageTime("nonsense")).toBe("");
  });
});
