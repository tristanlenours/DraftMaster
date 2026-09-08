import { getSupabaseClient } from "./supabase-client.ts";
import {
  getLeaderboard,
  addLeaderboardEntry,
  rankLeaderboardEntries,
} from "../solo-draft/leaderboard.ts";
import type {
  BasicLandCounts,
  LeaderboardDeckCard,
  LeaderboardEntry,
} from "../solo-draft/solo-draft-types.ts";
import type { DeckArchetype, KiviatRadarScores } from "../domain/coaching/types.ts";

export interface MagicienProfileDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly nickname: string;
  readonly title: string;
  readonly quote: string;
  readonly level: string;
  readonly preferredColors: readonly string[];
  readonly avatarUrl: string;
  readonly totalDrafts: number;
  readonly bestScore: number;
  readonly trophiesCount: number;
}

interface DbDraftRecord {
  readonly id: string;
  readonly session_id: string;
  readonly magicien_slug: string | null;
  readonly player_name: string;
  readonly overall_score: number;
  readonly tier: string;
  readonly archetype: DeckArchetype;
  readonly radar: KiviatRadarScores;
  readonly macro_axes: {
    readonly power: number;
    readonly synergy: number;
    readonly consistency: number;
  };
  readonly draft_duration_seconds: number;
  readonly total_duration_seconds: number;
  readonly seed: number;
  readonly cube_key: string;
  readonly is_homologated: boolean;
  readonly maindeck_cards: readonly LeaderboardDeckCard[];
  readonly basic_lands: BasicLandCounts;
  readonly reports: {
    readonly walkthroughUrl: string;
    readonly boostersUrl: string;
  };
  readonly created_at: string;
}

interface DbMagicienProfile {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly nickname: string;
  readonly title: string;
  readonly quote: string;
  readonly level: string;
  readonly preferred_colors: readonly string[] | null;
  readonly avatar_url: string | null;
  readonly total_drafts: number | null;
  readonly best_score: number | null;
  readonly trophies_count: number | null;
}

const DEFAULT_MAGICIENS: readonly MagicienProfileDto[] = [
  {
    id: "nico",
    slug: "nico",
    name: "Nico",
    nickname: "Big Nixos",
    title: "Le Spike Impitoyable",
    quote: "Je prends ce qui gagne. Pas de sentiments en draft.",
    level: "elite",
    preferredColors: ["U", "B", "W"],
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Nico&backgroundColor=0e1115",
    totalDrafts: 0,
    bestScore: 0,
    trophiesCount: 0,
  },
  {
    id: "cedric",
    slug: "cedric",
    name: "Cédric",
    nickname: "Jakko",
    title: "Meilleur Joueur de sa Génération",
    quote: "Un play propre, de la value, et la courbe parfaite. La base du beau jeu.",
    level: "elite",
    preferredColors: ["U", "R", "W"],
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Cedric&backgroundColor=0e1115",
    totalDrafts: 0,
    bestScore: 0,
    trophiesCount: 0,
  },
  {
    id: "hugues",
    slug: "hugues",
    name: "Hugues",
    nickname: "Hugo",
    title: "Turbo Rien / Le Johnny Osé",
    quote: "J'ai vu une combo avec cette saga et ce caillou. Si ça passe, c'est du génie !",
    level: "ambitious",
    preferredColors: ["U", "R", "G"],
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Hugues&backgroundColor=0e1115",
    totalDrafts: 0,
    bestScore: 0,
    trophiesCount: 0,
  },
  {
    id: "remi",
    slug: "remi",
    name: "Rémi",
    nickname: "Le Rouxeleur",
    title: "Le Maître des Rouxelettes",
    quote: "Attends, je peux vraiment jouer ça ? C'est légal ? Bon, je prends quand même !",
    level: "medium",
    preferredColors: ["R", "G", "B"],
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Remi&backgroundColor=0e1115",
    totalDrafts: 0,
    bestScore: 0,
    trophiesCount: 0,
  },
  {
    id: "papayou",
    slug: "papayou",
    name: "Papayou",
    nickname: "LaPapapaie",
    title: "Le Roi des Légendaires",
    quote: "Une légendaire, c'est toujours plus fort. Regarde cette illustration !",
    level: "ambitious",
    preferredColors: ["W", "G", "B"],
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Papayou&backgroundColor=0e1115",
    totalDrafts: 0,
    bestScore: 0,
    trophiesCount: 0,
  },
  {
    id: "ivan",
    slug: "ivan",
    name: "Ivan",
    nickname: "Ivan le Grand",
    title: "Le Ramp Ultime & Gros Thons",
    quote: "Pourquoi payer 2 manas pour un 2/2 quand on peut poser un 8/8 piétinement tour 4 ?",
    level: "medium",
    preferredColors: ["G", "U", "R"],
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Ivan&backgroundColor=0e1115",
    totalDrafts: 0,
    bestScore: 0,
    trophiesCount: 0,
  },
  {
    id: "theo",
    slug: "theo",
    name: "Théo",
    nickname: "Théo Reanimator",
    title: "Le Maître du Cimetière",
    quote: "Le cimetière est ma deuxième main. La défausse n'est qu'un début.",
    level: "elite",
    preferredColors: ["B", "U", "R"],
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Theo&backgroundColor=0e1115",
    totalDrafts: 0,
    bestScore: 0,
    trophiesCount: 0,
  },
  {
    id: "titou",
    slug: "titou",
    name: "Tristan",
    nickname: "Titou",
    title: "L'Architecte du Cube & Maître Tribal",
    quote: "Chaque carte a son âme, chaque guilde a son histoire. Bienvenue dans mon cube.",
    level: "elite",
    preferredColors: ["W", "U", "B", "R", "G"],
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Titou&backgroundColor=0e1115",
    totalDrafts: 0,
    bestScore: 0,
    trophiesCount: 0,
  },
];

