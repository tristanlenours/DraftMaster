import { expect, test, type Route } from "@playwright/test";

interface BrowserTournament {
  tournamentId: string;
  revision: number;
  name: string;
  status: "preparation";
  format: "swiss" | "round-robin-three" | "round-robin" | null;
  plannedRoundCount: number | null;
  cube: { cubeKey: string; cubeName: string; snapshotId: string } | null;
  participants: {
    participantId: string;
    displayName: string;
    normalizedName: string;
    registrationOrder: number;
    status: "active";
    deck: { name: string; keyCards: [] };
  }[];
  rounds: [];
  standings: [];
  createdAt: string;
  updatedAt: string;
}

test("crée, configure et rouvre un tournoi depuis son historique", async ({ page }) => {
  let tournament: BrowserTournament | null = null;
  const routeTournamentApi = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === "/api/tournaments/cubes") {
      await route.fulfill({
        json: {
          ok: true,
          cubes: [
            {
              cubeKey: "titou_tribal",
              cubeName: "Titou Tribal",
              activeSnapshotId: "titou_tribal@2026-09-21.1",
            },
          ],
        },
      });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments") {
      await route.fulfill({
        json: {
          ok: true,
          tournaments:
            tournament === null
              ? []
              : [
                  {
                    tournamentId: tournament.tournamentId,
                    name: tournament.name,
                    status: tournament.status,
                    format: tournament.format,
                    cube:
                      tournament.cube === null
                        ? null
                        : {
                            cubeKey: tournament.cube.cubeKey,
                            cubeName: tournament.cube.cubeName,
                            activeSnapshotId: tournament.cube.snapshotId,
                          },
                    participantCount: tournament.participants.length,
                    currentRoundNumber: null,
                    leaders: [],
                    revision: tournament.revision,
                    createdAt: tournament.createdAt,
                    updatedAt: tournament.updatedAt,
                  },
                ],
        },
      });
      return;
    }
    if (request.method() === "POST" && url.pathname === "/api/tournaments") {
      expect(request.headers()["idempotency-key"]).toBeTruthy();
      const body = request.postDataJSON() as { name: string };
      tournament = {
        tournamentId: "tournament-001",
        revision: 0,
        name: body.name,
        status: "preparation",
        format: null,
        plannedRoundCount: null,
        cube: null,
        participants: [],
        rounds: [],
        standings: [],
        createdAt: "2026-09-21T18:00:00.000Z",
        updatedAt: "2026-09-21T18:00:00.000Z",
      };
      await route.fulfill({ status: 201, json: { ok: true, tournament } });
      return;
    }
    if (request.method() === "PUT" && url.pathname === "/api/tournaments/tournament-001/setup") {
      expect(request.headers()["idempotency-key"]).toBeTruthy();
      const body = request.postDataJSON() as {
        expectedRevision: number;
        name: string;
        cubeKey: string;
        format: "swiss" | "round-robin-three";
        plannedRoundCount: number;
        participants: { displayName: string; deckName: string }[];
      };
      expect(body.expectedRevision).toBe(0);
      if (tournament === null) throw new Error("Le tournoi doit être créé avant son setup.");
      tournament = {
        ...tournament,
        revision: 1,
        name: body.name,
        format: body.format,
        plannedRoundCount: body.plannedRoundCount,
        cube: {
          cubeKey: body.cubeKey,
          cubeName: "Titou Tribal",
          snapshotId: "titou_tribal@2026-09-21.1",
        },
        participants: body.participants.map((participant, index) => ({
          participantId: `participant-${String(index + 1)}`,
          displayName: participant.displayName,
          normalizedName: participant.displayName.toLowerCase(),
          registrationOrder: index,
          status: "active",
          deck: { name: participant.deckName, keyCards: [] },
        })),
        updatedAt: "2026-09-21T18:05:00.000Z",
      };
      await route.fulfill({ json: { ok: true, tournament } });
      return;
    }
    if (
      request.method() === "GET" &&
      url.pathname === "/api/tournaments/tournament-001" &&
      tournament !== null
    ) {
      await route.fulfill({ json: { ok: true, tournament } });
      return;
    }
    await route.fulfill({ status: 404, json: { ok: false } });
  };
  await page.route("**/api/tournaments**", routeTournamentApi);

  await page.goto("/tournaments");
  await expect(page.locator("#tournament-empty-state")).toBeVisible();
  await page.locator("#tournament-new-btn").click();
  await page.locator("#tournament-create-name").fill("Cube de septembre");
  await page.locator("#tournament-create-submit").click();

  await expect(page.locator("#tournament-setup-form")).toBeVisible();
  await page.locator("#tournament-cube").selectOption("titou_tribal");
  await page.locator("#tournament-format").selectOption("swiss");
  await page.locator("#tournament-round-count").fill("3");
  const initialRows = page.locator("[data-tournament-player-row]");
  await initialRows.nth(0).locator("[data-player-name]").fill("Alice");
  await initialRows.nth(0).locator("[data-deck-name]").fill("Aggro Boros");
  await initialRows.nth(1).locator("[data-player-name]").fill("Bob");
  await initialRows.nth(1).locator("[data-deck-name]").fill("Izzet Wizards");
  await page.locator("#tournament-add-player").click();
  await page.locator("#tournament-add-player").click();
  const rows = page.locator("[data-tournament-player-row]");
  await rows.nth(2).locator("[data-player-name]").fill("Charlie");
  await rows.nth(2).locator("[data-deck-name]").fill("Mono Green Ramp");
  await rows.nth(3).locator("[data-player-name]").fill("Diane");
  await rows.nth(3).locator("[data-deck-name]").fill("Azorius Control");
  await page.locator("#tournament-setup-submit").click();

  await expect(page.locator("#tournament-feedback")).toContainText("Configuration enregistrée");
  await expect(page.locator('[data-tournament-id="tournament-001"]')).toContainText("4 joueurs");

  await page.reload();
  await expect(page.locator('[data-tournament-id="tournament-001"]')).toBeVisible();
  await page.locator('[data-tournament-id="tournament-001"]').click();
  await expect(page.locator("#tournament-name")).toHaveValue("Cube de septembre");
  await expect(page.locator("[data-tournament-player-row]")).toHaveCount(4);
  await expect(
    page.locator("[data-tournament-player-row]").nth(0).locator("[data-deck-name]"),
  ).toHaveValue("Aggro Boros");
  await expect(
    page.locator("[data-tournament-player-row]").nth(3).locator("[data-deck-name]"),
  ).toHaveValue("Azorius Control");
});

