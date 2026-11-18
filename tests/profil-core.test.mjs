import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = globalThis;
await import("../js/profil-core.js");
const PC = globalThis.IB_ProfileCore;

test("shortUid and interestLabel format member badges and interest aliases cleanly", () => {
  assert.equal(PC.shortUid("a1b2c3d4-e5f6-4789-8a01-b2c3d4e5f678"), "ID-A1B2C3D4");
  assert.equal(PC.interestLabel("indie_folk"), "Indie Folk");
  assert.equal(PC.interestLabel("gunung", (k) => (k === "it_naikgunung" ? "Naik gunung" : k)), "Naik gunung");
});

test("resolveSavedFavorites resolves saved UUIDs and slugs in reverse-recency order without duplicates", () => {
  const events = [
    { id: "ev-1", slug: "konser-a", title: "Konser A" },
    { id: "ev-2", slug: "gunung-b", title: "Pendakian B" },
    { id: "ev-3", slug: "expo-c", title: "Pameran C" }
  ];
  const out = PC.resolveSavedFavorites({
    savedIds: ["ev-1", "gunung-b", "konser-a", "missing-id"],
    events
  });
  assert.deepEqual(out.map((e) => e.id), ["ev-1", "ev-2"]);
});

test("buildUpcomingEvents merges hosted, joined, and saved events, filtering out past events and ranking relation priority", () => {
  const events = [
    { id: "ev-1", slug: "senja-vol-4", title: "Senja Vol 4", city: "Bandung", category: "konser", event_date: "2026-11-28", end_date: "2026-11-28" },
    { id: "ev-2", slug: "prau-trip", title: "Prau Open Trip", city: "Wonosobo", category: "naikgunung", event_date: "2026-12-06", end_date: "2026-12-07" },
    { id: "ev-past", slug: "past-gig", title: "Konser Kemarin", city: "Jakarta", category: "konser", event_date: "2026-11-10", end_date: "2026-11-10" }
  ];
  const upcoming = PC.buildUpcomingEvents({
    today: "2026-11-18",
    events,
    savedEvents: [events[0], events[2]],
    hostedInvites: [{ id: "inv-1", event_id: "ev-1", title: "Barengan Baris Depan" }],
    joinedInvites: [{ id: "inv-2", event_id: "ev-2", title: "Team Prau Desember" }]
  });
  assert.equal(upcoming.length, 2);
  assert.equal(upcoming[0].relation, "host");
  assert.equal(upcoming[0].subtitle, "Barengan Baris Depan");
  assert.equal(upcoming[1].relation, "joined");
});

test("buildCommunityActivities merges forum posts and hosted invites sorted newest first", () => {
  const acts = PC.buildCommunityActivities({
    forumPosts: [
      { id: "fp-1", city: "Bandung", kind: "tanya", title: "Info shuttle ke venue?", body: "Ada barengan dari Dago?", reply_count: 5, last_activity: "2026-11-18T09:00:00Z" }
    ],
    hostedInvites: [
      { id: "inv-9", city: "Jakarta", niche: "musik", title: "Barengan Indie Night", note: "Kumpul jam 18.00", filled: 3, capacity: 5, created_at: "2026-11-18T10:00:00Z" }
    ]
  });
  assert.equal(acts.length, 2);
  assert.equal(acts[0].type, "invite");
  assert.equal(acts[1].type, "forum");
  assert.equal(acts[1].count, 5);
});

test("filterDashboardItems performs case-insensitive filtering across title, city, and excerpt", () => {
  const items = [
    { title: "Senja Akustik", city: "Bandung", excerpt: "Baris depan" },
    { title: "Pendakian Prau", city: "Wonosobo", excerpt: "Via Patak Banteng" }
  ];
  assert.equal(PC.filterDashboardItems(items, "bandung").length, 1);
  assert.equal(PC.filterDashboardItems(items, "prau")[0].city, "Wonosobo");
  assert.equal(PC.filterDashboardItems(items, "").length, 2);
});
