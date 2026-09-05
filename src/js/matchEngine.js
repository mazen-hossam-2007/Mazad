/**
 * MAZAD — Realistic Match Simulation Engine & Football Physics
 * Calculates authentic team sector ratings (ATT, MID, DEF, GK), chemistry links,
 * tactical instructions, dynamic xG (Expected Goals), VAR interventions,
 * yellow/red cards, woodwork strikes, stoppage-time drama, and penalty shootouts.
 */

import { calculateWeightedPerformance } from "./database.js";

export const TACTICAL_STYLES = {
  BALANCED: {
    id: "BALANCED",
    name: "Balanced",
    icon: "⚖️",
    attMod: 1.0,
    defMod: 1.0,
    possMod: 0,
    foulMod: 1.0,
    desc: "Controlled tempo, structured defense, patient build-up."
  },
  COUNTER: {
    id: "COUNTER",
    name: "Counter-Attack",
    icon: "🛡️",
    attMod: 0.88,
    defMod: 1.25,
    possMod: -8,
    foulMod: 0.85,
    counterBonus: 1.35,
    desc: "Deep defensive block; strikes with lightning pace on transitions."
  },
  ATTACK: {
    id: "ATTACK",
    name: "All-Out Attack",
    icon: "⚔️",
    attMod: 1.32,
    defMod: 0.78,
    possMod: +8,
    foulMod: 1.15,
    desc: "Overloads the final third; high shot volume but counter-vulnerable."
  },
  PRESS: {
    id: "PRESS",
    name: "High Press",
    icon: "🔥",
    attMod: 1.18,
    defMod: 0.92,
    possMod: +4,
    foulMod: 1.45,
    desc: "Suffocating pressure in opponent's half; forces high turnovers."
  }
};

export function calculateTeamStats(squad, remainingBudget = 0) {
  if (!squad || squad.length === 0) {
    return {
      overall: 50,
      attack: 50,
      midfield: 50,
      defense: 50,
      goalkeeping: 50,
      chemistry: 50,
      averageRating: 50,
      finishing: 50,
      playmaking: 50,
      tackling: 50,
      shotStopping: 50,
      remainingBudget
    };
  }

  const gks = squad.filter(s => s.player && s.position === "GK");
  const defs = squad.filter(s => s.player && ["CB", "RB", "LB"].includes(s.position));
  const mids = squad.filter(s => s.player && ["CDM", "CM", "CAM", "RM", "LM"].includes(s.position));
  const atts = squad.filter(s => s.player && ["ST", "RW", "LW"].includes(s.position));

  const gkScore = gks.length ? Math.round(gks.reduce((acc, s) => acc + calculateWeightedPerformance(s.player, "GK"), 0) / gks.length) : 65;
  const defScore = defs.length ? Math.round(defs.reduce((acc, s) => acc + calculateWeightedPerformance(s.player, s.position), 0) / defs.length) : 65;
  const midScore = mids.length ? Math.round(mids.reduce((acc, s) => acc + calculateWeightedPerformance(s.player, s.position), 0) / mids.length) : 65;
  const attScore = atts.length ? Math.round(atts.reduce((acc, s) => acc + calculateWeightedPerformance(s.player, s.position), 0) / atts.length) : 65;

  const validPlayers = squad.filter(s => s && s.player).map(s => s.player);
  const avgRating = validPlayers.length
    ? Math.round(validPlayers.reduce((acc, p) => acc + (Number(p.rating) || 75), 0) / validPlayers.length)
    : 65;

  // Chemistry calculation based on nation/club synergy and balanced distribution
  let chemistryBonus = 70; // baseline
  const nations = {};
  const clubs = {};
  validPlayers.forEach(p => {
    if (p && p.nation) nations[p.nation] = (nations[p.nation] || 0) + 1;
    if (p && p.club) clubs[p.club] = (clubs[p.club] || 0) + 1;
  });

  Object.values(nations).forEach(count => {
    if (count >= 2) chemistryBonus += count * 3;
  });
  Object.values(clubs).forEach(count => {
    if (count >= 2) chemistryBonus += count * 4;
  });

  const chemistry = Math.min(100, Math.max(60, chemistryBonus));

  // Specialized attributes
  const finishing = atts.length ? Math.round(atts.reduce((acc, s) => acc + (Number(s.player.shooting) || 70), 0) / atts.length) : 68;
  const playmaking = mids.length ? Math.round(mids.reduce((acc, s) => acc + ((Number(s.player.passing) || 70) + (Number(s.player.dribbling) || 70)) / 2, 0) / mids.length) : 68;
  const tackling = defs.length ? Math.round(defs.reduce((acc, s) => acc + ((Number(s.player.defending) || 70) + (Number(s.player.physical) || 70)) / 2, 0) / defs.length) : 68;
  const shotStopping = gks.length ? Math.round(gks.reduce((acc, s) => acc + (Number(s.player.rating) || 75), 0) / gks.length) : 68;

  // Overall composite
  const overall = Math.round(attScore * 0.3 + midScore * 0.3 + defScore * 0.25 + gkScore * 0.15);

  return {
    overall,
    attack: attScore,
    midfield: midScore,
    defense: defScore,
    goalkeeping: gkScore,
    chemistry,
    averageRating: avgRating,
    finishing,
    playmaking,
    tackling,
    shotStopping,
    remainingBudget
  };
}

