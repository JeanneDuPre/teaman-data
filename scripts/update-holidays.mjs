// const BASE_URL =
//   "https://www.ferien-api.maxleistner.de/api/v2";

// const STATE_CODE = "BE";

// const YEARS = [
//   2026,
//   2027,
//   2028,
// ];

// async function fetchHolidays(
//   stateCode,
//   year,
// ) {
//   const url =
//     `${BASE_URL}/${year}?states=${stateCode}`;

//   console.log(`Lade: ${url}`);

//   const response = await fetch(url);

//   console.log(
//     `${stateCode} ${year}: ${response.status}`,
//   );

//   if (!response.ok) {
//     throw new Error(
//       `Ferien konnten nicht geladen werden: ${response.status}`,
//     );
//   }

//   return response.json();
// }

// async function main() {
//   for (const year of YEARS) {
//     const data = await fetchHolidays(
//       STATE_CODE,
//       year,
//     );

//     console.log(
//       `API RESPONSE ${STATE_CODE} ${year}:`,
//     );

//     console.log(
//       JSON.stringify(data, null, 2),
//     );
//   }
// }

// await main();
