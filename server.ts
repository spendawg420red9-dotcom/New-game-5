import express from "express";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import fs from "fs";
import Stripe from 'stripe';
import { GoogleGenAI, Modality } from "@google/genai";
import { SEED_COMMUNITY_MAPS } from "./customMapUtils";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  // A map the host built (Make Your Own) travels with the room so everyone plays on it. Only a plain, reasonably small map is accepted.
  const okCustomMap = (m: any) => {
    try { if (m && typeof m === 'object' && Array.isArray(m.objects) && JSON.stringify(m).length < 4_000_000) return m; } catch { /* ignore */ }
    return undefined;
  };

  const io = new Server(server, {
    path: '/socket.io',
    maxHttpBufferSize: 6e6, // a custom map sent with a room
    cors: { 
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: "25mb" }));

  // Gemini AI Client
  let genAIClient: GoogleGenAI | null = null;
  function getGenAI(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    if (!genAIClient) {
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return genAIClient;
  }

  // Stripe
  let stripeClient: Stripe | null = null;

  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
      }
      stripeClient = new Stripe(key, {
        apiVersion: '2026-02-25.clover',
      });
    }
    return stripeClient;
  }

  app.post("/api/create-checkout-session", async (req, res) => {
    const { priceId } = req.body;
    
    const products: Record<string, { name: string, amount: number }> = {
      'points_1000': { name: '1000 Shop Points', amount: 250 },
      'points_7500': { name: '7500 Shop Points', amount: 1000 },
    };

    const product = products[priceId];
    if (!product) {
      return res.status(400).json({ error: 'Invalid price ID' });
    }

    try {
      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: product.name,
            },
            unit_amount: product.amount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/shop?success=true`,
        cancel_url: `${process.env.APP_URL}/shop?canceled=true`,
      });
      res.json({ id: session.id });
    } catch (error) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // In-memory data
  const rooms: Record<string, {
    id: string;
    host: string;
    players: any[];
    status: 'waiting' | 'playing';
    mapId: string;
    isCustom: boolean;
    hudSettings?: any;
    customMap?: any;
  }> = {};

  // Scores and shared maps are kept in a file so they survive restarts (needs a host with a disk; set DATA_DIR to a persistent folder)
  const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const readJson = (name: string, fallback: any) => {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); } catch { return fallback; }
  };
  let saveTimer: any = null;
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(path.join(DATA_DIR, 'leaderboard.json'), JSON.stringify(leaderboards.world));
        fs.writeFileSync(path.join(DATA_DIR, 'community-maps.json'), JSON.stringify(communityMaps));
      } catch (e) { console.warn('Could not save data', e); }
    }, 1500);
  };

  const leaderboards = {
    world: readJson('leaderboard.json', []) as any[],
  };

  let communityMaps: any[] = readJson('community-maps.json', null) || [...SEED_COMMUNITY_MAPS];

  // Device & User Registry for Tracking Activity & Inviting each other
  const devices: Record<string, {
    userId: string;
    socketId: string;
    nickname: string;
    status: string; // e.g. 'Idle', 'In Lobby ABCDEF', 'Fighting R15 (Bunker)', 'Offline'
    level: number;
    lastActive: number;
    highScores: any[];
    friendCount: number;
  }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Register a device to track active users
    socket.on("register_device", (data) => {
      console.log("Registering device:", data.userId, socket.id);
      if (data.userId) {
        devices[data.userId] = {
          userId: data.userId,
          socketId: socket.id,
          nickname: data.nickname || 'Survivor',
          status: data.status || 'Idle',
          level: data.level || 1,
          lastActive: Date.now(),
          highScores: data.highScores || [],
          friendCount: data.friendCount || 0
        };
        // Broadcast active users to everyone online
        io.emit("devices_updated", Object.values(devices).filter(d => Date.now() - d.lastActive < 300000));
      }
    });

    // Request active devices list
    socket.on("get_active_devices", () => {
      socket.emit("devices_updated", Object.values(devices).filter(d => Date.now() - d.lastActive < 300000));
    });

    // Send invite to friend's device
    socket.on("invite_friend", (data) => {
      // data: { friendUserId, roomId, senderName }
      const targetUser = devices[data.friendUserId];
      if (targetUser && targetUser.socketId) {
        console.log(`Sending app lobby invite from ${data.senderName} to ${targetUser.userId} (socket ${targetUser.socketId})`);
        io.to(targetUser.socketId).emit("incoming_invite", {
          roomId: data.roomId,
          senderName: data.senderName || 'A Friend'
        });
      } else {
        // If simulated or not connected, send error to sender
        socket.emit("error", "Player of this User ID is offline or inactive.");
      }
    });

    // Friend Request Logic
    socket.on("friend_request", (data) => {
      // data: { targetUserId, senderName, senderUserId }
      const targetUser = devices[data.targetUserId];
      if (targetUser && targetUser.socketId) {
        console.log(`Sending friend request from ${data.senderName} to ${targetUser.userId}`);
        io.to(targetUser.socketId).emit("incoming_friend_request", {
          senderName: data.senderName,
          senderUserId: data.senderUserId
        });
      }
    });

    socket.on("create_room", (data) => {
      console.log("Creating room:", data);
      const roomId = data.roomId || Math.random().toString(36).substring(2, 8).toUpperCase();
      
      if (!rooms[roomId]) {
        rooms[roomId] = {
          id: roomId,
          host: socket.id,
          players: [],
          status: 'waiting',
          mapId: data.mapId || 'town',
          isCustom: !!data.isCustom,
          hudSettings: data.hudSettings,
          customMap: okCustomMap(data.customMap)
        };
      } else {
        rooms[roomId].host = socket.id;
        rooms[roomId].mapId = data.mapId || 'town';
        rooms[roomId].status = 'waiting';
        rooms[roomId].isCustom = !!data.isCustom;
        rooms[roomId].customMap = okCustomMap(data.customMap);
        if (data.hudSettings) rooms[roomId].hudSettings = data.hudSettings;
      }
      
      if (!rooms[roomId].players.find((p: any) => p.id === socket.id)) {
        rooms[roomId].players.push({
          id: socket.id,
          name: data.name || 'Survivor',
          isHost: true,
          team: 1,
          customization: data.customization,
          level: data.level,
          rankMastery: data.rankMastery
        });
      }

      socket.join(roomId);
      console.log("Room created/re-hosted:", roomId);
      socket.emit("room_created", rooms[roomId]);
      io.to(roomId).emit("room_updated", rooms[roomId]);
    });

    socket.on("join_room", (data) => {
      console.log("Joining room:", data);
      const room = rooms[data.roomId];
      if (!room) {
        console.log("Room not found:", data.roomId);
        socket.emit("error", "Room not found");
        return;
      }
      if (room.players.length >= 4) {
        console.log("Room full:", data.roomId);
        socket.emit("error", "Room is full");
        return;
      }
      if (room.status !== 'waiting') {
        console.log("Game already started in room:", data.roomId);
        socket.emit("error", "Game already started");
        return;
      }
      
      room.players.push({
        id: socket.id,
        name: data.name || 'Survivor',
        isHost: false,
        team: 1,
        customization: data.customization,
        level: data.level,
        rankMastery: data.rankMastery
      });
      socket.join(data.roomId);
      console.log("User joined room:", socket.id, data.roomId);
      socket.emit("room_joined", room);
      io.to(data.roomId).emit("room_updated", room);
    });

    socket.on("update_lobby_profile", (data) => {
      console.log("Updating lobby profile:", data);
      if (data.roomId) {
        const room = rooms[data.roomId];
        if (room) {
          const player = room.players.find(p => p.id === socket.id);
          if (player) {
            if (data.name) player.name = data.name;
            if (data.level !== undefined) player.level = data.level;
            if (data.rankMastery !== undefined) player.rankMastery = data.rankMastery;
            if (data.customization) player.customization = data.customization;
            io.to(data.roomId).emit("room_updated", room);
          }
        }
      }
    });

    socket.on("toggle_team", (roomId) => {
      const room = rooms[roomId];
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.team = player.team === 2 ? 1 : 2;
          console.log(`Player ${player.name} toggled team to Team ${player.team}`);
          io.to(roomId).emit("room_updated", room);
        }
      }
    });

    socket.on("start_game", (roomId) => {
      const room = rooms[roomId];
      if (room && room.host === socket.id) {
        room.status = 'playing';
        io.to(roomId).emit("game_started", room);
      }
    });

    socket.on("player_update", (data) => {
      // data: { roomId, playerState }
      socket.to(data.roomId).emit("player_updated", { id: socket.id, ...data.playerState });
    });

    socket.on("zombie_update", (data) => {
      // Host sends zombie updates to clients
      socket.to(data.roomId).emit("zombie_updated", data.zombies);
    });

    socket.on("game_event", (data) => {
      // e.g. door opened, powerup spawned
      socket.to(data.roomId).emit("game_event", data);
    });

    socket.on("chat_message", (data) => {
      // data: { roomId, message }
      socket.to(data.roomId).emit("chat_message", data.message);
    });

    socket.on("admin_teleport", (data) => {
      // data: { targetId, position }
      // Send force_teleport to the specific target
      io.to(data.targetId).emit("force_teleport", data.position);
    });

    socket.on("sync_hud", (data) => {
      // data: { roomId, settings }
      const room = rooms[data.roomId];
      if (room && room.host === socket.id) {
        room.hudSettings = data.settings;
        socket.to(data.roomId).emit("hud_settings_updated", data.settings);
      }
    });

    socket.on("leave_room", (roomId) => {
      const room = rooms[roomId];
      if (room) {
        room.players = room.players.filter((p: any) => p.id !== socket.id);
        socket.leave(roomId);
        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          if (room.host === socket.id) {
            room.host = room.players[0].id;
            room.players[0].isHost = true;
          }
          io.to(roomId).emit("room_updated", room);
        }
      }
    });

    socket.on("submit_score", (data) => {
      // Avoid duplicate entries from same user on same round
      const existingIdx = leaderboards.world.findIndex(e => e.userId === data.userId && e.mapId === data.mapId && e.round === data.round);
      if (existingIdx !== -1) {
        leaderboards.world[existingIdx] = {
          ...leaderboards.world[existingIdx],
          ...data,
          date: new Date().toISOString()
        };
      } else {
        leaderboards.world.push({
          ...data,
          date: new Date().toISOString(),
        });
      }
      
      // Sort properly by round (descending) first, then kills (descending)
      leaderboards.world.sort((a, b) => {
        if ((b.round || 0) !== (a.round || 0)) {
          return (b.round || 0) - (a.round || 0);
        }
        return (b.kills || 0) - (a.kills || 0);
      });

      if (leaderboards.world.length > 100) {
        leaderboards.world = leaderboards.world.slice(0, 100);
      }
      persist();
      io.emit("leaderboard_updated", leaderboards.world);
    });

    socket.on("get_leaderboard", () => {
      socket.emit("leaderboard_updated", leaderboards.world);
    });

    socket.on("admin_reset_leaderboard", () => {
      console.log("Admin resetting leaderboard");
      leaderboards.world = [];
      io.emit("leaderboard_updated", leaderboards.world);
    });

    // Community Maps Socket Handlers
    socket.on("get_community_maps", () => {
      socket.emit("community_maps_updated", communityMaps);
    });

    socket.on("publish_community_map", (data) => {
      if (data && data.mapConfig) {
        const newEntry = {
          ...data,
          id: data.id || `community_${Date.now()}`,
          plays: 0,
          likes: 1,
          createdAt: new Date().toISOString().split('T')[0],
          highScores: data.highScores || [],
        };
        communityMaps = [newEntry, ...communityMaps.filter(m => m.id !== newEntry.id)];
        persist(); io.emit("community_maps_updated", communityMaps);
        socket.emit("publish_community_map_success", newEntry);
      }
    });

    socket.on("like_community_map", (mapId) => {
      communityMaps = communityMaps.map(m => m.id === mapId ? { ...m, likes: (m.likes || 0) + 1 } : m);
      persist(); io.emit("community_maps_updated", communityMaps);
    });

    socket.on("submit_community_score", (data) => {
      if (data && data.mapId) {
        communityMaps = communityMaps.map(m => {
          if (m.id === data.mapId) {
            const highScores = [...(m.highScores || []), {
              nickname: data.nickname || 'Survivor',
              round: data.round || 1,
              kills: data.kills || 0,
              date: new Date().toISOString().split('T')[0]
            }];
            highScores.sort((a, b) => (b.round || 0) !== (a.round || 0) ? (b.round || 0) - (a.round || 0) : (b.kills || 0) - (a.kills || 0));
            return {
              ...m,
              plays: (m.plays || 0) + 1,
              highScores: highScores.slice(0, 15)
            };
          }
          return m;
        });
        persist(); io.emit("community_maps_updated", communityMaps);
      }
    });

    // Gemini Live API bridging over WebSocket
    let liveSession: any = null;

    socket.on("gemini_live_start", async (config) => {
      const ai = getGenAI();
      if (!ai) {
        socket.emit("gemini_live_error", { message: "GEMINI_API_KEY is not configured on the server" });
        return;
      }

      try {
        if (liveSession) {
          try { await liveSession.close?.(); } catch {}
          liveSession = null;
        }

        liveSession = await ai.live.connect({
          model: "gemini-3.8-live",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: config?.voice || "Zephyr" } },
            },
            systemInstruction: config?.systemInstruction || "You are a tactical radio dispatcher communicating with a zombie survival operative.",
          },
          callbacks: {
            onmessage: (message: any) => {
              for (const part of message.serverContent?.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  socket.emit("gemini_live_audio", { audio: part.inlineData.data });
                }
                if (part.text) {
                  socket.emit("gemini_live_text", { text: part.text });
                }
              }
              if (message.serverContent?.interrupted) {
                socket.emit("gemini_live_interrupted", { interrupted: true });
              }
            },
            onerror: (err: any) => {
              socket.emit("gemini_live_error", { message: err?.message || "Live API error" });
            },
            onclose: () => {
              socket.emit("gemini_live_closed", {});
            }
          },
        });
        socket.emit("gemini_live_ready", { status: "connected" });
      } catch (err: any) {
        console.error("[Gemini] Live API connect error:", err);
        socket.emit("gemini_live_error", { message: err?.message || "Failed to start Live session" });
      }
    });

    socket.on("gemini_live_audio_chunk", (data) => {
      if (liveSession && data?.audio) {
        try {
          liveSession.sendRealtimeInput({
            audio: { data: data.audio, mimeType: "audio/pcm;rate=16000" },
          });
        } catch (err) {
          console.error("[Gemini] sendRealtimeInput error:", err);
        }
      }
    });

    socket.on("gemini_live_stop", async () => {
      if (liveSession) {
        try { await liveSession.close?.(); } catch {}
        liveSession = null;
        socket.emit("gemini_live_closed", {});
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      if (liveSession) {
        try { liveSession.close?.(); } catch {}
        liveSession = null;
      }
      
      // Mark device as Offline
      for (const userId in devices) {
        if (devices[userId].socketId === socket.id) {
          devices[userId].status = 'Offline';
          break;
        }
      }
      io.emit("devices_updated", Object.values(devices).filter(d => Date.now() - d.lastActive < 300000));

      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            delete rooms[roomId];
          } else {
            if (room.host === socket.id) {
              room.host = room.players[0].id;
              room.players[0].isHost = true;
            }
            io.to(roomId).emit("room_updated", room);
          }
        }
      }
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const FALLBACK_LORE = [
    "The fog thickens...",
    "They smell your fear.",
    "Fetch me their souls...",
    "Don't look back.",
    "The dead are rising...",
    "No one is coming to save you.",
    "Run while you still can.",
    "The bus is late...",
    "Is that a light in the distance?",
    "Stay out of the fire.",
    "A cold wind blows from the east.",
    "They are closer than you think.",
    "The town is silent. Too silent.",
    "The bank is empty, but not abandoned.",
    "Can you hear the scratching at the door?",
    "The shadows are moving on their own.",
    "Keep your eyes on the rooftops.",
    "The air tastes like copper.",
    "Every corner holds a secret.",
    "The silence is heavier than the dark."
  ];

  let apiCooldownUntil = 0;

  async function handleLoreRequest(req: express.Request, res: express.Response) {
    const round = Number(req.body?.round) || 1;
    const now = Date.now();

    if (now < apiCooldownUntil) {
      const fallback = FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
      return res.json({ lore: fallback, fallback: true });
    }

    const ai = getGenAI();
    if (!ai) {
      console.warn("[Gemini] GEMINI_API_KEY is not configured on the server. Using fallback lore.");
      const fallback = FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
      return res.json({ lore: fallback, fallback: true });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate a very short (max 12 words) cryptic, dark message for a survivor in a zombie apocalypse starting round ${round}. Something like 'The fog thickens...' or 'They smell your fear.'`,
      });

      const text = response.text?.trim();
      if (text) {
        return res.json({ lore: text });
      }
      const fallback = FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
      return res.json({ lore: fallback, fallback: true });
    } catch (error: any) {
      const errorString = (error?.message || JSON.stringify(error)).toLowerCase();
      const isRateLimit = errorString.includes('429') || 
                          errorString.includes('quota') || 
                          errorString.includes('resource_exhausted') ||
                          error?.status === 429;

      if (isRateLimit) {
        apiCooldownUntil = now + 300000;
        console.warn("[Gemini] Quota exhausted on server. Switched to fallback lore for 5 minutes.");
        return res.status(429).json({
          error: "Quota exhausted",
          lore: FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)],
          fallback: true
        });
      }

      console.error("[Gemini] Server lore generation error:", error?.message || error);
      const fallback = FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
      return res.status(500).json({
        error: "Generation failed",
        lore: fallback,
        fallback: true
      });
    }
  }

  // Lore endpoints
  app.post("/api/gemini/lore", handleLoreRequest);
  app.post("/api/lore", handleLoreRequest);

  // General text generation endpoint
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt, systemInstruction } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      return res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("[Gemini] Generate error:", error);
      return res.status(500).json({ error: error?.message || "Generation failed" });
    }
  });

  // Streaming text generation endpoint (SSE)
  app.post("/api/gemini/stream", async (req, res) => {
    const { prompt, systemInstruction } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      for await (const chunk of streamResponse) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("[Gemini] Streaming error:", error);
      res.write(`data: ${JSON.stringify({ error: error?.message || "Stream error" })}\n\n`);
      res.end();
    }
  });

  // Community Maps REST Endpoints
  app.get("/api/community-maps", (req, res) => {
    res.json(communityMaps);
  });

  app.post("/api/community-maps/publish", (req, res) => {
    const data = req.body;
    if (!data || !data.mapConfig) {
      return res.status(400).json({ error: "Invalid map data" });
    }
    const newEntry = {
      ...data,
      id: data.id || `community_${Date.now()}`,
      plays: 0,
      likes: 1,
      createdAt: new Date().toISOString().split('T')[0],
      highScores: data.highScores || [],
    };
    communityMaps = [newEntry, ...communityMaps.filter(m => m.id !== newEntry.id)];
    persist(); io.emit("community_maps_updated", communityMaps);
    res.json({ success: true, map: newEntry });
  });

  app.post("/api/community-maps/like", (req, res) => {
    const { mapId } = req.body;
    communityMaps = communityMaps.map(m => m.id === mapId ? { ...m, likes: (m.likes || 0) + 1 } : m);
    persist(); io.emit("community_maps_updated", communityMaps);
    res.json({ success: true });
  });

  app.post("/api/community-maps/score", (req, res) => {
    const { mapId, nickname, round, kills } = req.body;
    if (mapId) {
      communityMaps = communityMaps.map(m => {
        if (m.id === mapId) {
          const highScores = [...(m.highScores || []), {
            nickname: nickname || 'Survivor',
            round: round || 1,
            kills: kills || 0,
            date: new Date().toISOString().split('T')[0]
          }];
          highScores.sort((a, b) => (b.round || 0) !== (a.round || 0) ? (b.round || 0) - (a.round || 0) : (b.kills || 0) - (a.kills || 0));
          return {
            ...m,
            plays: (m.plays || 0) + 1,
            highScores: highScores.slice(0, 15)
          };
        }
        return m;
      });
      persist(); io.emit("community_maps_updated", communityMaps);
    }
    res.json({ success: true });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(/(.*)/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