test("lance une ronde suisse, affiche les tables et récupère un conflit de révision", async ({
  page,
}) => {
  const participantInputs = [
    ["participant-1", "Alice", "Aggro Boros"],
    ["participant-2", "Bob", "Izzet Wizards"],
    ["participant-3", "Charlie", "Mono Green Ramp"],
    ["participant-4", "Diane", "Azorius Control"],
    ["participant-5", "Eve", "Rakdos Sacrifice"],
  ] as const;
  const participants = participantInputs.map(
    ([participantId, displayName, deckName], registrationOrder) => ({
      participantId,
      displayName,
      normalizedName: displayName.toLowerCase(),
      registrationOrder,
      status: "active" as const,
      deck: { name: deckName, keyCards: [] },
    }),
  );
  const fraction = { numerator: 0, denominator: 1 };
  const standings = participants
    .map((participant, index) => ({
      participantId: participant.participantId,
      matchesPlayed: participant.participantId === "participant-5" ? 1 : 0,
      wins: participant.participantId === "participant-5" ? 1 : 0,
      draws: 0,
      losses: 0,
      byes: participant.participantId === "participant-5" ? 1 : 0,
      gamesWon: participant.participantId === "participant-5" ? 2 : 0,
      gamesDrawn: 0,
      gamesLost: 0,
      matchPoints: participant.participantId === "participant-5" ? 3 : 0,
      matchWinPercentage:
        participant.participantId === "participant-5" ? { numerator: 1, denominator: 1 } : fraction,
      opponentsMatchWinPercentage: fraction,
      gameWinPercentage:
        participant.participantId === "participant-5" ? { numerator: 1, denominator: 1 } : fraction,
      opponentsGameWinPercentage: fraction,
      competitiveRank: participant.participantId === "participant-5" ? 1 : 2,
      displayOrder: index + 1,
    }))
    .sort(
      (left, right) =>
        left.competitiveRank - right.competitiveRank || left.displayOrder - right.displayOrder,
    );
  const configured = {
    schemaVersion: 1,
    tournamentId: "tournament-swiss",
    revision: 1,
    name: "Swiss du vendredi",
    status: "preparation",
    format: "swiss",
    plannedRoundCount: 3,
    pairingSeed: 42,
    pairingEngineVersion: "tournament-pairing@1",
    cube: {
      cubeKey: "titou_tribal",
      cubeName: "Titou Tribal",
      snapshotId: "titou_tribal@2026-09-21.1",
      canonicalSha256: "a".repeat(64),
      payload: {},
    },
    participants,
    rounds: [],
    standings,
    createdAt: "2026-09-21T18:00:00.000Z",
    updatedAt: "2026-09-21T18:05:00.000Z",
    startedAt: null,
    completedAt: null,
  } as const;
  const round = {
    roundNumber: 1,
    status: "published",
    sourceRevision: 1,
    publishedAt: "2026-09-21T18:10:00.000Z",
    completedAt: null,
    pairingEvidence: {
      engineVersion: "tournament-pairing@1",
      pairingSeed: 42,
      inputSha256: "b".repeat(64),
      standingsBefore: standings,
      cost: {
        rematches: 0,
        repeatedRematches: 0,
        maximumMatchPointGap: 0,
        totalMatchPointGap: 0,
        totalRankGap: 0,
        seededOrderCost: 0,
      },
      decisions: [],
    },
    matches: [
      {
        matchId: "match-1",
        roundNumber: 1,
        tableNumber: 1,
        participantAId: "participant-1",
        participantBId: "participant-2",
        status: "pending",
        resultVersions: [],
        currentResultVersion: null,
      },
      {
        matchId: "match-2",
        roundNumber: 1,
        tableNumber: 2,
        participantAId: "participant-3",
        participantBId: "participant-4",
        status: "pending",
        resultVersions: [],
        currentResultVersion: null,
      },
      {
        matchId: "match-3",
        roundNumber: 1,
        tableNumber: 3,
        participantAId: "participant-5",
        participantBId: null,
        status: "confirmed",
        resultVersions: [],
        currentResultVersion: 1,
      },
    ],
    pauses: [],
  } as const;
  const active = {
    ...configured,
    revision: 2,
    status: "active",
    rounds: [round],
    updatedAt: "2026-09-21T18:10:00.000Z",
    startedAt: "2026-09-21T18:10:00.000Z",
  } as const;
  let currentTournament: typeof configured | typeof active = configured;

  await page.route("**/api/tournaments**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === "/api/tournaments/cubes") {
      await route.fulfill({ json: { ok: true, cubes: [] } });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments") {
      await route.fulfill({
        json: {
          ok: true,
          tournaments: [
            {
              tournamentId: currentTournament.tournamentId,
              name: currentTournament.name,
              status: currentTournament.status,
              format: currentTournament.format,
              cube: {
                cubeKey: currentTournament.cube.cubeKey,
                cubeName: currentTournament.cube.cubeName,
                activeSnapshotId: currentTournament.cube.snapshotId,
              },
              participantCount: currentTournament.participants.length,
              currentRoundNumber:
                currentTournament.status === "active"
                  ? currentTournament.rounds[0].roundNumber
                  : null,
              leaders: [],
              revision: currentTournament.revision,
              createdAt: currentTournament.createdAt,
              updatedAt: currentTournament.updatedAt,
            },
          ],
        },
      });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments/tournament-swiss") {
      await route.fulfill({ json: { ok: true, tournament: currentTournament } });
      return;
    }
    if (request.method() === "POST" && url.pathname === "/api/tournaments/tournament-swiss/start") {
      expect(request.postDataJSON()).toEqual({ expectedRevision: 1 });
      currentTournament = active;
      await route.fulfill({ json: { ok: true, tournament: active } });
      return;
    }
    if (
      request.method() === "POST" &&
      url.pathname === "/api/tournaments/tournament-swiss/rounds"
    ) {
      expect(request.postDataJSON()).toEqual({ expectedRevision: 2 });
      await route.fulfill({
        status: 409,
        json: {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Le tournoi a changé. Rechargez son état.",
            details: { currentRevision: 3 },
          },
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { ok: false } });
  });

  await page.goto("/tournaments");
  await page.locator('[data-tournament-id="tournament-swiss"]').click();
  await page.locator("#tournament-start").click();

  await expect(page.locator("#tournament-round-title")).toHaveText("Ronde 1");
  await expect(page.locator("[data-tournament-table]")).toHaveCount(3);
  await expect(page.locator("[data-tournament-table]").nth(0)).toContainText("Table 1");
  await expect(page.locator("[data-tournament-table]").nth(0)).toContainText("Alice");
  await expect(page.locator("[data-tournament-table]").nth(0)).toContainText("Bob");
  await expect(page.locator("[data-tournament-table]").nth(2)).toContainText("Exemption");
  await expect(page.locator("[data-tournament-table]").nth(2)).toContainText("Eve");
  await expect(page.locator("[data-tournament-standing]")).toHaveCount(5);
  await expect(page.locator("[data-tournament-standing]").nth(0)).toContainText("Eve");

  await page.locator("#tournament-next-round").click();
  await expect(page.locator("#tournament-feedback")).toContainText("Le tournoi a changé");
  await expect(page.locator("#tournament-reload")).toBeVisible();
});