export async function getUnifiedLeaderboard(customPath?: string): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseClient();
  if (supabase && !customPath) {
    try {
      const response = await supabase
        .from("draft_records")
        .select("*")
        .order("overall_score", { ascending: false })
        .order("total_duration_seconds", { ascending: true })
        .limit(100);

      if (!response.error) {
        const rows = response.data as unknown as readonly DbDraftRecord[];
        if (rows.length > 0) {
          const mappedEntries: LeaderboardEntry[] = rows.map((row) => ({
            id: row.id,
            playerName: row.player_name,
            overallScore: row.overall_score,
            macroAxes: row.macro_axes,
            radar: row.radar,
            archetype: row.archetype,
            draftDurationSeconds: row.draft_duration_seconds,
            totalDurationSeconds: row.total_duration_seconds,
            seed: row.seed,
            cubeKey: row.cube_key,
            occurredAt: row.created_at,
            isHomologated: row.is_homologated,
            reports: row.reports,
            maindeckCards: row.maindeck_cards,
            basicLands: row.basic_lands,
          }));

          return rankLeaderboardEntries(mappedEntries);
        }
      }
    } catch (err) {
      console.warn("⚠️ [Storage] Échec lecture Supabase leaderboard, repli local :", err);
    }
  }

  // Repli local JSON
  return getLeaderboard(customPath);
}

export async function saveUnifiedLeaderboardEntry(
  entryData: Omit<LeaderboardEntry, "id" | "rank"> & {
    readonly magicienSlug?: string | undefined;
    readonly sessionId?: string | undefined;
  },
  customLeaderboardPath?: string,
): Promise<{
  readonly entry: LeaderboardEntry;
  readonly isNewHighScore: boolean;
}> {
  // 1. Toujours enregistrer en local pour garantir la résilience offline
  const localResult = await addLeaderboardEntry(entryData, customLeaderboardPath);

  // 2. Si Supabase est actif, sauvegarder dans le cloud PostgreSQL
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const scoreTier =
        entryData.overallScore >= 90
          ? "S"
          : entryData.overallScore >= 82
            ? "A"
            : entryData.overallScore >= 74
              ? "B"
              : entryData.overallScore >= 65
                ? "C"
                : "D";

      const dbRecord: Omit<DbDraftRecord, "created_at"> & { created_at: string } = {
        id: localResult.entry.id,
        session_id: entryData.sessionId ?? localResult.entry.id,
        magicien_slug: entryData.magicienSlug ?? null,
        player_name: entryData.playerName,
        overall_score: entryData.overallScore,
        tier: scoreTier,
        archetype: entryData.archetype,
        radar: entryData.radar,
        macro_axes: entryData.macroAxes,
        draft_duration_seconds: entryData.draftDurationSeconds,
        total_duration_seconds: entryData.totalDurationSeconds,
        seed: entryData.seed,
        cube_key: entryData.cubeKey,
        is_homologated: entryData.isHomologated,
        maindeck_cards: entryData.maindeckCards,
        basic_lands: entryData.basicLands,
        reports: entryData.reports,
        created_at: entryData.occurredAt,
      };

      const { error: insertError } = await supabase.from("draft_records").insert(dbRecord);
      if (insertError) {
        console.warn("⚠️ [Storage] Erreur insertion Supabase draft_records :", insertError);
      } else {
        console.log(
          `☁️ [Storage] Draft record sauvé sur Supabase (Score: ${String(entryData.overallScore)})`,
        );
      }

      // 3. Mettre à jour les stats du profil du Magicien s'il est lié
      if (entryData.magicienSlug) {
        const profileResponse = await supabase
          .from("magiciens_profiles")
          .select("total_drafts, best_score, trophies_count")
          .eq("slug", entryData.magicienSlug)
          .single();

        const profileData = profileResponse.data as unknown as {
          total_drafts?: number | null;
          best_score?: number | null;
          trophies_count?: number | null;
        } | null;

        if (profileData) {
          const newDrafts = (profileData.total_drafts ?? 0) + 1;
          const newBest = Math.max(profileData.best_score ?? 0, entryData.overallScore);
          const newTrophies =
            localResult.entry.rank === 1
              ? (profileData.trophies_count ?? 0) + 1
              : (profileData.trophies_count ?? 0);

          await supabase
            .from("magiciens_profiles")
            .update({
              total_drafts: newDrafts,
              best_score: newBest,
              trophies_count: newTrophies,
            })
            .eq("slug", entryData.magicienSlug);
        }
      }
    } catch (err) {
      console.warn("⚠️ [Storage] Échec synchronisation Supabase :", err);
    }
  }

  return localResult;
}

