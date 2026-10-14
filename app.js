/* The Power of Sleep — interactive guide
   Vanilla JS, no dependencies. Bilingual (Indonesian default, English): static page text lives in
   i18n.js (keyed by data-i18n attributes); dynamic text is written inline with L(english, indonesian).
   Every tool degrades gracefully if storage is blocked. */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("pos:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("pos:" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- language ---------- */
  let lang = store.get("lang", "id");
  if (lang !== "en" && lang !== "id") lang = "id";
  const L = (en, id) => (lang === "id" ? id : en);
  const S = (k) => { const d = (window.I18N || {}); return (d[lang] && d[lang][k] != null) ? d[lang][k] : ((d.en && d.en[k]) || ""); };
  const langHooks = [];
  const onLang = (fn) => langHooks.push(fn);
  const num = (n) => (lang === "id" ? String(n).replace(".", ",") : String(n));

  const fmtTime = (mins) => {
    mins = ((Math.round(mins) % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60), m = mins % 60;
    if (lang === "id") return `${pad(h)}.${pad(m)}`;
    return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
  };
  const parseTime = (v) => { const [h, m] = (v || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const fmtH = (h) => `${num(h)} ${L("h", "jam")}`;
  const fmtHM = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} ${L("h", "jam")} ${pad(m % 60)} ${L("min", "menit")}`; };
  const ul = (arr) => `<ul class="muted">${arr.map((x) => `<li>${x}</li>`).join("")}</ul>`;

  function applyStatic() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => { el.innerHTML = S(el.dataset.i18n); });
    ["aria-label", "placeholder"].forEach((a) => {
      $$(`[data-i18n-${a}]`).forEach((el) => el.setAttribute(a, S(el.getAttribute("data-i18n-" + a)).replace(/&amp;/g, "&")));
    });
    document.title = S("meta.title");
    const setMeta = (sel, v) => { const m = $(sel); if (m) m.setAttribute("content", v); };
    setMeta('meta[name="description"]', S("meta.desc"));
    setMeta('meta[property="og:title"]', S("meta.title"));
    setMeta('meta[property="og:description"]', S("meta.ogdesc"));
    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }
  function setLang(next) {
    if (next === lang) return;
    lang = next; store.set("lang", lang);
    applyStatic();
    langHooks.forEach((fn) => { try { fn(); } catch (e) { console.error("[lang hook failed]", e); } });
  }

  function buildTabs(root, items, pid) {
    const sel0 = Math.min(root._sel || 0, items.length - 1);
    root.innerHTML =
      `<div class="tablist" role="tablist">${items.map((it, i) =>
        `<button class="tab" type="button" role="tab" id="${pid}-t${i}" aria-controls="${pid}-p${i}" aria-selected="${i === sel0}" tabindex="${i === sel0 ? 0 : -1}">${it.label}</button>`).join("")}</div>` +
      items.map((it, i) =>
        `<div class="tabpanel" role="tabpanel" id="${pid}-p${i}" aria-labelledby="${pid}-t${i}" ${i === sel0 ? "" : "hidden"} tabindex="0">${it.html}</div>`).join("");
    const tabs = $$('[role="tab"]', root), panels = $$('[role="tabpanel"]', root);
    const select = (i) => {
      root._sel = i;
      tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(j === i)); t.tabIndex = j === i ? 0 : -1; panels[j].hidden = j !== i; });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        let n = null;
        if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n); tabs[n].focus(); }
      });
    });
  }

  /* ---------- theme, language toggle, progress, nav, reveal ---------- */
  function initChrome() {
    const root = document.documentElement;
    const meta = $('meta[name="theme-color"]');
    const apply = (t) => { root.setAttribute("data-theme", t); if (meta) meta.setAttribute("content", t === "light" ? "#f8f5ee" : "#090d1c"); };
    apply(root.getAttribute("data-theme") || "dark");
    $("#themeBtn").addEventListener("click", () => {
      const t = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(t); store.set("theme", t);
    });
    $$(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

    const bar = $("#progress");
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (h > 0 ? clamp(scrollY / h, 0, 1) * 100 : 0) + "%";
        ticking = false;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const links = $$("#nav a");
    if ("IntersectionObserver" in window) {
      const navObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => {
            const on = a.getAttribute("href") === "#" + en.target.id;
            a.classList.toggle("active", on);
            if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
            if (on) { const nav = a.parentElement; nav.scrollTo({ left: a.offsetLeft - 16, behavior: reduceMotion ? "auto" : "smooth" }); }
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      $$("section[data-nav]").forEach((s) => navObs.observe(s));

      const revObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revObs.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      $$(".reveal").forEach((el) => revObs.observe(el));
    } else {
      $$(".reveal").forEach((el) => el.classList.add("in"));
    }
  }

  /* ---------- quick check ---------- */
  function initCheck() {
    const form = $("#checkForm"), out = $("#checkOut");
    const render = () => {
      const picked = $$("input:checked", form);
      if (!picked.length) { out.innerHTML = `<p>${L("Tick a few boxes above to see your suggested starting points.", "Centang beberapa kotak di atas untuk melihat saran titik awalmu.")}</p>`; return; }
      out.innerHTML = `<strong>${L("Start here", "Mulai dari sini")}</strong><ul style="margin:6px 0 0">${picked.map((i) => `<li><a href="${i.dataset.go}">${S("w" + i.dataset.w)}</a></li>`).join("")}</ul>` +
        `<p class="small muted" style="margin:10px 0 0">${L("If a problem happens more than 3 nights a week for over 2 weeks, consider talking to a sleep professional.", "Jika suatu masalah terjadi lebih dari 3 malam seminggu selama lebih dari 2 minggu, pertimbangkan berkonsultasi dengan profesional tidur.")}</p>`;
    };
    form.addEventListener("change", render);
    render(); onLang(render);
  }

  /* ---------- Chapter 1: circadian chart ---------- */
  function initClock() {
    const svg = $("#clock"), slider = $("#clockHour");
    const X0 = 36, W = 468, Y0 = 20, H = 180;
    const x = (h) => X0 + (h / 24) * W;
    const y = (v) => Y0 + H - v * H;
    const press = (h) => {
      if (h >= 23) return Math.exp(-(h - 23) / 3);
      if (h < 7) return Math.exp(-(h + 1) / 3);
      return 0.07 + 0.93 * ((1 - Math.exp(-(h - 7) / 8)) / (1 - Math.exp(-2)));
    };
    const circ = (h) => 0.5 + 0.5 * Math.cos((2 * Math.PI * (h - 16)) / 24);
    const path = (fn) => { let d = ""; for (let h = 0; h <= 24; h += 0.25) d += `${d ? "L" : "M"}${x(h).toFixed(1)} ${y(fn(h % 24)).toFixed(1)}`; return d; };
    const build = () => {
      const labels = lang === "id" ? ["00", "03", "06", "09", "12", "15", "18", "21", "24"] : ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p", "12a"];
      svg.setAttribute("aria-label", L("Chart of sleep pressure and body-clock alertness across 24 hours", "Grafik tekanan tidur dan kewaspadaan jam biologis selama 24 jam"));
      svg.innerHTML =
        `<rect x="${x(0)}" y="${Y0}" width="${x(7) - x(0)}" height="${H}" fill="var(--accent)" opacity="0.10"/>` +
        `<rect x="${x(23)}" y="${Y0}" width="${x(24) - x(23)}" height="${H}" fill="var(--accent)" opacity="0.10"/>` +
        `<text x="${x(3.5)}" y="${Y0 + 14}" text-anchor="middle">${L("asleep", "tidur")}</text><text x="${x(23.5)}" y="${Y0 + 14}" text-anchor="middle">zzz</text>` +
        [0, 0.5, 1].map((v) => `<line x1="${X0}" x2="${X0 + W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>`).join("") +
        `<text x="${X0 - 6}" y="${y(1) + 4}" text-anchor="end">${L("high", "tinggi")}</text><text x="${X0 - 6}" y="${y(0) + 4}" text-anchor="end">${L("low", "rendah")}</text>` +
        labels.map((l, i) => `<text x="${x(i * 3)}" y="${Y0 + H + 18}" text-anchor="middle">${l}</text>`).join("") +
        `<path d="${path(circ)}" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${path(press)}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<line id="cMark" y1="${Y0}" y2="${Y0 + H}" stroke="var(--text)" stroke-dasharray="4 4" opacity="0.6"/>` +
        `<circle id="cDotP" r="6" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/><circle id="cDotC" r="6" fill="var(--gold)" stroke="var(--bg)" stroke-width="2"/>`;
    };
    const update = () => {
      const mark = $("#cMark", svg), dp = $("#cDotP", svg), dc = $("#cDotC", svg);
      const h = parseFloat(slider.value);
      mark.setAttribute("x1", x(h)); mark.setAttribute("x2", x(h));
      dp.setAttribute("cx", x(h)); dp.setAttribute("cy", y(press(h)));
      dc.setAttribute("cx", x(h)); dc.setAttribute("cy", y(circ(h)));
      $("#clockTime").textContent = fmtTime(h * 60);
      const asleep = h >= 23 || h < 7;
      let msg, w;
      if (asleep) {
        w = 0; msg = L("Typical sleep window. Pressure drains away as you sleep, and the body clock reaches its lowest point in the early hours.",
          "Jendela tidur yang umum. Tekanan tidur terkuras seiring kamu tidur, dan jam biologis mencapai titik terendah di dini hari.");
      } else {
        const r = press(h) * (1 - circ(h));
        w = clamp((r / 0.65) * 100, 4, 100);
        msg = r >= 0.4 ? L("Prime time to fall asleep: pressure is high and the body clock is low.", "Waktu terbaik untuk tertidur: tekanan tidur tinggi dan jam biologis rendah.")
          : r >= 0.25 ? L("Winding down: pressure is building and the clock is starting to fall.", "Mulai melambat: tekanan tidur menumpuk dan jam biologis mulai turun.")
          : L("Awake zone: either pressure is still low or your body clock is pushing alertness. Falling asleep now would be hard.", "Zona terjaga: tekanan tidur masih rendah atau jam biologismu sedang mendorong kewaspadaan. Tertidur sekarang akan sulit.");
      }
      $("#clockMeter").style.width = w + "%";
      $("#clockOut").textContent = msg;
    };
    slider.addEventListener("input", update);
    const refresh = () => { build(); update(); };
    refresh(); onLang(refresh);
  }

  /* ---------- Chapter 1: cycle planner ---------- */
  function initCycles() {
    const time = $("#cycleTime"), out = $("#cycleOut");
    const mode = () => $('input[name="cycleMode"]:checked').value;
    const FALL = 15, CYC = 90;
    const render = () => {
      const note = { 4: L("minimum healthy range", "batas bawah yang sehat"), 5: L("7.5 h of sleep", "7,5 jam tidur"), 6: L("9 h of sleep", "9 jam tidur") };
      const t = parseTime(time.value);
      const rows = mode() === "wake"
        ? [6, 5, 4].map((n) => ({ n, label: L("Go to bed at", "Tidur pukul"), time: t - n * CYC - FALL }))
        : [4, 5, 6].map((n) => ({ n, label: L("Wake up at", "Bangun pukul"), time: t + FALL + n * CYC }));
      out.innerHTML = rows.map((r) =>
        `<li class="${r.n === 5 ? "best" : ""}"><div><div class="muted small">${r.label}</div><div class="t">${fmtTime(r.time)}</div></div>` +
        `<div class="m"><strong>${r.n} ${L("cycles", "siklus")}</strong><br>${note[r.n] || ""}${r.n === 5 ? ` · <span class="pill good">${L("sweet spot", "ideal")}</span>` : ""}</div></li>`).join("");
    };
    time.addEventListener("input", render);
    $$('input[name="cycleMode"]').forEach((r) => r.addEventListener("change", render));
    render(); onLang(render);
  }

  /* ---------- Chapter 2: sleep debt ---------- */
  function initDebt() {
    const needEl = $("#debtNeed"), sleptEl = $("#debtSlept"), bars = $("#debtBars"), out = $("#debtOut");
    const MAX = 12;
    const render = () => {
      const days = lang === "id" ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const need = parseFloat(needEl.value), slept = parseFloat(sleptEl.value);
      $("#debtNeedOut").textContent = fmtH(need);
      $("#debtSleptOut").textContent = fmtH(slept);
      bars.setAttribute("aria-label", L("Bar chart of hours slept each weekday compared to the hours needed", "Diagram batang jam tidur tiap hari kerja dibandingkan kebutuhan"));
      const deficit = Math.max(0, need - slept);
      bars.innerHTML = days.map((d, i) => {
        if (i >= 5) return `<div class="bar off"><div class="col"><div class="need" style="bottom:${(need / MAX) * 100}%"></div></div><span>${d}</span></div>`;
        return `<div class="bar"><div class="col"><i style="height:${(Math.min(slept, need) / MAX) * 100}%"></i>` +
          (deficit ? `<i class="debt" style="bottom:${(slept / MAX) * 100}%;height:${(deficit / MAX) * 100}%"></i>` : "") +
          (slept > need ? `<i style="height:${(slept / MAX) * 100}%"></i>` : "") +
          `<div class="need" style="bottom:${(need / MAX) * 100}%"></div></div><span>${d}</span></div>`;
      }).join("");
      const debt = deficit * 5;
      out.innerHTML = debt === 0
        ? `<span class="pill good">${L("No weekday debt", "Tidak ada utang di hari kerja")}</span> ${L("You are sleeping as much as you need. Keep your schedule steady, weekends included.", "Tidurmu sudah sesuai kebutuhan. Pertahankan jadwal yang stabil, termasuk akhir pekan.")}`
        : `<strong>${L(`About ${fmtH(debt)} of sleep debt after 5 workdays.`, `Sekitar ${fmtH(debt)} utang tidur setelah 5 hari kerja.`)}</strong> <span class="muted">${L(
          "Sleeping in on the weekend can ease tiredness but will rarely repay it all, and a big shift in wake-up time can cause social jet lag: harder to fall asleep on Sunday, harder to get up on Monday.",
          "Bangun siang di akhir pekan bisa meredakan lelah tetapi jarang melunasi semuanya, dan pergeseran jam bangun yang besar bisa memicu social jet lag: Minggu malam makin sulit tidur, Senin pagi makin sulit bangun.")}</span>`;
    };
    needEl.addEventListener("input", render);
    sleptEl.addEventListener("input", render);
    render(); onLang(render);
  }

  /* ---------- Chapter 2: substances + caffeine ---------- */
  function initSubstances() {
    const bed = $("#cafBed"), out = $("#cafOut");
    const cafe = () => { out.textContent = fmtTime(parseTime(bed.value) - 360); };
    const build = () => {
      buildTabs($("#subTabs"), [
        { label: L("🚬 Nicotine", "🚬 Nikotin"), html: `<h3>${L("Nicotine (smoking and vaping)", "Nikotin (rokok dan vape)")}</h3>${ul(lang === "id" ? [
          "Stimulan: membuat otak terjaga lebih lama, sehingga tertidur butuh waktu lebih lama, meski merokok terasa menenangkan.",
          "Mengurangi waktu tidur REM, fase yang berkaitan dengan bangun segar dan suasana hati baik.",
          "Perokok sering terbangun di malam hari, sehingga tidur terputus-putus.",
          "Rasa ingin merokok di malam hari memicu gelisah akibat putus nikotin.",
          "Bisa memperparah mengorok dan sleep apnea, terutama menjelang tidur."] : [
          "A stimulant: it keeps the brain awake longer, so falling asleep takes more time, even if smoking feels relaxing.",
          "It cuts time in REM sleep, the stage tied to waking up fresh and in a good mood.",
          "Smokers often wake in the night, so sleep is fragmented.",
          "Cravings at night bring withdrawal restlessness.",
          "It can worsen snoring and sleep apnea, especially close to bedtime."])}<p class="small"><strong>${L("Takeaway:", "Intinya:")}</strong> ${L("think of nicotine as a small alarm that keeps interrupting your body clock.", "anggap nikotin sebagai alarm kecil yang terus mengganggu jam biologismu.")}</p>` },
        { label: L("☕ Caffeine", "☕ Kafein"), html: `<h3>${L("Caffeine (coffee, tea, energy drinks)", "Kafein (kopi, teh, minuman energi)")}</h3>${ul(lang === "id" ? [
          "Menahan rasa lelah selama beberapa jam.",
          "<strong>Kapan</strong> dan <strong>berapa banyak</strong> itu penting: sisa kafein di tubuh saat tidur membuat tidur lebih sulit dan lebih singkat.",
          "Sebagian orang tetap bisa tidur setelah kopi sore, tetapi tidur dalamnya cenderung berkurang.",
          "Pakai kalkulator batas waktu di samping kartu ini untuk menemukan jam terakhirmu."] : [
          "It blocks the feeling of tiredness for a few hours.",
          "<strong>When</strong> and <strong>how much</strong> matter: what is left in your body at bedtime makes sleep harder and shorter.",
          "Some people fall asleep fine after an afternoon coffee, but deep sleep still tends to shrink.",
          "Use the cut-off calculator beside this card to find your last-call time."])}` },
        { label: L("🍷 Alcohol", "🍷 Alkohol"), html: `<h3>${L("Alcohol", "Alkohol")}</h3><p><span class="pill bad">${L("Not a sleep aid", "Bukan alat bantu tidur")}</span></p>${ul(lang === "id" ? [
          "Membuat cepat tertidur karena mematikan sebagian fungsi otak, tetapi tidur yang menyusul tidak alami.",
          "Tidur dalam dan REM menjadi tidak seimbang, dengan REM yang berkurang, sehingga mood dan daya pikir keesokan hari terganggu.",
          "Tidur makin terputus-putus, dan mengorok atau sleep apnea makin parah.",
          "Kamu bisa bangun tidak segar meski tidurnya lama dan cepat dimulai."] : [
          "It helps you fall asleep faster because it switches off part of brain function, but the sleep that follows is not natural.",
          "Deep sleep and REM become unbalanced, with less REM, which hurts mood and thinking the next day.",
          "Sleep becomes more broken, and snoring or sleep apnea gets worse.",
          "You can wake unrefreshed even after a long, quick-to-start night."])}` },
      ], "sub");
      cafe();
    };
    bed.addEventListener("input", cafe);
    build(); onLang(build);
  }

  /* ---------- Chapter 2: food, exercise ---------- */
  function initFoodExercise() {
    const build = () => {
      const foods = [
        ["🥛", L("Warm milk", "Susu hangat"), L("Provides calcium and tryptophan, which the body uses to make melatonin.", "Menyediakan kalsium dan triptofan, yang dipakai tubuh untuk membuat melatonin.")],
        ["🍵", L("Ginger tea", "Teh jahe"), L("A cup before bed can help the body relax thanks to ginger's calming properties.", "Secangkir sebelum tidur membantu tubuh rileks berkat sifat jahe yang menenangkan.")],
        ["🍠", L("Sweet potato", "Ubi jalar"), L("Rich in complex carbohydrates that aid digestion and support melatonin production.", "Kaya karbohidrat kompleks yang membantu pencernaan dan mendukung produksi melatonin.")],
        ["🫘", L("Tempeh", "Tempe"), L("Fermented soybeans containing tryptophan, which supports melatonin.", "Kedelai fermentasi yang mengandung triptofan, mendukung produksi melatonin.")],
        ["🐟", L("Fish", "Ikan"), L("Rich in tryptophan and several vitamins needed for melatonin. Local options: milkfish (bandeng), mackerel (tenggiri) or pangasius (patin).", "Kaya triptofan dan beberapa vitamin yang dibutuhkan untuk melatonin. Pilihan lokal: bandeng, tenggiri, atau patin.")],
        ["🥜", L("Nuts and seeds", "Kacang dan biji-bijian"), L("Peanuts, mung beans and (black) sesame are good magnesium sources that support muscle relaxation and sleep quality.", "Kacang tanah, kacang hijau, dan wijen (hitam) adalah sumber magnesium yang baik, membantu relaksasi otot dan kualitas tidur.")],
      ];
      $("#foodGrid").innerHTML = foods.map((f) => `<div class="card"><span class="ico" aria-hidden="true">${f[0]}</span><h4>${f[1]}</h4><p class="muted small">${f[2]}</p></div>`).join("");

      const ex = [
        ["🏃", L("Cardio", "Kardio"), L("Running, cycling, zumba, swimming", "Lari, bersepeda, zumba, berenang"), L("Boosts circulation and heart and lung function, eases stress, and raises sleep pressure so you're ready to rest.", "Melancarkan peredaran darah dan fungsi jantung serta paru, meredakan stres, dan menaikkan tekanan tidur sehingga kamu siap beristirahat.")],
        ["🏋️", L("Strength training", "Latihan kekuatan"), L("Push-ups, pull-ups, squats, deadlifts", "Push-up, pull-up, squat, deadlift"), L("Supports metabolism and hormone balance; a tired body tends to sink into deeper sleep for recovery.", "Mendukung metabolisme dan keseimbangan hormon; tubuh yang lelah cenderung tidur lebih dalam untuk pemulihan.")],
        ["🧘", "Yoga", L("Downward dog, child's pose, savasana", "Downward dog, child's pose, savasana"), L("Stretching, breathing and meditation. Great if you lie awake with an active mind or tense muscles.", "Peregangan, pernapasan, dan meditasi. Cocok jika kamu sulit tidur karena pikiran aktif atau otot tegang.")],
        ["🌀", L("Mind-body", "Mind-body"), L("Tai chi, pilates", "Tai chi, pilates"), L("Movement with focus on breath and body awareness, which eases stress.", "Gerakan dengan fokus pada napas dan kesadaran tubuh, yang meredakan stres.")],
        ["🚶", L("Gentle activity", "Aktivitas ringan"), L("Walking, gardening, playing with pets", "Jalan kaki, berkebun, bermain dengan hewan peliharaan"), L("Keeps you active without extra strain on joints. Ideal for beginners or limited mobility.", "Menjaga tubuh tetap aktif tanpa tekanan ekstra pada sendi. Cocok untuk pemula atau yang geraknya terbatas.")],
      ];
      $("#exGrid").innerHTML = ex.map((e) => `<div class="card"><span class="ico" aria-hidden="true">${e[0]}</span><h4>${e[1]}</h4><p class="small" style="color:var(--gold);margin-bottom:.4em">${e[2]}</p><p class="muted small">${e[3]}</p></div>`).join("");
    };
    build(); onLang(build);
  }

  /* ---------- Chapter 2: jet lag ---------- */
  function initJetLag() {
    const out = $("#jetOut"), ex = $("#jetExample");
    const render = () => {
      const data = {
        west: { ex: L("e.g. Jakarta → Abu Dhabi: the day gets longer, which most people adapt to more easily.", "mis. Jakarta → Abu Dhabi: hari menjadi lebih panjang, yang biasanya lebih mudah diadaptasi."), steps: lang === "id" ? [
          "Beberapa hari sebelum berangkat, tidur sekitar 1 jam lebih larut dari biasanya.",
          "Di tujuan, cari cahaya terang di sore dan malam hari untuk membantu tubuh menyesuaikan diri.",
          "Tahan kantuk sampai jam tidur setempat, lalu makan, tidur, dan bangun sesuai waktu setempat."] : [
          "A few days before leaving, go to bed about 1 hour later than usual.",
          "At your destination, get bright light in the late afternoon and evening to help your body adjust.",
          "Stay up until local bedtime, then eat, sleep and wake on local time."] },
        east: { ex: L("e.g. Jakarta → Tokyo: the day gets shorter, so your body is pushed to sleep earlier. This is usually harder.", "mis. Jakarta → Tokyo: hari menjadi lebih pendek, sehingga tubuh dipaksa tidur lebih awal. Biasanya lebih berat."), steps: lang === "id" ? [
          "Beberapa hari sebelum berangkat, majukan jam tidur sekitar 1 jam secara bertahap, mulai dari 30 menit.",
          "Setelah tiba, cari cahaya pagi untuk membantu mereset jam biologis.",
          "Ikuti jam makan, tidur, dan aktivitas setempat secepat mungkin."] : [
          "A few days before leaving, shift bedtime about 1 hour earlier, gradually, starting with 30 minutes.",
          "After arriving, get morning light to help reset your body clock.",
          "Follow local meal, sleep and activity times as soon as you can."] },
      };
      const d = data[$('input[name="jetDir"]:checked').value];
      ex.textContent = d.ex;
      out.innerHTML = d.steps.map((s) => `<li>${s}</li>`).join("");
    };
    $$('input[name="jetDir"]').forEach((r) => r.addEventListener("change", render));
    render(); onLang(render);
  }

  /* ---------- Chapter 3 ---------- */
  function initAges() {
    const chips = $("#ageChips"), fill = $("#ageFill"), out = $("#ageOut");
    let cur = 5;
    const ages = () => [
      { l: L("Newborn", "Bayi baru lahir"), s: L("0–3 months", "0–3 bulan"), a: 14, b: 17, n: L("Newborns sleep in short stretches of 2–4 hours around feeds, and have no body clock yet.", "Bayi baru lahir tidur dalam rentang pendek 2–4 jam di sela menyusu, dan belum punya jam biologis.") },
      { l: L("Infant", "Bayi"), s: L("4 months – 3 years", "4 bulan – 3 tahun"), a: 11, b: 15, n: L("Total sleep slowly consolidates into longer night-time stretches.", "Total tidur perlahan terkonsolidasi menjadi rentang malam yang lebih panjang.") },
      { l: L("Preschool", "Prasekolah"), s: L("3–5 years", "3–5 tahun"), a: 10, b: 13, n: L("A predictable routine helps this age group the most.", "Rutinitas yang dapat diprediksi paling membantu kelompok usia ini.") },
      { l: L("School age", "Usia sekolah"), s: L("6–12 years", "6–12 tahun"), a: 9, b: 12, n: L("Homework and screens often start to squeeze sleep.", "PR dan layar gawai sering mulai menggerus waktu tidur.") },
      { l: L("Teen", "Remaja"), s: L("13–18 years", "13–18 tahun"), a: 8, b: 10, n: L("Puberty naturally pushes the body clock later, so teens feel alert at night and sluggish in the morning.", "Pubertas secara alami menggeser jam biologis lebih larut, sehingga remaja terasa segar di malam hari dan lesu di pagi hari.") },
      { l: L("Adult", "Dewasa"), s: L("19–64 years", "19–64 tahun"), a: 7, b: 9, n: L("Your own number sits inside this range. Track it to find out.", "Angka milikmu ada di dalam rentang ini. Catat untuk mengetahuinya.") },
      { l: L("Older adult", "Lansia"), s: L("65+ years", "65+ tahun"), a: 7, b: 8, n: L("Sleep tends to be lighter and earlier, with less deep sleep.", "Tidur cenderung lebih ringan dan lebih awal, dengan tidur dalam yang lebih sedikit.") },
    ];
    const show = () => {
      const list = ages(), a = list[cur];
      chips.setAttribute("aria-label", L("Age groups", "Kelompok usia"));
      chips.innerHTML = list.map((x, i) => `<button type="button" class="chip" aria-pressed="${i === cur}" data-i="${i}">${x.l}</button>`).join("");
      fill.style.left = (a.a / 18) * 100 + "%";
      fill.style.width = ((a.b - a.a) / 18) * 100 + "%";
      out.innerHTML = `<span class="big">${a.a}–${a.b} ${L("h", "jam")}</span> <span class="muted">${cur < 4 ? L("per day", "per hari") : L("per night", "per malam")} · ${a.s}</span><br><span class="muted">${a.n}</span>`;
    };
    chips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) { cur = +b.dataset.i; show(); } });
    show(); onLang(show);
  }

  function initNumbers() {
    const ids = ["n4", "n5", "n6", "n7"].map((i) => $("#" + i));
    const out = $("#needOut");
    const calc = () => {
      const v = ids.map((e) => parseFloat(e.value)).filter((n) => !isNaN(n));
      out.textContent = v.length ? fmtHM(v.reduce((a, b) => a + b, 0) / v.length) : "—";
    };
    ids.forEach((e) => e.addEventListener("input", calc));
    calc(); onLang(calc);

    const tib = $("#tib"), sol = $("#sol"), waso = $("#waso"), se = $("#seOut");
    const efficiency = () => {
      const T = Math.max(0, parseFloat(tib.value) || 0), S_ = Math.max(0, parseFloat(sol.value) || 0), W = Math.max(0, parseFloat(waso.value) || 0);
      const tst = Math.max(0, T - S_ - W);
      const pct = T > 0 ? clamp((tst / T) * 100, 0, 100) : 0;
      const col = pct >= 85 ? "var(--good)" : pct >= 75 ? "var(--warn)" : "var(--bad)";
      const mnt = L("min", "mnt");
      se.innerHTML = `<div class="gauge" style="--p:${pct.toFixed(0)};--c:${col}"><b>${pct.toFixed(0)}%</b></div>` +
        `<div style="flex:1 1 200px"><p style="margin:0 0 8px"><span class="pill ${pct >= 85 ? "good" : "warn"}">${pct >= 85 ? L("Good sleeper range", "Rentang good sleeper") : L("Below the 85% mark", "Di bawah angka 85%")}</span></p>` +
        `<dl class="kv"><dt>${L("Total sleep time", "Total waktu tidur")}</dt><dd>${fmtHM(tst / 60)}</dd><dt>${L("Falling asleep", "Waktu untuk tertidur")}</dt><dd>${S_} ${mnt} ${S_ > 30 ? "⚠" : "✓"}</dd><dt>${L("Awake at night", "Terjaga di malam hari")}</dt><dd>${W} ${mnt} ${W > 30 ? "⚠" : "✓"}</dd></dl></div>`;
    };
    [tib, sol, waso].forEach((e) => e.addEventListener("input", efficiency));
    efficiency(); onLang(efficiency);
  }

  function initStageTabs() {
    const build = () => {
      const tech = lang === "id" ? [
        ["Pick up / put down", "Angkat bayi sampai tenang, lalu letakkan kembali; ulangi sampai ia bisa tidur sendiri.", "Bayi yang lebih muda dan belum banyak bergerak.", "Mengajarkan bahwa boks bayi adalah tempat yang aman."],
        ["Ferber", "Biarkan bayi menangis selama waktu tertentu (3–10 menit) sebelum dicek dan ditenangkan. Perpanjang jedanya setiap malam.", "Sekitar usia 6 bulan ke atas.", "Membantu bayi belajar menenangkan diri."],
        ["Chair", "Duduk di kursi di samping boks, lalu geser kursi sedikit lebih jauh setiap beberapa hari sampai kamu berada di luar kamar.", "Bayi yang sangat lekat dengan orangtua atau pengasuh.", "Bayi belajar tidur sendiri sambil merasa kamu dekat."],
        ["No tears", "Tenangkan dengan mengayun, menyusui, dot, atau lagu pengantar tidur agar bayi tidur tanpa menangis.", "Bayi muda hingga balita, atau orangtua yang lebih nyaman dengan cara lembut.", "Sangat lembut, tanpa tangisan."],
      ] : [
        ["Pick up / put down", "Pick the baby up until calm, then lay them down again; repeat until they settle alone.", "Younger babies who aren't very mobile.", "Teaches that the cot is a safe place."],
        ["Ferber", "Let the baby cry for a set time (3–10 minutes) before checking in and soothing. Lengthen the interval each night.", "About 6 months and older.", "Helps babies learn to self-soothe."],
        ["Chair", "Sit beside the cot, then move the chair a little farther away every few days until you're outside the room.", "Babies strongly attached to parents or caregivers.", "Baby learns to sleep alone while feeling you're near."],
        ["No tears", "Soothe with rocking, nursing, a pacifier or lullabies so the baby sleeps without crying.", "Young babies to toddlers, or parents who prefer a gentle approach.", "Very gentle, with no crying involved."],
      ];
      const pregnancy = lang === "id" ? `<div class="split"><div><h3>Selama kehamilan</h3><p class="muted">American Pregnancy Association melaporkan sekitar 78% ibu hamil mengalami gangguan tidur. Keluhan umum: nyeri punggung, sering buang air kecil di malam hari, cemas, sesak napas, sulit mencari posisi nyaman, kram kaki, heartburn, dan jantung berdebar.</p>${ul([
        "Pakai bantal khusus ibu hamil.",
        "Jangan minum terlalu banyak beberapa jam sebelum tidur.",
        "Hindari makanan pedas dan berlemak tinggi menjelang tidur.",
        "Tidur menyamping dengan lutut dan kaki ditekuk; hindari telentang di trimester 2 dan 3.",
        "Buat rutinitas menenangkan sebelum tidur, seperti mandi air hangat atau musik lembut."])}</div>
        <div class="card" style="background:var(--bg)"><h4>Setelah melahirkan: insomnia pascamelahirkan</h4><p class="muted">Sulit tidur atau mempertahankan tidur meski sangat lelah itu umum, akibat perubahan hormon, stres, kecemasan sebagai orangtua baru, tantangan menyusui, dan nyeri fisik. Biasanya <strong>sementara</strong>.</p>${ul([
          "Bagi tugas malam dengan pasangan atau keluarga.",
          "Istirahat saat bayi tidur, walau sebentar.",
          "Jaga kamar tetap redup, sejuk, dan tenang.",
          "Batasi kafein, terutama di sore dan malam hari."])}</div></div>`
        : `<div class="split"><div><h3>During pregnancy</h3><p class="muted">The American Pregnancy Association reports that about 78% of pregnant women have disrupted sleep. Common complaints: back pain, night-time bathroom trips, anxiety, breathlessness, no comfortable position, leg cramps, heartburn and palpitations.</p>${ul([
        "Use a pregnancy pillow.",
        "Don't drink too much in the hours before bed.",
        "Avoid spicy and high-fat food near bedtime.",
        "Sleep on your side with knees and legs bent; avoid lying flat on your back in the 2nd and 3rd trimesters.",
        "Make a calming pre-bed routine, such as a warm bath or soft music."])}</div>
        <div class="card" style="background:var(--bg)"><h4>After birth: postnatal insomnia</h4><p class="muted">Trouble falling or staying asleep despite being exhausted is common, caused by hormonal changes, stress, new-parent anxiety, feeding challenges and physical pain. It's usually <strong>temporary</strong>.</p>${ul([
          "Share night duties with a partner or family.",
          "Rest when the baby sleeps, even briefly.",
          "Keep the room dim, cool and undisturbed.",
          "Go easy on caffeine, especially in the afternoon and evening."])}</div></div>`;
      const babies = `<h3>${L("Baby sleep", "Tidur bayi")}</h3><p class="muted">${L(
        "Newborns can sleep up to 17 hours a day, but not all at once: short bursts of about 2–4 hours between feeds (<em>polyphasic</em> sleep). Newborns don't yet have a body clock, so help them learn it: daylight in the morning and daytime, and a dark, quiet night. Simple cues such as a story or soft music signal bedtime.",
        "Bayi baru lahir bisa tidur hingga 17 jam sehari, tetapi tidak sekaligus: rentang pendek sekitar 2–4 jam di sela menyusu (tidur <em>polifasik</em>). Mereka belum punya jam biologis, jadi bantu mengenalnya: cahaya matahari di pagi dan siang hari, serta malam yang gelap dan tenang. Isyarat sederhana seperti membacakan cerita atau musik lembut menandakan waktu tidur.")}</p>
        <div class="callout"><strong>${L("Safe sleep (SIDS)", "Tidur aman (SIDS)")}</strong><p>${L(
        "Sudden Infant Death Syndrome is rare, but guidance helps lower the risk further: always lay baby on their back, use a firm flat mattress, keep the cot free of pillows, soft toys and thick blankets, and avoid cigarette smoke.",
        "Sindrom Kematian Mendadak pada Bayi (SIDS) jarang terjadi, tetapi panduan ini membantu menurunkan risikonya: selalu tidurkan bayi telentang, gunakan kasur keras dan datar, jaga boks bebas dari bantal, boneka lembut, dan selimut tebal, serta hindari asap rokok.")}</p></div>
        <h4>${L("Four soothing techniques", "Empat teknik menenangkan")}</h4><p class="muted small">${L("Every baby is different. You may need to try more than one; being consistent and patient matters most.", "Setiap bayi unik. Mungkin kamu perlu mencoba lebih dari satu; konsisten dan sabar adalah yang terpenting.")}</p>
        <div class="grid g4">${tech.map((t) => `<div class="card" style="background:var(--bg)"><h4>${t[0]}</h4><p class="muted small">${t[1]}</p><p class="small" style="margin:0"><span class="pill">${t[2]}</span></p><p class="muted small" style="margin:8px 0 0">✓ ${t[3]}</p></div>`).join("")}</div>`;
      const kids = lang === "id" ? `<div class="split"><div><h3>Anak-anak</h3><p class="muted">Mimpi buruk adalah bagian normal dari tumbuh kembang dan akan mereda, tetapi anak butuh ketenangan agar merasa aman.</p>${ul([
        "Kenali tanda lelah sejak dini (menggosok mata, menguap, rewel) dan jangan menunggu sampai kelelahan.",
        "Rutinitas malam yang menenangkan: buku, musik, mendongeng, atau pijatan lembut.",
        "Kamar yang gelap atau sangat redup, tenang, dan sejuk. Lampu tidur redup boleh untuk anak yang takut gelap.",
        "Tanpa TV atau gadget sebelum tidur.",
        "Bicarakan mimpi indah; jika ia menceritakan mimpi buruk, dengarkan, tenangkan, dan jelaskan bahwa mimpi hanyalah cerita buatan otak.",
        "Jika anak tampak cemas, luangkan waktu untuk berbicara."])}</div>
        <div><h3>Remaja</h3><p class="muted">Pubertas menggeser melatonin lebih larut (<em>phase delay</em>), sehingga remaja secara alami terjaga larut malam dan sulit bangun pagi. Sekolah, tekanan sosial, dan gadget malam hari memperburuknya.</p>${ul([
        "Ajak bicara agar beban pikirannya berkurang.",
        "Jaga jam tidur yang konsisten meski belum mengantuk.",
        "Olahraga bersama dan sediakan makanan bergizi.",
        "Terapi cahaya terang di pagi hari bisa mereset jam biologis. Konsultasikan dulu dengan ahli tidur."])}</div></div>`
        : `<div class="split"><div><h3>Children</h3><p class="muted">Nightmares are a normal part of growing up and fade with time, but kids need reassurance to feel safe.</p>${ul([
        "Spot tiredness early (rubbing eyes, yawning, irritability) and don't wait until they're overtired.",
        "A soothing nightly routine: books, music, storytelling or a gentle massage.",
        "A dark or very dim, quiet, cool room. A dim night light is fine for kids afraid of the dark.",
        "No TV or gadgets before bed.",
        "Talk about nice dreams; if they share a bad one, listen, comfort them and explain that dreams are just stories the brain makes up.",
        "If they seem anxious, make time to talk."])}</div>
        <div><h3>Teenagers</h3><p class="muted">Puberty shifts melatonin later (<em>phase delay</em>), so teens naturally feel awake late and struggle to wake early. School, social pressure and late-night gadget use make it worse.</p>${ul([
        "Talk with them so worries are lighter.",
        "Keep bedtime consistent even if they don't feel sleepy yet.",
        "Exercise together and provide nutritious food.",
        "Morning bright-light therapy can reset the body clock. Check with a sleep specialist first."])}</div></div>`;
      const elders = lang === "id" ? `<h3>Tidur di usia lanjut</h3><p class="muted">Gangguan tidur memang lebih sering terjadi seiring usia: melatonin berkurang, jam biologis bergeser lebih awal, dan tidur dalam berkurang. Aktivitas yang menurun, kondisi kesehatan, beberapa obat, kesepian, dan kekhawatiran menambah masalah.</p><p><strong>Cara tidur lebih baik</strong></p><ol class="muted">
        <li>Jaga jam bangun dan tidur yang teratur, akhir pekan juga.</li>
        <li>Berjemur matahari pagi 20–30 menit setelah bangun.</li>
        <li>Batasi tidur siang 20–30 menit dan hindari tidur di sore hari.</li>
        <li>Rutin latihan kekuatan.</li>
        <li>Makan gizi seimbang dalam jumlah yang sesuai.</li>
        <li>Rileks dengan meditasi, napas dalam, atau musik lembut.</li>
        <li>Melatonin boleh jadi pilihan terakhir, tetapi hanya setelah berkonsultasi dengan dokter.</li></ol>`
        : `<h3>Sleep later in life</h3><p class="muted">Sleep trouble does become more common with age: less melatonin, a body clock that shifts earlier, and less deep sleep. Lower activity, health conditions, some medications, loneliness and worry add to it.</p><p><strong>Ways to sleep better</strong></p><ol class="muted">
        <li>Keep a regular wake-up and bedtime, weekends too.</li>
        <li>Get 20–30 minutes of morning sunlight after waking.</li>
        <li>Limit naps to 20–30 minutes and avoid late-afternoon sleep.</li>
        <li>Do regular strength training.</li>
        <li>Eat a balanced diet in the right amounts.</li>
        <li>Wind down with meditation, deep breathing or soft music.</li>
        <li>Melatonin may be a last resort, but only after talking to a doctor.</li></ol>`;
      buildTabs($("#stageTabs"), [
        { label: L("🤰 Pregnancy", "🤰 Kehamilan"), html: pregnancy },
        { label: L("👶 Babies", "👶 Bayi"), html: babies },
        { label: L("🧒 Kids & teens", "🧒 Anak & remaja"), html: kids },
        { label: L("🧓 Older adults", "🧓 Lansia"), html: elders },
      ], "stage");
    };
    build(); onLang(build);
  }

  /* ---------- Chapter 4 ---------- */
  function initBreath() {
    const orb = $("#orb"), phase = $("#breathPhase"), cnt = $("#breathCount"), btn = $("#breathBtn"), stat = $("#breathStat");
    const patterns = () => ({
      "478": [[L("Breathe in", "Tarik napas"), 4, 1], [L("Hold", "Tahan"), 7, 1], [L("Breathe out", "Hembuskan"), 8, 0.55]],
      "35": [[L("Breathe in", "Tarik napas"), 3, 1], [L("Breathe out", "Hembuskan"), 5, 0.55]],
    });
    let running = false, token = 0, breaths = 0, t0 = Date.now(), tick = null;
    const mode = () => $('input[name="breathMode"]:checked').value;
    const scale = (s, d) => { orb.style.transitionDuration = reduceMotion ? "0s" : d + "s"; orb.style.transform = `scale(${s})`; };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const showStat = () => {
      const s = running ? Math.floor((Date.now() - t0) / 1000) : 0;
      stat.textContent = `${breaths} ${L(breaths === 1 ? "breath" : "breaths", "napas")} · ${Math.floor(s / 60)}:${pad(s % 60)}`;
    };
    const idle = () => { btn.textContent = L("Start", "Mulai"); phase.textContent = L("Ready", "Siap"); cnt.textContent = "·"; scale(0.55, 1); showStat(); };
    const stop = () => { running = false; token++; clearInterval(tick); breaths = 0; idle(); };
    async function loop(my) {
      while (running && my === token) {
        for (const [name, secs, sc] of patterns()[mode()]) {
          if (!running || my !== token) return;
          phase.textContent = name; scale(sc, secs);
          for (let s = secs; s > 0; s--) {
            if (!running || my !== token) return;
            cnt.textContent = s; await wait(1000);
          }
        }
        breaths++; showStat();
      }
    }
    btn.addEventListener("click", () => {
      if (running) { stop(); return; }
      running = true; breaths = 0; t0 = Date.now(); token++;
      btn.textContent = L("Stop", "Berhenti"); showStat();
      tick = setInterval(showStat, 1000);
      loop(token);
    });
    $$('input[name="breathMode"]').forEach((r) => r.addEventListener("change", () => { if (running) stop(); }));
    document.addEventListener("visibilitychange", () => { if (document.hidden && running) stop(); });
    scale(0.55, 0); idle();
    onLang(() => { if (running) stop(); else idle(); });
  }

  function initPMR() {
    const steps = () => [L("Feet & toes", "Kaki & jari kaki"), L("Calves", "Betis"), L("Thighs", "Paha"), L("Belly", "Perut"), L("Hands & arms", "Tangan & lengan"), L("Shoulders & neck", "Bahu & leher"), L("Face", "Wajah")];
    const list = $("#pmrSteps"), count = $("#pmrCount"), name = $("#pmrName"), timer = $("#pmrTimer"), msg = $("#pmrMsg"), tense = $("#pmrTense"), next = $("#pmrNext");
    let i = 0, busy = false, done = false, h = null, phaseState = "ready"; // ready | released
    const render = () => {
      const st = steps();
      list.innerHTML = st.map((s, k) => `<li class="chip" aria-selected="${done || k <= i}">${k + 1}</li>`).join("");
      count.textContent = done ? L("Finished", "Selesai") : L(`Step ${i + 1} of ${st.length}`, `Langkah ${i + 1} dari ${st.length}`);
      name.textContent = done ? L("Rest", "Istirahat") : st[i];
      next.textContent = done ? L("Start over", "Ulangi dari awal") : (i === st.length - 1 && phaseState === "released" ? L("Finish", "Selesai") : L("Next area →", "Area berikutnya →"));
      tense.textContent = phaseState === "released" ? L("Tense again", "Tegangkan lagi") : L("Tense (5 s)", "Tegangkan (5 dtk)");
      if (done) { timer.textContent = "😌"; msg.textContent = L("Lie still for a few minutes with your eyes closed, noticing the calm throughout your body.", "Berbaringlah diam beberapa menit dengan mata tertutup, rasakan ketenangan di seluruh tubuhmu."); }
      else if (!busy) {
        timer.textContent = phaseState === "released" ? "✓" : "5";
        msg.textContent = phaseState === "released" ? L("Release. Let it all go and feel the difference.", "Lepaskan. Biarkan semuanya mengendur dan rasakan bedanya.") : L("Press Tense when you're ready.", "Tekan Tegangkan saat kamu siap.");
      }
    };
    const reset = () => { clearInterval(h); i = 0; done = false; busy = false; phaseState = "ready"; tense.disabled = false; next.disabled = true; render(); };
    tense.addEventListener("click", () => {
      if (busy) return;
      busy = true; tense.disabled = true; next.disabled = true;
      let s = 5; timer.textContent = s; msg.textContent = L("Tense the muscles gently. Keep breathing.", "Tegangkan otot dengan lembut. Tetap bernapas.");
      h = setInterval(() => {
        s--; timer.textContent = Math.max(s, 0);
        if (s <= 0) { clearInterval(h); busy = false; phaseState = "released"; tense.disabled = false; next.disabled = false; render(); }
      }, 1000);
    });
    next.addEventListener("click", () => {
      if (done) { reset(); return; }
      if (i < steps().length - 1) { i++; phaseState = "ready"; next.disabled = true; render(); }
      else { done = true; tense.disabled = true; next.disabled = false; render(); }
    });
    reset(); onLang(reset);
  }

  function initHabits() {
    const groupsData = () => [
      { t: L("Morning", "Pagi"), w: L("After waking", "Setelah bangun"), i: "🌅", items: [
        ["m1", L("Wake at the same time every day", "Bangun di jam yang sama setiap hari"), L("Weekends included, to anchor your body clock.", "Termasuk akhir pekan, untuk menjangkarkan jam biologis.")],
        ["m2", L("Get 10–15 minutes of daylight", "Cari cahaya matahari 10–15 menit"), L("If the sun isn't up yet, switch on the room lights.", "Jika matahari belum terbit, nyalakan lampu ruangan.")],
        ["m3", L("Move while you're in the light", "Bergerak selagi terkena cahaya"), L("Movement gradually raises body temperature and syncs your clock.", "Gerak badan menaikkan suhu tubuh bertahap dan menyelaraskan jam biologis.")],
        ["m4", L("Eat breakfast", "Sarapan"), L("Digesting food warms the body, another sync signal.", "Mencerna makanan menghangatkan tubuh, sinyal sinkronisasi lainnya.")] ] },
      { t: L("Daytime", "Siang"), w: L("Midday", "Tengah hari"), i: "☀️", items: [
        ["d1", L("Keep naps to 20–30 minutes", "Batasi tidur siang 20–30 menit"), L("Long naps can disturb the night.", "Tidur siang yang lama bisa mengganggu malam.")],
        ["d2", L("If you can't nap, use caffeine wisely", "Jika tidak bisa tidur siang, gunakan kafein dengan bijak"), L("Keep the quantity sensible.", "Jaga jumlahnya tetap wajar.")] ] },
      { t: L("Evening", "Sore & malam"), w: L("Late afternoon to night", "Sore hingga malam"), i: "🌆", items: [
        ["e1", L("Finish exercise 2–3 hours before bed", "Selesaikan olahraga 2–3 jam sebelum tidur"), L("Exercise improves quantity, quality and continuity of sleep.", "Olahraga meningkatkan kuantitas, kualitas, dan kontinuitas tidur.")],
        ["e2", L("Eat a balanced dinner 3–4 hours before bed", "Makan malam bergizi seimbang 3–4 jam sebelum tidur"), L("So you're neither too full nor hungry.", "Agar kamu tidak terlalu kenyang atau lapar.")],
        ["e3", L("Skip alcohol", "Hindari alkohol"), L("It may speed up sleep but damages REM sleep.", "Mungkin mempercepat tidur, tetapi merusak tidur REM.")] ] },
      { t: L("Last hour", "Satu jam terakhir"), w: L("Before bed", "Sebelum tidur"), i: "🌙", items: [
        ["l1", L("Do a relaxing ritual", "Lakukan ritual relaksasi"), L("Warm shower, colouring, reading, breathwork, soft music.", "Mandi air hangat, mewarnai, membaca, breathwork, musik santai.")],
        ["l2", L("Keep the bedroom dim, cool and quiet", "Jaga kamar tetap redup, sejuk, dan tenang"), L("Minimise light and noise.", "Minimalkan cahaya dan suara.")],
        ["l3", L("Go easy on water", "Kurangi minum air"), L("So you aren't up for the bathroom at 3 AM.", "Agar tidak terbangun ke kamar mandi pukul 3 pagi.")] ] },
    ];
    const grid = $("#habitGroups");
    let total = 0;
    const update = () => {
      const state = {}; $$("input", grid).forEach((c) => { if (c.checked) state[c.dataset.id] = 1; });
      const n = Object.keys(state).length;
      $("#habitCount").textContent = L(`${n} of ${total} habits in place`, `${n} dari ${total} kebiasaan sudah dijalankan`);
      $("#habitMeter").style.width = (total ? (n / total) * 100 : 0) + "%";
      store.set("habits", state);
    };
    const build = () => {
      const groups = groupsData();
      total = groups.reduce((n, g) => n + g.items.length, 0);
      const saved = store.get("habits", {});
      grid.innerHTML = groups.map((g) =>
        `<div class="tl-col"><div class="when">${g.w}</div><h4><span aria-hidden="true">${g.i}</span> ${g.t}</h4><div class="checks">${g.items.map((it) =>
          `<label class="check"><input type="checkbox" data-id="${it[0]}" ${saved[it[0]] ? "checked" : ""}><span><b>${it[1]}</b><small>${it[2]}</small></span></label>`).join("")}</div></div>`).join("");
      update();

      const nsdr = [
        ["🧘", L("Meditation", "Meditasi"), L("Eases stress and brings back a calm mind.", "Meredakan stres dan mengembalikan ketenangan pikiran.")],
        ["💪", L("Progressive muscle relaxation", "Relaksasi otot progresif"), L("Releases tension held in the body.", "Melepaskan ketegangan yang tersimpan di tubuh.")],
        ["😴", L("20–30 minute power nap", "Power nap 20–30 menit"), L("Quick recovery of energy and thinking power.", "Memulihkan energi dan daya pikir dengan cepat.")],
        ["🌬️", "Breathwork", L("Reduces stress and increases oxygen.", "Mengurangi stres dan meningkatkan oksigen.")],
        ["🖼️", L("Visualisation", "Visualisasi"), L("Moves the mind away from stress and relaxes body and mind.", "Mengalihkan pikiran dari stres dan merelaksasi tubuh serta pikiran.")],
      ];
      $("#nsdrGrid").innerHTML = nsdr.map((n) => `<div class="card"><span class="ico" aria-hidden="true">${n[0]}</span><h4>${n[1]}</h4><p class="muted small">${n[2]}</p></div>`).join("");
    };
    grid.addEventListener("change", update);
    $("#habitReset").addEventListener("click", () => { $$("input", grid).forEach((c) => (c.checked = false)); update(); });
    build(); onLang(build);
  }

  /* ---------- Chapter 5 ---------- */
  function initBedroom() {
    /* oasis checklist */
    const list = $("#oasisList");
    const oasisItems = () => [
      ["light", L("Soft, dim lighting", "Pencahayaan lembut dan redup"), L("Warm lamps help the eyes relax; blackout curtains keep outside light out.", "Lampu hangat membantu mata rileks; tirai gelap menahan cahaya luar.")],
      ["comfort", L("Physical comfort", "Kenyamanan fisik"), L("A supportive mattress and pillow, and soft, breathable sheets that absorb sweat.", "Kasur dan bantal yang menopang, serta seprai lembut yang menyerap keringat.")],
      ["sound", L("A calm soundscape", "Suasana suara yang tenang"), L("White noise or nature sounds, or earplugs, to mask outside noise.", "White noise atau suara alam, atau penyumbat telinga, untuk meredam bising luar.")],
      ["air", L("Fresh, clean air", "Udara segar dan bersih"), L("Good ventilation; consider an air purifier or humidifier if it's polluted or dry.", "Ventilasi baik; pertimbangkan air purifier atau humidifier jika udara berpolusi atau kering.")],
      ["scent", L("Gentle aroma", "Aroma lembut"), L("Lavender, chamomile or cedarwood. Choose one you like that doesn't trigger allergies.", "Lavender, chamomile, atau cedarwood. Pilih yang kamu suka dan tidak memicu alergi.")],
      ["look", L("A calming look", "Tampilan yang menenangkan"), L("Soft neutral colours (blue, green, grey, lavender, beige, cream, peach) and less clutter.", "Warna netral lembut (biru, hijau, abu-abu, lavender, beige, krem, peach) dan tidak berantakan.")],
      ["temp", L("Cool temperature", "Suhu sejuk"), L("Around 18–22 °C, with bedding thickness to match.", "Sekitar 18–22 °C, dengan ketebalan selimut yang sesuai.")],
    ];
    const oasisUpdate = () => {
      const total = 7;
      const st = {}; $$("input", list).forEach((c) => { if (c.checked) st[c.dataset.id] = 1; });
      const n = Object.keys(st).length, pct = Math.round((n / total) * 100);
      $("#oasisRing").style.setProperty("--p", pct);
      $("#oasisPct").textContent = pct + "%";
      $("#oasisMsg").textContent = n === total ? L("Your bedroom is a full sensory oasis. Enjoy.", "Kamarmu sudah jadi sensory oasis penuh. Nikmati.")
        : n === 0 ? L("Tick what your bedroom already has. Saved on this device only.", "Centang yang sudah ada di kamarmu. Disimpan hanya di perangkat ini.")
        : L(`${total - n} more to go. Start with the easiest win.`, `Tinggal ${total - n} lagi. Mulai dari yang paling mudah.`);
      store.set("oasis", st);
    };
    const buildOasis = () => {
      const saved = store.get("oasis", {});
      list.innerHTML = oasisItems().map((it) => `<li><label class="check"><input type="checkbox" data-id="${it[0]}" ${saved[it[0]] ? "checked" : ""}><span><b>${it[1]}</b><small>${it[2]}</small></span></label></li>`).join("");
      oasisUpdate();
    };
    list.addEventListener("change", oasisUpdate);

    /* temperature */
    const r = $("#tempRange"), tout = $("#tempOut"), tmsg = $("#tempMsg");
    const temp = () => {
      const v = +r.value; tout.textContent = v + " °C";
      tmsg.innerHTML = v < 18 ? `<span class="pill warn">${L("Cooler than ideal", "Lebih dingin dari ideal")}</span> ${L("Add a blanket layer if you feel chilly.", "Tambahkan lapisan selimut jika kamu kedinginan.")}`
        : v <= 22 ? `<span class="pill good">${L("In the sweet spot", "Di rentang ideal")}</span> ${L("This range suits most sleepers.", "Rentang ini cocok untuk kebanyakan orang.")}`
        : `<span class="pill bad">${L("Warmer than ideal", "Lebih panas dari ideal")}</span> ${L("Heat means more sweating and broken sleep. Try a fan, lighter sheets or a cooling pillow cover.", "Panas berarti lebih banyak berkeringat dan tidur terputus. Coba kipas, seprai lebih tipis, atau sarung bantal pendingin.")}`;
    };
    r.addEventListener("input", temp);

    /* positions */
    const buildPos = () => {
      const split = (title, pros, cons, pillowSize, pillowText) => `<div class="split"><div><h3>${title}</h3><p><strong>${L("Pros", "Kelebihan")}</strong></p>${ul(pros)}<p><strong>${L("Cons", "Kekurangan")}</strong></p>${ul(cons)}</div><div class="card" style="background:var(--bg)"><h4>${L("Pillow", "Bantal")}</h4><p class="big">${pillowSize}</p><p class="muted">${pillowText}</p></div></div>`;
      buildTabs($("#posTabs"), [
        { label: L("On your back", "Telentang"), html: lang === "id"
          ? split("Tidur telentang", ["Menjaga tulang belakang dan leher tetap netral, menurunkan risiko nyeri punggung dan leher.", "Wajah tidak menempel bantal: lebih sedikit kerutan dan jerawat."], ["Bisa menambah mengorok jika ada masalah saluran napas."], "7,5–12,5 cm", "Ketebalan sedang dengan kekerasan <strong>medium</strong> untuk menopang kepala dan leher.")
          : split("Back sleeper", ["Keeps spine and neck neutral, lowering back and neck pain risk.", "Face doesn't touch the pillow: fewer wrinkles and less acne."], ["May increase snoring if you have airway issues."], "7.5–12.5 cm", "Medium thickness and <strong>medium</strong> firmness to support head and neck.") },
        { label: L("On your side", "Menyamping"), html: lang === "id"
          ? split("Tidur menyamping", ["Menghadap kiri dapat mengurangi mengorok dan asam lambung (GERD).", "Posisi janin nyaman saat hamil."], ["Berpotensi nyeri bahu dan pinggul.", "Wajah yang menempel bantal bisa menimbulkan kerutan.", "Badan terlalu melengkung bisa membatasi napas dan menekan sendi, kurang baik bagi penderita artritis atau nyeri punggung."], "12,5–15 cm", "<strong>Firm</strong> agar kepala sejajar dengan tulang belakang dan mencegah nyeri leher serta sakit kepala.")
          : split("Side sleeper", ["Facing left can reduce snoring and acid reflux (GERD).", "The fetal position is comfortable in pregnancy."], ["Possible shoulder and hip pain.", "Face against the pillow can cause wrinkles.", "A very curled posture can restrict breathing and strain joints, which is worse with arthritis or back pain."], "12.5–15 cm", "<strong>Firm</strong> to keep your head level with your spine and prevent neck pain and headaches.") },
        { label: L("On your stomach", "Tengkurap"), html: lang === "id"
          ? split("Tidur tengkurap", ["Mungkin mengurangi mengorok."], ["Tidak direkomendasikan: menekan tulang belakang dan menyebabkan nyeri leher serta punggung.", "Kepala menoleh ke satu sisi berjam-jam membuat leher tegang."], "&lt; 7,6 cm", "<strong>Soft</strong> dan tipis, atau tanpa bantal, untuk mencegah nyeri leher.")
          : split("Stomach sleeper", ["May reduce snoring."], ["Not recommended: it presses on the spine and causes neck and back pain.", "Hours with your head turned to one side strains the neck."], "&lt; 7.6 cm", "<strong>Soft</strong> and thin, or no pillow at all, to prevent neck pain.") },
        { label: L("Which is best?", "Mana yang terbaik?"), html: `<h3>${L("None.", "Tidak ada.")}</h3><p class="muted">${L(
          "There's no single best position for everyone. What matters: your position supports spine and neck and doesn't block breathing. If you have back pain, digestive issues or a sleep disorder, an expert may suggest a specific one. Make sure your mattress and pillow support the position you naturally take.",
          "Tidak ada satu posisi terbaik untuk semua orang. Yang penting: posisimu menopang tulang belakang dan leher serta tidak menghalangi napas. Jika kamu punya nyeri punggung, masalah pencernaan, atau gangguan tidur, ahli mungkin menyarankan posisi tertentu. Pastikan kasur dan bantalmu menopang posisi yang biasa kamu ambil.")}</p><div class="callout info" style="margin-bottom:0"><strong>${L("Waking up uncomfortable?", "Bangun dengan tidak nyaman?")}</strong><p>${L("Evaluate your mattress and pillow first. That's much easier than changing your position while asleep.", "Evaluasi kasur dan bantalmu dulu. Itu jauh lebih mudah daripada mengubah posisi saat tidur.")}</p></div>` },
      ], "pos");
    };

    /* mattresses */
    const chips = $("#mattChips"), mo = $("#mattOut");
    let mcur = 2;
    const matts = () => [
      { n: L("Kapok", "Kapuk"), life: L("5–10 years", "5–10 tahun"), pos: L("Any position", "Semua posisi"), price: L("Economical", "Ekonomis"), pro: L("Natural, light and affordable.", "Alami, ringan, dan terjangkau."), con: L("Absorbs moisture, can lose shape and is less comfortable for the back.", "Menyerap kelembapan, bisa kehilangan bentuk, dan kurang nyaman untuk punggung.") },
      { n: L("Inner spring", "Inner spring"), life: L("7–10 years", "7–10 tahun"), pos: L("Back sleepers", "Tidur telentang"), price: L("Varied (mid to premium)", "Variatif (menengah ke atas)"), pro: L("Good airflow and many firmness options.", "Sirkulasi udara baik dan banyak pilihan kekerasan."), con: L("Springs can sag or break, making it uncomfortable.", "Pegas bisa melorot atau rusak sehingga tidak nyaman.") },
      { n: L("Pocket spring", "Pocket spring"), life: L("8–12 years", "8–12 tahun"), pos: L("Any position", "Semua posisi"), price: L("Premium", "Premium"), pro: L("Quiet, supports the spine, absorbs partner movement and is hypoallergenic.", "Tidak berisik, menopang tulang belakang, meredam gerakan pasangan, dan hipoalergenik."), con: L("Costs more than regular spring.", "Lebih mahal daripada pegas biasa.") },
      { n: "Memory foam", life: L("8–10 years", "8–10 tahun"), pos: L("Back and side sleepers", "Telentang dan menyamping"), price: L("Varied but premium", "Variatif tapi premium"), pro: L("Contours to the body, supports posture and eases shoulder and hip pain.", "Mengikuti bentuk tubuh, menopang postur, dan meredakan nyeri bahu serta pinggul."), con: L("Less airflow, so it can feel hot.", "Sirkulasi udara kurang, sehingga bisa terasa panas.") },
      { n: "Latex", life: L("10–15 years", "10–15 tahun"), pos: L("Any position", "Semua posisi"), price: L("Premium", "Premium"), pro: L("Elastic, supportive, very durable and resists dust mites (hypoallergenic).", "Elastis, menopang, sangat tahan lama, dan tahan tungau debu (hipoalergenik)."), con: L("Heavy and expensive.", "Berat dan mahal.") },
      { n: "Hybrid", life: L("8–12 years", "8–12 tahun"), pos: L("Any position", "Semua posisi"), price: L("Premium", "Premium"), pro: L("Combines the strengths of several types, and is hypoallergenic.", "Menggabungkan kelebihan beberapa jenis, dan hipoalergenik."), con: L("Expensive.", "Mahal.") },
    ];
    const showM = () => {
      const list = matts(), m = list[mcur];
      chips.setAttribute("aria-label", L("Mattress types", "Jenis kasur"));
      chips.innerHTML = list.map((x, i) => `<button type="button" class="chip" aria-pressed="${i === mcur}" data-i="${i}">${x.n}</button>`).join("");
      mo.innerHTML = `<div class="grid g4"><div class="card" style="background:var(--bg)"><div class="muted small">${L("Typical lifespan", "Perkiraan usia pakai")}</div><div class="big">${m.life}</div></div><div class="card" style="background:var(--bg)"><div class="muted small">${L("Suits", "Cocok untuk")}</div><h4 style="margin:4px 0 0">${m.pos}</h4></div><div class="card" style="background:var(--bg)"><div class="muted small">${L("Price", "Harga")}</div><h4 style="margin:4px 0 0">${m.price}</h4></div></div>` +
        `<div class="grid g2" style="margin-top:14px"><div class="callout good" style="margin:0"><strong>${L("Pros", "Kelebihan")}</strong><p>${m.pro}</p></div><div class="callout" style="margin:0"><strong>${L("Watch out for", "Perlu diperhatikan")}</strong><p>${m.con}</p></div></div><p class="muted small" style="margin:12px 0 0">${L("General guide only; real specs vary by brand.", "Hanya panduan umum; spesifikasi sebenarnya berbeda tiap merek.")}</p>`;
    };
    chips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) { mcur = +b.dataset.i; showM(); } });

    /* blanket */
    const kg = $("#blanketKg"), bo = $("#blanketOut");
    const blanket = () => { const v = parseFloat(kg.value); bo.textContent = v > 0 ? num(Math.round(v * 0.1 * 10) / 10) + " kg" : "—"; };
    kg.addEventListener("input", blanket);

    const all = () => { buildOasis(); temp(); buildPos(); showM(); blanket(); };
    all(); onLang(all);
  }

  /* ---------- Chapter 6 ---------- */
  function initProblems() {
    const chips = $("#probChips"), grid = $("#probGrid"), search = $("#probSearch");
    let cat = "all";
    const cats = () => [["all", L("All", "Semua")], ["breath", L("Breathing", "Pernapasan")], ["night", L("During the night", "Saat tidur malam")], ["comfort", L("Comfort & partners", "Kenyamanan & pasangan")], ["day", L("Daytime", "Siang hari")]];
    const P = () => lang === "id" ? [
      { c: "day", t: "Microsleep", s: "Blackout beberapa detik saat kamu kelelahan.",
        what: "Momen singkat, beberapa detik hingga sekitar setengah menit, ketika kamu tertidur tanpa sadar, sering kali saat berusaha tetap terjaga.",
        why: ["Sangat lelah tetapi memaksakan diri tetap terjaga"], help: ["Tidur cukup setiap malam.", "Jika mengantuk saat melakukan hal penting atau berbahaya, berhenti dan istirahat."], see: "Berbahaya saat mengemudi atau mengerjakan tugas yang butuh fokus penuh. Kamu tidak sadar akan sekelilingmu." },
      { c: "breath", t: "Mengorok", s: "Jaringan di belakang tenggorokan bergetar.",
        what: "Suara dari getaran jaringan lunak saat udara melewatinya. Sekitar 40% pria dewasa dan 24% wanita dewasa mengorok; lebih sering pada BMI di atas 25 dan saat tidur telentang.",
        why: ["Amandel besar atau rahang kecil", "Kelebihan berat badan, terutama di sekitar tenggorokan", "Tidur buruk atau tidak teratur", "Alkohol menjelang tidur dan merokok", "Alergi atau iritan seperti asap dan polusi", "Bantal terlalu tinggi atau rendah"],
        help: ["Gaya hidup: turunkan berat badan berlebih, batasi alkohol, kurangi atau berhenti merokok.", "Medis: alat CPAP atau operasi jika gaya hidup belum cukup.", "Penunjang: ganti bantal atau posisi, humidifier atau air purifier, nasal strip."], see: "Mengorok keras disertai lelah berat padahal sudah tidur semalaman bisa menandakan sleep apnea." },
      { c: "breath", t: "Mouth taping", s: "Apakah menutup mulut dengan plester membantu?",
        what: "Menutup bibir dengan plester agar bernapas lewat hidung. Napas hidung menyaring dan menghangatkan udara, dan mungkin mengurangi mengorok serta mulut atau tenggorokan kering.",
        why: ["Manfaat yang diklaim: udara lebih bersih dan hangat, serta lebih sedikit mengorok", "Namun penelitian tentang efektivitas dan keamanannya masih terbatas"],
        help: ["Konsultasikan dulu dengan tenaga kesehatan.", "Jika diizinkan, pakai plester micropore (berbahan kertas, bebas lateks, berpori). Jangan plester sembarangan.", "Tempel pada kulit bersih dan kering, ringan saja, horizontal atau vertikal, jangan menutup hidung.", "Mulai dengan memakainya 30 menit sebelum tidur."], see: "Selalu cek dulu. Klaim manfaat yang konsisten masih perlu penelitian lebih lanjut." },
      { c: "night", t: "Menggertakkan gigi (bruxism)", s: "Mengatupkan atau menggertak gigi saat tidur.",
        what: "Menggertakkan atau mengatupkan gigi tanpa sadar saat tidur (kadang juga saat stres atau fokus).",
        why: ["Stres dan cemas", "Mengorok atau sleep apnea", "Alkohol, kafein, nikotin, dan beberapa obat"],
        help: ["Kurangi stres: meditasi, breathwork, olahraga rutin.", "Kurangi kafein, alkohol, dan nikotin.", "Dokter gigi bisa membuatkan pelindung gigi untuk tidur."], see: "Jangka panjang bisa mengikis, meretakkan, atau mematahkan gigi, serta menyebabkan nyeri rahang, sakit kepala, dan nyeri telinga." },
      { c: "night", t: "Mengigau", s: "Bicara atau bergumam saat tidur.",
        what: "Disebut juga somniloquy: berbicara atau mengeluarkan suara tanpa sadar. Umum pada anak-anak maupun dewasa.",
        why: ["Stres atau cemas yang tinggi", "Kurang tidur dalam waktu lama", "Demam atau sakit", "Obat tertentu", "Genetik"],
        help: ["Perhatikan pola tidur dan stres sebelum tidur."], see: "Biasanya tidak berbahaya. Temui dokter jika mengganggu kehidupan sehari-hari." },
      { c: "night", t: "Hypnic jerk", s: "Sensasi “jatuh” dan tersentak saat hampir tertidur.",
        what: "Kontraksi otot mendadak di ambang antara bangun dan tidur. Hampir semua orang pernah mengalaminya, jadi kamu tidak sendirian.",
        why: ["Perubahan aktivitas otak saat mulai tidur", "Relaksasi otot yang ditafsirkan otak sebagai jatuh", "Kafein, kelelahan ekstrem, dan stres mungkin membuatnya lebih mungkin terjadi"],
        help: ["Tidak perlu diobati. Kurangi kafein di sore hari dan rileks sebelum tidur jika mengganggu."], see: "Penyebab pastinya belum sepenuhnya dipahami; ini reaksi normal saat transisi." },
      { c: "night", t: "Kaki gelisah atau berkedut", s: "Kaki dan lengan bergetar, kesemutan, atau tersentak.",
        what: "Tiga kemungkinan: Restless Legs Syndrome (dorongan untuk menggerakkan kaki, disertai kesemutan atau nyeri ringan), kram otot (kontraksi mendadak, kadang karena kurang magnesium, kalsium, atau vitamin D), dan Periodic Limb Movement Disorder (anggota gerak bergerak sendiri, menghalangi tidur dalam).",
        why: ["Kekurangan zat besi bisa berperan pada RLS"],
        help: ["Olahraga teratur tetapi tidak intens mendekati jam tidur.", "Peregangan ringan atau pijat sebelum tidur.", "Kurangi kafein dan nikotin, terutama di malam hari.", "Periksa kadar zat besi dan sesuaikan pola makan.", "Kaos kaki kompresi atau pembalut kaki bisa meredakan RLS."], see: "Ada obat dan suplemen, tetapi tanyakan dokter terlebih dahulu." },
      { c: "night", t: "Berjalan saat tidur", s: "Bangun dan beraktivitas dalam keadaan masih tidur.",
        what: "Bangun lalu berjalan atau melakukan aktivitas tanpa sadar (somnambulisme). Terjadi di fase tidur dalam dan lebih sering pada anak-anak, meski orang dewasa juga bisa.",
        why: ["Kelelahan dan kurang tidur", "Stres dan cemas", "Kondisi kesehatan atau obat tertentu"],
        help: ["Jaga rutinitas yang konsisten dan tidur cukup.", "Rileks sebelum tidur: mandi air hangat, peregangan, breathwork, meditasi.", "Singkirkan benda di sekitar tempat tidur yang bisa menyebabkan cedera."], see: "Jangan membangunkan mendadak. Itu bisa mengagetkan, jadi arahkan pelan-pelan kembali ke tempat tidur." },
      { c: "comfort", t: "Tidur dengan pasangan", s: "Saat profil tidur kalian berbeda.",
        what: "Penulis dan istrinya berbeda: ia early bird, istrinya night owl. Jadwal yang tidak sama, mengorok, suhu, dan gerakan semuanya bisa mengurangi tidur.",
        why: ["Jam tidur berbeda (early bird vs night owl)", "Mengorok atau gangguan tidur lain", "Satu merasa panas, yang lain dingin"],
        help: ["Pahami dan hormati profil tidur masing-masing.", "Sepakati jam tidur yang fleksibel: pindah ruangan untuk aktivitas larut malam, pakai lampu baca yang redup, atau keluar kamar dengan tenang di pagi hari.", "Punya ritual bersama sebelum tidur: membaca, musik, mengobrol ringan.", "Berinvestasi pada kasur yang meredam gerakan.", "Pakai selimut terpisah jika suhu tidak cocok.", "Konsultasi ke spesialis tidur untuk mengorok; coba white noise.", "Bicarakan secara terbuka.", "Tidur terpisah kamar bisa jadi pilihan terbaik jika salah satunya sangat sensitif atau punya gangguan berat."], see: "Setiap pasangan unik. Kompromi dan komunikasi biasanya menemukan jalan." },
      { c: "comfort", t: "Baju tidur atau tanpa baju?", s: "Mau pakai apa saat tidur.",
        what: "Tidak ada jawaban mutlak; ini soal preferensi, kebiasaan, dan lingkungan. Pilih yang paling nyaman.",
        why: ["Berbaju: kenyamanan ekstra, melindungi kulit dari seprai kasar dan menghangatkan di ruangan dingin, tetapi baju ketat membatasi gerak dan beberapa jenis bisa terlalu panas.", "Tanpa baju: sirkulasi lebih lancar, suhu lebih mudah diatur di ruangan hangat, kulit bernapas, tetapi bisa kedinginan dan tidak ada lapisan pelindung dari seprai."],
        help: ["Pilih bahan yang bernapas dan menyerap keringat seperti katun.", "Hindari label yang mengganggu dan jahitan kasar.", "Pendek dan tanpa lengan saat panas; lengan panjang saat dingin.", "Jangan terlalu ketat."], see: "" },
      { c: "comfort", t: "Hewan peliharaan di tempat tidur", s: "Teman hangat, atau pencuri tidur?",
        what: "Pilihan pribadi dengan sisi baik dan buruk.",
        why: ["Kelebihan: nyaman, rasa aman, stres berkurang, kehangatan ekstra. Anjing juga punya rutinitas tidur yang konsisten, yang bisa membantu pemiliknya.", "Kekurangan: mereka bergerak, mendengkur, dan bersuara; bulu, kutu, atau bakteri bisa menyebabkan alergi atau penyakit."],
        help: ["Jika kamu tidur lebih baik bersama mereka, itu bisa jadi pilihan baik.", "Jika tidurmu terganggu atau kamu punya alergi, biarkan mereka di luar kamar."], see: "" },
    ] : [
      { c: "day", t: "Microsleep", s: "Seconds-long blackouts when you're exhausted.",
        what: "Brief moments, from a few seconds to about half a minute, when you fall asleep without realising it, often while trying to stay awake.",
        why: ["Being very tired but pushing through"], help: ["Sleep enough every night.", "If you're tired during something important or dangerous, stop and rest."], see: "It's dangerous while driving or doing tasks needing full focus. You're unaware of your surroundings." },
      { c: "breath", t: "Snoring", s: "Vibrating tissue at the back of the throat.",
        what: "Noise from soft tissue vibrating as air passes. About 40% of adult men and 24% of adult women snore; it's more common with BMI above 25 and when sleeping on your back.",
        why: ["Large tonsils or a small jaw", "Excess weight, especially around the throat", "Poor or irregular sleep", "Alcohol near bedtime and smoking", "Allergies or irritants such as smoke and pollution", "A pillow that's too high or low"],
        help: ["Lifestyle: lose excess weight, limit alcohol, cut back or quit smoking.", "Medical: CPAP device or surgery if lifestyle isn't enough.", "Supporting: change pillow or position, humidifier or air purifier, nasal strips."], see: "Loud snoring with heavy tiredness despite a full night can point to sleep apnea." },
      { c: "breath", t: "Mouth taping", s: "Does taping your mouth shut help?",
        what: "Closing the lips with tape to encourage nose breathing. Nose breathing filters and warms the air, and may reduce snoring and a dry mouth or throat.",
        why: ["Claimed benefits are cleaner, warmer air and less snoring", "But research on effectiveness and safety is still limited"],
        help: ["Talk to a health professional first.", "If approved, use micropore tape (paper-based, latex-free, porous). Don't use random tape.", "Apply to clean, dry skin, lightly, horizontally or vertically, never over the nose.", "Start by wearing it for 30 minutes before bed."], see: "Always check first. Claims of consistent benefit need more research." },
      { c: "night", t: "Teeth grinding (bruxism)", s: "Clenching or grinding while asleep.",
        what: "Unconsciously grinding or clenching teeth during sleep (and sometimes under stress or focus).",
        why: ["Stress and anxiety", "Snoring or sleep apnea", "Alcohol, caffeine, nicotine and some medicines"],
        help: ["Reduce stress: meditation, breathwork, regular exercise.", "Cut back caffeine, alcohol and nicotine.", "A dentist can make a night guard."], see: "Long term it can wear, crack or break teeth and cause jaw pain, headaches and ear pain." },
      { c: "night", t: "Sleep talking", s: "Mumbling or speaking while asleep.",
        what: "Also called somniloquy: speaking or making sounds unconsciously. Common in children and adults.",
        why: ["High stress or anxiety", "Long-term sleep deprivation", "Fever or illness", "Certain medications", "Genetics"],
        help: ["Watch your sleep pattern and pre-bed stress."], see: "Usually harmless. See a doctor if it affects daily life." },
      { c: "night", t: "Hypnic jerk", s: "The 'falling' jolt as you drift off.",
        what: "A sudden muscle contraction at the edge between wake and sleep. Nearly everyone has it at some point, and you aren't alone.",
        why: ["Brain activity shifting as you fall asleep", "Muscle relaxation that the brain reads as falling", "Caffeine, extreme tiredness and stress may make it more likely"],
        help: ["Nothing to treat. Cut late caffeine and wind down if it bothers you."], see: "The exact cause isn't fully understood; it's a normal transition reaction." },
      { c: "night", t: "Restless or twitchy legs", s: "Shaking, tingling or jerking legs and arms.",
        what: "Three possibilities: Restless Legs Syndrome (an urge to move, with tingling or mild pain), muscle cramps (sudden contractions, sometimes from low magnesium, calcium or vitamin D) and Periodic Limb Movement Disorder (limbs moving by themselves, keeping you out of deep sleep).",
        why: ["Low iron can be involved in RLS"],
        help: ["Exercise regularly but not intensely close to bedtime.", "Light stretching or massage before bed.", "Cut caffeine and nicotine, especially at night.", "Check iron levels and adjust diet.", "Compression socks or wraps may ease RLS."], see: "Medication and supplements exist, but ask a doctor first." },
      { c: "night", t: "Sleepwalking", s: "Getting up and acting while still asleep.",
        what: "Rising and walking or doing activities without awareness (somnambulism). It happens in deep sleep and is more common in children, though adults can have it too.",
        why: ["Tiredness and lack of sleep", "Stress and anxiety", "Certain health conditions or medicines"],
        help: ["Keep a consistent routine and get enough sleep.", "Relax before bed: warm bath, stretching, breathwork, meditation.", "Clear the area around the bed of anything that could cause injury."], see: "Don't wake someone abruptly. It can be startling, so gently guide them back to bed." },
      { c: "comfort", t: "Sleeping with a partner", s: "When your sleep profiles differ.",
        what: "The author and his wife differ: he's an early bird, she's a night owl. Mismatched schedules, snoring, temperature and movement can all cost sleep.",
        why: ["Different sleep times (early bird vs night owl)", "Snoring or other sleep disorders", "One runs hot, the other cold"],
        help: ["Understand and respect each other's sleep profile.", "Agree on flexible bedtimes: move to another room for late activities, use a soft reading lamp, or leave quietly in the morning.", "Share a pre-bed ritual: reading, music, a gentle chat.", "Invest in a mattress that absorbs motion.", "Use separate blankets if temperature clashes.", "See a sleep specialist for snoring; try white noise.", "Talk openly about it.", "Sleeping in separate rooms can be the best option if one is very sensitive or has a severe disorder."], see: "Every couple is different. Compromise and communication usually find a way." },
      { c: "comfort", t: "Pyjamas or nothing?", s: "What to wear to bed.",
        what: "No absolute answer; it's personal preference, habit and environment. Go with what feels most comfortable.",
        why: ["Clothed: extra comfort, protects skin from rough sheets and keeps you warm in cold rooms, but tight clothes limit movement and some outfits overheat you.", "Unclothed: smoother circulation, easier temperature control in warm rooms, skin breathes, but you may get cold and lose a protective layer against the sheets."],
        help: ["Choose breathable, sweat-absorbing fabric such as cotton.", "Avoid scratchy labels and rough seams.", "Short, sleeveless in heat; long sleeves in cold.", "Don't go too tight."], see: "" },
      { c: "comfort", t: "Pets in bed", s: "Cosy company, or sleep thief?",
        what: "A personal choice with pros and cons.",
        why: ["Pros: comfort, security, less stress, extra warmth. Dogs also keep consistent sleep routines, which can help owners.", "Cons: they move, snore and make noise; fur, fleas or bacteria can cause allergies or illness."],
        help: ["If you sleep better with them, it may be a good choice.", "If your sleep is disturbed or you have allergies, keep them out of the bedroom."], see: "" },
    ];
    const build = () => {
      const data = P();
      chips.setAttribute("aria-label", L("Filter by category", "Filter menurut kategori"));
      chips.innerHTML = cats().map(([id, label]) => `<button type="button" class="chip" aria-pressed="${id === cat}" data-c="${id}">${label}</button>`).join("");
      grid.innerHTML = data.map((p) =>
        `<details class="card problem" data-c="${p.c}" data-q="${(p.t + " " + p.s + " " + p.what).toLowerCase().replace(/"/g, "")}"><summary><span><span class="pill">${cats().find((c) => c[0] === p.c)[1]}</span><br><strong>${p.t}</strong><span class="tagline">${p.s}</span></span></summary>` +
        `<div class="body"><p>${p.what}</p><div class="cols"><div><h5>${L("Why it happens", "Mengapa terjadi")}</h5><ul>${p.why.map((w) => `<li>${w}</li>`).join("")}</ul></div><div><h5>${L("What can help", "Yang bisa membantu")}</h5><ul>${p.help.map((w) => `<li>${w}</li>`).join("")}</ul></div>${p.see ? `<div><h5>${L("Good to know", "Perlu diketahui")}</h5><p class="muted small" style="margin:0">${p.see}</p></div>` : ""}</div></div></details>`).join("") +
        `<p class="empty" id="probEmpty" hidden>${L("No matches. Try a different word or category.", "Tidak ada hasil. Coba kata atau kategori lain.")}</p>`;
      filter();
    };
    const filter = () => {
      const q = search.value.trim().toLowerCase();
      let n = 0;
      $$(".problem", grid).forEach((el) => {
        const ok = (cat === "all" || el.dataset.c === cat) && (!q || el.dataset.q.includes(q));
        el.hidden = !ok; if (ok) n++;
      });
      const empty = $("#probEmpty"); if (empty) empty.hidden = n > 0;
    };
    chips.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      cat = b.dataset.c; $$(".chip", chips).forEach((c) => c.setAttribute("aria-pressed", String(c === b))); filter();
    });
    search.addEventListener("input", filter);
    build(); onLang(build);
  }

  /* ---------- boot ---------- */
  function boot() {
    try { applyStatic(); } catch (err) { console.error("[applyStatic failed]", err); }
    [initChrome, initCheck, initClock, initCycles, initDebt, initSubstances, initFoodExercise, initJetLag, initAges, initNumbers,
      initStageTabs, initBreath, initPMR, initHabits, initBedroom, initProblems].forEach((fn) => {
      try { fn(); } catch (err) { console.error("[init failed]", fn.name, err); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
