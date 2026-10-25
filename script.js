const API_URL =
  "https://script.google.com/macros/s/AKfycbzQxjDNw3C2vtXbK9WmyXkA3EdiPVYINW6yqb6LYlDd7CWANPjwFh7wstbeY0njEuVOvQ/exec";

const BOT_API_URL =
  "https://eff-discord-bot-production.up.railway.app";

const STANDINGS_SHEET =
  "EFF S1";

const SCHEDULE_SHEET =
  "Schedule";

const PLAYOFF_UPDATE_SHEET =
  "Playoff Bracket update";

/*
==================================================
SEASON 4 DIVISIONS
==================================================

Season 3 is frozen in History. These are the live Season 4 divisions.
Each division contains 6 teams (24 teams total).
*/

const DIVISION_CONFIG = {
  colonial: {
    name: "Colonial Division",
    conference: "Atlantic",
    logo: "/assets/logos/colonial-division.png",
    teams: [
      "Baltimore Bats",
      "Atlantis Tridents",
      "Montreal Angels",
      "Boston Snowmen",
      "Philadelphia Liberties",
      "Winchester Widows"
    ]
  },
  gulf: {
    name: "Gulf Division",
    conference: "Atlantic",
    logo: "/assets/logos/gulf-division.png",
    teams: [
      "Alabama Black Bears",
      "Birmingham Bluebirds",
      "Nashville Nightmares",
      "Miami Sunshines",
      "Culican Red Devils",
      "Houston Hornets"
    ]
  },
  cascade: {
    name: "Cascade Division",
    conference: "Pacific",
    logo: "/assets/logos/cascade-division.png",
    teams: [
      "Anchorage Polar Bears",
      "Colorado Blizzards",
      "Nebraska Sabertooths",
      "Minnesota Huskies",
      "Fairbank Reindeers",
      "Rushmore Rhinos"
    ]
  },
  sunset: {
    name: "Sunset Division",
    conference: "Pacific",
    logo: "/assets/logos/sunset-division.png",
    teams: [
      "Los Angeles Tigers",
      "San Diego Cruisers",
      "Glendale Ghosts",
      "Roblox Warriors",
      "San Francisco Comets",
      "Seattle Evergreens"
    ]
  }
};

const SEASON4_SCHEDULE_READY = true;

function buildSeason4Standings(sheetRows = []) {
  const sheetMap = new Map(
    (Array.isArray(sheetRows) ? sheetRows : [])
      .filter(row => row?.Team)
      .map(row => [normalizeTeamName(row.Team), row])
  );

  return Object.values(DIVISION_CONFIG)
    .flatMap(division =>
      division.teams.map(teamName => {
        const oldRow = sheetMap.get(normalizeTeamName(teamName)) || {};
        return {
          ...oldRow,
          Conference: division.conference,
          Team: teamName,
          Logo: getTeamLogoByName(teamName, oldRow.Logo || ""),
          Rec: oldRow.Rec || "0-0",
          "Division Rec": oldRow["Division Rec"] || "0-0",
          "Conf Rec": oldRow["Conf Rec"] || "0-0",
          PF: oldRow.PF ?? 0,
          PA: oldRow.PA ?? 0,
          PD: oldRow.PD ?? 0,
          Streak: oldRow.Streak || "-"
        };
      })
    );
}

const LOCAL_TEAM_LOGOS = {
  baltimorebats: "/assets/logos/baltimore-bats.png",
  fairbankreindeers: "/assets/logos/fairbank-reindeers.png",
  winchesterwidows: "/assets/logos/winchester-widows.png",
  minnesotahuskies: "/assets/logos/minnesota-huskies.png",
  philadelphialiberties: "/assets/logos/philadelphia-liberties.png",
  rushmorerhinos: "/assets/logos/rushmore-rhinos.png",
  bostonsnowmen: "/assets/logos/boston-snowmen.png"
};

function getDivisionForTeam(teamName) {
  const target = normalizeTeamName(teamName);
  for (const division of Object.values(DIVISION_CONFIG)) {
    if (division.teams.some(team => normalizeTeamName(team) === target)) {
      return division;
    }
  }
  return null;
}

function getTeamLogoByName(teamName, sheetLogo = "") {
  const local = LOCAL_TEAM_LOGOS[normalizeTeamName(teamName)];
  return local || getDisplayImageUrl(sheetLogo || "");
}

function getTeamDisplayLogo(team) {
  return getTeamLogoByName(team?.Team, team?.Logo);
}

function divisionOrder(teamName) {
  const division = getDivisionForTeam(teamName);
  return {
    "Colonial Division": 1,
    "Gulf Division": 2,
    "Cascade Division": 1,
    "Sunset Division": 2
  }[division?.name] || 99;
}

function createDivisionHeaderRow(division) {
  if (!division) return "";
  return `
    <tr class="division-standings-row">
      <td colspan="9">
        <div class="division-standings-heading">
          <img src="${esc(division.logo)}" alt="${esc(division.name)}">
          <div>
            <span>${esc(division.conference.toUpperCase())}</span>
            <strong>${esc(division.name)}</strong>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function createDivisionGridHeading(division) {
  return `
    <div class="division-team-heading">
      <img src="${esc(division.logo)}" alt="${esc(division.name)}">
      <div>
        <span>${esc(division.conference.toUpperCase())}</span>
        <h4>${esc(division.name)}</h4>
        <p>${esc(division.teams.join(" · "))}</p>
      </div>
    </div>
  `;
}


const STAT_SHEETS = [
  "quarterback",
  "runningback",
  "center",
  "tight end",
  "wide receiver",
  "defensive end",
  "defensive back",
  "kicker"
];


/*
==================================================
PAGE NAVIGATION
==================================================
*/

const pages =
  document.querySelectorAll(".page");

const navLinks =
  document.querySelectorAll(".nav-link");

const year =
  document.getElementById("currentYear");


function showPage(pageId) {

  pages.forEach((page) => {
    page.classList.remove("active-page");
    page.hidden = true;
  });


  const selected =
    document.getElementById(pageId);


  if (!selected) {
    return;
  }


  selected.hidden = false;
  selected.classList.add("active-page");


  navLinks.forEach((link) => {

    link.classList.toggle(
      "active",
      link.dataset.page === pageId
    );

  });


  history.replaceState(
    null,
    "",
    `#${pageId}`
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


navLinks.forEach((link) => {

  link.addEventListener(
    "click",
    () => showPage(link.dataset.page)
  );

});


document
  .querySelectorAll("[data-go]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => showPage(button.dataset.go)
    );

  });


if (year) {
  year.textContent =
    new Date().getFullYear();
}


const hashPage =
  location.hash.replace("#", "");


if (
  hashPage &&
  document.getElementById(hashPage)
) {

  showPage(hashPage);

}


/*
==================================================
GLOBAL DATA
==================================================
*/


const EFF_PLAYER_CACHE_KEY =
  "eff:last-good-player-data:v1";

const EFF_ROBLOX_CACHE_PREFIX =
  "eff:roblox-picture:v1:";

function readBrowserJson(key, fallback = null) {
  try {
    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}

function writeBrowserJson(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    // Browser storage may be blocked; the live API still works.
  }
}

let leagueData = null;

let allTimeData = null;

let currentStatsMode = "season";

let discordPlayers = [];

let activeFranchiseNames = null;

async function getActiveFranchiseNames(
  forceRefresh = false
) {
  if (
    activeFranchiseNames &&
    !forceRefresh
  ) {
    return activeFranchiseNames;
  }

  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        5000
      );

    let response;

    try {
      response =
        await fetch(
          `${BOT_API_URL}/api/franchises`,
          {
            method: "GET",
            cache: "no-store",
            signal:
              controller.signal
          }
        );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(
        `Franchise API HTTP error: ${response.status}`
      );
    }

    const result =
      await response.json();

    const names =
      Array.isArray(
        result?.franchises
      )
        ? result.franchises
            .map(
              franchise =>
                normalizeTeamName(
                  franchise?.name
                )
            )
            .filter(Boolean)
        : [];

    if (names.length) {
      activeFranchiseNames =
        new Set(names);
    }

  } catch (error) {
    console.warn(
      "Active franchise list unavailable; using Google Sheet teams:",
      error
    );
  }

  return activeFranchiseNames;
}


function isActiveFranchise(
  teamName
) {
  // The standings sheet is the website's source of truth for active teams.
  // If a team exists on the sheet, show it on Standings, Teams, Home, and Playoffs.
  return Boolean(
    normalizeTeamName(
      teamName
    )
  );
}

let discordPlayersLoadedAt = 0;
const DISCORD_PLAYERS_CACHE_MS = 60 * 1000;

let discordPlayerLookup = new Map();

let discordIdentityWarmComplete = false;
let discordIdentityMappedCount = 0;
let statsIdentityPollRunning = false;

let activeStatsRows = [];

let activeStatsHeaders = [];

let activeStatsSortHeader = "PTS";

let activeStatsSortDirection = "desc";

let activeStatSheetName = "";

let activeRawStatRows = [];


/*
==================================================
FETCH GOOGLE SHEET DATA
==================================================
*/

async function getLeagueData() {

  if (leagueData) {
    return leagueData;
  }


  const response =
    await fetch(
      `${API_URL}?cacheBust=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `EFF API HTTP error: ${response.status}`
    );

  }


  const result =
    await response.json();


  if (!result.success) {

    throw new Error(
      result.error ||
      "EFF API returned an error."
    );

  }


  leagueData =
    result.data;


  return leagueData;

}




async function getAllTimeData(forceRefresh = false) {

  if (
    allTimeData &&
    !forceRefresh
  ) {
    return allTimeData;
  }

  const response =
    await fetch(
      `${API_URL}?source=alltime&cacheBust=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store"
      }
    );

  if (!response.ok) {
    throw new Error(
      `All Time API HTTP error: ${response.status}`
    );
  }

  const result =
    await response.json();

  if (!result.success) {
    throw new Error(
      result.error ||
      "All Time API returned an error."
    );
  }

  allTimeData =
    result.data;

  return allTimeData;
}


async function getStatsSourceData(
  mode = currentStatsMode,
  forceRefresh = false
) {

  if (mode === "alltime") {
    return getAllTimeData(
      forceRefresh
    );
  }

  if (forceRefresh) {
    leagueData = null;
  }

  return getLeagueData();
}

/*
==================================================
FETCH DISCORD / ROBLOX PLAYER DATA
==================================================
*/

async function getDiscordPlayers(forceRefresh = false) {

  if (
    discordPlayers.length &&
    !forceRefresh
  ) {
    return discordPlayers;
  }

  const cachedResult =
    readBrowserJson(
      EFF_PLAYER_CACHE_KEY,
      null
    );

  // Use last-known-good data immediately when this is the first load.
  if (
    !discordPlayers.length &&
    Array.isArray(cachedResult?.players) &&
    cachedResult.players.length
  ) {
    discordPlayers =
      cachedResult.players;

    discordIdentityWarmComplete =
      Boolean(
        cachedResult.identityWarmComplete
      );

    discordIdentityMappedCount =
      Number(
        cachedResult.identityMappedCount || 0
      );

    buildDiscordPlayerLookup();
  }

  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        5000
      );

    let response;

    try {
      response =
        await fetch(
          `${BOT_API_URL}/api/players${forceRefresh ? "?refresh=1" : ""}`,
          {
            method: "GET",
            cache: "no-store",
            signal:
              controller.signal
          }
        );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(
        `EFF Bot API HTTP error: ${response.status}`
      );
    }

    const result =
      await response.json();

    if (!result.success) {
      throw new Error(
        result.error ||
        "EFF Bot API returned an error."
      );
    }

    const livePlayers =
      Array.isArray(result.players)
        ? result.players
        : [];

    // Do not replace useful cached data with an accidental empty response.
    if (livePlayers.length) {
      discordPlayers =
        livePlayers;

      discordIdentityWarmComplete =
        Boolean(
          result.identityWarmComplete ??
          true
        );

      discordIdentityMappedCount =
        Number(
          result.identityMappedCount ||
          livePlayers.length
        );

      writeBrowserJson(
        EFF_PLAYER_CACHE_KEY,
        {
          savedAt:
            Date.now(),

          players:
            discordPlayers,

          identityWarmComplete:
            discordIdentityWarmComplete,

          identityMappedCount:
            discordIdentityMappedCount
        }
      );

      buildDiscordPlayerLookup();
    }

    return discordPlayers;

  } catch (error) {

    console.warn(
      "EFF Bot live player data unavailable; using last-known-good browser cache:",
      error
    );

    // Keep the last successful data instead of changing TM/avatars/rosters to dashes.
    if (discordPlayers.length) {
      buildDiscordPlayerLookup();
      return discordPlayers;
    }

    if (
      Array.isArray(cachedResult?.players)
    ) {
      discordPlayers =
        cachedResult.players;

      buildDiscordPlayerLookup();

      return discordPlayers;
    }

    return [];
  }
}

async function refreshStatsIdentityUntilReady() {

  if (
    statsIdentityPollRunning ||
    discordIdentityWarmComplete
  ) {
    return;
  }

  statsIdentityPollRunning = true;

  try {
    const maxAttempts = 15;

    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt += 1
    ) {

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 2500)
      );

      try {
        await getDiscordPlayers(true);
      } catch (error) {
        console.warn(
          "Stats identity refresh failed:",
          error
        );
        continue;
      }

      if (
        activeStatSheetName &&
        Array.isArray(activeRawStatRows)
      ) {
        renderStatSheet(
          activeStatSheetName,
          activeRawStatRows,
          true
        );
      }

      if (discordIdentityWarmComplete) {
        break;
      }
    }
  } finally {
    statsIdentityPollRunning = false;
  }
}


function buildDiscordPlayerLookup() {

  discordPlayerLookup =
    new Map();

  discordPlayers.forEach(
    (player) => {

      const names = [
        player.discordUsername,
        player.discordGlobalName,
        player.discordDisplayName,
        player.robloxUsername,
        player.robloxDisplayName,
        ...(Array.isArray(player.lookupNames)
          ? player.lookupNames
          : [])
      ];

      names
        .filter(Boolean)
        .forEach(
          (name) => {

            const key =
              normalizePlayerName(name);

            if (
              key &&
              !discordPlayerLookup.has(key)
            ) {
              discordPlayerLookup.set(
                key,
                player
              );
            }
          }
        );
    }
  );
}


function normalizePlayerName(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "");
}


function findDiscordPlayerByLooseName(
  value
) {

  const target =
    normalizePlayerName(value);

  if (!target) {
    return null;
  }


  const exact =
    discordPlayerLookup.get(
      target
    );

  if (exact) {
    return exact;
  }


  /*
    Fallback for Discord display names that may contain
    decorations/spaces around the actual Roblox username.
    Only return a loose match when it is unique.
  */

  if (target.length < 4) {
    return null;
  }


  const matches = [];

  for (
    const [lookupName, player] of
    discordPlayerLookup.entries()
  ) {

    if (
      lookupName.length >= 4 &&
      (
        lookupName.includes(target) ||
        target.includes(lookupName)
      )
    ) {

      if (!matches.includes(player)) {
        matches.push(player);
      }

    }

  }


  return matches.length === 1
    ? matches[0]
    : null;
}


function findDiscordPlayerForStatRow(
  row,
  headers
) {

  const preferredHeaders = [
    "username",
    "player",
    "name"
  ];

  for (
    const preferred of
    preferredHeaders
  ) {

    const actualHeader =
      headers.find(
        (header) =>
          normalize(header) ===
          preferred
      );

    if (!actualHeader) {
      continue;
    }

    const value =
      row[actualHeader];

    const match =
      findDiscordPlayerByLooseName(
        value
      );

    if (match) {
      return match;
    }
  }

  /*
    Fallback: try every text value in the row.
    This helps if a position sheet uses a slightly
    different label for the username column.
  */

  for (
    const value of
    Object.values(row)
  ) {

    const key =
      normalizePlayerName(value);

    if (key) {

      const match =
        findDiscordPlayerByLooseName(
          value
        );

      if (match) {
        return match;
      }

    }
  }

  return null;
}


const directRobloxPictureCache =
  new Map();

const directRobloxPicturePromiseCache =
  new Map();


/*
==================================================
ROBLOX PROFILE OVERRIDES
==================================================

If a stat username does not match a Roblox username, add it here once.
Example:
  "discordname": "ActualRobloxUsername"
*/
const ROBLOX_USERNAME_OVERRIDES = {
};


function getRobloxUsernameOverride(value) {
  return ROBLOX_USERNAME_OVERRIDES[
    normalizePlayerName(value)
  ] || "";
}


/*
==================================================
SEASON 1 HISTORICAL TEAM LOGOS
==================================================

These are intentionally FIXED historical assignments.
They do NOT use a player's current Discord team role.
*/

const SEASON_1_HISTORICAL_TEAMS = {
  "vanishallindark": "Atlantis Tridents",
  "lwkvbm": "Atlantis Tridents",
  "imjacobjab": "Atlantis Tridents",
  "thebacon_1335": "Miami Sunshines",
  "lfg_twisty": "Miami Sunshines",
  "donteheck": "Miami Sunshines",
  "v_kin043": "Atlantis Tridents",
  "kipen": "Miami Sunshines",
  "hacr": "Los Angeles Tigers",
  "dihmercyys": "Roblox Warriors",
  "sl0tmxde": "Nebraska Sabertooths",
  "loby": "Nebraska Sabertooths",
  "graveyarrddd": "Glendale Ghosts",
  "vloxcus": "Los Angeles Tigers",
  "ceptco": "Houston Hornets",
  "lminsane1v1meb": "Colorado Blizzards",
  "par1henope": "Atlantis Tridents",
  "mqtw2911": "Atlantis Tridents"
};


/*
==================================================
SEASON 2 HISTORICAL TEAM LOGOS
==================================================
*/

const SEASON_2_HISTORICAL_TEAMS = {
  "dequaviusiv": "Miami Sunshines",
  "l85wru": "Atlantis Tridents",
  "fpny": "Baltimore Bats",
  "sxqrafice": "Miami Sunshines",
  "mkisdaddy": "Colorado Blizzards",
  "cheese_qb11": "Miami Sunshines",
  "zay_thereal": "Miami Sunshines",
  "landenistheone1": "Colorado Blizzards",
  "imafreeballer": "Miami Sunshines",
  "dominater22610": "Seattle Evergreens",
  "hacr": "Los Angeles Tigers",
  "luvyourz_j": "Seattle Evergreens",
  "thebestfoxingame": "Glendale Ghosts",
  "boomboomyay432": "Seattle Evergreens",
  "m": "Los Angeles Tigers",
  "ninjasboost78": "Seattle Evergreens",
  "pjritter89": "Roblox Warriors",
  "kpoopmj": "Anchorage Polar Bears",
  "cfbx": "Houston Hornets"
};


/*
==================================================
SEASON 3 HISTORICAL TEAM LOGOS
==================================================

These assignments are LOCKED to the team the player
earned the Season 3 standout/award/All-League honor with.
Do not replace these with the player's current Discord team.
*/

const SEASON_3_HISTORICAL_TEAMS = {
  "diego_pavia": "Baltimore Bats",
  "noturaverageaaupg": "Montreal Angels",
  "intechill": "Baltimore Bats",
  "kelluro": "Montreal Angels",
  "itzdayday14": "Montreal Angels",
  "2_7ts": "Montreal Angels",
  "cooldariel2021": "Baltimore Bats",
  "motionachiever": "Baltimore Bats",
  "austinisdad846": "Culican Red Devils",
  "antfurious": "Culican Red Devils",
  "ak47tyw": "Culican Red Devils",
  "foilowingmyheart": "Birmingham Bluebirds",
  "4lozer": "Alabama Black Bears",
  "v1pzs": "Culican Red Devils",
  "thebacon_1335": "Birmingham Bluebirds",
  "ga_t": "San Francisco Comets",
  "dominater22610": "Seattle Evergreens",
  "rvf": "San Francisco Comets",
  "boomboomyay432": "Seattle Evergreens",
  "mushywakawaka4": "Seattle Evergreens",
  "sinsforg1ven": "Seattle Evergreens",
  "catsareawesome20234": "Seattle Evergreens",
  "dxmdxmdxmdxmdxm": "San Francisco Comets",
  "kajan": "San Francisco Comets",
  "phantomb819": "Roblox Warriors",
  "zxc7": "Los Angeles Tigers",
  "endless_suffering092": "Roblox Warriors",
  "mayo_man1234567890": "Roblox Warriors",
  "1zrha": "Houston Hornets",
  "thundershock9003": "Roblox Warriors",
  "joshallenisthegoat59": "Roblox Warriors",
  "donteheck": "Birmingham Bluebirds",
  "hacr": "Los Angeles Tigers"
};


function getHistoricalTeamName(
  playerName,
  season
) {
  const key =
    normalizePlayerName(
      playerName
    );

  if (String(season) === "3") {
    return (
      SEASON_3_HISTORICAL_TEAMS[
        key
      ] || ""
    );
  }

  if (String(season) === "2") {
    return (
      SEASON_2_HISTORICAL_TEAMS[
        key
      ] || ""
    );
  }

  return (
    SEASON_1_HISTORICAL_TEAMS[
      key
    ] || ""
  );
}