test("saisit, corrige et historise un résultat avant de finaliser le tournoi", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  let revision = 2;
  let tournamentStatus: "active" | "completed" = "active";
  const resultVersions: {
    version: number;
    kind: "played" | "forfeit";
    gamesWonA: number;
    gamesWonB: number;
    drawnGames: number;
    outcome: "a-win" | "b-win" | "draw";
    recordedAt: string;
    requestId: string;
    replacesVersion: number | null;
    reason: string | null;
  }[] = [];
  const participants = [
    {
      participantId: "participant-a",
      displayName: "Alice",
      normalizedName: "alice",
      registrationOrder: 0,
      status: "active",
      deck: { name: "Aggro Boros", keyCards: [] },
    },
    {
      participantId: "participant-b",
      displayName: "Bob",
      normalizedName: "bob",
      registrationOrder: 1,
      status: "active",
      deck: { name: "Izzet Wizards", keyCards: [] },
    },
  ] as const;
  const buildTournament = () => ({
    schemaVersion: 1,
    tournamentId: "tournament-results",
    revision,
    name: "Finale du vendredi",
    status: tournamentStatus,
    format: "swiss",
    plannedRoundCount: 1,
    pairingSeed: 42,
    pairingEngineVersion: "tournament-pairing@1",
    cube: {
      cubeKey: "titou_tribal",
      cubeName: "Titou Tribal",
      snapshotId: "titou_tribal@2026-09-21.1",
      canonicalSha256: "a".repeat(64),
      payload: {},
    },
    participants,
    rounds: [
      {
        roundNumber: 1,
        status: resultVersions.length === 0 ? "published" : "completed",
        sourceRevision: 1,
        publishedAt: "2026-09-21T18:10:00.000Z",
        completedAt: resultVersions.length === 0 ? null : "2026-09-21T18:20:00.000Z",
        pairingEvidence: {
          engineVersion: "tournament-pairing@1",
          pairingSeed: 42,
          inputSha256: "b".repeat(64),
          standingsBefore: [],
          cost: {
            rematches: 0,
            repeatedRematches: 0,
            maximumMatchPointGap: 0,
            totalMatchPointGap: 0,
            totalRankGap: 0,
            seededOrderCost: 0,
          },
          decisions: [],
        },
        matches: [
          {
            matchId: "match-results",
            roundNumber: 1,
            tableNumber: 1,
            participantAId: "participant-a",
            participantBId: "participant-b",
            status: resultVersions.length === 0 ? "pending" : "confirmed",
            resultVersions,
            currentResultVersion: resultVersions.at(-1)?.version ?? null,
          },
        ],
        pauses: [],
      },
    ],
    standings: [],
    createdAt: "2026-09-21T18:00:00.000Z",
    updatedAt: "2026-09-21T18:20:00.000Z",
    startedAt: "2026-09-21T18:10:00.000Z",
    completedAt: tournamentStatus === "completed" ? "2026-09-21T18:30:00.000Z" : null,
  });

  await page.route("**/api/tournaments**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === "/api/tournaments/cubes") {
      await route.fulfill({ json: { ok: true, cubes: [] } });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments") {
      await route.fulfill({
        json: {
          ok: true,
          tournaments: [
            {
              tournamentId: "tournament-results",
              name: "Finale du vendredi",
              status: tournamentStatus,
              format: "swiss",
              cube: {
                cubeKey: "titou_tribal",
                cubeName: "Titou Tribal",
                activeSnapshotId: "titou_tribal@2026-09-21.1",
              },
              participantCount: 2,
              currentRoundNumber: 1,
              leaders: [],
              revision,
              createdAt: "2026-09-21T18:00:00.000Z",
              updatedAt: "2026-09-21T18:20:00.000Z",
            },
          ],
        },
      });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments/tournament-results") {
      await route.fulfill({ json: { ok: true, tournament: buildTournament() } });
      return;
    }
    if (
      request.method() === "POST" &&
      url.pathname === "/api/tournaments/tournament-results/matches/match-results/result"
    ) {
      const body = request.postDataJSON() as {
        expectedRevision: number;
        kind: "played" | "forfeit";
        gamesWonA: number;
        gamesWonB: number;
        drawnGames: number;
        reason?: string;
      };
      expect(body.expectedRevision).toBe(revision);
      resultVersions.push({
        version: resultVersions.length + 1,
        kind: body.kind,
        gamesWonA: body.gamesWonA,
        gamesWonB: body.gamesWonB,
        drawnGames: body.drawnGames,
        outcome:
          body.gamesWonA === body.gamesWonB
            ? "draw"
            : body.gamesWonA > body.gamesWonB
              ? "a-win"
              : "b-win",
        recordedAt: "2026-09-21T18:20:00.000Z",
        requestId: `result-${String(resultVersions.length + 1)}`,
        replacesVersion: resultVersions.at(-1)?.version ?? null,
        reason: body.reason ?? null,
      });
      revision += 1;
      await route.fulfill({ json: { ok: true, tournament: buildTournament() } });
      return;
    }
    if (
      request.method() === "POST" &&
      url.pathname === "/api/tournaments/tournament-results/complete"
    ) {
      expect(request.postDataJSON()).toEqual({ expectedRevision: revision });
      revision += 1;
      tournamentStatus = "completed";
      await route.fulfill({ json: { ok: true, tournament: buildTournament() } });
      return;
    }
    await route.fulfill({ status: 404, json: { ok: false } });
  });

  await page.goto("/tournaments");
  await page.locator('[data-tournament-id="tournament-results"]').click();
  const match = page.locator('[data-match-id="match-results"]');
  await match.locator("[data-games-won-a]").fill("2");
  await match.locator("[data-games-won-b]").fill("1");
  await match.locator("[data-drawn-games]").fill("0");
  await match.locator("[data-save-result]").click();
  await expect(match.locator("[data-result-history]")).toContainText("v1");
  await expect(match.locator("[data-result-history]")).toContainText("2–1");

  await match.locator("[data-games-won-a]").fill("0");
  await match.locator("[data-games-won-b]").fill("2");
  await match.locator("[data-result-reason]").fill("Score saisi à l'envers");
  await match.locator("[data-save-result]").click();
  await expect(match.locator("[data-result-history]")).toContainText("v1 · 2–1");
  await expect(match.locator("[data-result-history]")).toContainText("v2 · 0–2");

  await page.locator("#tournament-complete").click();
  await expect(page.locator("#tournament-current-status")).toHaveText("Terminé");
  await expect(page.locator('[data-match-id="match-results"] [data-result-history]')).toContainText(
    "v2 · 0–2",
  );
});

