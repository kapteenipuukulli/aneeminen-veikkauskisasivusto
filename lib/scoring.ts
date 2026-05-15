export type Score = {
  home_score: number | null;
  away_score: number | null;
};

export function scorePrediction(prediction?: Score | null, result?: Score | null) {
  if (!prediction || !result) return 0;
  const ph = prediction.home_score;
  const pa = prediction.away_score;
  const rh = result.home_score;
  const ra = result.away_score;

  if (ph === null || pa === null || rh === null || ra === null) return 0;
  if (ph === rh && pa === ra) return 6;

  let points = 0;
  if (Math.sign(ph - pa) === Math.sign(rh - ra)) points += 3;
  if (ph - pa === rh - ra) points += 2;
  if ((ph === rh && Math.abs(pa - ra) <= 1) || (pa === ra && Math.abs(ph - rh) <= 1)) points += 1;
  return points;
}

export function rankWithSharedPlaces<T extends { total_points: number }>(rows: T[]) {
  let lastPoints: number | null = null;
  let lastRank = 0;

  return rows.map((row, index) => {
    const rank = row.total_points === lastPoints ? lastRank : index + 1;
    lastPoints = row.total_points;
    lastRank = rank;
    return { ...row, rank };
  });
}
