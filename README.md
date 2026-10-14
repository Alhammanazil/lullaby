# Lullaby — The Power of Sleep, Interactive

An unofficial, one-page interactive companion to the book **_The Power of Sleep_** by Vishal Dasani
(Kawan Pustaka, 2024; originally written in Indonesian). Instead of a wall of text, the ideas become
tools you can play with, so people can understand and improve their sleep.

> **Not affiliated with the author or publisher.** All copy on the site is original summary and paraphrase.
> For the full explanations, examples and stories, please read and support the book.

**Live:** https://lullaby-sleep.netlify.app

## What's inside

Six sections that follow the book's chapters, plus a quick self-check at the top:

| Chapter | Interactive pieces |
|---|---|
| **1 · Sleep 101** | 24-hour sleep-pressure vs body-clock chart, sleep-cycle planner, insomnia vs other disorders |
| **2 · Lifestyle** | Shift-work tips, weekday sleep-debt calculator, caffeine cut-off time, nicotine/caffeine/alcohol explorer, foods, exercise, jet-lag planner |
| **3 · Life Stages** | Sleep need by age, natural sleep-need and sleep-efficiency calculators, pregnancy / baby / child / older-adult guidance |
| **4 · Body & Mind** | Animated breathing guide (4-7-8 and 3-5), progressive muscle relaxation stepper, key-habits tracker, dreams, rest vs sleep (NSDR) |
| **5 · Bedroom Setup** | "Sensory oasis" checklist with progress ring, temperature check, sleeping position and pillow guide, mattress comparison, weighted-blanket calculator |
| **6 · Sleep Problems** | Searchable, filterable cards: snoring, mouth taping, teeth grinding, hypnic jerks, restless legs, sleepwalking, sharing a bed… |

Design notes:

- **Bilingual:** Indonesian (default) and English, switched with the **ID | ENG** button at the top right. The choice is remembered on the device.
- Night (default) and Dawn themes, following `prefers-color-scheme` with a manual toggle.
- Mobile-first and responsive; keyboard accessible (tabs, accordions, skip link, visible focus).
- Respects `prefers-reduced-motion`.
- Progress and checklists are stored in `localStorage` on the device only. No tracking, no network calls other than Google Fonts.
- Zero dependencies and no build step: plain HTML, CSS and JavaScript.

## Run locally

Requires [Node.js](https://nodejs.org) (only for the tiny preview server).

```bash
npm start
# → http://localhost:5180
```

Or open `index.html` directly in a browser, or serve the folder with any static server.

## Deploy

It's a static site. `npm run build` copies the site files into `dist/` (that folder is what gets published).

- **Netlify:** `netlify.toml` already sets the build command and publish directory. Deploy with `npx netlify-cli deploy --prod --dir dist`, or connect the repo for deploys on every push.
- **Anywhere else:** GitHub Pages, Cloudflare Pages or Vercel work too; publish the `dist/` folder.

## Project structure

```
index.html   Page structure and static content (Indonesian baked in as the default)
styles.css   Design tokens, themes and components
i18n.js      Static page strings in English and Indonesian (keys match `data-i18n` in index.html)
app.js       All interactive tools and dynamic text (vanilla JS); dynamic strings use `L(english, indonesian)`
server.js    Optional zero-dependency local preview server
```

## Medical disclaimer

This project is general educational content, **not medical advice**. The calculators are simplified and illustrative.
Please talk to a qualified professional about persistent sleep problems, supplements, medication, infant sleep safety or
any health condition.

## License

Code is released under the [MIT License](LICENSE). The book's text, illustrations and trademarks remain the property of
their respective owners and are not included in this repository.

## Editing copy / adding a language

- Static text: edit the value in both `en` and `id` of `i18n.js` for the element's `data-i18n` key, and keep the Indonesian text in `index.html` in sync (it is the no-JavaScript fallback).
- Dynamic text (tools, tabs, cards): edit the `L("English", "Indonesian")` pairs in `app.js`.