test("affiche les trois paires et les trois pauses du toutes-rondes à trois", async ({ page }) => {
  const participants = [
    ["participant-a", "Alice", "Aggro Boros"],
    ["participant-b", "Bob", "Izzet Wizards"],
    ["participant-c", "Charlie", "Mono Green"],
  ].map(([participantId, displayName, deckName], registrationOrder) => ({
    participantId,
    displayName,
    normalizedName: displayName?.toLowerCase(),
    registrationOrder,
    status: "active",
    deck: { name: deckName, keyCards: [] },
  }));
  const fraction = { numerator: 0, denominator: 1 };
  const standings = participants.map((participant, index) => ({
    participantId: participant.participantId,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    gamesWon: 0,
    gamesDrawn: 0,
    gamesLost: 0,
    matchPoints: 0,
    matchWinPercentage: fraction,
    opponentsMatchWinPercentage: fraction,
    gameWinPercentage: fraction,
    opponentsGameWinPercentage: fraction,
    competitiveRank: 1,
    displayOrder: index + 1,
  }));
  const configured = {
    schemaVersion: 1,
    tournamentId: "tournament-round-robin",
    revision: 1,
    name: "Toutes rondes du vendredi",
    status: "preparation",
    format: "round-robin-three",
    plannedRoundCount: 3,
    pairingSeed: 42,
    pairingEngineVersion: "tournament-pairing@1",
    cube: {
      cubeKey: "titou_tribal",
      cubeName: "Titou Tribal",
      snapshotId: "titou_tribal@2026-09-21.1",
      canonicalSha256: "a".repeat(64),
      payload: {},
    },
    participants,
    rounds: [],
    standings,
    createdAt: "2026-09-21T18:00:00.000Z",
    updatedAt: "2026-09-21T18:05:00.000Z",
    startedAt: null,
    completedAt: null,
  };
  const pairings = [
    ["participant-a", "participant-b", "participant-c"],
    ["participant-a", "participant-c", "participant-b"],
    ["participant-b", "participant-c", "participant-a"],
  ] as const;
  const rounds = pairings.map(([participantAId, participantBId, pausedParticipantId], index) => ({
    roundNumber: index + 1,
    status: "published",
    sourceRevision: 1,
    publishedAt: "2026-09-21T18:10:00.000Z",
    completedAt: null,
    pairingEvidence: {
      engineVersion: "tournament-pairing@1",
      pairingSeed: 42,
      inputSha256: String(index + 1).repeat(64),
      standingsBefore: standings,
      cost: {
        rematches: 0,
        repeatedRematches: 0,
        maximumMatchPointGap: 0,
        totalMatchPointGap: 0,
        totalRankGap: 0,
        seededOrderCost: 0,
      },
      decisions: [],
    },
    matches: [
      {
        matchId: `round-robin-match-${String(index + 1)}`,
        roundNumber: index + 1,
        tableNumber: 1,
        participantAId,
        participantBId,
        status: "pending",
        resultVersions: [],
        currentResultVersion: null,
      },
    ],
    pauses: [{ participantId: pausedParticipantId, reason: "round-robin-pause" }],
  }));
  const active = {
    ...configured,
    revision: 2,
    status: "active",
    rounds,
    updatedAt: "2026-09-21T18:10:00.000Z",
    startedAt: "2026-09-21T18:10:00.000Z",
  };
  let current: typeof configured | typeof active = configured;

  await page.route("**/api/tournaments**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === "/api/tournaments/cubes") {
      await route.fulfill({ json: { ok: true, cubes: [] } });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments") {
      await route.fulfill({
        json: {
          ok: true,
          tournaments: [
            {
              tournamentId: current.tournamentId,
              name: current.name,
              status: current.status,
              format: current.format,
              cube: {
                cubeKey: current.cube.cubeKey,
                cubeName: current.cube.cubeName,
                activeSnapshotId: current.cube.snapshotId,
              },
              participantCount: 3,
              currentRoundNumber: current.status === "active" ? 3 : null,
              leaders: [],
              revision: current.revision,
              createdAt: current.createdAt,
              updatedAt: current.updatedAt,
            },
          ],
        },
      });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments/tournament-round-robin") {
      await route.fulfill({ json: { ok: true, tournament: current } });
      return;
    }
    if (
      request.method() === "POST" &&
      url.pathname === "/api/tournaments/tournament-round-robin/start"
    ) {
      current = active;
      await route.fulfill({ json: { ok: true, tournament: active } });
      return;
    }
    await route.fulfill({ status: 404, json: { ok: false } });
  });

  await page.goto("/tournaments");
  await page.locator('[data-tournament-id="tournament-round-robin"]').click();
  await page.locator("#tournament-start").click();
  await expect(page.locator("[data-tournament-round]")).toHaveCount(3);
  await expect(page.locator("[data-tournament-table]")).toHaveCount(3);
  await expect(page.locator("[data-tournament-table]").nth(0)).toContainText("Alice — Bob");
  await expect(page.locator("[data-tournament-table]").nth(1)).toContainText("Alice — Charlie");
  await expect(page.locator("[data-tournament-table]").nth(2)).toContainText("Bob — Charlie");
  await expect(page.locator("[data-round-robin-pause]")).toHaveCount(3);
  await expect(page.locator("[data-round-robin-pause]").nth(0)).toContainText("Charlie");
  await expect(page.locator("[data-round-robin-pause]").nth(1)).toContainText("Bob");
  await expect(page.locator("[data-round-robin-pause]").nth(2)).toContainText("Alice");
});

