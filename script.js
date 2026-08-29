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

const STAT_SHEETS = [
  "quarterback",
  "runningback",
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
  });


  const selected =
    document.getElementById(pageId);


  if (!selected) {
    return;
  }


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


function getSeason1HistoricalTeamName(playerName) {
  return SEASON_1_HISTORICAL_TEAMS[
    normalizePlayerName(playerName)
  ] || "";
}


function getHistoricalTeamLogoFromLeagueData(teamName) {

  if (!teamName || !leagueData) {
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


async function enhanceSeason1HistoricalLogos() {

  try {
    await getLeagueData();
  } catch (error) {
    console.warn(
      "Could not load historical team logos:",
      error
    );
    return;
  }

  const historyRows =
    document.querySelectorAll(
      "#history .award-list li"
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

    const historicalTeam =
      getSeason1HistoricalTeamName(
        playerName
      );

    const logo =
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
      Array.isArray(
        data[STANDINGS_SHEET]
      )
        ? data[STANDINGS_SHEET].filter(
            team =>
              isActiveFranchise(
                team.Team
              )
          )
        : data[STANDINGS_SHEET];


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
          <td colspan="8" class="status-cell">
            Unable to load standings.
          </td>
        </tr>
      `;

    }


    if (pacificBody) {

      pacificBody.innerHTML = `
        <tr>
          <td colspan="8" class="status-cell">
            Unable to load standings.
          </td>
        </tr>
      `;

    }

  }

}


function renderStandings(
  body,
  teams
) {

  if (!body) {
    return;
  }


  if (!teams.length) {

    body.innerHTML = `
      <tr>
        <td colspan="8" class="status-cell">
          No teams found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    teams
      .map(
        (team, index) =>
          createStandingsRow(
            team,
            index + 1
          )
      )
      .join("");

}


function createStandingsRow(
  team,
  displayRank
) {

  const logo =
    team.Logo || "";

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
                  src="${esc(getDisplayImageUrl(logo))}"
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
      <td>${esc(team["Conf Rec"])}</td>
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
      Array.isArray(
        data[STANDINGS_SHEET]
      )
        ? data[STANDINGS_SHEET].filter(
            team =>
              isActiveFranchise(
                team.Team
              )
          )
        : data[STANDINGS_SHEET];


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

  grid.innerHTML = teams.map((team) => `
    <button
      class="team-card team-card-button"
      type="button"
      data-team-name="${esc(team.Team)}"
    >
      ${
        team.Logo
          ? `<img src="${esc(getDisplayImageUrl(team.Logo))}" alt="${esc(team.Team)}" loading="lazy">`
          : ""
      }

      <h4>${esc(team.Team)}</h4>

      <div class="team-meta">
        ${esc(team.Conference)} Conference
      </div>

      <div class="team-record">
        ${esc(team.Rec || "0-0")}
      </div>

      <div class="team-view-link">
        View Roster & Schedule →
      </div>
    </button>
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


  try {

    const data =
      await getLeagueData();


    const players =
      await getDiscordPlayers()
        .catch(() => []);


    const standings =
      Array.isArray(
        data[STANDINGS_SHEET]
      )
        ? data[STANDINGS_SHEET].filter(
            item =>
              isActiveFranchise(
                item.Team
              )
          )
        : [];


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
        team?.Logo ||
        apiTeamLogo;


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


    renderTeamSeasonSchedule(
      scheduleElement,
      games,
      teamName
    );


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
            isAway
              ? game["Home Logo"]
              : game["Away Logo"];


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
                        src="${esc(getDisplayImageUrl(opponentLogo))}"
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
    (TDs × 2 − INT × 3 + Yds × 0.04) / 2
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
        tds * 2 -
        interceptions * 3 +
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
    WR:
    (Receiving Yards × 0.12 + TDs × 4 + Rec × 0.5 + YAC × 0.1) / 2
  */

  if (
    position.includes("wide receiver") ||
    position.includes("receiver") ||
    position === "wr"
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
        receivingYards * 0.12 +
        tds * 4 +
        receptions * 0.5 +
        yac * 0.1
      ) / 2
    );

  }


  /*
    DB:
    ((100 − CA%) / 2 + INTs × 4.5 + PK6 × 10
     − YDA × 0.012 − TDA × 1.5) / 2
  */

  if (
    position.includes("defensive back") ||
    position === "db"
  ) {

    const completionAllowed =
      statNumber(
        row,
        [
          "CA %",
          "CA%",
          "Completion Allowed %",
          "Completion % Allowed"
        ]
      );

    const interceptions =
      statNumber(
        row,
        ["INT", "INTS", "Interceptions"]
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
        (100 - completionAllowed) / 2 +
        interceptions * 4.5 +
        pickSix * 10 -
        yardsAllowed * 0.012 -
        touchdownsAllowed * 1.5
      ) / 2
    );

  }


  /*
    Kicker:
    FG% × 10 + Made + Yards × 0.15 − (ATT − Made) × 3

    Note: this follows the formula exactly as provided,
    with no final /2.
  */

  if (
    position.includes("kicker") ||
    position === "k"
  ) {

    const fieldGoalPercent =
      statNumber(
        row,
        [
          "FG%",
          "FG %",
          "Field Goal %",
          "Field Goal Percentage"
        ]
      );

    const made =
      statNumber(
        row,
        [
          "Made",
          "FGM",
          "FG Made"
        ]
      );

    const yards =
      statNumber(
        row,
        [
          "Yards",
          "YDS",
          "FG Yards"
        ]
      );

    const attempts =
      statNumber(
        row,
        [
          "ATT",
          "Attempts",
          "FGA"
        ]
      );

    return (
      fieldGoalPercent * 10 +
      made +
      yards * 0.15 -
      (attempts - made) * 3
    );

  }


  /*
    DE:
    (Tackles + Sacks × 4 + Pressures × 0.25
     + Swats × 3 + Sack Yards × 0.2) / 2
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
          "TACKLES"
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

    const swats =
      statNumber(
        row,
        [
          "Swats",
          "SWAT",
          "SWATS"
        ]
      );

    const sackYards =
      statNumber(
        row,
        [
          "Sack Yards",
          "SACK YDS",
          "SackYards"
        ]
      );

    return (
      (
        tackles +
        sacks * 4 +
        pressures * 0.25 +
        swats * 3 +
        sackYards * 0.2
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
            name.includes("tight end") ||
            name.includes("linemen") ||
            name.includes("lineman")
          );
        }
      );


    if (!availableSheets.length) {

      const statKeywords = [
        "quarter",
        "running",
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
        : "EFF SEASON 3";
  }
}



function normalizeStatSheetRows(rows) {

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
      rawRows
    );


  const calculatedRows =
    applyCalculatedPoints(
      sheetName,
      normalized.rows
    );


  activeStatsHeaders =
    normalized.headers;


  // Only show players who have actually earned points.
  // This keeps the stat tables focused on players with real production
  // and removes the long list of 0.0 PTS rows.
  const pointsHeader =
    normalized.headers.find(
      (header) =>
        normalize(header) === "pts" ||
        normalize(header) === "points"
    );

  activeStatsRows =
    pointsHeader
      ? calculatedRows.filter(
          (row) =>
            (numberFrom(row[pointsHeader]) ?? 0) > 0
        )
      : calculatedRows;


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
    game["Away Logo"] || "";

  const homeLogo =
    game["Home Logo"] || "";

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
                  src="${esc(getDisplayImageUrl(awayLogo))}"
                  alt="${esc(awayTeam)}"
                  loading="lazy"
                >
              `
              : ""
          }

          <strong>
            ${esc(awayTeam)}
          </strong>

          ${
            String(awayScore).trim() !== ""
              ? `
                <span class="score">
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
                  src="${esc(getDisplayImageUrl(homeLogo))}"
                  alt="${esc(homeTeam)}"
                  loading="lazy"
                >
              `
              : ""
          }

          <strong>
            ${esc(homeTeam)}
          </strong>

          ${
            String(homeScore).trim() !== ""
              ? `
                <span class="score">
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

const seasonDetailPanel =
  document.getElementById(
    "seasonDetailPanel"
  );

const seasonArchiveBack =
  document.getElementById(
    "seasonArchiveBack"
  );


seasonArchiveCards.forEach(
  (card) => {

    card.addEventListener(
      "click",
      () => {

        document
          .querySelector(
            ".history-season-list"
          )
          ?.classList.add(
            "archive-hidden"
          );


        seasonDetailPanel
          ?.classList.add(
            "active"
          );

        enhanceSeason1HistoricalLogos();


        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      }
    );

  }
);


if (seasonArchiveBack) {

  seasonArchiveBack.addEventListener(
    "click",
    () => {

      seasonDetailPanel
        ?.classList.remove(
          "active"
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
        team.Logo
          ? `<img src="${esc(getDisplayImageUrl(team.Logo))}" alt="${esc(team.Team || "")}" loading="lazy">`
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
    FIXED EFF BRACKET PATH — NO RESEEDING

    Wild Card 1: Seed 3 vs Seed 6
      winner always advances to play Seed 1.

    Wild Card 2: Seed 4 vs Seed 5
      winner always advances to play Seed 2.

    The bracket path never changes based on the winner's seed.
  */

  const wc36WinnerName =
    getPlayoffWinnerByKey(
      updates,
      `${prefix}-WC1`
    );

  const wc45WinnerName =
    getPlayoffWinnerByKey(
      updates,
      `${prefix}-WC2`
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

    // Fixed bracket: WC1 winner -> Seed 1
    div1: {
      first: seed(1),
      firstSeed: 1,
      second: wc36Winner,
      secondSeed:
        getPlayoffTeamSeed(
          wc36Winner,
          seededTeams
        ),
      winnerName: div1WinnerName
    },

    // Fixed bracket: WC2 winner -> Seed 2
    div2: {
      first: seed(2),
      firstSeed: 2,
      second: wc45Winner,
      secondSeed:
        getPlayoffTeamSeed(
          wc45Winner,
          seededTeams
        ),
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

    champion: conferenceWinner
  };
}

function buildConferencePlayoffSide(conferenceName, state, side) {
  const wildCardOne = playoffMatchup(
    state.wc36.first,
    state.wc36.firstSeed,
    state.wc36.second,
    state.wc36.secondSeed,
    state.wc36.winnerName
  );

  const wildCardTwo = playoffMatchup(
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
          <h3>Season 3 Final</h3>
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

    const atlantic = standings
      .filter((team) => normalize(team.Conference) === "atlantic")
      .sort(sortStandings)
      .slice(0, 6);

    const pacific = standings
      .filter((team) => normalize(team.Conference) === "pacific")
      .sort(sortStandings)
      .slice(0, 6);

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
HOME DASHBOARD
==================================================
*/
const HOME_AWARD_SHEETS = {
  "quarterback": "quarterback",
  "runningback": "runningback",
  "wide receiver": "wide receiver",
  "defensive end": "defensive end",
  "defensive back": "defensive back",
  "kicker": "kicker"
};
const HOME_AWARD_LABELS = {
  "quarterback": "QB", "runningback": "RB", "wide receiver": "WR",
  "defensive end": "DE", "defensive back": "DB", "kicker": "K"
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
async function renderHomeAwardWatch(positionName="quarterback") {
  const container=document.getElementById("homeAwardWatchList");
  if(!container) return;
  container.innerHTML='<div class="home-dashboard-loading">Loading award watch...</div>';
  try {
    await getDiscordPlayers().catch(()=>[]);
    const data=await getStatsSourceData("season",false);
    const sheetName=HOME_AWARD_SHEETS[positionName]||"quarterback";
    const rawRows=Array.isArray(data?.[sheetName])?data[sheetName]:[];
    const normalized=normalizeStatSheetRows(rawRows);
    const leaders=applyCalculatedPoints(sheetName,normalized.rows)
      .map(row=>({name:getStatsPlayerName(row),pts:getStatsPointsValue(row)}))
      .filter(item=>item.name)
      .sort((a,b)=>b.pts-a.pts).slice(0,3);
    if(!leaders.length){container.innerHTML='<div class="home-dashboard-loading">No award data found.</div>';return;}
    const label=HOME_AWARD_LABELS[positionName]||"QB";
    container.innerHTML=leaders.map((item,index)=>{
      const player=findDiscordPlayerByLooseName(item.name);
      const logo=player?.teamLogo||"";
      const team=player?.team||"";
      return `<div class="home-award-row"><span class="home-award-rank">${index+1}</span><div class="home-award-player">${logo?`<img src="${esc(getDisplayImageUrl(logo))}" alt="${esc(team)}" loading="lazy">`:`<span class="home-award-logo-empty">—</span>`}<strong>${esc(item.name)}</strong></div><span class="home-award-position">${label}</span><strong class="home-award-points">${formatPoints(item.pts)}</strong></div>`;
    }).join("");
  } catch(error){console.error("Home award watch error:",error);container.innerHTML='<div class="home-dashboard-loading">Unable to load award watch.</div>';}
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
const homeAwardPosition=document.getElementById("homeAwardPosition");
if(homeAwardPosition){homeAwardPosition.addEventListener("change",()=>renderHomeAwardWatch(homeAwardPosition.value));}
async function loadHomeDashboard(){await Promise.all([renderHomeAwardWatch(homeAwardPosition?.value||"quarterback"),renderHomeStandingsPreview()]);}

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
