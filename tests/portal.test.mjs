import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = globalThis;
await import('../js/portal-core.js');
await import('../js/monetize-core.js');
await import('../js/regions.js');

const portalCore = globalThis.IB_PortalCore;
const monetizeCore = globalThis.IB_MonetizeCore;
const IB_MACRO = globalThis.IB_MACRO;
const IB_REGIONS = globalThis.IB_REGIONS;
const IB_GEO = globalThis.IB_GEO;

const SAMPLE_REGIONS = {
  'DKI Jakarta': ['Jakarta'],
  'Jawa Barat': ['Bandung', 'Cimahi', 'Garut', 'Bogor', 'Cirebon'],
  'Papua': ['Jayapura']
};

const SAMPLE_MACROS = {
  'Jabodetabek & Banten': ['DKI Jakarta'],
  'Jawa Barat': ['Jawa Barat'],
  'Maluku & Papua': ['Papua']
};

const SAMPLE_GEO = {
  Jakarta: [-6.2088, 106.8456],
  Bandung: [-6.9175, 107.6191],
  Cimahi: [-6.8722, 107.5425],
  Garut: [-7.2279, 107.9087],
  Bogor: [-6.595, 106.8166],
  Cirebon: [-6.732, 108.5523],
  Jayapura: [-2.5916, 140.669]
};

test('haversineKm measures Bandung-Cimahi within ~12km and Bandung-Jayapura >3000km', () => {
  const dCimahi = portalCore.haversineKm(SAMPLE_GEO.Bandung, SAMPLE_GEO.Cimahi);
  const dJayapura = portalCore.haversineKm(SAMPLE_GEO.Bandung, SAMPLE_GEO.Jayapura);
  assert.ok(dCimahi > 5 && dCimahi < 20, `expected ~10km, got ${dCimahi}`);
  assert.ok(dJayapura > 3500, `expected >3500km, got ${dJayapura}`);
});

test('getNearbyCities finds Cimahi and Garut within 60km of Bandung, excluding Cirebon & Jayapura', () => {
  const near = portalCore.getNearbyCities('Bandung', SAMPLE_GEO, 60);
  const names = near.map((x) => x.city);
  assert.ok(names.includes('Cimahi'));
  assert.ok(names.includes('Garut'));
  assert.ok(!names.includes('Cirebon'));
  assert.ok(!names.includes('Jayapura'));
});

test('filterEventsByLocation supports city + radiusKm, province, and macro region', () => {
  const events = [
    { id: 1, city: 'Bandung' },
    { id: 2, city: 'Cimahi' },
    { id: 3, city: 'Cirebon' },
    { id: 4, city: 'Jayapura' }
  ];

  const exact = portalCore.filterEventsByLocation(events, { city: 'Bandung', radiusKm: 0 }, SAMPLE_REGIONS, SAMPLE_GEO, SAMPLE_MACROS);
  assert.deepEqual(exact.map((e) => e.id), [1]);

  const withNearby = portalCore.filterEventsByLocation(events, { city: 'Bandung', radiusKm: 40 }, SAMPLE_REGIONS, SAMPLE_GEO, SAMPLE_MACROS);
  assert.deepEqual(withNearby.map((e) => e.id), [1, 2]);

  const byProv = portalCore.filterEventsByLocation(events, { prov: 'Jawa Barat' }, SAMPLE_REGIONS, SAMPLE_GEO, SAMPLE_MACROS);
  assert.deepEqual(byProv.map((e) => e.id), [1, 2, 3]);

  const byMacro = portalCore.filterEventsByLocation(events, { macro: 'Maluku & Papua' }, SAMPLE_REGIONS, SAMPLE_GEO, SAMPLE_MACROS);
  assert.deepEqual(byMacro.map((e) => e.id), [4]);
});

test('buildPartnerTicketUrl appends tracking params cleanly without breaking existing query params', () => {
  const url = monetizeCore.buildPartnerTicketUrl('https://tiket.example.com/konser?promo=early', 'ev-42', {
    utmSource: 'gowithdme',
    partnerRef: 'gwm_id'
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('promo'), 'early');
  assert.equal(parsed.searchParams.get('utm_source'), 'gowithdme');
  assert.equal(parsed.searchParams.get('gwm_ev'), 'ev-42');
  assert.equal(parsed.searchParams.get('ref'), 'gwm_id');
  assert.equal(monetizeCore.buildPartnerTicketUrl('javascript:alert(1)', 'ev-1'), '');
});

test('rankPortalEvents promotes national and city sponsored events before organic events', () => {
  const ranked = monetizeCore.rankPortalEvents(
    [
      { id: 1, slug: 'organic-a' },
      { id: 2, slug: 'city-sponsor' },
      { id: 3, slug: 'national-sponsor' }
    ],
    { 'city-sponsor': 'city_spotlight', 'national-sponsor': 'national_portal' }
  );
  assert.deepEqual(ranked.map((e) => e.slug), ['national-sponsor', 'city-sponsor', 'organic-a']);
  assert.equal(ranked[0]._sponsored, true);
  assert.equal(ranked[2]._sponsored, false);
});

test('estimatePromoCampaign applies volume discounts and city tier multipliers', () => {
  const singleWeek = monetizeCore.estimatePromoCampaign({ tierId: 'city_spotlight', weeks: 1, city: 'Jakarta' });
  const fourWeeks = monetizeCore.estimatePromoCampaign({ tierId: 'city_spotlight', weeks: 4, city: 'Jakarta' });
  assert.equal(singleWeek.totalCostIdr, 149000);
  assert.equal(fourWeeks.discountPct, 15);
  assert.equal(fourWeeks.totalCostIdr, Math.round(149000 * 4 * 0.85));
  assert.ok(singleWeek.estClicks > 0 && singleWeek.estImpressions > singleWeek.estClicks);
});

test('calculateTripSplitWithFee computes fair rounded split including optional host service fee', () => {
  const res = monetizeCore.calculateTripSplitWithFee(1000000, 4, 10, 5);
  assert.equal(res.bufferedTotal, 1100000);
  assert.equal(res.hostFeeTotal, 55000);
  assert.equal(res.grandTotal, 1155000);
  assert.equal(res.perPerson, 289000);
});

test('regions.js covers all 38 Indonesian provinces in IB_MACRO and 120+ cities with valid IB_GEO coordinates', () => {
  const provinces = Object.keys(IB_REGIONS);
  assert.equal(provinces.length, 38, `expected 38 provinces, got ${provinces.length}`);

  const macroProvs = Object.values(IB_MACRO).flat();
  assert.equal(macroProvs.length, 38, 'every province must belong to exactly one macro region');
  for (const prov of provinces) {
    assert.ok(macroProvs.includes(prov), `province ${prov} missing from IB_MACRO`);
  }

  let totalCities = 0;
  for (const prov of provinces) {
    for (const city of IB_REGIONS[prov]) {
      totalCities++;
      const coord = IB_GEO[city];
      assert.ok(Array.isArray(coord) && coord.length === 2, `missing IB_GEO for ${city}`);
      assert.ok(coord[0] >= -11.5 && coord[0] <= 6.5, `invalid latitude for ${city}: ${coord[0]}`);
      assert.ok(coord[1] >= 94.5 && coord[1] <= 141.5, `invalid longitude for ${city}: ${coord[1]}`);
    }
  }
  assert.ok(totalCities >= 120, `expected >= 120 cities, got ${totalCities}`);
});

