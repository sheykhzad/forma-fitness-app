require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
const { FIT_COACH_SYSTEM_PROMPT } = require('./coach-prompt');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: {} };
  }
}

function writeDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getUser(db, key) {
  if (!db.users[key]) {
    db.users[key] = { profile: null, todayPlan: null, workouts: [], progress: [], chat: [] };
  }
  return db.users[key];
}

function validateInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const given = Buffer.from(hash, 'hex');
  const computed = Buffer.from(computedHash, 'hex');
  if (given.length !== computed.length || !crypto.timingSafeEqual(given, computed)) {
    return null;
  }

  const authDate = Number(params.get('auth_date') || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || now - authDate > 86400) return null;

  const userJson = params.get('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

function resolveUserKey(req) {
  const initData = req.headers['x-telegram-init-data'];
  if (initData) {
    const user = validateInitData(initData, BOT_TOKEN);
    if (user && user.id) {
      req.telegramUser = user;
      return `tg_${user.id}`;
    }
  }
  const guestId = req.headers['x-guest-id'];
  if (typeof guestId === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(guestId)) {
    return `guest_${guestId}`;
  }
  return null;
}

async function callOpenAI(messages) {
  if (!OPENAI_API_KEY) {
    return "Demo rejim: OpenAI API kaliti serverga ulanmagan. Haqiqiy AI coach javoblarini olish uchun hosting sozlamalariga OPENAI_API_KEY kiritilishi kerak.";
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: FIT_COACH_SYSTEM_PROMPT,
      input: messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI javobi xato: ${response.status} ${errText}`);
  }

  const data = await response.json();

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data.output)) {
    const parts = [];
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const c of item.content) {
          if (typeof c.text === 'string') parts.push(c.text);
        }
      }
    }
    if (parts.length) return parts.join('\n').trim();
  }

  return "AI coach javob tayyorlay olmadi. Birozdan so'ng qayta urinib ko'ring.";
}

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/api/profile', (req, res) => {
  const key = resolveUserKey(req);
  if (!key) return res.json({ profile: null });
  const db = readDB();
  res.json({ profile: getUser(db, key).profile });
});

app.post('/api/profile', (req, res) => {
  const key = resolveUserKey(req);
  if (!key) return res.status(400).json({ error: "Foydalanuvchi aniqlanmadi" });
  const db = readDB();
  const user = getUser(db, key);
  user.profile = { ...(user.profile || {}), ...req.body, updatedAt: new Date().toISOString() };
  writeDB(db);
  res.json({ profile: user.profile });
});

app.get('/api/workout/today', (req, res) => {
  const key = resolveUserKey(req);
  if (!key) return res.json({ todayPlan: null });
  const db = readDB();
  res.json({ todayPlan: getUser(db, key).todayPlan });
});

app.post('/api/workout/today', (req, res) => {
  const key = resolveUserKey(req);
  if (!key) return res.status(400).json({ error: "Foydalanuvchi aniqlanmadi" });
  const db = readDB();
  const user = getUser(db, key);
  user.todayPlan = { ...req.body, createdAt: new Date().toISOString() };
  writeDB(db);
  res.json({ todayPlan: user.todayPlan });
});

app.post('/api/workout/log', (req, res) => {
  const key = resolveUserKey(req);
  if (!key) return res.status(400).json({ error: "Foydalanuvchi aniqlanmadi" });
  const db = readDB();
  const user = getUser(db, key);
  const entry = { ...req.body, loggedAt: new Date().toISOString() };
  user.workouts.push(entry);
  user.progress.push({ type: 'workout', ...entry });
  writeDB(db);
  res.json({ ok: true, entry });
});

app.get('/api/progress', (req, res) => {
  const key = resolveUserKey(req);
  if (!key) return res.json({ progress: [] });
  const db = readDB();
  res.json({ progress: getUser(db, key).progress });
});

app.post('/api/progress', (req, res) => {
  const key = resolveUserKey(req);
  if (!key) return res.status(400).json({ error: "Foydalanuvchi aniqlanmadi" });
  const db = readDB();
  const user = getUser(db, key);
  const entry = { ...req.body, loggedAt: new Date().toISOString() };
  user.progress.push(entry);
  writeDB(db);
  res.json({ ok: true, entry });
});

const LANGUAGE_DIRECTIVE = {
  uz: "Javobni FAQAT o'zbek tilida bering. Hech qanday inglizcha yoki boshqa chet tilidagi so'z, qisqartma yoki jargon ishlatmang. Mashq nomlarini inglizcha-lotincha nomi bilan emas, balki o'zbekcha tarjima yoki tavsif bilan yozing (masalan 'Pull-Ups' emas — 'Turnikda tortilish', 'Bench Press' emas — 'Yotib ko'krakni itarish', 'Squat' emas — 'Cho'kkalab turish'). 'Set' o'rniga 'to'plam', 'rep' o'rniga 'takror' so'zlarini ishlating. 'RPE'/'RIR' kabi qisqartmalar o'rniga tushunarli o'zbekcha tavsif bering (masalan 'kuch sarfi darajasi 10 balldan 7 ball'). 'DOMS' o'rniga 'mashqdan keyingi mushak og'rig'i' deng.",
  ru: "Отвечай ТОЛЬКО на русском языке. Не используй иностранные слова, сокращения или жаргон. Названия упражнений переводи или описывай по-русски, а не оставляй на английском (например, не 'Pull-Ups', а 'Подтягивания на турнике'; не 'Bench Press', а 'Жим штанги лёжа'; не 'Squat', а 'Приседания'). Вместо 'RPE'/'RIR' используй понятное описание уровня нагрузки по-русски (например 'уровень нагрузки 7 из 10'). Вместо 'DOMS' говори 'мышечная боль после тренировки'.",
};

app.post('/api/coach/chat', async (req, res) => {
  try {
    const { message, profile, history, lang } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Xabar matni kerak' });
    }
    const languageDirective = LANGUAGE_DIRECTIVE[lang] || LANGUAGE_DIRECTIVE.uz;

    const key = resolveUserKey(req);
    const db = key ? readDB() : null;
    const user = key ? getUser(db, key) : null;

    const effectiveProfile = profile || (user && user.profile) || null;
    const recentHistory = Array.isArray(history)
      ? history.slice(-12)
      : (user ? user.chat.slice(-12) : []);

    const messages = [];
    if (effectiveProfile) {
      messages.push({
        role: 'system',
        content: `Foydalanuvchi profili (JSON):\n${JSON.stringify(effectiveProfile)}`,
      });
    }
    for (const turn of recentHistory) {
      if (turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string') {
        messages.push({ role: turn.role, content: turn.content });
      }
    }
    messages.push({ role: 'system', content: languageDirective });
    messages.push({ role: 'user', content: message });

    const reply = await callOpenAI(messages);

    if (user) {
      user.chat.push({ role: 'user', content: message, at: new Date().toISOString() });
      user.chat.push({ role: 'assistant', content: reply, at: new Date().toISOString() });
      user.chat = user.chat.slice(-100);
      writeDB(db);
    }

    res.json({ reply });
  } catch (err) {
    console.error('Coach chat xatosi:', err);
    res.status(500).json({ error: "AI coach bilan bog'lanishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring." });
  }
});

if (BOT_TOKEN) {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const options = APP_URL
      ? { reply_markup: { inline_keyboard: [[{ text: '💪 Formani ochish', web_app: { url: APP_URL } }]] } }
      : {};
    bot.sendMessage(
      msg.chat.id,
      "Assalomu alaykum! Men Forma — sizning shaxsiy fitness AI murabbiyingizman.\n\nPastdagi tugmani bosib ilovani oching va shaxsiy profilingizni to'ldiring.",
      options
    );
  });

  bot.on('polling_error', (err) => console.error('Telegram polling xatosi:', err.message));

  console.log('Telegram bot polling rejimida ishga tushdi.');
} else {
  console.warn("BOT_TOKEN topilmadi — Telegram bot ishga tushmadi. Faqat web demo rejimi ishlaydi.");
}

app.listen(PORT, () => {
  console.log(`Forma server ${PORT}-portda ishga tushdi.`);
});