test("recherche, sélectionne et retrouve une carte clé du Snapshot après reload", async ({
  page,
}) => {
  const snapshotCards = [
    { oracleId: "oracle-lightning-bolt", name: "Lightning Bolt" },
    { oracleId: "oracle-counterspell", name: "Counterspell" },
  ];
  let keyCards: { oracleId: string; name: string }[] = [];
  let revision = 2;
  const buildTournament = () => ({
    schemaVersion: 1,
    tournamentId: "tournament-key-cards",
    revision,
    name: "Cartes clés du vendredi",
    status: "active",
    format: "swiss",
    plannedRoundCount: 1,
    pairingSeed: 42,
    pairingEngineVersion: "tournament-pairing@1",
    cube: {
      cubeKey: "titou_tribal",
      cubeName: "Titou Tribal",
      snapshotId: "titou_tribal@2026-09-21.1",
      canonicalSha256: "a".repeat(64),
      payload: {
        cards: snapshotCards.map((card, index) => ({
          ...card,
          instanceId: `instance-${String(index + 1)}`,
          printingId: `printing-${String(index + 1)}`,
        })),
      },
    },
    participants: [
      {
        participantId: "participant-alice",
        displayName: "Alice",
        normalizedName: "alice",
        registrationOrder: 0,
        status: "active",
        deck: { name: "Aggro Boros", keyCards },
      },
      {
        participantId: "participant-bob",
        displayName: "Bob",
        normalizedName: "bob",
        registrationOrder: 1,
        status: "active",
        deck: { name: "Izzet Wizards", keyCards: [] },
      },
    ],
    rounds: [],
    standings: [],
    createdAt: "2026-09-21T18:00:00.000Z",
    updatedAt: "2026-09-21T18:10:00.000Z",
    startedAt: "2026-09-21T18:10:00.000Z",
    completedAt: null,
  });

  await page.route("**/api/tournaments**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === "/api/tournaments/cubes") {
      await route.fulfill({ json: { ok: true, cubes: [] } });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments") {
      await route.fulfill({
        json: {
          ok: true,
          tournaments: [
            {
              tournamentId: "tournament-key-cards",
              name: "Cartes clés du vendredi",
              status: "active",
              format: "swiss",
              cube: {
                cubeKey: "titou_tribal",
                cubeName: "Titou Tribal",
                activeSnapshotId: "titou_tribal@2026-09-21.1",
              },
              participantCount: 2,
              currentRoundNumber: 1,
              leaders: [],
              revision,
              createdAt: "2026-09-21T18:00:00.000Z",
              updatedAt: "2026-09-21T18:10:00.000Z",
            },
          ],
        },
      });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/tournaments/tournament-key-cards") {
      await route.fulfill({ json: { ok: true, tournament: buildTournament() } });
      return;
    }
    if (
      request.method() === "PUT" &&
      url.pathname ===
        "/api/tournaments/tournament-key-cards/participants/participant-alice/key-cards"
    ) {
      const body = request.postDataJSON() as {
        expectedRevision: number;
        oracleIds: string[];
      };
      expect(body).toEqual({
        expectedRevision: revision,
        oracleIds: ["oracle-lightning-bolt"],
      });
      keyCards = [snapshotCards[0] ?? { oracleId: "", name: "" }];
      revision += 1;
      await route.fulfill({ json: { ok: true, tournament: buildTournament() } });
      return;
    }
    await route.fulfill({ status: 404, json: { ok: false } });
  });

  await page.goto("/tournaments");
  await page.locator('[data-tournament-id="tournament-key-cards"]').click();
  const aliceDeck = page.locator('[data-key-cards-participant="participant-alice"]');
  await aliceDeck.locator("[data-key-card-search]").fill("lightning");
  await expect(aliceDeck.locator("[data-key-card-option]")).toHaveCount(1);
  await aliceDeck.locator("[data-key-card-option]").click();
  await aliceDeck.locator("[data-save-key-cards]").click();
  await expect(aliceDeck.locator("[data-key-card-chip]")).toHaveText("Lightning BoltRetirer");

  await page.reload();
  await page.locator('[data-tournament-id="tournament-key-cards"]').click();
  const savedChip = page
    .locator('[data-key-cards-participant="participant-alice"]')
    .locator("[data-key-card-chip]");
  await expect(savedChip).toContainText("Lightning Bolt");

  await savedChip.hover();
  const popover = page.locator("#card-hover-popover");
  await expect(popover).toBeVisible();
  await expect(page.locator("#popover-img")).toHaveAttribute(
    "src",
    /api\.scryfall\.com\/cards\/named\?exact=Lightning%20Bolt/,
  );

  await page.mouse.move(0, 0);
  await expect(popover).toBeHidden();
});

