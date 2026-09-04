import { createHash } from "node:crypto";

import { canonicalizeJson } from "../../cubes/canonical-snapshot.ts";
import type { DraftEvent, DraftReport } from "./types.ts";

function projectSource(source: unknown): unknown {
  if (typeof source !== "object" || source === null) {
    return source;
  }
  return Object.fromEntries(
    Object.entries(source as Record<string, unknown>).filter(
      ([key]) => key !== "cubeUpdatedAt" && key !== "retrievedAt",
    ),
  );
}

function projectEvent(event: Readonly<DraftEvent>): unknown {
  const eventRecord = event as unknown as Record<string, unknown>;
  const filteredEvent = Object.fromEntries(
    Object.entries(eventRecord).filter(([key]) => key !== "sessionId" && key !== "occurredAt"),
  );

  if (event.type === "DraftStarted") {
    const startedEvent = event;
    const snapshot = startedEvent.snapshot;
    return {
      ...filteredEvent,
      snapshot: {
        ...snapshot,
        source: projectSource(snapshot.source),
      },
    };
  }

  if (event.type === "DraftCompleted") {
    return Object.fromEntries(
      Object.entries(filteredEvent).filter(([key]) => key !== "completedAt"),
    );
  }

  return filteredEvent;
}

export function functionalProjection(
  report: Readonly<DraftReport> | Readonly<Record<string, unknown>>,
): unknown {
  const record = report as Record<string, unknown>;
  const filteredTopLevel = Object.fromEntries(
    Object.entries(record).filter(
      ([key]) =>
        key !== "functionalDigest" &&
        key !== "sessionId" &&
        key !== "startedAt" &&
        key !== "completedAt",
    ),
  );

  let projectedProvenance: unknown = record.snapshotProvenance;
  if (typeof record.snapshotProvenance === "object" && record.snapshotProvenance !== null) {
    projectedProvenance = projectSource(record.snapshotProvenance);
  }

  let projectedEvents: unknown = record.events;
  if (Array.isArray(record.events)) {
    projectedEvents = record.events.map((event: unknown) => {
      if (typeof event === "object" && event !== null) {
        return projectEvent(event as Readonly<DraftEvent>);
      }
      return event;
    });
  }

  return {
    ...filteredTopLevel,
    snapshotProvenance: projectedProvenance,
    events: projectedEvents,
  };
}

export function calculateReportDigest(projection: unknown): string {
  const canonical = canonicalizeJson(projection);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
