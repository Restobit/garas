# Garas — HKR (Háztartási Költség Rendszer)

Több felhasználós, local-first háztartási költségkövető webalkalmazás. Minden felhasználó kizárólag a saját adatait látja és kezeli.

## Tech stack

| Réteg     | Technológia                                                              |
| --------- | ------------------------------------------------------------------------ |
| Frontend  | React 18 + TypeScript, Vite, MUI v5, TanStack React Query, react-i18next |
| Backend   | Node.js + Express (TypeScript, strict), REST API                         |
| Adatbázis | MongoDB (Mongoose), fájlok GridFS-ben                                    |
| Auth      | Clerk (JWT ellenőrzés backend middleware-ben)                            |
| Tesztek   | Vitest (unit), Playwright (E2E)                                          |
| Infra     | Docker + Docker Compose; élesben Vercel frontend + VPS backend           |

## Gyors indulás (lokális, Docker Compose)

```bash
cp .env.example .env        # opcionális: Clerk kulcsok kitöltése
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000 (health: `/health`)
- MongoDB: localhost:27017 (volume-ban perzisztens)

**Clerk nélkül is fut:** ha nincs `CLERK_SECRET_KEY`, a backend fejlesztői auth módban indul — a kéréseket az `x-dev-user` header azonosítja (alapból `dev-user`). Ez kizárólag fejlesztésre való; élesben a Clerk kulcs kötelező (a backend enélkül el sem indul `NODE_ENV=production` mellett).

### Clerk bekapcsolása

1. Hozz létre appot a [Clerk dashboardon](https://dashboard.clerk.com)
2. `.env`-be: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
3. `docker compose up --build` újra

### Lokális fejlesztés Docker nélkül

```bash
docker compose up -d mongo          # csak az adatbázis konténerben

cd backend && npm install
MONGO_URI=mongodb://localhost:27017/garas npm run dev   # :4000

cd frontend && npm install
npm run dev                                             # :5173
```

## Tesztek

```bash
# Unit (Vitest): üzleti logika — ártörténet-feloldás, usage check intervallum,
# Alap költség automatikus feltöltés, pénz/dátum formázás, blokk-munkamenet
cd backend && npm test
cd frontend && npm test

# E2E (Playwright): futó stackre van szüksége (lásd fent), Clerk kulcs NÉLKÜL
cd frontend
npx playwright install chromium     # első alkalommal
npm run test:e2e
```

Az E2E lefedi: dashboard betöltés, kategória létrehozás, fizetési mód seed + bővítés, havi tétel felvitel, ártörténet rögzítés/törlés (usage check popup), Alap költség automatikus feltöltés, blokk feltöltés + gyors rögzítés desktopon, inkognitó mód, mobil nézet.

## Éles üzembe helyezés

### Backend + MongoDB (VPS, Docker Compose)

```bash
# a szerveren
git clone <repo> && cd garas-hkr
cat > .env <<'EOF'
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CORS_ORIGINS=https://garas-hkr.vercel.app
EOF
docker compose -f docker-compose.prod.yml up -d --build
```

A prod compose nem publikálja a Mongo portot, csak a backend :4000-et — elé érdemes reverse proxyt (Caddy/nginx, TLS) tenni.

### Frontend (Vercel)

1. Importáld a repót a Vercelen, **Root Directory: `frontend`** (a `frontend/vercel.json` kezeli az SPA rewrite-ot)
2. Environment variables:
   - `VITE_API_URL` = a backend publikus URL-je (pl. `https://api.sajatdomain.hu`)
   - `VITE_CLERK_PUBLISHABLE_KEY` = pk*live*...
3. Deploy — build parancs: `npm run build`, output: `dist`

## Főbb funkciók

- **Dashboard** — évválasztós összesítés: havi bevétel/kiadás tábla, top kategóriák és boltok (chart), éves Befektetés/Megtakarítás, kategóriánkénti éves összesítés
- **Havi költség** — évhez/hónaphoz kötött lapok, kapcsolt Alap költség (csak olvasható), tételek darabárral, csatolmánnyal (GridFS, max 5 MB)
- **Alap költség** — a Felhasználás dátuma alapján automatikusan feltöltődik az Előfizetés/Biztosítás/Lakhatás/Rezsi/Közlekedés érvényes tételeivel (az Ártörténet árai felülbírálnak); Befizetve pipa → mai dátum
- **Blokk** — mobil feltöltés (kamera vagy fájl), feldolgozatlan számláló a fejlécben; desktopon split-screen gyors rögzítés localStorage-munkamenettel, egy lépéses mentéssel
- **Ártörténet** — kategóriánként (szolgáltatás, biztosítás, közlekedés, rezsi, hitel, albérlet), érvényességi intervallum alapú usage checkkel
- **Generikus törlés-ellenőrzés** — minden törlés előtt popup listázza, hol van használatban az elem (`GET /api/usage/:entityType/:id`)
- **Inkognitó mód** — minden pénzösszeg elhomályosítva, perzisztens kapcsoló
- **Dark/Light mód** — rendszerbeállítás az alap, kapcsolóval felülírható
- **i18n** — react-i18next, magyar tartalommal; az angol nyelv architekturálisan előkészítve (`en.json` üres, fallback: hu)

## Projektszerkezet

```
garas-hkr/
├── docker-compose.yml          # lokális: mongo + backend + frontend (vite dev)
├── docker-compose.prod.yml     # éles VPS: mongo + backend
├── backend/
│   └── src/
│       ├── models.ts           # összes Mongoose modell
│       ├── middleware/         # Clerk auth (+ dev mód), egységes hibakezelés
│       ├── services/
│       │   ├── logic.ts        # tiszta üzleti logika (unit tesztelt)
│       │   ├── usageCheck.ts   # generikus törlés-előtti referencia-ellenőrzés
│       │   ├── gridfs.ts       # fájltárolás (5 MB limit, típusszűrés)
│       │   └── seed.ts         # kezdő kategóriák / fizetési módok / beállítások
│       └── routes/             # generikus CRUD factory + speciális végpontok
└── frontend/
    └── src/
        ├── components/         # Layout, CrudPage, Money, ConfirmDeleteDialog…
        ├── pages/              # a 15 menüpont + Profil + gyors rögzítés
        ├── lib/                # api kliens, React Query hookok, formázás,
        │                       # blokk-munkamenet logika (unit tesztelt)
        ├── i18n/               # hu.json (teljes), en.json (előkészítve)
        └── e2e/                # Playwright tesztek
```