function getSeason1HistoricalTeamName(playerName) {
  return getHistoricalTeamName(
    playerName,
    1
  );
}


function getHistoricalTeamLogoFromLeagueData(teamName) {

  if (!teamName) {
    return "";
  }

  const localLogo =
    LOCAL_TEAM_LOGOS[
      normalizeTeamName(teamName)
    ];

  if (localLogo) {
    return localLogo;
  }

  if (!leagueData) {
    return "";
  }

  const standings =
    Array.isArray(leagueData[STANDINGS_SHEET])
      ? leagueData[STANDINGS_SHEET]
      : [];

  const standingTeam =
    standings.find(
      (team) =>
        teamNamesMatch(
          team.Team,
          teamName
        )
    );

  if (standingTeam?.Logo) {
    return standingTeam.Logo;
  }

  const schedule =
    Array.isArray(leagueData[SCHEDULE_SHEET])
      ? leagueData[SCHEDULE_SHEET]
      : [];

  for (const game of schedule) {
    if (
      teamNamesMatch(
        game["Away Team"],
        teamName
      ) &&
      game["Away Logo"]
    ) {
      return game["Away Logo"];
    }

    if (
      teamNamesMatch(
        game["Home Team"],
        teamName
      ) &&
      game["Home Logo"]
    ) {
      return game["Home Logo"];
    }
  }

  return "";
}


async function enhanceHistoricalSeasonLogos(
  season
) {

  try {
    await Promise.allSettled([
      getLeagueData(),
      getDiscordPlayers()
    ]);
  } catch (error) {
    console.warn(
      "Could not load historical team logos:",
      error
    );
  }

  const panel =
    document.querySelector(
      `[data-season-detail="${season}"]`
    );

  if (!panel) {
    return;
  }

  const historyRows =
    panel.querySelectorAll(
      ".award-list li"
    );

  historyRows.forEach((row) => {

    if (
      row.querySelector(
        ".history-fixed-team-logo"
      )
    ) {
      return;
    }

    const playerNode =
      row.querySelector("strong");

    if (!playerNode) {
      return;
    }

    const playerName =
      playerNode.textContent.trim();

    let historicalTeam =
      getHistoricalTeamName(
        playerName,
        season
      );

    let logo =
      getHistoricalTeamLogoFromLeagueData(
        historicalTeam
      );


    const playerWrap =
      document.createElement("span");

    playerWrap.className =
      "history-fixed-player";

    if (logo) {
      const img =
        document.createElement("img");

      img.src = getDisplayImageUrl(
        logo
      );
      img.alt = historicalTeam;
      img.title = historicalTeam;
      img.loading = "lazy";
      img.className =
        "history-fixed-team-logo";

      playerWrap.appendChild(img);
    }

    const name =
      document.createElement("strong");

    name.textContent = playerName;

    playerWrap.appendChild(name);
    playerNode.replaceWith(playerWrap);
  });
}


async function enhanceSeason1HistoricalLogos() {
  return enhanceHistoricalSeasonLogos(1);
}


async function enhanceSeason2HistoricalLogos() {
  return enhanceHistoricalSeasonLogos(2);
}



async function getDirectRobloxPicture(
  username
) {

  const clean =
    String(username ?? "")
      .trim();

  const override =
    getRobloxUsernameOverride(clean);

  const lookupName =
    override || clean;

  const key =
    normalizePlayerName(lookupName);

  if (!key) {
    return "";
  }

  if (directRobloxPictureCache.has(key)) {
    return directRobloxPictureCache.get(key);
  }

  const browserCacheKey =
    `${EFF_ROBLOX_CACHE_PREFIX}${key}`;

  const savedPicture =
    readBrowserJson(
      browserCacheKey,
      ""
    );

  if (
    typeof savedPicture === "string" &&
    savedPicture
  ) {
    directRobloxPictureCache.set(
      key,
      savedPicture
    );
  }

  if (directRobloxPicturePromiseCache.has(key)) {
    return directRobloxPicturePromiseCache.get(key);
  }

  const lookupPromise =
    (async () => {

      const maxAttempts = 2;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt += 1
      ) {

        try {
          const controller =
            new AbortController();

          const timeout =
            setTimeout(
              () => controller.abort(),
              5000
            );

          let response;

          try {
            response =
              await fetch(
                `${BOT_API_URL}/api/roblox/${encodeURIComponent(lookupName)}`,
                {
                  method: "GET",
                  cache: "no-store",
                  signal:
                    controller.signal
                }
              );
          } finally {
            clearTimeout(timeout);
          }

          if (!response.ok) {
            throw new Error(
              `Roblox proxy returned ${response.status}`
            );
          }

          const result =
            await response.json();

          const robloxData =
            result?.roblox ||
            result?.data ||
            {};

          const resolvedUsername =
            robloxData.username ||
            robloxData.name ||
            result?.robloxUsername ||
            result?.username ||
            lookupName;

          if (
            result?.success &&
            normalizePlayerName(resolvedUsername) !==
              normalizePlayerName(lookupName)
          ) {
            return (
              directRobloxPictureCache.get(key) ||
              savedPicture ||
              ""
            );
          }

          const picture =
            result?.success
              ? (
                  robloxData.picture ||
                  robloxData.avatar ||
                  robloxData.avatarUrl ||
                  robloxData.thumbnail ||
                  result?.robloxPicture ||
                  result?.picture ||
                  ""
                )
              : "";

          if (picture) {
            directRobloxPictureCache.set(
              key,
              picture
            );

            writeBrowserJson(
              browserCacheKey,
              picture
            );

            return picture;
          }

          if (attempt < maxAttempts) {
            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  250
                )
            );
          }

        } catch (error) {

          if (attempt === maxAttempts) {
            console.warn(
              "Roblox avatar lookup failed; keeping cached picture:",
              lookupName,
              error
            );

            return (
              directRobloxPictureCache.get(key) ||
              savedPicture ||
              ""
            );
          }

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                250
              )
          );
        }
      }

      return (
        directRobloxPictureCache.get(key) ||
        savedPicture ||
        ""
      );
    })();

  directRobloxPicturePromiseCache.set(
    key,
    lookupPromise
  );

  try {
    return await lookupPromise;
  } finally {
    directRobloxPicturePromiseCache.delete(key);
  }
}

async function resolveStatRowRobloxPicture(
  row,
  headers
) {

  const preferredHeaders = [
    "username",
    "player",
    "name"
  ];

  let statName = "";

  for (const preferred of preferredHeaders) {
    const actualHeader =
      headers.find(
        (header) =>
          normalize(header) === preferred
      );

    if (actualHeader) {
      statName =
        String(row?.[actualHeader] || "").trim();

      if (statName) {
        break;
      }
    }
  }

  if (!statName) {
    return "";
  }

  const discordPlayer =
    findDiscordPlayerForStatRow(
      row,
      headers
    );

  const knownPicture =
    getBestPlayerPicture(discordPlayer);

  if (knownPicture) {
    return knownPicture;
  }

  const robloxUsername =
    getRobloxUsernameForPlayer(
      discordPlayer,
      statName
    );

  return getDirectRobloxPicture(
    robloxUsername
  );
}


function getBestPlayerPicture(player) {

  return (
    player?.robloxPicture ||
    ""
  );
}


function getRobloxUsernameForPlayer(player, fallbackName = "") {

  const override =
    getRobloxUsernameOverride(fallbackName);

  return String(
    override ||
    player?.robloxUsername ||
    player?.robloxDisplayName ||
    fallbackName ||
    ""
  ).trim();
}


async function handleStatAvatarError(image, username) {

  if (!image || !username) {
    return;
  }

  const attempted =
    image.dataset.proxyAttempted === "1";

  if (attempted) {
    image.onerror = null;
    image.replaceWith(createStatsAvatarFallback(username));
    return;
  }

  image.dataset.proxyAttempted = "1";

  const directPicture =
    await getDirectRobloxPicture(username);

  if (directPicture) {
    image.src = directPicture;
    return;
  }

  image.onerror = null;
  image.replaceWith(createStatsAvatarFallback(username));
}


function createStatsAvatarFallback(username) {

  const fallback =
    document.createElement("div");

  fallback.className =
    "stat-avatar stat-avatar-fallback";

  fallback.dataset.robloxFallback =
    username;

  fallback.textContent =
    "—";

  return fallback;
}


function enhanceHistoryAwardLogos() {

  const awardItems =
    document.querySelectorAll(
      ".award-card-full .award-list li"
    );

  awardItems.forEach((item) => {

    if (item.querySelector(".history-award-logo")) {
      return;
    }

    const playerElement =
      item.querySelector("strong");

    if (!playerElement) {
      return;
    }

    const playerName =
      playerElement.textContent.trim();

    const player =
      findDiscordPlayerByLooseName(playerName);

    const logo =
      player?.teamLogo || "";

    if (!logo) {
      return;
    }

    const wrapper =
      document.createElement("span");

    wrapper.className =
      "history-award-player";

    const image =
      document.createElement("img");

    image.src = logo;
    image.alt = player?.team || "";
    image.className = "history-award-logo";
    image.loading = "lazy";

    const text =
      document.createElement("strong");

    text.textContent = playerName;

    wrapper.append(image, text);
    playerElement.replaceWith(wrapper);

  });
}


/*
==================================================
HELPERS
==================================================
*/

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();

}



