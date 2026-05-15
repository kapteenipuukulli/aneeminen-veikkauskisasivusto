const STORAGE_KEY = "mm2026-futisveikkaus-v1";
const CURRENT_USER_KEY = "mm2026-current-user-v1";

const teams = [
  "Argentiina",
  "Brasilia",
  "Englanti",
  "Espanja",
  "Ranska",
  "Saksa",
  "Portugali",
  "Alankomaat",
  "Italia",
  "Belgia",
  "Meksiko",
  "Yhdysvallat",
  "Kanada",
  "Uruguay",
  "Kolumbia",
  "Japani",
  "Marokko",
  "Senegal",
  "Etela-Korea",
  "Etela-Afrikka",
];

const demoMatches = [
  {
    id: "m1",
    stage: "Lohko A",
    home: "Meksiko",
    away: "Etela-Afrikka",
    startTime: "2026-06-11T21:00:00+03:00",
    venue: "Mexico City Stadium",
  },
  {
    id: "m2",
    stage: "Lohko A",
    home: "Etela-Korea",
    away: "Tshekki",
    startTime: "2026-06-12T05:00:00+03:00",
    venue: "Guadalajara Stadium",
  },
  {
    id: "m3",
    stage: "Lohko B",
    home: "Kanada",
    away: "Sveitsi",
    startTime: "2026-06-12T22:00:00+03:00",
    venue: "Toronto Stadium",
  },
  {
    id: "m4",
    stage: "Lohko D",
    home: "Yhdysvallat",
    away: "Paraguay",
    startTime: "2026-06-13T04:00:00+03:00",
    venue: "Los Angeles Stadium",
  },
  {
    id: "m5",
    stage: "Lohko E",
    home: "Saksa",
    away: "Japani",
    startTime: "2026-06-14T19:00:00+03:00",
    venue: "New York New Jersey Stadium",
  },
  {
    id: "m6",
    stage: "Lohko F",
    home: "Brasilia",
    away: "Marokko",
    startTime: "2026-06-15T22:00:00+03:00",
    venue: "Miami Stadium",
  },
  {
    id: "m7",
    stage: "Lohko G",
    home: "Espanja",
    away: "Uruguay",
    startTime: "2026-06-16T22:00:00+03:00",
    venue: "Dallas Stadium",
  },
  {
    id: "m8",
    stage: "Lohko H",
    home: "Ranska",
    away: "Senegal",
    startTime: "2026-06-17T22:00:00+03:00",
    venue: "Kansas City Stadium",
  },
];

const els = {
  loginView: document.querySelector("#loginView"),
  appView: document.querySelector("#appView"),
  loginForm: document.querySelector("#loginForm"),
  nameInput: document.querySelector("#nameInput"),
  roleInput: document.querySelector("#roleInput"),
  activeUser: document.querySelector("#activeUser"),
  logoutButton: document.querySelector("#logoutButton"),
  seedButton: document.querySelector("#seedButton"),
  adminTab: document.querySelector("#adminTab"),
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll("[data-panel]"),
  championSelect: document.querySelector("#championSelect"),
  championLockText: document.querySelector("#championLockText"),
  championPoints: document.querySelector("#championPoints"),
  matchCount: document.querySelector("#matchCount"),
  matchesList: document.querySelector("#matchesList"),
  leaderboardList: document.querySelector("#leaderboardList"),
  adminList: document.querySelector("#adminList"),
  matchTemplate: document.querySelector("#matchTemplate"),
};

let state = loadState();
let currentUser = loadCurrentUser();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return createDefaultState();
}

