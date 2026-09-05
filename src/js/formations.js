/**
 * MAZAD — Formations & Pitch Coordinate Definitions
 * Defines 11-player tactical slots, positions, and percentage-based coordinates
 * for realistic pitch presentation.
 */

export const FORMATIONS = {
  "4-3-3": {
    name: "4-3-3",
    description: "Balanced attacking setup with wingers and a dynamic midfield trio.",
    slots: [
      { round: 1, position: "GK", label: "GK", x: 50, y: 88 },
      { round: 2, position: "RB", label: "RB", x: 86, y: 70 },
      { round: 3, position: "CB", label: "RCB", x: 62, y: 72 },
      { round: 4, position: "CB", label: "LCB", x: 38, y: 72 },
      { round: 5, position: "LB", label: "LB", x: 14, y: 70 },
      { round: 6, position: "CDM", label: "CDM", x: 50, y: 54 },
      { round: 7, position: "CM", label: "RCM", x: 72, y: 44 },
      { round: 8, position: "CM", label: "LCM", x: 28, y: 44 },
      { round: 9, position: "RW", label: "RW", x: 84, y: 22 },
      { round: 10, position: "LW", label: "LW", x: 16, y: 22 },
      { round: 11, position: "ST", label: "ST", x: 50, y: 14 }
    ]
  },
  "4-4-2": {
    name: "4-4-2",
    description: "Classic dual-striker system with disciplined wide midfielders.",
    slots: [
      { round: 1, position: "GK", label: "GK", x: 50, y: 88 },
      { round: 2, position: "RB", label: "RB", x: 86, y: 70 },
      { round: 3, position: "CB", label: "RCB", x: 62, y: 72 },
      { round: 4, position: "CB", label: "LCB", x: 38, y: 72 },
      { round: 5, position: "LB", label: "LB", x: 14, y: 70 },
      { round: 6, position: "RM", label: "RM", x: 86, y: 46 },
      { round: 7, position: "CM", label: "RCM", x: 62, y: 48 },
      { round: 8, position: "CM", label: "LCM", x: 38, y: 48 },
      { round: 9, position: "LM", label: "LM", x: 14, y: 46 },
      { round: 10, position: "ST", label: "RST", x: 62, y: 16 },
      { round: 11, position: "ST", label: "LST", x: 38, y: 16 }
    ]
  },
  "4-2-3-1": {
    name: "4-2-3-1",
    description: "Modern meta formation with double pivot shield and creative #10 playmaker.",
    slots: [
      { round: 1, position: "GK", label: "GK", x: 50, y: 88 },
      { round: 2, position: "RB", label: "RB", x: 86, y: 70 },
      { round: 3, position: "CB", label: "RCB", x: 62, y: 72 },
      { round: 4, position: "CB", label: "LCB", x: 38, y: 72 },
      { round: 5, position: "LB", label: "LB", x: 14, y: 70 },
      { round: 6, position: "CDM", label: "RDM", x: 64, y: 56 },
      { round: 7, position: "CDM", label: "LDM", x: 36, y: 56 },
      { round: 8, position: "CAM", label: "CAM", x: 50, y: 38 },
      { round: 9, position: "RW", label: "RAM", x: 82, y: 32 },
      { round: 10, position: "LW", label: "LAM", x: 18, y: 32 },
      { round: 11, position: "ST", label: "ST", x: 50, y: 14 }
    ]
  },
  "3-5-2": {
    name: "3-5-2",
    description: "Solid three-man defense with complete wingback coverage and two focal strikers.",
    slots: [
      { round: 1, position: "GK", label: "GK", x: 50, y: 88 },
      { round: 2, position: "CB", label: "RCB", x: 74, y: 72 },
      { round: 3, position: "CB", label: "CB", x: 50, y: 74 },
      { round: 4, position: "CB", label: "LCB", x: 26, y: 72 },
      { round: 5, position: "RM", label: "RWB", x: 88, y: 48 },
      { round: 6, position: "CDM", label: "CDM", x: 50, y: 56 },
      { round: 7, position: "CM", label: "RCM", x: 66, y: 42 },
      { round: 8, position: "CM", label: "LCM", x: 34, y: 42 },
      { round: 9, position: "LM", label: "LWB", x: 12, y: 48 },
      { round: 10, position: "ST", label: "RST", x: 62, y: 16 },
      { round: 11, position: "ST", label: "LST", x: 38, y: 16 }
    ]
  },
  "4-3-2-1": {
    name: "4-3-2-1",
    description: "The famed 'Christmas Tree' formation: narrow play, central dominance and twin CAMs.",
    slots: [
      { round: 1, position: "GK", label: "GK", x: 50, y: 88 },
      { round: 2, position: "RB", label: "RB", x: 86, y: 70 },
      { round: 3, position: "CB", label: "RCB", x: 62, y: 72 },
      { round: 4, position: "CB", label: "LCB", x: 38, y: 72 },
      { round: 5, position: "LB", label: "LB", x: 14, y: 70 },
      { round: 6, position: "CM", label: "RCM", x: 74, y: 52 },
      { round: 7, position: "CDM", label: "CCM", x: 50, y: 56 },
      { round: 8, position: "CM", label: "LCM", x: 26, y: 52 },
      { round: 9, position: "CAM", label: "RCAM", x: 64, y: 32 },
      { round: 10, position: "CAM", label: "LCAM", x: 36, y: 32 },
      { round: 11, position: "ST", label: "ST", x: 50, y: 14 }
    ]
  }
};