/**
 * Generates an authentic full match simulation with dynamic football probabilities,
 * realistic xG increments, tactical adjustments, VAR checks, woodwork, cards, and shootouts.
 */
export function generateMatchSimulation(team1, team2, options = {}) {
  const t1TacticKey = options.t1Tactic || "BALANCED";
  const t2TacticKey = options.t2Tactic || "BALANCED";
  const t1Tactic = TACTICAL_STYLES[t1TacticKey] || TACTICAL_STYLES.BALANCED;
  const t2Tactic = TACTICAL_STYLES[t2TacticKey] || TACTICAL_STYLES.BALANCED;

  const t1Stats = calculateTeamStats(team1.squad, team1.budget);
  const t2Stats = calculateTeamStats(team2.squad, team2.budget);

  // Extract squad rosters
  const t1Players = team1.squad.map(s => s.player).filter(Boolean);
  const t2Players = team2.squad.map(s => s.player).filter(Boolean);

  const t1Attackers = t1Players.filter(p => ["ST", "RW", "LW", "CAM"].includes(p.position));
  const t2Attackers = t2Players.filter(p => ["ST", "RW", "LW", "CAM"].includes(p.position));
  const t1Midfielders = t1Players.filter(p => ["CM", "CDM", "RM", "LM", "CAM"].includes(p.position));
  const t2Midfielders = t2Players.filter(p => ["CM", "CDM", "RM", "LM", "CAM"].includes(p.position));
  const t1Defenders = t1Players.filter(p => ["CB", "RB", "LB", "CDM"].includes(p.position));
  const t2Defenders = t2Players.filter(p => ["CB", "RB", "LB", "CDM"].includes(p.position));
  const t1GK = t1Players.find(p => p.position === "GK") || { name: "Goalkeeper", rating: 75, id: "gk1" };
  const t2GK = t2Players.find(p => p.position === "GK") || { name: "Goalkeeper", rating: 75, id: "gk2" };

  const pickRandom = (arr, fallback = { name: "Player", id: "f1" }) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : fallback);

  // Player match performance trackers for Player of the Match (MVP)
  const playerStats = {};
  [...t1Players, ...t2Players].forEach(p => {
    playerStats[p.id] = {
      player: p,
      goals: 0,
      assists: 0,
      saves: 0,
      tackles: 0,
      cards: 0, // 1 yellow, 2 red
      rating: +(6.0 + (p.rating - 75) * 0.035 + (Math.random() * 0.5 - 0.2)).toFixed(1)
    };
  });

  // Base Possession & Dynamic Flow with high matchday randomness
  const midDiff = (t1Stats.midfield * (t1Stats.chemistry / 100)) - (t2Stats.midfield * (t2Stats.chemistry / 100));
  const tacticalPossDiff = t1Tactic.possMod - t2Tactic.possMod;
  // Natural matchday form swing (+/- 8%) so any team can dominate on the day
  const matchdayFormFactor = (Math.random() * 16 - 8);
  const baseT1Possession = Math.max(40, Math.min(60, Math.round(50 + midDiff * 0.25 + tacticalPossDiff * 0.5 + matchdayFormFactor)));
  const baseT2Possession = 100 - baseT1Possession;

  // Stoppage times
  const addedFirstHalf = Math.floor(Math.random() * 3) + 1; // 1-3 mins
  const addedSecondHalf = Math.floor(Math.random() * 4) + 2; // 2-5 mins

  // Match timeline events
  const events = [];
  let t1Goals = 0;
  let t2Goals = 0;
  let t1XG = 0;
  let t2XG = 0;
  let t1Shots = 0;
  let t2Shots = 0;
  let t1ShotsOnTarget = 0;
  let t2ShotsOnTarget = 0;
  let t1BigChances = 0;
  let t2BigChances = 0;
  let t1Saves = 0;
  let t2Saves = 0;
  let t1Fouls = 0;
  let t2Fouls = 0;
  let t1Yellows = 0;
  let t2Yellows = 0;
  let t1RedCard = false;
  let t2RedCard = false;
  let t1Corners = 0;
  let t2Corners = 0;
  let t1Offsides = 0;
  let t2Offsides = 0;

  // Running Momentum (-100 = P2 dominant, +100 = P1 dominant)
  let momentum = (Math.random() * 20 - 10);

  // Kickoff Event
  events.push({
    minute: 1,
    displayMinute: "1'",
    type: "kickoff",
    team: 0,
    momentum: Math.round(momentum),
    zone: "midfield",
    text: `Referee sounds the whistle to start the Super Cup match! ${team1.name} kicks off.`
  });

  // Candidate action minute schedule across 90 minutes + stoppage (24 dynamic phases)
  const matchPhases = [
    4, 8, 12, 16, 21, 25, 29, 34, 38, 42,
    45 + 1, // stoppage 1st half
    49, 53, 58, 62, 66, 71, 75, 79, 83, 87, 89,
    90 + 1, 90 + 2 // stoppage 2nd half
  ];

  // Dynamic simulation loop per phase with authentic high-variance stochastic football physics
  matchPhases.forEach((min) => {
    const isFirstHalfAdded = min > 45 && min < 48;
    const isSecondHalfAdded = min > 90;
    const displayMin = isFirstHalfAdded
      ? `45+${min - 45}'`
      : isSecondHalfAdded
      ? `90+${min - 90}'`
      : `${min}'`;

    // Momentum decay towards center (pendulum physics)
    momentum *= 0.55;

    // Trailing team urgency (comeback push factor)
    const scoreDiff = t1Goals - t2Goals; // positive = P1 leading, negative = P2 leading
    const trailingUrgency = scoreDiff * -0.06; // trailing team gets extra attacking push

    // Random phase variation (+/- 20% randomness per attack phase)
    const phaseNoise = (Math.random() * 0.40 - 0.20);
    const overallDiff = (t1Stats.overall - t2Stats.overall) * 0.004;

    // Attacking probability centered at 50% with realistic variance
    const p1AttackingProbability = Math.max(0.28, Math.min(0.72, 0.50 + overallDiff + trailingUrgency + phaseNoise + (t1RedCard ? -0.12 : 0) + (t2RedCard ? 0.12 : 0)));
    const attackingTeam = Math.random() < p1AttackingProbability ? 1 : 2;

    const team = attackingTeam === 1 ? team1 : team2;
    const oppTeam = attackingTeam === 1 ? team2 : team1;
    const isP1 = attackingTeam === 1;

    const attPool = isP1 ? t1Attackers : t2Attackers;
    const allPool = isP1 ? t1Players : t2Players;
    const oppDefs = isP1 ? t2Defenders : t1Defenders;
    const oppAll = isP1 ? t2Players : t1Players;
    const oppGK = isP1 ? t2GK : t1GK;

    const attacker = pickRandom(attPool, pickRandom(allPool));
    const assister = pickRandom(isP1 ? t1Midfielders : t2Midfielders, pickRandom(allPool));
    const defender = pickRandom(oppDefs, pickRandom(oppAll));

    // Shift momentum towards attacking team
    momentum += isP1 ? 14 : -14;
    momentum = Math.max(-95, Math.min(95, momentum));

    // Calculate action probabilities
    const roll = Math.random();

    // 1. DANGEROUS FOUL & CARD PROBABILITY (Fouls, Yellows, Red Card drama)
    const foulChance = 0.12 * (isP1 ? t2Tactic.foulMod : t1Tactic.foulMod);
    if (roll < foulChance) {
      if (isP1) t2Fouls++; else t1Fouls++;

      const isCard = Math.random() < 0.32;
      const fouledPlayer = attacker;
      const offendingPlayer = defender;

      if (isCard) {
        const perf = playerStats[offendingPlayer.id];
        if (perf) perf.cards++;

        if (perf && perf.cards >= 2) {
          // RED CARD (SECOND YELLOW)!
          if (isP1) { t2RedCard = true; } else { t1RedCard = true; }
          momentum += isP1 ? 25 : -25;
          events.push({
            minute: min,
            displayMinute: displayMin,
            type: "red_card",
            team: isP1 ? 2 : 1,
            momentum: Math.round(momentum),
            zone: isP1 ? "t2_third" : "t1_third",
            text: `🟥 RED CARD! Second yellow shown to ${offendingPlayer.name}! ${oppTeam.name} are reduced to 10 men!`
          });
        } else {
          // YELLOW CARD
          if (isP1) t2Yellows++; else t1Yellows++;
          events.push({
            minute: min,
            displayMinute: displayMin,
            type: "yellow_card",
            team: isP1 ? 2 : 1,
            momentum: Math.round(momentum),
            zone: isP1 ? "t2_third" : "t1_third",
            text: `🟨 Yellow Card shown to ${offendingPlayer.name} after a reckless late tackle on ${fouledPlayer.name}.`
          });
        }
      } else {
        events.push({
          minute: min,
          displayMinute: displayMin,
          type: "foul",
          team: isP1 ? 2 : 1,
          momentum: Math.round(momentum),
          zone: "midfield",
          text: `⚠️ Free kick awarded to ${team.name} following a challenge in midfield.`
        });
      }
      return;
    }

    // 2. CORNER KICK OR SET PIECE
    if (roll < foulChance + 0.15) {
      if (isP1) t1Corners++; else t2Corners++;
      momentum += isP1 ? 5 : -5;
      events.push({
        minute: min,
        displayMinute: displayMin,
        type: "corner",
        team: isP1 ? 1 : 2,
        momentum: Math.round(momentum),
        zone: isP1 ? "t2_third" : "t1_third",
        text: `🚩 Corner kick for ${team.name}. ${assister.name} steps up to whip a dangerous inswinging cross into the box.`
      });
      return;
    }

    // 3. OFFSIDE OR DISALLOWED GOAL (VAR DRAMA)
    if (roll < foulChance + 0.20) {
      if (isP1) t1Offsides++; else t2Offsides++;
      const isVARGoalDrama = Math.random() < 0.25;
      if (isVARGoalDrama) {
        events.push({
          minute: min,
          displayMinute: displayMin,
          type: "var_check",
          team: isP1 ? 1 : 2,
          momentum: Math.round(momentum),
          zone: isP1 ? "t2_third" : "t1_third",
          text: `📺 VAR REVIEW! ${attacker.name} put the ball in the net, but the referee draws lines... OFFSIDE by centimeters! Goal disallowed!`
        });
      } else {
        events.push({
          minute: min,
          displayMinute: displayMin,
          type: "offside",
          team: isP1 ? 1 : 2,
          momentum: Math.round(momentum),
          zone: isP1 ? "t2_third" : "t1_third",
          text: `🚩 Offside flag raised! ${attacker.name} timed his run just a fraction too early.`
        });
      }
      return;
    }

    // 4. PENALTY KICK DRAMA (VAR Handed Penalty or Box Tumble)
    const penaltyRoll = Math.random();
    if (penaltyRoll < 0.045) {
      const penaltyXG = 0.79;
      if (isP1) { t1XG = +(t1XG + penaltyXG).toFixed(2); t1Shots++; t1BigChances++; }
      else { t2XG = +(t2XG + penaltyXG).toFixed(2); t2Shots++; t2BigChances++; }

      const penScored = Math.random() < 0.76;
      if (penScored) {
        if (isP1) {
          t1Goals++;
          t1ShotsOnTarget++;
        } else {
          t2Goals++;
          t2ShotsOnTarget++;
        }
        if (playerStats[attacker.id]) {
          playerStats[attacker.id].goals++;
          playerStats[attacker.id].rating = +(playerStats[attacker.id].rating + 1.2).toFixed(1);
        }
        momentum += isP1 ? 20 : -20;
        events.push({
          minute: min,
          displayMinute: displayMin,
          type: "goal",
          penalty: true,
          team: isP1 ? 1 : 2,
          t1Score: t1Goals,
          t2Score: t2Goals,
          momentum: Math.round(momentum),
          zone: isP1 ? "t2_third" : "t1_third",
          xg: penaltyXG,
          text: `⚽ GOAL! PENALTY SCORED! 🎯 ${attacker.name} sends ${oppGK.name} the wrong way with ice in his veins!`
        });
      } else {
        // Penalty saved or hit post
        if (isP1) t2Saves++; else t1Saves++;
        if (playerStats[oppGK.id]) {
          playerStats[oppGK.id].saves++;
          playerStats[oppGK.id].rating = +(playerStats[oppGK.id].rating + 1.1).toFixed(1);
        }
        events.push({
          minute: min,
          displayMinute: displayMin,
          type: "penalty_save",
          team: isP1 ? 2 : 1,
          momentum: Math.round(momentum),
          zone: isP1 ? "t2_third" : "t1_third",
          xg: penaltyXG,
          text: `🧤 PENALTY SAVED! ${oppGK.name} leaps heroically to deny ${attacker.name} from the spot! Incredible stop!`
        });
      }
      return;
    }

    // 5. OPEN PLAY SHOT / GOAL ATTEMPT (Calculated with authentic xG & dynamic conversion)
    const shooterRating = Number(attacker.shooting) || 75;
    const gkRating = Number(oppGK.rating) || 75;
    const isBigChance = Math.random() < 0.32;

    // Realistic chance xG
    let chanceXG = isBigChance
      ? +(0.35 + Math.random() * 0.32).toFixed(2)
      : +(0.08 + Math.random() * 0.18).toFixed(2);

    if (isP1) {
      t1Shots++;
      t1XG = +(t1XG + chanceXG).toFixed(2);
      if (isBigChance) t1BigChances++;
    } else {
      t2Shots++;
      t2XG = +(t2XG + chanceXG).toFixed(2);
      if (isBigChance) t2BigChances++;
    }

    // Dynamic conversion probability with fair balance and high excitement
    const finishSkill = (shooterRating / 80);
    const saveSkill = (gkRating / 80);
    const goalProbability = Math.max(0.12, Math.min(0.68, (chanceXG * finishSkill * 0.95) / (saveSkill * 0.95)));

    const shotOutcome = Math.random();

    if (shotOutcome < goalProbability) {
      // ⚽ GOAL SCORED!
      if (isP1) {
        t1Goals++;
        t1ShotsOnTarget++;
        momentum = Math.min(90, momentum + 18);
      } else {
        t2Goals++;
        t2ShotsOnTarget++;
        momentum = Math.max(-90, momentum - 18);
      }

      if (playerStats[attacker.id]) {
        playerStats[attacker.id].goals++;
        playerStats[attacker.id].rating = +(playerStats[attacker.id].rating + 1.2).toFixed(1);
      }
      if (assister && assister.id !== attacker.id && playerStats[assister.id]) {
        playerStats[assister.id].assists++;
        playerStats[assister.id].rating = +(playerStats[assister.id].rating + 0.6).toFixed(1);
      }

      const goalFlavors = [
        `⚽ GOAL! Spectacular strike from ${attacker.name}! Curls it into the top corner beyond ${oppGK.name}! (xG: ${chanceXG})`,
        `⚽ GOAL! ${attacker.name} pounces on a loose ball inside the box and hammers it into the net! (xG: ${chanceXG})`,
        `⚽ GOAL! Swift attack orchestrated by ${assister.name}, slotted coolly past the keeper by ${attacker.name}! (xG: ${chanceXG})`,
        `⚽ GOAL! Towering header from ${attacker.name} off an inch-perfect cross! Unstoppable finish! (xG: ${chanceXG})`
      ];

      events.push({
        minute: min,
        displayMinute: displayMin,
        type: "goal",
        team: isP1 ? 1 : 2,
        scorer: attacker.name,
        assister: assister && assister.id !== attacker.id ? assister.name : null,
        t1Score: t1Goals,
        t2Score: t2Goals,
        momentum: Math.round(momentum),
        zone: isP1 ? "t2_third" : "t1_third",
        xg: chanceXG,
        text: goalFlavors[Math.floor(Math.random() * goalFlavors.length)]
      });
    } else if (shotOutcome < goalProbability + 0.08) {
      // 💥 WOODWORK / CROSSBAR / POST
      if (isP1) {
        t1ShotsOnTarget++;
      } else {
        t2ShotsOnTarget++;
      }
      events.push({
        minute: min,
        displayMinute: displayMin,
        type: "post",
        team: isP1 ? 1 : 2,
        momentum: Math.round(momentum),
        zone: isP1 ? "t2_third" : "t1_third",
        xg: chanceXG,
        text: `💥 OFF THE WOODWORK! ${attacker.name} rattles the post with a venomous strike! So close to a goal!`
      });
    } else if (shotOutcome < goalProbability + 0.38) {
      // 🧤 GOALKEEPER SAVE
      if (isP1) {
        t1ShotsOnTarget++;
        t2Saves++;
      } else {
        t2ShotsOnTarget++;
        t1Saves++;
      }
      if (playerStats[oppGK.id]) {
        playerStats[oppGK.id].saves++;
        playerStats[oppGK.id].rating = +(playerStats[oppGK.id].rating + 0.4).toFixed(1);
      }
      events.push({
        minute: min,
        displayMinute: displayMin,
        type: "save",
        team: isP1 ? 2 : 1, // defensive triumph
        momentum: Math.round(momentum),
        zone: isP1 ? "t2_third" : "t1_third",
        xg: chanceXG,
        text: `🧤 WHAT A SAVE! ${oppGK.name} reacts with sharp reflexes to deny ${attacker.name}'s goalbound shot!`
      });
    } else {
      // 💨 SHOT WIDE OR BLOCKED
      const isDefBlock = Math.random() < 0.45;
      if (isDefBlock) {
        if (playerStats[defender.id]) {
          playerStats[defender.id].tackles++;
          playerStats[defender.id].rating = +(playerStats[defender.id].rating + 0.25).toFixed(1);
        }
        events.push({
          minute: min,
          displayMinute: displayMin,
          type: "block",
          team: isP1 ? 2 : 1,
          momentum: Math.round(momentum),
          zone: isP1 ? "t2_third" : "t1_third",
          text: `🛡️ Vital defensive block! ${defender.name} throws his body in front of ${attacker.name}'s shot!`
        });
      } else {
        events.push({
          minute: min,
          displayMinute: displayMin,
          type: "chance",
          team: isP1 ? 1 : 2,
          momentum: Math.round(momentum),
          zone: isP1 ? "t2_third" : "t1_third",
          text: `⚡ Big opportunity! ${attacker.name} finds space in the penalty box, but drags the effort just wide.`
        });
      }
    }
  });

  // Half-time event
  events.push({
    minute: 45,
    displayMinute: "45'",
    type: "halftime",
    team: 0,
    momentum: Math.round(momentum),
    zone: "midfield",
    text: `⏸️ HALF TIME! The referee blows for the interval. Current score: ${team1.name} ${t1Goals} - ${t2Goals} ${team2.name}.`
  });

  // Stoppage time announcement events
  events.push({
    minute: 45,
    displayMinute: "45'",
    type: "stoppage_info",
    team: 0,
    momentum: Math.round(momentum),
    zone: "midfield",
    text: `⏱️ Fourth official indicates a minimum of +${addedFirstHalf} minutes of added stoppage time.`
  });

  events.push({
    minute: 90,
    displayMinute: "90'",
    type: "stoppage_info",
    team: 0,
    momentum: Math.round(momentum),
    zone: "midfield",
    text: `⏱️ Fourth official signals +${addedSecondHalf} minutes of stoppage time to decide the outcome!`
  });

  // Full-time whistle event
  events.push({
    minute: 90 + addedSecondHalf,
    displayMinute: `${90 + addedSecondHalf}'`,
    type: "fulltime",
    team: 0,
    momentum: Math.round(momentum),
    zone: "midfield",
    text: `🏁 FULL TIME! The referee blows the final whistle! Final score: ${team1.name} ${t1Goals} - ${t2Goals} ${team2.name}.`
  });

  // Sort events chronologically
  events.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    if (a.type === "stoppage_info") return -1;
    return 0;
  });

  // Dynamic possession calculation based on actual shots and momentum
  const finalT1Possession = Math.max(35, Math.min(65, Math.round(baseT1Possession + (t1Shots - t2Shots) * 0.8)));
  const finalT2Possession = 100 - finalT1Possession;

  // Pass accuracy
  const t1PassAcc = Math.min(94, Math.max(76, Math.round(t1Stats.playmaking * 0.95 + (Math.random() * 4 - 2))));
  const t2PassAcc = Math.min(94, Math.max(76, Math.round(t2Stats.playmaking * 0.95 + (Math.random() * 4 - 2))));

  const stats = {
    team1: {
      name: team1.name,
      goals: t1Goals,
      xg: +t1XG.toFixed(2),
      possession: finalT1Possession,
      shots: t1Shots,
      shotsOnTarget: t1ShotsOnTarget,
      bigChances: t1BigChances,
      saves: t1Saves,
      corners: t1Corners,
      fouls: t1Fouls,
      yellowCards: t1Yellows,
      redCard: t1RedCard,
      passAccuracy: t1PassAcc
    },
    team2: {
      name: team2.name,
      goals: t2Goals,
      xg: +t2XG.toFixed(2),
      possession: finalT2Possession,
      shots: t2Shots,
      shotsOnTarget: t2ShotsOnTarget,
      bigChances: t2BigChances,
      saves: t2Saves,
      corners: t2Corners,
      fouls: t2Fouls,
      yellowCards: t2Yellows,
      redCard: t2RedCard,
      passAccuracy: t2PassAcc
    }
  };

  // Determine MVP (Player of the Match)
  const allPerformers = Object.values(playerStats);
  allPerformers.sort((a, b) => {
    const scoreA = a.rating + a.goals * 1.6 + a.assists * 1.0 + a.saves * 0.6 + a.tackles * 0.3 - (a.cards * 1.5);
    const scoreB = b.rating + b.goals * 1.6 + b.assists * 1.0 + b.saves * 0.6 + b.tackles * 0.3 - (b.cards * 1.5);
    return scoreB - scoreA;
  });

  const topPerformer = allPerformers[0] || {
    player: t1Players[0] || { name: "Star Performer", position: "FWD", club: "Champions" },
    rating: 8.8,
    goals: t1Goals ? 1 : 0,
    assists: 0,
    saves: 0
  };

  // Regular time winner
  let winner = null;
  if (t1Goals > t2Goals) {
    winner = 1;
  } else if (t2Goals > t1Goals) {
    winner = 2;
  } else {
    winner = "draw";
  }

  // If match ends in a draw, prepare authentic Super Cup Penalty Shootout
  let shootout = null;
  if (winner === "draw") {
    shootout = simulatePenaltyShootout(team1, team2);
  }

  return {
    events,
    stats,
    t1Goals,
    t2Goals,
    winner,
    shootout,
    tactics: {
      team1: t1Tactic,
      team2: t2Tactic
    },
    mvp: {
      player: topPerformer.player,
      rating: Math.min(9.9, Math.max(7.5, topPerformer.rating)),
      goals: topPerformer.goals,
      assists: topPerformer.assists,
      saves: topPerformer.saves
    }
  };
}

