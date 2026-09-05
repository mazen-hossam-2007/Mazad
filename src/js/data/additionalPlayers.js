/**
 * Additional Depth Players across all leagues & tiers
 * Contains GOOD (82-88), MID (74-81), and BAD (55-73) players across every position
 * to ensure realistic stochastic Lucky Draw results (Good, Mid, Bad) and accurate slot assignments.
 */

export const ADDITIONAL_PLAYERS = [
  // ==================== GOOD PLAYERS (82 - 88) ====================
  { id: "epl_trippier", name: "Kieran Trippier", club: "Newcastle United", league: "Premier League", position: "RB", rating: 83, tier: "Very Good", pace: 76, shooting: 68, passing: 86, dribbling: 78, defending: 81, physical: 74, marketValue: 20, value: 20 },
  { id: "epl_burn", name: "Dan Burn", club: "Newcastle United", league: "Premier League", position: "LB", rating: 81, tier: "Good", pace: 68, shooting: 45, passing: 72, dribbling: 66, defending: 82, physical: 89, marketValue: 15, value: 15 },
  { id: "epl_botman", name: "Sven Botman", club: "Newcastle United", league: "Premier League", position: "CB", rating: 84, tier: "Good", pace: 72, shooting: 40, passing: 74, dribbling: 68, defending: 86, physical: 86, marketValue: 35, value: 35 },
  { id: "epl_pope", name: "Nick Pope", club: "Newcastle United", league: "Premier League", position: "GK", rating: 84, tier: "Good", pace: 50, shooting: 18, passing: 68, dribbling: 45, defending: 85, physical: 82, marketValue: 22, value: 22 },
  { id: "epl_bowen", name: "Jarrod Bowen", club: "West Ham United", league: "Premier League", position: "RW", rating: 85, tier: "Elite", pace: 87, shooting: 85, passing: 81, dribbling: 85, defending: 55, physical: 78, marketValue: 45, value: 45 },
  { id: "epl_kudus", name: "Mohammed Kudus", club: "West Ham United", league: "Premier League", position: "RW", rating: 85, tier: "Elite", pace: 90, shooting: 83, passing: 80, dribbling: 89, defending: 60, physical: 84, marketValue: 55, value: 55 },
  { id: "epl_paqueta", name: "Lucas Paqueta", club: "West Ham United", league: "Premier League", position: "CAM", rating: 85, tier: "Elite", pace: 78, shooting: 82, passing: 88, dribbling: 89, defending: 72, physical: 80, marketValue: 50, value: 50 },
  { id: "epl_areola", name: "Alphonse Areola", club: "West Ham United", league: "Premier League", position: "GK", rating: 82, tier: "Very Good", pace: 52, shooting: 20, passing: 72, dribbling: 48, defending: 83, physical: 79, marketValue: 16, value: 16 },
  { id: "epl_mbeumo", name: "Bryan Mbeumo", club: "Brentford", league: "Premier League", position: "RW", rating: 83, tier: "Very Good", pace: 88, shooting: 84, passing: 79, dribbling: 84, defending: 48, physical: 78, marketValue: 35, value: 35 },
  { id: "epl_wissa", name: "Yoane Wissa", club: "Brentford", league: "Premier League", position: "ST", rating: 81, tier: "Good", pace: 87, shooting: 82, passing: 74, dribbling: 82, defending: 42, physical: 75, marketValue: 22, value: 22 },
  { id: "epl_cunha", name: "Matheus Cunha", club: "Wolverhampton", league: "Premier League", position: "ST", rating: 84, tier: "Good", pace: 86, shooting: 84, passing: 81, dribbling: 86, defending: 48, physical: 80, marketValue: 40, value: 40 },
  { id: "epl_ait_nouri", name: "Rayan Ait-Nouri", club: "Wolverhampton", league: "Premier League", position: "LB", rating: 83, tier: "Very Good", pace: 87, shooting: 70, passing: 81, dribbling: 86, defending: 79, physical: 74, marketValue: 35, value: 35 },
  { id: "epl_semenyo", name: "Antoine Semenyo", club: "Bournemouth", league: "Premier League", position: "RW", rating: 82, tier: "Very Good", pace: 89, shooting: 82, passing: 76, dribbling: 84, defending: 48, physical: 82, marketValue: 25, value: 25 },
  { id: "epl_wood", name: "Chris Wood", club: "Nottingham Forest", league: "Premier League", position: "ST", rating: 82, tier: "Very Good", pace: 70, shooting: 84, passing: 68, dribbling: 72, defending: 45, physical: 88, marketValue: 18, value: 18 },
  { id: "epl_gibbs_white", name: "Morgan Gibbs-White", club: "Nottingham Forest", league: "Premier League", position: "CAM", rating: 84, tier: "Good", pace: 83, shooting: 81, passing: 86, dribbling: 86, defending: 62, physical: 77, marketValue: 40, value: 40 },
  { id: "epl_murillo", name: "Murillo", club: "Nottingham Forest", league: "Premier League", position: "CB", rating: 83, tier: "Very Good", pace: 78, shooting: 45, passing: 76, dribbling: 74, defending: 84, physical: 86, marketValue: 35, value: 35 },
  { id: "epl_pickford", name: "Jordan Pickford", club: "Everton", league: "Premier League", position: "GK", rating: 84, tier: "Good", pace: 54, shooting: 20, passing: 84, dribbling: 50, defending: 85, physical: 79, marketValue: 22, value: 22 },
  { id: "epl_eze", name: "Eberechi Eze", club: "Crystal Palace", league: "Premier League", position: "CAM", rating: 85, tier: "Elite", pace: 85, shooting: 84, passing: 86, dribbling: 89, defending: 55, physical: 74, marketValue: 55, value: 55 },
  { id: "epl_mateta", name: "Jean-Philippe Mateta", club: "Crystal Palace", league: "Premier League", position: "ST", rating: 83, tier: "Very Good", pace: 81, shooting: 85, passing: 70, dribbling: 78, defending: 44, physical: 87, marketValue: 30, value: 30 },
  { id: "epl_guehi", name: "Marc Guehi", club: "Crystal Palace", league: "Premier League", position: "CB", rating: 84, tier: "Good", pace: 79, shooting: 40, passing: 76, dribbling: 72, defending: 86, physical: 84, marketValue: 45, value: 45 },
  { id: "epl_smith_rowe", name: "Emile Smith Rowe", club: "Fulham", league: "Premier League", position: "CAM", rating: 82, tier: "Very Good", pace: 82, shooting: 80, passing: 83, dribbling: 85, defending: 52, physical: 72, marketValue: 30, value: 30 },
  { id: "epl_robinson", name: "Antonee Robinson", club: "Fulham", league: "Premier League", position: "LB", rating: 83, tier: "Very Good", pace: 92, shooting: 58, passing: 78, dribbling: 80, defending: 80, physical: 81, marketValue: 30, value: 30 },
  { id: "epl_leno", name: "Bernd Leno", club: "Fulham", league: "Premier League", position: "GK", rating: 83, tier: "Very Good", pace: 52, shooting: 20, passing: 76, dribbling: 48, defending: 84, physical: 79, marketValue: 18, value: 18 },

  // ==================== MID PLAYERS (74 - 80) ====================
  // MID ST
  { id: "mid_welbeck", name: "Danny Welbeck", club: "Brighton", league: "Premier League", position: "ST", rating: 78, tier: "Average", pace: 78, shooting: 78, passing: 74, dribbling: 79, defending: 45, physical: 77, marketValue: 8, value: 8 },
  { id: "mid_calvert_lewin", name: "Dominic Calvert-Lewin", club: "Everton", league: "Premier League", position: "ST", rating: 79, tier: "Average", pace: 77, shooting: 78, passing: 66, dribbling: 74, defending: 44, physical: 82, marketValue: 12, value: 12 },
  { id: "mid_maupay", name: "Neal Maupay", club: "Marseille", league: "Ligue 1", position: "ST", rating: 76, tier: "Average", pace: 76, shooting: 77, passing: 68, dribbling: 76, defending: 45, physical: 74, marketValue: 7, value: 7 },
  { id: "mid_borja_iglesias", name: "Borja Iglesias", club: "Celta Vigo", league: "La Liga", position: "ST", rating: 77, tier: "Average", pace: 72, shooting: 78, passing: 68, dribbling: 73, defending: 40, physical: 80, marketValue: 8, value: 8 },
  { id: "mid_duvan_zapata", name: "Duvan Zapata", club: "Torino", league: "Serie A", position: "ST", rating: 79, tier: "Average", pace: 74, shooting: 80, passing: 68, dribbling: 76, defending: 42, physical: 86, marketValue: 9, value: 9 },
  { id: "mid_beier", name: "Maximilian Beier", club: "Borussia Dortmund", league: "Bundesliga", position: "ST", rating: 79, tier: "Average", pace: 89, shooting: 78, passing: 70, dribbling: 78, defending: 42, physical: 73, marketValue: 16, value: 16 },

  // MID WINGERS (RW / LW)
  { id: "mid_elanga", name: "Anthony Elanga", club: "Nottingham Forest", league: "Premier League", position: "RW", rating: 78, tier: "Average", pace: 93, shooting: 74, passing: 73, dribbling: 79, defending: 44, physical: 68, marketValue: 12, value: 12 },
  { id: "mid_adama_traore", name: "Adama Traore", club: "Fulham", league: "Premier League", position: "RW", rating: 77, tier: "Average", pace: 95, shooting: 66, passing: 70, dribbling: 86, defending: 42, physical: 88, marketValue: 9, value: 9 },
  { id: "mid_iwobi", name: "Alex Iwobi", club: "Fulham", league: "Premier League", position: "LW", rating: 78, tier: "Average", pace: 80, shooting: 74, passing: 78, dribbling: 82, defending: 55, physical: 75, marketValue: 11, value: 11 },
  { id: "mid_mcneil", name: "Dwight McNeil", club: "Everton", league: "Premier League", position: "LW", rating: 79, tier: "Average", pace: 78, shooting: 78, passing: 80, dribbling: 81, defending: 62, physical: 74, marketValue: 14, value: 14 },
  { id: "mid_bryan_gil", name: "Bryan Gil", club: "Girona", league: "La Liga", position: "LW", rating: 78, tier: "Average", pace: 84, shooting: 72, passing: 76, dribbling: 84, defending: 48, physical: 60, marketValue: 10, value: 10 },
  { id: "mid_tsygankov", name: "Viktor Tsygankov", club: "Girona", league: "La Liga", position: "RW", rating: 80, tier: "Good", pace: 82, shooting: 79, passing: 80, dribbling: 81, defending: 48, physical: 68, marketValue: 15, value: 15 },
  { id: "mid_politano", name: "Matteo Politano", club: "Napoli", league: "Serie A", position: "RW", rating: 80, tier: "Good", pace: 82, shooting: 79, passing: 80, dribbling: 84, defending: 52, physical: 66, marketValue: 12, value: 12 },
  { id: "mid_boga", name: "Jeremie Boga", club: "Nice", league: "Ligue 1", position: "LW", rating: 78, tier: "Average", pace: 87, shooting: 74, passing: 74, dribbling: 86, defending: 40, physical: 66, marketValue: 10, value: 10 },

  // MID MIDFIELDERS (CM / CAM / CDM)
  { id: "mid_soucek", name: "Tomas Soucek", club: "West Ham United", league: "Premier League", position: "CM", rating: 79, tier: "Average", pace: 64, shooting: 77, passing: 74, dribbling: 72, defending: 81, physical: 87, marketValue: 10, value: 10 },
  { id: "mid_mcginn", name: "John McGinn", club: "Aston Villa", league: "Premier League", position: "CM", rating: 80, tier: "Good", pace: 74, shooting: 76, passing: 80, dribbling: 80, defending: 77, physical: 84, marketValue: 15, value: 15 },
  { id: "mid_lerma", name: "Jefferson Lerma", club: "Crystal Palace", league: "Premier League", position: "CDM", rating: 78, tier: "Average", pace: 72, shooting: 68, passing: 74, dribbling: 72, defending: 81, physical: 84, marketValue: 9, value: 9 },
  { id: "mid_norgaard", name: "Christian Norgaard", club: "Brentford", league: "Premier League", position: "CDM", rating: 79, tier: "Average", pace: 65, shooting: 65, passing: 78, dribbling: 74, defending: 82, physical: 81, marketValue: 10, value: 10 },
  { id: "mid_pereyra", name: "Roberto Pereyra", club: "Udinese", league: "Serie A", position: "CAM", rating: 78, tier: "Average", pace: 76, shooting: 75, passing: 79, dribbling: 81, defending: 62, physical: 72, marketValue: 6, value: 6 },
  { id: "mid_kamada", name: "Daichi Kamada", club: "Crystal Palace", league: "Premier League", position: "CAM", rating: 79, tier: "Average", pace: 75, shooting: 77, passing: 81, dribbling: 82, defending: 62, physical: 70, marketValue: 12, value: 12 },

  // MID DEFENDERS (CB / RB / LB)
  { id: "mid_tarkowski", name: "James Tarkowski", club: "Everton", league: "Premier League", position: "CB", rating: 80, tier: "Good", pace: 62, shooting: 45, passing: 66, dribbling: 62, defending: 83, physical: 87, marketValue: 10, value: 10 },
  { id: "mid_dunk", name: "Lewis Dunk", club: "Brighton", league: "Premier League", position: "CB", rating: 80, tier: "Good", pace: 60, shooting: 48, passing: 76, dribbling: 66, defending: 82, physical: 84, marketValue: 9, value: 9 },
  { id: "mid_coufal", name: "Vladimir Coufal", club: "West Ham United", league: "Premier League", position: "RB", rating: 78, tier: "Average", pace: 77, shooting: 54, passing: 75, dribbling: 72, defending: 78, physical: 79, marketValue: 6, value: 6 },
  { id: "mid_castagne", name: "Timothy Castagne", club: "Fulham", league: "Premier League", position: "RB", rating: 78, tier: "Average", pace: 79, shooting: 62, passing: 74, dribbling: 75, defending: 77, physical: 76, marketValue: 8, value: 8 },
  { id: "mid_digne", name: "Lucas Digne", club: "Aston Villa", league: "Premier League", position: "LB", rating: 80, tier: "Good", pace: 78, shooting: 68, passing: 82, dribbling: 78, defending: 77, physical: 76, marketValue: 10, value: 10 },
  { id: "mid_mykolenko", name: "Vitaliy Mykolenko", club: "Everton", league: "Premier League", position: "LB", rating: 78, tier: "Average", pace: 80, shooting: 58, passing: 72, dribbling: 73, defending: 79, physical: 78, marketValue: 9, value: 9 },

  // MID GOALKEEPERS (GK)
  { id: "mid_sa", name: "Jose Sa", club: "Wolverhampton", league: "Premier League", position: "GK", rating: 79, tier: "Average", pace: 50, shooting: 18, passing: 72, dribbling: 46, defending: 80, physical: 78, marketValue: 8, value: 8 },
  { id: "mid_flekken", name: "Mark Flekken", club: "Brentford", league: "Premier League", position: "GK", rating: 80, tier: "Good", pace: 48, shooting: 20, passing: 76, dribbling: 48, defending: 81, physical: 77, marketValue: 9, value: 9 },
  { id: "mid_guaita", name: "Vicente Guaita", club: "Celta Vigo", league: "La Liga", position: "GK", rating: 78, tier: "Average", pace: 46, shooting: 18, passing: 70, dribbling: 44, defending: 79, physical: 75, marketValue: 4, value: 4 },
  { id: "mid_montipo", name: "Lorenzo Montipo", club: "Verona", league: "Serie A", position: "GK", rating: 78, tier: "Average", pace: 48, shooting: 18, passing: 68, dribbling: 44, defending: 80, physical: 78, marketValue: 5, value: 5 },

  // ==================== BAD / WEAK PLAYERS (55 - 73) ====================
  // (Provides true suspense, blunder comedy & realistic lucky draw risk!)
  // BAD ST
  { id: "bad_brewster", name: "Rhian Brewster", club: "Sheffield United", league: "Premier League", position: "ST", rating: 67, tier: "Below Average", pace: 75, shooting: 66, passing: 58, dribbling: 68, defending: 32, physical: 65, marketValue: 2, value: 2 },
  { id: "bad_carroll", name: "Andy Carroll", club: "Bordeaux", league: "Ligue 1", position: "ST", rating: 68, tier: "Below Average", pace: 45, shooting: 72, passing: 56, dribbling: 58, defending: 44, physical: 84, marketValue: 1, value: 1 },
  { id: "bad_ali_dia", name: "Ali Dia (Legend)", club: "Free Agent", league: "Premier League", position: "ST", rating: 55, tier: "Weak", pace: 58, shooting: 48, passing: 44, dribbling: 50, defending: 25, physical: 52, marketValue: 1, value: 1 },
  { id: "bad_dennis", name: "Emmanuel Dennis", club: "Nottingham Forest", league: "Premier League", position: "ST", rating: 72, tier: "Below Average", pace: 83, shooting: 70, passing: 64, dribbling: 73, defending: 35, physical: 68, marketValue: 4, value: 4 },
  { id: "bad_mariano", name: "Mariano Diaz", club: "Free Agent", league: "La Liga", position: "ST", rating: 71, tier: "Below Average", pace: 74, shooting: 72, passing: 58, dribbling: 68, defending: 38, physical: 74, marketValue: 3, value: 3 },

  // BAD WINGERS (RW / LW)
  { id: "bad_antony_meme", name: "Antony (Spin Master)", club: "Manchester United", league: "Premier League", position: "RW", rating: 72, tier: "Below Average", pace: 78, shooting: 68, passing: 68, dribbling: 79, defending: 45, physical: 64, marketValue: 5, value: 5 },
  { id: "bad_bebe", name: "Tiago Bebe", club: "Racing Ferrol", league: "La Liga", position: "LW", rating: 68, tier: "Below Average", pace: 76, shooting: 72, passing: 60, dribbling: 69, defending: 36, physical: 76, marketValue: 2, value: 2 },
  { id: "bad_dan_james", name: "Daniel James", club: "Leeds United", league: "Premier League", position: "RW", rating: 73, tier: "Below Average", pace: 94, shooting: 66, passing: 65, dribbling: 72, defending: 48, physical: 62, marketValue: 5, value: 5 },
  { id: "bad_samu_castillejo", name: "Samu Castillejo", club: "Free Agent", league: "La Liga", position: "LW", rating: 71, tier: "Below Average", pace: 74, shooting: 67, passing: 70, dribbling: 74, defending: 40, physical: 56, marketValue: 2, value: 2 },

  // BAD MIDFIELDERS (CM / CAM / CDM)
  { id: "bad_drinkwater", name: "Danny Drinkwater", club: "Retired Legends", league: "Premier League", position: "CM", rating: 67, tier: "Below Average", pace: 50, shooting: 62, passing: 68, dribbling: 64, defending: 65, physical: 68, marketValue: 1, value: 1 },
  { id: "bad_dier", name: "Eric Dier", club: "Bayern Munich", league: "Bundesliga", position: "CDM", rating: 73, tier: "Below Average", pace: 52, shooting: 60, passing: 72, dribbling: 64, defending: 75, physical: 78, marketValue: 4, value: 4 },
  { id: "bad_shelvey", name: "Jonjo Shelvey", club: "Eyupspor", league: "Premier League", position: "CM", rating: 71, tier: "Below Average", pace: 54, shooting: 72, passing: 76, dribbling: 68, defending: 64, physical: 74, marketValue: 2, value: 2 },
  { id: "bad_lingard", name: "Jesse Lingard", club: "FC Seoul", league: "Premier League", position: "CAM", rating: 72, tier: "Below Average", pace: 74, shooting: 70, passing: 71, dribbling: 74, defending: 50, physical: 62, marketValue: 3, value: 3 },
  { id: "bad_bakayoko", name: "Tiemoue Bakayoko", club: "PAOK", league: "Serie A", position: "CDM", rating: 70, tier: "Below Average", pace: 60, shooting: 58, passing: 66, dribbling: 68, defending: 72, physical: 80, marketValue: 2, value: 2 },

  // BAD DEFENDERS (CB / RB / LB)
  { id: "bad_maguire_meme", name: "Harry Maguire", club: "Manchester United", league: "Premier League", position: "CB", rating: 73, tier: "Below Average", pace: 52, shooting: 50, passing: 68, dribbling: 62, defending: 75, physical: 86, marketValue: 4, value: 4 },
  { id: "bad_mustafi", name: "Shkodran Mustafi", club: "Free Agent", league: "Premier League", position: "CB", rating: 69, tier: "Below Average", pace: 58, shooting: 42, passing: 62, dribbling: 60, defending: 71, physical: 74, marketValue: 1, value: 1 },
  { id: "bad_bramble", name: "Titus Bramble (OG)", club: "Free Agent", league: "Premier League", position: "CB", rating: 62, tier: "Weak", pace: 54, shooting: 35, passing: 52, dribbling: 48, defending: 65, physical: 78, marketValue: 1, value: 1 },
  { id: "bad_jenkinson", name: "Carl Jenkinson", club: "Bromley", league: "Premier League", position: "RB", rating: 66, tier: "Below Average", pace: 68, shooting: 48, passing: 60, dribbling: 62, defending: 66, physical: 70, marketValue: 1, value: 1 },
  { id: "bad_buttner", name: "Alexander Buttner", club: "Vitesse", league: "Premier League", position: "LB", rating: 67, tier: "Below Average", pace: 72, shooting: 60, passing: 64, dribbling: 67, defending: 64, physical: 68, marketValue: 1, value: 1 },

  // BAD GOALKEEPERS (GK)
  { id: "bad_karius", name: "Loris Karius", club: "Free Agent", league: "Premier League", position: "GK", rating: 68, tier: "Below Average", pace: 48, shooting: 18, passing: 62, dribbling: 42, defending: 68, physical: 72, marketValue: 1, value: 1 },
  { id: "bad_carson", name: "Scott Carson", club: "Manchester City", league: "Premier League", position: "GK", rating: 66, tier: "Below Average", pace: 38, shooting: 15, passing: 58, dribbling: 38, defending: 67, physical: 70, marketValue: 1, value: 1 },
  { id: "bad_rob_green", name: "Rob Green", club: "Retired", league: "Premier League", position: "GK", rating: 69, tier: "Below Average", pace: 42, shooting: 15, passing: 60, dribbling: 40, defending: 70, physical: 72, marketValue: 1, value: 1 },
  { id: "bad_taibi", name: "Massimo Taibi", club: "Free Agent", league: "Premier League", position: "GK", rating: 63, tier: "Weak", pace: 40, shooting: 15, passing: 50, dribbling: 36, defending: 64, physical: 70, marketValue: 1, value: 1 }
];
