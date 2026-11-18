(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IB_PortalCore = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function haversineKm(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) return Infinity;
    var lat1 = Number(a[0]);
    var lon1 = Number(a[1]);
    var lat2 = Number(b[0]);
    var lon2 = Number(b[1]);
    if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
      return Infinity;
    }
    var R = 6371;
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var sinLat = Math.sin(dLat / 2);
    var sinLon = Math.sin(dLon / 2);
    var h = sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function resolveProvince(city, regions) {
    if (!city || city === 'semua' || !regions) return '';
    var keys = Object.keys(regions);
    for (var i = 0; i < keys.length; i++) {
      if (regions[keys[i]].indexOf(city) > -1) return keys[i];
    }
    return '';
  }

  function resolveMacroRegion(province, macroRegions) {
    if (!province || !macroRegions) return '';
    var keys = Object.keys(macroRegions);
    for (var i = 0; i < keys.length; i++) {
      if (macroRegions[keys[i]].indexOf(province) > -1) return keys[i];
    }
    return '';
  }

  function getNearbyCities(city, geo, maxKm) {
    if (!city || city === 'semua' || !geo || !geo[city]) return [];
    var radius = Number(maxKm) > 0 ? Number(maxKm) : 60;
    var origin = geo[city];
    var out = [];
    var names = Object.keys(geo);
    for (var i = 0; i < names.length; i++) {
      var target = names[i];
      if (target === city) continue;
      var dist = haversineKm(origin, geo[target]);
      if (dist <= radius) {
        out.push({ city: target, distanceKm: Math.round(dist) });
      }
    }
    out.sort(function (a, b) {
      return a.distanceKm - b.distanceKm || a.city.localeCompare(b.city);
    });
    return out;
  }

  function filterEventsByLocation(events, opts, regions, geo, macroRegions) {
    var list = Array.isArray(events) ? events : [];
    var o = opts || {};
    var city = o.city && o.city !== 'semua' ? o.city : '';
    var prov = o.prov || '';
    var macro = o.macro || '';
    var radiusKm = Number(o.radiusKm) || 0;

    if (city) {
      var allowed = {};
      allowed[city] = true;
      if (radiusKm > 0 && geo && geo[city]) {
        var near = getNearbyCities(city, geo, radiusKm);
        for (var i = 0; i < near.length; i++) {
          allowed[near[i].city] = true;
        }
      }
      return list.filter(function (ev) {
        return !!(ev && ev.city && allowed[ev.city]);
      });
    }

    if (prov && regions && regions[prov]) {
      var provCities = regions[prov];
      return list.filter(function (ev) {
        return !!(ev && ev.city && provCities.indexOf(ev.city) > -1);
      });
    }

    if (macro && macroRegions && macroRegions[macro] && regions) {
      var macroProvs = macroRegions[macro];
      var macroCityMap = {};
      for (var p = 0; p < macroProvs.length; p++) {
        var cs = regions[macroProvs[p]] || [];
        for (var j = 0; j < cs.length; j++) {
          macroCityMap[cs[j]] = true;
        }
      }
      return list.filter(function (ev) {
        return !!(ev && ev.city && macroCityMap[ev.city]);
      });
    }

    return list.slice();
  }

  function summarizeRegionDensity(events, regions, macroRegions) {
    var byCity = {};
    var byProv = {};
    var byMacro = {};
    var list = Array.isArray(events) ? events : [];
    for (var i = 0; i < list.length; i++) {
      var ev = list[i];
      if (!ev || !ev.city) continue;
      byCity[ev.city] = (byCity[ev.city] || 0) + 1;
      var p = resolveProvince(ev.city, regions);
      if (p) {
        byProv[p] = (byProv[p] || 0) + 1;
        var m = resolveMacroRegion(p, macroRegions);
        if (m) byMacro[m] = (byMacro[m] || 0) + 1;
      }
    }
    return { byCity: byCity, byProv: byProv, byMacro: byMacro };
  }

  return {
    haversineKm: haversineKm,
    resolveProvince: resolveProvince,
    resolveMacroRegion: resolveMacroRegion,
    getNearbyCities: getNearbyCities,
    filterEventsByLocation: filterEventsByLocation,
    summarizeRegionDensity: summarizeRegionDensity
  };
});
