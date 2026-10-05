import fs from "node:fs/promises";

const BASE_URL =
  "https://www.ferien-api.maxleistner.de/api/v2";

/*
 * Erstes Schuljahr:
 * 2026/27
 */
const FIRST_SCHOOL_YEAR = 2026;

/*
 * Letztes Kalenderjahr, das die API aktuell bereitstellt.
 *
 * Für Schuljahr 2027/28 brauchen wir:
 * 2027 + 2028
 */
const LAST_AVAILABLE_YEAR = 2028;

const STATE_CODES = [
  "BW",
  "BY",
  "BE",
  "BB",
  "HB",
  "HH",
  "HE",
  "MV",
  "NI",
  "NW",
  "RP",
  "SL",
  "SN",
  "ST",
  "SH",
  "TH",
];

const HOLIDAY_TYPE_MAP = {
  winterferien: "winter",
  osterferien: "easter",
  pfingstferien: "pentecost",
  sommerferien: "summer",
  herbstferien: "autumn",
  weihnachtsferien: "christmas",
  variabler_ferientag: "other",
};

const holidayCache = new Map();

/*
 * Ferien eines Bundeslandes für ein Kalenderjahr laden.
 */
async function fetchHolidays(
  stateCode,
  year,
) {
  const cacheKey =
    `${stateCode}-${year}`;

  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(
      cacheKey,
    );
  }

  const url =
    `${BASE_URL}/${year}?states=${stateCode}`;

  console.log(
    `→ Lade ${stateCode} ${year}`,
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `API-Fehler ${response.status} für ${stateCode} ${year}`,
    );
  }

  const data =
    await response.json();

  holidayCache.set(
    cacheKey,
    data,
  );

  return data;
}

/*
 * API-Format -> TeaMan-Format
 */
function normalizeHoliday(holiday) {
  return {
    id: holiday.slug,
    name: holiday.name_cp,
    type:
      HOLIDAY_TYPE_MAP[holiday.name] ??
      "other",
    startDate: holiday.start.slice(0, 10),
    endDate: holiday.end.slice(0, 10),
  };
}

/*
 * Aus zwei Kalenderjahren ein Schuljahr bilden.
 *
 * Beispiel:
 *
 * 2026 + 2027
 *       ↓
 *    2026/27
 */
function buildSchoolYear(
  startYear,
  firstYearHolidays,
  secondYearHolidays,
) {
  /*
   * Beginn des Schuljahres:
   * Sommerferien des ersten Jahres.
   */
  const firstSummer =
    firstYearHolidays.find(
      (holiday) =>
        holiday.name === "sommerferien",
    );

  /*
   * Ende:
   * Sommerferien des Folgejahres.
   */
  const secondSummer =
    secondYearHolidays.find(
      (holiday) =>
        holiday.name === "sommerferien",
    );

  if (!firstSummer || !secondSummer) {
    throw new Error(
      `Sommerferien für Schuljahr ${startYear}/${startYear + 1} fehlen.`,
    );
  }

  const schoolYearStart =
    firstSummer.start.slice(0, 10);

  const schoolYearEnd =
    secondSummer.end.slice(0, 10);

  return [
    ...firstYearHolidays,
    ...secondYearHolidays,
  ]
    .filter((holiday) => {
      const start =
        holiday.start.slice(0, 10);

      return (
        start >= schoolYearStart &&
        start <= schoolYearEnd
      );
    })
    .map(normalizeHoliday)
    .sort((a, b) =>
      a.startDate.localeCompare(
        b.startDate,
      ),
    );
}

/*
 * 2026 -> "2026/27"
 */
function getSchoolYearKey(startYear) {
  return `${startYear}/${String(
    startYear + 1,
  ).slice(-2)}`;
}

/*
 * Vorhandene Datei lesen.
 *
 * Existiert sie noch nicht:
 * null
 */