function getDisplayImageUrl(
  value
) {
  const raw =
    String(value || "").trim();

  if (!raw) {
    return "";
  }

  // Google Drive normal share links:
  // https://drive.google.com/file/d/FILE_ID/view?...
  let match =
    raw.match(
      /drive\.google\.com\/file\/d\/([^/?#]+)/i
    );

  // Google Drive uc links:
  // https://drive.google.com/uc?export=view&id=FILE_ID
  if (!match) {
    match =
      raw.match(
        /[?&]id=([^&#]+)/i
      );
  }

  if (match?.[1]) {
    const fileId =
      decodeURIComponent(
        match[1]
      );

    return (
      "https://drive.google.com/thumbnail" +
      `?id=${encodeURIComponent(fileId)}` +
      "&sz=w1000"
    );
  }

  return raw;
}


function esc(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function numberFrom(value) {

  const n =
    Number(
      String(value ?? "")
        .replaceAll(",", "")
        .replace("+", "")
    );


  return Number.isNaN(n)
    ? null
    : n;

}


function parseRecord(value) {
  const match = String(value ?? "")
    .trim()
    .match(/(\d+)\s*[-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?/);

  if (!match) {
    return { wins: 0, losses: 0, ties: 0 };
  }

  return {
    wins: Number(match[1]) || 0,
    losses: Number(match[2]) || 0,
    ties: Number(match[3]) || 0
  };
}

function compareRecords(first, second) {
  const a = parseRecord(first);
  const b = parseRecord(second);

  if (a.wins !== b.wins) return b.wins - a.wins;
  if (a.losses !== b.losses) return a.losses - b.losses;
  if (a.ties !== b.ties) return b.ties - a.ties;

  return 0;
}

function sortStandings(a, b) {
  const recordCompare = compareRecords(a.Rec, b.Rec);
  if (recordCompare !== 0) return recordCompare;

  const conferenceCompare = compareRecords(a["Conf Rec"], b["Conf Rec"]);
  if (conferenceCompare !== 0) return conferenceCompare;

  const aPd = numberFrom(a.PD) ?? 0;
  const bPd = numberFrom(b.PD) ?? 0;

  if (aPd !== bPd) return bPd - aPd;

  return String(a.Team ?? "").localeCompare(String(b.Team ?? ""));
}


function pdText(value) {

  const n =
    numberFrom(value);


  if (n === null) {
    return String(value ?? "");
  }


  return n > 0
    ? `+${n}`
    : String(n);

}


function pdClass(value) {

  const n =
    numberFrom(value);


  if (n === null || n === 0) {
    return "";
  }


  return n > 0
    ? "positive"
    : "negative";

}


function titleCase(text) {

  return String(text ?? "")
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");

}


function getWeekNumber(weekText) {

  const match =
    String(weekText ?? "")
      .match(/(\d+)/);


  return match
    ? Number(match[1])
    : 9999;

}


/*
==================================================
STANDINGS
==================================================
*/

async function loadStandings() {

  const atlanticBody =
    document.getElementById(
      "atlanticStandingsBody"
    );

  const pacificBody =
    document.getElementById(
      "pacificStandingsBody"
    );


  try {

    const data =
      await getLeagueData();


    const standings =
      buildSeason4Standings(
        data[STANDINGS_SHEET]
      );


    if (!Array.isArray(standings)) {

      throw new Error(
        `Missing sheet: ${STANDINGS_SHEET}`
      );

    }


    const atlantic =
      standings
        .filter(
          (team) =>
            normalize(team.Conference) ===
            "atlantic"
        )
        .sort(sortStandings);


    const pacific =
      standings
        .filter(
          (team) =>
            normalize(team.Conference) ===
            "pacific"
        )
        .sort(sortStandings);


    renderStandings(
      atlanticBody,
      atlantic
    );


    renderStandings(
      pacificBody,
      pacific
    );


  } catch (error) {

    console.error(
      "Standings error:",
      error
    );


    if (atlanticBody) {

      atlanticBody.innerHTML = `
        <tr>
          <td colspan="9" class="status-cell">
            Unable to load standings.
          </td>
        </tr>
      `;

    }


    if (pacificBody) {

      pacificBody.innerHTML = `
        <tr>
          <td colspan="9" class="status-cell">
            Unable to load standings.
          </td>
        </tr>
      `;

    }

  }

}



function parseDivisionRecord(record) {
  const parts = String(record || "0-0").split("-");
  const wins = Number(parts[0]) || 0;
  const losses = Number(parts[1]) || 0;
  const games = wins + losses;

  return {
    wins,
    losses,
    pct:
      games > 0
        ? wins / games
        : 0.5
  };
}

function sortDivisionStandings(a, b) {
  const recA = parseDivisionRecord(a?.Rec);
  const recB = parseDivisionRecord(b?.Rec);

  if (recB.pct !== recA.pct) {
    return recB.pct - recA.pct;
  }

  const divA =
    parseDivisionRecord(
      a?.["Division Rec"]
    );

  const divB =
    parseDivisionRecord(
      b?.["Division Rec"]
    );

  if (divB.pct !== divA.pct) {
    return divB.pct - divA.pct;
  }

  const confA =
    parseDivisionRecord(
      a?.["Conf Rec"]
    );

  const confB =
    parseDivisionRecord(
      b?.["Conf Rec"]
    );

  if (confB.pct !== confA.pct) {
    return confB.pct - confA.pct;
  }

  return (
    Number(b?.PD || 0) -
    Number(a?.PD || 0)
  );
}

function renderStandings(
  body,
  teams
) {
  if (!body) return;

  if (!teams.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9" class="status-cell">
          No teams found.
        </td>
      </tr>
    `;
    return;
  }

  const grouped =
    new Map();

  teams.forEach((team) => {
    const division =
      getDivisionForTeam(
        team.Team
      );

    const key =
      division?.name ||
      "Other";

    if (!grouped.has(key)) {
      grouped.set(
        key,
        {
          division,
          teams: []
        }
      );
    }

    grouped
      .get(key)
      .teams
      .push(team);
  });

  const sections =
    [...grouped.values()]
      .sort(
        (a, b) =>
          divisionOrder(
            a.teams[0]?.Team
          ) -
          divisionOrder(
            b.teams[0]?.Team
          )
      );

  body.innerHTML =
    sections
      .map(
        ({ division, teams: divisionTeams }) => `
          ${createDivisionHeaderRow(division)}

          ${divisionTeams
            .slice()
            .sort(sortDivisionStandings)
            .map(
              (team, index) =>
                createStandingsRow(
                  team,
                  index + 1
                )
            )
            .join("")}
        `
      )
      .join("");
}


function createStandingsRow(
  team,
  displayRank
) {

  const logo =
    getTeamDisplayLogo(team);

  const name =
    team.Team || "";


  return `
    <tr>
      <td class="rank">${esc(displayRank)}</td>

      <td>
        <div class="team-cell">
          ${
            logo
              ? `
                <img
                  src="${esc(logo)}"
                  alt="${esc(name)}"
                  loading="lazy"
                >
              `
              : ""
          }

          <strong>${esc(name)}</strong>
        </div>
      </td>

      <td>${esc(team.Rec)}</td>
      <td>${esc(team["Division Rec"] || "0-0")}</td>
      <td>${esc(team["Conf Rec"] || "0-0")}</td>
      <td>${esc(team.PF)}</td>
      <td>${esc(team.PA)}</td>

      <td class="${pdClass(team.PD)}">
        ${esc(pdText(team.PD))}
      </td>

      <td>${esc(team.Streak)}</td>
    </tr>
  `;

}


/*
==================================================
TEAMS
==================================================
*/

async function loadTeams() {

  const atlanticGrid =
    document.getElementById(
      "atlanticTeamGrid"
    );

  const pacificGrid =
    document.getElementById(
      "pacificTeamGrid"
    );


  try {

    const data =
      await getLeagueData();


    const standings =
      buildSeason4Standings(
        data[STANDINGS_SHEET]
      );


    if (!Array.isArray(standings)) {

      throw new Error(
        `Missing sheet: ${STANDINGS_SHEET}`
      );

    }


    const atlantic =
      standings
        .filter(
          (team) =>
            normalize(team.Conference) ===
            "atlantic"
        )
        .sort(sortStandings);


    const pacific =
      standings
        .filter(
          (team) =>
            normalize(team.Conference) ===
            "pacific"
        )
        .sort(sortStandings);


    renderTeams(
      atlanticGrid,
      atlantic
    );


    renderTeams(
      pacificGrid,
      pacific
    );


  } catch (error) {

    console.error(
      "Teams error:",
      error
    );


    const message = `
      <div class="loading-card">
        Unable to load teams.
      </div>
    `;


    if (atlanticGrid) {
      atlanticGrid.innerHTML = message;
    }


    if (pacificGrid) {
      pacificGrid.innerHTML = message;
    }

  }

}


function renderTeams(grid, teams) {
  if (!grid) return;

  const grouped = new Map();

  teams.forEach((team) => {
    const division = getDivisionForTeam(team.Team);
    const key = division?.name || "Other";
    if (!grouped.has(key)) {
      grouped.set(key, { division, teams: [] });
    }
    grouped.get(key).teams.push(team);
  });

  const sections = [...grouped.values()].sort(
    (a, b) =>
      divisionOrder(a.teams[0]?.Team) -
      divisionOrder(b.teams[0]?.Team)
  );

  grid.innerHTML = sections.map(({ division, teams: divisionTeams }) => `
    ${division ? createDivisionGridHeading(division) : ""}
    ${divisionTeams.map((team) => {
      const logo = getTeamDisplayLogo(team);
      const divisionName =
        getDivisionForTeam(team.Team)?.name ||
        `${team.Conference} Conference`;

      return `
        <button
          class="team-card team-card-button"
          type="button"
          data-team-name="${esc(team.Team)}"
        >
          ${logo ? `<img src="${esc(logo)}" alt="${esc(team.Team)}" loading="lazy">` : ""}
          <h4>${esc(team.Team)}</h4>
          <div class="team-meta">${esc(divisionName)}</div>
          <div class="team-record">${esc(team.Rec || "0-0")}</div>
          <div class="team-view-link">View Roster & Schedule →</div>
        </button>
      `;
    }).join("")}
  `).join("");

  grid.querySelectorAll(".team-card-button").forEach((button) => {
    button.addEventListener("click", () => {
      openTeamDetail(button.dataset.teamName);
    });
  });
}



/*
==================================================
TEAM DETAIL PAGE
==================================================
*/

function normalizeTeamName(value) {

  return String(value ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );

}


function teamNamesMatch(
  first,
  second
) {

  const a =
    normalizeTeamName(first);

  const b =
    normalizeTeamName(second);


  if (!a || !b) {
    return false;
  }


  return (
    a === b ||
    a.includes(b) ||
    b.includes(a)
  );

}


async function openTeamDetail(
  teamName
) {

  const panel =
    document.getElementById(
      "teamDetailPanel"
    );

  const atlanticGrid =
    document.getElementById(
      "atlanticTeamGrid"
    );

  const pacificGrid =
    document.getElementById(
      "pacificTeamGrid"
    );

  const subtitles =
    document.querySelectorAll(
      "#teams .section-subtitle"
    );


  if (!panel) {
    return;
  }


  if (atlanticGrid) {
    atlanticGrid.style.display =
      "none";
  }

  if (pacificGrid) {
    pacificGrid.style.display =
      "none";
  }


  subtitles.forEach(
    (item) => {
      item.style.display =
        "none";
    }
  );


  panel.classList.add(
    "active"
  );


  const nameElement =
    document.getElementById(
      "teamDetailName"
    );

  const logoElement =
    document.getElementById(
      "teamDetailLogo"
    );

  const recordElement =
    document.getElementById(
      "teamDetailRecord"
    );

  const rosterElement =
    document.getElementById(
      "teamRosterList"
    );

  const scheduleElement =
    document.getElementById(
      "teamSeasonSchedule"
    );


  const recentFormElement =
    document.getElementById(
      "teamRecentForm"
    );

  const leadersElement =
    document.getElementById(
      "teamLeadersList"
    );


  if (nameElement) {
    nameElement.textContent =
      teamName;
  }


  if (rosterElement) {
    rosterElement.innerHTML = `
      <div class="loading-card">
        Loading roster...
      </div>
    `;
  }


  if (scheduleElement) {
    scheduleElement.innerHTML = `
      <div class="loading-card">
        Loading schedule...
      </div>
    `;
  }


  if (recentFormElement) {
    recentFormElement.innerHTML = `
      <div class="loading-card">
        Loading recent results...
      </div>
    `;
  }

  if (leadersElement) {
    leadersElement.innerHTML = `
      <div class="loading-card">
        Loading team leaders...
      </div>
    `;
  }


  try {

    const data =
      await getLeagueData();


    const players =
      await getDiscordPlayers()
        .catch(() => []);


    const standings =
      buildSeason4Standings(
        data[STANDINGS_SHEET]
      );


    const team =
      standings.find(
        (item) =>
          teamNamesMatch(
            item.Team,
            teamName
          )
      );


    let teamPlayers =
      players.filter(
        (player) =>
          teamNamesMatch(
            player.team,
            teamName
          )
      );

    // If the first cached response arrived before Discord role data was
    // ready, refresh once before declaring the roster empty.
    if (!teamPlayers.length) {
      const refreshedPlayers =
        await getDiscordPlayers(true)
          .catch(() => players);

      teamPlayers =
        refreshedPlayers.filter(
          (player) =>
            teamNamesMatch(
              player.team,
              teamName
            )
        );
    }


    if (logoElement) {

      const apiTeamLogo =
        teamPlayers.find(
          (player) =>
            player.teamLogo
        )?.teamLogo || "";


      const logo =
        getTeamLogoByName(
          teamName,
          team?.Logo ||
          apiTeamLogo
        );


      logoElement.src =
        logo;

      logoElement.alt =
        teamName;

      logoElement.style.display =
        logo
          ? "block"
          : "none";

    }


    if (recordElement) {

      recordElement.textContent =
        team
          ? `${team.Rec || "0-0"} • ${team.Conference || ""} Conference`
          : "";

    }


    renderTeamRoster(
      rosterElement,
      teamPlayers
    );

    const allStandings = standings;
    renderTeamSeasonSnapshot(teamName, team, allStandings);

    const schedule =
      Array.isArray(
        data[SCHEDULE_SHEET]
      )
        ? data[SCHEDULE_SHEET]
        : [];

    const games =
      schedule.filter(
        (game) =>
          teamNamesMatch(
            game["Away Team"],
            teamName
          ) ||
          teamNamesMatch(
            game["Home Team"],
            teamName
          )
      );

    renderTeamRecentForm(recentFormElement, games, teamName);

    buildTeamSeasonLeaders(teamName)
      .then(leaders => renderTeamLeaders(leadersElement, leaders))
      .catch(error => {
        console.error("Team leaders error:", error);
        if (leadersElement) leadersElement.innerHTML = `<div class="loading-card">Unable to load team leaders.</div>`;
      });


    if (!SEASON4_SCHEDULE_READY) {
      if (scheduleElement) {
        scheduleElement.innerHTML = `
          <div class="loading-card">
            Season 4 schedule coming soon.
          </div>
        `;
      }
    } else {
      renderTeamSeasonSchedule(
        scheduleElement,
        games,
        teamName
      );
    }


  } catch (error) {

    console.error(
      "Team detail error:",
      error
    );


    if (rosterElement) {
      rosterElement.innerHTML = `
        <div class="loading-card">
          Unable to load roster.
        </div>
      `;
    }


    if (scheduleElement) {
      scheduleElement.innerHTML = `
        <div class="loading-card">
          Unable to load schedule.
        </div>
      `;
    }

  }


  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


function getStandingsRank(teamName, standings, scope = "conference") {
  const team = standings.find(item => teamNamesMatch(item.Team, teamName));
  if (!team) return null;

  const division = getDivisionForTeam(teamName);
  let pool = [];
  if (scope === "division" && division) {
    pool = standings.filter(item => division.teams.some(name => teamNamesMatch(name, item.Team)));
  } else {
    pool = standings.filter(item => normalize(item.Conference) === normalize(team.Conference));
  }
  pool.sort(sortStandings);
  const index = pool.findIndex(item => teamNamesMatch(item.Team, teamName));
  return index >= 0 ? index + 1 : null;
}

function renderTeamSeasonSnapshot(teamName, team, standings) {
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("teamSnapshotRecord", team?.Rec || "0-0");
  const confRank = getStandingsRank(teamName, standings, "conference");
  const divRank = getStandingsRank(teamName, standings, "division");
  setText("teamSnapshotConferenceRank", confRank ? `#${confRank}` : "—");
  setText("teamSnapshotDivisionRank", divRank ? `#${divRank}` : "—");
  setText("teamSnapshotPD", pdText(team?.PD ?? 0));
  setText("teamSnapshotPFPA", `${team?.PF ?? 0} / ${team?.PA ?? 0}`);
}

function getTeamGameResult(game, teamName) {
  const isAway = teamNamesMatch(game["Away Team"], teamName);
  const teamScore = isAway ? game["Away Final Score"] : game["Home Final Score"];
  const opponentScore = isAway ? game["Home Final Score"] : game["Away Final Score"];
  const opponent = isAway ? game["Home Team"] : game["Away Team"];
  const ready = String(teamScore ?? "").trim() !== "" && String(opponentScore ?? "").trim() !== "";
  if (!ready || !Number.isFinite(Number(teamScore)) || !Number.isFinite(Number(opponentScore))) return null;
  const result = Number(teamScore) > Number(opponentScore) ? "W" : Number(teamScore) < Number(opponentScore) ? "L" : "T";
  return { result, teamScore: Number(teamScore), opponentScore: Number(opponentScore), opponent, week: game.Week || "" };
}

function renderTeamRecentForm(container, games, teamName) {
  if (!container) return;
  const completed = [...games]
    .map(game => getTeamGameResult(game, teamName))
    .filter(Boolean)
    .sort((a,b) => getWeekNumber(b.week) - getWeekNumber(a.week))
    .slice(0,5);

  if (!completed.length) {
    container.innerHTML = `<div class="loading-card">No completed games yet.</div>`;
    return;
  }

  container.innerHTML = completed.map(item => `
    <div class="team-form-pill ${item.result === "W" ? "win" : item.result === "L" ? "loss" : "tie"}" title="${esc(item.week)} vs ${esc(item.opponent)}: ${item.teamScore}-${item.opponentScore}">${item.result}</div>
  `).join("") + `<span class="team-form-detail">Last ${completed.length} completed game${completed.length === 1 ? "" : "s"}</span>`;
}

async function buildTeamSeasonLeaders(teamName) {
  const data = await getStatsSourceData("season", false);
  await getDiscordPlayers().catch(() => []);
  const combined = new Map();
  const positionLabels = {
    quarterback:"QB", runningback:"RB", center:"C", "tight end":"TE", "wide receiver":"WR",
    "defensive end":"DE", "defensive back":"DB", kicker:"K"
  };

  for (const sheetName of STAT_SHEETS) {
    const rawRows = Array.isArray(data?.[sheetName]) ? data[sheetName] : [];
    const normalizedRows = normalizeStatSheetRows(rawRows);
    const rows = applyCalculatedPoints(sheetName, normalizedRows.rows);
    for (const row of rows) {
      const name = getStatsPlayerName(row);
      if (!name) continue;
      const discordPlayer = findDiscordPlayerByLooseName(name);
      if (!discordPlayer || !teamNamesMatch(discordPlayer.team, teamName)) continue;
      const pts = getStatsPointsValue(row);
      if (!Number.isFinite(pts) || pts <= 0) continue;
      const key = getAwardPlayerKey(name);
      const current = combined.get(key) || { name, pts: 0, positions: [] };
      current.pts += pts;
      const label = positionLabels[sheetName] || sheetName.toUpperCase();
      if (!current.positions.includes(label)) current.positions.push(label);
      combined.set(key, current);
    }
  }

  return [...combined.values()]
    .sort((a,b) => b.pts - a.pts || a.name.localeCompare(b.name))
    .slice(0,5);
}

function renderTeamLeaders(container, leaders) {
  if (!container) return;
  if (!leaders.length) {
    container.innerHTML = `<div class="loading-card">No player points recorded yet.</div>`;
    return;
  }
  container.innerHTML = leaders.map((leader,index) => `
    <div class="team-leader-row">
      <span class="team-leader-rank">#${index + 1}</span>
      <strong>${esc(leader.name)}</strong>
      <div class="team-leader-meta"><b>${formatPoints(leader.pts)}</b><span>${esc(leader.positions.join("/"))}</span></div>
    </div>
  `).join("");
}

function renderTeamRoster(
  container,
  players
) {

  if (!container) {
    return;
  }


  if (!players.length) {

    container.innerHTML = `
      <div class="loading-card">
        No current Discord roster members found.
      </div>
    `;

    return;
  }


  const sorted =
    [...players].sort(
      (a, b) =>
        String(
          a.robloxUsername ||
          a.discordDisplayName ||
          a.discordUsername ||
          ""
        ).localeCompare(
          String(
            b.robloxUsername ||
            b.discordDisplayName ||
            b.discordUsername ||
            ""
          )
        )
    );


  container.innerHTML =
    sorted
      .map(
        (player, index) => {

          const name =
            player.robloxUsername ||
            player.discordDisplayName ||
            player.discordUsername ||
            "Player";


          const lookupCandidates =
            [
              player.robloxUsername,
              ...(Array.isArray(
                player.lookupNames
              )
                ? player.lookupNames
                : []),
              player.discordDisplayName,
              player.discordGlobalName,
              player.discordUsername
            ]
              .filter(Boolean)
              .join("|");


          return `
            <div class="roster-player-row">

              ${
                player.robloxPicture
                  ? `
                    <img
                      src="${esc(getDisplayImageUrl(player.robloxPicture))}"
                      alt="${esc(name)}"
                      class="roster-roblox-avatar"
                      loading="lazy"
                    >
                  `
                  : `
                    <div
                      class="roster-avatar-fallback"
                      data-roster-roblox-index="${index}"
                      data-roster-roblox-lookups="${esc(lookupCandidates)}"
                    >
                      —
                    </div>
                  `
              }

              <div>
                <strong>
                  ${esc(name)}
                </strong>

                <span>
                  ${esc(
                    player.discordUsername ||
                    ""
                  )}
                </span>
              </div>

            </div>
          `;

        }
      )
      .join("");


  fillMissingRosterRobloxPictures();

}


async function findRobloxPictureFromCandidates(
  candidates
) {

  const unique =
    [
      ...new Set(
        candidates
          .map(
            (value) =>
              String(
                value || ""
              ).trim()
          )
          .filter(Boolean)
      )
    ];


  for (
    const candidate of
    unique
  ) {

    const picture =
      await getDirectRobloxPicture(
        candidate
      );


    if (picture) {
      return picture;
    }

  }


  return "";

}


async function fillMissingRosterRobloxPictures() {

  const fallbacks =
    document.querySelectorAll(
      "[data-roster-roblox-lookups]"
    );


  await Promise.all(
    [...fallbacks].map(
      async (fallback) => {

        const candidates =
          String(
            fallback.dataset
              .rosterRobloxLookups ||
            ""
          )
            .split("|")
            .filter(Boolean);


        const picture =
          await findRobloxPictureFromCandidates(
            candidates
          );


        if (
          !picture ||
          !fallback.isConnected
        ) {
          return;
        }


        const image =
          document.createElement(
            "img"
          );


        image.src =
          picture;

        image.alt =
          candidates[0] || "Roblox";

        image.className =
          "roster-roblox-avatar";

        image.loading =
          "lazy";


        fallback.replaceWith(
          image
        );

      }
    )
  );

}


function renderTeamSeasonSchedule(
  container,
  games,
  teamName
) {

  if (!container) {
    return;
  }


  if (!games.length) {

    container.innerHTML = `
      <div class="loading-card">
        No season games found.
      </div>
    `;

    return;
  }


  const sorted =
    [...games].sort(
      (a, b) =>
        getWeekNumber(a.Week) -
        getWeekNumber(b.Week)
    );


  container.innerHTML =
    sorted
      .map(
        (game) => {

          const isAway =
            teamNamesMatch(
              game["Away Team"],
              teamName
            );


          const opponent =
            isAway
              ? game["Home Team"]
              : game["Away Team"];


          const opponentLogo =
            getTeamLogoByName(
              opponent,
              isAway
                ? game["Home Logo"]
                : game["Away Logo"]
            );


          const teamScore =
            isAway
              ? game[
                  "Away Final Score"
                ]
              : game[
                  "Home Final Score"
                ];


          const opponentScore =
            isAway
              ? game[
                  "Home Final Score"
                ]
              : game[
                  "Away Final Score"
                ];


          const hasScore =
            String(
              teamScore ?? ""
            ).trim() !== "" &&
            String(
              opponentScore ?? ""
            ).trim() !== "";


          let result = "";


          if (hasScore) {

            result =
              Number(teamScore) >
              Number(opponentScore)
                ? "W"
                : Number(teamScore) <
                  Number(opponentScore)
                  ? "L"
                  : "T";

          }


          return `
            <div class="team-schedule-row">

              <div class="team-schedule-week">
                ${esc(game.Week || "")}
              </div>

              <div class="team-schedule-opponent">

                ${
                  opponentLogo
                    ? `
                      <img
                        src="${esc(opponentLogo)}"
                        alt="${esc(opponent)}"
                        loading="lazy"
                      >
                    `
                    : ""
                }

                <div>
                  <span>
                    ${isAway ? "@" : "vs"}
                  </span>

                  <strong>
                    ${esc(opponent || "")}
                  </strong>
                </div>

              </div>

              <div class="team-schedule-score">

                ${
                  hasScore
                    ? `
                      <span class="team-result team-result-${result.toLowerCase()}">
                        ${result}
                      </span>

                      <strong>
                        ${esc(teamScore)}-${esc(opponentScore)}
                      </strong>
                    `
                    : `
                      <span class="team-game-upcoming">
                        Upcoming
                      </span>
                    `
                }

              </div>

            </div>
          `;

        }
      )
      .join("");

}


const teamDetailBack =
  document.getElementById(
    "teamDetailBack"
  );


if (teamDetailBack) {

  teamDetailBack.addEventListener(
    "click",
    () => {

      const panel =
        document.getElementById(
          "teamDetailPanel"
        );

      const atlanticGrid =
        document.getElementById(
          "atlanticTeamGrid"
        );

      const pacificGrid =
        document.getElementById(
          "pacificTeamGrid"
        );


      panel?.classList.remove(
        "active"
      );


      if (atlanticGrid) {
        atlanticGrid.style.display =
          "grid";
      }


      if (pacificGrid) {
        pacificGrid.style.display =
          "grid";
      }


      document
        .querySelectorAll(
          "#teams .section-subtitle"
        )
        .forEach(
          (item) => {
            item.style.display =
              "flex";
          }
        );


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );

}


/*
==================================================
PLAYER POINT FORMULAS
==================================================
*/

function findHeaderKey(
  row,
  aliases
) {

  const keys =
    Object.keys(row || {});

  for (const alias of aliases) {

    const normalizedAlias =
      normalize(alias)
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9%]/g, "");

    const match =
      keys.find(
        (key) => {

          const normalizedKey =
            normalize(key)
              .replace(/\s+/g, "")
              .replace(/[^a-z0-9%]/g, "");

          return (
            normalizedKey ===
            normalizedAlias
          );

        }
      );

    if (match) {
      return match;
    }

  }

  return "";
}


function statNumber(
  row,
  aliases
) {

  const key =
    findHeaderKey(
      row,
      aliases
    );

  if (!key) {
    return 0;
  }

  const raw =
    String(
      row[key] ?? ""
    )
      .replaceAll(",", "")
      .replace("%", "")
      .trim();

  const value =
    Number(raw);

  return Number.isFinite(value)
    ? value
    : 0;
}


function formatPoints(value) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "0.0";
  }

  return number.toFixed(1);
}


function calculatePlayerPoints(
  sheetName,
  row
) {

  const position =
    normalize(sheetName);

  /*
    QB:
    ((TDs × 3) − (INT × 4) + (Yds × 0.04)) / 2
  */

  if (
    position.includes("quarterback") ||
    position === "qb"
  ) {

    const tds =
      statNumber(
        row,
        ["TDS", "TD", "Touchdowns"]
      );

    const interceptions =
      statNumber(
        row,
        ["INT", "INTS", "Interceptions"]
      );

    const yards =
      statNumber(
        row,
        ["YDS", "Yards", "Passing Yards"]
      );

    return (
      (
        tds * 3 -
        interceptions * 4 +
        yards * 0.04
      ) / 2
    );

  }


  /*
    RB:
    (Rushing Yards × 0.2 + TDs × 3 − Fumbles × 10) / 2
  */

  if (
    position.includes("runningback") ||
    position.includes("running back") ||
    position === "rb"
  ) {

    const rushingYards =
      statNumber(
        row,
        [
          "Rushing Yards",
          "Rush Yards",
          "RUSH YDS",
          "RYDS",
          "YDS"
        ]
      );

    const tds =
      statNumber(
        row,
        ["TDS", "TD", "Touchdowns"]
      );

    const fumbles =
      statNumber(
        row,
        [
          "Fumbles",
          "FUM",
          "FUMBLES"
        ]
      );

    return (
      (
        rushingYards * 0.2 +
        tds * 3 -
        fumbles * 10
      ) / 2
    );

  }


  /*
    WR / TE:
    (Receiving Yards × 0.10 + TDs × 5 + Rec × 0.5 + YAC × 0.05) / 2
  */

  if (
    position.includes("wide receiver") ||
    position.includes("receiver") ||
    position.includes("tight end") ||
    position === "wr" ||
    position === "te"
  ) {

    const receivingYards =
      statNumber(
        row,
        [
          "Receiving Yards",
          "REC YDS",
          "YDS",
          "Yards"
        ]
      );

    const tds =
      statNumber(
        row,
        ["TDS", "TD", "Touchdowns"]
      );

    const receptions =
      statNumber(
        row,
        [
          "REC",
          "Receptions"
        ]
      );

    const yac =
      statNumber(
        row,
        ["YAC"]
      );

    return (
      (
        receivingYards * 0.10 +
        tds * 5 +
        receptions * 0.5 +
        yac * 0.05
      ) / 2
    );

  }


  /*
    CENTER:
    (SNAP × 0.5 + RYDS × 0.08 - SCKA × 1.5 - PRSA × 0.10) / 2
  */

  if (
    position.includes("center") ||
    position === "c"
  ) {

    const snaps =
      statNumber(
        row,
        ["SNAP", "Snaps", "Offensive Snaps"]
      );

    const rushingYards =
      statNumber(
        row,
        [
          "RYDS",
          "Rushing Yards",
          "Rush Yards",
          "RUSH YDS"
        ]
      );

    const sacksAllowed =
      statNumber(
        row,
        [
          "SCKA",
          "Sacks Allowed",
          "Sack Allowed"
        ]
      );

    const pressuresAllowed =
      statNumber(
        row,
        [
          "PRSA",
          "Pressures Allowed",
          "Pressure Allowed",
          "PRS Allowed"
        ]
      );

    return (
      (
        snaps * 0.5 +
        rushingYards * 0.08 -
        sacksAllowed * 1.5 -
        pressuresAllowed * 0.10
      ) / 2
    );

  }


  /*
    DB:
    (
      INT × 8 +
      TCK × 0.5 +
      PK6 × 10 +
      TRGT × 0.25 -
      CA × 0.75 -
      YDA × 0.02 -
      TDA × 2
    ) / 2
  */

  if (
    position.includes("defensive back") ||
    position === "db"
  ) {

    const interceptions =
      statNumber(
        row,
        [
          "INT",
          "INTS",
          "Interceptions"
        ]
      );

    const tackles =
      statNumber(
        row,
        [
          "TCK",
          "Tackles",
          "TKL",
          "TACKLES"
        ]
      );

    const pickSix =
      statNumber(
        row,
        [
          "PK6",
          "PICK 6",
          "PICK6"
        ]
      );

    const targets =
      statNumber(
        row,
        [
          "TRGT",
          "Targets",
          "Target",
          "TGTS"
        ]
      );

    const catchesAllowed =
      statNumber(
        row,
        [
          "CA",
          "Catches Allowed",
          "CatchesAllowed"
        ]
      );

    const yardsAllowed =
      statNumber(
        row,
        [
          "YDA",
          "Yards Allowed"
        ]
      );

    const touchdownsAllowed =
      statNumber(
        row,
        [
          "TDA",
          "TD Allowed",
          "Touchdowns Allowed"
        ]
      );

    return (
      (
        interceptions * 8 +
        tackles * 0.5 +
        pickSix * 10 +
        targets * 0.25 -
        catchesAllowed * 0.75 -
        yardsAllowed * 0.02 -
        touchdownsAllowed * 2
      ) / 2
    );

  }


  /*
    Kicker:
    (
      MADE × 3 +
      FG% × 0.10 +
      LONG × 0.15 -
      Misses × 2
    ) / 2

    FG% is treated as a whole-number percent:
    100% = 100, 66.67% = 66.67.
  */

  if (
    position.includes("kicker") ||
    position === "k"
  ) {

    const made =
      statNumber(
        row,
        [
          "MADE",
          "Made",
          "FG Made"
        ]
      );

    const attempts =
      statNumber(
        row,
        [
          "ATT",
          "Attempts",
          "FG Attempts"
        ]
      );

    const long =
      statNumber(
        row,
        [
          "LONG",
          "Long",
          "Longest"
        ]
      );

    const fieldGoalPercent =
      statNumber(
        row,
        [
          "%",
          "FG%",
          "FG %",
          "Field Goal %",
          "FieldGoal%"
        ]
      );

    const misses =
      Math.max(
        0,
        attempts - made
      );

    return (
      (
        made * 3 +
        fieldGoalPercent * 0.10 +
        long * 0.15 -
        misses * 2
      ) / 2
    );

  }


  /*
    DE:
    (
      Tackles × 0.75 +
      Sacks × 5 +
      Pressures × 0.3 +
      Safeties × 4 +
      QB Hits × 0.5 +
      Sack Yards × 0.1
    ) / 2
  */

  if (
    position.includes("defensive end") ||
    position === "de"
  ) {

    const tackles =
      statNumber(
        row,
        [
          "Tackles",
          "TACK",
          "TKL",
          "TACKLES",
          "TCK"
        ]
      );

    const sacks =
      statNumber(
        row,
        [
          "Sacks",
          "SCK",
          "SACKS"
        ]
      );

    const pressures =
      statNumber(
        row,
        [
          "Pressures",
          "Pressure",
          "PRESS",
          "PRS"
        ]
      );

    const safeties =
      statNumber(
        row,
        [
          "Safeties",
          "Safety",
          "SFTY"
        ]
      );

    const qbHits =
      statNumber(
        row,
        [
          "QB Hits",
          "QB Hit",
          "QBH"
        ]
      );

    const sackYards =
      statNumber(
        row,
        [
          "Sack Yards",
          "SACK YDS",
          "SackYards",
          "SCKY"
        ]
      );

    return (
      (
        tackles * 0.75 +
        sacks * 5 +
        pressures * 0.3 +
        safeties * 4 +
        qbHits * 0.5 +
        sackYards * 0.1
      ) / 2
    );

  }


  return null;
}


function applyCalculatedPoints(
  sheetName,
  rows
) {

  if (!Array.isArray(rows)) {
    return rows;
  }

  return rows.map(
    (row) => {

      const copy =
        {
          ...row
        };

      const calculated =
        calculatePlayerPoints(
          sheetName,
          copy
        );

      if (calculated === null) {
        return copy;
      }

      const ptsKey =
        findHeaderKey(
          copy,
          [
            "PTS",
            "Points",
            "Point"
          ]
        );

      if (ptsKey) {
        copy[ptsKey] =
          formatPoints(
            calculated
          );
      } else {
        // Some stat tabs (especially Kicker) do not have a physical
        // PTS column in the Google Sheet. Create one for the website.
        copy.PTS =
          formatPoints(
            calculated
          );
      }

      return copy;
    }
  );
}


/*
==================================================
STATS
==================================================
*/

async function loadStats(
  forceRefresh = false
) {

  const tabs =
    document.getElementById(
      "statsTabs"
    );

  try {

    tabs.innerHTML = `
      <span class="loading-inline">
        Loading stat categories...
      </span>
    `;

    const data =
      await getStatsSourceData(
        currentStatsMode,
        forceRefresh
      );

    // Load Discord/Bloxlink player data before the first table render.
    // This keeps TM logos available in both Season and All Time modes.
    await getDiscordPlayers().catch((error) => {
      console.warn(
        "Discord team enrichment unavailable; stats will still load:",
        error
      );
    });

    const allSheetNames =
      Object.keys(data || {});

    let availableSheets =
      STAT_SHEETS.filter(
        (sheetName) =>
          Array.isArray(
            data[sheetName]
          ) &&
          data[sheetName].length > 0
      );

    /*
      If the All Time workbook uses slightly different
      sheet names, detect likely football stat sheets
      automatically instead of showing nothing.
    */
    availableSheets =
      availableSheets.filter(
        (sheetName) => {
          const name =
            normalize(sheetName);

          return !(
            name.includes("linebacker") ||
            name.includes("linemen") ||
            name.includes("lineman")
          );
        }
      );


    if (!availableSheets.length) {

      const statKeywords = [
        "quarter",
        "running",
        "center",
        "tight end",
        "receiver",
        "defensive end",
        "defensive back",
        "kicker",
        "qb",
        "rb",
        "wr",
        "de",
        "db",
        
        
        "ol"
      ];

      availableSheets =
        allSheetNames.filter(
          (sheetName) => {

            const lower =
              normalize(sheetName);

            return (
              Array.isArray(
                data[sheetName]
              ) &&
              data[sheetName].length > 0 &&
              statKeywords.some(
                (keyword) =>
                  lower.includes(keyword)
              )
            );

          }
        );
    }

    if (!availableSheets.length) {

      tabs.innerHTML = `
        <span class="loading-inline">
          No stat sheets were detected for ${
            currentStatsMode === "alltime"
              ? "All Time"
              : "Season"
          }.
        </span>
      `;

      showStatsMessage(
        `No ${
          currentStatsMode === "alltime"
            ? "All Time"
            : "Season"
        } stat sheets were detected.`
      );

      return;
    }

    tabs.innerHTML =
      availableSheets
        .map(
          (sheetName, index) => `
            <button
              class="stats-tab ${
                index === 0
                  ? "active"
                  : ""
              }"
              data-sheet="${esc(sheetName)}"
            >
              ${esc(titleCase(sheetName))}
            </button>
          `
        )
        .join("");

    tabs
      .querySelectorAll(".stats-tab")
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            tabs
              .querySelectorAll(".stats-tab")
              .forEach(
                (tab) =>
                  tab.classList.remove(
                    "active"
                  )
              );

            button.classList.add(
              "active"
            );

            renderStatSheet(
              button.dataset.sheet,
              data[
                button.dataset.sheet
              ]
            );

          }
        );

      });

    renderStatSheet(
      availableSheets[0],
      data[availableSheets[0]]
    );

    updateStatsModeUI();

    refreshStatsIdentityUntilReady();

    getDiscordPlayers()
      .then(() => {

        if (
          activeStatSheetName &&
          Array.isArray(activeRawStatRows)
        ) {

          renderStatSheet(
            activeStatSheetName,
            activeRawStatRows,
            true
          );

        }

      })
      .catch((error) => {

        console.warn(
          "Discord/Roblox enrichment unavailable:",
          error
        );

      });

  } catch (error) {

    console.error(
      "Stats error:",
      error
    );

    tabs.innerHTML = `
      <span class="loading-inline">
        Unable to load stat categories.
      </span>
    `;

    showStatsMessage(
      currentStatsMode === "alltime"
        ? "Unable to load All Time stats. Make sure the updated Apps Script was redeployed."
        : "Unable to load Season stats."
    );

  }

}


