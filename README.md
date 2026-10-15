# Forma — AI fitness Telegram Mini App

O'zbek tilidagi fitness AI murabbiy. Telegram Mini App sifatida ham, oddiy veb-demo sifatida ham ishlaydi.

## Fayllar

- `public/index.html` — frontend (Telegram Mini App SDK, onboarding, profil, bugungi workout, AI coach chat, progress, demo bo'limlar)
- `server.js` — Node.js/Express server: Telegram bot (polling), `initData` tekshiruvi, API, OpenAI chaqiruvi
- `coach-prompt.js` — AI coachning "Fit Coach" shaxsiyati (system prompt)
- `package.json` — ishga tushirish sozlamasi
- `.env.example` — kerakli maxfiy qiymatlar namunasi (haqiqiy qiymatlarni shu faylga yozmang)
- `.gitignore` — `.env`, `node_modules`, demo DB faylini Git'dan chiqaradi

## Lokal ishga tushirish (ixtiyoriy, sinov uchun)

```bash
cd outputs
npm install
cp .env.example .env
```

`.env` faylini ochib, o'zingizning `BOT_TOKEN` va `OPENAI_API_KEY` qiymatlaringizni kiriting (bu fayl Git'ga tushmaydi). Keyin:

```bash
npm start
```

Server `http://localhost:3000` da ishga tushadi. Brauzerda ochsangiz — "Web demo" rejimida ishlaydi (profil/progress brauzerda saqlanadi). Telegram orqali ochilganda — ma'lumotlar serverdagi demo bazada Telegram foydalanuvchi ID bo'yicha saqlanadi.

---

## GitHub + Render'ga deploy qilish — boshlang'ich uchun qadamma-qadam