async function readExistingFile(
  filePath,
) {
  try {
    const content =
      await fs.readFile(
        filePath,
        "utf8",
      );

    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

/*
 * updatedAt und version dürfen beim Vergleich
 * keine Rolle spielen.
 */
function getComparableData(data) {
  return {
    stateCode: data.stateCode,
    schoolYears: data.schoolYears,
  };
}

/*
 * Ein Bundesland komplett aktualisieren.
 */
async function updateState(stateCode) {
  console.log("");
  console.log(
    `===== ${stateCode} =====`,
  );

  const schoolYears = {};

  /*
   * Beispiel:
   *
   * LAST_AVAILABLE_YEAR = 2028
   *
   * startYear 2026:
   * braucht 2026 + 2027
   *
   * startYear 2027:
   * braucht 2027 + 2028
   *
   * startYear 2028 würde 2029 benötigen
   * -> deshalb stoppen wir vorher.
   */
  for (
    let startYear = FIRST_SCHOOL_YEAR;
    startYear < LAST_AVAILABLE_YEAR;
    startYear++
  ) {
    const firstYear =
      await fetchHolidays(
        stateCode,
        startYear,
      );

    const secondYear =
      await fetchHolidays(
        stateCode,
        startYear + 1,
      );

    const schoolYearKey =
      getSchoolYearKey(startYear);

    const holidays =
      buildSchoolYear(
        startYear,
        firstYear,
        secondYear,
      );

    schoolYears[schoolYearKey] =
      holidays;

    console.log(
      `✓ ${schoolYearKey}: ${holidays.length} Ferienzeiträume`,
    );
  }

  const filePath =
    `data/holidays/${stateCode}.json`;

  const existing =
    await readExistingFile(filePath);

  const newComparable = {
    stateCode,
    schoolYears,
  };

  /*
   * Prüfen, ob sich die Feriendaten
   * tatsächlich verändert haben.
   */
  const hasChanged =
    !existing ||
    JSON.stringify(
      getComparableData(existing),
    ) !==
      JSON.stringify(newComparable);

  if (!hasChanged) {
    console.log(
      `✓ ${stateCode}: keine Änderungen`,
    );

    return {
      stateCode,
      version: existing.version,
      changed: false,
    };
  }

  const newVersion =
    (existing?.version ?? 0) + 1;

  const output = {
    stateCode,
    version: newVersion,
    updatedAt:
      new Date().toISOString(),
    schoolYears,
  };

  await fs.writeFile(
    filePath,
    JSON.stringify(
      output,
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    `✓ ${stateCode}: Version ${newVersion} gespeichert`,
  );

  return {
    stateCode,
    version: newVersion,
    changed: true,
  };
}

async function main() {
  await fs.mkdir(
    "data/holidays",
    {
      recursive: true,
    },
  );

  const results = [];

  for (const stateCode of STATE_CODES) {
    const result =
      await updateState(stateCode);

    results.push(result);
  }

 // 2. Prüfen, ob sich überhaupt etwas geändert hat
const hasAnyChanges = results.some(
  (result) => result.changed,
);
  // 3. metadata.json nur bei Änderungen aktualisieren
if (hasAnyChanges) {
  const metadata = {
    version: 1,
    updatedAt: new Date().toISOString(),

    holidays: Object.fromEntries(
      results.map((result) => [
        result.stateCode,
        result.version,
      ]),
    ),
  };

  await fs.writeFile(
    "data/metadata.json",
    JSON.stringify(
      metadata,
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    "✓ metadata.json aktualisiert",
  );
} else {
  console.log(
    "✓ Keine Änderungen – metadata.json bleibt unverändert",
  );
}

    // 4. Zusammenfassung ausgeben
  console.log("");
  console.log(
    "===== FERTIG =====",
  );

  for (const result of results) {
    console.log(
      `${result.stateCode}: v${result.version} ${
        result.changed
          ? "aktualisiert"
          : "unverändert"
      }`,
    );
  }
}

await main();
