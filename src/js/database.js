/**
 * MAZAD — Football Auction Game Database (Mazad Hossam)
 * 2026/27 Season authentic player dataset.
 * Combines modular datasets for Egyptian Premier League, Premier League,
 * La Liga, Serie A, Bundesliga, Ligue 1, Saudi Pro League, and MLS.
 * Contains 500+ realistic players with accurate positions, ratings, and stats.
 */

import { EGYPTIAN_LEAGUE_PLAYERS } from "./data/egyptianLeague.js";
import { EUROPEAN_LEAGUES_PLAYERS } from "./data/europeanLeagues.js";
import { WORLD_LEAGUES_PLAYERS } from "./data/worldLeagues.js";
import { ADDITIONAL_PLAYERS } from "./data/additionalPlayers.js";

// Combine and deduplicate players by unique ID
const RAW_PLAYERS = [
  ...EGYPTIAN_LEAGUE_PLAYERS,
  ...EUROPEAN_LEAGUES_PLAYERS,
  ...WORLD_LEAGUES_PLAYERS,
  ...ADDITIONAL_PLAYERS
];

// Deduplication map ensuring unique IDs
const playerMap = new Map();
RAW_PLAYERS.forEach(player => {
  if (player && player.id) {
    // Normalize market value and value
    const val = Number(player.marketValue || player.value || Math.round(player.rating * 0.75));
    const rating = Number(player.rating) || 75;
    
    // Assign proper tier
    let tier = player.tier;
    if (!tier) {
      if (rating >= 92) tier = "Legendary / Superstar";
      else if (rating >= 88) tier = "World Class";
      else if (rating >= 84) tier = "Elite";
      else if (rating >= 80) tier = "Very Good";
      else if (rating >= 75) tier = "Good";
      else if (rating >= 70) tier = "Average";
      else tier = "Below Average";
    }

    const normalized = {
      id: String(player.id),
      name: String(player.name),
      club: String(player.club || "Free Agent"),
      league: String(player.league || "World League"),
      nation: String(player.nation || "Unknown"),
      position: String(player.position || "CM").toUpperCase(),
      rating: rating,
      tier: tier,
      pace: Number(player.pace !== undefined ? player.pace : rating),
      shooting: Number(player.shooting !== undefined ? player.shooting : rating),
      passing: Number(player.passing !== undefined ? player.passing : rating),
      dribbling: Number(player.dribbling !== undefined ? player.dribbling : rating),
      defending: Number(player.defending !== undefined ? player.defending : rating),
      physical: Number(player.physical !== undefined ? player.physical : rating),
      marketValue: val,
      value: val
    };

    playerMap.set(normalized.id, normalized);
  }
});

export const PLAYER_DATABASE = Array.from(playerMap.values());

export const LEAGUES = [
  "ALL LEAGUES",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Saudi Pro League",
  "MLS",
  "Egyptian Premier League & Cup"
];

export const PLAYER_TIERS = {
  LEGENDARY: "Legendary / Superstar",
  WORLD_CLASS: "World Class",
  ELITE: "Elite",
  VERY_GOOD: "Very Good",
  GOOD: "Good",
  AVERAGE: "Average",
  BELOW_AVERAGE: "Below Average",
  WEAK: "Weak"
};

/**
 * Filter players by slot position and league
 */
export function getPlayersByPosition(targetPosition, league = "ALL LEAGUES") {
  const normPos = (targetPosition || "").toUpperCase().trim();
  const normLeague = (league || "").toUpperCase().trim();

  // Strict position compatibility map — Strikers never on the wing, Wingers never at striker
  const compatMap = {
    "GK": ["GK"],
    "CB": ["CB", "SW"],
    "RB": ["RB", "RWB"],
    "LB": ["LB", "LWB"],
    "CDM": ["CDM"],
    "CM": ["CM", "CDM", "CAM"],
    "CAM": ["CAM", "CM"],
    "RW": ["RW", "RM"],
    "LW": ["LW", "LM"],
    "RM": ["RM", "RW"],
    "LM": ["LM", "LW"],
    "ST": ["ST", "CF"]
  };

  const allowedPositions = compatMap[normPos] || [normPos];

  return PLAYER_DATABASE.filter(player => {
    const posMatch = allowedPositions.includes(player.position) || player.position === normPos;
    if (!posMatch) return false;

    // Dedicated Egyptian Premier League mode: Returns the full domestic player pool
    const isEgyptianLeagueOrCup = normLeague.includes("EGYPT");
    if (isEgyptianLeagueOrCup) {
      return player.league === "Egyptian Premier League";
    }

    // Global "ALL LEAGUES" mode: Top world & European stars + global stars
    // Only 1-2 marquee Egyptian domestic stars (e.g. Zizo & Emam Ashour) distributed into ALL LEAGUES,
    // so Egyptian domestic players do not overpopulate the global international drafts.
    if (!normLeague || normLeague === "ALL LEAGUES" || normLeague === "ALL") {
      if (player.league === "Egyptian Premier League") {
        return player.id === "eg_zizo" || player.id === "eg_emam_ashour";
      }
      return true;
    }

    return player.league.toUpperCase().trim() === normLeague;
  });
}

