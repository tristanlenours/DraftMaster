import { expect, test, type BrowserContext, type Route } from "@playwright/test";

interface PublicLobby {
  lobbyId: "global";
  generation: number;
  revision: number;
  status: "open" | "drafting";
  cubeKey: string | null;
  cubeLocked: boolean;
  activeSessionId: string | null;
  participants: {
    participantId: string;
    displayName: string;
    seatId: number;
    ready: boolean;
    presence: "connected";
  }[];
  seats: (Record<string, unknown> | null)[];
}

test("deux amis rejoignent le Salon et conservent chacun leur Acces de reprise", async ({
  browser,
}) => {
  const lobby: PublicLobby = {
    lobbyId: "global",
    generation: 0,
    revision: 0,
    status: "open",
    cubeKey: null,
    cubeLocked: false,
    activeSessionId: null,
    participants: [],
    seats: [null, null, null, null, null, null, null, null],
  };
  const routeApi = async (route: Route) => {
    const request = route.request();
    if (request.method() === "GET") {
      if (request.url().endsWith("/api/multiplayer/state")) {
        const token = request.headers().authorization?.replace("Bearer private-", "") ?? "";
        const participant = lobby.participants.find(
          (candidate) => candidate.participantId === token,
        );
        await route.fulfill({
          json: {
            ok: true,
            state: {
              revision: lobby.revision,
              sessionId: lobby.activeSessionId,
              status: "drafting",
              participantId: participant?.participantId,
              seatId: participant?.seatId,
              packNumber: 1,
              pickNumber: 1,
              currentBooster: Array.from({ length: 15 }, (_, index) => ({
                instanceId: `${participant?.participantId ?? "unknown"}-card-${String(index)}`,
                name: `Carte ${String(index + 1)}`,
              })),
              pool: [],
              pickSubmitted: false,
              waitingFor: lobby.participants.map(({ displayName }) => displayName),
            },
          },
        });
        return;
      }
      await route.fulfill({ json: { ok: true, state: lobby } });
      return;
    }
    const body = request.postDataJSON() as {
      playerName: string;
      cubeKey?: string;
      expectedRevision: number;
    };
    if (request.url().endsWith("/api/multiplayer/lobby/cube")) {
      lobby.revision += 1;
      lobby.cubeKey = body.cubeKey ?? lobby.cubeKey;
      await route.fulfill({ json: { ok: true, state: lobby } });
      return;
    }
    if (request.url().endsWith("/api/multiplayer/ready")) {
      const token = request.headers().authorization?.replace("Bearer private-", "") ?? "";
      const participant = lobby.participants.find((candidate) => candidate.participantId === token);
      if (participant) {
        participant.ready = Boolean((body as { ready?: boolean }).ready);
        const seat = lobby.seats[participant.seatId];
        if (seat) seat.ready = participant.ready;
      }
      lobby.revision += 1;
      if (lobby.participants.length >= 2 && lobby.participants.every(({ ready }) => ready)) {
        lobby.status = "drafting";
        lobby.activeSessionId = "abcdef123456";
        lobby.seats = lobby.seats.map(
          (seat, seatId) =>
            seat ?? { seatId, kind: "bot", displayName: `Friend-Bot ${String(seatId)}` },
        );
      }
      await route.fulfill({ json: { ok: true, state: lobby } });
      return;
    }
    if (request.url().endsWith("/api/multiplayer/lobby/leave")) {
      const token = request.headers().authorization?.replace("Bearer private-", "") ?? "";
      const participant = lobby.participants.find((candidate) => candidate.participantId === token);
      if (participant) {
        lobby.participants = lobby.participants.filter(
          (candidate) => candidate.participantId !== participant.participantId,
        );
        lobby.seats[participant.seatId] = null;
        for (const remaining of lobby.participants) {
          remaining.ready = false;
          const seat = lobby.seats[remaining.seatId];
          if (seat) seat.ready = false;
        }
      }
      lobby.revision += 1;
      await route.fulfill({ json: { ok: true, state: lobby } });
      return;
    }
    if (request.url().endsWith("/api/multiplayer/abandon")) {
      lobby.revision += 1;
      lobby.status = "open";
      lobby.activeSessionId = null;
      lobby.participants = [];
      lobby.seats = [null, null, null, null, null, null, null, null];
      lobby.cubeKey = null;
      lobby.cubeLocked = false;
      await route.fulfill({ json: { ok: true, state: lobby } });
      return;
    }
    const seatId = lobby.participants.length;
    const participantId = `participant-${String(seatId + 1)}`;
    lobby.generation = 1;
    lobby.revision += 1;
    lobby.cubeKey ??= body.cubeKey ?? null;
    lobby.cubeLocked = seatId >= 1;
    const participant = {
      participantId,
      displayName: body.playerName,
      seatId,
      ready: false as const,
      presence: "connected" as const,
    };
    lobby.participants.push(participant);
    lobby.seats[seatId] = { ...participant, kind: "human" };
    await route.fulfill({
      json: {
        ok: true,
        participantId,
        resumeToken: `private-${participantId}`,
        state: lobby,
      },
    });
  };
  const createFriendContext = async (): Promise<BrowserContext> => {
    const context = await browser.newContext({ baseURL: "http://127.0.0.1:4173" });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await context.route("**/api/multiplayer/**", routeApi);
    return context;
  };
  const aliceContext = await createFriendContext();
  const bobContext = await createFriendContext();
  let aliceContextClosed = false;
  let resumedContext: BrowserContext | undefined;
  let charlieContext: BrowserContext | undefined;
  try {
    const alicePage = await aliceContext.newPage();
    await alicePage.goto("/multi");
    await expect(
      alicePage.getByRole("heading", { name: "Salon de draft multijoueur" }),
    ).toBeVisible();
    await alicePage.locator("#multi-player-name").fill("Alice");
    await alicePage.locator("#multi-cube-select").selectOption("titou_tribal");
    await alicePage.locator("#multi-join-btn").click();
    await expect(alicePage.locator("#multi-resume-code")).toHaveValue("private-participant-1");
    await expect
      .poll(() =>
        alicePage.evaluate(() => localStorage.getItem("draftmaster_multiplayer_resume_token")),
      )
      .toBe("private-participant-1");
    await alicePage.locator("#multi-copy-resume").click();
    await expect(alicePage.locator("#multi-copy-resume")).toContainText("Copié");
    await alicePage.locator("#multi-cube-select").selectOption("nico_candyshop");
    await alicePage.locator("#multi-join-btn").click();
    await expect(alicePage.locator("#multi-cube-name")).toContainText("Nico");

    const bobPage = await bobContext.newPage();
    await bobPage.goto("/multi");
    await bobPage.locator("#multi-player-name").fill("Bob");
    await expect(bobPage.locator("#multi-cube-select")).toBeDisabled();
    await bobPage.locator("#multi-join-btn").click();
    await expect(bobPage.locator("#multi-participants")).toContainText("Alice");
    await expect(bobPage.locator("#multi-participants")).toContainText("Bob");
    await expect(alicePage.locator("#multi-participants")).toContainText("Bob", {
      timeout: 5_000,
    });
    await alicePage.locator("#multi-ready-btn").click();
    await expect(bobPage.locator("#multi-participants")).toContainText("Alice • prêt", {
      timeout: 5_000,
    });
    await bobPage.locator("#multi-leave-btn").click();
    await expect(bobPage.locator("#multi-lobby-status")).toHaveText("1/8 amis");
    await expect(bobPage.locator("#multi-participants")).toContainText("Alice • pas prêt");
    await expect(alicePage.locator("#multi-participants")).toContainText("Alice • pas prêt", {
      timeout: 5_000,
    });
    await expect
      .poll(() =>
        bobPage.evaluate(() => localStorage.getItem("draftmaster_multiplayer_resume_token")),
      )
      .toBeNull();
    await bobPage.locator("#multi-join-btn").click();
    await expect(alicePage.locator("#multi-participants")).toContainText("Bob", {
      timeout: 5_000,
    });
    await alicePage.locator("#multi-ready-btn").click();
    await bobPage.locator("#multi-ready-btn").click();
    await expect(bobPage.locator("#multi-lobby-status")).toHaveText("Draft en cours");
    await expect(bobPage.locator("#multi-participants .is-bot")).toHaveCount(6);
    await expect(bobPage.locator(".multi-booster-card")).toHaveCount(15);
    await expect(bobPage.locator(".multi-booster-card img")).toHaveCount(15);

    await aliceContext.close();
    aliceContextClosed = true;
    resumedContext = await createFriendContext();
    const resumedPage = await resumedContext.newPage();
    await resumedPage.goto("/multi");
    await resumedPage.getByText("J'ai déjà un code de reprise").click();
    await resumedPage.locator("#multi-import-code").fill("private-participant-1");
    await resumedPage.locator("#multi-import-resume").click();
    await expect(resumedPage.locator(".multi-booster-card")).toHaveCount(15);
    await expect
      .poll(() =>
        resumedPage.evaluate(() => localStorage.getItem("draftmaster_multiplayer_participant_id")),
      )
      .toBe("participant-1");

    resumedPage.on("dialog", (dialog) => void dialog.accept());
    await resumedPage.locator("#multi-abandon-draft").click();
    await expect(resumedPage.locator("#multi-lobby-status")).toHaveText("0/8 amis");

    charlieContext = await createFriendContext();
    const charliePage = await charlieContext.newPage();
    await charliePage.goto("/multi");
    await charliePage.locator("#multi-player-name").fill("Charlie");
    await charliePage.locator("#multi-cube-select").selectOption("titou_tribal");
    await charliePage.locator("#multi-join-btn").click();
    await expect(charliePage.locator("#multi-participants")).toContainText("Charlie");
  } finally {
    await resumedContext?.close();
    await charlieContext?.close();
    if (!aliceContextClosed) await aliceContext.close();
    await bobContext.close();
  }
});

