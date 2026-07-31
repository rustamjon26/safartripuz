import { describe, expect, it } from "vitest";
import type { DaySchedule } from "../domain/types";
import {
  buildNarrationLlmPayload,
  buildNarrationSystemPrompt,
} from "./narrate";

function dayWithMix(): DaySchedule {
  return {
    day: 3,
    date: "2026-08-02",
    title: "Test — 3-kun",
    slots: [
      {
        day: 3,
        date: "2026-08-02",
        startTime: "09:00",
        endTime: "10:30",
        status: "PLACED",
        siteId: "registon",
        siteName: "Registon",
        claims: [],
      },
      {
        day: 3,
        date: "2026-08-02",
        startTime: "10:40",
        endTime: "12:10",
        status: "NO_DATA",
        siteId: null,
        siteName: null,
        claims: [],
      },
      {
        day: 3,
        date: "2026-08-02",
        startTime: "12:20",
        endTime: "13:50",
        status: "NO_DATA",
        siteId: null,
        siteName: null,
        claims: [],
      },
    ],
  };
}

describe("narration LLM payload", () => {
  it("strips NO_DATA slots so null site names never reach the model", () => {
    const payload = buildNarrationLlmPayload({
      regionDisplay: "Samarqand",
      lang: "uz",
      days: [dayWithMix()],
    });

    expect(payload.schedule).toHaveLength(1);
    expect(payload.schedule[0]!.stops).toEqual([
      {
        time: "09:00-10:30",
        site: "Registon",
        claims: [],
      },
    ]);
    expect(JSON.stringify(payload)).not.toContain("null");
    expect(JSON.stringify(payload)).not.toContain("NO_DATA");
  });

  it("keeps empty stops array for a day that is all NO_DATA (no invented sites)", () => {
    const emptyDay: DaySchedule = {
      day: 1,
      date: "2026-07-31",
      title: "Empty",
      slots: [
        {
          day: 1,
          date: "2026-07-31",
          startTime: "09:00",
          endTime: "10:30",
          status: "NO_DATA",
          siteId: null,
          siteName: null,
          claims: [],
        },
      ],
    };
    const payload = buildNarrationLlmPayload({
      regionDisplay: "Samarqand",
      lang: "uz",
      days: [emptyDay],
    });
    expect(payload.schedule[0]!.stops).toEqual([]);
  });

  it("system prompt forbids inventing places for empty / thinner days", () => {
    const prompt = buildNarrationSystemPrompt();
    expect(prompt).toMatch(/lack verified places/i);
    expect(prompt).toMatch(/Do NOT invent filler/i);
  });
});
