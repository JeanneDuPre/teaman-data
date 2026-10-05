import fs from "node:fs/promises";

const BASE_URL =
  "https://www.ferien-api.maxleistner.de/api/v2";

const STATE_CODE = "BE";

const YEARS = [2026, 2027];

const OUTPUT_FILE =
  "data/holidays/BE.json";

async function fetchHolidays(
  stateCode,
  year,
) {
  const url =
    `${BASE_URL}/${year}?states=${stateCode}`;

  console.log(`Lade: ${url}`);

  const response = await fetch(url);

  console.log(
    `${stateCode} ${year}: ${response.status}`,
  );

  if (!response.ok) {
    throw new Error(
      `Ferien konnten nicht geladen werden: ${response.status}`,
    );
  }

  return response.json();
}

async function main() {
  const data2026 = await fetchHolidays(
    STATE_CODE,
    2026,
  );

  const data2027 = await fetchHolidays(
    STATE_CODE,
    2027,
  );

  console.log("2026:", data2026);
  console.log("2027:", data2027);

  const output = {
    stateCode: STATE_CODE,
    version: 1,
    updatedAt: new Date().toISOString(),

    // Zunächst nur zum Test:
    schoolYears: {
      "2026/27": [
        ...data2026,
        ...data2027,
      ],
    },
  };

  await fs.mkdir("data/holidays", {
    recursive: true,
  });

  await fs.writeFile(
    OUTPUT_FILE,
    JSON.stringify(output, null, 2),
    "utf8",
  );

  console.log(
    `Datei geschrieben: ${OUTPUT_FILE}`,
  );
}

await main();
