# Charades — igra pogađanja pojmova

Expo / React Native aplikacija za žurke: izabereš kategoriju, staviš telefon na čelo i
objašnjavaš pojmove ekipi. Nagib nagore preskače pojam, nagib nadole nosi poen.

## Funkcije

- 4 kategorije: **Filmovi**, **Muzika**, **Životinje** i **Glume** (oko 65 pojmova po kategoriji).
- Odbrojavanje **3 · 2 · 1** pre početka i kružni tajmer od **60 / 90 / 120 sekundi**.
- Runda se igra u **horizontalnom položaju** sa velikim, čitljivim pojmovima; uspravan
  telefon prikazuje ekran „Okreni telefon“ i automatski pauzira rundu.
- Kontrola nagibom preko akcelerometra (`expo-sensors`) sa kalibracijom tokom odbrojavanja.
- Ručna dugmad **TAČNO** i **PRESKOČI** kao zamena kada senzor nije dostupan.
- Zvuk za odbrojavanje, poslednjih 10 sekundi, tačan odgovor, preskok i kraj runde.
- Haptička potvrda na uređajima koji je podržavaju.
- Pauza (i automatska pauza kada aplikacija ode u pozadinu), izlaz bez rezultata i
  završetak runde pre isteka vremena.
- Rezime sa poenima, tačnim/preskočenim pojmovima, uspešnošću, najdužim nizom i
  hronološkom listom svih pojmova.
- Tamna „party” tema, NativeWind stilovi, Bricolage Grotesque + Manrope fontovi.
- Prilagođene ikone, splash i zvučni efekti.

## Tehnologije

- Expo SDK 58 + Expo Router (file-based routing u `src/app`)
- React Native 0.88 + TypeScript
- NativeWind 4 / Tailwind CSS 3
- `expo-sensors`, `expo-audio`, `expo-haptics`, `expo-keep-awake`
- `useReducer` + React Context za stanje igre

## Pokretanje

```bash
npm install
npx expo start
```

Zatim:

- `i` — iOS simulator
- `a` — Android emulator
- `w` — web
- ili skeniraj QR kod u **Expo Go** aplikaciji

Za razvojnu verziju (kada dodaješ native module):

```bash
npx expo run:ios
npx expo run:android
```

> Orijentacija ekrana je deo native konfiguracije (`app.json`). U Expo Go radi odmah,
> a ako već imaš instaliran custom development build, napravi novi build da bi se
> landscape zaključavanje primenilo.

Proveri okruženje i tipove:

```bash
npx tsc --noEmit
npx expo-doctor
```

## Kako se igra

1. Na početnom ekranu izaberi kategoriju i trajanje, pa dodirni **Započni rundu**.
2. Telefon se zaključava u **horizontalni (landscape) položaj** — tako pojmovi dobijaju
   mnogo veći i čitljiviji prikaz. Ako ekran još nije horizontalan, prikazuje se
   **Okreni telefon** i runda ne počinje dok se ne postavi landscape.
3. Stavi telefon na čelo, ekran okreni ka ekipi i drži telefon mirno tokom odbrojavanja
   (senzor se tada kalibriše).
4. Objašnjavaj pojam. **Nagni telefon nadole** za tačan odgovor ili **nagore** za preskok.
   Ako senzor ne reaguje, koristi dugmad na dnu ekrana.
5. Runda se završava sama kada istekne vreme ili je prekineš preko pauze. Rezime stiže
   nakon kratke završne animacije i ponovo se prikazuje uspravno.

Ako telefon vratiš u uspravan položaj tokom runde, igra se automatski pauzira dok se
ekran ponovo ne postavi horizontalno.

### Napomene o senzorima

- Kalibracija se radi u odnosu na početni položaj telefona, pa nije važno da li telefon
  držiš blago nagnut.
- Nagib se registruje sa kratkim debounce-om da se izbegne dvostruki unos.
- **Na webu su kontrole nagibom namerno isključene** (akcelerometar u browseru nije
  pouzdan); koristi dugmad **TAČNO** / **PRESKOČI**.
- Ako uređaj nema akcelerometar, aplikacija prikazuje poruku i prelazi na dugmad.

## Struktura projekta

```text
src/
  app/
    _layout.tsx      # fontovi, provajderi, Expo Router stack
    index.tsx        # izbor kategorije, trajanja i podešavanja
    game.tsx         # landscape runda: odbrojavanje, senzori, pauza, kraj
    summary.tsx      # rezultat i lista pojmova
  components/        # WordCard, dugmad, pozadina, UI delovi
  constants/         # kategorije i pojmovi
  hooks/             # useTiltControls (akcelerometar)
  lib/               # shuffle, formatiranje, trajanja
  providers/         # GameProvider (useReducer, zvuk, haptika)
  types/             # tipovi igre
scripts/
  generate-sounds.mjs # generiše WAV efekte u assets/sounds
  generate-icons.mjs  # generiše PNG ikone iz assets/brand (macOS, sips)
assets/
  brand/             # izvorni SVG-ovi za ikonu i splash
  sounds/            # generisani zvučni efekti
```

## Podešavanje sadržaja

Pojmovi i kategorije su u `src/constants/categories.ts`. Svaka kategorija ima `id`,
naziv, emoji, akcentnu boju, gradient i listu pojmova. Dovoljno je dodati novi objekat u
`CATEGORIES` i, ako je potreban novi `id`, proširiti `CategoryId` u
`src/types/game.ts`.

Trajanja runde i njihove oznake su u `src/lib/utils.ts` (`DURATIONS`), a podrazumevano
trajanje u `src/app/index.tsx`.

## Skripte

```bash
npm run typecheck   # TypeScript provera
npm run sounds      # regeneriši zvučne efekte
npm run icons       # regeneriši ikone i splash (macOS)
```

## Web

Web verzija služi za brzu proveru izgleda i tokova:

```bash
npx expo export --platform web
npx serve dist
```

Na webu zvuk i haptika zavise od browsera; kontrole nagibom su zamenjene dugmadima.
Runda se i na webu prikazuje tek kada je prozor horizontalan (širina veća od visine),
pa je za proveru najbolje koristiti landscape prozor ili rotirati telefon.

## Licenca

MIT — vidi `LICENSE`.
