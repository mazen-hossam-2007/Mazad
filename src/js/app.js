/**
 * MAZAD — Football Auction Game Controller
 * Core orchestrator for turn-based auctions, AI decision engine,
 * Lucky Draw drama system, league filtering, and live 90' match simulation.
 */

import { PLAYER_DATABASE, getAuctionCandidate, getRandomFreePlayer, calculateWeightedPerformance } from "./database.js";
import { FORMATIONS } from "./formations.js";
import { AuctionAI } from "./ai.js";
import { sound } from "./audio.js";
import { calculateTeamStats, generateMatchSimulation, TACTICAL_STYLES } from "./matchEngine.js";
import { firebaseMultiplayer } from "./firebase-service.js";
import { getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

export class MazadGame {
  constructor() {
    this.state = {
      screen: "start", // start | onlineLobby | auction | review | match | winner
      mode: "pvp", // pvp | ai | online
      aiDifficulty: "normal", // easy | normal | hard | expert
      selectedLeague: "ALL LEAGUES",
      startingBudget: 200,
      formationKey: "4-3-3",
      timerEnabled: true,
      timerDuration: 10,
      
      player1: {
        id: "player1",
        name: "Player 1",
        budget: 200,
        squad: [] // array of { slotIndex, position, label, player }
      },
      player2: {
        id: "player2",
        name: "Player 2",
        budget: 200,
        squad: []
      },

      currentRound: 1, // 1 through 11
      currentAuctionPlayer: null,
      currentBid: 10,
      initialBid: 10,
      highestBidder: null,
      currentTurn: "player1", // "player1" | "player2"
      isTransitioning: false,
      p1Passed: false,
      p2Passed: false,
      bidHistory: [],
      
      timerRemaining: 10,
      timerInterval: null,
      isPaused: false,
      aiThinking: false,
      usedPlayerIds: [],

      matchSim: null,
      matchCurrentMinute: 0,
      matchInterval: null,
      matchSpeed: 1,
      matchCurrentEventIndex: 0,

      // Online Multiplayer State
      online: {
        isOnline: false,
        roomCode: null,
        role: null, // "player1" | "player2"
        roomData: null,
        opponentConnected: true,
        disconnectCountdown: 30,
        disconnectInterval: null,
        unsubRoomListener: null,
        lastProcessedPhase: null,
        lastProcessedRound: 0,
        luckyModalOpen: false
      }
    };

    this.ai = new AuctionAI("normal");
    this.initDOM();
  }

  initDOM() {
    // Top bar sound toggle
    const soundToggle = document.getElementById("soundToggle");
    if (soundToggle) {
      soundToggle.addEventListener("click", () => {
        const enabled = sound.toggle();
        soundToggle.classList.toggle("sound-on", enabled);
        soundToggle.innerHTML = enabled ? "🔊 Sound ON" : "🔇 Sound OFF";
      });
    }

    // Header Navigation buttons
    const headerFirebaseBtn = document.getElementById("headerFirebaseBtn");
    if (headerFirebaseBtn) {
      headerFirebaseBtn.addEventListener("click", () => this.openFirebaseSetupModal());
    }

    const headerRulesBtn = document.getElementById("headerRulesBtn");
    if (headerRulesBtn) {
      headerRulesBtn.addEventListener("click", () => this.openModal("howToPlayModal"));
    }

    const headerSettingsBtn = document.getElementById("headerSettingsBtn");
    if (headerSettingsBtn) {
      headerSettingsBtn.addEventListener("click", () => this.openModal("settingsModal"));
    }

    const headerExitBtn = document.getElementById("headerExitBtn");
    if (headerExitBtn) {
      headerExitBtn.addEventListener("click", () => this.confirmExitGame());
    }

    const arenaExitBtn = document.getElementById("arenaExitBtn");
    if (arenaExitBtn) {
      arenaExitBtn.addEventListener("click", () => this.confirmExitGame());
    }

    const reviewExitBtn = document.getElementById("reviewExitBtn");
    if (reviewExitBtn) {
      reviewExitBtn.addEventListener("click", () => this.confirmExitGame());
    }

    // Modal Close buttons
    const closeHowToPlayBtn = document.getElementById("closeHowToPlayBtn");
    const howToPlayGotItBtn = document.getElementById("howToPlayGotItBtn");
    if (closeHowToPlayBtn) closeHowToPlayBtn.addEventListener("click", () => this.closeModal("howToPlayModal"));
    if (howToPlayGotItBtn) howToPlayGotItBtn.addEventListener("click", () => this.closeModal("howToPlayModal"));

    const closeSettingsBtn = document.getElementById("closeSettingsBtn");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");
    if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", () => this.closeModal("settingsModal"));
    if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", () => this.closeModal("settingsModal"));

    const settingsSoundBtn = document.getElementById("settingsSoundBtn");
    if (settingsSoundBtn) {
      settingsSoundBtn.addEventListener("click", () => {
        const enabled = sound.toggle();
        settingsSoundBtn.classList.toggle("active", enabled);
        settingsSoundBtn.innerHTML = enabled ? "🔊 ON" : "🔇 OFF";
        if (soundToggle) {
          soundToggle.classList.toggle("sound-on", enabled);
          soundToggle.innerHTML = enabled ? "🔊 Sound ON" : "🔇 Sound OFF";
        }
      });
    }

    // Disconnect modal buttons
    const btnClaimForfeitWin = document.getElementById("btnClaimForfeitWin");
    if (btnClaimForfeitWin) {
      btnClaimForfeitWin.addEventListener("click", () => this.claimForfeitVictory());
    }
    const btnExitDisconnectModal = document.getElementById("btnExitDisconnectModal");
    if (btnExitDisconnectModal) {
      btnExitDisconnectModal.addEventListener("click", () => this.exitGame());
    }

    // Start Screen Selectors & Menus
    this.setupStartScreenEvents();
    this.setupOnlineMultiplayerEvents();
    this.setupFirebaseModalEvents();
  }

  confirmExitGame() {
    sound.playClick();
    const isOnline = this.state.online.isOnline;
    const msg = isOnline
      ? "Are you sure you want to leave this online multiplayer match? Leaving will forfeit the game."
      : "Are you sure you want to exit to the Main Menu? Your current match progress will be lost.";
    const confirmed = window.confirm(msg);
    if (confirmed) {
      this.exitGame();
    }
  }

  exitGame() {
    clearInterval(this.state.timerInterval);
    this.state.timerInterval = null;
    if (this.state.luckyAdvanceTimer) {
      clearTimeout(this.state.luckyAdvanceTimer);
      this.state.luckyAdvanceTimer = null;
    }
    if (this.state.online.disconnectInterval) {
      clearInterval(this.state.online.disconnectInterval);
      this.state.online.disconnectInterval = null;
    }
    this.state.isPaused = false;
    this.state.aiThinking = false;
    this.state.isTransitioning = false;

    // Leave online room if active
    if (this.state.online.isOnline) {
      this.leaveOnlineRoom();
    }

    // Hide all modals
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));

    // Reset game state
    this.state.currentRound = 1;
    this.state.player1.squad = [];
    this.state.player2.squad = [];
    this.state.player1.budget = this.state.startingBudget;
    this.state.player2.budget = this.state.startingBudget;
    this.state.usedPlayerIds = [];
    this.state.mode = "pvp";

    const headerOnlinePill = document.getElementById("headerOnlinePill");
    if (headerOnlinePill) headerOnlinePill.style.display = "none";

    // Return to start screen
    this.showScreen("startScreen");
    sound.playWhistle();
  }

  openModal(modalId) {
    sound.playClick();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
  }

  closeModal(modalId) {
    sound.playClick();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  }

  setupStartScreenEvents() {
    // Online Multiplayer Menu Button
    const onlineMultiplayerBtn = document.getElementById("onlineMultiplayerBtn");
    if (onlineMultiplayerBtn) {
      onlineMultiplayerBtn.addEventListener("click", () => {
        sound.playClick();
        this.showOnlineLobby();
      });
    }

    // Quick Match Button
    const quickMatchBtn = document.getElementById("quickMatchBtn");
    if (quickMatchBtn) {
      quickMatchBtn.addEventListener("click", () => {
        this.state.startingBudget = 200;
        this.state.formationKey = "4-3-3";
        this.state.selectedLeague = "ALL LEAGUES";
        this.state.timerDuration = 10;
        this.state.timerEnabled = true;
        this.startGame();
      });
    }

    // Custom Game Button (scroll to config panel)
    const customGameBtn = document.getElementById("customGameBtn");
    if (customGameBtn) {
      customGameBtn.addEventListener("click", () => {
        sound.playClick();
        const configCard = document.getElementById("configCard");
        if (configCard) {
          configCard.scrollIntoView({ behavior: "smooth" });
          configCard.classList.add("highlight-pulse");
          setTimeout(() => configCard.classList.remove("highlight-pulse"), 1200);
        }
      });
    }

    // How to Play menu button
    const howToPlayMenuBtn = document.getElementById("howToPlayMenuBtn");
    if (howToPlayMenuBtn) {
      howToPlayMenuBtn.addEventListener("click", () => this.openModal("howToPlayModal"));
    }

    // Settings menu button
    const settingsMenuBtn = document.getElementById("settingsMenuBtn");
    if (settingsMenuBtn) {
      settingsMenuBtn.addEventListener("click", () => this.openModal("settingsModal"));
    }

    // Mode selector chips (PVP vs AI)
    document.querySelectorAll(".mode-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".mode-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.mode = chip.dataset.mode;
        
        const aiOptions = document.getElementById("aiOptionsGroup");
        const p2NameInput = document.getElementById("p2NameInput");
        if (this.state.mode === "ai") {
          if (aiOptions) aiOptions.style.display = "block";
          if (p2NameInput) p2NameInput.value = "AI Maestro";
        } else {
          if (aiOptions) aiOptions.style.display = "none";
          if (p2NameInput && p2NameInput.value === "AI Maestro") p2NameInput.value = "Player 2";
        }
        sound.playClick();
      });
    });

    // AI Difficulty chips
    document.querySelectorAll(".ai-diff-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".ai-diff-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.aiDifficulty = chip.dataset.difficulty;
        this.ai.setDifficulty(this.state.aiDifficulty);
        sound.playClick();
      });
    });

    // League Selection chips
    document.querySelectorAll(".league-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".league-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.selectedLeague = chip.dataset.league;
        sound.playClick();
      });
    });

    // Budget chips
    document.querySelectorAll(".budget-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".budget-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const customWrap = document.getElementById("customBudgetWrap");

        if (chip.dataset.budget === "custom") {
          if (customWrap) customWrap.style.display = "block";
        } else {
          if (customWrap) customWrap.style.display = "none";
          this.state.startingBudget = parseInt(chip.dataset.budget, 10);
        }
        sound.playClick();
      });
    });

    // Formation chips
    document.querySelectorAll(".formation-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".formation-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.formationKey = chip.dataset.formation;
        sound.playClick();
      });
    });

    // Timer toggles
    document.querySelectorAll(".timer-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".timer-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const dur = parseInt(chip.dataset.timer, 10);
        this.state.timerEnabled = dur > 0;
        this.state.timerDuration = dur > 0 ? dur : 10;
        sound.playClick();
      });
    });

    // Start Auction Button
    const startBtn = document.getElementById("startAuctionBtn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        this.startGame();
      });
    }
  }

  // =========================================================================
  // ONLINE MULTIPLAYER METHODS
  // =========================================================================

  setupOnlineMultiplayerEvents() {
    // Navigation inside online lobby
    const btnGoToCreateRoom = document.getElementById("btnGoToCreateRoom");
    if (btnGoToCreateRoom) {
      btnGoToCreateRoom.addEventListener("click", () => this.handleCreateOnlineRoom());
    }

    const btnGoToJoinRoom = document.getElementById("btnGoToJoinRoom");
    if (btnGoToJoinRoom) {
      btnGoToJoinRoom.addEventListener("click", () => {
        sound.playClick();
        this.showOnlineView("onlineJoinView");
        const joinInput = document.getElementById("joinRoomCodeInput");
        if (joinInput) {
          joinInput.value = "";
          joinInput.focus();
        }
      });
    }

    const btnBackToMainMenu = document.getElementById("btnBackToMainMenu");
    if (btnBackToMainMenu) {
      btnBackToMainMenu.addEventListener("click", () => {
        sound.playClick();
        this.showScreen("startScreen");
      });
    }

    const openFirebaseSetupBtn = document.getElementById("openFirebaseSetupBtn");
    if (openFirebaseSetupBtn) {
      openFirebaseSetupBtn.addEventListener("click", () => this.openFirebaseSetupModal());
    }

    // Host room controls
    const btnCopyHostCode = document.getElementById("btnCopyHostCode");
    if (btnCopyHostCode) {
      btnCopyHostCode.addEventListener("click", () => this.copyHostCode());
    }

    const hostPlayerNameInput = document.getElementById("hostPlayerNameInput");
    if (hostPlayerNameInput) {
      hostPlayerNameInput.addEventListener("input", (e) => {
        const val = e.target.value.trim() || "Manager 1";
        this.state.player1.name = val;
        const p1NameDisp = document.getElementById("hostP1NameDisplay");
        if (p1NameDisp) p1NameDisp.textContent = `${val} (Host)`;
        if (this.state.online.roomCode) {
          this.updateHostSettingsInFirebase();
        }
      });
    }

    // Host Match Setting Selectors (Live Synchronized to Guest)
    document.querySelectorAll(".online-budget-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".online-budget-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.startingBudget = parseInt(chip.dataset.budget, 10);
        sound.playClick();
        this.updateHostSettingsInFirebase();
      });
    });

    document.querySelectorAll(".online-league-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".online-league-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.selectedLeague = chip.dataset.league;
        sound.playClick();
        this.updateHostSettingsInFirebase();
      });
    });

    document.querySelectorAll(".online-formation-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".online-formation-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.formationKey = chip.dataset.formation;
        sound.playClick();
        this.updateHostSettingsInFirebase();
      });
    });

    document.querySelectorAll(".online-timer-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".online-timer-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const dur = parseInt(chip.dataset.timer, 10);
        this.state.timerEnabled = dur > 0;
        this.state.timerDuration = dur > 0 ? dur : 10;
        sound.playClick();
        this.updateHostSettingsInFirebase();
      });
    });

    const btnStartOnlineAuction = document.getElementById("btnStartOnlineAuction");
    if (btnStartOnlineAuction) {
      btnStartOnlineAuction.addEventListener("click", () => this.startOnlineAuctionFromHost());
    }

    const btnCancelHostRoom = document.getElementById("btnCancelHostRoom");
    if (btnCancelHostRoom) {
      btnCancelHostRoom.addEventListener("click", () => {
        sound.playClick();
        this.leaveOnlineRoom();
        this.showOnlineView("onlineChoiceView");
      });
    }

    // Join room controls
    const btnSubmitJoinRoom = document.getElementById("btnSubmitJoinRoom");
    if (btnSubmitJoinRoom) {
      btnSubmitJoinRoom.addEventListener("click", () => this.handleJoinOnlineRoom());
    }

    const joinRoomCodeInput = document.getElementById("joinRoomCodeInput");
    if (joinRoomCodeInput) {
      joinRoomCodeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.handleJoinOnlineRoom();
      });
      joinRoomCodeInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.toUpperCase().trim();
      });
    }

    const btnCancelJoinRoom = document.getElementById("btnCancelJoinRoom");
    if (btnCancelJoinRoom) {
      btnCancelJoinRoom.addEventListener("click", () => {
        sound.playClick();
        this.showOnlineView("onlineChoiceView");
      });
    }

    // Guest lobby controls
    const btnLeaveGuestLobby = document.getElementById("btnLeaveGuestLobby");
    if (btnLeaveGuestLobby) {
      btnLeaveGuestLobby.addEventListener("click", () => {
        sound.playClick();
        this.leaveOnlineRoom();
        this.showOnlineView("onlineChoiceView");
      });
    }
  }

  setupFirebaseModalEvents() {
    const closeFirebaseSetupBtn = document.getElementById("closeFirebaseSetupBtn");
    if (closeFirebaseSetupBtn) {
      closeFirebaseSetupBtn.addEventListener("click", () => this.closeModal("firebaseSetupModal"));
    }

    const saveAndTestFirebaseBtn = document.getElementById("saveAndTestFirebaseBtn");
    if (saveAndTestFirebaseBtn) {
      saveAndTestFirebaseBtn.addEventListener("click", async () => {
        sound.playClick();
        const feedback = document.getElementById("firebaseTestFeedback");
        if (feedback) {
          feedback.style.display = "block";
          feedback.style.color = "#fbbf24";
          feedback.innerHTML = "⏳ Testing Firebase Realtime Database connection...";
        }

        const config = {
          apiKey: document.getElementById("fbApiKeyInput")?.value.trim() || "",
          databaseURL: document.getElementById("fbDbUrlInput")?.value.trim() || "",
          projectId: document.getElementById("fbProjectIdInput")?.value.trim() || "",
          authDomain: document.getElementById("fbAuthDomainInput")?.value.trim() || "",
          storageBucket: document.getElementById("fbStorageBucketInput")?.value.trim() || "",
          appId: document.getElementById("fbAppIdInput")?.value.trim() || ""
        };

        saveFirebaseConfig(config);
        const res = await firebaseMultiplayer.testConnection();
        if (res.success) {
          if (feedback) {
            feedback.style.color = "#4ade80";
            feedback.innerHTML = "✅ Firebase connected successfully! Anonymous auth and Realtime Sync are ready.";
          }
          this.updateFirebaseStatusBanner();
        } else {
          if (feedback) {
            feedback.style.color = "#f87171";
            feedback.innerHTML = `⚠️ Connection error: ${res.error}. Please check your databaseURL and Realtime Database rules.`;
          }
          this.updateFirebaseStatusBanner();
        }
      });
    }

    const clearFirebaseConfigBtn = document.getElementById("clearFirebaseConfigBtn");
    if (clearFirebaseConfigBtn) {
      clearFirebaseConfigBtn.addEventListener("click", () => {
        sound.playClick();
        clearFirebaseConfig();
        this.populateFirebaseModalInputs();
        const feedback = document.getElementById("firebaseTestFeedback");
        if (feedback) {
          feedback.style.display = "block";
          feedback.style.color = "#94a3b8";
          feedback.innerHTML = "Cleared custom credentials. Default embedded project config restored.";
        }
        this.updateFirebaseStatusBanner();
      });
    }
  }

  populateFirebaseModalInputs() {
    const config = getFirebaseConfig();
    const map = {
      fbApiKeyInput: config.apiKey,
      fbDbUrlInput: config.databaseURL,
      fbProjectIdInput: config.projectId,
      fbAuthDomainInput: config.authDomain,
      fbStorageBucketInput: config.storageBucket,
      fbAppIdInput: config.appId
    };
    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    }
  }

  openFirebaseSetupModal() {
    this.populateFirebaseModalInputs();
    this.openModal("firebaseSetupModal");
  }

  showOnlineLobby() {
    this.state.screen = "onlineLobby";
    this.showScreen("onlineLobbyScreen");
    this.showOnlineView("onlineChoiceView");
    this.updateFirebaseStatusBanner();
  }

  showOnlineView(viewId) {
    document.querySelectorAll(".online-view").forEach(v => v.style.display = "none");
    const target = document.getElementById(viewId);
    if (target) {
      target.style.display = "block";
      window.scrollTo(0, 0);
    }
  }

  updateFirebaseStatusBanner() {
    const banner = document.getElementById("firebaseStatusBanner");
    const dot = document.getElementById("firebaseStatusDot");
    const text = document.getElementById("firebaseStatusText");
    if (!banner || !dot || !text) return;

    if (isFirebaseConfigured()) {
      dot.className = "status-indicator-dot online";
      text.textContent = "Firebase Realtime Sync: Connected (Custom Project)";
    } else {
      dot.className = "status-indicator-dot online";
      text.textContent = "Realtime Online Sync: Ready & Connected (Zero-Config Active)";
    }
  }

  async handleCreateOnlineRoom() {
    sound.playClick();
    const hostName = document.getElementById("hostPlayerNameInput")?.value.trim() || "Manager 1";
    this.state.player1.name = hostName;

    const initialSettings = {
      startingBudget: this.state.startingBudget,
      formationKey: this.state.formationKey,
      selectedLeague: this.state.selectedLeague,
      timerDuration: this.state.timerDuration,
      timerEnabled: this.state.timerEnabled
    };

    const res = await firebaseMultiplayer.createRoom(hostName, initialSettings);
    if (!res.success) {
      alert(`Could not create online room: ${res.error}`);
      return;
    }

    const roomCode = res.roomCode;
    this.state.online.isOnline = true;
    this.state.online.roomCode = roomCode;
    this.state.online.role = "player1";
    this.state.mode = "online";

    // Update UI
    const codeDisp = document.getElementById("hostRoomCodeDisplay");
    if (codeDisp) codeDisp.textContent = roomCode;

    const hostP1Name = document.getElementById("hostP1NameDisplay");
    if (hostP1Name) hostP1Name.textContent = `${hostName} (Host)`;

    const startBtn = document.getElementById("btnStartOnlineAuction");
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.style.opacity = "0.5";
      startBtn.textContent = "⏳ WAITING FOR OPPONENT...";
    }

    const headerOnlinePill = document.getElementById("headerOnlinePill");
    const headerRoomLabel = document.getElementById("headerRoomLabel");
    if (headerOnlinePill && headerRoomLabel) {
      headerOnlinePill.style.display = "inline-flex";
      headerRoomLabel.textContent = `Room: ${roomCode}`;
    }

    this.showOnlineView("onlineCreateView");

    // Subscribe to room updates
    this.subscribeToOnlineRoom(roomCode);
  }

  async handleJoinOnlineRoom() {
    sound.playClick();
    const joinInput = document.getElementById("joinRoomCodeInput");
    const nameInput = document.getElementById("joinPlayerNameInput");
    const errorBanner = document.getElementById("joinErrorBanner");

    const roomCode = (joinInput?.value || "").trim().toUpperCase();
    const guestName = (nameInput?.value || "").trim() || "Manager 2";

    if (!roomCode || roomCode.length !== 6) {
      if (errorBanner) {
        errorBanner.style.display = "block";
        errorBanner.textContent = "Please enter a valid 6-character room code.";
      }
      return;
    }

    if (errorBanner) errorBanner.style.display = "none";

    const submitBtn = document.getElementById("btnSubmitJoinRoom");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "CONNECTING...";
    }

    const res = await firebaseMultiplayer.joinRoom(roomCode, guestName);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "JOIN ROOM 🚀";
    }

    if (!res.success) {
      if (errorBanner) {
        errorBanner.style.display = "block";
        errorBanner.textContent = res.error;
      }
      return;
    }

    this.state.online.isOnline = true;
    this.state.online.roomCode = roomCode;
    this.state.online.role = "player2";
    this.state.player2.name = guestName;
    this.state.mode = "online";

    const guestCodeDisp = document.getElementById("guestRoomCodeDisplay");
    if (guestCodeDisp) guestCodeDisp.textContent = roomCode;

    const guestP2Name = document.getElementById("guestP2NameDisplay");
    if (guestP2Name) guestP2Name.textContent = `${guestName} (You)`;

    const headerOnlinePill = document.getElementById("headerOnlinePill");
    const headerRoomLabel = document.getElementById("headerRoomLabel");
    if (headerOnlinePill && headerRoomLabel) {
      headerOnlinePill.style.display = "inline-flex";
      headerRoomLabel.textContent = `Room: ${roomCode}`;
    }

    this.showOnlineView("onlineGuestLobbyView");

    // Subscribe to room updates
    this.subscribeToOnlineRoom(roomCode);
  }

  copyHostCode() {
    sound.playClick();
    const roomCode = this.state.online.roomCode;
    if (!roomCode) return;

    navigator.clipboard.writeText(roomCode).then(() => {
      const fb = document.getElementById("hostCopyFeedback");
      if (fb) {
        fb.style.display = "block";
        setTimeout(() => fb.style.display = "none", 3000);
      }
    }).catch(() => {
      prompt("Copy your room code:", roomCode);
    });
  }

  async updateHostSettingsInFirebase() {
    if (!this.state.online.isOnline || this.state.online.role !== "player1") return;
    const roomCode = this.state.online.roomCode;
    if (!roomCode) return;

    const settings = {
      startingBudget: this.state.startingBudget,
      formationKey: this.state.formationKey,
      selectedLeague: this.state.selectedLeague,
      timerDuration: this.state.timerDuration,
      timerEnabled: this.state.timerEnabled
    };

    await firebaseMultiplayer.updateSettings(roomCode, settings);
  }

  async startOnlineAuctionFromHost() {
    if (!this.state.online.isOnline || this.state.online.role !== "player1") return;
    const roomCode = this.state.online.roomCode;
    if (!roomCode) return;

    sound.init();
    sound.playWhistle();

    // Generate round 1 candidate
    const slot = this.getCurrentSlotInfo();
    const candidate = getAuctionCandidate(slot.position, this.state.selectedLeague, this.state.usedPlayerIds);
    this.state.currentAuctionPlayer = candidate;
    this.state.usedPlayerIds = [candidate.id];

    const baseBid = Math.max(5, Math.round(candidate.value * 0.25));

    await firebaseMultiplayer.startOnlineAuction(roomCode, candidate, baseBid);
  }

  subscribeToOnlineRoom(roomCode) {
    if (this.state.online.unsubRoomListener) {
      this.state.online.unsubRoomListener();
    }

    this.state.online.unsubRoomListener = firebaseMultiplayer.subscribeToRoom(roomCode, (roomData) => {
      this.handleOnlineRoomSnapshot(roomData);
    });
  }

  handleOnlineRoomSnapshot(roomData) {
    if (!roomData) return;
    this.state.online.roomData = roomData;

    const role = this.state.online.role;
    const status = roomData.status;

    // Synchronize player names and connection status
    if (roomData.players) {
      if (roomData.players.player1) {
        this.state.player1.name = roomData.players.player1.name || "Player 1";
      }
      if (roomData.players.player2) {
        this.state.player2.name = roomData.players.player2.name || "Player 2";
      }

      // Check opponent disconnect
      const opponentKey = role === "player1" ? "player2" : "player1";
      const opponentData = roomData.players[opponentKey];
      if (opponentData && status !== "waiting") {
        if (opponentData.connected === false && this.state.online.opponentConnected) {
          this.handleOpponentDisconnect();
        } else if (opponentData.connected === true && !this.state.online.opponentConnected) {
          this.handleOpponentReconnect();
        }
      }
    }

    // Synchronize settings (Host -> Guest)
    if (roomData.settings) {
      this.state.startingBudget = roomData.settings.startingBudget || 200;
      this.state.formationKey = roomData.settings.formationKey || "4-3-3";
      this.state.selectedLeague = roomData.settings.selectedLeague || "ALL LEAGUES";
      this.state.timerDuration = roomData.settings.timerDuration || 10;
      this.state.timerEnabled = roomData.settings.timerEnabled !== false;

      // Update Guest lobby preview items
      const pBudget = document.getElementById("previewBudgetVal");
      const pLeague = document.getElementById("previewLeagueVal");
      const pForm = document.getElementById("previewFormationVal");
      const pTimer = document.getElementById("previewTimerVal");
      if (pBudget) pBudget.textContent = `€${this.state.startingBudget}M`;
      if (pLeague) pLeague.textContent = this.state.selectedLeague;
      if (pForm) pForm.textContent = this.state.formationKey;
      if (pTimer) pTimer.textContent = this.state.timerEnabled ? `${this.state.timerDuration}s` : "OFF";
    }

    // 1. Status: WAITING IN LOBBY
    if (status === "waiting") {
      const p2Present = !!(roomData.players && roomData.players.player2 && roomData.players.player2.joined);
      if (role === "player1") {
        const hostP2Card = document.getElementById("hostP2StatusCard");
        const hostP2Name = document.getElementById("hostP2NameDisplay");
        const hostP2Tag = document.getElementById("hostP2StatusTag");
        const startBtn = document.getElementById("btnStartOnlineAuction");

        if (p2Present) {
          if (hostP2Card) {
            hostP2Card.className = "connected-player-card p2-connected";
          }
          if (hostP2Name) hostP2Name.textContent = `${roomData.players.player2.name} (Player 2)`;
          if (hostP2Tag) {
            hostP2Tag.className = "status-tag tag-ready";
            hostP2Tag.textContent = "🟢 CONNECTED & READY";
          }
          if (startBtn) {
            startBtn.disabled = false;
            startBtn.style.opacity = "1";
            startBtn.textContent = "START ONLINE AUCTION ⚡";
          }
        } else {
          if (hostP2Card) hostP2Card.className = "connected-player-card p2-waiting";
          if (hostP2Name) hostP2Name.textContent = "Waiting for opponent...";
          if (hostP2Tag) {
            hostP2Tag.className = "status-tag tag-waiting";
            hostP2Tag.textContent = "⏳ SHARE CODE TO CONNECT";
          }
          if (startBtn) {
            startBtn.disabled = true;
            startBtn.style.opacity = "0.5";
            startBtn.textContent = "⏳ WAITING FOR OPPONENT...";
          }
        }
      } else if (role === "player2") {
        const guestP1Name = document.getElementById("guestP1NameDisplay");
        if (guestP1Name && roomData.players && roomData.players.player1) {
          guestP1Name.textContent = `${roomData.players.player1.name} (Host)`;
        }
      }
    }

    // 2. Status: ACTIVE AUCTION ROUND
    else if (status === "auction") {
      this.handleOnlineAuctionSync(roomData);
    }

    // 3. Status: SQUAD REVIEW
    else if (status === "review") {
      this.handleOnlineSquadReviewSync(roomData);
    }

    // 4. Status: MATCH DAY SIMULATION
    else if (status === "match") {
      this.handleOnlineMatchSync(roomData);
    }

    // Check Rematch requests if currently on Winner Screen
    const winnerScreen = document.getElementById("winnerScreen");
    if (winnerScreen && winnerScreen.classList.contains("active")) {
      const playAgainBtn = document.getElementById("playAgainBtn");
      if (roomData.rematchRequested && this.state.online.role === "player1" && playAgainBtn) {
        const requesterName = roomData.rematchRequested.name || "Opponent";
        playAgainBtn.innerHTML = `⚡ ${requesterName.toUpperCase()} WANTS REMATCH! ACCEPT ⚽`;
        playAgainBtn.style.animation = "pulse 1.2s infinite";
        playAgainBtn.disabled = false;
        playAgainBtn.style.opacity = "1";
      }
    }
  }

  handleOnlineAuctionSync(roomData) {
    const gameState = roomData.gameState;
    if (!gameState) return;

    // Switch screen to auction if not already
    if (this.state.screen !== "auction") {
      this.state.screen = "auction";
      this.showScreen("auctionScreen");
      // Close any previous open modals (like winner screen modals, inspect, etc.)
      document.querySelectorAll(".modal").forEach(m => m.classList.remove("active"));
    }

    // Clear match simulation state if new match / round 1
    if (gameState.currentRound === 1 && gameState.roundPhase === "bidding") {
      this.state.matchSim = null;
    }

    // Sync budgets & squads
    if (gameState.player1) {
      this.state.player1.budget = gameState.player1.budget;
      this.state.player1.squad = gameState.player1.squad || [];
    }
    if (gameState.player2) {
      this.state.player2.budget = gameState.player2.budget;
      this.state.player2.squad = gameState.player2.squad || [];
    }

    this.state.currentRound = gameState.currentRound || 1;
    this.state.currentAuctionPlayer = gameState.currentAuctionPlayer;
    this.state.currentBid = gameState.currentBid;
    this.state.highestBidder = gameState.highestBidder;
    this.state.currentTurn = gameState.currentTurn;
    this.state.bidHistory = gameState.bidHistory || [];
    this.state.usedPlayerIds = gameState.usedPlayerIds || [];

    const slot = this.getCurrentSlotInfo();
    this.updateRoundBanner(slot, this.state.currentAuctionPlayer);
    this.renderAuctionCard(this.state.currentAuctionPlayer);
    this.updateTurnDisplay();
    this.updateBiddingUI();
    this.renderTeamSidebars();
    this.renderBidHistory();

    // Check if round just finished with a Lucky Draw
    if (gameState.roundPhase === "resolved" && gameState.roundResult) {
      const res = gameState.roundResult;
      const roundKey = `${gameState.currentRound}_resolved`;
      if (this.state.online.lastProcessedPhase !== roundKey) {
        this.state.online.lastProcessedPhase = roundKey;
        this.showOnlineLuckyDrawModal(res);
      }
    } else if (gameState.roundPhase === "bidding") {
      this.state.online.lastProcessedPhase = `${gameState.currentRound}_bidding`;
      // Reset timer countdown
      if (this.state.timerEnabled && gameState.timerRemaining !== undefined) {
        this.state.timerRemaining = gameState.timerRemaining;
        this.updateTimerDisplay();
      }
    }
  }

  showOnlineLuckyDrawModal(res) {
    const winner = this.state[res.winnerId];
    const loser = this.state[res.loserId];
    this.showLuckyDrawModal(winner, loser, res.auctionPlayer, res.freePlayer, res.finalPrice);
  }

  handleOnlineSquadReviewSync(roomData) {
    if (this.state.screen !== "review") {
      this.state.screen = "review";
      this.showScreen("squadReviewScreen");
      this.showSquadReview();
    }

    // Sync tactics
    if (roomData && roomData.tactics) {
      if (roomData.tactics.t1Tactic) this.state.t1Tactic = roomData.tactics.t1Tactic;
      if (roomData.tactics.t2Tactic) this.state.t2Tactic = roomData.tactics.t2Tactic;
      this.updateTacticalBadgesAndLabels();
    }
  }

  handleOnlineMatchSync(roomData) {
    if (this.state.screen !== "match") {
      this.state.screen = "match";
      this.showScreen("matchDayScreen");
      
      const matchState = roomData.matchState;
      if (matchState && matchState.simulation) {
        this.startMatchSimulationWithData(matchState.simulation);
      }
    }
  }

  handleOpponentDisconnect() {
    this.state.online.opponentConnected = false;
    this.openModal("disconnectOverlayModal");

    const statusMsg = document.getElementById("disconnectStatusMessage");
    const timerSec = document.getElementById("disconnectTimerSec");
    if (statusMsg) {
      const oppName = this.state.online.role === "player1" ? this.state.player2.name : this.state.player1.name;
      statusMsg.textContent = `${oppName} has lost connection. Waiting 30 seconds for reconnection...`;
    }

    this.state.online.disconnectCountdown = 30;
    if (this.state.online.disconnectInterval) clearInterval(this.state.online.disconnectInterval);

    this.state.online.disconnectInterval = setInterval(() => {
      this.state.online.disconnectCountdown--;
      if (timerSec) timerSec.textContent = `${this.state.online.disconnectCountdown}s`;
      if (this.state.online.disconnectCountdown <= 0) {
        clearInterval(this.state.online.disconnectInterval);
        this.state.online.disconnectInterval = null;
        if (statusMsg) {
          statusMsg.textContent = "Reconnection window expired. You may claim victory!";
        }
      }
    }, 1000);
  }

  handleOpponentReconnect() {
    this.state.online.opponentConnected = true;
    if (this.state.online.disconnectInterval) {
      clearInterval(this.state.online.disconnectInterval);
      this.state.online.disconnectInterval = null;
    }
    this.closeModal("disconnectOverlayModal");
  }

  claimForfeitVictory() {
    this.closeModal("disconnectOverlayModal");
    const myRole = this.state.online.role;
    const winner = this.state[myRole];
    const loser = this.state[myRole === "player1" ? "player2" : "player1"];
    this.showVictoryScreen(winner, loser, 3, 0);
  }

  leaveOnlineRoom() {
    if (this.state.online.unsubRoomListener) {
      this.state.online.unsubRoomListener();
      this.state.online.unsubRoomListener = null;
    }
    this.state.online.isOnline = false;
    this.state.online.roomCode = null;
    this.state.online.role = null;
    this.state.online.roomData = null;
    this.state.online.opponentConnected = true;

    const headerOnlinePill = document.getElementById("headerOnlinePill");
    if (headerOnlinePill) headerOnlinePill.style.display = "none";
  }

  startGame() {
    sound.init();
    sound.playWhistle();

    // Collect custom budget if selected
    const customInput = document.getElementById("customBudgetInput");
    const activeBudgetChip = document.querySelector(".budget-chip.active");
    if (activeBudgetChip && activeBudgetChip.dataset.budget === "custom" && customInput) {
      const val = parseInt(customInput.value, 10);
      this.state.startingBudget = !isNaN(val) && val >= 30 ? val : 200;
    }

    // Collect Player Names
    const p1NameInput = document.getElementById("p1NameInput");
    const p2NameInput = document.getElementById("p2NameInput");
    this.state.player1.name = (p1NameInput && p1NameInput.value.trim()) || "Player 1";
    this.state.player2.name = (p2NameInput && p2NameInput.value.trim()) || (this.state.mode === "ai" ? "AI Maestro" : "Player 2");

    this.state.player1.budget = this.state.startingBudget;
    this.state.player2.budget = this.state.startingBudget;
    this.state.player1.squad = [];
    this.state.player2.squad = [];
    this.state.usedPlayerIds = [];
    this.state.currentRound = 1;

    // Update names in sidebars
    const p1NameHeader = document.getElementById("p1NameHeader");
    const p2NameHeader = document.getElementById("p2NameHeader");
    if (p1NameHeader) p1NameHeader.textContent = this.state.player1.name;
    if (p2NameHeader) p2NameHeader.textContent = this.state.player2.name;

    // Switch screen to auction
    this.showScreen("auctionScreen");
    this.renderTeamSidebars();
    this.startAuctionRound(1);
  }

  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add("active");
      window.scrollTo(0, 0);
    }
    const headerExitBtn = document.getElementById("headerExitBtn");
    if (headerExitBtn) {
      headerExitBtn.style.display = (screenId === "startScreen") ? "none" : "inline-flex";
    }
  }

  getCurrentSlotInfo() {
    const formation = FORMATIONS[this.state.formationKey] || FORMATIONS["4-3-3"];
    return formation.slots[this.state.currentRound - 1] || formation.slots[0];
  }

  /**
   * Initializes a single round of bidding for the formation slot
   */
  startAuctionRound(roundNumber) {
    this.state.currentRound = roundNumber;
    const slot = this.getCurrentSlotInfo();
    const position = slot.position;

    // Pick candidate for auction from selected league pool
    const candidate = getAuctionCandidate(position, this.state.selectedLeague, this.state.usedPlayerIds);
    this.state.currentAuctionPlayer = candidate;
    this.state.usedPlayerIds.push(candidate.id);

    // Initial base bid: approx 20-30% of player value or €10M min
    const baseBid = Math.max(5, Math.round(candidate.value * 0.25));
    this.state.currentBid = baseBid;
    this.state.initialBid = baseBid;
    this.state.highestBidder = null;
    this.state.p1Passed = false;
    this.state.p2Passed = false;
    this.state.bidHistory = [];
    this.state.isPaused = false;
    this.state.aiThinking = false;
    this.state.isTransitioning = false;

    // Alternating opening turn per footballer: Round 1 = Player 1, Round 2 = Player 2, Round 3 = Player 1, etc.
    this.state.currentTurn = roundNumber % 2 === 1 ? "player1" : "player2";

    this.updateRoundBanner(slot, candidate);
    this.renderAuctionCard(candidate);
    this.updateTurnDisplay();
    this.updateBiddingUI();
    this.renderTeamSidebars();

    // Start timer for the opening turn
    this.resetTimer();

    // If opening turn belongs to AI (Player 2), trigger AI turn decision automatically
    if (this.state.mode === "ai" && this.state.currentTurn === "player2") {
      this.triggerAITurn();
    }
  }

  updateRoundBanner(slot, candidate) {
    const roundNumberEl = document.getElementById("roundNumberDisplay");
    const roundTitleEl = document.getElementById("roundTitleDisplay");
    if (roundNumberEl) roundNumberEl.innerHTML = `${this.state.currentRound} <span class="round-dim">/ 11</span>`;
    if (roundTitleEl) roundTitleEl.textContent = `${slot.position} • ${slot.label}`;
  }

  renderAuctionCard(player) {
    const cardContainer = document.getElementById("auctionCardWrapper");
    if (!cardContainer || !player) return;

    const tier = player.tier || (player.rating >= 90 ? "World Class" : player.rating >= 80 ? "Elite" : "Good");
    const tierClass = `tier-${String(tier).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const rawName = String(player.name || "Player").trim();
    const nameParts = rawName.split(/\s+/).filter(Boolean);
    const initials = nameParts.length > 1 ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() : nameParts[0].slice(0, 2).toUpperCase();

    cardContainer.innerHTML = `
      <div class="auction-card-top-eyebrow">
        <h2>ON THE AUCTION BLOCK</h2>
        <p>Turn-based bidding • Pass triggers the Lucky Draw</p>
      </div>
      <div class="player-card ${tierClass}" id="mainAuctionCard" data-player-id="${player.id}">
        <div class="player-card-inner">
          <div class="card-shine"></div>
          <div class="card-top">
            <div class="card-rating-box">
              <span class="card-ovr">${player.rating}</span>
              <span class="card-pos">${player.position}</span>
            </div>
            <span class="card-tier-badge">${player.tier}</span>
          </div>

          <div class="card-portrait-area">
            <div class="silhouette-avatar">${initials}</div>
            <div class="card-player-name" title="${player.name}">${player.name}</div>
            <div class="card-meta-line">${player.club} • ${player.league}</div>
          </div>

          <div class="card-stats-grid">
            <div class="stat-item"><span class="stat-label">PAC</span><span class="stat-val">${player.pace}</span></div>
            <div class="stat-item"><span class="stat-label">SHO</span><span class="stat-val">${player.shooting}</span></div>
            <div class="stat-item"><span class="stat-label">PAS</span><span class="stat-val">${player.passing}</span></div>
            <div class="stat-item"><span class="stat-label">DRI</span><span class="stat-val">${player.dribbling}</span></div>
            <div class="stat-item"><span class="stat-label">DEF</span><span class="stat-val">${player.defending}</span></div>
            <div class="stat-item"><span class="stat-label">PHY</span><span class="stat-val">${player.physical}</span></div>
          </div>

          <div class="card-value-strip">
            <span>ESTIMATED VALUE</span>
            <strong>€${player.value}M</strong>
          </div>
        </div>
      </div>
    `;

    const mainCard = document.getElementById("mainAuctionCard");
    if (mainCard) {
      mainCard.addEventListener("click", () => this.inspectPlayer(player));
    }
  }

  /**
   * Updates the Turn Indicator and highlights active team turn
   */
  updateTurnDisplay() {
    const badge = document.getElementById("turnBadge");
    const p1Panel = document.getElementById("p1TeamPanel");
    const p2Panel = document.getElementById("p2TeamPanel");

    const isP1 = this.state.currentTurn === "player1";
    const activePlayer = isP1 ? this.state.player1 : this.state.player2;
    const isAI = !isP1 && this.state.mode === "ai";

    if (badge) {
      badge.className = `turn-badge ${isP1 ? "p1-turn" : "p2-turn"}`;
      if (this.state.isTransitioning) {
        badge.textContent = "⏳ PASSING TURN...";
      } else if (isAI) {
        badge.textContent = `🤖 ${activePlayer.name.toUpperCase()}'S TURN`;
      } else {
        badge.textContent = `🔥 ${activePlayer.name.toUpperCase()} — YOUR TURN`;
      }
    }

    if (p1Panel && p2Panel) {
      p1Panel.classList.toggle("active-turn-side", isP1);
      p2Panel.classList.toggle("active-turn-side", !isP1);
      p2Panel.classList.toggle("p2-active-side", !isP1);
    }
  }

  updateBiddingUI() {
    const currentBidEl = document.getElementById("currentBidDisplay");
    const bidHolderPill = document.getElementById("bidHolderPill");
    if (currentBidEl) {
      currentBidEl.innerHTML = `€${this.state.currentBid}<span style="font-size:2rem;font-weight:600;opacity:0.6;margin-left:2px;font-style:normal;">M</span>`;
    }

    if (bidHolderPill) {
      bidHolderPill.className = "bid-holder-pill";
      if (!this.state.highestBidder) {
        bidHolderPill.classList.add("holder-none");
        bidHolderPill.textContent = "NO ACTIVE BIDS";
      } else if (this.state.highestBidder === "player1") {
        bidHolderPill.classList.add("holder-p1");
        bidHolderPill.textContent = `HELD BY ${this.state.player1.name.toUpperCase()}`;
      } else {
        bidHolderPill.classList.add("holder-p2");
        bidHolderPill.textContent = `HELD BY ${this.state.player2.name.toUpperCase()}`;
      }
    }

    // Render Bidding Buttons for Player 1
    this.renderPlayerBidColumn("player1", "p1BidControls");

    // Render Bidding Buttons for Player 2
    this.renderPlayerBidColumn("player2", "p2BidControls");

    // Update History Feed
    this.renderBidHistory();
  }

  renderPlayerBidColumn(playerId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const player = this.state[playerId];
    const isP1 = playerId === "player1";
    const isAI = !isP1 && this.state.mode === "ai";
    const isMyTurn = this.state.currentTurn === playerId;
    const isTransitioning = this.state.isTransitioning;
    const hasPassed = isP1 ? this.state.p1Passed : this.state.p2Passed;
    const budget = player.budget;
    const currentBid = this.state.currentBid;

    // Reset container classes
    container.className = `player-bid-column ${isP1 ? "p1-col" : "p2-col"}`;
    if (isMyTurn) {
      container.classList.add("active-turn", isP1 ? "p1-turn" : "p2-turn");
    }

    const isTurnActive = isMyTurn && !isTransitioning && !this.state.isPaused && !hasPassed;

    const isOnline = this.state.mode === "online";
    const isMyOnlineRole = isOnline ? (this.state.online.role === playerId) : true;

    let turnTag = "";
    if (hasPassed) {
      turnTag = `<span style="color:#ef4444;font-size:0.75rem;font-weight:700;">(PASSED)</span>`;
    } else if (isMyTurn) {
      if (isAI) {
        turnTag = `<span style="color:var(--p2-bright);font-size:0.75rem;font-weight:700;">(AI ACTING...)</span>`;
      } else if (isOnline) {
        turnTag = isMyOnlineRole
          ? `<span style="color:var(--green-bright);font-size:0.75rem;font-weight:700;">(YOUR TURN ⚡)</span>`
          : `<span style="color:#fbbf24;font-size:0.75rem;font-weight:700;">(OPPONENT'S TURN...)</span>`;
      } else {
        turnTag = `<span style="color:${isP1 ? 'var(--p1-bright)' : 'var(--p2-bright)'};font-size:0.75rem;font-weight:700;">(TURN)</span>`;
      }
    } else {
      turnTag = `<span style="color:var(--text-dim);font-size:0.75rem;font-weight:600;">(WAITING)</span>`;
    }

    let html = `
      <div class="column-header">
        <span class="name">${player.name} ${turnTag}</span>
        <span class="budget">Budget: €${budget}M</span>
      </div>
      <div class="bid-button-grid">
    `;

    const increments = [1, 5, 10, 20];
    increments.forEach(inc => {
      const targetBid = currentBid + inc;
      const canAfford = targetBid <= budget;
      const disabled = !isTurnActive || !canAfford || (isAI && isMyTurn) || (isOnline && !isMyOnlineRole);
      html += `
        <button class="bid-btn" data-player="${playerId}" data-amount="${inc}" ${disabled ? "disabled" : ""}>
          +€${inc}M
        </button>
      `;
    });

    // ALL IN Button
    const canAllIn = isTurnActive && budget > currentBid && !(isAI && isMyTurn) && (!isOnline || isMyOnlineRole);
    html += `
      <button class="bid-btn all-in" data-player="${playerId}" data-action="all-in" ${!canAllIn ? "disabled" : ""}>
        🔥 ALL IN (€${budget}M)
      </button>
    `;

    // PASS Button
    const canPass = isTurnActive && !hasPassed && !(isAI && isMyTurn) && (!isOnline || isMyOnlineRole);
    html += `
      <button class="bid-btn pass-btn" data-player="${playerId}" data-action="pass" ${!canPass ? "disabled" : ""}>
        ${hasPassed ? "PASSED" : "PASS (TRIGGER DRAW)"}
      </button>
    </div>`;

    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll(".bid-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (this.state.isTransitioning || this.state.isPaused || !isTurnActive) return;
        if (isOnline && !isMyOnlineRole) return;

        const action = btn.dataset.action;
        const amount = parseInt(btn.dataset.amount, 10);
        if (action === "pass") {
          this.handlePass(playerId);
        } else if (action === "all-in") {
          this.handleBid(playerId, budget);
        } else if (!isNaN(amount)) {
          this.handleBid(playerId, this.state.currentBid + amount);
        }
      });
    });
  }

  /**
   * Handles an active bid by either Player 1 or Player 2
   */
  async handleBid(playerId, newBidAmount) {
    if (this.state.isPaused) return;

    const bidder = this.state[playerId];
    if (newBidAmount <= this.state.currentBid) return;
    if (newBidAmount > bidder.budget) {
      this.showBudgetWarning();
      return;
    }

    if (this.state.mode === "online") {
      const roomCode = this.state.online.roomCode;
      if (roomCode) {
        sound.playBid();
        await firebaseMultiplayer.submitBid(roomCode, playerId, newBidAmount, bidder.name);
      }
      return;
    }

    // Set new highest bidder
    this.state.currentBid = newBidAmount;
    this.state.highestBidder = playerId;

    sound.playBid();

    this.state.bidHistory.unshift({
      player: bidder.name,
      playerId,
      amount: newBidAmount,
      time: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })
    });

    // Switch turn to the opposing player
    const nextTurn = playerId === "player1" ? "player2" : "player1";
    this.state.currentTurn = nextTurn;
    this.resetTimer();
    this.updateTurnDisplay();
    this.updateBiddingUI();

    // If next turn is AI, trigger AI decision with a brief thinking indicator
    if (this.state.mode === "ai" && nextTurn === "player2") {
      this.triggerAITurn();
    }
  }

  /**
   * Handles a Pass action.
   * If a competitor passes, the other player immediately wins the auction!
   */
  async handlePass(playerId) {
    if (this.state.isPaused) return;

    sound.playClick();

    if (this.state.mode === "online") {
      const roomCode = this.state.online.roomCode;
      if (roomCode) {
        const slot = this.getCurrentSlotInfo();
        const rawFree = getRandomFreePlayer(slot.position, this.state.selectedLeague, this.state.usedPlayerIds);
        const freePlayer = (rawFree && rawFree.player && rawFree.player.name)
          ? { ...rawFree.player, ...rawFree }
          : (rawFree || {});

        await firebaseMultiplayer.submitPass(roomCode, playerId, freePlayer);
      }
      return;
    }

    const passer = this.state[playerId];
    this.state.bidHistory.unshift({
      player: passer.name,
      playerId,
      action: "passed",
      amount: 0,
      time: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })
    });

    if (playerId === "player1") {
      this.state.p1Passed = true;
    } else {
      this.state.p2Passed = true;
    }

    // The other player immediately wins the player on auction!
    // If no bids were placed before the pass, the winner pays the initial base bid.
    const otherPlayerId = playerId === "player1" ? "player2" : "player1";
    if (!this.state.highestBidder) {
      this.state.highestBidder = otherPlayerId;
    }

    this.resolveAuction();
  }

  /**
   * AI takes its turn with a clear, realistic thinking pause (600ms)
   */
  triggerAITurn() {
    if (this.state.isPaused || this.state.p2Passed) return;

    this.state.aiThinking = true;
    this.updateTurnDisplay();
    this.updateBiddingUI();

    setTimeout(() => {
      if (this.state.isPaused) return;

      this.state.aiThinking = false;

      const decision = this.ai.decide({
        playerOnAuction: this.state.currentAuctionPlayer,
        currentBid: this.state.currentBid,
        highestBidder: this.state.highestBidder,
        aiBudget: this.state.player2.budget,
        opponentBudget: this.state.player1.budget,
        remainingRounds: 11 - this.state.currentRound + 1,
        minIncrement: 1
      });

      if (decision.action === "bid" && decision.amount > this.state.currentBid && decision.amount <= this.state.player2.budget) {
        // AI places a bid and returns turn to Player 1
        this.handleBid("player2", decision.amount);
      } else {
        // AI passes -> Player 1 wins immediately!
        this.handlePass("player2");
      }
    }, 600);
  }

  showBudgetWarning() {
    const errorMsg = document.getElementById("bidErrorMessage");
    if (errorMsg) {
      errorMsg.style.display = "block";
      setTimeout(() => {
        errorMsg.style.display = "none";
      }, 2500);
    }
  }

  resetTimer() {
    clearInterval(this.state.timerInterval);
    if (!this.state.timerEnabled) {
      const timerVal = document.getElementById("timerValDisplay");
      if (timerVal) timerVal.textContent = "OFF";
      return;
    }

    this.state.timerRemaining = this.state.timerDuration;
    this.updateTimerDisplay();

    this.state.timerInterval = setInterval(() => {
      if (this.state.isPaused || this.state.isTransitioning) return;

      this.state.timerRemaining--;
      this.updateTimerDisplay();

      if (this.state.timerRemaining <= 3 && this.state.timerRemaining > 0) {
        sound.playTick();
      }

      if (this.state.timerRemaining <= 0) {
        clearInterval(this.state.timerInterval);
        // Time expired on active player -> that player automatically passes!
        this.handlePass(this.state.currentTurn);
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const timerVal = document.getElementById("timerValDisplay");
    const timerPill = document.getElementById("auctionTimerPill");
    const sec = this.state.timerRemaining;
    const formatted = sec < 10 ? `00:0${sec}` : `00:${sec}`;
    if (timerVal) timerVal.textContent = formatted;
    if (timerPill) {
      timerPill.classList.toggle("urgent", this.state.timerRemaining <= 3);
    }
  }

  renderBidHistory() {
    const historyContainer = document.getElementById("bidHistoryFeed");
    if (!historyContainer) return;

    if (this.state.bidHistory.length === 0) {
      historyContainer.innerHTML = `<span style="opacity:0.6;">No bids logged this round yet.</span>`;
      return;
    }

    historyContainer.innerHTML = this.state.bidHistory.slice(0, 5).map(item => {
      const pClass = item.playerId === "player1" ? "p1" : "p2";
      if (item.action === "passed") {
        return `<div class="history-item ${pClass}"><span>${item.player}</span><span>Passed (Lucky Draw)</span></div>`;
      }
      return `<div class="history-item ${pClass}"><span>${item.player}</span><span>€${item.amount}M</span></div>`;
    }).join("");
  }

  /**
   * Resolves the round:
   * Winner gets auction player and pays winning bid.
   * Loser gets random free player of exact same position from database pool.
   */
  resolveAuction() {
    this.state.isPaused = true;
    clearInterval(this.state.timerInterval);
    sound.playGavel();

    let winnerId = this.state.highestBidder;
    let winningBid = this.state.currentBid;

    // Edge case: if nobody bid at all, active player wins for minimal bid
    if (!winnerId) {
      winnerId = this.state.currentTurn === "player1" ? "player2" : "player1";
      winningBid = this.state.initialBid;
    }

    const loserId = winnerId === "player1" ? "player2" : "player1";
    const winner = this.state[winnerId];
    const loser = this.state[loserId];

    // Winner pays bid
    const finalPrice = Math.min(winner.budget, winningBid);
    winner.budget -= finalPrice;

    const auctionPlayer = this.state.currentAuctionPlayer;
    const slot = this.getCurrentSlotInfo();

    // Add auction player to winner
    winner.squad.push({
      slotIndex: this.state.currentRound,
      position: slot.position,
      label: slot.label,
      player: auctionPlayer
    });

    // Pick random free player for loser of EXACT same position
    const rawFree = getRandomFreePlayer(slot.position, this.state.selectedLeague, this.state.usedPlayerIds);
    const freePlayer = (rawFree && rawFree.player && rawFree.player.name)
      ? { ...rawFree.player, ...rawFree }
      : (rawFree || {});

    if (freePlayer.id) {
      this.state.usedPlayerIds.push(freePlayer.id);
    }

    loser.squad.push({
      slotIndex: this.state.currentRound,
      position: slot.position,
      label: slot.label,
      player: freePlayer
    });

    // Trigger dramatic Lucky Draw sequence
    this.showLuckyDrawModal(winner, loser, auctionPlayer, freePlayer, finalPrice);
  }

  /**
   * Suspenseful multi-step Lucky Draw Reveal (Buttonless, Auto-advancing)
   */
  showLuckyDrawModal(winner, loser, auctionPlayer, freePlayer, pricePaid) {
    const modal = document.getElementById("luckyDrawModal");
    if (!modal) {
      this.advanceToNextRound();
      return;
    }

    if (this.state.luckyAdvanceTimer) {
      clearTimeout(this.state.luckyAdvanceTimer);
      this.state.luckyAdvanceTimer = null;
    }

    modal.classList.add("active");
    sound.playWhistle();

    const winnerSummaryEl = document.getElementById("winnerSummaryPill");
    if (winnerSummaryEl) {
      const winnerName = winner ? winner.name : "Winner";
      const pName = auctionPlayer ? auctionPlayer.name : "Player";
      winnerSummaryEl.textContent = `🏆 ${winnerName} secured ${pName} for €${pricePaid}M!`;
    }

    const rouletteEl = document.getElementById("luckyRouletteArea");
    const barFill = document.getElementById("autoContinueBar");
    if (barFill) {
      barFill.style.transition = "none";
      barFill.style.width = "0%";
    }

    let isRevealed = false;
    let stepInterval = null;
    let keyHandler = null;

    const doAdvance = () => {
      if (this.state.luckyAdvanceTimer) {
        clearTimeout(this.state.luckyAdvanceTimer);
        this.state.luckyAdvanceTimer = null;
      }
      if (stepInterval) clearInterval(stepInterval);
      if (keyHandler) window.removeEventListener("keydown", keyHandler);
      modal.onclick = null;
      modal.classList.remove("active");
      this.advanceToNextRound();
    };

    // Tap/click anywhere on the modal or background to advance immediately
    modal.onclick = () => {
      if (isRevealed) {
        doAdvance();
      }
    };

    // Keyboard shortcut: Space, Enter, or Escape advances immediately
    keyHandler = (e) => {
      if (modal.classList.contains("active")) {
        if (e.code === "Space" || e.code === "Enter" || e.code === "Escape") {
          e.preventDefault();
          doAdvance();
        }
      }
    };
    window.addEventListener("keydown", keyHandler);

    // Suspenseful multi-step text progression
    const loserName = loser ? loser.name.toUpperCase() : "LOSER";
    const suspenseSteps = [
      `🎁 RANDOM FREE PLAYER FOR ${loserName}`,
      `🔍 Accessing ${this.state.selectedLeague || "football"} database...`,
      `🎲 Randomizing probabilities...`,
      `💥 REVEAL!`
    ];

    let currentStep = 0;
    stepInterval = setInterval(() => {
      sound.playTick();
      if (rouletteEl && currentStep < suspenseSteps.length) {
        rouletteEl.innerHTML = `
          <div class="lucky-badge">🎁 ${loserName} LUCKY DRAW</div>
          <div class="roulette-spin">${suspenseSteps[currentStep]}</div>
        `;
      }
      currentStep++;

      if (currentStep >= suspenseSteps.length) {
        clearInterval(stepInterval);
        isRevealed = true;
        this.revealLuckyPlayer(rouletteEl, modal, loser, freePlayer, doAdvance);
      }
    }, 280);
  }

  revealLuckyPlayer(rouletteEl, modal, loser, freePlayer, onComplete) {
    try {
      const p = (freePlayer && freePlayer.player && freePlayer.player.name) ? freePlayer.player : (freePlayer || {});
      const rating = Number(p.rating) || 75;
      const playerName = p.name || "Mystery Player";
      const position = p.position || (this.getCurrentSlotInfo() ? this.getCurrentSlotInfo().position : "SUB");
      const tier = p.tier || (rating >= 90 ? "World Class" : rating >= 80 ? "Elite" : "Good");
      const club = p.club || "World Football";
      const league = p.league || (this.state.selectedLeague || "Global League");
      const pace = p.pace !== undefined ? p.pace : rating;
      const shooting = p.shooting !== undefined ? p.shooting : rating;
      const defending = p.defending !== undefined ? p.defending : rating;
      const value = p.value || 20;

      let luckAppraisal = p.luckText || "";
      let luckColor = "#38bdf8";

      if (!luckAppraisal) {
        if (rating >= 95) {
          luckAppraisal = `INSANE LUCK! 🌟 ${rating} OVR`;
          luckColor = "#fbbf24";
        } else if (rating >= 90) {
          luckAppraisal = `GREAT LUCK! 🔥 ${rating} OVR`;
          luckColor = "#22c55e";
        } else if (rating >= 80) {
          luckAppraisal = `GOOD LUCK! ✨ ${rating} OVR`;
          luckColor = "#38bdf8";
        } else if (rating >= 70) {
          luckAppraisal = `AVERAGE LUCK ⚖️ ${rating} OVR`;
          luckColor = "#a3a3a3";
        } else if (rating >= 60) {
          luckAppraisal = `BAD DRAW 📉 ${rating} OVR`;
          luckColor = "#f87171";
        } else {
          luckAppraisal = `TERRIBLE LUCK! 💀 ${rating} OVR`;
          luckColor = "#ef4444";
        }
      }

      sound.playReveal(rating >= 90);

      const tierClass = `tier-${String(tier).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const nameParts = String(playerName).trim().split(" ").filter(Boolean);
      const initials = nameParts.length > 1 ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() : nameParts[0].slice(0, 2).toUpperCase();

      if (rouletteEl) {
        rouletteEl.innerHTML = `
          <div class="lucky-badge" style="color: ${luckColor}; font-weight: 900; font-size: 1rem; letter-spacing: 0.05em;">
            ${luckAppraisal}
          </div>
          <div class="player-card ${tierClass}" style="margin: 0.4rem auto; width: 220px; max-width: 90%;">
            <div class="card-top">
              <div class="card-rating-box">
                <span class="card-ovr">${rating}</span>
                <span class="card-pos">${position}</span>
              </div>
              <span class="card-tier-badge">${tier}</span>
            </div>
            <div class="card-portrait-area" style="padding: 0.5rem 0.25rem;">
              <div class="silhouette-avatar" style="width:48px; height:48px; font-size:1.25rem;">${initials}</div>
              <div class="card-player-name" style="font-size: 1.05rem;">${playerName}</div>
              <div class="card-meta-line" style="font-size: 0.72rem;">${club} • ${league}</div>
            </div>
            <div class="card-stats-grid" style="padding: 0.35rem 0.5rem;">
              <div class="stat-item"><span class="stat-label">PAC</span><span class="stat-val">${pace}</span></div>
              <div class="stat-item"><span class="stat-label">SHO</span><span class="stat-val">${shooting}</span></div>
              <div class="stat-item"><span class="stat-label">DEF</span><span class="stat-val">${defending}</span></div>
            </div>
            <div class="card-value-strip" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              <span>MARKET VALUE</span>
              <strong>€${value}M (FREE)</strong>
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.error("Error in revealLuckyPlayer:", err);
      if (rouletteEl) {
        rouletteEl.innerHTML = `
          <div class="lucky-badge" style="color: #22c55e; font-weight: 900; font-size: 1rem;">
            🎁 FREE PLAYER AWARDED!
          </div>
          <p style="text-align:center; color:var(--text-dim); margin-top:0.5rem;">Player successfully added to squad!</p>
        `;
      }
    }

    // Trigger smooth auto-advance progress animation (2.4 seconds)
    const barFill = document.getElementById("autoContinueBar");
    if (barFill) {
      requestAnimationFrame(() => {
        barFill.style.transition = "width 2.4s linear";
        barFill.style.width = "100%";
      });
    }

    // Automatically advance after 2.4 seconds
    this.state.luckyAdvanceTimer = setTimeout(() => {
      if (typeof onComplete === "function") {
        onComplete();
      } else {
        modal.classList.remove("active");
        this.advanceToNextRound();
      }
    }, 2400);
  }

  advanceToNextRound() {
    try {
      // Clean up modal overlay
      document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));

      try {
        this.renderTeamSidebars();
      } catch (err) {
        console.error("renderTeamSidebars error:", err);
      }

      if (this.state.mode === "online") {
        if (this.state.online.role === "player1") {
          const nextRound = (this.state.currentRound || 1) + 1;
          if (this.state.currentRound >= 11) {
            firebaseMultiplayer.startOnlineSquadReview(this.state.online.roomCode);
          } else {
            const formation = FORMATIONS[this.state.formationKey] || FORMATIONS["4-3-3"];
            const slot = formation.slots[nextRound - 1] || formation.slots[0];
            const candidate = getAuctionCandidate(slot.position, this.state.selectedLeague, this.state.usedPlayerIds);
            const baseBid = Math.max(5, Math.round(candidate.value * 0.25));
            firebaseMultiplayer.advanceOnlineRound(this.state.online.roomCode, nextRound, candidate, baseBid);
          }
        }
        return;
      }

      if (this.state.currentRound >= 11) {
        // Squads completed! Move to squad review screen
        this.showSquadReview();
      } else {
        this.startAuctionRound(this.state.currentRound + 1);
      }
    } catch (fatalErr) {
      console.error("Error in advanceToNextRound, executing fallback:", fatalErr);
      this.state.isTransitioning = false;
      this.state.aiThinking = false;
      this.startAuctionRound(Math.min(11, (this.state.currentRound || 1) + 1));
    }
  }

  renderTeamSidebars() {
    ["player1", "player2"].forEach(playerId => {
      const p = this.state[playerId];
      const budgetEl = document.getElementById(`${playerId}BudgetVal`);
      if (budgetEl) budgetEl.textContent = `€${p.budget}M`;

      const countEl = document.getElementById(`${playerId}CountVal`);
      if (countEl) countEl.textContent = `${p.squad.length}/11`;

      const progressBar = document.getElementById(`${playerId === "player1" ? "p1" : "p2"}ProgressBar`);
      if (progressBar) {
        progressBar.style.width = `${Math.round((p.squad.length / 11) * 100)}%`;
      }

      const stats = calculateTeamStats(p.squad, p.budget);
      const ovrEl = document.getElementById(`${playerId}OvrVal`);
      if (ovrEl) ovrEl.textContent = `${stats.overall} OVR`;

      // Render pitch slots
      this.renderPitchSlots(playerId, p.squad);
    });
  }

  renderPitchSlots(playerId, squad) {
    const pitchContainer = document.getElementById(`${playerId}PitchContainer`);
    if (!pitchContainer) return;

    const formation = FORMATIONS[this.state.formationKey] || FORMATIONS["4-3-3"];
    pitchContainer.querySelectorAll(".pitch-slot").forEach(s => s.remove());

    const safeSquad = Array.isArray(squad) ? squad : [];

    formation.slots.forEach((slotDef, idx) => {
      const slotIndex = idx + 1;
      const filledItem = safeSquad.find((s, sIdx) => {
        if (!s) return false;
        if (s.slotIndex === slotIndex) return true;
        if (!s.slotIndex && sIdx === idx) return true;
        return false;
      });

      const slotEl = document.createElement("div");
      slotEl.className = "pitch-slot";
      slotEl.style.left = `${slotDef.x}%`;
      slotEl.style.top = `${slotDef.y}%`;

      if (slotIndex === this.state.currentRound && !filledItem) {
        slotEl.classList.add("active-target");
      }

      const p = filledItem ? (filledItem.player || filledItem) : null;

      if (p && (p.name || p.rating)) {
        const tier = (p && p.tier) ? String(p.tier) : (p && p.rating >= 90 ? "World Class" : p && p.rating >= 80 ? "Elite" : "Good");
        const tierClass = `tier-${tier.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        slotEl.classList.add("filled", tierClass);
        const rawName = String(p.name || "Player").trim();
        const nameParts = rawName.split(/\s+/).filter(Boolean);
        const displayName = nameParts[nameParts.length - 1] || "Player";
        slotEl.innerHTML = `
          <span class="slot-ovr">${p.rating || 75}</span>
          <span class="slot-pos">${p.position || slotDef.position}</span>
          <span class="slot-name">${displayName}</span>
        `;
        slotEl.addEventListener("click", () => this.inspectPlayer(p));
      } else {
        slotEl.innerHTML = `<span>${slotDef.label}</span>`;
      }

      pitchContainer.appendChild(slotEl);
    });
  }

  showSquadReview() {
    this.showScreen("squadReviewScreen");
    sound.playWhistle();

    const t1 = this.state.player1;
    const t2 = this.state.player2;

    const t1Stats = calculateTeamStats(t1.squad, t1.budget);
    const t2Stats = calculateTeamStats(t2.squad, t2.budget);

    // Update names
    document.getElementById("reviewT1Name").textContent = t1.name;
    document.getElementById("reviewT2Name").textContent = t2.name;

    // Update overall scores
    document.getElementById("reviewT1Ovr").textContent = `${t1Stats.overall}`;
    document.getElementById("reviewT2Ovr").textContent = `${t2Stats.overall}`;

    // Fill comparison bars
    const populateBars = (prefix, stats, fillClass) => {
      const list = document.getElementById(`${prefix}StatBarsList`);
      if (!list) return;

      const items = [
        { label: "Attack (ATT)", val: stats.attack },
        { label: "Midfield (MID)", val: stats.midfield },
        { label: "Defense (DEF)", val: stats.defense },
        { label: "Goalkeeping (GK)", val: stats.goalkeeping },
        { label: "Chemistry", val: stats.chemistry },
        { label: "Average Player Rating", val: stats.averageRating },
        { label: "Remaining Budget", val: stats.remainingBudget, max: this.state.startingBudget, unit: "€M" }
      ];

      list.innerHTML = items.map(it => {
        const percent = it.max ? Math.min(100, Math.round((it.val / it.max) * 100)) : Math.min(100, it.val);
        const displayVal = it.unit ? `${it.unit}${it.val}` : it.val;
        return `
          <div class="stat-bar-row">
            <div class="stat-bar-label">
              <span>${it.label}</span>
              <strong>${displayVal}</strong>
            </div>
            <div class="stat-bar-track">
              <div class="stat-bar-fill ${fillClass}" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      }).join("");
    };

    populateBars("t1", t1Stats, "p1-fill");
    populateBars("t2", t2Stats, "p2-fill");

    // Initialize starting tactical blueprints
    if (!this.state.t1Tactic) this.state.t1Tactic = "BALANCED";
    if (!this.state.t2Tactic) this.state.t2Tactic = "BALANCED";

    const rT1Title = document.getElementById("reviewT1TacticTitle");
    const rT2Title = document.getElementById("reviewT2TacticTitle");
    if (rT1Title) rT1Title.textContent = `🟢 ${t1.name} Starting Tactics:`;
    if (rT2Title) rT2Title.textContent = `🔵 ${t2.name} Starting Tactics:`;

    const isOnline = this.state.mode === "online";
    const myRole = isOnline ? this.state.online.role : null;

    // Player 1 Review Tactics Buttons
    document.querySelectorAll(".p1-review-chip").forEach(chip => {
      const disabled = isOnline && myRole !== "player1";
      chip.classList.toggle("active", chip.dataset.tactic === this.state.t1Tactic);
      chip.style.opacity = disabled ? "0.4" : "1";
      chip.style.pointerEvents = disabled ? "none" : "auto";
      chip.onclick = () => {
        if (disabled) return;
        document.querySelectorAll(".p1-review-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.t1Tactic = chip.dataset.tactic;
        sound.playClick();
        if (isOnline) {
          firebaseMultiplayer.updateTactics(this.state.online.roomCode, {
            t1Tactic: this.state.t1Tactic,
            t2Tactic: this.state.t2Tactic
          });
        }
      };
    });

    // Player 2 Review Tactics Buttons
    document.querySelectorAll(".p2-review-chip").forEach(chip => {
      const disabled = isOnline && myRole !== "player2";
      chip.classList.toggle("active", chip.dataset.tactic === this.state.t2Tactic);
      chip.style.opacity = disabled ? "0.4" : "1";
      chip.style.pointerEvents = disabled ? "none" : "auto";
      chip.onclick = () => {
        if (disabled) return;
        document.querySelectorAll(".p2-review-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.t2Tactic = chip.dataset.tactic;
        sound.playClick();
        if (isOnline) {
          firebaseMultiplayer.updateTactics(this.state.online.roomCode, {
            t1Tactic: this.state.t1Tactic,
            t2Tactic: this.state.t2Tactic
          });
        }
      };
    });

    const proceedBtn = document.getElementById("proceedToMatchBtn");
    if (proceedBtn) {
      if (isOnline && myRole === "player2") {
        proceedBtn.disabled = true;
        proceedBtn.textContent = "⏳ WAITING FOR HOST TO START MATCH...";
        proceedBtn.style.opacity = "0.6";
      } else {
        proceedBtn.disabled = false;
        proceedBtn.textContent = "PROCEED TO MATCH DAY ⚽";
        proceedBtn.style.opacity = "1";
        proceedBtn.onclick = () => {
          if (isOnline && myRole === "player1") {
            const sim = generateMatchSimulation(this.state.player1, this.state.player2, {
              t1Tactic: this.state.t1Tactic,
              t2Tactic: this.state.t2Tactic
            });
            firebaseMultiplayer.startOnlineMatchSimulation(this.state.online.roomCode, sim);
            this.startMatchSimulationWithData(sim);
          } else {
            this.startMatchSimulation();
          }
        };
      }
    }
  }

  startMatchSimulationWithData(simData) {
    this.startMatchSimulation(simData);
  }

  startMatchSimulation(preGeneratedSim = null) {
    this.showScreen("matchDayScreen");
    sound.playWhistle();

    // Ensure default tactical styles exist
    if (!this.state.t1Tactic) this.state.t1Tactic = "BALANCED";
    if (!this.state.t2Tactic) this.state.t2Tactic = "BALANCED";

    // Setup tactic titles
    const p1TacticTitle = document.getElementById("p1TacticTitle");
    const p2TacticTitle = document.getElementById("p2TacticTitle");
    if (p1TacticTitle) p1TacticTitle.textContent = `🟢 ${this.state.player1.name.toUpperCase()} TACTICS:`;
    if (p2TacticTitle) p2TacticTitle.textContent = `🔵 ${this.state.player2.name.toUpperCase()} TACTICS:`;

    const momentumLabelP1 = document.getElementById("momentumLabelP1");
    const momentumLabelP2 = document.getElementById("momentumLabelP2");
    if (momentumLabelP1) momentumLabelP1.textContent = `🟢 ${this.state.player1.name}`;
    if (momentumLabelP2) momentumLabelP2.textContent = `🔵 ${this.state.player2.name}`;

    // Setup initial tactical badges and labels
    this.updateTacticalBadgesAndLabels();

    // Prepare simulation
    this.state.matchSim = preGeneratedSim || generateMatchSimulation(this.state.player1, this.state.player2, {
      t1Tactic: this.state.t1Tactic,
      t2Tactic: this.state.t2Tactic
    });
    this.state.matchCurrentMinute = 0;
    this.state.matchCurrentEventIndex = 0;

    // Reset Shootout Banner if visible
    const shootoutBanner = document.getElementById("shootoutBanner");
    if (shootoutBanner) shootoutBanner.style.display = "none";

    // Setup scoreboard labels
    document.getElementById("matchT1Name").textContent = this.state.player1.name;
    document.getElementById("matchT2Name").textContent = this.state.player2.name;

    const t1Stats = calculateTeamStats(this.state.player1.squad);
    const t2Stats = calculateTeamStats(this.state.player2.squad);
    document.getElementById("matchT1Ovr").textContent = `${t1Stats.overall} OVR`;
    document.getElementById("matchT2Ovr").textContent = `${t2Stats.overall} OVR`;

    document.getElementById("matchScoreboardNumber").textContent = "0 - 0";
    document.getElementById("matchClockDisplay").textContent = "1'";
    
    const liveXGEl = document.getElementById("matchLiveXG");
    if (liveXGEl) liveXGEl.textContent = "xG: 0.00 - 0.00";

    const pointer = document.getElementById("momentumBarPointer");
    if (pointer) pointer.style.left = "50%";

    const zoneEl = document.getElementById("pitchZoneIndicator");
    if (zoneEl) zoneEl.textContent = "🏟️ Ball in Midfield";

    const commentaryFeed = document.getElementById("commentaryFeedScroll");
    if (commentaryFeed) commentaryFeed.innerHTML = "";

    this.setupTacticalButtons();
    this.setupMatchSpeedControls();
    this.runMatchSimulationLoop();
  }

  updateTacticalBadgesAndLabels() {
    const t1Tactic = TACTICAL_STYLES[this.state.t1Tactic] || TACTICAL_STYLES.BALANCED;
    const t2Tactic = TACTICAL_STYLES[this.state.t2Tactic] || TACTICAL_STYLES.BALANCED;

    const t1Badge = document.getElementById("matchT1TacticBadge");
    const t2Badge = document.getElementById("matchT2TacticBadge");
    if (t1Badge) t1Badge.textContent = `${t1Tactic.icon} ${t1Tactic.name}`;
    if (t2Badge) t2Badge.textContent = `${t2Tactic.icon} ${t2Tactic.name}`;

    const p1ActiveLabel = document.getElementById("p1ActiveTacticLabel");
    const p2ActiveLabel = document.getElementById("p2ActiveTacticLabel");
    if (p1ActiveLabel) p1ActiveLabel.textContent = `${t1Tactic.icon} ${t1Tactic.name}`;
    if (p2ActiveLabel) p2ActiveLabel.textContent = `${t2Tactic.icon} ${t2Tactic.name}`;

    document.querySelectorAll(".p1-chip").forEach(c => {
      c.classList.toggle("active", c.dataset.tactic === this.state.t1Tactic);
    });
    document.querySelectorAll(".p2-chip").forEach(c => {
      c.classList.toggle("active", c.dataset.tactic === this.state.t2Tactic);
    });
  }

  setupTacticalButtons() {
    // Player 1 Tactical Chips
    document.querySelectorAll(".p1-chip").forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll(".p1-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const tacticKey = chip.dataset.tactic;
        this.state.t1Tactic = tacticKey;

        sound.playClick();
        this.updateTacticalBadgesAndLabels();
        this.handleTacticalChange(1, tacticKey);
      };
    });

    // Player 2 Tactical Chips (Full parity with Player 1!)
    document.querySelectorAll(".p2-chip").forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll(".p2-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const tacticKey = chip.dataset.tactic;
        this.state.t2Tactic = tacticKey;

        sound.playClick();
        this.updateTacticalBadgesAndLabels();
        this.handleTacticalChange(2, tacticKey);
      };
    });
  }

  handleTacticalChange(teamNumber, tacticKey) {
    const team = teamNumber === 1 ? this.state.player1 : this.state.player2;
    const tactic = TACTICAL_STYLES[tacticKey];
    if (!tactic) return;

    // Commentary broadcast notice
    const commentaryFeed = document.getElementById("commentaryFeedScroll");
    if (commentaryFeed) {
      const item = document.createElement("div");
      item.className = "commentary-item block";
      const minDisplay = this.state.matchCurrentMinute ? `${this.state.matchCurrentMinute}'` : "1'";
      const teamIcon = teamNumber === 1 ? "🟢" : "🔵";
      item.innerHTML = `<span class="commentary-minute">${minDisplay}</span> 📋 <strong>Tactical Shift:</strong> ${teamIcon} ${team.name} switches tactical instruction to <strong>${tactic.icon} ${tactic.name}</strong>!`;
      commentaryFeed.insertBefore(item, commentaryFeed.firstChild);
    }

    // If change is made right before or at kickoff, re-run clean full match simulation with chosen tactics
    if (this.state.matchCurrentMinute <= 2) {
      this.state.matchSim = generateMatchSimulation(this.state.player1, this.state.player2, {
        t1Tactic: this.state.t1Tactic,
        t2Tactic: this.state.t2Tactic
      });
      this.state.matchCurrentEventIndex = 0;
    } else {
      // Dynamic in-match tactical shift: adjusts future momentum
      const momentumShift = teamNumber === 1 
        ? (tacticKey === "ATTACK" ? 12 : (tacticKey === "COUNTER" ? -8 : 0))
        : (tacticKey === "ATTACK" ? -12 : (tacticKey === "COUNTER" ? 8 : 0));
      
      const currentEvents = this.state.matchSim.events;
      for (let i = this.state.matchCurrentEventIndex; i < currentEvents.length; i++) {
        if (typeof currentEvents[i].momentum === "number") {
          currentEvents[i].momentum = Math.max(-100, Math.min(100, currentEvents[i].momentum + momentumShift));
        }
      }
    }
  }

  setupMatchSpeedControls() {
    document.querySelectorAll(".speed-chip").forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll(".speed-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.state.matchSpeed = parseFloat(chip.dataset.speed);
        if (this.state.matchInterval) {
          clearInterval(this.state.matchInterval);
          this.runMatchSimulationLoop();
        }
      };
    });
  }

  runMatchSimulationLoop() {
    clearInterval(this.state.matchInterval);

    if (this.state.matchSpeed === 0) {
      this.fastForwardMatch();
      return;
    }

    const intervalMs = Math.max(70, Math.round(650 / this.state.matchSpeed));

    this.state.matchInterval = setInterval(() => {
      this.state.matchCurrentMinute += 2;

      if (this.state.matchCurrentMinute > 94) {
        clearInterval(this.state.matchInterval);
        this.state.matchCurrentMinute = 90;
        this.finishMatch();
        return;
      }

      this.updateMatchMinuteTick(this.state.matchCurrentMinute);
    }, intervalMs);
  }

  updateMatchMinuteTick(currentMinute) {
    const clockEl = document.getElementById("matchClockDisplay");
    if (clockEl) {
      if (currentMinute > 45 && currentMinute < 48) {
        clockEl.textContent = `45+${currentMinute - 45}'`;
      } else if (currentMinute > 90) {
        clockEl.textContent = `90+${currentMinute - 90}'`;
      } else {
        clockEl.textContent = `${currentMinute}'`;
      }
    }

    const events = this.state.matchSim.events;
    const commentaryFeed = document.getElementById("commentaryFeedScroll");

    let latestEvent = null;
    while (
      this.state.matchCurrentEventIndex < events.length &&
      events[this.state.matchCurrentEventIndex].minute <= currentMinute
    ) {
      const evt = events[this.state.matchCurrentEventIndex];
      latestEvent = evt;
      this.state.matchCurrentEventIndex++;

      // Trigger respective authentic sound design
      if (evt.type === "goal") {
        sound.playGoal();
        document.getElementById("matchScoreboardNumber").textContent = `${evt.t1Score} - ${evt.t2Score}`;
      } else if (evt.type === "post") {
        sound.playWoodwork();
      } else if (evt.type === "save" || evt.type === "penalty_save") {
        sound.playSave();
      } else if (evt.type === "yellow_card" || evt.type === "red_card") {
        sound.playCard();
      } else if (evt.type === "var_check" || evt.type === "halftime" || evt.type === "fulltime") {
        sound.playWhistle();
      }

      // Add commentary bubble
      if (commentaryFeed) {
        const item = document.createElement("div");
        item.className = `commentary-item ${evt.type}`;
        item.innerHTML = `<span class="commentary-minute">${evt.displayMinute || evt.minute + "'"}</span> ${evt.text}`;
        commentaryFeed.insertBefore(item, commentaryFeed.firstChild);
      }
    }

    // Dynamic pitch momentum pointer & zone tracker
    if (latestEvent) {
      const pointer = document.getElementById("momentumBarPointer");
      if (pointer && typeof latestEvent.momentum === "number") {
        const leftPercent = Math.max(10, Math.min(90, 50 + latestEvent.momentum * 0.4));
        pointer.style.left = `${leftPercent}%`;
      }

      const zoneEl = document.getElementById("pitchZoneIndicator");
      if (zoneEl) {
        if (latestEvent.zone === "t1_third") {
          zoneEl.textContent = `⚔️ ${this.state.player2.name} Pressing Box`;
        } else if (latestEvent.zone === "t2_third") {
          zoneEl.textContent = `⚔️ ${this.state.player1.name} Pressing Box`;
        } else {
          zoneEl.textContent = "🏟️ Ball in Midfield";
        }
      }
    }

    this.renderLiveMatchStats(currentMinute / 90);
  }

  fastForwardMatch() {
    const events = this.state.matchSim.events;
    const commentaryFeed = document.getElementById("commentaryFeedScroll");
    if (commentaryFeed) commentaryFeed.innerHTML = "";

    events.forEach(evt => {
      const item = document.createElement("div");
      item.className = `commentary-item ${evt.type}`;
      item.innerHTML = `<span class="commentary-minute">${evt.displayMinute || evt.minute + "'"}</span> ${evt.text}`;
      if (commentaryFeed) commentaryFeed.appendChild(item);
    });

    document.getElementById("matchScoreboardNumber").textContent = `${this.state.matchSim.t1Goals} - ${this.state.matchSim.t2Goals}`;
    document.getElementById("matchClockDisplay").textContent = "90'";
    
    const pointer = document.getElementById("momentumBarPointer");
    if (pointer) pointer.style.left = "50%";
    
    const zoneEl = document.getElementById("pitchZoneIndicator");
    if (zoneEl) zoneEl.textContent = "🏁 Full Time Concluded";

    this.renderLiveMatchStats(1.0);
    this.finishMatch();
  }

  renderLiveMatchStats(progressRatio) {
    const stats = this.state.matchSim.stats;
    const ratio = Math.min(1.0, Math.max(0.1, progressRatio));

    const s1 = stats.team1;
    const s2 = stats.team2;

    const currentT1XG = (s1.xg * ratio).toFixed(2);
    const currentT2XG = (s2.xg * ratio).toFixed(2);

    const liveXGEl = document.getElementById("matchLiveXG");
    if (liveXGEl) {
      liveXGEl.textContent = `xG: ${currentT1XG} - ${currentT2XG}`;
    }

    const statRows = [
      { label: "Expected Goals (xG)", v1: currentT1XG, v2: currentT2XG, p1: Math.round((Number(currentT1XG) / ((Number(currentT1XG) + Number(currentT2XG)) || 1)) * 100) },
      { label: "Possession", v1: `${s1.possession}%`, v2: `${s2.possession}%`, p1: s1.possession },
      { label: "Total Shots", v1: Math.round(s1.shots * ratio), v2: Math.round(s2.shots * ratio), p1: Math.round((s1.shots / (s1.shots + s2.shots || 1)) * 100) },
      { label: "Shots on Target", v1: Math.round(s1.shotsOnTarget * ratio), v2: Math.round(s2.shotsOnTarget * ratio), p1: Math.round((s1.shotsOnTarget / (s1.shotsOnTarget + s2.shotsOnTarget || 1)) * 100) },
      { label: "Big Chances", v1: Math.round(s1.bigChances * ratio), v2: Math.round(s2.bigChances * ratio), p1: Math.round((s1.bigChances / (s1.bigChances + s2.bigChances || 1)) * 100) },
      { label: "Goalkeeper Saves", v1: Math.round(s1.saves * ratio), v2: Math.round(s2.saves * ratio), p1: 50 },
      { label: "Corners", v1: Math.round(s1.corners * ratio), v2: Math.round(s2.corners * ratio), p1: Math.round((s1.corners / (s1.corners + s2.corners || 1)) * 100) },
      { label: "Fouls / Cards", v1: `${Math.round(s1.fouls * ratio)} (🟨 ${s1.yellowCards}${s1.redCard ? " 🟥" : ""})`, v2: `${Math.round(s2.fouls * ratio)} (🟨 ${s2.yellowCards}${s2.redCard ? " 🟥" : ""})`, p1: 50 },
      { label: "Pass Accuracy", v1: `${s1.passAccuracy}%`, v2: `${s2.passAccuracy}%`, p1: s1.passAccuracy }
    ];

    const statsContainer = document.getElementById("matchStatsListContainer");
    if (!statsContainer) return;

    statsContainer.innerHTML = statRows.map(row => `
      <div class="match-stat-comparison">
        <div class="comparison-values">
          <span style="color:var(--p1-color);">${row.v1}</span>
          <span class="comparison-label">${row.label}</span>
          <span style="color:var(--p2-color);">${row.v2}</span>
        </div>
        <div class="dual-bar-track">
          <div class="dual-bar-p1" style="width: ${row.p1}%;"></div>
          <div class="dual-bar-p2" style="width: ${100 - row.p1}%;"></div>
        </div>
      </div>
    `).join("");
  }

  finishMatch() {
    sound.playWhistle();

    // Check if game ended in a draw -> Trigger Super Cup Penalty Shootout
    const sim = this.state.matchSim;
    if (sim.winner === "draw" && sim.shootout) {
      this.runPenaltyShootoutSequence(sim.shootout);
    } else {
      setTimeout(() => {
        this.showWinnerScreen();
      }, 1500);
    }
  }

  runPenaltyShootoutSequence(shootout) {
    const shootoutBanner = document.getElementById("shootoutBanner");
    const p1Dots = document.getElementById("shootoutP1Dots");
    const p2Dots = document.getElementById("shootoutP2Dots");
    const scoreEl = document.getElementById("shootoutScoreDisplay");
    const p1NameEl = document.getElementById("shootoutP1Name");
    const p2NameEl = document.getElementById("shootoutP2Name");

    if (shootoutBanner) shootoutBanner.style.display = "block";
    if (p1NameEl) p1NameEl.textContent = this.state.player1.name;
    if (p2NameEl) p2NameEl.textContent = this.state.player2.name;

    const commentaryFeed = document.getElementById("commentaryFeedScroll");
    if (commentaryFeed) {
      const item = document.createElement("div");
      item.className = "commentary-item goal";
      item.innerHTML = `<span class="commentary-minute">90+'</span> 🎯 <strong>DRAW AT FULL TIME!</strong> Entering the decisive Super Cup Penalty Shootout!`;
      commentaryFeed.insertBefore(item, commentaryFeed.firstChild);
    }

    let p1CurrentScore = 0;
    let p2CurrentScore = 0;
    let kickIndex = 0;
    const maxKicks = shootout.t1Kicks.length;

    const shootoutInterval = setInterval(() => {
      if (kickIndex < maxKicks) {
        const k1 = shootout.t1Kicks[kickIndex];
        const k2 = shootout.t2Kicks[kickIndex];

        if (k1.scored) {
          p1CurrentScore++;
          sound.playGoal();
        } else {
          sound.playSave();
        }

        if (k2.scored) {
          p2CurrentScore++;
          sound.playGoal();
        } else {
          sound.playSave();
        }

        if (scoreEl) scoreEl.textContent = `${p1CurrentScore} - ${p2CurrentScore}`;

        if (p1Dots) {
          p1Dots.innerHTML = shootout.t1Kicks.slice(0, kickIndex + 1).map(k => k.scored ? "🟢" : "🔴").join(" ");
        }
        if (p2Dots) {
          p2Dots.innerHTML = shootout.t2Kicks.slice(0, kickIndex + 1).map(k => k.scored ? "🟢" : "🔴").join(" ");
        }

        if (commentaryFeed) {
          const item1 = document.createElement("div");
          item1.className = `commentary-item ${k1.scored ? "goal" : "save"}`;
          item1.innerHTML = `<span class="commentary-minute">PEN</span> ${this.state.player1.name}: ${k1.taker} ${k1.scored ? "SCORES! ⚽" : "MISSED! ❌"}`;
          commentaryFeed.insertBefore(item1, commentaryFeed.firstChild);

          const item2 = document.createElement("div");
          item2.className = `commentary-item ${k2.scored ? "goal" : "save"}`;
          item2.innerHTML = `<span class="commentary-minute">PEN</span> ${this.state.player2.name}: ${k2.taker} ${k2.scored ? "SCORES! ⚽" : "MISSED! ❌"}`;
          commentaryFeed.insertBefore(item2, commentaryFeed.firstChild);
        }

        kickIndex++;
      } else {
        clearInterval(shootoutInterval);
        this.state.matchSim.winner = shootout.winner;
        this.state.matchSim.shootoutSummary = shootout.summary;
        setTimeout(() => {
          this.showWinnerScreen();
        }, 1800);
      }
    }, 900);
  }

  showWinnerScreen() {
    this.showScreen("winnerScreen");
    sound.playGoal();

    const sim = this.state.matchSim;
    const headlineEl = document.getElementById("winnerHeadlineDisplay");
    const sublineEl = document.getElementById("winnerSublineDisplay");

    const shootoutExtra = sim.shootoutSummary ? ` (${sim.shootoutSummary})` : "";

    if (sim.winner === 1) {
      headlineEl.textContent = `🏆 ${this.state.player1.name.toUpperCase()} WINS!`;
      sublineEl.textContent = `Mazad Champion • Defeated ${this.state.player2.name} ${sim.t1Goals} - ${sim.t2Goals}${shootoutExtra}`;
    } else if (sim.winner === 2) {
      headlineEl.textContent = `🏆 ${this.state.player2.name.toUpperCase()} WINS!`;
      sublineEl.textContent = `Mazad Champion • Defeated ${this.state.player1.name} ${sim.t2Goals} - ${sim.t1Goals}${shootoutExtra}`;
    } else {
      headlineEl.textContent = `🤝 IT'S A DRAMATIC DRAW!`;
      sublineEl.textContent = `Both champions share the spoils after an intense ${sim.t1Goals} - ${sim.t2Goals} battle!`;
    }

    // Render MVP Spotlight
    const mvp = sim.mvp;
    const mvpContainer = document.getElementById("winnerMVPContainer");
    if (mvpContainer && mvp && mvp.player) {
      const p = mvp.player;
      const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2);
      mvpContainer.innerHTML = `
        <div class="silhouette-avatar" style="width:70px; height:70px; font-size:1.6rem; border-color:#fbbf24;">
          ${initials}
        </div>
        <div style="flex:1;">
          <div style="font-size:0.75rem; color:#fbbf24; font-weight:800; text-transform:uppercase;">
            ⭐ PLAYER OF THE MATCH (MVP)
          </div>
          <div style="font-size:1.3rem; font-weight:900;">${p.name}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">${p.position} • ${p.club}</div>
          <div style="display:flex; gap:1rem; margin-top:0.4rem; font-size:0.85rem; font-weight:700;">
            <span>Match Rating: <strong style="color:#fbbf24;">${mvp.rating}</strong></span>
            <span>Goals: <strong>${mvp.goals}</strong></span>
            <span>Assists: <strong>${mvp.assists}</strong></span>
            <span>Saves: <strong>${mvp.saves || 0}</strong></span>
          </div>
        </div>
      `;
    }

    // Attach actions
    const playAgainBtn = document.getElementById("playAgainBtn");
    if (playAgainBtn) {
      playAgainBtn.disabled = false;
      playAgainBtn.style.opacity = "1";
      playAgainBtn.style.animation = "none";

      if (this.state.mode === "online" && this.state.online.isOnline) {
        if (this.state.online.role === "player1") {
          playAgainBtn.innerHTML = "PLAY AGAIN (REMATCH) ⚡";
          playAgainBtn.onclick = () => this.handleOnlineRematchFromHost();
        } else {
          playAgainBtn.innerHTML = "REQUEST REMATCH ⚡";
          playAgainBtn.onclick = () => this.handleOnlineRematchRequestFromGuest();
        }
      } else {
        playAgainBtn.innerHTML = "PLAY AGAIN 🔄";
        playAgainBtn.onclick = () => this.startGame();
      }
    }

    const newAuctionBtn = document.getElementById("newAuctionBtn");
    if (newAuctionBtn) {
      if (this.state.mode === "online" && this.state.online.isOnline) {
        newAuctionBtn.innerHTML = "LEAVE MATCH ROOM 🚪";
        newAuctionBtn.onclick = () => {
          firebaseMultiplayer.leaveRoom(this.state.online.roomCode);
          this.leaveOnlineRoom();
          this.showScreen("startScreen");
        };
      } else {
        newAuctionBtn.innerHTML = "MAIN MENU 🏠";
        newAuctionBtn.onclick = () => {
          this.showScreen("startScreen");
        };
      }
    }
  }

  async handleOnlineRematchFromHost() {
    if (!this.state.online.isOnline || this.state.online.role !== "player1") return;
    const roomCode = this.state.online.roomCode;
    if (!roomCode) return;

    sound.init();
    sound.playWhistle();

    // Reset local state for fresh match
    this.state.usedPlayerIds = [];
    this.state.currentRound = 1;
    this.state.player1.squad = [];
    this.state.player2.squad = [];
    this.state.player1.budget = this.state.startingBudget;
    this.state.player2.budget = this.state.startingBudget;
    this.state.online.lastProcessedPhase = null;
    this.state.matchSim = null;

    const slot = this.getCurrentSlotInfo();
    const candidate = getAuctionCandidate(slot.position, this.state.selectedLeague, []);
    this.state.currentAuctionPlayer = candidate;
    this.state.usedPlayerIds = [candidate.id];

    const baseBid = Math.max(5, Math.round(candidate.value * 0.25));

    await firebaseMultiplayer.startOnlineAuction(roomCode, candidate, baseBid, true);
  }

  async handleOnlineRematchRequestFromGuest() {
    sound.playClick();
    const playAgainBtn = document.getElementById("playAgainBtn");
    if (playAgainBtn) {
      playAgainBtn.disabled = true;
      playAgainBtn.innerHTML = "⏳ WAITING FOR HOST TO START...";
      playAgainBtn.style.opacity = "0.7";
    }
    await firebaseMultiplayer.requestOnlineRematch(this.state.online.roomCode, this.state.player2.name);
  }

  inspectPlayer(player) {
    const modal = document.getElementById("playerInspectModal");
    const body = document.getElementById("playerInspectBody");
    if (!modal || !body) return;

    sound.playClick();
    const initials = player.name.split(" ").map(n => n[0]).join("").slice(0, 2);
    const tierClass = `tier-${player.tier.toLowerCase().replace(/\s+/g, "-")}`;

    body.innerHTML = `
      <div class="player-card ${tierClass}" style="margin: 0 auto; width: 100%;">
        <div class="card-top">
          <div class="card-rating-box">
            <span class="card-ovr">${player.rating}</span>
            <span class="card-pos">${player.position}</span>
          </div>
          <span class="card-tier-badge">${player.tier}</span>
        </div>
        <div class="card-portrait-area">
          <div class="silhouette-avatar">${initials}</div>
          <div class="card-player-name">${player.name}</div>
          <div class="card-meta-line">${player.club} • ${player.league}</div>
        </div>
        <div class="card-stats-grid">
          <div class="stat-item"><span class="stat-label">PAC</span><span class="stat-val">${player.pace}</span></div>
          <div class="stat-item"><span class="stat-label">SHO</span><span class="stat-val">${player.shooting}</span></div>
          <div class="stat-item"><span class="stat-label">PAS</span><span class="stat-val">${player.passing}</span></div>
          <div class="stat-item"><span class="stat-label">DRI</span><span class="stat-val">${player.dribbling}</span></div>
          <div class="stat-item"><span class="stat-label">DEF</span><span class="stat-val">${player.defending}</span></div>
          <div class="stat-item"><span class="stat-label">PHY</span><span class="stat-val">${player.physical}</span></div>
        </div>
        <div class="card-value-strip">
          <span>MARKET VALUE</span>
          <strong>€${player.value}M</strong>
        </div>
      </div>
    `;

    modal.classList.add("active");
    const closeBtn = document.getElementById("closeInspectBtn");
    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.remove("active");
    }
  }
}

// Instantiate on DOM load
window.addEventListener("DOMContentLoaded", () => {
  window.mazadGame = new MazadGame();
});
