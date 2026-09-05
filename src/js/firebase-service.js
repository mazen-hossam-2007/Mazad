/**
 * MAZAD — Universal Real-Time Multiplayer Service
 * 
 * Supports:
 * 1. Zero-Config WebRTC/PeerJS Relay: Works instantly out-of-the-box on GitHub Pages
 *    without requiring any manual API keys, setup, or external backend.
 * 2. Firebase Realtime Database: Seamlessly used when custom Firebase credentials
 *    are supplied in the settings modal or configuration.
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
import { Peer } from "peerjs";
import { getFirebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

export class UniversalMultiplayerService {
  constructor() {
    // Mode: "firebase" | "p2p"
    this.mode = isFirebaseConfigured() ? "firebase" : "p2p";

    // Firebase state
    this.fbApp = null;
    this.fbDb = null;
    this.fbAuth = null;
    this.fbUser = null;

    // P2P (PeerJS) state
    this.peer = null;
    this.peerConn = null;
    this.p2pRoomState = null;
    this.p2pSubscribers = [];

    // Session state
    this.currentRoomCode = null;
    this.role = null; // "player1" | "player2"
    this.heartbeatInterval = null;
  }

  /**
   * Generates a clean 6-character room code (e.g. M7K4PX)
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
   * Tests connection to Firebase or P2P Relay
   */
  async testConnection() {
    if (isFirebaseConfigured()) {
      try {
        const config = getFirebaseConfig();
        const testApp = getApps().length ? getApp() : initializeApp(config);
        const auth = getAuth(testApp);
        await signInAnonymously(auth);
        return { success: true, mode: "firebase" };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      return { success: true, mode: "p2p", message: "Zero-Config Instant Online Relay Ready" };
    }
  }

  /**
   * Initializes Firebase if configured
   */
  async initFirebase() {
    if (!isFirebaseConfigured()) return false;
    try {
      const config = getFirebaseConfig();
      if (!getApps().length) {
        this.fbApp = initializeApp(config);
      } else {
        this.fbApp = getApp();
      }
      this.fbAuth = getAuth(this.fbApp);
      this.fbDb = getDatabase(this.fbApp);
      const authRes = await signInAnonymously(this.fbAuth);
      this.fbUser = authRes.user;
      return true;
    } catch (err) {
      console.warn("Firebase init failed, switching to zero-config P2P relay:", err);
      return false;
    }
  }

  /**
   * Creates a new multiplayer room as Host (Player 1)
   */
  async createRoom(hostName, gameSettings) {
    const roomCode = this.generateRoomCode();
    this.currentRoomCode = roomCode;
    this.role = "player1";

    const initialRoomData = {
      code: roomCode,
      status: "waiting", // waiting | auction | review | match | finished
      settings: {
        startingBudget: gameSettings.startingBudget || 200,
        formationKey: gameSettings.formationKey || "4-3-3",
        selectedLeague: gameSettings.selectedLeague || "ALL LEAGUES",
        timerDuration: gameSettings.timerDuration || 10,
        timerEnabled: gameSettings.timerEnabled !== false
      },
      players: {
        player1: {
          name: hostName || "Manager 1",
          connected: true,
          joined: true
        },
        player2: {
          name: "Waiting for opponent...",
          connected: false,
          joined: false
        }
      },
      gameState: {
        currentRound: 1,
        currentAuctionPlayer: null,
        currentBid: 10,
        initialBid: 10,
        highestBidder: null,
        currentTurn: "player1",
        p1Passed: false,
        p2Passed: false,
        roundPhase: "idle",
        bidHistory: [],
        usedPlayerIds: [],
        player1: {
          budget: gameSettings.startingBudget || 200,
          squad: []
        },
        player2: {
          budget: gameSettings.startingBudget || 200,
          squad: []
        }
      },
      tactics: {
        t1Tactic: "BALANCED",
        t2Tactic: "BALANCED"
      },
      matchState: null
    };

    // Try Firebase if configured
    if (isFirebaseConfigured()) {
      const fbOk = await this.initFirebase();
      if (fbOk) {
        this.mode = "firebase";
        try {
          const roomRef = ref(this.fbDb, `mazad_rooms/${roomCode}`);
          await set(roomRef, initialRoomData);
          onDisconnect(ref(this.fbDb, `mazad_rooms/${roomCode}/players/player1/connected`)).set(false);
          return { success: true, roomCode, mode: "firebase" };
        } catch (err) {
          console.warn("Firebase createRoom error, falling back to P2P:", err);
        }
      }
    }

    // Default: Zero-Config WebRTC P2P Relay (Works on GitHub Pages)
    this.mode = "p2p";
    this.p2pRoomState = initialRoomData;

    return new Promise((resolve) => {
      const peerId = `mazad-${roomCode.toLowerCase()}-host`;
      if (this.peer) this.peer.destroy();

      this.peer = new Peer(peerId, {
        debug: 0
      });

      this.peer.on("open", () => {
        this.peer.on("connection", (conn) => {
          this.peerConn = conn;

          conn.on("open", () => {
            // Guest connected!
            conn.on("data", (msg) => {
              this.handleP2PIncomingMessageFromGuest(msg);
            });

            // Send initial state to guest
            this.broadcastP2PState();
          });

          conn.on("close", () => {
            if (this.p2pRoomState && this.p2pRoomState.players && this.p2pRoomState.players.player2) {
              this.p2pRoomState.players.player2.connected = false;
              this.broadcastP2PState();
            }
          });

          conn.on("error", (e) => {
            console.warn("P2P Host connection error:", e);
          });
        });

        resolve({ success: true, roomCode, mode: "p2p" });
      });

      this.peer.on("error", (err) => {
        console.error("P2P Peer error:", err);
        // If ID taken, generate another code and retry
        if (err.type === "unavailable-id") {
          const fallbackCode = this.generateRoomCode();
          this.createRoom(hostName, gameSettings).then(resolve);
        } else {
          resolve({ success: false, error: err.message || "Failed to initialize online room" });
        }
      });
    });
  }

  /**
   * Joins an existing multiplayer room as Guest (Player 2)
   */
  async joinRoom(roomCode, guestName) {
    const cleanCode = String(roomCode || "").trim().toUpperCase();
    this.currentRoomCode = cleanCode;
    this.role = "player2";

    // Try Firebase if configured
    if (isFirebaseConfigured()) {
      const fbOk = await this.initFirebase();
      if (fbOk) {
        try {
          const roomRef = ref(this.fbDb, `mazad_rooms/${cleanCode}`);
          const snap = await get(roomRef);
          if (snap.exists()) {
            this.mode = "firebase";
            await update(roomRef, {
              "players/player2/name": guestName || "Manager 2",
              "players/player2/connected": true,
              "players/player2/joined": true
            });
            onDisconnect(ref(this.fbDb, `mazad_rooms/${cleanCode}/players/player2/connected`)).set(false);
            return { success: true, roomCode: cleanCode, mode: "firebase" };
          }
        } catch (err) {
          console.warn("Firebase joinRoom error, falling back to P2P:", err);
        }
      }
    }

    // Default: Zero-Config WebRTC P2P Relay
    this.mode = "p2p";
    return new Promise((resolve) => {
      const myPeerId = `mazad-${cleanCode.toLowerCase()}-guest-${Math.floor(Math.random() * 10000)}`;
      if (this.peer) this.peer.destroy();

      this.peer = new Peer(myPeerId, {
        debug: 0
      });

      const timeout = setTimeout(() => {
        resolve({ success: false, error: `Could not connect to room "${cleanCode}". Please verify the code.` });
      }, 9000);

      this.peer.on("open", () => {
        const hostPeerId = `mazad-${cleanCode.toLowerCase()}-host`;
        const conn = this.peer.connect(hostPeerId, { reliable: true });
        this.peerConn = conn;

        conn.on("open", () => {
          clearTimeout(timeout);
          // Send join message
          conn.send({
            type: "JOIN_REQUEST",
            guestName: guestName || "Manager 2"
          });

          conn.on("data", (data) => {
            if (data && data.type === "STATE_UPDATE" && data.roomState) {
              this.p2pRoomState = data.roomState;
              this.notifyP2PSubscribers(data.roomState);
            }
          });

          conn.on("close", () => {
            if (this.p2pRoomState && this.p2pRoomState.players && this.p2pRoomState.players.player1) {
              this.p2pRoomState.players.player1.connected = false;
              this.notifyP2PSubscribers(this.p2pRoomState);
            }
          });

          resolve({ success: true, roomCode: cleanCode, mode: "p2p" });
        });

        conn.on("error", (err) => {
          clearTimeout(timeout);
          resolve({ success: false, error: `Connection failed: ${err.message || "Host offline"}` });
        });
      });

      this.peer.on("error", (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: `Room "${cleanCode}" not found. Please verify the host created the room.` });
      });
    });
  }

  /**
   * Subscribes to room state snapshots
   */
  subscribeToRoom(roomCode, callback) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    if (this.mode === "firebase" && this.fbDb) {
      const roomRef = ref(this.fbDb, `mazad_rooms/${cleanCode}`);
      const listener = onValue(roomRef, (snap) => {
        callback(snap.val());
      });
      return () => off(roomRef, "value", listener);
    }

    // P2P mode
    this.p2pSubscribers.push(callback);
    if (this.p2pRoomState) {
      callback(this.p2pRoomState);
    }

    return () => {
      this.p2pSubscribers = this.p2pSubscribers.filter(cb => cb !== callback);
    };
  }

  notifyP2PSubscribers(state) {
    this.p2pSubscribers.forEach(cb => {
      try {
        cb(state);
      } catch (e) {
        console.error("Subscriber notification error:", e);
      }
    });
  }

  broadcastP2PState() {
    if (this.role === "player1") {
      this.notifyP2PSubscribers(this.p2pRoomState);
      if (this.peerConn && this.peerConn.open) {
        this.peerConn.send({
          type: "STATE_UPDATE",
          roomState: this.p2pRoomState
        });
      }
    }
  }

  handleP2PIncomingMessageFromGuest(msg) {
    if (!msg || !this.p2pRoomState) return;

    if (msg.type === "JOIN_REQUEST") {
      this.p2pRoomState.players.player2 = {
        name: msg.guestName || "Manager 2",
        connected: true,
        joined: true
      };
      this.broadcastP2PState();
    } else if (msg.type === "SUBMIT_BID") {
      this.submitBid(this.currentRoomCode, "player2", msg.bidAmount, msg.bidderName);
    } else if (msg.type === "SUBMIT_PASS") {
      this.submitPass(this.currentRoomCode, "player2", msg.freePlayer);
    } else if (msg.type === "UPDATE_TACTICS") {
      if (msg.tactics && msg.tactics.t2Tactic) {
        this.p2pRoomState.tactics.t2Tactic = msg.tactics.t2Tactic;
        this.broadcastP2PState();
      }
    }
  }

  /**
   * Updates host settings (Budget, League, Formation, Timer)
   */
  async updateSettings(roomCode, settings) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    if (this.mode === "firebase" && this.fbDb) {
      try {
        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}/settings`), settings);
        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}/gameState/player1`), { budget: settings.startingBudget });
        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}/gameState/player2`), { budget: settings.startingBudget });
        return { success: true };
      } catch (e) {
        console.error("Firebase updateSettings failed:", e);
      }
    }

    // P2P
    if (this.p2pRoomState) {
      this.p2pRoomState.settings = { ...this.p2pRoomState.settings, ...settings };
      this.p2pRoomState.gameState.player1.budget = settings.startingBudget;
      this.p2pRoomState.gameState.player2.budget = settings.startingBudget;
      this.broadcastP2PState();
    }
    return { success: true };
  }

  /**
   * Starts the online auction
   */
  async startOnlineAuction(roomCode, firstCandidate, baseBid) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    if (this.mode === "firebase" && this.fbDb) {
      try {
        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}`), {
          status: "auction",
          "gameState/currentRound": 1,
          "gameState/currentAuctionPlayer": firstCandidate,
          "gameState/currentBid": baseBid,
          "gameState/initialBid": baseBid,
          "gameState/highestBidder": null,
          "gameState/currentTurn": "player1",
          "gameState/roundPhase": "bidding",
          "gameState/usedPlayerIds": [firstCandidate.id],
          "gameState/bidHistory": [],
          "gameState/roundResult": null
        });
        return { success: true };
      } catch (e) {
        console.error("Firebase startOnlineAuction failed:", e);
      }
    }

    // P2P
    if (this.p2pRoomState) {
      this.p2pRoomState.status = "auction";
      this.p2pRoomState.gameState.currentRound = 1;
      this.p2pRoomState.gameState.currentAuctionPlayer = firstCandidate;
      this.p2pRoomState.gameState.currentBid = baseBid;
      this.p2pRoomState.gameState.initialBid = baseBid;
      this.p2pRoomState.gameState.highestBidder = null;
      this.p2pRoomState.gameState.currentTurn = "player1";
      this.p2pRoomState.gameState.roundPhase = "bidding";
      this.p2pRoomState.gameState.usedPlayerIds = [firstCandidate.id];
      this.p2pRoomState.gameState.bidHistory = [];
      this.p2pRoomState.gameState.roundResult = null;
      this.broadcastP2PState();
    }
    return { success: true };
  }

  /**
   * Submits a bid
   */
  async submitBid(roomCode, playerId, bidAmount, bidderName) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    if (this.mode === "firebase" && this.fbDb) {
      const gsRef = ref(this.fbDb, `mazad_rooms/${cleanCode}/gameState`);
      try {
        await runTransaction(gsRef, (gs) => {
          if (!gs) return gs;
          if (gs.roundPhase !== "bidding") return;
          if (gs.currentTurn !== playerId) return;
          if (bidAmount <= gs.currentBid) return;

          const nextTurn = playerId === "player1" ? "player2" : "player1";
          const newHistory = [
            { player: bidderName || playerId, playerId, amount: bidAmount, action: "bid", timestamp: Date.now() },
            ...(gs.bidHistory || []).slice(0, 8)
          ];

          gs.currentBid = bidAmount;
          gs.highestBidder = playerId;
          gs.currentTurn = nextTurn;
          gs.bidHistory = newHistory;
          return gs;
        });
        return { success: true };
      } catch (e) {
        console.error("Firebase submitBid transaction failed:", e);
      }
    }

    // P2P
    if (this.role === "player2") {
      // Send to host
      if (this.peerConn && this.peerConn.open) {
        this.peerConn.send({
          type: "SUBMIT_BID",
          bidAmount,
          bidderName
        });
      }
      return { success: true };
    }

    // Role is player1 (Host Coordinator)
    if (this.p2pRoomState && this.p2pRoomState.gameState) {
      const gs = this.p2pRoomState.gameState;
      if (gs.roundPhase === "bidding" && gs.currentTurn === playerId && bidAmount > gs.currentBid) {
        const nextTurn = playerId === "player1" ? "player2" : "player1";
        gs.currentBid = bidAmount;
        gs.highestBidder = playerId;
        gs.currentTurn = nextTurn;
        gs.bidHistory = [
          { player: bidderName || (playerId === "player1" ? this.p2pRoomState.players.player1.name : this.p2pRoomState.players.player2.name), playerId, amount: bidAmount, action: "bid", timestamp: Date.now() },
          ...(gs.bidHistory || []).slice(0, 8)
        ];
        this.broadcastP2PState();
      }
    }
    return { success: true };
  }

  /**
   * Submits a Pass action -> triggers Lucky Draw resolution
   */
  async submitPass(roomCode, playerId, freePlayer) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    if (this.mode === "firebase" && this.fbDb) {
      try {
        const snap = await get(ref(this.fbDb, `mazad_rooms/${cleanCode}`));
        if (!snap.exists()) return { success: false };

        const room = snap.val();
        const gs = room.gameState;
        const winnerId = gs.highestBidder || (playerId === "player1" ? "player2" : "player1");
        const loserId = winnerId === "player1" ? "player2" : "player1";
        const finalPrice = gs.highestBidder ? gs.currentBid : gs.initialBid;

        const winnerObj = gs[winnerId];
        const loserObj = gs[loserId];

        winnerObj.budget = Math.max(0, winnerObj.budget - finalPrice);
        winnerObj.squad = [...(winnerObj.squad || []), gs.currentAuctionPlayer];
        loserObj.squad = [...(loserObj.squad || []), freePlayer];

        const roundResult = {
          winnerId,
          loserId,
          auctionPlayer: gs.currentAuctionPlayer,
          freePlayer,
          finalPrice
        };

        const newUsed = [...(gs.usedPlayerIds || []), freePlayer.id];

        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}/gameState`), {
          roundPhase: "resolved",
          roundResult,
          usedPlayerIds: newUsed,
          [`${winnerId}/budget`]: winnerObj.budget,
          [`${winnerId}/squad`]: winnerObj.squad,
          [`${loserId}/squad`]: loserObj.squad
        });

        return { success: true };
      } catch (e) {
        console.error("Firebase submitPass failed:", e);
      }
    }

    // P2P
    if (this.role === "player2") {
      if (this.peerConn && this.peerConn.open) {
        this.peerConn.send({
          type: "SUBMIT_PASS",
          freePlayer
        });
      }
      return { success: true };
    }

    // Host
    if (this.p2pRoomState && this.p2pRoomState.gameState) {
      const gs = this.p2pRoomState.gameState;
      const winnerId = gs.highestBidder || (playerId === "player1" ? "player2" : "player1");
      const loserId = winnerId === "player1" ? "player2" : "player1";
      const finalPrice = gs.highestBidder ? gs.currentBid : gs.initialBid;

      const winnerObj = gs[winnerId];
      const loserObj = gs[loserId];

      winnerObj.budget = Math.max(0, winnerObj.budget - finalPrice);
      winnerObj.squad = [...(winnerObj.squad || []), gs.currentAuctionPlayer];
      loserObj.squad = [...(loserObj.squad || []), freePlayer];

      gs.roundPhase = "resolved";
      gs.roundResult = {
        winnerId,
        loserId,
        auctionPlayer: gs.currentAuctionPlayer,
        freePlayer,
        finalPrice
      };
      gs.usedPlayerIds = [...(gs.usedPlayerIds || []), freePlayer.id];

      this.broadcastP2PState();
    }
    return { success: true };
  }

  /**
   * Advances to next auction round
   */
  async advanceOnlineRound(roomCode, nextRound, nextCandidate, baseBid) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();
    const openingTurn = nextRound % 2 === 1 ? "player1" : "player2";

    if (this.mode === "firebase" && this.fbDb) {
      try {
        const snap = await get(ref(this.fbDb, `mazad_rooms/${cleanCode}/gameState/usedPlayerIds`));
        const currentUsed = snap.val() || [];
        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}/gameState`), {
          currentRound: nextRound,
          currentAuctionPlayer: nextCandidate,
          currentBid: baseBid,
          initialBid: baseBid,
          highestBidder: null,
          currentTurn: openingTurn,
          roundPhase: "bidding",
          bidHistory: [],
          roundResult: null,
          usedPlayerIds: [...currentUsed, nextCandidate.id]
        });
        return { success: true };
      } catch (e) {
        console.error("Firebase advanceOnlineRound failed:", e);
      }
    }

    // P2P
    if (this.p2pRoomState && this.p2pRoomState.gameState) {
      const gs = this.p2pRoomState.gameState;
      gs.currentRound = nextRound;
      gs.currentAuctionPlayer = nextCandidate;
      gs.currentBid = baseBid;
      gs.initialBid = baseBid;
      gs.highestBidder = null;
      gs.currentTurn = openingTurn;
      gs.roundPhase = "bidding";
      gs.bidHistory = [];
      gs.roundResult = null;
      gs.usedPlayerIds = [...(gs.usedPlayerIds || []), nextCandidate.id];

      this.broadcastP2PState();
    }
    return { success: true };
  }

  /**
   * Transitions to squad review
   */
  async startOnlineSquadReview(roomCode) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    if (this.mode === "firebase" && this.fbDb) {
      try {
        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}`), {
          status: "review"
        });
        return { success: true };
      } catch (e) {
        console.error("Firebase startOnlineSquadReview failed:", e);
      }
    }

    if (this.p2pRoomState) {
      this.p2pRoomState.status = "review";
      this.broadcastP2PState();
    }
    return { success: true };
  }

  /**
   * Updates tactics for players
   */
  async updateTactics(roomCode, tactics) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    if (this.mode === "firebase" && this.fbDb) {
      try {
        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}/tactics`), tactics);
        return { success: true };
      } catch (e) {
        console.error("Firebase updateTactics failed:", e);
      }
    }

    if (this.role === "player2") {
      if (this.peerConn && this.peerConn.open) {
        this.peerConn.send({
          type: "UPDATE_TACTICS",
          tactics
        });
      }
      return { success: true };
    }

    if (this.p2pRoomState) {
      this.p2pRoomState.tactics = { ...this.p2pRoomState.tactics, ...tactics };
      this.broadcastP2PState();
    }
    return { success: true };
  }

  /**
   * Starts Match Day Simulation
   */
  async startOnlineMatchSimulation(roomCode, matchSimulation) {
    const cleanCode = String(roomCode || this.currentRoomCode).toUpperCase();

    if (this.mode === "firebase" && this.fbDb) {
      try {
        await update(ref(this.fbDb, `mazad_rooms/${cleanCode}`), {
          status: "match",
          matchState: {
            simulation: matchSimulation
          }
        });
        return { success: true };
      } catch (e) {
        console.error("Firebase startOnlineMatchSimulation failed:", e);
      }
    }

    if (this.p2pRoomState) {
      this.p2pRoomState.status = "match";
      this.p2pRoomState.matchState = {
        simulation: matchSimulation
      };
      this.broadcastP2PState();
    }
    return { success: true };
  }

  /**
   * Leaves or resets the room
   */
  leaveRoom(roomCode) {
    if (this.peerConn) {
      try { this.peerConn.close(); } catch (e) {}
      this.peerConn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    this.p2pRoomState = null;
    this.p2pSubscribers = [];
    this.currentRoomCode = null;
    this.role = null;
  }
}

export const firebaseMultiplayer = new UniversalMultiplayerService();