function createDefaultState() {
  return {
    matches: demoMatches,
    users: {},
    predictions: {},
    championPicks: {},
    results: {},
    champion: "",
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadCurrentUser() {
  const saved = localStorage.getItem(CURRENT_USER_KEY);
  return saved ? JSON.parse(saved) : null;
}

function saveCurrentUser(user) {
  currentUser = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function firstMatchStart() {
  return Math.min(...state.matches.map((match) => new Date(match.startTime).getTime()));
}

function isMatchOpen(match) {
  return new Date(match.startTime).getTime() > Date.now();
}

function isChampionOpen() {
  return firstMatchStart() > Date.now();
}

function scoreForPrediction(prediction, result) {
  if (!prediction || !result) return 0;
  const ph = Number(prediction.home);
  const pa = Number(prediction.away);
  const rh = Number(result.home);
  const ra = Number(result.away);
  if ([ph, pa, rh, ra].some(Number.isNaN)) return 0;
  if (ph === rh && pa === ra) return 5;

  let points = 0;
  const predictedSign = Math.sign(ph - pa);
  const resultSign = Math.sign(rh - ra);
  if (predictedSign === resultSign) points += 2;
  if (ph - pa === rh - ra) points += 1;
  return points;
}

function scoresByUser() {
  const rows = Object.values(state.users).map((user) => {
    const matchPoints = state.matches.reduce((sum, match) => {
      const prediction = state.predictions[user.id]?.[match.id];
      const result = state.results[match.id];
      return sum + scoreForPrediction(prediction, result);
    }, 0);
    const championPoints = state.champion && state.championPicks[user.id] === state.champion ? 12 : 0;
    return {
      ...user,
      matchPoints,
      championPoints,
      total: matchPoints + championPoints,
    };
  });

  return rows.sort((a, b) => b.total - a.total || b.matchPoints - a.matchPoints || a.name.localeCompare(b.name));
}

function ensureUser(name, role) {
  const id = name.trim().toLowerCase().replace(/\s+/g, "-");
  state.users[id] = { id, name: name.trim(), role };
  state.predictions[id] ||= {};
  saveState();
  return state.users[id];
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function render() {
  if (!currentUser) {
    els.loginView.classList.remove("is-hidden");
    els.appView.classList.add("is-hidden");
    return;
  }

  els.loginView.classList.add("is-hidden");
  els.appView.classList.remove("is-hidden");
  els.activeUser.textContent = `${currentUser.name} | ${currentUser.role === "admin" ? "Admin" : "Pelaaja"}`;
  els.adminTab.classList.toggle("is-hidden", currentUser.role !== "admin");
  renderChampion();
  renderMatches();
  renderLeaderboard();
  renderAdmin();
}

function renderChampion() {
  const open = isChampionOpen();
  els.championSelect.innerHTML = [
    `<option value="">Valitse joukkue</option>`,
    ...teams.map((team) => `<option value="${team}">${team}</option>`),
  ].join("");
  els.championSelect.value = state.championPicks[currentUser.id] || "";
  els.championSelect.disabled = !open;
  els.championLockText.textContent = open
    ? `Sulkeutuu ennen avausottelua ${formatDate(firstMatchStart())}.`
    : "Mestariveikkaus on lukittu.";
  const points = state.champion && state.championPicks[currentUser.id] === state.champion ? 12 : 0;
  els.championPoints.textContent = `${points} p`;
}

function renderMatches() {
  els.matchCount.textContent = `${state.matches.length} ottelua`;
  els.matchesList.innerHTML = "";

  state.matches.forEach((match) => {
    const card = els.matchTemplate.content.firstElementChild.cloneNode(true);
    const prediction = state.predictions[currentUser.id]?.[match.id] || {};
    const result = state.results[match.id];
    const open = isMatchOpen(match);
    const points = scoreForPrediction(prediction, result);

    card.querySelector(".badge").textContent = match.stage;
    card.querySelector("time").textContent = `${formatDate(match.startTime)} | ${match.venue}`;
    card.querySelector(".home").textContent = match.home;
    card.querySelector(".away").textContent = match.away;

    const homeInput = card.querySelector(".home-score");
    const awayInput = card.querySelector(".away-score");
    homeInput.value = prediction.home ?? "";
    awayInput.value = prediction.away ?? "";
    homeInput.disabled = !open;
    awayInput.disabled = !open;

    const status = card.querySelector(".status-pill");
    status.textContent = open ? "Auki" : "Lukittu";
    status.classList.toggle("is-locked", !open);

    card.querySelector(".result-line").textContent = result
      ? `Tulos ${result.home}-${result.away}. Saat tästä ottelusta ${points} p.`
      : "Tulos puuttuu vielä.";

    [homeInput, awayInput].forEach((input) => {
      input.addEventListener("input", () => {
        state.predictions[currentUser.id][match.id] = {
          home: homeInput.value === "" ? "" : Number(homeInput.value),
          away: awayInput.value === "" ? "" : Number(awayInput.value),
        };
        saveState();
        renderLeaderboard();
      });
    });

    els.matchesList.append(card);
  });
}

function renderLeaderboard() {
  const rows = scoresByUser();
  els.leaderboardList.innerHTML = rows.length
    ? rows
        .map(
          (row, index) => `
          <article class="leaderboard-row">
            <span class="rank">${index + 1}</span>
            <div>
              <strong>${row.name}</strong>
              <p class="muted">${row.matchPoints} p otteluista | ${row.championPoints} p mestarista</p>
            </div>
            <span class="points">${row.total} p</span>
          </article>
        `,
        )
        .join("")
    : `<p class="muted">Ei pelaajia vielä.</p>`;
}

function renderAdmin() {
  if (currentUser.role !== "admin") return;
  els.adminList.innerHTML = "";

  state.matches.forEach((match) => {
    const card = els.matchTemplate.content.firstElementChild.cloneNode(true);
    const result = state.results[match.id] || {};
    card.querySelector(".badge").textContent = match.stage;
    card.querySelector("time").textContent = `${formatDate(match.startTime)} | ${match.venue}`;
    card.querySelector(".home").textContent = match.home;
    card.querySelector(".away").textContent = match.away;
    card.querySelector(".status-pill").textContent = "Tulos";
    card.querySelector(".result-line").textContent = "Adminin tallentama tulos laskee leaderboardin heti uudelleen.";

    const homeInput = card.querySelector(".home-score");
    const awayInput = card.querySelector(".away-score");
    homeInput.value = result.home ?? "";
    awayInput.value = result.away ?? "";

    [homeInput, awayInput].forEach((input) => {
      input.addEventListener("input", () => {
        if (homeInput.value === "" || awayInput.value === "") {
          delete state.results[match.id];
        } else {
          state.results[match.id] = {
            home: Number(homeInput.value),
            away: Number(awayInput.value),
          };
        }
        saveState();
        renderMatches();
        renderLeaderboard();
      });
    });

    els.adminList.append(card);
  });

  const championAdmin = document.createElement("article");
  championAdmin.className = "champion-panel";
  championAdmin.innerHTML = `
    <div>
      <p class="eyebrow">Admin</p>
      <h3>Oikea maailmanmestari</h3>
      <p>Kun mestari on selvillä, valinta antaa oikeille mestariveikkauksille 12 pistettä.</p>
    </div>
    <div class="champion-picker">
      <select aria-label="Oikea maailmanmestari">
        <option value="">Ei valittu</option>
        ${teams.map((team) => `<option value="${team}">${team}</option>`).join("")}
      </select>
    </div>
  `;
  const select = championAdmin.querySelector("select");
  select.value = state.champion;
  select.addEventListener("change", () => {
    state.champion = select.value;
    saveState();
    renderChampion();
    renderLeaderboard();
  });
  els.adminList.prepend(championAdmin);
}

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = ensureUser(els.nameInput.value, els.roleInput.value);
  saveCurrentUser(user);
  render();
});

els.logoutButton.addEventListener("click", () => {
  localStorage.removeItem(CURRENT_USER_KEY);
  currentUser = null;
  render();
});

els.seedButton.addEventListener("click", () => {
  state = createDefaultState();
  if (currentUser) {
    state.users[currentUser.id] = currentUser;
    state.predictions[currentUser.id] = {};
  }
  saveState();
  render();
});

els.championSelect.addEventListener("change", () => {
  state.championPicks[currentUser.id] = els.championSelect.value;
  saveState();
  renderChampion();
  renderLeaderboard();
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    els.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    els.panels.forEach((panel) => panel.classList.toggle("is-hidden", panel.dataset.panel !== target));
  });
});

render();