function updateStatsModeUI() {

  const seasonButton =
    document.getElementById(
      "seasonStatsBtn"
    );

  const allTimeButton =
    document.getElementById(
      "allTimeStatsBtn"
    );

  const seasonLabel =
    document.getElementById(
      "statsSeasonLabel"
    );

  if (seasonButton) {
    seasonButton.classList.toggle(
      "active",
      currentStatsMode === "season"
    );
  }

  if (allTimeButton) {
    allTimeButton.classList.toggle(
      "active",
      currentStatsMode === "alltime"
    );
  }

  if (seasonLabel) {
    seasonLabel.textContent =
      currentStatsMode === "alltime"
        ? "EFF ALL TIME"
        : "EFF SEASON 4";
  }
}




function repairShiftedSeasonStatRows(
  sheetName,
  objectHeaders,
  rows
) {
  if (
    !Array.isArray(rows) ||
    rows.length < 2
  ) {
    return null;
  }

  const headerValues =
    objectHeaders.map(
      key =>
        String(
          rows[0]?.[key] ?? ""
        ).trim()
    );

  /*
    Season 3 stat tabs currently have:
      A = rank
      B = blank
      C = username
      D = old/blank PTS slot
      remaining columns = actual football stats

    But row 2 still begins with "username, PTs, YDs...",
    so Apps Script labels every value two columns too far left.
    Detect that exact layout and rebuild the rows by physical column.
  */
  if (
    normalize(
      headerValues[0]
    ) !== "username" ||
    normalize(
      headerValues[1]
    ) !== "pts"
  ) {
    return null;
  }

  const firstDataValues =
    objectHeaders.map(
      key =>
        rows[1]?.[key] ?? ""
    );

  const rankLooksNumeric =
    /^\d+$/.test(
      String(
        firstDataValues[0] ?? ""
      ).trim()
    );

  const usernameLooksText =
    String(
      firstDataValues[2] ?? ""
    ).trim() !== "" &&
    !/^-?\d+(?:\.\d+)?%?$/.test(
      String(
        firstDataValues[2] ?? ""
      ).trim()
    );

  if (
    !rankLooksNumeric ||
    !usernameLooksText
  ) {
    return null;
  }

  const position =
    normalize(sheetName);

  let headers = [];
  let buildRow = null;

  if (
    position.includes("quarterback") ||
    position === "qb"
  ) {
    headers = [
      "Rank",
      "username",
      "PTS",
      "YDs",
      "CMP",
      "ATT",
      "C%",
      "TDs",
      "INT",
      "SCK",
      "3RD",
      "4TH",
      "SNAP"
    ];

    buildRow = (v) => ({
      Rank: v[0] ?? "",
      username: v[2] ?? "",
      PTS: "",
      YDs: v[4] ?? "",
      CMP: v[5] ?? "",
      ATT: v[6] ?? "",
      "C%": v[7] ?? "",
      TDs: v[8] ?? "",
      INT: v[9] ?? "",
      SCK: v[10] ?? "",
      "3RD": v[11] ?? "",
      "4TH": v[12] ?? "",
      SNAP: v[13] ?? ""
    });
  } else if (
    position.includes("runningback") ||
    position.includes("running back") ||
    position === "rb"
  ) {
    headers = [
      "Rank",
      "username",
      "PTS",
      "YDs",
      "Y/A",
      "ATT",
      "TD",
      "FUM",
      "1ST",
      "3RD",
      "4TH",
      "SNAP"
    ];

    buildRow = (v) => ({
      Rank: v[0] ?? "",
      username: v[2] ?? "",
      PTS: "",
      YDs: v[4] ?? "",
      "Y/A": v[5] ?? "",
      ATT: v[6] ?? "",
      TD: v[7] ?? "",
      FUM: v[8] ?? "",
      "1ST": v[9] ?? "",
      "3RD": v[10] ?? "",
      "4TH": v[11] ?? "",
      SNAP: v[12] ?? ""
    });
  } else if (
    position.includes("center") ||
    position === "c"
  ) {
    headers = [
      "Rank",
      "username",
      "PTS",
      "SCKA",
      "PRSA",
      "RYDS",
      "SNAP"
    ];

    buildRow = (v) => ({
      Rank: v[0] ?? "",
      username: v[2] ?? "",
      PTS: "",
      SCKA: v[4] ?? "",
      PRSA: v[5] ?? "",
      RYDS: v[6] ?? "",
      SNAP: v[7] ?? ""
    });
  } else if (
    position.includes("tight end") ||
    position === "te"
  ) {
    headers = [
      "Rank",
      "username",
      "PTS",
      "YDS",
      "REC",
      "TRGT",
      "TD",
      "YAC",
      "1ST",
      "3RD",
      "4TH",
      "SNAP"
    ];

    buildRow = (v) => ({
      Rank: v[0] ?? "",
      username: v[2] ?? "",
      PTS: "",
      YDS: v[4] ?? "",
      REC: v[5] ?? "",
      TRGT: v[6] ?? "",
      TD: v[7] ?? "",
      YAC: v[8] ?? "",
      "1ST": v[9] ?? "",
      "3RD": v[10] ?? "",
      "4TH": v[11] ?? "",
      SNAP: v[12] ?? ""
    });
  } else if (
    position.includes("wide receiver") ||
    position.includes("receiver") ||
    position === "wr"
  ) {
    headers = [
      "Rank",
      "username",
      "PTS",
      "YDs",
      "REC",
      "TRGT",
      "TD",
      "YAC",
      "1ST",
      "3RD",
      "4TH",
      "SNAP"
    ];

    buildRow = (v) => ({
      Rank: v[0] ?? "",
      username: v[2] ?? "",
      PTS: "",
      YDs: v[4] ?? "",
      REC: v[5] ?? "",
      TRGT: v[6] ?? "",
      TD: v[7] ?? "",
      YAC: v[8] ?? "",
      "1ST": v[9] ?? "",
      "3RD": v[10] ?? "",
      "4TH": v[11] ?? "",
      SNAP: v[12] ?? ""
    });
  } else if (
    position.includes("defensive end") ||
    position === "de"
  ) {
    headers = [
      "Rank",
      "username",
      "PTS",
      "SCK",
      "SCKY",
      "TCK",
      "TFL",
      "QBH",
      "PRS",
      "SFTY",
      "TD",
      "RUSH",
      "SNAP"
    ];

    buildRow = (v) => ({
      Rank: v[0] ?? "",
      username: v[2] ?? "",
      PTS: "",
      SCK: v[4] ?? "",
      SCKY: v[5] ?? "",
      TCK: v[6] ?? "",
      TFL: v[7] ?? "",
      QBH: v[8] ?? "",
      PRS: v[9] ?? "",
      SFTY: v[10] ?? "",
      TD: v[11] ?? "",
      RUSH: v[12] ?? "",
      SNAP: v[13] ?? ""
    });
  } else if (
    position.includes("defensive back") ||
    position === "db"
  ) {
    headers = [
      "Rank",
      "username",
      "PTS",
      "INT",
      "TCK",
      "PK6",
      "TRGT",
      "CA",
      "CA%",
      "YDA",
      "TDA",
      "SNAP"
    ];

    buildRow = (v) => ({
      Rank: v[0] ?? "",
      username: v[2] ?? "",
      PTS: "",
      INT: v[4] ?? "",
      TCK: v[5] ?? "",
      PK6: v[6] ?? "",
      TRGT: v[7] ?? "",
      CA: v[8] ?? "",
      "CA%": v[9] ?? "",
      YDA: v[10] ?? "",
      TDA: v[11] ?? "",
      SNAP: v[12] ?? ""
    });
  } else if (
    position.includes("kicker") ||
    position === "k"
  ) {
    headers = [
      "Rank",
      "username",
      "PTS",
      "FG%",
      "MADE",
      "ATT",
      "LONG"
    ];

    buildRow = (v) => ({
      Rank: v[0] ?? "",
      username: v[2] ?? "",
      PTS: "",
      "FG%": v[3] ?? "",
      MADE: v[4] ?? "",
      ATT: v[5] ?? "",
      LONG: v[6] ?? ""
    });
  }

  if (!buildRow) {
    return null;
  }

  const repairedRows =
    rows
      .slice(1)
      .map(
        row => {
          const values =
            objectHeaders.map(
              key =>
                row?.[key] ?? ""
            );

          return buildRow(
            values
          );
        }
      )
      .filter(
        row =>
          String(
            row.username ?? ""
          ).trim() !== ""
      );

  return {
    headers,
    rows: repairedRows
  };
}


function normalizeStatSheetRows(
  rows,
  sheetName = ""
) {

  if (
    !Array.isArray(rows) ||
    !rows.length
  ) {

    return {
      headers: [],
      rows: []
    };

  }


  const objectHeaders =
    Object.keys(rows[0]);


  const genericHeaderCount =
    objectHeaders.filter(
      (header) =>
        /^column_\d+$/i.test(header)
    ).length;


  /*
    Your Google Sheet has a title on row 1
    and the real column headings on row 2.

    Apps Script therefore creates headers like:
    WIDE RECEIVER STATS, column_2, column_3...

    When that happens, promote the first returned
    data row to become the real table headings.
  */

  if (
    genericHeaderCount >=
    Math.max(
      2,
      objectHeaders.length / 2
    )
  ) {

    const repaired =
      repairShiftedSeasonStatRows(
        sheetName,
        objectHeaders,
        rows
      );

    if (repaired) {
      return repaired;
    }

    const firstRow =
      rows[0];


    const headers =
      objectHeaders.map(
        (key, index) => {

          const label =
            String(
              firstRow[key] ?? ""
            ).trim();


          return label ||
            `Column ${index + 1}`;

        }
      );


    const cleanRows =
      rows
        .slice(1)
        .filter(
          (row) =>
            Object.values(row)
              .some(
                (value) =>
                  String(
                    value ?? ""
                  ).trim() !== ""
              )
        )
        .map((row) => {

          const clean =
            {};


          objectHeaders.forEach(
            (key, index) => {

              clean[
                headers[index]
              ] =
                row[key] ?? "";

            }
          );


          return clean;

        });


    return {
      headers,
      rows: cleanRows
    };

  }


  return {
    headers: objectHeaders,
    rows
  };

}


function renderStatSheet(
  sheetName,
  rawRows,
  preserveSearch = false
) {

  activeStatSheetName =
    sheetName;

  activeRawStatRows =
    Array.isArray(rawRows)
      ? rawRows
      : [];

  const pageTitle =
    document.getElementById(
      "statsPageTitle"
    );


  const normalized =
    normalizeStatSheetRows(
      rawRows,
      sheetName
    );


  const calculatedRows =
    applyCalculatedPoints(
      sheetName,
      normalized.rows
    );


  activeStatsHeaders =
    [...normalized.headers];


  // If the sheet does not physically contain a PTS column,
  // add one to the website table after USERNAME/PLAYER/NAME.
  const hasPtsHeader =
    activeStatsHeaders.some(
      (header) =>
        normalize(header) === "pts" ||
        normalize(header) === "points"
    );

  if (!hasPtsHeader) {
    const playerHeaderIndex =
      activeStatsHeaders.findIndex(
        (header) => {
          const key =
            normalize(header);

          return (
            key === "username" ||
            key === "player" ||
            key === "name"
          );
        }
      );

    const insertAt =
      playerHeaderIndex >= 0
        ? playerHeaderIndex + 1
        : Math.min(
            3,
            activeStatsHeaders.length
          );

    activeStatsHeaders.splice(
      insertAt,
      0,
      "PTS"
    );
  }


  /*
    Display every real stat row from the sheet.

    Position players:
      show them when SNAP > 0.

    Kickers:
      show them when ATT > 0.

    Do NOT hide a player just because calculated PTS is
    zero or negative. A player can have real snaps and
    production while still ending up with a low/negative
    rating under the position formula.
  */

  const isKickerSheet =
    normalize(sheetName).includes("kicker") ||
    normalize(sheetName) === "k";

  activeStatsRows =
    calculatedRows.filter(
      (row) => {

        if (isKickerSheet) {
          const attempts =
            statNumber(
              row,
              [
                "ATT",
                "Attempts",
                "FG Attempts"
              ]
            );

          return attempts > 0;
        }

        const snaps =
          statNumber(
            row,
            [
              "SNAP",
              "SNAPS",
              "Snaps"
            ]
          );

        return snaps > 0;
      }
    );


  const ptsHeader =
    activeStatsHeaders.find(
      (header) =>
        normalize(header) ===
        "pts"
    );


  activeStatsSortHeader =
    ptsHeader ||
    activeStatsHeaders[1] ||
    activeStatsHeaders[0] ||
    "";


  activeStatsSortDirection =
    "desc";


  updateStatsSortOptions();


  pageTitle.textContent =
    `${titleCase(sheetName)} Stats`;


  const searchInput =
    document.getElementById(
      "playerSearchInput"
    );


  if (!preserveSearch) {
    searchInput.value = "";
  }


  rerenderActiveStats();

}


