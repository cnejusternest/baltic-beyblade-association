/*
 * BBA tournaments — edit this file when an event is announced.
 * There are no real events included yet.
 * Events are split automatically: today or later = upcoming, earlier = past events.
 * The homepage shows the next 5 upcoming events; tournaments.html shows all of them.
 *
 * Entry format (EXAMPLE ONLY — do not publish fake events):
 * {
 *   date: "2026-11-15",          // YYYY-MM-DD
 *   time: "14:00",               // 24-hour start time, optional
 *   name: "BBA Riga Open #1",    // optional
 *   city: "Riga",
 *   country: "LV",               // LV (Latvia), LT (Lithuania), EE (Estonia)
 *   format: "X",                 // "X", "Metal Fight" or "Burst"
 *   ranked: true,                // true = Ranked, false = Unranked
 *   link: "https://..."          // registration or event page, optional
 * }
 */
window.bbaTournaments = [];
