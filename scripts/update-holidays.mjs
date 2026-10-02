import fs from "node:fs/promises";
import path from "node:path";

const STATE_CODE = "BE";

async function fetchHolidays() {
  const response = await fetch(
    "HIER_KOMMT_DIE_FERIEN_API_HINEIN",
  );

  if (!response.ok) {
    throw new Error(
      `Ferien-API antwortet mit ${response.status}`,
    );
  }

  return response.json();
}

function normalizeHolidays(apiData) {
  return apiData.map((holiday) => ({
    id: holiday.id,
    name: holiday.name,
    type: holiday.type,
    startDate: holiday.startDate,
    endDate: holiday.endDate,
  }));
}

async function main() {
  console.log("Lade Ferien für Berlin ...");

  const apiData = await fetchHolidays();

  const holidays = normalizeHolidays(apiData);

  console.log(
    `${holidays.length} Ferienzeiträume geladen.`,
  );

  // später:
  // - nach Schuljahr gruppieren
  // - bestehende BE.json vergleichen
  // - Version erhöhen
  // - BE.json schreiben
  // - metadata.json aktualisieren
}

await main();