function renderStatsTable(
  headers,
  rows
) {

  const head =
    document.getElementById(
      "statsTableHead"
    );

  const body =
    document.getElementById(
      "statsTableBody"
    );


  if (!headers.length) {

    head.innerHTML = "";

    body.innerHTML = `
      <tr>
        <td class="status-cell">
          No stats found.
        </td>
      </tr>
    `;

    return;
  }


  const cleanedHeaders =
    headers.filter(
      (header) =>
        String(header)
          .trim() !== ""
    );


  head.innerHTML = `
    <tr>
      ${cleanedHeaders
        .map(
          (header, index) => {

            if (index === 0) {
              return `
                <th class="stats-rank-header">
                  #
                </th>
              `;
            }

            const active =
              normalize(header) ===
              normalize(
                activeStatsSortHeader
              );

            const arrow =
              active
                ? (
                    activeStatsSortDirection ===
                    "desc"
                      ? " ↓"
                      : " ↑"
                  )
                : "";

            return `
              <th>
                <button
                  class="stats-column-sort ${
                    active ? "active" : ""
                  }"
                  type="button"
                  data-stat-column="${esc(header)}"
                >
                  ${esc(header)}${arrow}
                </button>
              </th>
            `;
          }
        )
        .join("")}
    </tr>
  `;


  head
    .querySelectorAll(
      "[data-stat-column]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const header =
              button.dataset.statColumn;


            if (
              normalize(
                activeStatsSortHeader
              ) ===
              normalize(header)
            ) {

              activeStatsSortDirection =
                activeStatsSortDirection ===
                  "desc"
                  ? "asc"
                  : "desc";

            } else {

              activeStatsSortHeader =
                header;

              activeStatsSortDirection =
                "desc";

            }


            rerenderActiveStats();

          }
        );

      }
    );


  if (!rows.length) {

    body.innerHTML = `
      <tr>
        <td
          colspan="${cleanedHeaders.length}"
          class="status-cell"
        >
          No matching players.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    rows
      .map(
        (row, rowIndex) =>
          createStatsRow(
            row,
            cleanedHeaders,
            rowIndex
          )
      )
      .join("");


  fillMissingRobloxPictures();

  setTimeout(
    retryVisibleRobloxPictures,
    1800
  );

}



function isStatsTeamHeader(header) {

  const key =
    normalize(header)
      .replace(/\s+/g, "");

  return (
    key === "tm" ||
    key === "team"
  );

}


function formatStatsCell(
  header,
  value
) {

  const key =
    normalize(header)
      .replace(/\s+/g, "");

  const text =
    String(value ?? "")
      .trim();


  if (!text) {
    return "";
  }


  // PTS always keeps exactly one decimal.
  if (
    key === "pts" ||
    key === "points"
  ) {

    const number =
      Number(
        text.replaceAll(",", "")
      );


    return Number.isFinite(number)
      ? number.toFixed(1)
      : text;

  }


  // C% / completion percentage keeps its existing precision.
  if (
    key === "c%" ||
    key === "cmp%" ||
    key === "completion%"
  ) {
    return text;
  }


  // Remove trailing .0 / unnecessary decimals from ordinary numeric stats.
  const noCommas =
    text.replaceAll(",", "");


  if (
    /^-?\d+(?:\.\d+)?$/.test(
      noCommas
    )
  ) {

    const number =
      Number(noCommas);


    return Number.isFinite(number)
      ? String(number)
      : text;

  }


  return text;

}

function createStatsRow(
  row,
  headers,
  rowIndex
) {

  const discordPlayer =
    findDiscordPlayerForStatRow(
      row,
      headers
    );


  return `
    <tr>

      ${headers
        .map(
          (header, columnIndex) => {

            const value =
              row[header] ?? "";


            // Ranking ALWAYS follows the current visible sorted order.
            if (columnIndex === 0) {

              return `
                <td class="stats-rank-cell">
                  ${rowIndex + 1}
                </td>
              `;

            }


            const normalizedHeader =
              normalize(header);


            // TM column gets ONLY the team logo.
            if (
              isStatsTeamHeader(
                header
              )
            ) {

              const teamLogo =
                discordPlayer?.teamLogo ||
                "";

              const teamName =
                discordPlayer?.team ||
                "";



              return `
                <td class="stats-team-logo-cell">
                  ${
                    teamLogo
                      ? `
                        <img
                          src="${esc(getDisplayImageUrl(teamLogo))}"
                          alt="${esc(teamName)}"
                          title="${esc(teamName)}"
                          class="stats-tm-logo"
                          loading="lazy"
                        >
                      `
                      : `<span class="stats-team-logo-empty">—</span>`
                  }
                </td>
              `;

            }


            const isPlayerColumn =
              normalizedHeader === "username" ||
              normalizedHeader === "player" ||
              normalizedHeader === "name";


            if (isPlayerColumn) {

              const playerPicture =
                getBestPlayerPicture(
                  discordPlayer
                );

              const teamName =
                discordPlayer?.team ||
                "";

              const avatarLookupName =
                getRobloxUsernameForPlayer(
                  discordPlayer,
                  value
                );

              return `
                <td class="stats-player-cell">

                  <div class="player-cell-wrap">

                    ${
                      playerPicture
                        ? `
                          <img
                            src="${esc(getDisplayImageUrl(playerPicture))}"
                            alt="${esc(value)}"
                            class="stat-avatar"
                            loading="lazy"
                            data-avatar-username="${esc(avatarLookupName)}"
                            onerror="handleStatAvatarError(this, this.dataset.avatarUsername)"
                          >
                        `
                        : `
                          <div
                            class="stat-avatar stat-avatar-fallback"
                            data-roblox-fallback="${esc(avatarLookupName)}"
                          >
                            —
                          </div>
                        `
                    }

                    <div class="player-name-stack">
                      <span class="player-name">
                        ${esc(value)}
                      </span>

                      ${
                        teamName
                          ? `
                            <span class="player-subline">
                              ${esc(teamName)}
                            </span>
                          `
                          : ""
                      }
                    </div>

                  </div>

                </td>
              `;

            }


            return `
              <td class="numeric-stat">
                ${esc(
                  formatStatsCell(
                    header,
                    value
                  )
                )}
              </td>
            `;

          }
        )
        .join("")}

    </tr>
  `;

}


function showStatsMessage(message) {

  const title =
    document.getElementById(
      "statsPageTitle"
    );

  const head =
    document.getElementById(
      "statsTableHead"
    );

  const body =
    document.getElementById(
      "statsTableBody"
    );


  title.textContent =
    "Player Stats";


  head.innerHTML = "";


  body.innerHTML = `
    <tr>
      <td class="status-cell">
        ${esc(message)}
      </td>
    </tr>
  `;

}



/*
==================================================
SEASON / ALL TIME SWITCH
==================================================
*/

const seasonStatsBtn =
  document.getElementById(
    "seasonStatsBtn"
  );

const allTimeStatsBtn =
  document.getElementById(
    "allTimeStatsBtn"
  );

const refreshStatsBtn =
  document.getElementById(
    "refreshStatsBtn"
  );


if (seasonStatsBtn) {

  seasonStatsBtn.addEventListener(
    "click",
    async () => {

      if (
        currentStatsMode ===
        "season"
      ) {
        return;
      }

      currentStatsMode =
        "season";

      updateStatsModeUI();

      await loadStats();

    }
  );

}


if (allTimeStatsBtn) {

  allTimeStatsBtn.addEventListener(
    "click",
    async () => {

      if (
        currentStatsMode ===
        "alltime"
      ) {
        return;
      }

      currentStatsMode =
        "alltime";

      updateStatsModeUI();

      await loadStats();

    }
  );

}


if (refreshStatsBtn) {

  refreshStatsBtn.addEventListener(
    "click",
    async () => {

      refreshStatsBtn.disabled =
        true;

      refreshStatsBtn.textContent =
        "↻ Loading...";

      try {

        if (
          currentStatsMode ===
          "alltime"
        ) {
          allTimeData = null;
        } else {
          leagueData = null;
        }

        discordPlayers = [];
        discordPlayersLoadedAt = 0;

        discordPlayerLookup =
          new Map();

        await loadStats(
          true
        );

      } finally {

        refreshStatsBtn.disabled =
          false;

        refreshStatsBtn.textContent =
          "↻ Refresh";

      }

    }
  );

}



async function retryVisibleRobloxPictures() {
  const missing =
    [...document.querySelectorAll("[data-roblox-fallback]")];

  const queue =
    missing.filter(
      (item) =>
        item.dataset.robloxFallback
    );

  const workers =
    Math.min(3, queue.length);

  async function worker() {
    while (queue.length) {
      const fallback = queue.shift();

      if (!fallback?.isConnected) {
        continue;
      }

      const username =
        fallback.dataset.robloxFallback;

      const picture =
        await getDirectRobloxPicture(username);

      if (!picture || !fallback.isConnected) {
        continue;
      }

      const image =
        document.createElement("img");

      image.src = picture;
      image.alt = username;
      image.className = "stat-avatar";
      image.loading = "lazy";
      image.dataset.avatarUsername = username;
      image.onerror =
        () => handleStatAvatarError(image, username);

      fallback.replaceWith(image);
    }
  }

  await Promise.all(
    Array.from({ length: workers }, worker)
  );
}


async function fillMissingRobloxPictures() {

  const fallbacks =
    document.querySelectorAll(
      "[data-roblox-fallback]"
    );


  await Promise.all(
    [...fallbacks].map(
      async (fallback) => {

        const username =
          fallback.dataset
            .robloxFallback;

        if (!username) {
          return;
        }

        const picture =
          await getDirectRobloxPicture(
            username
          );

        if (!fallback.isConnected) {
          return;
        }

        if (!picture) {
          fallback.textContent =
            "—";
          return;
        }

        const image =
          document.createElement(
            "img"
          );

        image.src =
          picture;

        image.alt =
          username;

        image.className =
          "stat-avatar";

        image.loading =
          "lazy";

        image.dataset.avatarUsername =
          username;

        image.onerror =
          () => handleStatAvatarError(image, username);

        fallback.replaceWith(
          image
        );

      }
    )
  );
}


/*
==================================================
STATS SORTING
==================================================
*/

function getActualStatsHeader(
  requestedHeader
) {

  if (!requestedHeader) {
    return "";
  }

  const requested =
    normalize(requestedHeader)
      .replace(/\s+/g, "");

  return (
    activeStatsHeaders.find(
      (header) =>
        normalize(header)
          .replace(/\s+/g, "") ===
        requested
    ) || ""
  );
}


function getSortableValue(
  row,
  header
) {

  const value =
    row?.[header] ?? "";

  const numeric =
    Number(
      String(value)
        .replaceAll(",", "")
        .replace("%", "")
        .replace("+", "")
        .trim()
    );

  if (
    String(value).trim() !== "" &&
    Number.isFinite(numeric)
  ) {
    return {
      type: "number",
      value: numeric
    };
  }

  return {
    type: "text",
    value:
      String(value)
        .trim()
        .toLowerCase()
  };
}


function sortStatsRows(
  rows
) {

  const header =
    getActualStatsHeader(
      activeStatsSortHeader
    );

  if (!header) {
    return [...rows];
  }

  const direction =
    activeStatsSortDirection === "asc"
      ? 1
      : -1;

  return [...rows].sort(
    (a, b) => {

      const first =
        getSortableValue(
          a,
          header
        );

      const second =
        getSortableValue(
          b,
          header
        );

      if (
        first.type === "number" &&
        second.type === "number"
      ) {

        return (
          (first.value - second.value) *
          direction
        );

      }

      return (
        first.value.localeCompare(
          second.value
        ) *
        direction
      );

    }
  );
}


function updateStatsSortOptions() {

  const ptsHeader =
    activeStatsHeaders.find(
      (header) =>
        normalize(header) ===
        "pts"
    );


  if (ptsHeader) {

    activeStatsSortHeader =
      ptsHeader;

    activeStatsSortDirection =
      "desc";

  }

}


function rerenderActiveStats() {

  const searchInput =
    document.getElementById(
      "playerSearchInput"
    );

  const search =
    normalize(
      searchInput?.value || ""
    );

  let rows =
    activeStatsRows;

  if (search) {

    rows =
      rows.filter(
        (row) =>
          Object.values(row)
            .some(
              (value) =>
                normalize(value)
                  .includes(search)
            )
      );

  }

  rows =
    sortStatsRows(rows);

  renderStatsTable(
    activeStatsHeaders,
    rows
  );
}


/*
==================================================
PLAYER SEARCH
==================================================
*/

const playerSearchInput =
  document.getElementById(
    "playerSearchInput"
  );


playerSearchInput.addEventListener(
  "input",
  () => {
    rerenderActiveStats();
  }
);


/*
==================================================
SCORES + WEEK PICKER
==================================================
*/

async function loadSchedule() {

  const weekSelect =
    document.getElementById(
      "weekSelect"
    );

  const grid =
    document.getElementById(
      "scheduleGrid"
    );


  if (!SEASON4_SCHEDULE_READY) {
    if (weekSelect) {
      weekSelect.innerHTML = `<option value="">Schedule coming soon</option>`;
      weekSelect.disabled = true;
    }

    const title = document.getElementById("scoreWeekTitle");
    if (title) {
      title.textContent = "SEASON 4";
    }

    if (grid) {
      grid.innerHTML = `
        <div class="loading-card">
          Season 4 schedule coming soon. The new 24-team schedule will be added after it is built in Google Sheets.
        </div>
      `;
    }

    return;
  }


  try {

    const data =
      await getLeagueData();


    const schedule =
      data[SCHEDULE_SHEET];


    if (!Array.isArray(schedule)) {

      throw new Error(
        `Missing sheet: ${SCHEDULE_SHEET}`
      );

    }


    const validGames =
      schedule.filter(
        (game) =>
          String(
            game["Away Team"] ?? ""
          ).trim() !== "" &&
          String(
            game["Home Team"] ?? ""
          ).trim() !== ""
      );


    const weeks =
      [
        ...new Set(
          validGames
            .map(
              (game) =>
                String(
                  game.Week ?? ""
                ).trim()
            )
            .filter(Boolean)
        )
      ]
        .sort(
          (a, b) =>
            getWeekNumber(a) -
            getWeekNumber(b)
        );


    if (!weeks.length) {

      weekSelect.innerHTML = `
        <option value="">
          No weeks found
        </option>
      `;


      grid.innerHTML = `
        <div class="loading-card">
          No schedule weeks were found.
        </div>
      `;


      return;

    }


    weekSelect.innerHTML =
      weeks
        .map(
          (week) => `
            <option value="${esc(week)}">
              ${esc(week)}
            </option>
          `
        )
        .join("");


    /*
      Default to the latest week that has at least
      one completed score. If none are completed,
      use Week 1.
    */

    const completedWeeks =
      weeks.filter(
        (week) =>
          validGames.some(
            (game) =>
              String(
                game.Week ?? ""
              ).trim() ===
                week &&
              (
                String(
                  game[
                    "Away Final Score"
                  ] ?? ""
                ).trim() !== "" ||
                String(
                  game[
                    "Home Final Score"
                  ] ?? ""
                ).trim() !== ""
              )
          )
      );


    const defaultWeek =
      completedWeeks.length
        ? completedWeeks[
            completedWeeks.length - 1
          ]
        : weeks[0];


    weekSelect.value =
      defaultWeek;


    renderSelectedWeek(
      validGames,
      defaultWeek
    );


    weekSelect.addEventListener(
      "change",
      () => {

        renderSelectedWeek(
          validGames,
          weekSelect.value
        );

      }
    );


  } catch (error) {

    console.error(
      "Schedule error:",
      error
    );


    weekSelect.innerHTML = `
      <option value="">
        Unable to load weeks
      </option>
    `;


    grid.innerHTML = `
      <div class="loading-card">
        Unable to load scores.
      </div>
    `;

  }

}


function renderSelectedWeek(
  games,
  selectedWeek
) {

  const grid =
    document.getElementById(
      "scheduleGrid"
    );

  const title =
    document.getElementById(
      "scoreWeekTitle"
    );


  const filtered =
    games.filter(
      (game) =>
        String(
          game.Week ?? ""
        ).trim() ===
        selectedWeek
    );


  title.textContent =
    selectedWeek;


  renderSchedule(
    grid,
    filtered
  );

}


function renderSchedule(
  grid,
  games
) {

  if (!games.length) {

    grid.innerHTML = `
      <div class="loading-card">
        No games found for this week.
      </div>
    `;


    return;

  }


  grid.innerHTML =
    games
      .map(createGameCard)
      .join("");

}


function createGameCard(game) {

  const awayTeam =
    game["Away Team"] || "";

  const homeTeam =
    game["Home Team"] || "";

  const awayLogo =
    getTeamLogoByName(
      awayTeam,
      game["Away Logo"]
    );

  const homeLogo =
    getTeamLogoByName(
      homeTeam,
      game["Home Logo"]
    );

  const awayScore =
    game["Away Final Score"] || "";

  const homeScore =
    game["Home Final Score"] || "";

  const type =
    game.Type || "";

  const week =
    game.Week || "";

  const series =
    game.Series || "";

  const awayScoreText =
    String(awayScore).trim();

  const homeScoreText =
    String(homeScore).trim();

  const awayScoreNumber =
    Number(awayScoreText);

  const homeScoreNumber =
    Number(homeScoreText);

  const hasFinalScores =
    awayScoreText !== "" &&
    homeScoreText !== "" &&
    Number.isFinite(awayScoreNumber) &&
    Number.isFinite(homeScoreNumber);

  const awayWinner =
    hasFinalScores &&
    awayScoreNumber > homeScoreNumber;

  const homeWinner =
    hasFinalScores &&
    homeScoreNumber > awayScoreNumber;

  const winnerTextStyle =
    'font-weight:900;color:#7dd3fc;text-shadow:0 0 12px rgba(125,211,252,.35);';


  return `
    <article class="game-card">

      <div class="game-topline">

        <span>
          ${esc(week)}
        </span>

        <span>
          ${esc(type || series)}
        </span>

      </div>

      <div class="matchup">

        <div class="game-team">

          ${
            awayLogo
              ? `
                <img
                  src="${esc(awayLogo)}"
                  alt="${esc(awayTeam)}"
                  loading="lazy"
                >
              `
              : ""
          }

          <strong${awayWinner ? ` style="${winnerTextStyle}"` : ""}>
            ${esc(awayTeam)}
          </strong>

          ${
            String(awayScore).trim() !== ""
              ? `
                <span class="score"${awayWinner ? ` style="${winnerTextStyle}"` : ""}>
                  ${esc(awayScore)}
                </span>
              `
              : ""
          }

        </div>

        <div class="vs">
          VS
        </div>

        <div class="game-team">

          ${
            homeLogo
              ? `
                <img
                  src="${esc(homeLogo)}"
                  alt="${esc(homeTeam)}"
                  loading="lazy"
                >
              `
              : ""
          }

          <strong${homeWinner ? ` style="${winnerTextStyle}"` : ""}>
            ${esc(homeTeam)}
          </strong>

          ${
            String(homeScore).trim() !== ""
              ? `
                <span class="score"${homeWinner ? ` style="${winnerTextStyle}"` : ""}>
                  ${esc(homeScore)}
                </span>
              `
              : ""
          }

        </div>

      </div>

    </article>
  `;

}



/*
==================================================
NATIVE PREVIOUS SEASONS
==================================================
*/

const seasonArchiveCards =
  document.querySelectorAll(
    "[data-season-archive]"
  );

const seasonDetailPanels =
  document.querySelectorAll(
    "[data-season-detail]"
  );

const seasonArchiveBackButtons =
  document.querySelectorAll(
    "[data-season-archive-back]"
  );


seasonArchiveCards.forEach(
  (card) => {

    card.addEventListener(
      "click",
      () => {

        const season =
          String(
            card.dataset.seasonArchive ||
            "1"
          );

        document
          .querySelector(
            ".history-season-list"
          )
          ?.classList.add(
            "archive-hidden"
          );

        seasonDetailPanels.forEach(
          (panel) => {
            panel.classList.toggle(
              "active",
              panel.dataset.seasonDetail ===
                season
            );
          }
        );

        enhanceHistoricalSeasonLogos(
          season
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      }
    );

  }
);


seasonArchiveBackButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        seasonDetailPanels.forEach(
          (panel) =>
            panel.classList.remove(
              "active"
            )
        );

        document
          .querySelector(
            ".history-season-list"
          )
          ?.classList.remove(
            "archive-hidden"
          );

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      }
    );

  }
);


document
  .querySelectorAll(
    ".archive-tab"
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".archive-tab"
            )
            .forEach(
              (item) =>
                item.classList.remove(
                  "active"
                )
            );


          document
            .querySelectorAll(
              ".archive-content-panel"
            )
            .forEach(
              (panel) =>
                panel.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          document
            .getElementById(
              `archive-${button.dataset.archiveTab}`
            )
            ?.classList.add(
              "active"
            );

        }
      );

    }
  );


/*
==================================================
NATIVE RULEBOOK
==================================================
*/

document
  .querySelectorAll(
    ".rulebook-section-button"
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".rulebook-section-button"
            )
            .forEach(
              (item) =>
                item.classList.remove(
                  "active"
                )
            );


          document
            .querySelectorAll(
              ".rulebook-native-section"
            )
            .forEach(
              (section) =>
                section.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          document
            .getElementById(
              `rule-${button.dataset.ruleSection}`
            )
            ?.classList.add(
              "active"
            );

        }
      );

    }
  );



/*
==================================================
LIVE PLAYOFFS
==================================================

Google Sheet tab used after the playoffs begin:
  Playoff Bracket update

Columns:
  Conference | Round | Game | Winner

The standings still control seeds 1-6. You only enter the winner of
completed playoff games and the website advances that team automatically.
*/

function getPlayoffUpdateRows(data) {
  return Array.isArray(data?.[PLAYOFF_UPDATE_SHEET])
    ? data[PLAYOFF_UPDATE_SHEET]
    : [];
}

function normalizePlayoffLabel(value) {
  return normalize(value)
    .replace(/[^a-z0-9]/g, "");
}


/*
==================================================
PLAYOFF UPDATE SHEET LOOKUP
==================================================

Your existing Google Sheet uses these columns:

Game Key | Conference | Round | Matchup | Winner

Examples:
ATL-WC1
ATL-WC2
ATL-SF1
ATL-SF2
ATL-C
PAC-WC1
PAC-WC2
PAC-SF1
PAC-SF2
PAC-C
EFF-FINAL
*/

function getPlayoffWinnerByKey(updates, gameKey) {
  const target =
    normalizePlayoffLabel(gameKey);

  if (!target) {
    return "";
  }

  const row =
    updates.find((item) => {
      const value =
        item["Game Key"] ??
        item.GameKey ??
        item["Game"] ??
        "";

      return (
        normalizePlayoffLabel(value) ===
        target
      );
    });

  return String(
    row?.Winner || ""
  ).trim();
}


// Backward-compatible helper in case an older sheet format is ever used.
function getPlayoffWinnerName(
  updates,
  conference,
  round,
  game
) {
  const c = normalizePlayoffLabel(conference);
  const r = normalizePlayoffLabel(round);
  const g = normalizePlayoffLabel(game);

  const row = updates.find((item) => {
    return (
      normalizePlayoffLabel(item.Conference) === c &&
      normalizePlayoffLabel(item.Round) === r &&
      normalizePlayoffLabel(
        item.Game ??
        item.Matchup ??
        ""
      ) === g
    );
  });

  return String(row?.Winner || "").trim();
}

function findPlayoffTeamByName(standings, teamName) {
  if (!teamName) return null;

  return standings.find((team) =>
    teamNamesMatch(team.Team, teamName)
  ) || null;
}

function getPlayoffTeamSeed(team, seededTeams) {
  if (!team) return "";

  const index = seededTeams.findIndex((seeded) =>
    teamNamesMatch(seeded.Team, team.Team)
  );

  return index >= 0 ? index + 1 : "";
}

function playoffSeedTeam(team, seed, winnerName = "") {
  if (!team) {
    return `
      <div class="playoff-team-line playoff-team-tbd">
        <span class="playoff-seed">${esc(seed || "")}</span>
        <span class="playoff-team-logo-placeholder"></span>
        <strong>TBD</strong>
        <em></em>
      </div>
    `;
  }

  const isWinner = winnerName && teamNamesMatch(team.Team, winnerName);

  return `
    <div class="playoff-team-line ${isWinner ? "playoff-team-winner" : ""}">
      <span class="playoff-seed">${esc(seed)}</span>
      ${
        getTeamLogoByName(
          team.Team,
          team.Logo
        )
          ? `<img src="${esc(
              getTeamLogoByName(
                team.Team,
                team.Logo
              )
            )}" alt="${esc(team.Team || "")}" loading="lazy">`
          : `<span class="playoff-team-logo-placeholder"></span>`
      }
      <strong>${esc(team.Team || "TBD")}</strong>
      <em>${esc(team.Rec || "")}</em>
    </div>
  `;
}

function playoffMatchup(
  firstTeam,
  firstSeed,
  secondTeam,
  secondSeed,
  winnerName = "",
  extraClass = ""
) {
  return `
    <div class="playoff-matchup ${extraClass}">
      ${playoffSeedTeam(firstTeam, firstSeed, winnerName)}
      ${playoffSeedTeam(secondTeam, secondSeed, winnerName)}
    </div>
  `;
}


function sortPlayoffSeeds(a, b) {
  return sortDivisionStandings(
    a,
    b
  );
}


function buildConferencePlayoffSeeds(
  conferenceName,
  teams
) {
  const conferenceTeams =
    teams.filter(
      team =>
        normalize(
          team.Conference
        ) ===
        normalize(
          conferenceName
        )
    );

  const conferenceDivisions =
    Object.values(
      DIVISION_CONFIG
    ).filter(
      division =>
        normalize(
          division.conference
        ) ===
        normalize(
          conferenceName
        )
    );

  const divisionWinners =
    conferenceDivisions
      .map(
        division => {
          const divisionTeams =
            conferenceTeams
              .filter(
                team =>
                  division.teams.some(
                    divisionTeam =>
                      normalizeTeamName(
                        divisionTeam
                      ) ===
                      normalizeTeamName(
                        team.Team
                      )
                  )
              )
              .sort(
                sortPlayoffSeeds
              );

          return (
            divisionTeams[0] ||
            null
          );
        }
      )
      .filter(Boolean)
      .sort(
        sortPlayoffSeeds
      );

  const winnerNames =
    new Set(
      divisionWinners.map(
        team =>
          normalizeTeamName(
            team.Team
          )
      )
    );

  const wildCards =
    conferenceTeams
      .filter(
        team =>
          !winnerNames.has(
            normalizeTeamName(
              team.Team
            )
          )
      )
      .sort(
        sortPlayoffSeeds
      );

  return [
    ...divisionWinners,
    ...wildCards
  ].slice(0, 7);
}


function buildConferencePlayoffState(
  conferenceName,
  seededTeams,
  updates,
  allStandings
) {
  const seed = (number) =>
    seededTeams[number - 1] || null;

  const prefix =
    normalize(conferenceName) === "atlantic"
      ? "ATL"
      : "PAC";

  /*
    SEASON 3 — 7 TEAM FORMAT

    Seed 1: division winner, first-round bye.
    Seed 2: other division winner.
    Seeds 3-7: remaining best teams.

    Wild Card:
      WC1: 2 vs 7
      WC2: 3 vs 6
      WC3: 4 vs 5

    Divisional reseeding:
      Seed 1 always plays the WORST remaining seed
      (the highest seed number among the three Wild Card winners).

      The other two Wild Card winners play each other.
  */

  const wc27WinnerName =
    getPlayoffWinnerByKey(
      updates,
      `${prefix}-WC1`
    );

  const wc36WinnerName =
    getPlayoffWinnerByKey(
      updates,
      `${prefix}-WC2`
    );

  const wc45WinnerName =
    getPlayoffWinnerByKey(
      updates,
      `${prefix}-WC3`
    );

  const wc27Winner =
    findPlayoffTeamByName(
      allStandings,
      wc27WinnerName
    );

  const wc36Winner =
    findPlayoffTeamByName(
      allStandings,
      wc36WinnerName
    );

  const wc45Winner =
    findPlayoffTeamByName(
      allStandings,
      wc45WinnerName
    );

  const wildCardWinners =
    [
      wc27Winner,
      wc36Winner,
      wc45Winner
    ]
      .filter(Boolean)
      .map((team) => ({
        team,
        seed:
          getPlayoffTeamSeed(
            team,
            seededTeams
          )
      }))
      .filter(
        (entry) =>
          Number.isFinite(entry.seed) &&
          entry.seed > 0
      );

  let seedOneOpponent = null;
  let seedOneOpponentSeed = "";
  let otherDivisionalFirst = null;
  let otherDivisionalFirstSeed = "";
  let otherDivisionalSecond = null;
  let otherDivisionalSecondSeed = "";

  if (wildCardWinners.length === 3) {
    wildCardWinners.sort(
      (a, b) =>
        b.seed - a.seed
    );

    seedOneOpponent =
      wildCardWinners[0].team;

    seedOneOpponentSeed =
      wildCardWinners[0].seed;

    otherDivisionalFirst =
      wildCardWinners[1].team;

    otherDivisionalFirstSeed =
      wildCardWinners[1].seed;

    otherDivisionalSecond =
      wildCardWinners[2].team;

    otherDivisionalSecondSeed =
      wildCardWinners[2].seed;
  }

  const div1WinnerName =
    getPlayoffWinnerByKey(
      updates,
      `${prefix}-SF1`
    );

  const div2WinnerName =
    getPlayoffWinnerByKey(
      updates,
      `${prefix}-SF2`
    );

  const div1Winner =
    findPlayoffTeamByName(
      allStandings,
      div1WinnerName
    );

  const div2Winner =
    findPlayoffTeamByName(
      allStandings,
      div2WinnerName
    );

  const conferenceWinnerName =
    getPlayoffWinnerByKey(
      updates,
      `${prefix}-C`
    );

  const conferenceWinner =
    findPlayoffTeamByName(
      allStandings,
      conferenceWinnerName
    );

  return {
    seededTeams,

    wc27: {
      first: seed(2),
      firstSeed: 2,
      second: seed(7),
      secondSeed: 7,
      winnerName: wc27WinnerName
    },

    wc36: {
      first: seed(3),
      firstSeed: 3,
      second: seed(6),
      secondSeed: 6,
      winnerName: wc36WinnerName
    },

    wc45: {
      first: seed(4),
      firstSeed: 4,
      second: seed(5),
      secondSeed: 5,
      winnerName: wc45WinnerName
    },

    div1: {
      first: seed(1),
      firstSeed: 1,
      second: seedOneOpponent,
      secondSeed: seedOneOpponentSeed,
      winnerName: div1WinnerName
    },

    div2: {
      first: otherDivisionalFirst,
      firstSeed: otherDivisionalFirstSeed,
      second: otherDivisionalSecond,
      secondSeed: otherDivisionalSecondSeed,
      winnerName: div2WinnerName
    },

    conferenceFinal: {
      first: div1Winner,
      firstSeed:
        getPlayoffTeamSeed(
          div1Winner,
          seededTeams
        ),
      second: div2Winner,
      secondSeed:
        getPlayoffTeamSeed(
          div2Winner,
          seededTeams
        ),
      winnerName:
        conferenceWinnerName
    },

    champion:
      conferenceWinner
  };
}

function buildConferencePlayoffSide(conferenceName, state, side) {
  const wildCardOne = playoffMatchup(
    state.wc27.first,
    state.wc27.firstSeed,
    state.wc27.second,
    state.wc27.secondSeed,
    state.wc27.winnerName
  );

  const wildCardTwo = playoffMatchup(
    state.wc36.first,
    state.wc36.firstSeed,
    state.wc36.second,
    state.wc36.secondSeed,
    state.wc36.winnerName
  );

  const wildCardThree = playoffMatchup(
    state.wc45.first,
    state.wc45.firstSeed,
    state.wc45.second,
    state.wc45.secondSeed,
    state.wc45.winnerName
  );

  const divisionalOne = playoffMatchup(
    state.div1.first,
    state.div1.firstSeed,
    state.div1.second,
    state.div1.secondSeed,
    state.div1.winnerName
  );

  const divisionalTwo = playoffMatchup(
    state.div2.first,
    state.div2.firstSeed,
    state.div2.second,
    state.div2.secondSeed,
    state.div2.winnerName
  );

  const conferenceFinal = playoffMatchup(
    state.conferenceFinal.first,
    state.conferenceFinal.firstSeed,
    state.conferenceFinal.second,
    state.conferenceFinal.secondSeed,
    state.conferenceFinal.winnerName,
    "playoff-conference-final"
  );

  return `
    <div class="playoff-conference-side playoff-side-${side}">
      <div class="playoff-conference-heading">
        <span>${esc(conferenceName.toUpperCase())}</span>
        <h3>${esc(conferenceName)} Conference</h3>
      </div>

      <div class="playoff-rounds-grid">
        <div class="playoff-round playoff-round-wildcard">
          <div class="playoff-round-label">Wild Card</div>
          <div class="playoff-round-content">
            ${wildCardOne}
            ${wildCardTwo}
            ${wildCardThree}
          </div>
        </div>

        <div class="playoff-round playoff-round-divisional">
          <div class="playoff-round-label">Divisional</div>
          <div class="playoff-round-content playoff-round-centered">
            ${divisionalOne}
            ${divisionalTwo}
          </div>
        </div>

        <div class="playoff-round playoff-round-conference">
          <div class="playoff-round-label">Conference Championship</div>
          <div class="playoff-round-content playoff-round-centered">
            ${conferenceFinal}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderLivePlayoffBracket(
  atlantic,
  pacific,
  updates,
  allStandings
) {
  const container = document.getElementById("livePlayoffBracket");

  if (!container) return;

  const atlanticState = buildConferencePlayoffState(
    "Atlantic",
    atlantic,
    updates,
    allStandings
  );

  const pacificState = buildConferencePlayoffState(
    "Pacific",
    pacific,
    updates,
    allStandings
  );

  const finalWinnerName =
    getPlayoffWinnerByKey(
      updates,
      "EFF-FINAL"
    );

  const atlanticChampion = atlanticState.champion;
  const pacificChampion = pacificState.champion;

  const atlanticChampionSeed = getPlayoffTeamSeed(
    atlanticChampion,
    atlantic
  );

  const pacificChampionSeed = getPlayoffTeamSeed(
    pacificChampion,
    pacific
  );

  container.innerHTML = `
    <div class="playoff-master-grid">
      ${buildConferencePlayoffSide("Atlantic", atlanticState, "left")}

      <div class="playoff-championship-center">
        <div class="playoff-championship-label">EFF Championship</div>
        <div class="playoff-championship-card">
          <span class="playoff-trophy">🏆</span>
          <h3>Season 4 Final</h3>
          ${playoffSeedTeam(
            atlanticChampion,
            atlanticChampionSeed,
            finalWinnerName
          )}
          <div class="playoff-final-vs">VS</div>
          ${playoffSeedTeam(
            pacificChampion,
            pacificChampionSeed,
            finalWinnerName
          )}
          ${
            finalWinnerName
              ? `<div class="playoff-champion-banner">CHAMPION · ${esc(finalWinnerName)}</div>`
              : ""
          }
        </div>
      </div>

      ${buildConferencePlayoffSide("Pacific", pacificState, "right")}
    </div>
  `;
}

async function loadPlayoffs(forceRefresh = false) {
  const container = document.getElementById("livePlayoffBracket");

  if (!container) return;

  if (forceRefresh) {
    leagueData = null;
  }

  container.innerHTML = `<div class="loading-card">Loading current playoff bracket...</div>`;

  try {
    const data = await getLeagueData();
    const standings = Array.isArray(data?.[STANDINGS_SHEET])
      ? data[STANDINGS_SHEET].filter(
          team =>
            isActiveFranchise(
              team.Team
            )
        )
      : [];

    const updates = getPlayoffUpdateRows(data);

    const atlantic =
      buildConferencePlayoffSeeds(
        "Atlantic",
        standings
      );

    const pacific =
      buildConferencePlayoffSeeds(
        "Pacific",
        standings
      );

    renderLivePlayoffBracket(
      atlantic,
      pacific,
      updates,
      standings
    );
  } catch (error) {
    console.error("Playoff bracket error:", error);
    container.innerHTML = `
      <div class="loading-card">
        Unable to load the live playoff bracket.
      </div>
    `;
  }
}

const refreshPlayoffsBtn =
  document.getElementById("refreshPlayoffsBtn");

if (refreshPlayoffsBtn) {
  refreshPlayoffsBtn.addEventListener("click", async () => {
    refreshPlayoffsBtn.disabled = true;
    refreshPlayoffsBtn.textContent = "↻ Loading...";

    try {
      await loadPlayoffs(true);
      await Promise.allSettled([
        loadStandings(),
        loadTeams(),
        renderHomeStandingsPreview()
      ]);
    } finally {
      refreshPlayoffsBtn.disabled = false;
      refreshPlayoffsBtn.textContent = "↻ Refresh Bracket";
    }
  });
}



/*
==================================================
LEGACY RECORD BOOK
==================================================
*/
const LEGACY_POSITION_LABELS = {
  "quarterback":"QB","runningback":"RB","center":"C","tight end":"TE",
  "wide receiver":"WR","defensive end":"DE","defensive back":"DB","kicker":"K"
};

const LEGACY_BADGES = [
  {group:"QB",name:"Air Commander",emoji:"🚀",metric:"passYards",unit:"passing yards",tiers:[2500,6500,13000,25000]},
  {group:"QB",name:"Touchdown Dealer",emoji:"🎯",metric:"passTD",unit:"passing TD",tiers:[30,80,170,350]},
  {group:"QB",name:"Precision Passer",emoji:"🧭",type:"highPctVolume",pctMetric:"completionPct",volumeMetric:"passAttempts",pctUnit:"C%",volumeUnit:"ATT",tiers:[[55,150],[60,350],[65,700],[70,1250]]},
  {group:"QB",name:"Clutch QB",emoji:"⏱️",metric:"clutchConversions",unit:"3rd/4th conversions",tiers:[25,65,140,275]},
  {group:"RB",name:"Ground Force",emoji:"🌪️",metric:"rushYards",unit:"rushing yards",tiers:[1000,3000,7500,15000]},
  {group:"RB",name:"End Zone Runner",emoji:"🏁",metric:"rushTD",unit:"rushing TD",tiers:[20,50,110,225]},
  {group:"REC",name:"Deep Threat",emoji:"⚡",metric:"recYards",unit:"receiving yards",tiers:[1500,5000,12500,25000]},
  {group:"REC",name:"Hands Team",emoji:"🧤",metric:"receptions",unit:"receptions",tiers:[50,150,350,600]},
  {group:"REC",name:"YAC Monster",emoji:"🐲",metric:"yac",unit:"YAC",tiers:[750,2000,5000,10000]},
  {group:"REC",name:"Touchdown Machine",emoji:"🔥",metric:"recTD",unit:"receiving TD",tiers:[20,75,150,325]},
  {group:"C",name:"Iron Wall",emoji:"🧱",metric:"snaps",unit:"snaps",tiers:[500,1250,2500,5000]},
  {group:"C",name:"Pressure Proof",emoji:"🛡️",type:"lowPctVolume",pctMetric:"pressurePct",volumeMetric:"snaps",pctUnit:"pressure rate",volumeUnit:"snaps",tiers:[[10,500],[8,1250],[6,2500],[4,5000]]},
  {group:"DE",name:"Sack Artist",emoji:"💥",metric:"sacks",unit:"sacks",tiers:[20,50,100,175]},
  {group:"DE",name:"Backfield Menace",emoji:"😈",metric:"pressures",unit:"pressures",tiers:[100,250,500,1000]},
  {group:"DE",name:"QB Hunter",emoji:"🐺",metric:"qbHits",unit:"QB hits",tiers:[25,75,125,200]},
  {group:"DB",name:"Ball Hawk",emoji:"🦅",metric:"interceptions",unit:"INT",tiers:[10,25,50,100]},
  {group:"DB",name:"Shutdown",emoji:"🔒",type:"lowPctVolume",pctMetric:"completionAllowedPct",volumeMetric:"targets",pctUnit:"CA",volumeUnit:"targets",tiers:[[55,50],[50,125],[45,200],[40,350]]},
  {group:"DB",name:"Pick Six",emoji:"6️⃣",metric:"pickSix",unit:"pick-sixes",tiers:[2,5,10,20]},
  {group:"K",name:"Automatic",emoji:"✅",metric:"fgMade",unit:"made FG",tiers:[25,60,125,250]},
  {group:"K",name:"Sniper",emoji:"🏹",type:"highPctVolume",pctMetric:"fgPct",volumeMetric:"fgAttempts",pctUnit:"FG",volumeUnit:"attempts",tiers:[[75,25],[80,60],[85,125],[90,250]]}
];

const LEGACY_TIER_NAMES = ["Bronze","Silver","Gold","Diamond"];
let legacyCareerPlayers = null;
let legacyLoaded = false;

function addLegacyStat(target,key,value){
  const n=Number(value);
  if(!Number.isFinite(n) || n===0) return;
  target[key]=(Number(target[key])||0)+n;
}

function getLegacyPositionStats(row,label){
  const out={};
  const n=(aliases)=>statNumber(row,aliases);
  if(label==="QB"){
    out.passYards=n(["YDS","Yards","Passing Yards","Pass Yards"]);
    out.passTD=n(["TDS","TD","Touchdowns","Passing TD","Passing TDs","Pass TD"]);
    out.passAttempts=n(["ATT","Attempts","Pass Attempts","Passing Attempts"]);
    out.completions=n(["CMP","COMP","Completions","Completed","C"]);
    out.completionPct=n(["C%","CMP%","COMP%","Completion %","Completion Percentage"]);
    out.clutchConversions=n(["3RD","3rd Conv","3rd Conversions","3rd Down Conversions","3DC"])+n(["4TH","4th Conv","4th Conversions","4th Down Conversions","4DC"]);
  }else if(label==="RB"){
    out.rushYards=n(["Rushing Yards","Rush Yards","RUSH YDS","RYDS","YDS"]);
    out.rushTD=n(["TDS","TD","Touchdowns","Rush TD","Rushing TD","Rushing TDs"]);
  }else if(label==="WR" || label==="TE"){
    out.recYards=n(["Receiving Yards","REC YDS","YDS","Yards"]);
    out.receptions=n(["REC","Receptions"]);
    out.yac=n(["YAC","Yards After Catch"]);
    out.recTD=n(["TDS","TD","Touchdowns","Receiving TD","Receiving TDs"]);
  }else if(label==="C"){
    out.snaps=n(["SNAP","SNAPS","Snaps"]);
    out.pressuresAllowed=n(["PRS","Pressures","Pressures Allowed","Pressure Allowed"]);
  }else if(label==="DE"){
    out.sacks=n(["SCK","SACK","SACKS","Sacks"]);
    out.pressures=n(["PRS","Pressures"]);
    out.qbHits=n(["QBH","QB Hits","QB Hit","Hits"]);
  }else if(label==="DB"){
    out.interceptions=n(["INT","INTS","Interceptions"]);
    out.targets=n(["TRGT","Targets","Target","TGTS"]);
    out.completionsAllowed=n(["CA","Completions Allowed","Catches Allowed"]);
    out.completionAllowedPct=n(["CA%","Completion Allowed %","Completions Allowed %","Catch Allowed %"]);
    out.pickSix=n(["PK6","PICK 6","PICK6","Pick Six","Pick Sixes"]);
  }else if(label==="K"){
    out.fgMade=n(["Made","MADE","FGM","Field Goals Made","Makes"]);
    out.fgAttempts=n(["ATT","Attempts","FGA","Field Goal Attempts"]);
    out.fgPct=n(["FG%","FG %","Field Goal %","Field Goal Percentage"]);
  }
  return out;
}

function mergeLegacyPositionStats(target,source,label){
  target[label]=target[label]||{};
  const t=target[label];
  for(const [key,value] of Object.entries(source)){
    if(key.endsWith("Pct")){
      const volumeKey=label==="QB"?"passAttempts":label==="DB"?"targets":label==="K"?"fgAttempts":"";
      const volume=Number(source[volumeKey])||0;
      if(value>0 && volume>0){
        t[key+"Weighted"]=(Number(t[key+"Weighted"])||0)+value*volume;
        t[key+"Volume"]=(Number(t[key+"Volume"])||0)+volume;
      }else if(value>0 && !t[key]) t[key]=value;
    }else addLegacyStat(t,key,value);
  }
}

function finalizeLegacyStats(stats){
  for(const [label,t] of Object.entries(stats||{})){
    if(label==="QB"){
      if((t.completions||0)>0 && (t.passAttempts||0)>0) t.completionPct=(t.completions/t.passAttempts)*100;
      else if((t.completionPctVolume||0)>0) t.completionPct=t.completionPctWeighted/t.completionPctVolume;
    }
    if(label==="C" && (t.snaps||0)>0) t.pressurePct=((t.pressuresAllowed||0)/t.snaps)*100;
    if(label==="DB"){
      if((t.completionsAllowed||0)>0 && (t.targets||0)>0) t.completionAllowedPct=(t.completionsAllowed/t.targets)*100;
      else if((t.completionAllowedPctVolume||0)>0) t.completionAllowedPct=t.completionAllowedPctWeighted/t.completionAllowedPctVolume;
    }
    if(label==="K"){
      if(Object.prototype.hasOwnProperty.call(t,"fgMade") && (t.fgAttempts||0)>0) t.fgPct=((t.fgMade||0)/t.fgAttempts)*100;
      else if((t.fgPctVolume||0)>0) t.fgPct=t.fgPctWeighted/t.fgPctVolume;
    }
  }
  const rec={};
  for(const label of ["WR","TE"]){
    for(const [key,value] of Object.entries(stats?.[label]||{})){
      if(!key.endsWith("Weighted") && !key.endsWith("Volume") && key!=="completionPct") addLegacyStat(rec,key,value);
    }
  }
  stats.REC=rec;
  return stats;
}

async function buildLegacyCareerPlayers(forceRefresh=false){
  if(legacyCareerPlayers && !forceRefresh) return legacyCareerPlayers;
  const data = await getStatsSourceData("alltime", forceRefresh);
  const combined = new Map();
  for(const sheetName of Object.keys(LEGACY_POSITION_LABELS)){
    const label=LEGACY_POSITION_LABELS[sheetName];
    const rawRows = Array.isArray(data?.[sheetName]) ? data[sheetName] : [];
    const normalized = normalizeStatSheetRows(rawRows,sheetName);
    const rows = applyCalculatedPoints(sheetName, normalized.rows);
    for(const row of rows){
      const name = getStatsPlayerName(row);
      if(!name) continue;
      const pts = getStatsPointsValue(row);
      if(!Number.isFinite(pts)) continue;
      const key = getAwardPlayerKey(name);
      if(!key) continue;
      const current = combined.get(key) || {name, total:0, positions:{}, stats:{}};
      current.total += pts;
      current.positions[label] = (current.positions[label] || 0) + pts;
      mergeLegacyPositionStats(current.stats,getLegacyPositionStats(row,label),label);
      combined.set(key,current);
    }
  }
  legacyCareerPlayers = [...combined.values()].map(player=>({...player,stats:finalizeLegacyStats(player.stats||{})}));
  return legacyCareerPlayers;
}

function getLegacyBadgeStats(player,badge){
  return player?.stats?.[badge.group]||{};
}

function legacyBadgeMeets(stats,badge,tierIndex){
  if(badge.type==="highPctVolume"){
    const [pct,volume]=badge.tiers[tierIndex];
    return Number(stats[badge.pctMetric]||0)>=pct && Number(stats[badge.volumeMetric]||0)>=volume;
  }
  if(badge.type==="lowPctVolume"){
    const [pct,volume]=badge.tiers[tierIndex];
    const currentPct=Number(stats[badge.pctMetric]);
    const currentVolume=Number(stats[badge.volumeMetric]||0);
    return Number.isFinite(currentPct) && currentVolume>0 && currentPct<=pct && currentVolume>=volume;
  }
  return Number(stats[badge.metric]||0)>=Number(badge.tiers[tierIndex]);
}

function getLegacyBadgeTier(stats,badge){
  for(let i=3;i>=0;i--) if(legacyBadgeMeets(stats,badge,i)) return i;
  return -1;
}

function formatLegacyAchievementValue(value,percent=false){
  const n=Number(value)||0;
  if(percent) return `${n.toFixed(1)}%`;
  return Math.round(n).toLocaleString();
}

function getLegacyBadgeProgress(stats,badge,nextTier){
  if(nextTier<0) return 100;
  if(badge.type==="highPctVolume"){
    const [pct,volume]=badge.tiers[nextTier];
    return Math.max(0,Math.min(100,Math.min((Number(stats[badge.pctMetric]||0)/pct)*100,(Number(stats[badge.volumeMetric]||0)/volume)*100)));
  }
  if(badge.type==="lowPctVolume"){
    const [pct,volume]=badge.tiers[nextTier];
    const currentPct=Number(stats[badge.pctMetric]||0);
    const currentVolume=Number(stats[badge.volumeMetric]||0);
    const quality=currentVolume>0?(currentPct<=pct?1:Math.min(1,pct/currentPct)):0;
    const volumeProgress=Math.min(1,currentVolume/volume);
    return Math.max(0,Math.min(100,Math.min(quality,volumeProgress)*100));
  }
  return Math.max(0,Math.min(100,(Number(stats[badge.metric]||0)/Number(badge.tiers[nextTier]))*100));
}

function getLegacyBadgeText(stats,badge,tierIndex){
  const next=tierIndex>=3?-1:tierIndex+1;
  if(badge.type==="highPctVolume" || badge.type==="lowPctVolume"){
    const currentPct=Number(stats[badge.pctMetric]||0);
    const currentVolume=Number(stats[badge.volumeMetric]||0);
    const current=`${formatLegacyAchievementValue(currentPct,true)} · ${formatLegacyAchievementValue(currentVolume)} ${badge.volumeUnit}`;
    if(next<0) return {current,next:"Maximum tier unlocked"};
    const [pct,volume]=badge.tiers[next];
    const comparator=badge.type==="lowPctVolume"?"or lower":"or higher";
    return {current,next:`${LEGACY_TIER_NAMES[next]}: ${pct}% ${badge.pctUnit} ${comparator} + ${volume.toLocaleString()} ${badge.volumeUnit}`};
  }
  const currentValue=Number(stats[badge.metric]||0);
  if(next<0) return {current:`${formatLegacyAchievementValue(currentValue)} ${badge.unit}`,next:"Maximum tier unlocked"};
  return {current:`${formatLegacyAchievementValue(currentValue)} ${badge.unit}`,next:`${LEGACY_TIER_NAMES[next]}: ${Number(badge.tiers[next]).toLocaleString()} ${badge.unit}`};
}

function renderLegacyAchievements(player){
  const container=document.getElementById("legacyProfileAchievements");
  const countEl=document.getElementById("legacyBadgeUnlockedCount");
  const summaryEl=document.getElementById("legacyBadgeTierSummary");
  if(!container) return;
  const activeGroups=new Set();
  for(const group of ["QB","RB","REC","C","DE","DB","K"]){
    const stats=player?.stats?.[group]||{};
    if(Object.values(stats).some(v=>Number(v)>0)) activeGroups.add(group);
  }
  let unlocked=0;
  const tierCounts=[0,0,0,0];
  const cardsByGroup={};
  for(const badge of LEGACY_BADGES){
    if(!activeGroups.has(badge.group)) continue;
    const stats=getLegacyBadgeStats(player,badge);
    const tier=getLegacyBadgeTier(stats,badge);
    if(tier>=0){unlocked++;tierCounts[tier]++;}
    const next=tier>=3?-1:tier+1;
    const text=getLegacyBadgeText(stats,badge,tier);
    const progress=getLegacyBadgeProgress(stats,badge,next);
    const tierName=tier>=0?LEGACY_TIER_NAMES[tier]:"Locked";
    const tierClass=tier>=0?LEGACY_TIER_NAMES[tier].toLowerCase():"none";
    const card=`<article class="legacy-achievement"><div class="legacy-achievement-top"><div class="legacy-achievement-emoji">${badge.emoji}</div><div class="legacy-achievement-name"><strong>${esc(badge.name)}</strong><span>${esc(badge.group==="REC"?"WR / TE":badge.group)} Career Badge</span></div><span class="legacy-tier-pill legacy-tier-${tierClass}">${esc(tierName)}</span></div><div class="legacy-achievement-progress-row"><span>Current</span><strong>${esc(text.current)}</strong></div><div class="legacy-achievement-bar"><span style="width:${progress.toFixed(1)}%"></span></div><div class="legacy-achievement-next"><strong>Next:</strong> ${esc(text.next)}</div></article>`;
    (cardsByGroup[badge.group] ||= []).push(card);
  }
  const groupNames={QB:"Quarterback",RB:"Running Back",REC:"Receiver",C:"Center",DE:"Pass Rush",DB:"Coverage",K:"Kicking"};
  container.innerHTML=Object.keys(cardsByGroup).length?Object.entries(cardsByGroup).map(([group,cards])=>`<section class="legacy-achievement-group"><div class="legacy-achievement-group-head"><span>${esc(group)}</span><strong>${esc(groupNames[group]||group)}</strong></div><div class="legacy-achievement-grid">${cards.join("")}</div></section>`).join(""):'<div class="legacy-achievement-empty">No tracked all-time stats found for this player yet.</div>';
  if(countEl) countEl.textContent=`${unlocked} / ${LEGACY_BADGES.length}`;
  if(summaryEl){
    const pieces=[];
    for(let i=3;i>=0;i--) if(tierCounts[i]) pieces.push(`${tierCounts[i]} ${LEGACY_TIER_NAMES[i]}`);
    summaryEl.textContent=pieces.join(" · ")||"No tiers yet";
  }
}

const LEGACY_XP_VALUES = Object.freeze({
  potw:100,
  firstTeam:500,
  secondTeam:250,
  thirdTeam:150,
  standout:250,
  poty:750,
  divisionChampion:250,
  conferenceChampion:500,
  superBowlRing:1250,
  eventRing:500,
  mvp:1000
});
const LEGACY_BADGE_XP = Object.freeze({bronze:50,silver:125,gold:250,diamond:500});
let legacyXPPlayers = null;
let legacySortMode = "xp";
let legacySearchTerm = "";

function cleanLegacyRoleName(value){
  return String(value||"").replace(/^[^A-Za-z0-9]+/g,"").trim();
}
function legacyRoleMultiplier(name){
  const match=String(name||"").match(/(?:^|\s)(\d+)\s*x\b/i);
  return match?Math.max(1,Number(match[1])||1):1;
}
function legacySimpleName(value){
  return cleanLegacyRoleName(value).toLowerCase().replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
}
function legacyAccoladeFromRole(role){
  const raw=cleanLegacyRoleName(role?.name||"");
  if(!raw) return null;
  const lower=legacySimpleName(raw);
  const mult=legacyRoleMultiplier(raw);
  const make=(key,label,emoji,unitXP,count=mult)=>({key,label,emoji,unitXP,count,xp:unitXP*count,roleName:raw});

  if(role?.badgeTier && role?.badgeName){
    const tier=String(role.badgeTier).toLowerCase();
    const unitXP=LEGACY_BADGE_XP[tier]||0;
    if(!unitXP) return null;
    return {key:`badge:${normalize(role.badgeName)}`,label:`${role.badgeName} · ${tier[0].toUpperCase()+tier.slice(1)}`,emoji:"🎖️",unitXP,count:1,xp:unitXP,roleName:raw,badgeName:role.badgeName,badgeTier:tier,isBadge:true};
  }
  if(/\bpotw\b/i.test(raw) || /player of the week/i.test(lower)) return make("potw","Player of the Week","🟡",LEGACY_XP_VALUES.potw);
  if(/(?:^|\b)(?:1st|first)\s*(?:team|all[- ]?pro)/i.test(lower)) return make("firstTeam","1st Team","⭐",LEGACY_XP_VALUES.firstTeam);
  if(/(?:^|\b)(?:2nd|second)\s*(?:team|all[- ]?pro)/i.test(lower)) return make("secondTeam","2nd Team","⭐",LEGACY_XP_VALUES.secondTeam);
  if(/(?:^|\b)(?:3rd|third)\s*(?:team|all[- ]?pro)/i.test(lower)) return make("thirdTeam","3rd Team","⭐",LEGACY_XP_VALUES.thirdTeam);
  if(/\b(?:qb|rb|wr|te|c|de|db|k)\s*standout\b/i.test(lower)) return make("standout",raw.replace(/^\d+\s*x\s*[-–—]?\s*/i,""),"🌟",LEGACY_XP_VALUES.standout);
  if(/\b(?:qb|rb|wr|te|c|de|db|k)oty\b/i.test(lower) || /player of the year/i.test(lower)) return make("poty",raw.replace(/^\d+\s*x\s*[-–—]?\s*/i,""),"🏅",LEGACY_XP_VALUES.poty);
  if(/\bmvp\b/i.test(lower) && !/super\s*bowl/i.test(lower)) return make("mvp","League MVP","👑",LEGACY_XP_VALUES.mvp);
  if(/(?:cascade|colonial|gulf|sunset).*\bchamp/i.test(lower) || /division\s+champ/i.test(lower)) return make("divisionChampion",raw,"🏆",LEGACY_XP_VALUES.divisionChampion,1);
  if(/\b(?:pcc|acc)\b.*\bchamp/i.test(lower) || /conference\s+champ/i.test(lower)) return make("conferenceChampion",raw,"🏆",LEGACY_XP_VALUES.conferenceChampion,1);
  if(/halloween/i.test(lower) || /event\s+(?:ring|champ)/i.test(lower)) return make("eventRing",raw,"🎃",LEGACY_XP_VALUES.eventRing,1);
  if(/^s\d+$/i.test(lower) || /super\s*bowl.*(?:ring|champ)/i.test(lower) || /(?:championship|superbowl)\s+ring/i.test(lower)) return make("superBowlRing",raw,"🏆",LEGACY_XP_VALUES.superBowlRing,1);
  return null;
}



function legacySeasonNumbersFromRoleNames(item){
  const values=[item?.roleName,...(Array.isArray(item?.roleNames)?item.roleNames:[])].filter(Boolean);
  const seasons=[];
  for(const value of values){
    const matches=String(value).matchAll(/(?:^|\s)S(?:eason\s*)?(\d+)\b/gi);
    for(const match of matches){
      const season=Number(match[1]);
      if(Number.isFinite(season)&&season>0&&!seasons.includes(season)) seasons.push(season);
    }
  }
  return seasons.sort((a,b)=>a-b);
}

function legacyHistoryPanelSeason(panel){
  const attr=Number(panel?.dataset?.seasonDetail||0);
  if(attr) return attr;
  const text=panel?.querySelector('.history-detail-header h2')?.textContent||'';
  const match=text.match(/SEASON\s+(\d+)/i);
  return match?Number(match[1]):0;
}

function legacyHistoryPlayerMatches(node,playerName){
  return normalizePlayerName(node?.textContent||'')===normalizePlayerName(playerName);
}

function legacyHistorySeasonsForAccolade(playerName,item){
  const direct=legacySeasonNumbersFromRoleNames(item);
  if(direct.length) return direct;

  const panels=[...document.querySelectorAll('.history-season-detail[data-season-detail]')];
  const found=[];
  const add=panel=>{
    const season=legacyHistoryPanelSeason(panel);
    if(season&&!found.includes(season)) found.push(season);
  };

  for(const panel of panels){
    if(item.key==='firstTeam'||item.key==='secondTeam'||item.key==='thirdTeam'){
      const wanted=item.key==='firstTeam'?'1ST TEAM':item.key==='secondTeam'?'2ND TEAM':'3RD TEAM';
      for(const card of panel.querySelectorAll('.history-list-card')){
        const label=(card.querySelector('.mini-label')?.textContent||'').trim().toUpperCase();
        if(label!==wanted) continue;
        if([...card.querySelectorAll('strong')].some(node=>legacyHistoryPlayerMatches(node,playerName))) add(panel);
      }
    }else if(item.key==='poty'||item.key==='mvp'){
      const wanted=String(item.label||'').trim().toUpperCase();
      for(const row of panel.querySelectorAll('.award-list li')){
        const code=(row.querySelector('span')?.textContent||'').trim().toUpperCase();
        const name=row.querySelector('strong');
        if(!legacyHistoryPlayerMatches(name,playerName)) continue;
        if(item.key==='mvp'){
          if(/MVP/.test(code)) add(panel);
        }else if(code===wanted || (/OTY$/.test(code)&&/OTY$/.test(wanted)&&code===wanted)) add(panel);
      }
    }else if(item.key==='standout'){
      const position=String(item.label||'').trim().split(/\s+/)[0].toUpperCase();
      for(const section of panel.querySelectorAll('.season-history-block')){
        const heading=(section.querySelector('.season-history-block-header h3')?.textContent||'').toLowerCase();
        if(!heading.includes('standout')) continue;
        for(const row of section.querySelectorAll('.award-list li')){
          const pos=(row.querySelector('span')?.textContent||'').trim().toUpperCase();
          if(pos===position && legacyHistoryPlayerMatches(row.querySelector('strong'),playerName)) add(panel);
        }
      }
    }
  }

  return found.sort((a,b)=>a-b);
}

function legacyHistoricalHonorDetails(playerName,item){
  const seasons=legacyHistorySeasonsForAccolade(playerName,item);
  return seasons.map(season=>{
    const team=getHistoricalTeamName(playerName,season);
    return {season,team};
  });
}

function legacyCareerHonorDisplayLabel(item){
  if(item?.key==='superBowlRing') return 'Super Bowl Champion';
  if(item?.key==='conferenceChampion') return 'Conference Champion';
  if(item?.key==='divisionChampion') return 'Division Champion';
  if(item?.key==='eventRing') return String(item.label||'Event Champion').replace(/\s*S\d+\b/ig,'').trim()||'Event Champion';
  return item?.label||'';
}

function legacyCareerHonorHistoryHtml(playerName,item){
  const details=legacyHistoricalHonorDetails(playerName,item);
  if(!details.length) return '';
  return `<div class="legacy-trophy-history">${details.map(detail=>`<small>${esc(detail.team?`${detail.team} · Season ${detail.season}`:`Season ${detail.season}`)}</small>`).join('')}</div>`;
}

function scoreLegacyRoles(roles){
  const normal=[];
  const badgeBest=new Map();
  for(const role of Array.isArray(roles)?roles:[]){
    const item=legacyAccoladeFromRole(role);
    if(!item) continue;
    if(item.isBadge){
      const key=normalize(item.badgeName||item.label);
      const old=badgeBest.get(key);
      if(!old || item.xp>old.xp) badgeBest.set(key,item);
    }else normal.push(item);
  }
  const grouped=new Map();
  for(const item of normal){
    const groupKey=`${item.key}:${normalize(item.label)}`;
    const existing=grouped.get(groupKey);
    if(existing){existing.count+=item.count;existing.xp+=item.xp;existing.roleNames.push(item.roleName);}
    else grouped.set(groupKey,{...item,roleNames:[item.roleName]});
  }
  const accolades=[...grouped.values(),...badgeBest.values()].sort((a,b)=>b.xp-a.xp || a.label.localeCompare(b.label));
  const totalXP=accolades.reduce((sum,item)=>sum+item.xp,0);
  const rings=accolades.filter(item=>item.key==="superBowlRing"||item.key==="eventRing").reduce((sum,item)=>sum+item.count,0);
  const trophies=accolades.filter(item=>!item.isBadge).reduce((sum,item)=>sum+item.count,0);
  const accoladeCount=accolades.reduce((sum,item)=>sum+item.count,0);
  return {totalXP,rings,trophies,accoladeCount,accolades};
}

async function buildLegacyXPPlayers(forceRefresh=false){
  if(legacyXPPlayers && !forceRefresh) return legacyXPPlayers;
  let identities=await getDiscordPlayers(forceRefresh).catch(()=>[]);
  if(identities.length && !identities.some(p=>Array.isArray(p.roles))){
    identities=await getDiscordPlayers(true).catch(()=>identities);
  }
  const career=await buildLegacyCareerPlayers(false).catch(()=>[]);
  const careerByName=new Map(career.map(p=>[normalizePlayerName(p.name),p]));
  legacyXPPlayers=identities.map(identity=>{
    const name=String(identity.robloxUsername||identity.discordDisplayName||identity.discordUsername||"").trim();
    const score=scoreLegacyRoles(identity.roles||[]);
    return {
      name,
      identity,
      career:careerByName.get(normalizePlayerName(name))||null,
      ...score
    };
  }).filter(p=>p.name && p.totalXP>0).sort((a,b)=>b.totalXP-a.totalXP || b.rings-a.rings || a.name.localeCompare(b.name));
  return legacyXPPlayers;
}

function legacyAwardMiniText(item){
  const count=item.count>1?`${item.count}× `:"";
  return `${item.emoji} ${count}${item.isBadge?(item.badgeTier?.[0]?.toUpperCase()||""):item.label}`;
}

async function hydrateLegacyRobloxAvatars(container,players,limit=40){
  const targets=[...container.querySelectorAll('[data-legacy-avatar]')].slice(0,limit);
  await Promise.allSettled(targets.map(async img=>{
    const name=img.dataset.legacyAvatar;
    const url=await getDirectRobloxPicture(name).catch(()=>"");
    if(url){img.src=url;img.style.visibility="visible";}
  }));
}

async function renderLegacyPodium(players){
  const container=document.getElementById("legacyPodium");
  if(!container) return;
  const top=players.slice(0,3);
  if(!top.length){container.innerHTML='<div class="legacy-empty">No accolade roles found yet.</div>';return;}
  const display=top.length===3?[top[1],top[0],top[2]]:top;
  container.innerHTML=display.map(p=>{
    const actualRank=players.indexOf(p)+1;
    const cls=actualRank===1?"first":actualRank===3?"third":"second";
    return `<article class="legacy-podium-card ${cls}" data-legacy-player="${esc(p.name)}"><span class="legacy-podium-rank">#${actualRank}</span><img class="legacy-podium-avatar" data-legacy-avatar="${esc(p.name)}" alt="${esc(p.name)} Roblox avatar" style="visibility:hidden"><strong>${esc(p.name)}</strong><div class="legacy-podium-xp">${Number(p.totalXP).toLocaleString()}<small>XP</small></div><div class="legacy-podium-meta">${p.rings}× 🏆 · ${p.trophies} accolade${p.trophies===1?"":"s"}</div></article>`;
  }).join("");
  hydrateLegacyRobloxAvatars(container,display,3);
}

function getLegacySortedPlayers(players){
  const q=normalize(legacySearchTerm);
  const filtered=q?players.filter(p=>normalize(p.name).includes(q)):players.slice();
  if(legacySortMode==="rings") filtered.sort((a,b)=>b.rings-a.rings || b.totalXP-a.totalXP || a.name.localeCompare(b.name));
  else if(legacySortMode==="trophies") filtered.sort((a,b)=>b.trophies-a.trophies || b.totalXP-a.totalXP || a.name.localeCompare(b.name));
  else filtered.sort((a,b)=>b.totalXP-a.totalXP || b.rings-a.rings || a.name.localeCompare(b.name));
  return filtered;
}

async function renderLegacyLeaders(){
  const container=document.getElementById("legacyLeaderList");
  const countEl=document.getElementById("legacyRankedCount");
  if(!container) return;
  container.innerHTML='<div class="legacy-empty">Loading accolade-based Legacy rankings...</div>';
  try{
    const players=await buildLegacyXPPlayers(false);
    await renderLegacyPodium(players);
    const ranked=getLegacySortedPlayers(players);
    if(countEl) countEl.textContent=`${players.length.toLocaleString()} ranked player${players.length===1?"":"s"}`;
    if(!ranked.length){container.innerHTML='<div class="legacy-empty">No matching Legacy player found.</div>';return;}
    const maxXP=Math.max(1,...ranked.map(p=>p.totalXP));
    container.innerHTML=ranked.map((p,i)=>{
      const minis=p.accolades.slice(0,6).map(item=>`<span class="legacy-xp-award-mini">${esc(legacyAwardMiniText(item))}</span>`).join("");
      return `<div class="legacy-xp-row" data-legacy-player="${esc(p.name)}"><span class="legacy-rank">${i+1}</span><div class="legacy-xp-player"><img data-legacy-avatar="${esc(p.name)}" alt="${esc(p.name)} Roblox avatar" style="visibility:hidden"><div class="legacy-xp-player-copy"><strong>${esc(p.name)}</strong><div class="legacy-xp-awards">${minis}</div></div></div><div class="legacy-xp-bar"><span style="width:${Math.max(4,(p.totalXP/maxXP)*100).toFixed(1)}%"></span></div><div class="legacy-xp-value">${p.totalXP.toLocaleString()} <small>XP</small></div></div>`;
    }).join("");
    hydrateLegacyRobloxAvatars(container,ranked,40);
  }catch(error){console.error("Legacy XP leaders error:",error);container.innerHTML='<div class="legacy-empty">Unable to load Legacy rankings.</div>';}
}

async function searchLegacyPlayers(query){
  legacySearchTerm=String(query||"");
  await renderLegacyLeaders();
}

async function openLegacyPlayerShowcase(playerName){
  const panel=document.getElementById('legacyPlayerShowcase');
  if(!panel) return;
  const players=await buildLegacyXPPlayers(false);
  const player=players.find(p=>normalizePlayerName(p.name)===normalizePlayerName(playerName));
  if(!player) return;
  const identity=player.identity||{};
  const career=player.career;
  const avatar=await getDirectRobloxPicture(player.name).catch(()=>"");
  const positionEntries=Object.entries(career?.positions||{}).sort((a,b)=>b[1]-a[1]);

  const nameEl=document.getElementById('legacyProfileName');
  const pointsEl=document.getElementById('legacyProfilePoints');
  const ringsEl=document.getElementById('legacyProfilePrimaryPosition');
  const countEl=document.getElementById('legacyProfilePositionCount');
  const teamEl=document.getElementById('legacyProfileTeam');
  const avatarEl=document.getElementById('legacyProfileAvatar');
  const teamLogoEl=document.getElementById('legacyProfileTeamLogo');
  const breakdownEl=document.getElementById('legacyProfileBreakdown');
  const trophiesEl=document.getElementById('legacyProfileTrophies');
  const statContextEl=document.getElementById('legacyProfileStatContext');
  const achievementsEl=document.getElementById('legacyProfileAchievements');

  if(nameEl) nameEl.textContent=player.name;
  if(pointsEl) pointsEl.textContent=Number(player.totalXP).toLocaleString();
  if(ringsEl) ringsEl.textContent=String(player.rings);
  if(countEl) countEl.textContent=String(player.accoladeCount);
  if(teamEl) teamEl.textContent=identity.team || 'No current team';
  if(avatarEl){avatarEl.src=avatar||'';avatarEl.style.visibility=avatar?'visible':'hidden';avatarEl.alt=`${player.name} Roblox avatar`;}
  if(teamLogoEl){const logo=identity.teamLogo||'';teamLogoEl.src=logo?getDisplayImageUrl(logo):'';teamLogoEl.style.display=logo?'block':'none';}

  if(breakdownEl){
    breakdownEl.innerHTML=player.accolades.length?player.accolades.map(item=>`<div class="legacy-xp-breakdown-row"><span>${esc(item.emoji)} ${esc(item.count>1?`${item.count}× ${item.label}`:item.label)}</span><strong>+${Number(item.xp).toLocaleString()} XP</strong></div>`).join(''):'<div class="legacy-trophy-empty">No scored accolades found.</div>';
  }
  if(trophiesEl){
    const honors=player.accolades.filter(item=>!item.isBadge);
    trophiesEl.innerHTML=honors.length?honors.map(item=>`<div class="legacy-trophy-card"><div class="legacy-trophy-icon">${esc(item.emoji)}</div><div><span>${item.count>1?`${item.count}× · `:""}${Number(item.xp).toLocaleString()} XP</span><strong>${esc(legacyCareerHonorDisplayLabel(item))}</strong>${legacyCareerHonorHistoryHtml(player.name,item)}</div></div>`).join(''):'<div class="legacy-trophy-empty">No trophy-room accolades found yet.</div>';
  }
  if(statContextEl){
    const maxPts=Math.max(1,...positionEntries.map(([,pts])=>Number(pts)||0));
    statContextEl.innerHTML=positionEntries.length?positionEntries.map(([pos,pts])=>`<div class="legacy-breakdown-row"><span class="legacy-breakdown-pos">${esc(pos)}</span><div class="legacy-breakdown-bar"><span style="width:${Math.max(4,Math.min(100,(Number(pts)||0)/maxPts*100))}%"></span></div><strong class="legacy-breakdown-points">${formatPoints(pts)} PTS</strong></div>`).join(''):'<div class="legacy-trophy-empty">No connected all-time stat rows found for this player.</div>';
  }
  if(achievementsEl && career) renderLegacyAchievements(career);
  else if(achievementsEl){
    achievementsEl.innerHTML='<div class="legacy-achievement-empty">No connected all-time stats found for badge progress.</div>';
    const badgeCount=document.getElementById('legacyBadgeUnlockedCount'); if(badgeCount) badgeCount.textContent='0 / 20';
    const badgeSummary=document.getElementById('legacyBadgeTierSummary'); if(badgeSummary) badgeSummary.textContent='—';
  }
  panel.hidden=false;
  panel.scrollIntoView({behavior:'smooth',block:'start'});
}

async function loadLegacyRecordBook(forceRefresh=false){
  if(forceRefresh){legacyXPPlayers=null;legacyCareerPlayers=null;}
  legacyLoaded=true;
  await renderLegacyLeaders();
}

document.addEventListener('click',(event)=>{
  const row=event.target.closest('[data-legacy-player]');
  if(row) openLegacyPlayerShowcase(row.dataset.legacyPlayer);
  const sort=event.target.closest('[data-legacy-sort]');
  if(sort){
    legacySortMode=sort.dataset.legacySort||'xp';
    document.querySelectorAll('[data-legacy-sort]').forEach(btn=>btn.classList.toggle('active',btn===sort));
    renderLegacyLeaders();
  }
});
const legacyShowcaseClose=document.getElementById('legacyShowcaseClose');
if(legacyShowcaseClose) legacyShowcaseClose.addEventListener('click',()=>{
  const panel=document.getElementById('legacyPlayerShowcase');
  if(panel) panel.hidden=true;
});
const legacyPlayerSearch=document.getElementById("legacyPlayerSearch");
if(legacyPlayerSearch) legacyPlayerSearch.addEventListener("input",()=>searchLegacyPlayers(legacyPlayerSearch.value));
const legacyNav=document.querySelector('.nav-link[data-page="legacy"]');
if(legacyNav) legacyNav.addEventListener("click",()=>loadLegacyRecordBook(false));
if(window.location.hash==="#legacy") loadLegacyRecordBook(false);


/*
==================================================
HOME DASHBOARD
==================================================
*/
const HOME_AWARD_DEFINITIONS = {
  mvp: {
    label: "MVP",
    sheets: ["quarterback", "runningback", "center", "tight end", "wide receiver", "defensive end", "defensive back", "kicker"]
  },
  opoty: {
    label: "OPOTY",
    sheets: ["quarterback", "runningback", "center", "tight end", "wide receiver"]
  },
  dpoty: {
    label: "DPOTY",
    sheets: ["defensive end", "defensive back"]
  }
};
const HOME_AWARD_POSITION_LABELS = {
  "quarterback": "QB",
  "runningback": "RB",
  "center": "C",
  "tight end": "TE",
  "wide receiver": "WR",
  "defensive end": "DE",
  "defensive back": "DB",
  "kicker": "K"
};
function getStatsPlayerName(row) {
  const key = findHeaderKey(row,["username","player","name"]);
  return key ? String(row[key] || "").trim() : "";
}
function getStatsPointsValue(row) {
  const key = findHeaderKey(row,["PTS","Points","Point"]);
  const value = key ? Number(row[key]) : 0;
  return Number.isFinite(value) ? value : 0;
}
function getAwardPlayerKey(name) {
  return normalize(String(name || "")).replace(/[^a-z0-9]/g, "");
}
async function buildHomeAwardLeaders(awardKey) {
  const definition = HOME_AWARD_DEFINITIONS[awardKey] || HOME_AWARD_DEFINITIONS.mvp;
  const data = await getStatsSourceData("season", false);
  const combined = new Map();

  for (const sheetName of definition.sheets) {
    const rawRows = Array.isArray(data?.[sheetName]) ? data[sheetName] : [];
    const normalizedRows = normalizeStatSheetRows(rawRows);
    const calculatedRows = applyCalculatedPoints(sheetName, normalizedRows.rows);
    const positionLabel = HOME_AWARD_POSITION_LABELS[sheetName] || sheetName.toUpperCase();

    for (const row of calculatedRows) {
      const name = getStatsPlayerName(row);
      if (!name) continue;
      const pts = getStatsPointsValue(row);
      if (!Number.isFinite(pts) || pts <= 0) continue;

      const key = getAwardPlayerKey(name);
      if (!key) continue;
      const current = combined.get(key) || { name, pts: 0, positions: [], bestPositionPts: -Infinity };
      current.pts += pts;
      if (!current.positions.includes(positionLabel)) current.positions.push(positionLabel);
      if (pts > current.bestPositionPts) {
        current.bestPositionPts = pts;
        current.name = name;
      }
      combined.set(key, current);
    }
  }

  return [...combined.values()]
    .sort((a,b) => b.pts - a.pts || a.name.localeCompare(b.name))
    .slice(0,5);
}
async function renderHomeAwardWatch(awardKey="mvp") {
  const container = document.getElementById("homeAwardWatchList");
  if (!container) return;
  container.innerHTML = '<div class="home-dashboard-loading">Loading award watch...</div>';

  try {
    await getDiscordPlayers().catch(() => []);
    const leaders = await buildHomeAwardLeaders(String(awardKey || "mvp").toLowerCase());

    if (!leaders.length) {
      container.innerHTML = '<div class="home-dashboard-loading">No award data found yet.</div>';
      return;
    }

    container.innerHTML = leaders.map((item,index) => {
      const player = findDiscordPlayerByLooseName(item.name);
      const logo = player?.teamLogo || "";
      const team = player?.team || "";
      const positionText = item.positions.join("/");
      return `<div class="home-award-row"><span class="home-award-rank">${index+1}</span><div class="home-award-player">${logo?`<img src="${esc(getDisplayImageUrl(logo))}" alt="${esc(team)}" loading="lazy">`:`<span class="home-award-logo-empty">—</span>`}<strong>${esc(item.name)}</strong></div><span class="home-award-position">${esc(positionText)}</span><strong class="home-award-points">${formatPoints(item.pts)}</strong></div>`;
    }).join("");
  } catch(error) {
    console.error("Home award watch error:", error);
    container.innerHTML = '<div class="home-dashboard-loading">Unable to load award watch.</div>';
  }
}
function renderHomeStandingsList(container,teams){
  if(!container)return;
  container.innerHTML=teams.map((team,index)=>`<div class="home-standing-row"><span class="home-standing-rank">${index+1}</span>${team.Logo?`<img src="${esc(getDisplayImageUrl(team.Logo))}" alt="${esc(team.Team||"")}" loading="lazy">`:`<span class="home-standing-logo-empty">—</span>`}<strong>${esc(team.Team||"")}</strong><span>${esc(team.Rec||"0-0")}</span></div>`).join("");
}
async function renderHomeStandingsPreview(){
  const a=document.getElementById("homeAtlanticStandings"); const p=document.getElementById("homePacificStandings");
  if(!a||!p)return;
  try{
    const data=await getLeagueData(); const standings=Array.isArray(data?.[STANDINGS_SHEET])?data[STANDINGS_SHEET].filter(team=>isActiveFranchise(team.Team)):[];
    renderHomeStandingsList(a,standings.filter(t=>normalize(t.Conference)==="atlantic").sort(sortStandings));
    renderHomeStandingsList(p,standings.filter(t=>normalize(t.Conference)==="pacific").sort(sortStandings));
  }catch(error){console.error("Home standings preview error:",error);a.innerHTML='<div class="home-dashboard-loading">Unable to load.</div>';p.innerHTML='<div class="home-dashboard-loading">Unable to load.</div>';}
}
async function getBotActivity() {
  try {
    const response = await fetch(`${DISCORD_API_URL}/api/activity`, { cache: "no-store" });
    if (!response.ok) return [];
    const result = await response.json();
    return Array.isArray(result?.activity) ? result.activity : [];
  } catch (error) {
    console.warn("Bot activity feed unavailable:", error);
    return [];
  }
}

function buildLatestScoreActivity(schedule = []) {
  return schedule
    .map(game => {
      const awayText = String(game["Away Final Score"] ?? "").trim();
      const homeText = String(game["Home Final Score"] ?? "").trim();
      if (awayText === "" || homeText === "") return null;
      const awayScore = Number(awayText), homeScore = Number(homeText);
      if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore)) return null;
      const away = String(game["Away Team"] || "").trim();
      const home = String(game["Home Team"] || "").trim();
      if (!away || !home) return null;
      const winner = awayScore > homeScore ? away : homeScore > awayScore ? home : "Tie";
      return {
        type: "score",
        icon: "🏈",
        title: winner === "Tie" ? `${away} tied ${home}` : `${winner} won`,
        detail: `${away} ${awayScore} · ${home} ${homeScore}`,
        tag: String(game.Week || "Final"),
        sortValue: getWeekNumber(game.Week)
      };
    })
    .filter(Boolean)
    .sort((a,b) => b.sortValue - a.sortValue)
    .slice(0,6);
}

