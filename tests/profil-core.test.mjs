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

/* ---- sesi 2: logika dasbor ---- */
test("dua ajakan di event yang sama tetap dua kartu; event tersimpan yang sama tidak dobel", () => {
  const events = [{ id: "e1", slug: "s1", title: "Senja", event_date: "2026-12-01" }];
  const up = PC.buildUpcomingEvents({
    today: "2026-11-21", events, savedEvents: events,
    hostedInvites: [{ id: "i1", event_id: "e1", title: "Barengan A" }, { id: "i2", event_id: "e1", title: "Barengan B" }]
  });
  assert.deepEqual(up.map((x) => x.href).sort(), ["teman?i=i1", "teman?i=i2"]);
  assert.ok(up.every((x) => x.relation === "host"));
});
test("ajakan yang sama sebagai host dan anggota hanya satu kartu (host menang)", () => {
  const inv = { id: "i1", title: "X", when_date: "2026-12-01" };
  const up = PC.buildUpcomingEvents({ today: "2026-11-21", hostedInvites: [inv], joinedInvites: [inv] });
  assert.equal(up.length, 1);
  assert.equal(up[0].relation, "host");
});
test("ajakan sendiri yang event-nya sudah lewat tidak muncul; event tersimpan lain tetap", () => {
  const events = [{ id: "old", slug: "old", title: "Lama", event_date: "2026-11-01" }, { id: "n", slug: "n", title: "Baru", event_date: "2026-12-01" }];
  const up = PC.buildUpcomingEvents({ today: "2026-11-21", events, savedEvents: events, hostedInvites: [{ id: "i", event_id: "old", title: "T" }] });
  assert.deepEqual(up.map((x) => x.title), ["Baru"]);
});
test("event multi-hari yang sedang berlangsung masih tampil", () => {
  const e = { id: "m", slug: "m", title: "Festival", event_date: "2026-11-20", end_date: "2026-11-22" };
  assert.equal(PC.buildUpcomingEvents({ today: "2026-11-22", events: [e], savedEvents: [e] }).length, 1);
  assert.equal(PC.buildUpcomingEvents({ today: "2026-11-23", events: [e], savedEvents: [e] }).length, 0);
});
test("filterDashboardItems: semua kata harus cocok (lintas kolom), tanpa beda aksen, juga line-up", () => {
  const items = [
    { title: "Senja Akustik", city: "Bandung", category: "konser", venue: "Dago", lineup: "Fourtwnty" },
    { title: "Pendakian Prau", city: "Wonosobo", category: "naikgunung" }
  ];
  assert.equal(PC.filterDashboardItems(items, "bandung konser").length, 1);
  assert.equal(PC.filterDashboardItems(items, "konser wonosobo").length, 0);
  assert.equal(PC.filterDashboardItems(items, "SÉNJA").length, 1);
  assert.equal(PC.filterDashboardItems(items, "fourtwnty")[0].city, "Bandung");
  assert.equal(PC.filterDashboardItems(items, "  ").length, 2);
  assert.equal(PC.filterDashboardItems(null, "x").length, 0);
});
test("buildCommunityActivities: filled=0 dihormati, kosong=1, urutan seri stabil", () => {
  const a = PC.buildCommunityActivities({ hostedInvites: [
    { id: "a", filled: 0, capacity: 5, created_at: "2026-11-01" }, { id: "b", created_at: "2026-11-01" }, { id: "c", created_at: "2026-11-01" }
  ] });
  assert.deepEqual(a.map((x) => x.id), ["a", "b", "c"]);
  assert.equal(a[0].filled, 0);
  assert.equal(a[1].filled, 1);
});
