// scripts/generate_db.js
import fs from "fs";
import path from "path";

// Function to determine tier based on rating
function getTier(rating) {
  if (rating >= 95) return "Legendary / Superstar";
  if (rating >= 90) return "World Class";
  if (rating >= 85) return "Elite";
  if (rating >= 80) return "Very Good";
  if (rating >= 75) return "Good";
  if (rating >= 70) return "Average";
  if (rating >= 65) return "Below Average";
  if (rating >= 60) return "Weak";
  return "Very Weak";
}

// Function to determine market value based on rating and position
function getValue(rating, pos) {
  if (rating >= 95) return 120 + (rating - 95) * 20;
  if (rating >= 90) return 70 + (rating - 90) * 10;
  if (rating >= 85) return 40 + (rating - 85) * 6;
  if (rating >= 80) return 22 + (rating - 80) * 3;
  if (rating >= 75) return 12 + (rating - 75) * 2;
  if (rating >= 70) return 5 + (rating - 70);
  if (rating >= 65) return 2 + Math.floor((rating - 65) * 0.5);
  return 1;
}

// Raw player data definitions: [id, name, league, club, nation, pos, rating, pace, sho, pas, dri, def, phy]
const rawPlayers = [
  // ================= PREMIER LEAGUE =================
  ["haaland", "Erling Haaland", "Premier League", "Manchester City", "Norway", "ST", 96, 89, 96, 68, 80, 45, 90],
  ["de_bruyne", "Kevin De Bruyne", "Premier League", "Manchester City", "Belgium", "CM", 93, 72, 87, 95, 87, 65, 75],
  ["rodri", "Rodri Hernandez", "Premier League", "Manchester City", "Spain", "CDM", 95, 66, 80, 86, 84, 87, 85],
  ["salah", "Mohamed Salah", "Premier League", "Liverpool", "Egypt", "RW", 92, 89, 88, 84, 89, 45, 76],
  ["van_dijk", "Virgil van Dijk", "Premier League", "Liverpool", "Netherlands", "CB", 92, 78, 60, 72, 70, 92, 88],
  ["alisson", "Alisson Becker", "Premier League", "Liverpool", "Brazil", "GK", 89, 52, 25, 86, 55, 90, 84],
  ["saka", "Bukayo Saka", "Premier League", "Arsenal", "England", "RW", 89, 86, 83, 83, 89, 65, 76],
  ["odegaard", "Martin Ødegaard", "Premier League", "Arsenal", "Norway", "CAM", 89, 75, 82, 89, 89, 64, 63],
  ["rice", "Declan Rice", "Premier League", "Arsenal", "England", "CDM", 88, 76, 70, 82, 80, 86, 85],
  ["saliba", "William Saliba", "Premier League", "Arsenal", "France", "CB", 88, 82, 40, 72, 77, 89, 84],
  ["foden", "Phil Foden", "Premier League", "Manchester City", "England", "LW", 89, 86, 85, 86, 91, 56, 62],
  ["palmer", "Cole Palmer", "Premier League", "Chelsea", "England", "CAM", 88, 82, 86, 86, 88, 55, 68],
  ["son", "Heung-min Son", "Premier League", "Tottenham", "South Korea", "LW", 87, 86, 89, 83, 85, 42, 70],
  ["alexander_arnold", "Trent Alexander-Arnold", "Premier League", "Liverpool", "England", "RB", 87, 76, 75, 91, 80, 80, 74],
  ["bruno_fernandes", "Bruno Fernandes", "Premier League", "Manchester United", "Portugal", "CAM", 87, 72, 85, 89, 83, 69, 77],
  ["gabriel_magalhaes", "Gabriel Magalhães", "Premier League", "Arsenal", "Brazil", "CB", 86, 70, 42, 68, 70, 88, 85],
  ["ederson", "Ederson Moraes", "Premier League", "Manchester City", "Brazil", "GK", 88, 64, 30, 92, 60, 87, 81],
  ["martinez_emi", "Emiliano Martínez", "Premier League", "Aston Villa", "Argentina", "GK", 87, 48, 20, 76, 52, 88, 85],
  ["raya", "David Raya", "Premier League", "Arsenal", "Spain", "GK", 85, 52, 22, 84, 58, 86, 78],
  ["vicario", "Guglielmo Vicario", "Premier League", "Tottenham", "Italy", "GK", 84, 50, 18, 75, 45, 85, 79],
  ["pickford", "Jordan Pickford", "Premier League", "Everton", "England", "GK", 83, 55, 20, 82, 50, 83, 78],
  ["gvardiol", "Joško Gvardiol", "Premier League", "Manchester City", "Croatia", "LB", 85, 79, 64, 76, 80, 84, 83],
  ["porro", "Pedro Porro", "Premier League", "Tottenham", "Spain", "RB", 84, 83, 76, 81, 82, 78, 75],
  ["white", "Ben White", "Premier League", "Arsenal", "England", "RB", 84, 75, 55, 76, 78, 84, 78],
  ["trippier", "Kieran Trippier", "Premier League", "Newcastle", "England", "RB", 83, 70, 68, 86, 78, 79, 72],
  ["walker", "Kyle Walker", "Premier League", "Manchester City", "England", "RB", 84, 89, 63, 77, 78, 81, 82],
  ["robertson", "Andy Robertson", "Premier League", "Liverpool", "Scotland", "LB", 85, 80, 62, 81, 80, 81, 75],
  ["udogie", "Destiny Udogie", "Premier League", "Tottenham", "Italy", "LB", 83, 86, 63, 74, 80, 79, 79],
  ["dias", "Rúben Dias", "Premier League", "Manchester City", "Portugal", "CB", 88, 65, 38, 70, 68, 89, 87],
  ["romero", "Cristian Romero", "Premier League", "Tottenham", "Argentina", "CB", 85, 75, 48, 68, 72, 86, 84],
  ["konate", "Ibrahima Konaté", "Premier League", "Liverpool", "France", "CB", 84, 78, 35, 60, 68, 85, 85],
  ["stones", "John Stones", "Premier League", "Manchester City", "England", "CB", 85, 72, 55, 80, 80, 86, 79],
  ["akanji", "Manuel Akanji", "Premier League", "Manchester City", "Switzerland", "CB", 84, 79, 52, 74, 76, 84, 81],
  ["mac_allister", "Alexis Mac Allister", "Premier League", "Liverpool", "Argentina", "CM", 86, 72, 80, 85, 84, 79, 78],
  ["szoboszlai", "Dominik Szoboszlai", "Premier League", "Liverpool", "Hungary", "CM", 84, 83, 84, 83, 83, 65, 75],
  ["guimaraes", "Bruno Guimarães", "Premier League", "Newcastle", "Brazil", "CM", 85, 73, 76, 84, 83, 80, 83],
  ["paqueta", "Lucas Paquetá", "Premier League", "West Ham", "Brazil", "CAM", 84, 74, 80, 83, 86, 73, 80],
  ["eze", "Eberechi Eze", "Premier League", "Crystal Palace", "England", "CAM", 83, 82, 80, 82, 86, 52, 68],
  ["maddison", "James Maddison", "Premier League", "Tottenham", "England", "CAM", 84, 73, 81, 86, 85, 55, 62],
  ["mainoo", "Kobbie Mainoo", "Premier League", "Manchester United", "England", "CM", 81, 74, 68, 80, 84, 76, 72],
  ["isak", "Alexander Isak", "Premier League", "Newcastle", "Sweden", "ST", 86, 88, 85, 74, 84, 35, 74],
  ["watkins", "Ollie Watkins", "Premier League", "Aston Villa", "England", "ST", 85, 85, 84, 77, 81, 44, 79],
  ["solanke", "Dominic Solanke", "Premier League", "Tottenham", "England", "ST", 82, 81, 81, 72, 78, 48, 80],
  ["bowen", "Jarrod Bowen", "Premier League", "West Ham", "England", "RW", 83, 84, 82, 78, 82, 54, 74],
  ["gordon", "Anthony Gordon", "Premier League", "Newcastle", "England", "LW", 83, 90, 78, 77, 83, 56, 70],
  ["diaz", "Luis Díaz", "Premier League", "Liverpool", "Colombia", "LW", 85, 89, 80, 76, 87, 42, 74],
  ["martinelli", "Gabriel Martinelli", "Premier League", "Arsenal", "Brazil", "LW", 84, 89, 78, 76, 86, 45, 70],
  ["wood", "Chris Wood", "Premier League", "Nottingham Forest", "New Zealand", "ST", 78, 65, 80, 62, 68, 38, 82],
  ["mbeumo", "Bryan Mbeumo", "Premier League", "Brentford", "Cameroon", "RW", 81, 84, 80, 78, 82, 45, 74],
  ["cunha", "Matheus Cunha", "Premier League", "Wolves", "Brazil", "ST", 81, 83, 79, 76, 84, 48, 76],
  ["gibbs_white", "Morgan Gibbs-White", "Premier League", "Nottingham Forest", "England", "CAM", 80, 78, 75, 81, 82, 64, 72],
  ["wharton", "Adam Wharton", "Premier League", "Crystal Palace", "England", "CDM", 78, 68, 62, 80, 79, 76, 72],
  ["murillo", "Murillo Santiago", "Premier League", "Nottingham Forest", "Brazil", "CB", 79, 74, 50, 70, 72, 81, 82],
  ["tarkowski", "James Tarkowski", "Premier League", "Everton", "England", "CB", 79, 52, 42, 58, 64, 82, 84],
  ["burn", "Dan Burn", "Premier League", "Newcastle", "England", "LB", 78, 62, 45, 68, 68, 80, 86],
  ["leno", "Bernd Leno", "Premier League", "Fulham", "Germany", "GK", 81, 48, 16, 72, 45, 82, 76],
  ["flekken", "Mark Flekken", "Premier League", "Brentford", "Netherlands", "GK", 79, 45, 18, 78, 42, 80, 75],
  ["mitoma", "Kaoru Mitoma", "Premier League", "Brighton", "Japan", "LW", 81, 86, 76, 77, 86, 48, 62],
  ["pedro", "João Pedro", "Premier League", "Brighton", "Brazil", "ST", 79, 81, 78, 74, 82, 42, 70],
  ["adams_tyler", "Tyler Adams", "Premier League", "Bournemouth", "USA", "CDM", 77, 76, 58, 72, 74, 78, 79],
  ["muniz", "Rodrigo Muniz", "Premier League", "Fulham", "Brazil", "ST", 76, 74, 77, 65, 75, 38, 78],
  ["semyo", "Antoine Semenyo", "Premier League", "Bournemouth", "Ghana", "RW", 76, 84, 75, 70, 78, 42, 76],
  ["van_hecke", "Jan Paul van Hecke", "Premier League", "Brighton", "Netherlands", "CB", 77, 66, 40, 72, 70, 79, 78],
  ["andersen", "Joachim Andersen", "Premier League", "Fulham", "Denmark", "CB", 78, 58, 50, 76, 68, 80, 80],
  ["doku", "Jérémy Doku", "Premier League", "Manchester City", "Belgium", "LW", 82, 92, 72, 76, 88, 35, 68],
  ["calvert_lewin", "Dominic Calvert-Lewin", "Premier League", "Everton", "England", "ST", 78, 78, 77, 64, 74, 40, 82],
  ["traore", "Adama Traoré", "Premier League", "Fulham", "Spain", "RW", 76, 94, 66, 68, 82, 38, 86],
  ["delap", "Liam Delap", "Premier League", "Ipswich Town", "England", "ST", 73, 82, 74, 62, 72, 35, 80],
  ["hutchinson", "Omari Hutchinson", "Premier League", "Ipswich Town", "England", "RW", 72, 84, 70, 72, 78, 38, 64],
  ["greaves", "Jacob Greaves", "Premier League", "Ipswich Town", "England", "CB", 73, 68, 42, 65, 66, 75, 78],
  ["muric", "Arijanet Murić", "Premier League", "Ipswich Town", "Kosovo", "GK", 74, 48, 16, 72, 40, 75, 76],
  ["bednarek", "Jan Bednarek", "Premier League", "Southampton", "Poland", "CB", 74, 60, 38, 62, 64, 76, 78],
  ["dibling", "Tyler Dibling", "Premier League", "Southampton", "England", "RW", 68, 80, 64, 68, 76, 40, 60],
  ["nwaneri", "Ethan Nwaneri", "Premier League", "Arsenal", "England", "CAM", 69, 78, 68, 72, 76, 42, 58],
  ["wheatley", "Ethan Wheatley", "Premier League", "Manchester United", "England", "ST", 63, 74, 64, 55, 65, 28, 66],

  // ================= LA LIGA =================
  ["mbappe", "Kylian Mbappé", "La Liga", "Real Madrid", "France", "ST", 97, 97, 91, 82, 92, 38, 78],
  ["vinicius", "Vinícius Júnior", "La Liga", "Real Madrid", "Brazil", "LW", 96, 96, 85, 82, 92, 35, 70],
  ["bellingham", "Jude Bellingham", "La Liga", "Real Madrid", "England", "CAM", 94, 80, 87, 85, 88, 78, 84],
  ["valverde", "Federico Valverde", "La Liga", "Real Madrid", "Uruguay", "CM", 89, 88, 84, 84, 83, 80, 83],
  ["courtois", "Thibaut Courtois", "La Liga", "Real Madrid", "Belgium", "GK", 90, 48, 20, 75, 45, 91, 88],
  ["lewandowski", "Robert Lewandowski", "La Liga", "Barcelona", "Poland", "ST", 90, 74, 91, 80, 85, 44, 82],
  ["yamal", "Lamine Yamal", "La Liga", "Barcelona", "Spain", "RW", 88, 88, 80, 85, 90, 40, 62],
  ["raphinha", "Raphinha Dias", "La Liga", "Barcelona", "Brazil", "LW", 88, 88, 84, 83, 87, 55, 74],
  ["pedri", "Pedri González", "La Liga", "Barcelona", "Spain", "CM", 87, 78, 72, 88, 89, 70, 68],
  ["griezmann", "Antoine Griezmann", "La Liga", "Atlético Madrid", "France", "ST", 88, 79, 87, 88, 87, 72, 74],
  ["rudiger", "Antonio Rüdiger", "La Liga", "Real Madrid", "Germany", "CB", 88, 82, 45, 71, 70, 88, 87],
  ["oblak", "Jan Oblak", "La Liga", "Atlético Madrid", "Slovenia", "GK", 88, 48, 18, 74, 46, 89, 84],
  ["ter_stegen", "Marc-André ter Stegen", "La Liga", "Barcelona", "Germany", "GK", 87, 45, 22, 88, 50, 88, 79],
  ["camavinga", "Eduardo Camavinga", "La Liga", "Real Madrid", "France", "CM", 85, 80, 68, 82, 84, 81, 81],
  ["tchouameni", "Aurélien Tchouaméni", "La Liga", "Real Madrid", "France", "CDM", 86, 72, 74, 80, 80, 84, 84],
  ["rodrygo", "Rodrygo Goes", "La Liga", "Real Madrid", "Brazil", "RW", 86, 89, 82, 81, 87, 40, 64],
  ["modric", "Luka Modrić", "La Liga", "Real Madrid", "Croatia", "CM", 86, 70, 76, 89, 86, 72, 65],
  ["carvajal", "Dani Carvajal", "La Liga", "Real Madrid", "Spain", "RB", 86, 80, 58, 80, 80, 83, 81],
  ["kounde", "Jules Koundé", "La Liga", "Barcelona", "France", "RB", 86, 83, 50, 74, 76, 86, 80],
  ["de_jong", "Frenkie de Jong", "La Liga", "Barcelona", "Netherlands", "CM", 86, 81, 70, 86, 88, 76, 78],
  ["araujo", "Ronald Araújo", "La Liga", "Barcelona", "Uruguay", "CB", 85, 81, 52, 66, 65, 86, 84],
  ["nico_williams", "Nico Williams", "La Liga", "Athletic Club", "Spain", "LW", 86, 93, 79, 81, 87, 45, 72],
  ["inaki_williams", "Iñaki Williams", "La Liga", "Athletic Club", "Ghana", "RW", 83, 91, 80, 75, 80, 48, 83],
  ["simon_unai", "Unai Simón", "La Liga", "Athletic Club", "Spain", "GK", 84, 52, 18, 76, 48, 85, 80],
  ["mamardashvili", "Giorgi Mamardashvili", "La Liga", "Valencia", "Georgia", "GK", 84, 48, 16, 70, 44, 86, 82],
  ["remiro", "Álex Remiro", "La Liga", "Real Sociedad", "Spain", "GK", 83, 50, 18, 75, 45, 84, 77],
  ["gimenez", "José María Giménez", "La Liga", "Atlético Madrid", "Uruguay", "CB", 83, 68, 45, 60, 62, 85, 83],
  ["le_normand", "Robin Le Normand", "La Liga", "Atlético Madrid", "Spain", "CB", 83, 68, 40, 68, 66, 84, 82],
  ["cubarsi", "Pau Cubarsí", "La Liga", "Barcelona", "Spain", "CB", 82, 70, 40, 78, 76, 83, 74],
  ["balde", "Alejandro Balde", "La Liga", "Barcelona", "Spain", "LB", 82, 91, 55, 74, 80, 76, 70],
  ["mendy_ferland", "Ferland Mendy", "La Liga", "Real Madrid", "France", "LB", 82, 88, 62, 74, 78, 80, 82],
  ["gaya", "José Gayà", "La Liga", "Valencia", "Spain", "LB", 82, 82, 64, 79, 80, 77, 72],
  ["molina", "Nahuel Molina", "La Liga", "Atlético Madrid", "Argentina", "RB", 81, 82, 68, 76, 79, 76, 75],
  ["zubimendi", "Martín Zubimendi", "La Liga", "Real Sociedad", "Spain", "CDM", 84, 68, 66, 80, 78, 83, 79],
  ["baena", "Álex Baena", "La Liga", "Villarreal", "Spain", "CAM", 83, 76, 78, 84, 83, 65, 70],
  ["oyarzabal", "Mikel Oyarzabal", "La Liga", "Real Sociedad", "Spain", "LW", 83, 78, 82, 81, 81, 55, 72],
  ["brais_mendez", "Brais Méndez", "La Liga", "Real Sociedad", "Spain", "CM", 82, 72, 80, 82, 82, 68, 72],
  ["sancet", "Oihan Sancet", "La Liga", "Athletic Club", "Spain", "CAM", 81, 74, 80, 80, 80, 60, 75],
  ["aspas", "Iago Aspas", "La Liga", "Celta Vigo", "Spain", "ST", 82, 72, 84, 82, 83, 40, 64],
  ["sorloth", "Alexander Sørloth", "La Liga", "Atlético Madrid", "Norway", "ST", 82, 82, 82, 68, 74, 40, 86],
  ["alvarez_julian", "Julián Álvarez", "La Liga", "Atlético Madrid", "Argentina", "ST", 86, 85, 86, 81, 85, 55, 78],
  ["gerard_moreno", "Gerard Moreno", "La Liga", "Villarreal", "Spain", "ST", 82, 74, 83, 80, 82, 44, 70],
  ["ayoze_perez", "Ayoze Pérez", "La Liga", "Villarreal", "Spain", "ST", 80, 78, 80, 76, 81, 46, 68],
  ["pepete", "Pepelu", "La Liga", "Valencia", "Spain", "CDM", 80, 68, 70, 79, 76, 79, 78],
  ["vivian", "Dani Vivian", "La Liga", "Athletic Club", "Spain", "CB", 81, 74, 38, 64, 68, 82, 82],
  ["casado", "Marc Casadó", "La Liga", "Barcelona", "Spain", "CDM", 79, 72, 60, 78, 78, 78, 76],
  ["lopez_fermin", "Fermín López", "La Liga", "Barcelona", "Spain", "CAM", 80, 78, 81, 77, 80, 62, 70],
  ["guler", "Arda Güler", "La Liga", "Real Madrid", "Turkey", "CAM", 79, 74, 78, 82, 84, 50, 58],
  ["endrick", "Endrick Felipe", "La Liga", "Real Madrid", "Brazil", "ST", 78, 88, 80, 68, 80, 38, 78],
  ["marmol", "Mika Mármol", "La Liga", "Las Palmas", "Spain", "CB", 76, 70, 38, 74, 72, 77, 74],
  ["valle", "Álex Valle", "La Liga", "Barcelona", "Spain", "LB", 72, 78, 52, 68, 72, 68, 66],
  ["jesus_rodriguez", "Jesús Rodríguez", "La Liga", "Real Betis", "Spain", "LW", 68, 82, 62, 65, 74, 36, 58],
  ["fort", "Héctor Fort", "La Liga", "Barcelona", "Spain", "RB", 71, 76, 50, 68, 72, 70, 68],
  ["martin_gerard", "Gerard Martín", "La Liga", "Barcelona", "Spain", "LB", 70, 74, 48, 66, 68, 70, 70],
  ["dominguez_sergi", "Sergi Domínguez", "La Liga", "Barcelona", "Spain", "CB", 67, 66, 35, 62, 62, 70, 72],

  // ================= SERIE A =================
  ["lautaro", "Lautaro Martínez", "Serie A", "Inter Milan", "Argentina", "ST", 91, 82, 90, 78, 86, 48, 84],
  ["barella", "Nicolò Barella", "Serie A", "Inter Milan", "Italy", "CM", 88, 80, 78, 84, 85, 78, 80],
  ["bastoni", "Alessandro Bastoni", "Serie A", "Inter Milan", "Italy", "CB", 88, 74, 45, 82, 76, 88, 82],
  ["calhanoglu", "Hakan Çalhanoğlu", "Serie A", "Inter Milan", "Turkey", "CDM", 87, 68, 84, 88, 83, 75, 74],
  ["dimarco", "Federico Dimarco", "Serie A", "Inter Milan", "Italy", "LB", 86, 82, 79, 87, 82, 76, 72],
  ["sommer", "Yann Sommer", "Serie A", "Inter Milan", "Switzerland", "GK", 87, 50, 20, 80, 52, 88, 78],
  ["thuram_marcus", "Marcus Thuram", "Serie A", "Inter Milan", "France", "ST", 85, 86, 82, 76, 83, 45, 82],
  ["leao", "Rafael Leão", "Serie A", "AC Milan", "Portugal", "LW", 88, 93, 81, 78, 88, 35, 78],
  ["theo_hernandez", "Theo Hernández", "Serie A", "AC Milan", "France", "LB", 87, 94, 74, 78, 83, 80, 87],
  ["maignan", "Mike Maignan", "Serie A", "AC Milan", "France", "GK", 88, 52, 22, 85, 54, 89, 83],
  ["pulisic", "Christian Pulisic", "Serie A", "AC Milan", "USA", "RW", 84, 86, 80, 79, 85, 42, 65],
  ["morata", "Álvaro Morata", "Serie A", "AC Milan", "Spain", "ST", 83, 80, 82, 74, 78, 42, 76],
  ["reijnders", "Tijjani Reijnders", "Serie A", "AC Milan", "Netherlands", "CM", 83, 78, 75, 82, 83, 72, 75],
  ["tomori", "Fikayo Tomori", "Serie A", "AC Milan", "England", "CB", 83, 84, 40, 66, 68, 84, 80],
  ["vlahovic", "Dušan Vlahović", "Serie A", "Juventus", "Serbia", "ST", 85, 78, 86, 68, 76, 38, 83],
  ["bremer", "Gleison Bremer", "Serie A", "Juventus", "Brazil", "CB", 86, 80, 42, 60, 65, 87, 86],
  ["di_gregorio", "Michele Di Gregorio", "Serie A", "Juventus", "Italy", "GK", 84, 48, 16, 75, 46, 85, 78],
  ["koopmeiners", "Teun Koopmeiners", "Serie A", "Juventus", "Netherlands", "CAM", 84, 72, 82, 83, 80, 75, 80],
  ["cambiaso", "Andrea Cambiaso", "Serie A", "Juventus", "Italy", "RB", 82, 81, 68, 78, 81, 76, 74],
  ["yildiz", "Kenan Yıldız", "Serie A", "Juventus", "Turkey", "LW", 79, 82, 76, 75, 83, 45, 68],
  ["kvaratskhelia", "Khvicha Kvaratskhelia", "Serie A", "Napoli", "Georgia", "LW", 87, 86, 82, 81, 88, 42, 75],
  ["lukaku", "Romelu Lukaku", "Serie A", "Napoli", "Belgium", "ST", 84, 78, 84, 72, 74, 38, 86],
  ["buongiorno", "Alessandro Buongiorno", "Serie A", "Napoli", "Italy", "CB", 83, 74, 38, 68, 66, 84, 84],
  ["meret", "Alex Meret", "Serie A", "Napoli", "Italy", "GK", 81, 48, 16, 72, 45, 82, 76],
  ["di_lorenzo", "Giovanni Di Lorenzo", "Serie A", "Napoli", "Italy", "RB", 83, 79, 68, 78, 79, 80, 79],
  ["anguissa", "André-Frank Zambo Anguissa", "Serie A", "Napoli", "Cameroon", "CM", 83, 74, 70, 78, 80, 80, 84],
  ["dybala", "Paulo Dybala", "Serie A", "AS Roma", "Argentina", "CAM", 86, 78, 85, 86, 89, 40, 62],
  ["pellegrini", "Lorenzo Pellegrini", "Serie A", "AS Roma", "Italy", "CM", 82, 75, 78, 82, 81, 70, 74],
  ["mancini", "Gianluca Mancini", "Serie A", "AS Roma", "Italy", "CB", 81, 68, 48, 64, 65, 82, 84],
  ["dovbyk", "Artem Dovbyk", "Serie A", "AS Roma", "Ukraine", "ST", 84, 80, 84, 68, 74, 40, 85],
  ["svilar", "Mile Svilar", "Serie A", "AS Roma", "Serbia", "GK", 81, 50, 18, 74, 46, 82, 76],
  ["lookman", "Ademola Lookman", "Serie A", "Atalanta", "Nigeria", "LW", 84, 88, 83, 78, 86, 45, 68],
  ["ederson_ata", "Éderson dos Santos", "Serie A", "Atalanta", "Brazil", "CM", 83, 78, 74, 78, 80, 81, 83],
  ["de_ketelaere", "Charles De Ketelaere", "Serie A", "Atalanta", "Belgium", "CAM", 82, 76, 78, 80, 82, 58, 76],
  ["carnesecchi", "Marco Carnesecchi", "Serie A", "Atalanta", "Italy", "GK", 82, 50, 18, 74, 48, 83, 78],
  ["zaccagni", "Mattia Zaccagni", "Serie A", "Lazio", "Italy", "LW", 82, 82, 78, 80, 83, 55, 70],
  ["guendouzi", "Mattéo Guendouzi", "Serie A", "Lazio", "France", "CM", 81, 72, 70, 79, 78, 78, 80],
  ["provedel", "Ivan Provedel", "Serie A", "Lazio", "Italy", "GK", 82, 48, 20, 75, 45, 83, 76],
  ["castellanos", "Valentín Castellanos", "Serie A", "Lazio", "Argentina", "ST", 79, 78, 78, 68, 76, 45, 76],
  ["zapata_duvan", "Duván Zapata", "Serie A", "Torino", "Colombia", "ST", 80, 74, 81, 66, 74, 38, 86],
  ["ricci", "Samuele Ricci", "Serie A", "Torino", "Italy", "CDM", 79, 72, 65, 80, 78, 76, 74],
  ["milinkovic_vanja", "Vanja Milinković-Savić", "Serie A", "Torino", "Serbia", "GK", 80, 45, 25, 78, 42, 81, 86],
  ["pinamonti", "Andrea Pinamonti", "Serie A", "Genoa", "Italy", "ST", 76, 72, 77, 65, 72, 36, 76],
  ["frendrup", "Morten Frendrup", "Serie A", "Genoa", "Denmark", "CM", 78, 76, 62, 74, 76, 80, 78],
  ["lucca", "Lorenzo Lucca", "Serie A", "Udinese", "Italy", "ST", 76, 68, 77, 60, 68, 38, 88],
  ["bijol", "Jaka Bijol", "Serie A", "Udinese", "Slovenia", "CB", 78, 64, 42, 68, 66, 80, 84],
  ["suzuki_zion", "Zion Suzuki", "Serie A", "Parma", "Japan", "GK", 74, 52, 20, 74, 44, 75, 78],
  ["bonny", "Ange-Yoan Bonny", "Serie A", "Parma", "France", "ST", 73, 80, 72, 66, 76, 35, 78],
  ["paz_nico", "Nico Paz", "Serie A", "Como", "Argentina", "CAM", 75, 76, 74, 76, 80, 52, 68],
  ["cutrone", "Patrick Cutrone", "Serie A", "Como", "Italy", "ST", 74, 75, 75, 62, 72, 38, 74],
  ["pisilli", "Niccolò Pisilli", "Serie A", "AS Roma", "Italy", "CM", 71, 74, 68, 72, 74, 68, 68],

  // ================= BUNDESLIGA =================
  ["kane", "Harry Kane", "Bundesliga", "Bayern Munich", "England", "ST", 95, 72, 95, 87, 83, 48, 83],
  ["musiala", "Jamal Musiala", "Bundesliga", "Bayern Munich", "Germany", "CAM", 91, 88, 82, 83, 94, 40, 66],
  ["wirtz", "Florian Wirtz", "Bundesliga", "Bayer Leverkusen", "Germany", "CAM", 91, 84, 82, 89, 91, 52, 68],
  ["kimmich", "Joshua Kimmich", "Bundesliga", "Bayern Munich", "Germany", "RB", 88, 70, 74, 90, 83, 82, 78],
  ["neuer", "Manuel Neuer", "Bundesliga", "Bayern Munich", "Germany", "GK", 87, 52, 25, 88, 56, 87, 82],
  ["davies_alphonso", "Alphonso Davies", "Bundesliga", "Bayern Munich", "Canada", "LB", 86, 95, 68, 78, 84, 76, 78],
  ["upamecano", "Dayot Upamecano", "Bundesliga", "Bayern Munich", "France", "CB", 85, 83, 42, 68, 72, 85, 85],
  ["min_jae", "Kim Min-jae", "Bundesliga", "Bayern Munich", "South Korea", "CB", 85, 80, 38, 65, 68, 86, 86],
  ["sane", "Leroy Sané", "Bundesliga", "Bayern Munich", "Germany", "RW", 85, 90, 82, 80, 87, 38, 70],
  ["gnabry", "Serge Gnabry", "Bundesliga", "Bayern Munich", "Germany", "LW", 83, 82, 83, 78, 82, 44, 72],
  ["palhinha", "João Palhinha", "Bundesliga", "Bayern Munich", "Portugal", "CDM", 85, 68, 62, 72, 72, 86, 88],
  ["olise", "Michael Olise", "Bundesliga", "Bayern Munich", "France", "RW", 85, 82, 80, 84, 87, 50, 68],
  ["xhaka", "Granit Xhaka", "Bundesliga", "Bayer Leverkusen", "Switzerland", "CM", 87, 60, 78, 87, 78, 78, 82],
  ["grimaldo", "Alejandro Grimaldo", "Bundesliga", "Bayer Leverkusen", "Spain", "LB", 87, 84, 82, 88, 84, 76, 72],
  ["frimpong", "Jeremie Frimpong", "Bundesliga", "Bayer Leverkusen", "Netherlands", "RB", 86, 95, 78, 80, 86, 72, 72],
  ["tah", "Jonathan Tah", "Bundesliga", "Bayer Leverkusen", "Germany", "CB", 86, 74, 40, 68, 68, 87, 87],
  ["hradecky", "Lukáš Hrádecký", "Bundesliga", "Bayer Leverkusen", "Finland", "GK", 84, 48, 16, 72, 46, 85, 78],
  ["tapsoba", "Edmond Tapsoba", "Bundesliga", "Bayer Leverkusen", "Burkina Faso", "CB", 84, 78, 52, 72, 74, 84, 82],
  ["palacios", "Exequiel Palacios", "Bundesliga", "Bayer Leverkusen", "Argentina", "CM", 84, 74, 74, 82, 82, 80, 80],
  ["boniface", "Victor Boniface", "Bundesliga", "Bayer Leverkusen", "Nigeria", "ST", 84, 84, 84, 72, 82, 40, 86],
  ["guirassy", "Serhou Guirassy", "Bundesliga", "Borussia Dortmund", "Guinea", "ST", 85, 80, 86, 74, 78, 42, 84],
  ["kobel", "Gregor Kobel", "Bundesliga", "Borussia Dortmund", "Switzerland", "GK", 87, 50, 16, 75, 42, 88, 83],
  ["schlotterbeck", "Nico Schlotterbeck", "Bundesliga", "Borussia Dortmund", "Germany", "CB", 85, 78, 58, 76, 75, 85, 84],
  ["brandt", "Julian Brandt", "Bundesliga", "Borussia Dortmund", "Germany", "CAM", 84, 76, 78, 85, 84, 58, 68],
  ["sabitzer", "Marcel Sabitzer", "Bundesliga", "Borussia Dortmund", "Austria", "CM", 83, 74, 80, 82, 80, 76, 78],
  ["gittens", "Jamie Gittens", "Bundesliga", "Borussia Dortmund", "England", "LW", 80, 88, 74, 72, 84, 38, 62],
  ["adeyemi", "Karim Adeyemi", "Bundesliga", "Borussia Dortmund", "Germany", "RW", 81, 96, 76, 70, 81, 38, 68],
  ["ryerson", "Julian Ryerson", "Bundesliga", "Borussia Dortmund", "Norway", "RB", 80, 78, 65, 75, 76, 78, 82],
  ["openda", "Loïs Openda", "Bundesliga", "RB Leipzig", "Belgium", "ST", 85, 93, 83, 68, 80, 38, 80],
  ["simons_xavi", "Xavi Simons", "Bundesliga", "RB Leipzig", "Netherlands", "CAM", 85, 84, 78, 83, 87, 55, 70],
  ["sesko", "Benjamin Šeško", "Bundesliga", "RB Leipzig", "Slovenia", "ST", 83, 86, 82, 68, 78, 40, 82],
  ["raum", "David Raum", "Bundesliga", "RB Leipzig", "Germany", "LB", 82, 83, 68, 82, 78, 76, 76],
  ["gulacsi", "Péter Gulácsi", "Bundesliga", "RB Leipzig", "Hungary", "GK", 83, 46, 16, 74, 45, 84, 77],
  ["orban", "Willi Orbán", "Bundesliga", "RB Leipzig", "Hungary", "CB", 82, 65, 42, 66, 65, 84, 83],
  ["haidara", "Amadou Haidara", "Bundesliga", "RB Leipzig", "Mali", "CM", 80, 76, 72, 78, 78, 76, 80],
  ["marmoush", "Omar Marmoush", "Bundesliga", "Eintracht Frankfurt", "Egypt", "ST", 85, 90, 84, 78, 85, 45, 76],
  ["ekitike", "Hugo Ekitiké", "Bundesliga", "Eintracht Frankfurt", "France", "ST", 80, 82, 78, 72, 81, 38, 72],
  ["trapp", "Kevin Trapp", "Bundesliga", "Eintracht Frankfurt", "Germany", "GK", 82, 48, 18, 74, 46, 83, 76],
  ["larsson_hugo", "Hugo Larsson", "Bundesliga", "Eintracht Frankfurt", "Sweden", "CM", 78, 75, 68, 78, 78, 72, 72],
  ["koch", "Robin Koch", "Bundesliga", "Eintracht Frankfurt", "Germany", "CB", 80, 70, 50, 68, 68, 81, 80],
  ["kramaric", "Andrej Kramarić", "Bundesliga", "Hoffenheim", "Croatia", "ST", 81, 72, 82, 80, 81, 42, 68],
  ["stiller", "Angelo Stiller", "Bundesliga", "VfB Stuttgart", "Germany", "CM", 81, 68, 70, 82, 78, 76, 74],
  ["undav", "Deniz Undav", "Bundesliga", "VfB Stuttgart", "Germany", "ST", 82, 74, 83, 78, 80, 42, 78],
  ["nubel", "Alexander Nübel", "Bundesliga", "VfB Stuttgart", "Germany", "GK", 81, 48, 20, 76, 45, 82, 77],
  ["chabot", "Jeff Chabot", "Bundesliga", "VfB Stuttgart", "Germany", "CB", 78, 62, 38, 62, 64, 80, 86],
  ["amoura", "Mohamed Amoura", "Bundesliga", "Wolfsburg", "Algeria", "ST", 79, 92, 78, 70, 80, 42, 72],
  ["wind", "Jonas Wind", "Bundesliga", "Wolfsburg", "Denmark", "ST", 78, 70, 78, 74, 76, 42, 80],
  ["honorat", "Franck Honorat", "Bundesliga", "Borussia M'gladbach", "France", "RW", 78, 84, 74, 78, 79, 52, 70],
  ["weigl", "Julian Weigl", "Bundesliga", "Borussia M'gladbach", "Germany", "CDM", 78, 64, 62, 80, 76, 78, 72],
  ["duranville", "Julien Duranville", "Bundesliga", "Borussia Dortmund", "Belgium", "LW", 70, 88, 62, 64, 78, 32, 56],
  ["bischof", "Tom Bischof", "Bundesliga", "Hoffenheim", "Germany", "CAM", 71, 72, 68, 74, 75, 52, 60],

  // ================= LIGUE 1 =================
  ["dembele", "Ousmane Dembélé", "Ligue 1", "PSG", "France", "RW", 88, 92, 76, 82, 90, 40, 62],
  ["hakimi", "Achraf Hakimi", "Ligue 1", "PSG", "Morocco", "RB", 87, 92, 76, 80, 82, 78, 80],
  ["barcola", "Bradley Barcola", "Ligue 1", "PSG", "France", "LW", 85, 91, 80, 77, 86, 44, 70],
  ["vitinha_psg", "Vitinha Machado", "Ligue 1", "PSG", "Portugal", "CM", 86, 76, 74, 84, 87, 74, 70],
  ["donnarumma", "Gianluigi Donnarumma", "Ligue 1", "PSG", "Italy", "GK", 88, 50, 18, 76, 42, 89, 85],
  ["marquinhos", "Marquinhos Corrêa", "Ligue 1", "PSG", "Brazil", "CB", 87, 78, 52, 74, 74, 88, 80],
  ["pacho", "Willian Pacho", "Ligue 1", "PSG", "Ecuador", "CB", 83, 78, 38, 66, 68, 84, 83],
  ["mendes_nuno", "Nuno Mendes", "Ligue 1", "PSG", "Portugal", "LB", 84, 90, 64, 76, 82, 78, 78],
  ["zaire_emery", "Warren Zaïre-Emery", "Ligue 1", "PSG", "France", "CM", 83, 80, 72, 80, 81, 78, 80],
  ["ruiz_fabian", "Fabián Ruiz", "Ligue 1", "PSG", "Spain", "CM", 83, 68, 78, 84, 81, 74, 76],
  ["asensio", "Marco Asensio", "Ligue 1", "PSG", "Spain", "RW", 82, 76, 83, 82, 82, 42, 65],
  ["ramos_goncalo", "Gonçalo Ramos", "Ligue 1", "PSG", "Portugal", "ST", 82, 80, 82, 68, 76, 42, 78],
  ["david_jonathan", "Jonathan David", "Ligue 1", "Lille", "Canada", "ST", 84, 84, 84, 74, 80, 42, 77],
  ["chevalier", "Lucas Chevalier", "Ligue 1", "Lille", "France", "GK", 83, 50, 18, 74, 46, 84, 78],
  ["zhegrova", "Edon Zhegrova", "Ligue 1", "Lille", "Kosovo", "RW", 82, 85, 78, 78, 86, 38, 64],
  ["andre_benjamin", "Benjamin André", "Ligue 1", "Lille", "France", "CDM", 80, 68, 66, 76, 75, 82, 82],
  ["diakite_bafode", "Bafodé Diakité", "Ligue 1", "Lille", "France", "CB", 80, 78, 48, 65, 68, 81, 80],
  ["lacazette", "Alexandre Lacazette", "Ligue 1", "Lyon", "France", "ST", 82, 75, 84, 76, 80, 45, 75],
  ["cherki", "Rayan Cherki", "Ligue 1", "Lyon", "France", "CAM", 80, 76, 74, 81, 87, 35, 64],
  ["caqueret", "Maxence Caqueret", "Ligue 1", "Lyon", "France", "CM", 79, 74, 65, 78, 80, 76, 72],
  ["perri", "Lucas Perri", "Ligue 1", "Lyon", "Brazil", "GK", 79, 46, 18, 70, 42, 80, 84],
  ["tagliafico", "Nicolás Tagliafico", "Ligue 1", "Lyon", "Argentina", "LB", 79, 75, 58, 72, 75, 79, 78],
  ["greenwood", "Mason Greenwood", "Ligue 1", "Marseille", "England", "RW", 83, 85, 84, 78, 83, 40, 70],
  ["hojbjerg", "Pierre-Emile Højbjerg", "Ligue 1", "Marseille", "Denmark", "CDM", 82, 68, 72, 80, 76, 82, 84],
  ["rulli", "Gerónimo Rulli", "Ligue 1", "Marseille", "Argentina", "GK", 81, 50, 18, 75, 48, 82, 77],
  ["balerdi", "Leonardo Balerdi", "Ligue 1", "Marseille", "Argentina", "CB", 80, 74, 42, 68, 68, 81, 80],
  ["rabiot", "Adrien Rabiot", "Ligue 1", "Marseille", "France", "CM", 83, 76, 78, 81, 81, 78, 83],
  ["wahi", "Elye Wahi", "Ligue 1", "Marseille", "France", "ST", 78, 88, 77, 65, 79, 35, 70],
  ["golovin", "Aleksandr Golovin", "Ligue 1", "Monaco", "Russia", "CAM", 83, 78, 78, 84, 84, 66, 72],
  ["zakaria", "Denis Zakaria", "Ligue 1", "Monaco", "Switzerland", "CDM", 82, 82, 68, 75, 77, 82, 86],
  ["ben_seghir", "Eliesse Ben Seghir", "Ligue 1", "Monaco", "Morocco", "LW", 80, 82, 75, 76, 84, 40, 62],
  ["akliouche", "Maghnes Akliouche", "Ligue 1", "Monaco", "France", "CAM", 80, 78, 75, 80, 83, 45, 62],
  ["kehrer", "Thilo Kehrer", "Ligue 1", "Monaco", "Germany", "CB", 79, 75, 45, 70, 70, 80, 78],
  ["kohn", "Philipp Köhn", "Ligue 1", "Monaco", "Switzerland", "GK", 78, 48, 16, 70, 44, 79, 76],
  ["samba", "Brice Samba", "Ligue 1", "Lens", "France", "GK", 82, 52, 20, 78, 48, 83, 79],
  ["danso", "Kevin Danso", "Ligue 1", "Lens", "Austria", "CB", 81, 78, 38, 64, 65, 82, 85],
  ["diouf_andy", "Andy Diouf", "Ligue 1", "Lens", "France", "CM", 77, 78, 70, 74, 80, 70, 76],
  ["frankowski", "Przemysław Frankowski", "Ligue 1", "Lens", "Poland", "RB", 78, 84, 70, 75, 77, 72, 74],
  ["kalimuendo", "Arnaud Kalimuendo", "Ligue 1", "Rennes", "France", "ST", 78, 82, 78, 68, 78, 38, 72],
  ["mandanda", "Steve Mandanda", "Ligue 1", "Rennes", "France", "GK", 78, 45, 18, 72, 44, 79, 76],
  ["trufert", "Adrien Truffert", "Ligue 1", "Rennes", "France", "LB", 78, 80, 58, 74, 76, 76, 72],
  ["mbaye", "Ibrahim Mbaye", "Ligue 1", "PSG", "France", "RW", 66, 80, 60, 62, 72, 32, 54],
  ["mayulu", "Senny Mayulu", "Ligue 1", "PSG", "France", "CM", 70, 74, 66, 70, 74, 60, 64],
  ["teze", "Jordan Teze", "Ligue 1", "Monaco", "Netherlands", "RB", 78, 78, 50, 70, 72, 78, 78],

  // ================= SAUDI PRO LEAGUE =================
  ["ronaldo", "Cristiano Ronaldo", "Saudi Pro League", "Al Nassr", "Portugal", "ST", 94, 80, 94, 78, 82, 35, 78],
  ["neymar", "Neymar Jr", "Saudi Pro League", "Al Hilal", "Brazil", "LW", 91, 82, 84, 88, 93, 36, 62],
  ["benzema", "Karim Benzema", "Saudi Pro League", "Al Ittihad", "France", "ST", 89, 75, 88, 82, 85, 40, 76],
  ["mahrez", "Riyad Mahrez", "Saudi Pro League", "Al Ahli", "Algeria", "RW", 86, 80, 82, 84, 88, 38, 58],
  ["mane", "Sadio Mané", "Saudi Pro League", "Al Nassr", "Senegal", "LW", 86, 86, 82, 79, 85, 44, 74],
  ["kante", "N'Golo Kanté", "Saudi Pro League", "Al Ittihad", "France", "CDM", 86, 75, 66, 76, 80, 85, 83],
  ["bono", "Yassine Bounou", "Saudi Pro League", "Al Hilal", "Morocco", "GK", 87, 50, 18, 76, 50, 88, 82],
  ["mitrovic", "Aleksandar Mitrović", "Saudi Pro League", "Al Hilal", "Serbia", "ST", 85, 72, 86, 68, 74, 42, 88],
  ["milinkovic_savic", "Sergej Milinković-Savić", "Saudi Pro League", "Al Hilal", "Serbia", "CM", 86, 72, 82, 83, 82, 78, 86],
  ["neves_ruben", "Rúben Neves", "Saudi Pro League", "Al Hilal", "Portugal", "CDM", 84, 68, 78, 86, 78, 78, 76],
  ["malcom", "Malcom Silva", "Saudi Pro League", "Al Hilal", "Brazil", "RW", 83, 84, 80, 78, 84, 42, 68],
  ["cancelo", "João Cancelo", "Saudi Pro League", "Al Hilal", "Portugal", "RB", 85, 84, 72, 84, 85, 78, 72],
  ["koulibaly", "Kalidou Koulibaly", "Saudi Pro League", "Al Hilal", "Senegal", "CB", 84, 74, 35, 60, 66, 85, 86],
  ["lodi", "Renan Lodi", "Saudi Pro League", "Al Hilal", "Brazil", "LB", 80, 83, 62, 75, 78, 75, 72],
  ["laporte", "Aymeric Laporte", "Saudi Pro League", "Al Nassr", "Spain", "CB", 84, 65, 50, 74, 70, 85, 82],
  ["brozovic", "Marcelo Brozović", "Saudi Pro League", "Al Nassr", "Croatia", "CDM", 83, 72, 74, 82, 80, 80, 78],
  ["otavio", "Otávio Monteiro", "Saudi Pro League", "Al Nassr", "Portugal", "CAM", 82, 78, 74, 81, 83, 72, 76],
  ["simakan", "Mohamed Simakan", "Saudi Pro League", "Al Nassr", "France", "CB", 82, 80, 48, 68, 74, 82, 82],
  ["bento", "Bento Matheus", "Saudi Pro League", "Al Nassr", "Brazil", "GK", 81, 52, 20, 74, 48, 82, 78],
  ["al_ghannam", "Sultan Al-Ghannam", "Saudi Pro League", "Al Nassr", "Saudi Arabia", "RB", 77, 80, 60, 74, 74, 72, 72],
  ["diaby_moussa", "Moussa Diaby", "Saudi Pro League", "Al Ittihad", "France", "RW", 84, 94, 78, 76, 86, 40, 60],
  ["fabinho", "Fabinho Tavares", "Saudi Pro League", "Al Ittihad", "Brazil", "CDM", 83, 64, 68, 76, 76, 83, 82],
  ["aouar", "Houssem Aouar", "Saudi Pro League", "Al Ittihad", "Algeria", "CAM", 81, 76, 77, 80, 83, 62, 65],
  ["bergwijn", "Steven Bergwijn", "Saudi Pro League", "Al Ittihad", "Netherlands", "LW", 81, 85, 79, 76, 82, 42, 74],
  ["rajkovic", "Predrag Rajković", "Saudi Pro League", "Al Ittihad", "Serbia", "GK", 81, 48, 16, 72, 45, 82, 78],
  ["danilo_pereira", "Danilo Pereira", "Saudi Pro League", "Al Ittihad", "Portugal", "CB", 80, 64, 62, 70, 68, 82, 86],
  ["kessie", "Franck Kessié", "Saudi Pro League", "Al Ahli", "Ivory Coast", "CM", 83, 76, 76, 78, 80, 81, 86],
  ["firmino", "Roberto Firmino", "Saudi Pro League", "Al Ahli", "Brazil", "ST", 81, 74, 78, 79, 84, 55, 74],
  ["toney", "Ivan Toney", "Saudi Pro League", "Al Ahli", "England", "ST", 83, 82, 83, 74, 80, 48, 82],
  ["vega_gabri", "Gabri Veiga", "Saudi Pro League", "Al Ahli", "Spain", "CAM", 79, 78, 77, 76, 80, 62, 72],
  ["mendy_edouard", "Édouard Mendy", "Saudi Pro League", "Al Ahli", "Senegal", "GK", 82, 48, 16, 70, 44, 83, 80],
  ["demiral", "Merih Demiral", "Saudi Pro League", "Al Ahli", "Turkey", "CB", 79, 72, 38, 56, 62, 81, 84],
  ["ibanez", "Roger Ibañez", "Saudi Pro League", "Al Ahli", "Brazil", "CB", 80, 80, 45, 64, 68, 81, 81],
  ["aubameyang", "Pierre-Emerick Aubameyang", "Saudi Pro League", "Al Qadsiah", "Gabon", "ST", 81, 85, 82, 72, 78, 38, 68],
  ["nacho", "Nacho Fernández", "Saudi Pro League", "Al Qadsiah", "Spain", "CB", 81, 74, 40, 68, 68, 82, 79],
  ["casteels", "Koen Casteels", "Saudi Pro League", "Al Qadsiah", "Belgium", "GK", 82, 48, 18, 74, 46, 83, 78],
  ["nandez", "Nahitan Nández", "Saudi Pro League", "Al Qadsiah", "Uruguay", "CM", 78, 78, 68, 74, 76, 78, 83],
  ["al_dawsari", "Salem Al-Dawsari", "Saudi Pro League", "Al Hilal", "Saudi Arabia", "LW", 80, 82, 78, 78, 82, 50, 68],
  ["kanno", "Mohamed Kanno", "Saudi Pro League", "Al Hilal", "Saudi Arabia", "CM", 76, 72, 70, 75, 74, 74, 80],
  ["al_bulayhi", "Ali Al-Bulayhi", "Saudi Pro League", "Al Hilal", "Saudi Arabia", "CB", 76, 66, 38, 62, 60, 78, 82],
  ["abdulhamid", "Saud Abdulhamid", "Saudi Pro League", "Al Hilal", "Saudi Arabia", "RB", 77, 85, 58, 72, 75, 74, 76],
  ["al_najei", "Sami Al-Najei", "Saudi Pro League", "Al Nassr", "Saudi Arabia", "CM", 73, 74, 68, 74, 75, 64, 66],
  ["al_amri", "Abdulelah Al-Amri", "Saudi Pro League", "Al Ittihad", "Saudi Arabia", "CB", 74, 70, 36, 60, 62, 76, 76],
  ["al_owais", "Mohammed Al-Owais", "Saudi Pro League", "Al Hilal", "Saudi Arabia", "GK", 75, 48, 16, 68, 44, 76, 74],
  ["al_shehri", "Saleh Al-Shehri", "Saudi Pro League", "Al Ittihad", "Saudi Arabia", "ST", 74, 72, 75, 64, 72, 38, 74],
  ["al_juwayr", "Musab Al-Juwayr", "Saudi Pro League", "Al Shabab", "Saudi Arabia", "CM", 72, 70, 65, 74, 74, 66, 66],
  ["al_yami", "Hamad Al-Yami", "Saudi Pro League", "Al Hilal", "Saudi Arabia", "RB", 70, 78, 52, 66, 68, 68, 66],
  ["al_khaibari", "Abdullah Al-Khaibari", "Saudi Pro League", "Al Nassr", "Saudi Arabia", "CDM", 74, 68, 55, 72, 72, 76, 76],
  ["al_burayk", "Mohammed Al-Burayk", "Saudi Pro League", "Al Hilal", "Saudi Arabia", "RB", 74, 74, 62, 75, 73, 72, 70],
  ["al_hassan", "Ali Al-Hassan", "Saudi Pro League", "Al Nassr", "Saudi Arabia", "CM", 71, 68, 62, 70, 70, 70, 72],

  // ================= MLS =================
  ["messi", "Lionel Messi", "MLS", "Inter Miami", "Argentina", "RW", 97, 80, 93, 94, 95, 34, 64],
  ["suarez", "Luis Suárez", "MLS", "Inter Miami", "Uruguay", "ST", 86, 70, 88, 80, 81, 44, 76],
  ["busquets", "Sergio Busquets", "MLS", "Inter Miami", "Spain", "CDM", 84, 52, 64, 87, 80, 81, 72],
  ["alba_jordi", "Jordi Alba", "MLS", "Inter Miami", "Spain", "LB", 83, 82, 68, 83, 81, 75, 68],
  ["callender", "Drake Callender", "MLS", "Inter Miami", "USA", "GK", 76, 50, 16, 68, 44, 77, 76],
  ["reces", "Federico Redondo", "MLS", "Inter Miami", "Argentina", "CDM", 75, 68, 60, 76, 74, 74, 74],
  ["gomez_diego", "Diego Gómez", "MLS", "Inter Miami", "Paraguay", "CM", 76, 78, 72, 74, 76, 72, 76],
  ["rojas_matias", "Matías Rojas", "MLS", "Inter Miami", "Paraguay", "CAM", 77, 76, 80, 78, 78, 55, 70],
  ["aviles", "Tomás Avilés", "MLS", "Inter Miami", "Argentina", "CB", 73, 68, 35, 64, 64, 75, 75],
  ["weigandt", "Marcelo Weigandt", "MLS", "Inter Miami", "Argentina", "RB", 74, 75, 58, 68, 70, 73, 74],
  ["bouanga", "Denis Bouanga", "MLS", "LAFC", "Gabon", "LW", 83, 89, 82, 74, 82, 45, 78],
  ["lloris", "Hugo Lloris", "MLS", "LAFC", "France", "GK", 82, 48, 18, 74, 46, 83, 75],
  ["giroud", "Olivier Giroud", "MLS", "LAFC", "France", "ST", 81, 62, 83, 72, 74, 40, 84],
  ["bogusz", "Mateusz Bogusz", "MLS", "LAFC", "Poland", "CAM", 77, 78, 76, 76, 79, 58, 72],
  ["hollingshead", "Ryan Hollingshead", "MLS", "LAFC", "USA", "LB", 75, 74, 66, 70, 72, 72, 75],
  ["reus", "Marco Reus", "MLS", "LA Galaxy", "Germany", "CAM", 82, 74, 82, 83, 83, 48, 64],
  ["puig", "Riqui Puig", "MLS", "LA Galaxy", "Spain", "CM", 81, 76, 72, 84, 86, 62, 60],
  ["pec", "Gabriel Pec", "MLS", "LA Galaxy", "Brazil", "RW", 78, 85, 75, 72, 80, 45, 68],
  ["paintsil", "Joseph Paintsil", "MLS", "LA Galaxy", "Ghana", "LW", 79, 92, 76, 71, 80, 40, 72],
  ["yoshida", "Maya Yoshida", "MLS", "LA Galaxy", "Japan", "CB", 75, 55, 42, 64, 62, 76, 78],
  ["cucho", "Cucho Hernández", "MLS", "Columbus Crew", "Colombia", "ST", 82, 82, 83, 76, 82, 45, 78],
  ["rossi_diego", "Diego Rossi", "MLS", "Columbus Crew", "Uruguay", "LW", 79, 84, 78, 74, 80, 42, 65],
  ["nagbe", "Darlington Nagbe", "MLS", "Columbus Crew", "USA", "CM", 78, 74, 66, 80, 82, 72, 72],
  ["morris_aidan", "Sean Zawadzki", "MLS", "Columbus Crew", "USA", "CDM", 73, 70, 58, 72, 70, 74, 74],
  ["schulte", "Patrick Schulte", "MLS", "Columbus Crew", "USA", "GK", 75, 50, 18, 72, 46, 76, 74],
  ["acosta_lucho", "Luciano Acosta", "MLS", "FC Cincinnati", "Argentina", "CAM", 82, 80, 78, 83, 86, 45, 58],
  ["evander", "Evander Ferreira", "MLS", "Portland Timbers", "Brazil", "CAM", 81, 74, 80, 82, 83, 60, 74],
  ["benteke", "Christian Benteke", "MLS", "D.C. United", "Belgium", "ST", 80, 68, 82, 66, 72, 40, 88],
  ["forsberg", "Emil Forsberg", "MLS", "New York Red Bulls", "Sweden", "CAM", 80, 72, 78, 82, 81, 55, 65],
  ["mukhtar", "Hany Mukhtar", "MLS", "Nashville SC", "Germany", "CAM", 80, 82, 79, 78, 82, 45, 66],
  ["gauld", "Ryan Gauld", "MLS", "Vancouver Whitecaps", "Scotland", "CAM", 79, 76, 76, 81, 80, 58, 66],
  ["gil_carles", "Carles Gil", "MLS", "New England Revolution", "Spain", "CAM", 80, 74, 75, 83, 82, 50, 60],
  ["insigne", "Lorenzo Insigne", "MLS", "Toronto FC", "Italy", "LW", 80, 78, 78, 81, 84, 36, 56],
  ["bernardeschi", "Federico Bernardeschi", "MLS", "Toronto FC", "Italy", "RW", 79, 78, 78, 79, 81, 55, 72],
  ["burki", "Roman Bürki", "MLS", "St. Louis City", "Switzerland", "GK", 80, 48, 18, 75, 46, 81, 76],
  ["freese", "Matt Freese", "MLS", "NYCFC", "USA", "GK", 75, 48, 16, 68, 44, 76, 75],
  ["robinson_miles", "Miles Robinson", "MLS", "FC Cincinnati", "USA", "CB", 77, 78, 35, 58, 62, 78, 80],
  ["zimmerman", "Walker Zimmerman", "MLS", "Nashville SC", "USA", "CB", 77, 65, 42, 60, 62, 78, 83],
  ["surridge", "Sam Surridge", "MLS", "Nashville SC", "England", "ST", 76, 75, 77, 64, 72, 38, 78],
  ["arango_chicho", "Cristian Arango", "MLS", "Real Salt Lake", "Colombia", "ST", 79, 78, 80, 70, 77, 44, 78],
  ["gomez_andres", "Diego Luna", "MLS", "Real Salt Lake", "USA", "CAM", 75, 74, 72, 76, 78, 52, 66],
  ["morris_jordan", "Jordan Morris", "MLS", "Seattle Sounders", "USA", "ST", 77, 85, 76, 68, 74, 52, 78],
  ["frei", "Stefan Frei", "MLS", "Seattle Sounders", "Switzerland", "GK", 76, 45, 18, 70, 44, 77, 75],
  ["crepeau", "Maxime Crépeau", "MLS", "Portland Timbers", "Canada", "GK", 75, 48, 18, 70, 45, 76, 74],
  ["buck_noel", "Noel Buck", "MLS", "New England Revolution", "England", "CM", 69, 70, 64, 70, 71, 64, 68],
  ["cavan_sullivan", "Cavan Sullivan", "MLS", "Philadelphia Union", "USA", "CAM", 65, 76, 62, 68, 74, 38, 50],
  ["berhalter_seb", "Sebastian Berhalter", "MLS", "Vancouver Whitecaps", "USA", "CM", 71, 70, 62, 72, 70, 68, 70],

  // ================= EGYPTIAN PREMIER LEAGUE =================
  ["zizo", "Ahmed Sayed Zizo", "Egyptian Premier League", "Zamalek", "Egypt", "RW", 85, 87, 82, 84, 86, 58, 75],
  ["ashour", "Emam Ashour", "Egyptian Premier League", "Al Ahly", "Egypt", "CM", 84, 82, 80, 83, 83, 76, 82],
  ["el_shenawy_m", "Mohamed El Shenawy", "Egyptian Premier League", "Al Ahly", "Egypt", "GK", 83, 50, 20, 75, 48, 84, 84],
  ["tau_percy", "Percy Tau", "Egyptian Premier League", "Al Ahly", "South Africa", "RW", 81, 85, 78, 77, 83, 45, 68],
  ["el_shahat", "Hussein El Shahat", "Egyptian Premier League", "Al Ahly", "Egypt", "LW", 80, 82, 78, 78, 82, 48, 68],
  ["afsha", "Mohamed Magdy Afsha", "Egyptian Premier League", "Al Ahly", "Egypt", "CAM", 80, 72, 78, 83, 81, 55, 66],
  ["attia_marwan", "Marwan Attia", "Egyptian Premier League", "Al Ahly", "Egypt", "CDM", 80, 74, 66, 79, 77, 80, 80],
  ["maaloul", "Ali Maâloul", "Egyptian Premier League", "Al Ahly", "Tunisia", "LB", 81, 76, 75, 84, 79, 74, 72],
  ["abdelmonem", "Mohamed Abdelmonem", "Egyptian Premier League", "Al Ahly", "Egypt", "CB", 82, 78, 45, 70, 72, 83, 82],
  ["rabia", "Ramy Rabia", "Egyptian Premier League", "Al Ahly", "Egypt", "CB", 78, 68, 48, 66, 65, 79, 80],
  ["ibrahim_yasser", "Yasser Ibrahim", "Egyptian Premier League", "Al Ahly", "Egypt", "CB", 78, 66, 42, 60, 62, 80, 84],
  ["hany_m", "Mohamed Hany", "Egyptian Premier League", "Al Ahly", "Egypt", "RB", 77, 79, 55, 72, 74, 75, 75],
  ["kamal_omar", "Omar Kamal", "Egyptian Premier League", "Al Ahly", "Egypt", "RB", 78, 82, 72, 74, 77, 72, 74],
  ["taher_mohamed", "Taher Mohamed Taher", "Egyptian Premier League", "Al Ahly", "Egypt", "RW", 77, 82, 75, 72, 76, 58, 80],
  ["shobeir_mostafa", "Mostafa Shobeir", "Egyptian Premier League", "Al Ahly", "Egypt", "GK", 78, 52, 18, 72, 46, 79, 76],
  ["kahraba", "Mahmoud Kahraba", "Egyptian Premier League", "Al Ahly", "Egypt", "ST", 78, 82, 79, 72, 80, 42, 74],
  ["slim_reda", "Reda Slim", "Egyptian Premier League", "Al Ahly", "Morocco", "LW", 78, 84, 75, 76, 81, 42, 66],
  ["akram_tawfik", "Akram Tawfik", "Egyptian Premier League", "Al Ahly", "Egypt", "RB", 78, 78, 60, 72, 74, 79, 84],
  ["kouka_ahmed", "Ahmed Nabil Kouka", "Egyptian Premier League", "Al Ahly", "Egypt", "CM", 75, 74, 65, 76, 74, 74, 72],
  ["shikabala", "Mahmoud Shikabala", "Egyptian Premier League", "Zamalek", "Egypt", "RW", 79, 70, 80, 83, 84, 38, 62],
  ["jaziri", "Seifeddine Jaziri", "Egyptian Premier League", "Zamalek", "Tunisia", "ST", 78, 80, 78, 68, 76, 44, 78],
  ["fatouh", "Ahmed Fatouh", "Egyptian Premier League", "Zamalek", "Egypt", "LB", 79, 81, 62, 78, 80, 76, 72],
  ["dunga", "Nabil Emad Dunga", "Egyptian Premier League", "Zamalek", "Egypt", "CDM", 78, 70, 66, 75, 73, 79, 82],
  ["abdelmaguid", "Hossam Abdelmaguid", "Egyptian Premier League", "Zamalek", "Egypt", "CB", 77, 65, 40, 62, 62, 79, 84],
  ["sobhy_m", "Mohamed Sobhy", "Egyptian Premier League", "Zamalek", "Egypt", "GK", 76, 50, 18, 70, 45, 77, 75],
  ["mathlouthi", "Hamza Mathlouthi", "Egyptian Premier League", "Zamalek", "Tunisia", "CB", 77, 72, 52, 70, 70, 78, 78],
  ["maher_nasser", "Nasser Maher", "Egyptian Premier League", "Zamalek", "Egypt", "CAM", 77, 76, 74, 79, 80, 52, 65],
  ["shehata_m", "Mohamed Shehata", "Egyptian Premier League", "Zamalek", "Egypt", "CM", 76, 76, 68, 75, 76, 74, 74],
  ["shalaby_mostafa", "Mostafa Shalaby", "Egyptian Premier League", "Zamalek", "Egypt", "LW", 76, 82, 74, 72, 78, 44, 72],
  ["awad_m", "Mohamed Awad", "Egyptian Premier League", "Zamalek", "Egypt", "GK", 76, 48, 16, 68, 45, 77, 74],
  ["omran_ziad", "Ziad Kamal", "Egyptian Premier League", "Zamalek", "Egypt", "CDM", 73, 70, 62, 72, 72, 74, 75],
  ["ramadan_sobhi", "Ramadan Sobhi", "Egyptian Premier League", "Pyramids FC", "Egypt", "LW", 81, 80, 78, 79, 83, 55, 78],
  ["ibrahim_adel", "Ibrahim Adel", "Egyptian Premier League", "Pyramids FC", "Egypt", "LW", 81, 86, 79, 76, 84, 45, 68],
  ["fathi_mostafa", "Mostafa Fathi", "Egyptian Premier League", "Pyramids FC", "Egypt", "RW", 81, 84, 79, 80, 84, 42, 62],
  ["mayele", "Fiston Mayele", "Egyptian Premier League", "Pyramids FC", "DR Congo", "ST", 80, 82, 81, 66, 76, 40, 84],
  ["toure_blati", "Blati Touré", "Egyptian Premier League", "Pyramids FC", "Burkina Faso", "CDM", 80, 76, 68, 76, 78, 80, 82],
  ["el_shenawy_a", "Ahmed El Shenawy", "Egyptian Premier League", "Pyramids FC", "Egypt", "GK", 79, 48, 18, 72, 45, 80, 78],
  ["el_karti", "Walid El Karti", "Egyptian Premier League", "Pyramids FC", "Morocco", "CM", 79, 74, 75, 79, 78, 75, 76],
  ["samy_ahmed", "Ahmed Samy", "Egyptian Premier League", "Pyramids FC", "Egypt", "CB", 77, 65, 42, 64, 64, 78, 80],
  ["chibi", "Mohamed Chibi", "Egyptian Premier League", "Pyramids FC", "Morocco", "RB", 79, 82, 68, 80, 78, 74, 72],
  ["hamdy_m", "Mohamed Hamdy", "Egyptian Premier League", "Pyramids FC", "Egypt", "LB", 77, 78, 58, 72, 74, 75, 74],
  ["gabr_ali", "Ali Gabr", "Egyptian Premier League", "Pyramids FC", "Egypt", "CB", 75, 58, 38, 56, 58, 77, 82],
  ["mabululu", "Agostinho Mabululu", "Egyptian Premier League", "Al Ittihad Alexandria", "Angola", "ST", 78, 80, 80, 64, 74, 42, 84],
  ["oufa_ahmed", "Ahmed Amin Oufa", "Egyptian Premier League", "ENPPI", "Egypt", "ST", 76, 76, 77, 62, 72, 38, 82],
  ["bobo", "Mohamed Reda Bobo", "Egyptian Premier League", "Pyramids FC", "Egypt", "CM", 77, 76, 72, 77, 78, 70, 72],
  ["fawzy_m", "Mohamed Fawzy", "Egyptian Premier League", "Ismaily", "Egypt", "GK", 73, 48, 16, 66, 42, 74, 72],
  ["farag_abdel", "Abdelrahman Magdy", "Egyptian Premier League", "Pyramids FC", "Egypt", "RW", 76, 82, 75, 75, 78, 48, 70],
  ["salifu", "Moro Salifu", "Egyptian Premier League", "Al Ittihad Alexandria", "Ghana", "CDM", 74, 70, 60, 70, 70, 76, 80],
  ["el_gezzawy", "Omar El Gezzawy", "Egyptian Premier League", "Modern Sport", "Egypt", "ST", 72, 76, 72, 60, 70, 36, 74],
  ["el_weshahi", "Ahmed El Weshahi", "Egyptian Premier League", "Ghazl El Mahalla", "Egypt", "CB", 68, 62, 32, 54, 56, 70, 74],
  ["barakat_m", "Mohamed Barakat Jr", "Egyptian Premier League", "Al Masry", "Egypt", "LW", 67, 76, 65, 64, 70, 38, 60],
  ["shabana_m", "Mahmoud Shabana", "Egyptian Premier League", "Smouha", "Egypt", "CB", 71, 60, 34, 56, 58, 73, 76],
  ["gamal_islam", "Islam Gamal", "Egyptian Premier League", "Pharco", "Egypt", "CB", 70, 58, 35, 54, 56, 72, 76],
  ["saad_samir", "Saad Samir", "Egyptian Premier League", "Ceramica Cleopatra", "Egypt", "CB", 72, 54, 40, 58, 58, 74, 78],
  ["kendouci", "Ahmed Kendouci", "Egyptian Premier League", "Ceramica Cleopatra", "Algeria", "CM", 78, 75, 76, 78, 79, 72, 76],
  ["rayan_ahmed", "Ahmed Yasser Rayan", "Egyptian Premier League", "Ceramica Cleopatra", "Egypt", "ST", 76, 76, 78, 64, 74, 38, 76],
  ["ebuka_john", "John Ebuka", "Egyptian Premier League", "Ceramica Cleopatra", "Nigeria", "ST", 76, 80, 77, 62, 74, 40, 82],
  ["bassam_m", "Mohamed Bassam", "Egyptian Premier League", "Ceramica Cleopatra", "Egypt", "GK", 76, 48, 18, 68, 44, 77, 75],
  ["samuel_amadi", "Samuel Amadi", "Egyptian Premier League", "Ceramica Cleopatra", "Nigeria", "LW", 74, 84, 70, 68, 76, 38, 68],
  ["belhadji", "Ahmed Belhadji", "Egyptian Premier League", "Ceramica Cleopatra", "Morocco", "CAM", 75, 74, 74, 76, 78, 50, 64],
  ["geddo_jr", "Mohamed Nagy Geddo Jr", "Egyptian Premier League", "Petrojet", "Egypt", "ST", 64, 72, 65, 56, 64, 32, 68],
  ["hassan_sayed", "Sayed Hassan", "Egyptian Premier League", "Haras El Hodood", "Egypt", "RB", 63, 72, 48, 60, 62, 64, 66]
];