test("annonce le chargement et permet de réessayer après une indisponibilité du stockage", async ({
  page,
}) => {
  let releaseHistory!: () => void;
  const historyGate = new Promise<void>((resolve) => {
    releaseHistory = resolve;
  });
  await page.route("**/api/tournaments**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/tournaments/cubes") {
      await route.fulfill({ json: { ok: true, cubes: [] } });
      return;
    }
    await historyGate;
    await route.fulfill({
      status: 503,
      json: {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Le stockage durable des tournois est momentanément indisponible.",
          details: {},
        },
      },
    });
  });

  await page.goto("/tournaments");
  await expect(page.locator("#tournament-loading")).toBeVisible();
  await expect(page.locator("#tournament-workspace")).toHaveAttribute("aria-busy", "true");
  releaseHistory();
  await expect(page.locator("#tournament-feedback")).toContainText("momentanément indisponible");
  await expect(page.locator("#tournament-reload")).toBeVisible();
  await expect(page.locator("#tournament-workspace")).toHaveAttribute("aria-busy", "false");
});

test("conserve un formulaire compact sans débordement à 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route("**/api/tournaments**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      json:
        url.pathname === "/api/tournaments/cubes"
          ? {
              ok: true,
              cubes: [
                {
                  cubeKey: "titou_tribal",
                  cubeName: "Titou Tribal",
                  activeSnapshotId: "titou_tribal@2026-09-21.1",
                },
              ],
            }
          : { ok: true, tournaments: [] },
    });
  });

  await page.goto("/tournaments");
  await page.locator("#tournament-new-btn").click();
  await expect(page.locator("#tournament-create-form")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});

