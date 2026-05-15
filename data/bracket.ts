export type BracketMatch = {
  matchId: string;
  homeSlot: string;
  awaySlot: string;
  winnerSlot?: string;
  loserSlot?: string;
};

export const groupSlots = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "D1",
  "D2",
  "E1",
  "E2",
  "F1",
  "F2",
  "G1",
  "G2",
  "H1",
  "H2",
  "I1",
  "I2",
  "J1",
  "J2",
  "K1",
  "K2",
  "L1",
  "L2",
  "ABCDF3",
  "CDFGH3",
  "CEFHI3",
  "EHIJK3",
  "AEHIJ3",
  "BEFIJ3",
  "EFGIJ3",
  "DEIJL3"
];

export const bracketMatches: BracketMatch[] = [
  { matchId: "m073", homeSlot: "A2", awaySlot: "B2", winnerSlot: "W73" },
  { matchId: "m074", homeSlot: "C1", awaySlot: "F2", winnerSlot: "W74" },
  { matchId: "m075", homeSlot: "E1", awaySlot: "ABCDF3", winnerSlot: "W75" },
  { matchId: "m076", homeSlot: "F1", awaySlot: "C2", winnerSlot: "W76" },
  { matchId: "m077", homeSlot: "E2", awaySlot: "I2", winnerSlot: "W77" },
  { matchId: "m078", homeSlot: "I1", awaySlot: "CDFGH3", winnerSlot: "W78" },
  { matchId: "m079", homeSlot: "A1", awaySlot: "CEFHI3", winnerSlot: "W79" },
  { matchId: "m080", homeSlot: "L1", awaySlot: "EHIJK3", winnerSlot: "W80" },
  { matchId: "m081", homeSlot: "G1", awaySlot: "AEHIJ3", winnerSlot: "W81" },
  { matchId: "m082", homeSlot: "D1", awaySlot: "BEFIJ3", winnerSlot: "W82" },
  { matchId: "m083", homeSlot: "H1", awaySlot: "J2", winnerSlot: "W83" },
  { matchId: "m084", homeSlot: "K2", awaySlot: "L2", winnerSlot: "W84" },
  { matchId: "m085", homeSlot: "B1", awaySlot: "EFGIJ3", winnerSlot: "W85" },
  { matchId: "m086", homeSlot: "D2", awaySlot: "G2", winnerSlot: "W86" },
  { matchId: "m087", homeSlot: "J1", awaySlot: "H2", winnerSlot: "W87" },
  { matchId: "m088", homeSlot: "K1", awaySlot: "DEIJL3", winnerSlot: "W88" },
  { matchId: "m089", homeSlot: "W73", awaySlot: "W74", winnerSlot: "W89" },
  { matchId: "m090", homeSlot: "W75", awaySlot: "W76", winnerSlot: "W90" },
  { matchId: "m091", homeSlot: "W77", awaySlot: "W78", winnerSlot: "W91" },
  { matchId: "m092", homeSlot: "W79", awaySlot: "W80", winnerSlot: "W92" },
  { matchId: "m093", homeSlot: "W81", awaySlot: "W82", winnerSlot: "W93" },
  { matchId: "m094", homeSlot: "W83", awaySlot: "W84", winnerSlot: "W94" },
  { matchId: "m095", homeSlot: "W85", awaySlot: "W86", winnerSlot: "W95" },
  { matchId: "m096", homeSlot: "W87", awaySlot: "W88", winnerSlot: "W96" },
  { matchId: "m097", homeSlot: "W89", awaySlot: "W90", winnerSlot: "W97" },
  { matchId: "m098", homeSlot: "W91", awaySlot: "W92", winnerSlot: "W98" },
  { matchId: "m099", homeSlot: "W93", awaySlot: "W94", winnerSlot: "W99" },
  { matchId: "m100", homeSlot: "W95", awaySlot: "W96", winnerSlot: "W100" },
  { matchId: "m101", homeSlot: "W97", awaySlot: "W98", winnerSlot: "W101", loserSlot: "L101" },
  { matchId: "m102", homeSlot: "W99", awaySlot: "W100", winnerSlot: "W102", loserSlot: "L102" },
  { matchId: "m103", homeSlot: "L101", awaySlot: "L102" },
  { matchId: "m104", homeSlot: "W101", awaySlot: "W102" }
];

export const bracketMatchById = new Map(bracketMatches.map((match) => [match.matchId, match]));

export function isSlotCode(value: string) {
  return groupSlots.includes(value) || /^W\d+$/.test(value) || /^L\d+$/.test(value);
}
