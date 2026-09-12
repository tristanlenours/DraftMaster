import fs from "node:fs";
import path from "node:path";

export interface LogWatcherEvents {
  onDraftPack?: (pack: number, pick: number, cardIds: number[]) => void;
  onDraftPick?: (grpId: number, pack: number, pick: number) => void;
  onMatchStart?: (
    matchId: string,
    opponentName: string,
    playerSeat: number,
    eventId: string,
  ) => void;
  onMatchTurn?: (turn: number, phase: string, activePlayer: number) => void;
  onLifeChange?: (playerLife: number, oppLife: number) => void;
  onHandUpdate?: (handGrpIds: number[]) => void;
  onCardPlayed?: (seatId: number, grpId: number, isLand: boolean) => void;
  onBattlefieldUpdate?: (playerGrpIds: number[], oppGrpIds: number[]) => void;
  onMatchEnd?: (winningSeat: number, reason: string) => void;
  onSceneChange?: (from: string, to: string) => void;
}

export class LogWatcher {
  private logPath: string;
  private timer: NodeJS.Timeout | null = null;
  private lastOffset = 0;
  private events: LogWatcherEvents;
  private isProcessing = false;
  private buffer = "";

  // In-match session state
  private myUserId: string | null = null;
  private playerSeatId = 1;
  private oppSeatId = 2;
  private handZoneId: number | null = null;
  private battlefieldZoneId: number | null = null;
  private handCardsMap = new Map<number, number>();
  private gameObjectCatalog = new Map<number, { grpId: number; ownerSeatId: number }>();
  private seenTransferIds = new Set<number>();

  constructor(customPath?: string, events: LogWatcherEvents = {}) {
    this.logPath =
      customPath ??
      path.join(
        process.env.USERPROFILE ?? "C:\\Users\\trist",
        "AppData",
        "LocalLow",
        "Wizards Of The Coast",
        "MTGA",
        "Player.log",
      );
    this.events = events;
  }

  public setEvents(events: LogWatcherEvents) {
    this.events = { ...this.events, ...events };
  }