test("UX tournoi: auto-nommage via cube, sélection magiciens et annulation", async ({ page }) => {
  let tournamentDeleted = false;
  let currentTournament: BrowserTournament | null = null;

  await page.route("**/api/tournaments**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === "/api/tournaments/cubes") {
      await route.fulfill({
        json: {
          ok: true,
          cubes: [
            {
              cubeKey: "titou_tribal",
              cubeName: "Titou Tribal",
              activeSnapshotId: "titou_tribal@2026-09-21.1",
            },
          ],
        },
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/tournaments") {
      await route.fulfill({
        json: {
          ok: true,
          tournaments:
            tournamentDeleted || currentTournament === null
              ? []
              : [
                  {
                    tournamentId: currentTournament.tournamentId,
                    name: currentTournament.name,
                    status: currentTournament.status,
                    format: currentTournament.format,
                    cube: currentTournament.cube,
                    participantCount: currentTournament.participants.length,
                    currentRoundNumber: null,
                    leaders: [],
                    revision: currentTournament.revision,
                    createdAt: currentTournament.createdAt,
                    updatedAt: currentTournament.updatedAt,
                  },
                ],
        },
      });
      return;
    }

    if (request.method() === "POST" && url.pathname === "/api/tournaments") {
      const body = request.postDataJSON() as { name: string };
      currentTournament = {
        tournamentId: "tournament-ux-001",
        revision: 1,
        name: body.name,
        status: "preparation",
        format: "round-robin",
        plannedRoundCount: 3,
        cube: null,
        participants: [],
        rounds: [],
        standings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await route.fulfill({ json: { ok: true, tournament: currentTournament } });
      return;
    }

    if (request.method() === "DELETE" && url.pathname === "/api/tournaments/tournament-ux-001") {
      tournamentDeleted = true;
      currentTournament = null;
      await route.fulfill({ json: { ok: true } });
      return;
    }

    await route.fulfill({ status: 404, json: { ok: false } });
  });

  await page.goto("/tournaments");

  // 1. Cube selection in creation panel auto-fills name
  await page.locator("#tournament-new-btn").click();
  await page.locator("#tournament-create-cube").selectOption("titou_tribal");
  const nameValue = await page.locator("#tournament-create-name").inputValue();
  expect(nameValue).toMatch(/^Cube titou's tribal du \d{2}\/\d{2}\/\d{2}$/);

  // 2. Submit creation and check setup form displays the auto-generated name
  await page.locator("#tournament-create-submit").click();
  await expect(page.locator("#tournament-setup-form")).toBeVisible();
  await expect(page.locator("#tournament-name")).toHaveValue(nameValue);

  // 3. Select magicien habituel from dropdown
  const firstRow = page.locator("[data-tournament-player-row]").first();
  await firstRow.locator("[data-player-select]").selectOption("Tristan");
  await expect(firstRow.locator("[data-player-name]")).toHaveValue("Tristan");

  // 4. Cancel tournament via direct button
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator("#tournament-cancel-btn").click();

  await expect(page.locator("#tournament-feedback")).toContainText("annulé avec succès");
  await expect(page.locator("#tournament-editor")).toBeHidden();
  expect(tournamentDeleted).toBe(true);
});

test("reconnaît un deck depuis une photo et affiche la vue 17Lands interactive", async ({
  page,
}) => {
  let recognizedCalled = false;
  await page.route("**/api/tournaments/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === "/api/tournaments/cubes") {
      await route.fulfill({
        json: {
          ok: true,
          cubes: [{ cubeKey: "titou_tribal", cubeName: "Titou Tribal" }],
        },
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/tournaments") {
      await route.fulfill({ json: { ok: true, tournaments: [] } });
      return;
    }

    if (request.method() === "POST" && url.pathname === "/api/tournaments") {
      await route.fulfill({
        status: 201,
        json: {
          ok: true,
          tournament: {
            tournamentId: "t-deck-001",
            revision: 0,
            name: "Tournoi Deck IA",
            status: "preparation",
            format: "swiss",
            plannedRoundCount: 3,
            cube: { cubeKey: "titou_tribal", cubeName: "Titou Tribal" },
            participants: [],
            rounds: [],
            standings: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      });
      return;
    }

    if (request.method() === "POST" && url.pathname === "/api/tournaments/recognize-deck") {
      recognizedCalled = true;
      await route.fulfill({
        json: {
          ok: true,
          archetype: "Aggro Boros",
          cards: [
            {
              name: "Champion of the Parish",
              count: 2,
              cmc: 1,
              typeLine: "Creature — Human Soldier",
              imageUrl: "https://example.com/champion.jpg",
            },
          ],
          basicLands: { Plains: 8, Mountain: 8, Island: 0, Swamp: 0, Forest: 0 },
          totalCount: 18,
          confidence: 0.98,
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { ok: false } });
  });

  await page.goto("/tournaments");

  // Create tournament
  await page.locator("#tournament-new-btn").click();
  await page.locator("#tournament-create-name").fill("Tournoi Deck IA");
  await page.locator("#tournament-create-cube").selectOption("titou_tribal");
  await page.locator("#tournament-create-submit").click();

  // Ensure setup is visible
  await expect(page.locator("#tournament-setup-form")).toBeVisible();
  const firstRow = page.locator("[data-tournament-player-row]").first();

  // Set file input on the first row
  const fileInput = firstRow.locator('input[type="file"]');
  const buffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await fileInput.setInputFiles({
    name: "deck.png",
    mimeType: "image/png",
    buffer,
  });

  // Verify recognition called and feedback shown
  await expect(page.locator("#tournament-feedback")).toContainText("Deck reconnu avec succès");
  expect(recognizedCalled).toBe(true);

  // Verify archetype updated in row input
  await expect(firstRow.locator("[data-deck-name]")).toHaveValue("Aggro Boros");

  // Verify deck modal opened
  const modalBackdrop = page.locator("#tournament-deck-modal-backdrop");
  await expect(modalBackdrop).toBeVisible();
  await expect(page.locator("#tournament-deck-total-count")).toContainText("18 cartes");

  // Verify 17Lands target has rendered columns
  await expect(page.locator(".deck-17lands-board")).toBeVisible();

  // Verify basic lands stepper
  await expect(page.locator('[data-land-qty="Plains"]')).toHaveText("8");
  await expect(page.locator('[data-land-qty="Mountain"]')).toHaveText("8");

  // Click Validate
  await page.locator("#tournament-deck-save-btn").click();
  await expect(modalBackdrop).toBeHidden();

  // Verify view deck button on row has card count
  const viewDeckBtn = firstRow.locator("[data-view-deck-btn]");
  await expect(viewDeckBtn).toContainText("Deck (18)");

  // Click view deck button to reopen
  await viewDeckBtn.click();
  await expect(modalBackdrop).toBeVisible();
  await expect(page.locator("#tournament-deck-total-count")).toContainText("18 cartes");

  // Close modal via close button
  await page.locator("#tournament-deck-close-btn").click();
  await expect(modalBackdrop).toBeHidden();
});