Token va API kalitlarni menga (AI'ga) yoki chatga yozmang — ularni faqat quyida ko'rsatilgan Render sozlamalariga o'zingiz kiritasiz.

### 1-qadam — GitHub'da repository yaratish

1. Brauzerda [github.com](https://github.com) ga kiring, agar hisobingiz yo'q bo'lsa — ro'yxatdan o'ting.
2. Yuqori o'ng burchakda **+** tugmasini bosing → **New repository**.
3. **Repository name** maydoniga masalan `forma-fitness-app` deb yozing.
4. **Public** yoki **Private** tanlang (ikkisi ham ishlaydi).
5. Boshqa hech narsani belgilamang (README qo'shish shart emas), **Create repository** tugmasini bosing.
6. Ochilgan sahifada GitHub sizga buyruqlar beradi ("…or push an existing repository from the command line"). Shu buyruqlarni quyidagicha ishlating — terminalda `outputs` papkasiga kirib:

```bash
cd "/Users/apple/Desktop/Edit for Claude/outputs"
git init
git add .
git commit -m "Forma MVP"
git branch -M main
git remote add origin https://github.com/<SIZNING-USERNAME>/forma-fitness-app.git
git push -u origin main
```

`<SIZNING-USERNAME>` o'rniga haqiqiy GitHub foydalanuvchi nomingizni yozing (bu qatorni GitHub sahifasining o'zidan nusxalab olishingiz mumkin).

> Eslatma: `.env` fayli `.gitignore` tufayli GitHub'ga yuklanmaydi — bu xavfsizlik uchun to'g'ri.

### 2-qadam — Telegram botini yaratish (agar hali yaratmagan bo'lsangiz)

1. Telegram'da **@BotFather** botini toping va oching.
2. `/newbot` buyrug'ini yuboring.
3. Bot uchun nom va username so'raydi (username `bot` bilan tugashi kerak, masalan `FormaCoachBot`).
4. BotFather sizga bir qator token beradi (masalan `123456789:ABC-...`). **Bu tokenni faqat o'zingiz saqlang** — menga yubormang.

### 3-qadam — OpenAI API kalitini olish (agar hali yo'q bo'lsa)

1. [platform.openai.com](https://platform.openai.com) ga kiring.
2. Chap menyudan **API keys** bo'limiga o'ting.
3. **Create new secret key** tugmasini bosing, kalitni nusxalang va xavfsiz joyda saqlang (keyinroq qayta ko'rsatilmaydi).

### 4-qadam — Render'da Web Service yaratish

1. [render.com](https://render.com) ga kiring, hisobingiz bo'lmasa — GitHub orqali ro'yxatdan o'tish qulay (**Sign up with GitHub**).
2. Dashboard'da **New +** tugmasini bosing → **Web Service** tanlang.
3. GitHub repositorylaringiz ro'yxatidan `forma-fitness-app` ni tanlang (agar ko'rinmasa, **Configure account** orqali ruxsat berishingiz kerak bo'lishi mumkin).
4. Sozlamalarni to'ldiring:
   - **Name**: `forma-fitness-app` (yoki o'zingiz xohlagan nom)
   - **Root Directory**: `outputs` (chunki loyiha shu papkada)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (sinov uchun yetarli)
5. Pastroqda **Environment Variables** bo'limini topib, **Add Environment Variable** orqali quyidagilarni qo'shing (qiymatlarni shu yerga, faqat Render'ning o'ziga kiritasiz):
   - `BOT_TOKEN` = BotFather'dan olingan token
   - `OPENAI_API_KEY` = OpenAI'dan olingan kalit
   - `OPENAI_MODEL` = `gpt-4o-mini` (yoki boshqa model nomi)
   - `APP_URL` = hozircha bo'sh qoldiring — keyingi qadamda to'ldiramiz
6. **Create Web Service** tugmasini bosing. Render avtomatik build va deploy qila boshlaydi (bir necha daqiqa vaqt oladi).

### 5-qadam — APP_URL'ni to'ldirish

1. Deploy tugagach, Render sahifasining yuqorisida sizga berilgan public manzil ko'rinadi, masalan: `https://forma-fitness-app.onrender.com`.
2. Shu manzilni nusxalang.
3. Render'dagi loyihangiz sahifasida chap menyudan **Environment** bo'limiga kiring.
4. `APP_URL` qiymatini tahrirlang va nusxalagan manzilni yopiq qiymat sifatida kiriting (masalan `https://forma-fitness-app.onrender.com`, oxirida `/` belgisini qo'ymang).
5. **Save Changes** tugbmasini bosing — Render avtomatik qayta deploy qiladi.

### 6-qadam — Telegram botda sinash

1. Telegram'da o'zingiz yaratgan botni (masalan `@FormaCoachBot`) topib oching.
2. `/start` buyrug'ini yuboring.
3. Bot sizga "💪 Formani ochish" tugmasi bilan xabar yuborishi kerak.
4. Tugmani bosing — Mini App ochiladi va onboarding boshlanadi.

---

## Hozircha cheklangan narsalar

- Demo ma'lumotlar bazasi — oddiy JSON fayl (`data/db.json`). Ko'p foydalanuvchi va production yuklama uchun keyinchalik PostgreSQL kabi haqiqiy bazaga o'tish tavsiya etiladi.
- Voice AI coach, sog'liq ma'lumotlarini tahlil qilish — hozircha faqat demo/placeholder.
- Render'ning bepul rejasi faolsizlikdan keyin "uxlab qolishi" mumkin — birinchi so'rov sekin ochilishi mumkin. Botni doimiy tez ishlatish uchun keyinchalik pullik rejaga o'tish kerak bo'ladi.
- Narx va tariflar vaqt o'tishi bilan o'zgarishi mumkin — Render saytidan joriy narxlarni tekshiring.

## Keyingi qadamlar g'oyalari

- JSON demo bazasini PostgreSQL'ga o'tkazish.
- Voice coach (ovozli xabar yuborish/qabul qilish) qo'shish.
- Sog'liq hujjatlarini (rasm/PDF) AI orqali tahlil qilish.
- Progress uchun grafik (vazn/bel trendi) qo'shish.