async function renderHomeActivityFeed() {
  const container = document.getElementById("homeActivityFeed");
  if (!container) return;
  container.innerHTML = '<div class="home-dashboard-loading">Loading league activity...</div>';
  try {
    const [data, badgeActivity] = await Promise.all([
      getLeagueData(),
      getBotActivity()
    ]);
    const schedule = Array.isArray(data?.[SCHEDULE_SHEET]) ? data[SCHEDULE_SHEET] : [];
    const scoreEvents = buildLatestScoreActivity(schedule);
    const badgeEvents = badgeActivity.slice(0,6).map(event => ({
      type: "badge",
      icon: event.icon || "🏅",
      title: event.title || "Career achievement unlocked",
      detail: event.detail || "",
      tag: event.tag || "Achievement",
      timestamp: event.timestamp || ""
    }));

    const events = [...badgeEvents, ...scoreEvents].slice(0,10);
    if (!events.length) {
      container.innerHTML = '<div class="home-dashboard-loading">No league activity available yet.</div>';
      return;
    }
    container.innerHTML = events.map(event => `
      <div class="home-activity-item">
        <div class="home-activity-icon">${esc(event.icon)}</div>
        <div class="home-activity-copy"><strong>${esc(event.title)}</strong><span>${esc(event.detail)}</span></div>
        <span class="home-activity-tag">${esc(event.tag)}</span>
      </div>
    `).join("");
  } catch (error) {
    console.error("Home activity feed error:", error);
    container.innerHTML = '<div class="home-dashboard-loading">Unable to load league activity.</div>';
  }
}

