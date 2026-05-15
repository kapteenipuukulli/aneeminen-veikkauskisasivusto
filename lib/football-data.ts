import { matches } from "@/data/world-cup-2026";

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam?: { name?: string; shortName?: string; tla?: string };
  awayTeam?: { name?: string; shortName?: string; tla?: string };
  score?: {
    fullTime?: {
      home: number | null;
      away: number | null;
    };
  };
};

export type ImportedResult = {
  providerId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  raw: FootballDataMatch;
};

const API_BASE = "https://api.football-data.org/v4";
const WORLD_CUP_CODE = "WC";

export async function fetchFootballDataResults() {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) return { results: [], rateLimit: null, message: "FOOTBALL_DATA_API_KEY is not configured." };

  const response = await fetch(`${API_BASE}/competitions/${WORLD_CUP_CODE}/matches`, {
    headers: {
      "X-Auth-Token": token
    },
    next: { revalidate: 300 }
  });

  const rateLimit = {
    limit: response.headers.get("x-requests-available-minute"),
    reset: response.headers.get("x-requestcounter-reset")
  };

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`football-data.org failed: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { matches?: FootballDataMatch[] };
  const finished = (payload.matches || []).filter((match) => match.status === "FINISHED");
  const imported = finished.map(toImportedResult).filter(Boolean) as ImportedResult[];
  return { results: imported, rateLimit, message: null };
}

function toImportedResult(match: FootballDataMatch): ImportedResult | null {
  const homeScore = match.score?.fullTime?.home;
  const awayScore = match.score?.fullTime?.away;
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return null;

  const local = findLocalMatch(match);
  if (!local) return null;

  return {
    providerId: String(match.id),
    matchId: local.id,
    homeScore,
    awayScore,
    raw: match
  };
}

function findLocalMatch(match: FootballDataMatch) {
  const providerTime = new Date(match.utcDate).getTime();
  return matches.find((local) => {
    const localTime = new Date(local.startsAtUtc).getTime();
    const timeClose = Math.abs(providerTime - localTime) <= 90 * 60 * 1000;
    if (!timeClose) return false;

    const providerHome = normalize(match.homeTeam?.name || match.homeTeam?.shortName || "");
    const providerAway = normalize(match.awayTeam?.name || match.awayTeam?.shortName || "");
    return normalize(local.home).includes(providerHome) || providerHome.includes(normalize(local.home))
      ? normalize(local.away).includes(providerAway) || providerAway.includes(normalize(local.away))
      : false;
  });
}

function normalize(value: string) {
  const aliases: Record<string, string> = {
    usa: "unitedstates",
    us: "unitedstates",
    unitedstatesofamerica: "unitedstates",
    korearepublic: "southkorea",
    republicofkorea: "southkorea",
    czechrepublic: "czechia",
    bosniaherzegovina: "bosniaandherzegovina",
    coteivoire: "ivorycoast",
    congodr: "drcongo",
    democraticrepublicofthecongo: "drcongo",
    curacao: "curacao",
    netherlands: "netherlands"
  };
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return aliases[normalized] || normalized;
}
