/**
 * MAZAD — Firebase Realtime Multiplayer Service
 * 
 * Provides real-time synchronization for 2-player online matches via Firebase Realtime Database & Auth.
 * Features:
 * - Room generation with 6-char codes (e.g. M7K4PX)
 * - Atomic turn-based bidding and pass transactions
 * - Host setting synchronization
 * - Single-source auction candidate and lucky draw resolution
 * - Heartbeat & connection presence monitoring
 * - Reconnection support via session caching
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  onValue, 
  off, 
  runTransaction, 
  onDisconnect, 
  serverTimestamp 
} from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

export class FirebaseMultiplayerService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.currentRoomCode = null;
    this.playerRole = null; // "player1" (host) or "player2" (guest)
    this.roomRef = null;
    this.roomListenerUnsub = null;
    this.connectedListenerUnsub = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.initError = null;
  }

  /**
   * Initializes Firebase App, Auth, and Realtime Database
   */
  async init() {
    if (this.isInitialized && this.app && this.db) {
      return { success: true };
    }

    const config = getFirebaseConfig();
    if (!isFirebaseConfigured()) {
      this.initError = "Firebase credentials not configured.";
      return { success: false, unconfigured: true, message: this.initError };
    }

    try {
      if (!getApps().length) {
        this.app = initializeApp(config);
      } else {
        this.app = getApp();
      }

      this.auth = getAuth(this.app);
      this.db = getDatabase(this.app);

      // Authenticate anonymously
      const authResult = await signInAnonymously(this.auth);
      this.currentUser = authResult.user;

      this.isInitialized = true;
      this.initError = null;

      // Monitor connection state
      const connectedRef = ref(this.db, ".info/connected");
      this.connectedListenerUnsub = onValue(connectedRef, (snap) => {
        this.isConnected = Boolean(snap.val());
      });

      return { success: true, user: this.currentUser };
    } catch (err) {
      console.error("Firebase initialization failed:", err);
      this.initError = err.message || "Failed to initialize Firebase";
      return { success: false, message: this.initError };
    }
  }

  /**
   * Generates a unique 6-character room code (e.g. M7K4PX)
   */
  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Creates a new multiplayer room as Host (Player 1)
   */
  async createRoom(hostName, gameSettings) {
    const initRes = await this.init();
    if (!initRes.success) {
      return { success: false, error: initRes.message, unconfigured: initRes.unconfigured };
    }

    const userId = this.currentUser.uid;
    const roomCode = this.generateRoomCode();
    const roomPath = `rooms/${roomCode}`;
    const roomDatabaseRef = ref(this.db, roomPath);

    const initialRoomData = {
      code: roomCode,
      status: "waiting", // waiting | lobby | auction | review | match | finished | cancelled
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      hostId: userId,
      
      player1: {
        id: userId,
        name: hostName || "Player 1",
        connected: true,
        ready: true,
        budget: gameSettings.startingBudget || 200,
        squad: [],
        lastSeen: serverTimestamp()
      },

      player2: {
        id: null,
        name: "Waiting for opponent...",
        connected: false,
        ready: false,
        budget: gameSettings.startingBudget || 200,
        squad: [],
        lastSeen: null
      },

      gameSettings: {
        startingBudget: gameSettings.startingBudget || 200,
        league: gameSettings.league || "ALL LEAGUES",
        formation: gameSettings.formation || "4-3-3",
        timer: gameSettings.timer !== undefined ? gameSettings.timer : 10,
        matchSpeed: gameSettings.matchSpeed || 1
      },

      gameState: {
        roundNumber: 1,
        currentSlot: null,
        currentAuctionPlayer: null,
        currentBid: 10,
        initialBid: 10,
        highestBidder: null,
        currentTurn: "player1",
        p1Passed: false,
        p2Passed: false,
        turnStartedAt: null,
        turnDuration: gameSettings.timer !== undefined ? gameSettings.timer : 10,
        phase: "idle", // idle | bidding | result | complete
        lastRoundResult: null,
        usedPlayerIds: [],
        bidHistory: []
      },

      matchState: {
        started: false,
        finished: false,
        minute: 0,
        t1Score: 0,
        t2Score: 0,
        t1Tactic: "BALANCED",
        t2Tactic: "BALANCED",
        events: [],
        stats: null,
        winner: null,
        shootout: null,
        mvp: null
      }
    };

    try {
      await set(roomDatabaseRef, initialRoomData);

      // Setup disconnect handler
      const p1ConnectedRef = ref(this.db, `${roomPath}/player1/connected`);
      onDisconnect(p1ConnectedRef).set(false);

      this.currentRoomCode = roomCode;
      this.playerRole = "player1";
      this.roomRef = roomDatabaseRef;

      // Save local session
      this.saveLocalSession(roomCode, "player1", hostName);

      return { success: true, roomCode, role: "player1", roomData: initialRoomData };
    } catch (err) {
      console.error("Error creating room in Firebase:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Joins an existing multiplayer room as Guest (Player 2)
   */
  async joinRoom(roomCode, guestName) {
    const cleanCode = String(roomCode || "").trim().toUpperCase();
    if (cleanCode.length !== 6) {
      return { success: false, error: "Please enter a valid 6-character room code." };
    }

    const initRes = await this.init();
    if (!initRes.success) {
      return { success: false, error: initRes.message, unconfigured: initRes.unconfigured };
    }

    const userId = this.currentUser.uid;
    const roomPath = `rooms/${cleanCode}`;
    const roomDatabaseRef = ref(this.db, roomPath);

    try {
      const snap = await get(roomDatabaseRef);
      if (!snap.exists()) {
        return { success: false, error: `Room "${cleanCode}" was not found. Please check the code.` };
      }

      const data = snap.val();
      if (data.status === "finished" || data.status === "cancelled") {
        return { success: false, error: `Room "${cleanCode}" has already ended.` };
      }

      // Check if re-joining as existing player or joining as new Player 2
      const isRejoiningP1 = data.player1 && data.player1.id === userId;
      const isRejoiningP2 = data.player2 && data.player2.id === userId;

      let assignedRole = "player2";
      if (isRejoiningP1) {
        assignedRole = "player1";
        await update(ref(this.db, `${roomPath}/player1`), {
          connected: true,
          name: guestName || data.player1.name,
          lastSeen: serverTimestamp()
        });
        onDisconnect(ref(this.db, `${roomPath}/player1/connected`)).set(false);
      } else if (isRejoiningP2) {
        assignedRole = "player2";
        await update(ref(this.db, `${roomPath}/player2`), {
          connected: true,
          name: guestName || data.player2.name,
          lastSeen: serverTimestamp()
        });
        onDisconnect(ref(this.db, `${roomPath}/player2/connected`)).set(false);
      } else {
        // Joining as new player 2
        if (data.player2 && data.player2.id && data.player2.connected && data.player2.id !== userId) {
          return { success: false, error: "This room is already full (2 players connected)." };
        }

        const updates = {
          [`player2/id`]: userId,
          [`player2/name`]: guestName || "Player 2",
          [`player2/connected`]: true,
          [`player2/ready`]: true,
          [`player2/budget`]: (data.gameSettings && data.gameSettings.startingBudget) || 200,
          [`player2/lastSeen`]: serverTimestamp(),
          status: data.status === "waiting" ? "lobby" : data.status,
          lastActivity: serverTimestamp()
        };

        await update(roomDatabaseRef, updates);
        onDisconnect(ref(this.db, `${roomPath}/player2/connected`)).set(false);
      }

      this.currentRoomCode = cleanCode;
      this.playerRole = assignedRole;
      this.roomRef = roomDatabaseRef;

      this.saveLocalSession(cleanCode, assignedRole, guestName);

      return { 
        success: true, 
        roomCode: cleanCode, 
        role: assignedRole, 
        roomData: (await get(roomDatabaseRef)).val() 
      };
    } catch (err) {
      console.error("Error joining room in Firebase:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Listens to real-time updates on the current room
   */
  listenToRoom(roomCode, onUpdate, onError) {
    if (!this.db) return () => {};

    const cleanCode = String(roomCode || this.currentRoomCode).trim().toUpperCase();
    const roomDatabaseRef = ref(this.db, `rooms/${cleanCode}`);

    if (this.roomListenerUnsub) {
      this.roomListenerUnsub();
      this.roomListenerUnsub = null;
    }

    const unsub = onValue(
      roomDatabaseRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.val());
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.error("Room listener error:", err);
        if (typeof onError === "function") onError(err);
      }
    );

    this.roomListenerUnsub = () => off(roomDatabaseRef);
    return this.roomListenerUnsub;
  }

  /**
   * Host updates game settings (budget, league, formation, timer) in real-time
   */
  async updateSettings(roomCode, settings) {
    if (!this.db) return { success: false };
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();
    const roomDatabaseRef = ref(this.db, `rooms/${cleanCode}`);

    try {
      await update(roomDatabaseRef, {
        "gameSettings/startingBudget": settings.startingBudget,
        "gameSettings/league": settings.league,
        "gameSettings/formation": settings.formation,
        "gameSettings/timer": settings.timer,
        "player1/budget": settings.startingBudget,
        "player2/budget": settings.startingBudget,
        lastActivity: serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      console.error("Failed to update room settings:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Host starts the online auction match
   */
  async startOnlineMatch(roomCode, initialRoundState) {
    if (!this.db) return { success: false };
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();
    const roomDatabaseRef = ref(this.db, `rooms/${cleanCode}`);

    try {
      const updates = {
        status: "auction",
        lastActivity: serverTimestamp(),
        "gameState/roundNumber": initialRoundState.roundNumber || 1,
        "gameState/currentSlot": initialRoundState.slot,
        "gameState/currentAuctionPlayer": initialRoundState.auctionPlayer,
        "gameState/currentBid": initialRoundState.initialBid,
        "gameState/initialBid": initialRoundState.initialBid,
        "gameState/highestBidder": null,
        "gameState/currentTurn": "player1",
        "gameState/p1Passed": false,
        "gameState/p2Passed": false,
        "gameState/turnStartedAt": serverTimestamp(),
        "gameState/phase": "bidding",
        "gameState/bidHistory": [],
        "gameState/usedPlayerIds": [initialRoundState.auctionPlayer.id]
      };

      await update(roomDatabaseRef, updates);
      return { success: true };
    } catch (err) {
      console.error("Failed to start online match:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Submits a bid using atomic validation to prevent race conditions
   */
  async submitBid(roomCode, playerId, bidAmount, bidderName) {
    if (!this.db) return { success: false, error: "Database not connected" };
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();
    const gameStateRef = ref(this.db, `rooms/${cleanCode}/gameState`);

    try {
      const result = await runTransaction(gameStateRef, (currentGameState) => {
        if (!currentGameState) return currentGameState;

        // Validation: Must be bidding phase
        if (currentGameState.phase !== "bidding") return; // Abort

        // Validation: Must be this player's turn
        if (currentGameState.currentTurn !== playerId) return; // Abort

        // Validation: Has this player already passed?
        const isP1 = playerId === "player1";
        if (isP1 && currentGameState.p1Passed) return;
        if (!isP1 && currentGameState.p2Passed) return;

        // Validation: Bid must exceed current bid
        if (bidAmount <= currentGameState.currentBid) return;

        const nextTurn = isP1 ? "player2" : "player1";

        const newHistoryItem = {
          player: bidderName || (isP1 ? "Player 1" : "Player 2"),
          playerId: playerId,
          amount: bidAmount,
          action: "bid",
          timestamp: Date.now()
        };

        const existingHistory = Array.isArray(currentGameState.bidHistory) ? currentGameState.bidHistory : [];

        currentGameState.currentBid = bidAmount;
        currentGameState.highestBidder = playerId;
        currentGameState.currentTurn = nextTurn;
        currentGameState.turnStartedAt = Date.now();
        currentGameState.bidHistory = [newHistoryItem, ...existingHistory.slice(0, 7)];

        return currentGameState;
      });

      if (!result.committed) {
        return { success: false, error: "Bid was rejected or out of turn." };
      }

      await update(ref(this.db, `rooms/${cleanCode}`), { lastActivity: serverTimestamp() });
      return { success: true };
    } catch (err) {
      console.error("Submit bid transaction failed:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Submits a Pass action. Triggers instant auction resolution and Lucky Draw award.
   */
  async submitPass(roomCode, playerId, passerName, resolutionData) {
    if (!this.db) return { success: false };
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();
    const roomRef = ref(this.db, `rooms/${cleanCode}`);

    try {
      const snap = await get(roomRef);
      if (!snap.exists()) return { success: false };

      const room = snap.val();
      const gs = room.gameState;
      const isP1 = playerId === "player1";

      const otherPlayerId = isP1 ? "player2" : "player1";
      const winnerId = gs.highestBidder || otherPlayerId;
      const winningBid = gs.highestBidder ? gs.currentBid : gs.initialBid;
      const loserId = winnerId === "player1" ? "player2" : "player1";

      const winnerObj = room[winnerId];
      const finalPrice = Math.min(winnerObj.budget, winningBid);
      const newWinnerBudget = Math.max(0, winnerObj.budget - finalPrice);

      const wonPlayer = gs.currentAuctionPlayer;
      const luckyPlayer = resolutionData.luckyPlayer;
      const slot = gs.currentSlot;

      const updatedWinnerSquad = [
        ...(winnerObj.squad || []),
        {
          slotIndex: gs.roundNumber,
          position: slot.position,
          label: slot.label,
          player: wonPlayer
        }
      ];

      const loserObj = room[loserId];
      const updatedLoserSquad = [
        ...(loserObj.squad || []),
        {
          slotIndex: gs.roundNumber,
          position: slot.position,
          label: slot.label,
          player: luckyPlayer
        }
      ];

      const newUsedIds = [
        ...(gs.usedPlayerIds || []),
        luckyPlayer.id
      ];

      const newHistoryItem = {
        player: passerName || (isP1 ? "Player 1" : "Player 2"),
        playerId: playerId,
        amount: 0,
        action: "passed",
        timestamp: Date.now()
      };

      const existingHistory = Array.isArray(gs.bidHistory) ? gs.bidHistory : [];

      const updates = {
        lastActivity: serverTimestamp(),
        [`gameState/phase`]: "result",
        [`gameState/p1Passed`]: isP1 ? true : gs.p1Passed,
        [`gameState/p2Passed`]: !isP1 ? true : gs.p2Passed,
        [`gameState/bidHistory`]: [newHistoryItem, ...existingHistory.slice(0, 7)],
        [`gameState/usedPlayerIds`]: newUsedIds,
        [`${winnerId}/budget`]: newWinnerBudget,
        [`${winnerId}/squad`]: updatedWinnerSquad,
        [`${loserId}/squad`]: updatedLoserSquad,
        [`gameState/lastRoundResult`]: {
          winnerId,
          winnerName: room[winnerId].name,
          wonPlayer,
          winningBid: finalPrice,
          loserId,
          loserName: room[loserId].name,
          luckyPlayer,
          timestamp: Date.now()
        }
      };

      await update(roomRef, updates);
      return { success: true };
    } catch (err) {
      console.error("Pass submission failed:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Advances to the next online auction round or squad review
   */
  async advanceOnlineRound(roomCode, nextRoundData) {
    if (!this.db) return { success: false };
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();
    const roomRef = ref(this.db, `rooms/${cleanCode}`);

    try {
      if (nextRoundData.isFinalRound) {
        // Move to Squad Review screen
        await update(roomRef, {
          status: "review",
          lastActivity: serverTimestamp(),
          "gameState/phase": "complete"
        });
      } else {
        // Next round bidding
        const roundNum = nextRoundData.roundNumber;
        const openingTurn = roundNum % 2 === 1 ? "player1" : "player2";
        const candidate = nextRoundData.candidate;
        const baseBid = Math.max(5, Math.round(candidate.value * 0.25));

        const snap = await get(ref(this.db, `rooms/${cleanCode}/gameState/usedPlayerIds`));
        const currentUsed = snap.val() || [];
        const updatedUsed = [...currentUsed, candidate.id];

        await update(roomRef, {
          lastActivity: serverTimestamp(),
          "gameState/roundNumber": roundNum,
          "gameState/currentSlot": nextRoundData.slot,
          "gameState/currentAuctionPlayer": candidate,
          "gameState/currentBid": baseBid,
          "gameState/initialBid": baseBid,
          "gameState/highestBidder": null,
          "gameState/currentTurn": openingTurn,
          "gameState/p1Passed": false,
          "gameState/p2Passed": false,
          "gameState/turnStartedAt": Date.now(),
          "gameState/phase": "bidding",
          "gameState/bidHistory": [],
          "gameState/usedPlayerIds": updatedUsed,
          "gameState/lastRoundResult": null
        });
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to advance online round:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates in-match tactical style for either player
   */
  async updateTacticalStyle(roomCode, playerNumber, tacticKey) {
    if (!this.db) return { success: false };
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();
    const key = playerNumber === 1 ? "matchState/t1Tactic" : "matchState/t2Tactic";

    try {
      await update(ref(this.db, `rooms/${cleanCode}`), {
        [key]: tacticKey,
        lastActivity: serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      console.error("Failed to update tactic:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Host starts and syncs the live match simulation
   */
  async startOnlineMatchSimulation(roomCode, matchSimData) {
    if (!this.db) return { success: false };
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    try {
      await update(ref(this.db, `rooms/${cleanCode}`), {
        status: "match",
        lastActivity: serverTimestamp(),
        "matchState/started": true,
        "matchState/finished": false,
        "matchState/events": matchSimData.events,
        "matchState/stats": matchSimData.stats,
        "matchState/winner": matchSimData.winner,
        "matchState/shootout": matchSimData.shootout || null,
        "matchState/mvp": matchSimData.mvp,
        "matchState/t1Goals": matchSimData.t1Goals,
        "matchState/t2Goals": matchSimData.t2Goals
      });
      return { success: true };
    } catch (err) {
      console.error("Failed to sync match simulation:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Marks the match simulation as finished
   */
  async finishOnlineMatchSimulation(roomCode) {
    if (!this.db) return { success: false };
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    try {
      await update(ref(this.db, `rooms/${cleanCode}`), {
        status: "finished",
        "matchState/finished": true,
        lastActivity: serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      console.error("Failed to finish online match simulation:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Heartbeat to mark player presence
   */
  async sendHeartbeat(roomCode, role) {
    if (!this.db || !roomCode || !role) return;
    try {
      await update(ref(this.db, `rooms/${roomCode}/${role}`), {
        connected: true,
        lastSeen: serverTimestamp()
      });
    } catch (e) {
      // Benign heartbeat failure
    }
  }

  /**
   * Leaves or cancels the current room
   */
  async leaveRoom(roomCode) {
    const code = roomCode || this.currentRoomCode;
    if (!this.db || !code) return;

    try {
      if (this.playerRole === "player1") {
        await update(ref(this.db, `rooms/${code}`), {
          status: "cancelled",
          "player1/connected": false
        });
      } else {
        await update(ref(this.db, `rooms/${code}`), {
          "player2/connected": false
        });
      }
    } catch (e) {
      console.warn("Could not cleanly exit room in Firebase", e);
    }

    this.clearLocalSession();
    this.currentRoomCode = null;
    this.playerRole = null;
  }

  saveLocalSession(roomCode, role, playerName) {
    try {
      localStorage.setItem("mazad_room_code", roomCode);
      localStorage.setItem("mazad_role", role);
      if (playerName) localStorage.setItem("mazad_player_name", playerName);
    } catch (e) {}
  }

  getLocalSession() {
    try {
      return {
        roomCode: localStorage.getItem("mazad_room_code"),
        role: localStorage.getItem("mazad_role"),
        playerName: localStorage.getItem("mazad_player_name")
      };
    } catch (e) {
      return null;
    }
  }

  clearLocalSession() {
    try {
      localStorage.removeItem("mazad_room_code");
      localStorage.removeItem("mazad_role");
    } catch (e) {}
  }
}

export const firebaseMultiplayer = new FirebaseMultiplayerService();