const homeAwardPosition=document.getElementById("homeAwardPosition");
if(homeAwardPosition){homeAwardPosition.addEventListener("change",()=>renderHomeAwardWatch(homeAwardPosition.value));}
async function loadHomeDashboard(){await Promise.all([renderHomeAwardWatch(homeAwardPosition?.value||"mvp"),renderHomeStandingsPreview(),renderHomeActivityFeed()]);}

/*
==================================================
START LIVE DATA
==================================================
*/

async function initializeWebsiteData() {

  await getActiveFranchiseNames()
    .catch(() => null);

  await Promise.allSettled([
    loadStandings(),
    loadPlayoffs(),
    loadTeams(),
    loadStats(),
    loadSchedule(),
    loadHomeDashboard()
  ]);

  await enhanceSeason1HistoricalLogos();

}


initializeWebsiteData();

// Prevent accidental duplicate app shells from rendering below the site.
document.addEventListener("DOMContentLoaded", () => {
  const topbars = [...document.querySelectorAll("body > .topbar")];
  topbars.slice(1).forEach(el => el.remove());

  const mains = [...document.querySelectorAll("body > main")];
  mains.slice(1).forEach(el => el.remove());

  const footers = [...document.querySelectorAll("body > footer")];
  footers.slice(1).forEach(el => el.remove());

  const initial = location.hash.replace("#", "") || "home";
  if (document.getElementById(initial)) showPage(initial);
});
