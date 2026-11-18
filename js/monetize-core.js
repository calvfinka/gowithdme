(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IB_MonetizeCore = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PROMO_TIERS = {
    free: {
      id: 'free',
      pricePerWeekIdr: 0,
      baseDailyImpressions: 240,
      ctr: 0.032,
      pinned: false
    },
    city_spotlight: {
      id: 'city_spotlight',
      pricePerWeekIdr: 149000,
      baseDailyImpressions: 1850,
      ctr: 0.058,
      pinned: true
    },
    national_portal: {
      id: 'national_portal',
      pricePerWeekIdr: 499000,
      baseDailyImpressions: 6400,
      ctr: 0.074,
      pinned: true
    }
  };

  var TIER1_CITIES = {
    Jakarta: true,
    Bandung: true,
    Surabaya: true,
    Denpasar: true,
    Badung: true,
    Tangerang: true,
    'Tangerang Selatan': true,
    Bekasi: true,
    Bogor: true,
    Depok: true
  };

  var TIER2_CITIES = {
    Yogyakarta: true,
    Sleman: true,
    Semarang: true,
    Solo: true,
    Malang: true,
    Medan: true,
    Makassar: true,
    Palembang: true,
    Balikpapan: true,
    Batam: true
  };

  function getCityTierMultiplier(city) {
    if (!city || city === 'semua' || city === 'Nasional') return 1.5;
    if (TIER1_CITIES[city]) return 1.35;
    if (TIER2_CITIES[city]) return 1.1;
    return 0.85;
  }

  function buildPartnerTicketUrl(rawUrl, eventId, cfg) {
    var s = String(rawUrl || '').trim();
    if (!/^https?:\/\//i.test(s)) return '';
    var c = cfg || {};
    var source = c.utmSource || 'gowithdme';
    var medium = c.utmMedium || 'portal_referral';
    var campaign = c.utmCampaign || 'event_ticket';
    var ref = c.partnerRef || 'gwm';
    try {
      var u = new URL(s);
      if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', source);
      if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', medium);
      if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', campaign);
      if (eventId && !u.searchParams.has('gwm_ev')) u.searchParams.set('gwm_ev', String(eventId));
      if (ref && !u.searchParams.has('ref')) u.searchParams.set('ref', ref);
      return u.toString();
    } catch (e) {
      return s;
    }
  }

  function rankPortalEvents(events, sponsoredMap) {
    var list = Array.isArray(events) ? events.slice() : [];
    var sp = sponsoredMap || {};
    return list.map(function (ev, idx) {
      var key = String((ev && (ev.slug || ev.id)) || '');
      var tier = sp[key] || (ev && ev._sponsorTier) || '';
      var copy = {};
      for (var k in ev) copy[k] = ev[k];
      copy._sponsored = !!tier;
      copy._sponsorTier = tier || '';
      copy._origIndex = idx;
      return copy;
    }).sort(function (a, b) {
      var wa = a._sponsorTier === 'national_portal' ? 2 : a._sponsorTier === 'city_spotlight' ? 1 : 0;
      var wb = b._sponsorTier === 'national_portal' ? 2 : b._sponsorTier === 'city_spotlight' ? 1 : 0;
      if (wa !== wb) return wb - wa;
      return a._origIndex - b._origIndex;
    });
  }

  function estimatePromoCampaign(opts) {
    var o = opts || {};
    var tier = PROMO_TIERS[o.tierId] || PROMO_TIERS.city_spotlight;
    var weeks = Math.max(1, Math.min(12, Math.round(Number(o.weeks) || 1)));
    var days = weeks * 7;
    var mult = getCityTierMultiplier(o.city);
    var volumeDiscount = weeks >= 4 ? 0.85 : weeks >= 2 ? 0.92 : 1;
    var totalCostIdr = Math.round(tier.pricePerWeekIdr * weeks * volumeDiscount);
    var estImpressions = Math.round(tier.baseDailyImpressions * days * mult);
    var estClicks = Math.round(estImpressions * tier.ctr);
    var estCpcIdr = estClicks > 0 && totalCostIdr > 0 ? Math.round(totalCostIdr / estClicks) : 0;
    return {
      tierId: tier.id,
      weeks: weeks,
      days: days,
      discountPct: Math.round((1 - volumeDiscount) * 100),
      totalCostIdr: totalCostIdr,
      estImpressions: estImpressions,
      estClicks: estClicks,
      estCpcIdr: estCpcIdr
    };
  }

  function calculateTripSplitWithFee(totalCost, people, bufferPct, hostFeePct) {
    var base = Math.max(0, Number(totalCost) || 0);
    var n = Math.max(1, Math.round(Number(people) || 1));
    var buf = Math.max(0, Math.min(30, Number(bufferPct) || 0));
    var fee = Math.max(0, Math.min(25, Number(hostFeePct) || 0));
    var buffered = base * (1 + buf / 100);
    var hostFeeTotal = Math.round(buffered * (fee / 100));
    var grandTotal = Math.round(buffered + hostFeeTotal);
    var rawPerPerson = grandTotal / n;
    var perPerson = Math.ceil(rawPerPerson / 1000) * 1000;
    return {
      baseTotal: Math.round(base),
      bufferedTotal: Math.round(buffered),
      hostFeeTotal: hostFeeTotal,
      grandTotal: grandTotal,
      perPerson: perPerson,
      people: n,
      bufferPct: buf,
      hostFeePct: fee
    };
  }

  function buildPromoOrderCode(city, tierId, ts) {
    var codeCity = String(city || 'IDN')
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .slice(0, 3) || 'IDN';
    var codeTier = tierId === 'national_portal' ? 'NAT' : tierId === 'city_spotlight' ? 'CTY' : 'FRE';
    var stamp = String(ts || Date.now()).slice(-4);
    return 'GWM-' + codeCity + '-' + codeTier + '-' + stamp;
  }

  return {
    PROMO_TIERS: PROMO_TIERS,
    getCityTierMultiplier: getCityTierMultiplier,
    buildPartnerTicketUrl: buildPartnerTicketUrl,
    rankPortalEvents: rankPortalEvents,
    estimatePromoCampaign: estimatePromoCampaign,
    calculateTripSplitWithFee: calculateTripSplitWithFee,
    buildPromoOrderCode: buildPromoOrderCode
  };
});