test("atelier 40 cartes modifiable et export MTGA au clavier sur mobile", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 360, height: 800 },
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await context.addInitScript(() => {
    localStorage.setItem("draftmaster_multiplayer_resume_token", "private-alice");
    localStorage.setItem("draftmaster_multiplayer_participant_id", "participant-alice");
  });

  const pool = Array.from({ length: 45 }, (_, index) => ({
    instanceId: `card-${String(index + 1)}`,
    name: `Carte ${String(index + 1)}`,
  }));
  const recommendation = {
    maindeckCardInstanceIds: pool.slice(0, 23).map(({ instanceId }) => instanceId),
    sideboardCardInstanceIds: pool.slice(23).map(({ instanceId }) => instanceId),
    basicLands: { Plains: 9, Island: 8, Swamp: 0, Mountain: 0, Forest: 0 },
    totalCardCount: 40,
    landCount: 17,
    strategy: "Tempo azorius",
    primaryColors: ["W", "U"],
    splashColors: [],
    includedReasons: [{ cardInstanceIds: ["card-1"], reason: "Menace principale" }],
    excludedReasons: [{ cardInstanceIds: ["card-24"], reason: "Moins coherent" }],
    manaRationale: "Neuf sources blanches et huit bleues.",
    landCountRationale: "Dix-sept terrains pour une courbe moyenne.",
    evaluation: {
      radar: { power: 74, synergy: 71, curve: 76, mana: 80, interaction: 68 },
    },
    source: "fallback",
    provider: "DraftMaster local",
    model: null,
    promptVersion: "final-deck-coach@1",
    engineVersion: "deck-evaluation@4",
  };
  let workspace: Record<string, unknown> | undefined;
  const playerState = () => ({
    revision: workspace ? 92 : 91,
    sessionId: "finished-session",
    status: "deckbuilding",
    participantId: "participant-alice",
    seatId: 0,
    packNumber: 3,
    pickNumber: 15,
    currentBooster: [],
    pool,
    pickSubmitted: false,
    waitingFor: [],
    ...(workspace ? { deckWorkspace: workspace } : {}),
  });
  await context.route("**/api/multiplayer/**", async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.endsWith("/api/multiplayer/lobby")) {
      await route.fulfill({
        json: {
          ok: true,
          state: {
            lobbyId: "global",
            generation: 2,
            revision: 92,
            status: "open",
            cubeKey: null,
            cubeLocked: false,
            activeSessionId: null,
            participants: [],
            seats: [null, null, null, null, null, null, null, null],
          },
        },
      });
      return;
    }
    if (url.endsWith("/api/multiplayer/state")) {
      await route.fulfill({ json: { ok: true, state: playerState() } });
      return;
    }
    if (url.endsWith("/api/multiplayer/deck/recommend")) {
      workspace = {
        participantId: "participant-alice",
        sessionId: "finished-session",
        revision: 1,
        status: "editing",
        poolCardInstanceIds: pool.map(({ instanceId }) => instanceId),
        maindeckCardInstanceIds: recommendation.maindeckCardInstanceIds,
        basicLands: recommendation.basicLands,
        sideboardCardInstanceIds: recommendation.sideboardCardInstanceIds,
        recommendation,
        evaluation: recommendation.evaluation,
      };
      await route.fulfill({ json: { ok: true, workspace } });
      return;
    }
    if (url.endsWith("/api/multiplayer/deck") && request.method() === "PUT") {
      const selection = request.postDataJSON() as {
        maindeckCardInstanceIds: string[];
        basicLands: Record<string, number>;
        finalize: boolean;
      };
      expect(selection.finalize).toBe(true);
      expect(selection.maindeckCardInstanceIds).toContain("card-24");
      expect(selection.maindeckCardInstanceIds).not.toContain("card-1");
      workspace = {
        ...workspace,
        revision: 2,
        status: "finalized",
        maindeckCardInstanceIds: selection.maindeckCardInstanceIds,
        basicLands: selection.basicLands,
        evaluation: {
          radar: { power: 81, synergy: 82, curve: 83, mana: 84, interaction: 85 },
        },
      };
      await route.fulfill({ json: { ok: true, workspace } });
      return;
    }
    if (url.endsWith("/api/multiplayer/deck/export.mtga")) {
      await route.fulfill({
        contentType: "text/plain; charset=utf-8",
        body: "Deck\n1 Carte 24\n22 Carte 2\n9 Plains\n8 Island\n\nSideboard\n1 Carte 1\n",
      });
      return;
    }
    if (url.endsWith("/api/multiplayer/deck/export.tournament.txt")) {
      expect(request.headers().authorization).toBe("Bearer private-alice");
      await route.fulfill({
        contentType: "text/plain; charset=utf-8",
        body: "Deck\n1 Carte 24\n22 Carte 2\n9 Plains\n8 Island\n\nSideboard\n1 Carte 1\n",
      });
      return;
    }
    await route.abort();
  });

  try {
    const page = await context.newPage();
    await page.goto("/multi");
    await expect(page.getByRole("heading", { name: "Votre Liste de 40 cartes" })).toBeVisible();
    await expect(page.locator("#multi-drafted-pool img")).toHaveCount(45);
    await page.locator("#multi-recommend-deck").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#multi-deck-count")).toHaveText("40 / 40");
    await expect(page.locator("#multi-coach-strategy")).toContainText("Tempo azorius");

    await page.getByRole("button", { name: "Retirer Carte 1 du deck" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#multi-deck-count")).toHaveText("39 / 40");
    await page.getByRole("button", { name: "Ajouter Carte 24 au deck" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#multi-deck-count")).toHaveText("40 / 40");

    await page.locator("#multi-finalize-deck").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#multi-export-actions")).toBeVisible();
    await expect(page.locator("#multi-coach-radar")).toContainText("85");
    await page.locator("#multi-copy-export").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#multi-feedback")).toHaveText("Liste MTGA copiée.");
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("Deck");
    await page.locator("#multi-copy-tournament-export").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#multi-feedback")).toHaveText("Liste pour tournoi copiée.");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("Carte 24");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await context.close();
  }
});