  public start(pollIntervalMs = 750) {
    if (!fs.existsSync(this.logPath)) {
      console.warn("[LogWatcher] Player.log not found at:", this.logPath);
      return;
    }

    try {
      const stats = fs.statSync(this.logPath);
      // Read file to immediately discover user ID and reconstruct active match/draft state
      const initialContent = fs.readFileSync(this.logPath, "utf8");
      this.processChunk(initialContent);
      this.lastOffset = stats.size;
    } catch {
      this.lastOffset = 0;
    }

    this.timer = setInterval(() => {
      this.poll();
    }, pollIntervalMs);

    console.log("[LogWatcher] Watching MTGA log at:", this.logPath);
    this.poll();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private poll() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      if (!fs.existsSync(this.logPath)) {
        this.isProcessing = false;
        return;
      }

      const fd = fs.openSync(this.logPath, "r");
      const stats = fs.fstatSync(fd);
      const currentSize = stats.size;

      if (currentSize < this.lastOffset) {
        // Log was truncated or rotated
        this.lastOffset = 0;
        this.buffer = "";
        this.handCardsMap.clear();
        this.gameObjectCatalog.clear();
        this.seenTransferIds.clear();
        this.handZoneId = null;
        this.battlefieldZoneId = null;
      }

      if (currentSize > this.lastOffset) {
        const bytesToRead = currentSize - this.lastOffset;
        const readBuf = Buffer.alloc(bytesToRead);
        fs.readSync(fd, readBuf, 0, bytesToRead, this.lastOffset);
        this.lastOffset = currentSize;

        const newChunk = readBuf.toString("utf8");
        this.processChunk(newChunk);
      }

      fs.closeSync(fd);
    } catch {
      // Occasional file share delay is normal
    } finally {
      this.isProcessing = false;
    }
  }

  private processChunk(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    // Keep incomplete last line in buffer
    this.buffer = lines.pop() ?? "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const nextLine = lines[i + 1] ?? "";
      this.parseLine(line, nextLine);
    }
  }

  private parseLine(line: string, nextLine: string) {
    // 1. Detect User ID
    const userMatch = /(?:Match to|to Match:)\s*([A-Z0-9]+)/.exec(line);
    if (userMatch?.[1]) {
      this.myUserId = userMatch[1];
    }

    // 2. Scene Change
    if (line.includes("Client.SceneChange")) {
      const m = /Client\.SceneChange\s+({.*?})/.exec(line);
      if (m?.[1]) {
        try {
          const data = JSON.parse(m[1]);
          this.events.onSceneChange?.(data.fromSceneName ?? "", data.toSceneName ?? "");
        } catch {}
      }
    }

    // 3. Draft.Notify (New booster offered)
    if (line.includes("Draft.Notify")) {
      const jsonCandidate = line.trim().startsWith("{")
        ? line
        : (/Draft\.Notify\s+({.*?})/.exec(line)?.[1] ??
          (nextLine.trim().startsWith("{") ? nextLine : ""));
      if (jsonCandidate.trim().startsWith("{")) {
        try {
          const data = JSON.parse(jsonCandidate);
          const pack = Number(data.SelfPack);
          const pick = Number(data.SelfPick);
          const rawCards = String(data.PackCards ?? "");
          const cardIds = rawCards
            .split(",")
            .map((x) => parseInt(x.trim(), 10))
            .filter((n) => !isNaN(n));

          if (cardIds.length > 0) {
            this.events.onDraftPack?.(pack, pick, cardIds);
          }
        } catch {}
      }
    }

    // 4. Draft Pick
    if (line.includes("EventPlayerDraftMakePick")) {
      const m = /EventPlayerDraftMakePick.*?GrpIds.*?\[(\d+)\].*?Pack.*?(\d+).*?Pick.*?(\d+)/.exec(
        line,
      );
      if (m?.[1] && m[2] && m[3]) {
        const grpId = parseInt(m[1], 10);
        const pack = parseInt(m[2], 10);
        const pick = parseInt(m[3], 10);
        if (!isNaN(grpId)) {
          this.events.onDraftPick?.(grpId, pack, pick);
        }
      } else {
        const jsonCandidate = line.trim().startsWith("{")
          ? line
          : nextLine.trim().startsWith("{")
            ? nextLine
            : "";
        if (jsonCandidate.trim().startsWith("{")) {
          try {
            const data = JSON.parse(jsonCandidate);
            const grpId = Number(data.GrpIds?.[0] ?? data.grpId);
            const pack = Number(data.Pack ?? data.pack ?? 1);
            const pick = Number(data.Pick ?? data.pick ?? 1);
            if (!isNaN(grpId) && grpId > 0) {
              this.events.onDraftPick?.(grpId, pack, pick);
            }
          } catch {}
        }
      }
    }

    // 5. Match Start & End via MatchGameRoomStateChangedEvent
    if (line.includes("MatchGameRoomStateChangedEvent")) {
      const jsonCandidate = line.trim().startsWith("{") ? line : nextLine;
      if (jsonCandidate.trim().startsWith("{")) {
        try {
          const data = JSON.parse(jsonCandidate);
          const info = data.matchGameRoomStateChangedEvent?.gameRoomInfo;
          if (info) {
            const st = info.stateType;
            if (st === "MatchGameRoomStateType_Playing") {
              const matchId = info.gameRoomConfig?.matchId ?? `match_${Date.now()}`;
              let oppName = "Adversaire";
              let eventId = "Constructed";
              const reserved = info.gameRoomConfig?.reservedPlayers ?? [];
              for (const p of reserved) {
                if (p.eventId) eventId = String(p.eventId);
                if (p.userId === this.myUserId) {
                  this.playerSeatId = p.systemSeatId;
                } else {
                  this.oppSeatId = p.systemSeatId;
                  oppName = p.playerName ?? "Adversaire";
                }
              }
              this.handCardsMap.clear();
              this.gameObjectCatalog.clear();
              this.seenTransferIds.clear();
              this.handZoneId = null;
              this.battlefieldZoneId = null;
              this.events.onMatchStart?.(matchId, oppName, this.playerSeatId, eventId);
            } else if (st === "MatchGameRoomStateType_MatchCompleted") {
              const res = info.finalMatchResult?.resultList?.[0];
              const winTeam = res?.winningTeamId ?? 0;
              const reason = res?.reason ?? "Normal";
              this.events.onMatchEnd?.(winTeam, reason);
            }
          }
        } catch {}
      }
    }

    // 6. GRE Events (Turns, Life, Hand Cards, Battlefield, Plays)
    if (line.includes("GreToClientEvent") || line.includes("greToClientEvent")) {
      const jsonCandidate = line.trim().startsWith("{") ? line : nextLine;
      if (jsonCandidate.trim().startsWith("{")) {
        try {
          const data = JSON.parse(jsonCandidate);
          const msgs = data.greToClientEvent?.greToClientMessages ?? [];
          for (const msg of msgs) {
            const gsm = msg.gameStateMessage;
            if (gsm) {
              // Turn & Phase
              if (gsm.turnInfo?.turnNumber !== undefined) {
                const rawPhase = String(gsm.turnInfo.phase ?? "Main1");
                const phase = rawPhase.replace("Phase_", "");
                const activePlayer = gsm.turnInfo.activePlayer ?? 1;
                this.events.onMatchTurn?.(gsm.turnInfo.turnNumber, phase, activePlayer);
              }

              // Life Totals
              if (gsm.players) {
                let pLife: number | null = null;
                let oLife: number | null = null;
                for (const pl of gsm.players) {
                  if (pl.systemSeatNumber === this.playerSeatId && pl.lifeTotal !== undefined) {
                    pLife = pl.lifeTotal;
                  }
                  if (pl.systemSeatNumber === this.oppSeatId && pl.lifeTotal !== undefined) {
                    oLife = pl.lifeTotal;
                  }
                }
                if (pLife !== null || oLife !== null) {
                  this.events.onLifeChange?.(pLife ?? 20, oLife ?? 20);
                }
              }

              // Game Objects (Instance ID to GrpId catalog)
              if (gsm.gameObjects) {
                for (const go of gsm.gameObjects) {
                  if (go.grpId && go.instanceId) {
                    this.handCardsMap.set(go.instanceId, go.grpId);
                    this.gameObjectCatalog.set(go.instanceId, {
                      grpId: go.grpId,
                      ownerSeatId: go.ownerSeatId ?? this.playerSeatId,
                    });
                  }
                }
              }

              // Zones (Hand & Battlefield update)
              if (gsm.zones) {
                for (const z of gsm.zones) {
                  if (z.type === "ZoneType_Hand" && z.ownerSeatId === this.playerSeatId) {
                    this.handZoneId = z.zoneId;
                  }
                  if (z.type === "ZoneType_Battlefield") {
                    this.battlefieldZoneId = z.zoneId;
                  }
                  if (z.zoneId === this.handZoneId && z.objectInstanceIds) {
                    const handGrpIds = (z.objectInstanceIds as number[])
                      .map((id) => this.handCardsMap.get(id))
                      .filter((id): id is number => typeof id === "number");

                    this.events.onHandUpdate?.(handGrpIds);
                  }
                  if (z.zoneId === this.battlefieldZoneId && z.objectInstanceIds) {
                    const playerGrpIds: number[] = [];
                    const oppGrpIds: number[] = [];
                    for (const instId of z.objectInstanceIds as number[]) {
                      const info = this.gameObjectCatalog.get(instId);
                      if (info) {
                        if (info.ownerSeatId === this.playerSeatId) {
                          playerGrpIds.push(info.grpId);
                        } else {
                          oppGrpIds.push(info.grpId);
                        }
                      }
                    }
                    this.events.onBattlefieldUpdate?.(playerGrpIds, oppGrpIds);
                  }
                }
              }

              // Annotations (Plays and Casts)
              if (gsm.annotations) {
                for (const a of gsm.annotations) {
                  const isTransfer =
                    a.type === "AnnotationType_ZoneTransfer" ||
                    (Array.isArray(a.type) && a.type.includes("AnnotationType_ZoneTransfer"));
                  if (!isTransfer) continue;
                  const annoId = Number(a.id);
                  if (!isNaN(annoId) && this.seenTransferIds.has(annoId)) continue;

                  const cat = a.details?.find((d: any) => d.key === "category")?.valueString?.[0];
                  if (cat === "PlayLand" || cat === "CastSpell") {
                    if (!isNaN(annoId)) this.seenTransferIds.add(annoId);
                    const isLand = cat === "PlayLand";
                    for (const id of a.affectedIds ?? []) {
                      const info = this.gameObjectCatalog.get(id);
                      if (info) {
                        this.events.onCardPlayed?.(info.ownerSeatId, info.grpId, isLand);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch {}
      }
    }
  }
}
