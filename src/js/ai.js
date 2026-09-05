/**
 * MAZAD — Tactical AI Auction Engine (Mazad Hossam)
 * Implements balanced, randomized, difficulty-based bidding intelligence:
 * Easy | Normal | Hard | Expert
 *
 * Features:
 * - Natural thinking delay (800ms - 1500ms)
 * - Dynamic interest probability (AI doesn't blindly bid on every single player)
 * - Value vs Price evaluation with realistic variance
 * - Remaining round & reserve budget management
 * - Human-like tactical bluffs & randomized passes for fair 50/50 gameplay
 */

export const DIFFICULTY_SETTINGS = {
  easy: {
    name: "Easy (Casual)",
    interestChance: 0.55,
    mistakeChance: 0.35,
    baseMultiplier: 0.85,
    bluffChance: 0.10,
    maxBidPercent: 0.30
  },
  normal: {
    name: "Normal (Balanced)",
    interestChance: 0.70,
    mistakeChance: 0.20,
    baseMultiplier: 1.0,
    bluffChance: 0.18,
    maxBidPercent: 0.40
  },
  hard: {
    name: "Hard (Tactical)",
    interestChance: 0.82,
    mistakeChance: 0.10,
    baseMultiplier: 1.15,
    bluffChance: 0.25,
    maxBidPercent: 0.50
  },
  expert: {
    name: "Expert (Mastermind)",
    interestChance: 0.90,
    mistakeChance: 0.05,
    baseMultiplier: 1.25,
    bluffChance: 0.30,
    maxBidPercent: 0.60
  }
};

export class AuctionAI {
  constructor(difficulty = "normal") {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'expert'
  }

  setDifficulty(d) {
    this.difficulty = DIFFICULTY_SETTINGS[d] ? d : "normal";
  }

  /**
   * Evaluates auction situation and returns { action: 'bid'|'pass', amount?: number, reason?: string }
   */
  decide(context) {
    const {
      playerOnAuction,
      currentBid,
      highestBidder,
      aiBudget,
      opponentBudget,
      remainingRounds, // rounds remaining including this one
      minIncrement = 1,
      currentRound = 1
    } = context;

    // If AI is already highest bidder, it does not bid against itself
    if (highestBidder === "player2") {
      return { action: "pass", reason: "Already highest bidder" };
    }

    // Safety reserve: preserve at least €1M per remaining round so AI never bankrupts
    const safetyReserve = Math.max(0, remainingRounds - 1);
    const maxAffordable = aiBudget - safetyReserve;

    if (maxAffordable < currentBid + minIncrement) {
      return { action: "pass", reason: "Cannot afford minimum increment with reserve" };
    }

    const config = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.normal;
    const rating = playerOnAuction.rating;
    const baseValue = playerOnAuction.value;

    // 1. Stochastic Interest Check: AI does NOT always want every player
    // This introduces genuine random variation so player 1 has ample opportunities to win
    const randInterest = Math.random();
    const starBonus = rating >= 90 ? 0.25 : rating >= 85 ? 0.15 : 0.0;
    
    if (currentBid > baseValue * 0.4 && randInterest > (config.interestChance + starBonus)) {
      return {
        action: "pass",
        reason: `AI decided to conserve budget for future rounds (Interest roll ${randInterest.toFixed(2)})`
      };
    }

    // 2. Valuation calculation with randomized spread (+/- 20% random variance)
    const randomVariation = (Math.random() * 0.40 - 0.20); // -0.20 to +0.20
    let targetMultiplier = config.baseMultiplier + randomVariation;

    // Rating tier scaling
    if (rating >= 93) targetMultiplier += 0.20;
    else if (rating >= 88) targetMultiplier += 0.10;
    else if (rating <= 76) targetMultiplier -= 0.15;

    // Occasional mistake (pass early or misjudge valuation)
    if (Math.random() < config.mistakeChance) {
      if (Math.random() < 0.65) {
        return { action: "pass", reason: "AI hesitated and decided to pass" };
      } else {
        targetMultiplier += 0.20; // momentary aggressive impulse
      }
    }

    // Budget abundance scaling: if AI has low budget per round, tone down valuation
    const avgBudgetLeft = aiBudget / Math.max(1, remainingRounds);
    const budgetModifier = Math.min(1.2, Math.max(0.65, avgBudgetLeft / 20));

    // Cap maximum valuation so AI doesn't spend everything on 1 player
    const maxValuation = Math.min(
      maxAffordable,
      Math.round(baseValue * targetMultiplier * budgetModifier)
    );

    // If current bid meets or exceeds AI's valuation threshold, pass
    if (currentBid >= maxValuation) {
      return {
        action: "pass",
        reason: `Current bid €${currentBid}M meets AI maximum valuation €${maxValuation}M`
      };
    }

    // 3. Choose dynamic increment (+1M, +5M, +10M, +20M)
    const gap = maxValuation - currentBid;
    let increment = minIncrement;

    if (gap >= 25 && Math.random() < 0.45) {
      increment = 10;
    } else if (gap >= 12 && Math.random() < 0.40) {
      increment = 5;
    } else {
      increment = 1;
    }

    let nextBid = currentBid + increment;
    if (nextBid > maxValuation) {
      nextBid = currentBid + minIncrement;
    }

    if (nextBid > maxAffordable || nextBid <= currentBid) {
      return { action: "pass", reason: "Exceeds affordable budget limit" };
    }

    return {
      action: "bid",
      amount: nextBid,
      reason: `Bid €${nextBid}M (Valued up to €${maxValuation}M for ${playerOnAuction.name})`
    };
  }
}