/**
 * Retrieves a single player by ID
 */
export function getPlayerById(id) {
  return playerMap.get(id) || PLAYER_DATABASE.find(p => p.id === id) || null;
}

/**
 * Picks an exciting candidate for the auction round of target position
 */
export function getAuctionCandidate(targetPosition, league = "ALL LEAGUES", excludedIds = []) {
  const pool = getPlayersByPosition(targetPosition, league).filter(p => !excludedIds.includes(p.id));
  const candidatePool = pool.length ? pool : getPlayersByPosition(targetPosition, "ALL LEAGUES").filter(p => !excludedIds.includes(p.id));

  if (!candidatePool.length) {
    const allMatching = PLAYER_DATABASE.filter(p => p.position === targetPosition);
    return allMatching[Math.floor(Math.random() * allMatching.length)] || PLAYER_DATABASE[0];
  }

  // Weight towards higher rated exciting players for auction
  candidatePool.sort((a, b) => b.rating - a.rating);

  // Pick weighted towards top half
  const weights = candidatePool.map((p, idx) => Math.max(1, candidatePool.length - idx));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let randomWeight = Math.random() * totalWeight;

  for (let i = 0; i < candidatePool.length; i++) {
    if (randomWeight < weights[i]) {
      return candidatePool[i];
    }
    randomWeight -= weights[i];
  }

  return candidatePool[Math.floor(Math.random() * candidatePool.length)];
}

/**
 * Picks a random free player for the player who lost the auction (Lucky Draw system)
 * Provides genuine stochastic balance:
 * - 25% Good (Rating 82+)
 * - 50% Mid (Rating 74-81)
 * - 25% Bad (Rating 55-73)
 */