export async function getMagiciensProfilesWithStats(): Promise<MagicienProfileDto[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const response = await supabase
        .from("magiciens_profiles")
        .select("*")
        .order("best_score", { ascending: false });

      if (!response.error) {
        const rows = response.data as unknown as readonly DbMagicienProfile[];
        if (rows.length > 0) {
          return rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            nickname: row.nickname,
            title: row.title,
            quote: row.quote,
            level: row.level,
            preferredColors: row.preferred_colors ?? [],
            avatarUrl:
              row.avatar_url ??
              `https://api.dicebear.com/7.x/bottts/svg?seed=${row.name}&backgroundColor=0e1115`,
            totalDrafts: row.total_drafts ?? 0,
            bestScore: row.best_score ?? 0,
            trophiesCount: row.trophies_count ?? 0,
          }));
        }
      }
    } catch (err) {
      console.warn("⚠️ [Storage] Échec lecture profils Supabase :", err);
    }
  }

  // Calcul dynamique des statistiques depuis le leaderboard local
  const localEntries = await getLeaderboard();
  return DEFAULT_MAGICIENS.map((m) => {
    const playerEntries = localEntries.filter(
      (e) =>
        e.playerName.toLowerCase().includes(m.name.toLowerCase()) ||
        e.playerName.toLowerCase().includes(m.slug.toLowerCase()) ||
        e.playerName.toLowerCase().includes(m.nickname.toLowerCase()),
    );
    const total = playerEntries.length;
    const best = total > 0 ? Math.max(...playerEntries.map((e) => e.overallScore)) : 0;
    const trophies = playerEntries.filter((e) => e.rank === 1).length;

    return {
      ...m,
      totalDrafts: total,
      bestScore: best,
      trophiesCount: trophies,
    };
  }).sort((a, b) => b.bestScore - a.bestScore);
}

export async function getDeckShareData(idOrSessionId: string): Promise<LeaderboardEntry | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const response = await supabase
        .from("draft_records")
        .select("*")
        .or(`id.eq.${idOrSessionId},session_id.eq.${idOrSessionId}`)
        .maybeSingle();

      if (!response.error && response.data) {
        const data = response.data as unknown as DbDraftRecord;
        return {
          id: data.id,
          playerName: data.player_name,
          overallScore: data.overall_score,
          macroAxes: data.macro_axes,
          radar: data.radar,
          archetype: data.archetype,
          draftDurationSeconds: data.draft_duration_seconds,
          totalDurationSeconds: data.total_duration_seconds,
          seed: data.seed,
          cubeKey: data.cube_key,
          occurredAt: data.created_at,
          isHomologated: data.is_homologated,
          reports: data.reports,
          maindeckCards: data.maindeck_cards,
          basicLands: data.basic_lands,
        };
      }
    } catch (err) {
      console.warn("⚠️ [Storage] Échec récupération share deck Supabase :", err);
    }
  }

  // Repli local
  const entries = await getLeaderboard();
  return entries.find((e) => e.id === idOrSessionId) ?? null;
}