/**
 * Simulates a dramatic 5-round Super Cup Penalty Shootout (+ sudden death)
 */
export function simulatePenaltyShootout(team1, team2) {
  const t1Players = [...(team1.squad || [])].map(s => s.player).filter(Boolean);
  const t2Players = [...(team2.squad || [])].map(s => s.player).filter(Boolean);

  // Sort best kickers (shooting & rating)
  const sortKickers = (list) => [...list].sort((a, b) => ((Number(b.shooting) || 70) + (Number(b.rating) || 75)) - ((Number(a.shooting) || 70) + (Number(a.rating) || 75)));

  const t1Takers = sortKickers(t1Players);
  const t2Takers = sortKickers(t2Players);

  const t1GK = t1Players.find(p => p.position === "GK") || { name: "Goalkeeper", rating: 75 };
  const t2GK = t2Players.find(p => p.position === "GK") || { name: "Goalkeeper", rating: 75 };

  const t1Kicks = [];
  const t2Kicks = [];
  let t1Score = 0;
  let t2Score = 0;

  // Simulate 5 standard rounds
  for (let r = 0; r < 5; r++) {
    const taker1 = t1Takers[r % t1Takers.length] || { name: `Taker ${r + 1}`, shooting: 75 };
    const taker2 = t2Takers[r % t2Takers.length] || { name: `Taker ${r + 1}`, shooting: 75 };

    // Kick 1 (Player 1 penalty)
    const p1Bonus = (Number(taker1.shooting || 75) - 75) * 0.003 + (Math.random() * 0.1 - 0.05);
    const p1Scored = Math.random() < Math.max(0.65, Math.min(0.88, 0.76 + p1Bonus));
    t1Kicks.push({
      round: r + 1,
      taker: taker1.name,
      scored: p1Scored,
      icon: p1Scored ? "⚽" : "❌"
    });
    if (p1Scored) t1Score++;

    // Kick 2 (Player 2 penalty)
    const p2Bonus = (Number(taker2.shooting || 75) - 75) * 0.003 + (Math.random() * 0.1 - 0.05);
    const p2Scored = Math.random() < Math.max(0.65, Math.min(0.88, 0.76 + p2Bonus));
    t2Kicks.push({
      round: r + 1,
      taker: taker2.name,
      scored: p2Scored,
      icon: p2Scored ? "⚽" : "❌"
    });
    if (p2Scored) t2Score++;
  }

  // Sudden death if tied after 5 rounds
  let roundNum = 6;
  while (t1Score === t2Score && roundNum <= 10) {
    const taker1 = t1Takers[roundNum % t1Takers.length] || { name: `Taker ${roundNum}`, shooting: 72 };
    const taker2 = t2Takers[roundNum % t2Takers.length] || { name: `Taker ${roundNum}`, shooting: 72 };

    const p1Scored = Math.random() < 0.72;
    t1Kicks.push({
      round: roundNum,
      taker: taker1.name,
      scored: p1Scored,
      icon: p1Scored ? "⚽" : "❌",
      suddenDeath: true
    });
    if (p1Scored) t1Score++;

    const p2Scored = Math.random() < 0.72;
    t2Kicks.push({
      round: roundNum,
      taker: taker2.name,
      scored: p2Scored,
      icon: p2Scored ? "⚽" : "❌",
      suddenDeath: true
    });
    if (p2Scored) t2Score++;

    roundNum++;
  }

  // If still tied after round 10, break tie with clean 50/50 coin flip
  if (t1Score === t2Score) {
    if (Math.random() < 0.5) {
      t1Score++;
      t1Kicks[t1Kicks.length - 1].scored = true;
      t1Kicks[t1Kicks.length - 1].icon = "⚽";
    } else {
      t2Score++;
      t2Kicks[t2Kicks.length - 1].scored = true;
      t2Kicks[t2Kicks.length - 1].icon = "⚽";
    }
  }

  const shootoutWinner = t1Score > t2Score ? 1 : 2;

  return {
    needed: true,
    t1Score,
    t2Score,
    t1Kicks,
    t2Kicks,
    winner: shootoutWinner,
    summary: `${t1Score} - ${t2Score} on penalties`
  };
}