export function getRandomFreePlayer(targetPosition, league = "ALL LEAGUES", excludedIds = []) {
  if (typeof targetPosition === "object" && targetPosition !== null) {
    const arg2 = league;
    const arg3 = excludedIds;
    targetPosition = targetPosition.position || "CM";
    if (typeof arg2 === "string") league = arg2;
    if (Array.isArray(arg3)) excludedIds = arg3;
  }

  // Look in the position pool across all available players (including full database if needed for depth)
  const pool = getPlayersByPosition(targetPosition, league).filter(p => !excludedIds.includes(p.id));
  const candidatePool = pool.length ? pool : getPlayersByPosition(targetPosition, "ALL LEAGUES").filter(p => !excludedIds.includes(p.id));

  if (!candidatePool.length) {
    const allMatching = PLAYER_DATABASE.filter(p => p.position === targetPosition);
    const fallback = allMatching[Math.floor(Math.random() * allMatching.length)] || PLAYER_DATABASE[0];
    return { ...fallback, player: fallback, luckText: "AVERAGE LUCK ⚖️", luckClass: "luck-average" };
  }

  // Determine rating thresholds dynamically based on pool's quality
  const ratings = candidatePool.map(p => p.rating || 75);
  const maxRating = Math.max(...ratings);
  const goodThreshold = maxRating >= 85 ? 82 : (maxRating >= 79 ? 78 : 74);
  const midThreshold = goodThreshold === 82 ? 74 : (goodThreshold === 78 ? 71 : 65);

  // Segregate candidate pool into Good (top 25%), Mid (50%), and Bad (25%)
  const goodPool = candidatePool.filter(p => p.rating >= goodThreshold);
  const midPool = candidatePool.filter(p => p.rating >= midThreshold && p.rating < goodThreshold);
  const badPool = candidatePool.filter(p => p.rating < midThreshold);

  const roll = Math.random() * 100;
  let chosenPlayer = null;
  let luckText = "AVERAGE LUCK ⚖️";
  let luckClass = "luck-average";

  if (roll < 25) {
    // GOOD DRAW (25%)
    const source = goodPool.length ? goodPool : candidatePool;
    chosenPlayer = source[Math.floor(Math.random() * source.length)];
  } else if (roll < 75) {
    // MID DRAW (50%)
    const source = midPool.length ? midPool : (candidatePool.length ? candidatePool : goodPool);
    chosenPlayer = source[Math.floor(Math.random() * source.length)];
  } else {
    // BAD DRAW (25%)
    const source = badPool.length ? badPool : (midPool.length ? midPool : candidatePool);
    chosenPlayer = source[Math.floor(Math.random() * source.length)];
  }

  if (!chosenPlayer) {
    chosenPlayer = candidatePool[Math.floor(Math.random() * candidatePool.length)] || PLAYER_DATABASE[0];
  }

  // Calculate appropriate luck badge based on the player's rating
  if (chosenPlayer.rating >= 90) {
    luckText = "INSANE LUCK! 🌟";
    luckClass = "luck-insane";
  } else if (chosenPlayer.rating >= 84) {
    luckText = "GREAT LUCK! 🔥";
    luckClass = "luck-great";
  } else if (chosenPlayer.rating >= 80) {
    luckText = "GOOD LUCK! ✨";
    luckClass = "luck-good";
  } else if (chosenPlayer.rating >= 75) {
    luckText = "DECENT DRAW 👍";
    luckClass = "luck-average";
  } else if (chosenPlayer.rating >= 70) {
    luckText = "AVERAGE / MID ⚖️";
    luckClass = "luck-average";
  } else if (chosenPlayer.rating >= 65) {
    luckText = "BAD LUCK 📉";
    luckClass = "luck-bad";
  } else {
    luckText = "TERRIBLE LUCK! 💀";
    luckClass = "luck-terrible";
  }

  return { ...chosenPlayer, player: chosenPlayer, luckText, luckClass };
}

/**
 * Calculates weighted performance of a player based on position
 */
export function calculateWeightedPerformance(player, slotPosition = null) {
  if (!player) return 70;
  const pos = slotPosition || player.position;
  const rating = Number(player.rating) || 75;
  const pace = Number(player.pace !== undefined ? player.pace : rating);
  const shooting = Number(player.shooting !== undefined ? player.shooting : rating);
  const passing = Number(player.passing !== undefined ? player.passing : rating);
  const dribbling = Number(player.dribbling !== undefined ? player.dribbling : rating);
  const defending = Number(player.defending !== undefined ? player.defending : rating);
  const physical = Number(player.physical !== undefined ? player.physical : rating);

  let score = 0;

  switch (pos) {
    case "GK":
      score = rating * 0.45 + defending * 0.35 + physical * 0.15 + passing * 0.05;
      break;
    case "CB":
      score = rating * 0.35 + defending * 0.35 + physical * 0.20 + pace * 0.10;
      break;
    case "RB":
    case "LB":
      score = rating * 0.30 + defending * 0.25 + pace * 0.25 + physical * 0.10 + passing * 0.10;
      break;
    case "CDM":
      score = rating * 0.35 + defending * 0.30 + physical * 0.20 + passing * 0.15;
      break;
    case "CM":
      score = rating * 0.30 + passing * 0.25 + dribbling * 0.20 + physical * 0.15 + shooting * 0.10;
      break;
    case "CAM":
      score = rating * 0.30 + passing * 0.25 + dribbling * 0.25 + shooting * 0.15 + pace * 0.05;
      break;
    case "RW":
    case "LW":
    case "RM":
    case "LM":
      score = rating * 0.30 + pace * 0.30 + dribbling * 0.20 + shooting * 0.15 + passing * 0.05;
      break;
    case "ST":
      score = rating * 0.35 + shooting * 0.35 + pace * 0.15 + physical * 0.10 + dribbling * 0.05;
      break;
    default:
      score = rating;
  }

  return Math.round(score);
}

/**
 * Returns statistics and counts per league
 */
export function getLeagueSummary() {
  const summary = {};
  PLAYER_DATABASE.forEach(p => {
    summary[p.league] = (summary[p.league] || 0) + 1;
  });
  return summary;
}