console.log("Total unique players defined:", rawPlayers.length);

// Map into full objects with calculated tier and market value
const playerDatabase = rawPlayers.map(p => {
  const [id, name, league, club, nation, pos, rating, pace, sho, pas, dri, def, phy] = p;
  const tier = getTier(rating);
  const value = getValue(rating, pos);
  return {
    id,
    name,
    league,
    club,
    nation,
    position: pos,
    rating,
    tier,
    pace,
    shooting: sho,
    passing: pas,
    dribbling: dri,
    defending: def,
    physical: phy,
    value
  };
});

// Output code string
const fileContent = `/**
 * MAZAD — Football Auction Game Database
 * Authentic, multi-league database with 400+ players across 8 leagues:
 * Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Saudi Pro League, MLS, Egyptian Premier League.
 */

export const PLAYER_DATABASE = ${JSON.stringify(playerDatabase, null, 2)};

export const LEAGUES = [
  "ALL LEAGUES",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Saudi Pro League",
  "MLS",
  "Egyptian Premier League"
];

/**
 * Filter players by league pool
 */
export function getPlayersByLeague(league = "ALL LEAGUES") {
  if (!league || typeof league !== "string" || league === "ALL LEAGUES" || league.toLowerCase() === "all" || league.toLowerCase() === "all leagues") {
    return PLAYER_DATABASE;
  }
  const cleanLeague = league.toLowerCase().trim();
  const filtered = PLAYER_DATABASE.filter(p => p.league && p.league.toLowerCase() === cleanLeague);
  return filtered.length ? filtered : PLAYER_DATABASE;
}

/**
 * Filter players by position within a selected league pool
 */
export function getPlayersByPosition(targetPosition, league = "ALL LEAGUES") {
  const pool = getPlayersByLeague(league);

  // Position flexibility mappings
  if (targetPosition === "RM") {
    const list = pool.filter(p => p.position === "RW" || p.position === "RM");
    return list.length ? list : pool.filter(p => p.position === "RW");
  }
  if (targetPosition === "LM") {
    const list = pool.filter(p => p.position === "LW" || p.position === "LM");
    return list.length ? list : pool.filter(p => p.position === "LW");
  }
  if (targetPosition === "CAM") {
    const list = pool.filter(p => p.position === "CAM" || p.position === "CM");
    return list.length ? list : pool.filter(p => p.position === "CM");
  }
  if (targetPosition === "CDM") {
    const list = pool.filter(p => p.position === "CDM" || p.position === "CM");
    return list.length ? list : pool.filter(p => p.position === "CM");
  }
  if (targetPosition === "RB") {
    const list = pool.filter(p => p.position === "RB");
    return list.length ? list : pool.filter(p => p.position === "CB" || p.position === "LB");
  }
  if (targetPosition === "LB") {
    const list = pool.filter(p => p.position === "LB");
    return list.length ? list : pool.filter(p => p.position === "CB" || p.position === "RB");
  }

  const direct = pool.filter(p => p.position === targetPosition);
  if (direct.length) return direct;

  // Fallback to broader database if a specific small league is sparse in this exact position
  return PLAYER_DATABASE.filter(p => p.position === targetPosition);
}

/**
 * Starting bid calculation based on quality (Requirement #27)
 */
export function calculateStartingPrice(player) {
  const r = player.rating;
  let basePrice = 1;
  if (r >= 95) basePrice = 40 + Math.floor(Math.random() * 8);
  else if (r >= 90) basePrice = 30 + Math.floor(Math.random() * 6);
  else if (r >= 85) basePrice = 20 + Math.floor(Math.random() * 5);
  else if (r >= 80) basePrice = 15 + Math.floor(Math.random() * 4);
  else if (r >= 75) basePrice = 10 + Math.floor(Math.random() * 3);
  else if (r >= 70) basePrice = 5 + Math.floor(Math.random() * 3);
  else basePrice = 1 + Math.floor(Math.random() * 2);

  return Math.max(1, basePrice);
}

/**
 * Selects an exciting candidate player for the auction round from the active league pool.
 */
export function getAuctionCandidate(targetPosition, arg2 = "ALL LEAGUES", arg3 = []) {
  let league = "ALL LEAGUES";
  let excludedIds = [];

  if (Array.isArray(arg2)) {
    excludedIds = arg2;
    if (typeof arg3 === "string") league = arg3;
  } else {
    if (typeof arg2 === "string") league = arg2;
    if (Array.isArray(arg3)) excludedIds = arg3;
  }

  const eligible = getPlayersByPosition(targetPosition, league).filter(p => !excludedIds.includes(p.id));
  if (!eligible.length) {
    const fallback = getPlayersByPosition(targetPosition, "ALL LEAGUES").filter(p => !excludedIds.includes(p.id));
    return fallback[0] || PLAYER_DATABASE.find(p => !excludedIds.includes(p.id)) || PLAYER_DATABASE[0];
  }

  // Weight towards high tiers for auction excitement
  const weights = eligible.map(p => {
    if (p.rating >= 95) return 50;
    if (p.rating >= 90) return 40;
    if (p.rating >= 85) return 30;
    if (p.rating >= 80) return 20;
    if (p.rating >= 75) return 12;
    return 6;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let randomVal = Math.random() * totalWeight;

  for (let i = 0; i < eligible.length; i++) {
    randomVal -= weights[i];
    if (randomVal <= 0) {
      return eligible[i];
    }
  }

  return eligible[0];
}

/**
 * Weighted Random Free Player System (Requirements #14-16)
 * Probability distribution:
 * Legendary / Superstar (95+): 3%
 * World Class (90-94): 7%
 * Elite (85-89): 12%
 * Very Good (80-84): 18%
 * Good (75-79): 25%
 * Average (70-74): 20%
 * Below Average (65-69): 10%
 * Weak (60-64): 4%
 * Very Weak (<60): 1%
 */
export function getRandomFreePlayer(targetPosition, arg2 = "ALL LEAGUES", arg3 = []) {
  let league = "ALL LEAGUES";
  let excludedIds = [];

  if (Array.isArray(arg2)) {
    excludedIds = arg2;
    if (typeof arg3 === "string") league = arg3;
  } else {
    if (typeof arg2 === "string") league = arg2;
    if (Array.isArray(arg3)) excludedIds = arg3;
  }

  const pool = getPlayersByPosition(targetPosition, league).filter(p => !excludedIds.includes(p.id));
  const candidatePool = pool.length ? pool : getPlayersByPosition(targetPosition, "ALL LEAGUES").filter(p => !excludedIds.includes(p.id));

  if (!candidatePool.length) {
    const allMatching = PLAYER_DATABASE.filter(p => p.position === targetPosition);
    const fallback = allMatching[Math.floor(Math.random() * allMatching.length)] || PLAYER_DATABASE[0];
    return { ...fallback, player: fallback, luckText: "AVERAGE LUCK ⚖️", luckClass: "luck-average" };
  }

  const rand = Math.random() * 100;
  let targetTier;
  let luckText = "AVERAGE LUCK";
  let luckClass = "luck-average";

  if (rand < 3) {
    targetTier = "Legendary / Superstar";
    luckText = "INSANE LUCK! 🌟";
    luckClass = "luck-insane";
  } else if (rand < 10) {
    targetTier = "World Class";
    luckText = "GREAT LUCK! 🔥";
    luckClass = "luck-great";
  } else if (rand < 22) {
    targetTier = "Elite";
    luckText = "GREAT LUCK! ⚡";
    luckClass = "luck-great";
  } else if (rand < 40) {
    targetTier = "Very Good";
    luckText = "GOOD LUCK! ✨";
    luckClass = "luck-good";
  } else if (rand < 65) {
    targetTier = "Good";
    luckText = "DECENT DRAW 👍";
    luckClass = "luck-good";
  } else if (rand < 85) {
    targetTier = "Average";
    luckText = "AVERAGE LUCK ⚖️";
    luckClass = "luck-average";
  } else if (rand < 95) {
    targetTier = "Below Average";
    luckText = "BAD LUCK 📉";
    luckClass = "luck-bad";
  } else {
    targetTier = "Weak";
    luckText = "TERRIBLE LUCK! 💀";
    luckClass = "luck-terrible";
  }

  let matches = candidatePool.filter(p => p.tier === targetTier);
  if (!matches.length) {
    // If exact tier not in this position pool, pick closest rating available
    matches = candidatePool;
  }

  const player = matches[Math.floor(Math.random() * matches.length)] || candidatePool[0] || PLAYER_DATABASE[0];
  
  // Refine luck assessment by actual rating
  if (player.rating >= 94) {
    luckText = "INSANE LUCK! 🌟";
    luckClass = "luck-insane";
  } else if (player.rating >= 85) {
    luckText = "GREAT LUCK! 🔥";
    luckClass = "luck-great";
  } else if (player.rating >= 80) {
    luckText = "GOOD LUCK! ✨";
    luckClass = "luck-good";
  } else if (player.rating >= 72) {
    luckText = "AVERAGE LUCK ⚖️";
    luckClass = "luck-average";
  } else if (player.rating >= 65) {
    luckText = "BAD DRAW 📉";
    luckClass = "luck-bad";
  } else {
    luckText = "TERRIBLE LUCK! 💀";
    luckClass = "luck-terrible";
  }

  return { ...player, player, luckText, luckClass };
}

/**
 * Calculates weighted performance of a player based on position
 */
export function calculateWeightedPerformance(player, slotPosition = null) {
  const pos = slotPosition || player.position;
  let score = 0;

  switch (pos) {
    case "GK":
      score = player.rating * 0.45 + player.defending * 0.35 + player.physical * 0.15 + player.passing * 0.05;
      break;
    case "CB":
      score = player.rating * 0.35 + player.defending * 0.35 + player.physical * 0.20 + player.pace * 0.10;
      break;
    case "RB":
    case "LB":
      score = player.rating * 0.30 + player.defending * 0.25 + player.pace * 0.25 + player.physical * 0.10 + player.passing * 0.10;
      break;
    case "CDM":
      score = player.rating * 0.35 + player.defending * 0.30 + player.physical * 0.20 + player.passing * 0.15;
      break;
    case "CM":
      score = player.rating * 0.30 + player.passing * 0.25 + player.dribbling * 0.20 + player.physical * 0.15 + player.shooting * 0.10;
      break;
    case "CAM":
      score = player.rating * 0.30 + player.passing * 0.25 + player.dribbling * 0.25 + player.shooting * 0.15 + player.pace * 0.05;
      break;
    case "RW":
    case "LW":
    case "RM":
    case "LM":
      score = player.rating * 0.30 + player.pace * 0.30 + player.dribbling * 0.20 + player.shooting * 0.15 + player.passing * 0.05;
      break;
    case "ST":
      score = player.rating * 0.35 + player.shooting * 0.35 + player.pace * 0.15 + player.physical * 0.10 + player.dribbling * 0.05;
      break;
    default:
      score = player.rating;
  }

  return Math.round(score);
}
`;

fs.writeFileSync(path.join(process.cwd(), "src/js/database.js"), fileContent, "utf-8");
console.log("Successfully wrote src/js/database.js! Total count:", playerDatabase.length);
