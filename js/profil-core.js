/* Pure dashboard helpers for GWM social profile page (Browser + Node ESM/CJS testable). */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_ProfileCore = api;
})(typeof window !== "undefined" ? window : globalThis, function(){
  "use strict";

  function shortUid(id){
    return "ID-" + String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  }

  function interestLabel(k, tr){
    var alias = { gunung: "naikgunung" }[k] || k;
    if (typeof tr === "function") {
      var lbl = tr("it_" + alias);
      if (lbl && lbl.indexOf("it_") !== 0) return lbl;
    }
    return String(k || "").replace(/[_-]+/g, " ").replace(/\b\w/g, function(c){ return c.toUpperCase(); });
  }

  function resolveSavedFavorites(opts){
    opts = opts || {};
    var savedIds = Array.isArray(opts.savedIds) ? opts.savedIds.map(String) : [];
    var events = Array.isArray(opts.events) ? opts.events : [];
    if (!savedIds.length || !events.length) return [];
    var byKey = {};
    events.forEach(function(ev){
      if (!ev) return;
      if (ev.id != null) byKey[String(ev.id)] = ev;
      if (ev.slug) byKey[String(ev.slug)] = ev;
    });
    var seen = {};
    var out = [];
    for (var i = savedIds.length - 1; i >= 0; i--) {
      var raw = savedIds[i];
      var ev = byKey[raw];
      if (!ev) continue;
      var uniq = String(ev.id || ev.slug || raw);
      if (seen[uniq]) continue;
      seen[uniq] = true;
      out.push(ev);
    }
    return out;
  }

  function buildUpcomingEvents(opts){
    opts = opts || {};
    var today = opts.today || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
    var savedEvents = Array.isArray(opts.savedEvents) ? opts.savedEvents : [];
    var hostedInvites = Array.isArray(opts.hostedInvites) ? opts.hostedInvites : [];
    var joinedInvites = Array.isArray(opts.joinedInvites) ? opts.joinedInvites : [];
    var eventsById = {};
    (Array.isArray(opts.events) ? opts.events : []).forEach(function(ev){
      if (ev && ev.id != null) eventsById[String(ev.id)] = ev;
    });

    var merged = {};
    function put(item){
      if (!item || !item.date) return;
      var end = item.endDate || item.date;
      if (end < today) return;
      var k = item.key;
      if (!merged[k]) {
        merged[k] = item;
        return;
      }
      var rank = { host: 3, joined: 2, saved: 1 };
      if ((rank[item.relation] || 0) > (rank[merged[k].relation] || 0)) {
        merged[k] = item;
      }
    }

    hostedInvites.forEach(function(inv){
      if (!inv) return;
      var ev = inv.event_id ? eventsById[String(inv.event_id)] : null;
      var date = (ev && ev.event_date) || inv.when_date || (inv.created_at ? String(inv.created_at).slice(0, 10) : "");
      if (!date) return;
      put({
        key: ev ? ("ev:" + (ev.slug || ev.id)) : ("inv:" + inv.id),
        title: ev ? ev.title : inv.title,
        subtitle: inv.title !== (ev && ev.title) ? inv.title : "",
        date: date,
        endDate: (ev && ev.end_date) || date,
        city: (ev && ev.city) || inv.city || "",
        category: (ev && ev.category) || inv.niche || "meetup",
        venue: (ev && ev.venue) || inv.meeting_point || "",
        href: inv.id ? ("teman?i=" + encodeURIComponent(inv.id)) : (ev && ev.slug ? ("e/" + encodeURIComponent(ev.slug)) : "event"),
        relation: "host"
      });
    });

    joinedInvites.forEach(function(inv){
      if (!inv) return;
      var ev = inv.event_id ? eventsById[String(inv.event_id)] : null;
      var date = (ev && ev.event_date) || inv.when_date || (inv.created_at ? String(inv.created_at).slice(0, 10) : "");
      if (!date) return;
      put({
        key: ev ? ("ev:" + (ev.slug || ev.id)) : ("inv:" + inv.id),
        title: ev ? ev.title : inv.title,
        subtitle: inv.title !== (ev && ev.title) ? inv.title : "",
        date: date,
        endDate: (ev && ev.end_date) || date,
        city: (ev && ev.city) || inv.city || "",
        category: (ev && ev.category) || inv.niche || "meetup",
        venue: (ev && ev.venue) || inv.meeting_point || "",
        href: inv.id ? ("teman?i=" + encodeURIComponent(inv.id)) : "teman",
        relation: "joined"
      });
    });

    savedEvents.forEach(function(ev){
      if (!ev || !ev.event_date) return;
      put({
        key: "ev:" + (ev.slug || ev.id),
        title: ev.title,
        subtitle: "",
        date: ev.event_date,
        endDate: ev.end_date || ev.event_date,
        city: ev.city || "",
        category: ev.category || "konser",
        venue: ev.venue || "",
        href: ev.slug ? ("e/" + encodeURIComponent(ev.slug)) : ("event?q=" + encodeURIComponent(ev.title || "")),
        relation: "saved"
      });
    });

    return Object.keys(merged).map(function(k){ return merged[k]; }).sort(function(a, b){
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function buildCommunityActivities(opts){
    opts = opts || {};
    var forumPosts = Array.isArray(opts.forumPosts) ? opts.forumPosts : [];
    var hostedInvites = Array.isArray(opts.hostedInvites) ? opts.hostedInvites : [];
    var out = [];

    forumPosts.forEach(function(p){
      if (!p) return;
      out.push({
        type: "forum",
        id: p.id,
        title: p.title || "",
        excerpt: p.body ? String(p.body).slice(0, 120) : "",
        city: p.city || "",
        kind: p.kind || "teman",
        count: +p.reply_count || 0,
        createdAt: p.last_activity || p.created_at || "",
        href: "komunitas?kota=" + encodeURIComponent(p.city || "") + "&p=" + encodeURIComponent(p.id || "")
      });
    });

    hostedInvites.forEach(function(i){
      if (!i) return;
      out.push({
        type: "invite",
        id: i.id,
        title: i.title || "",
        excerpt: i.note ? String(i.note).slice(0, 120) : (i.meeting_point || ""),
        city: i.city || "",
        kind: i.niche || "meetup",
        filled: +i.filled || 1,
        capacity: +i.capacity || 4,
        createdAt: i.created_at || "",
        href: "teman?i=" + encodeURIComponent(i.id || "")
      });
    });

    return out.sort(function(a, b){
      return (a.createdAt || "") < (b.createdAt || "") ? 1 : -1;
    });
  }

  function filterDashboardItems(items, query){
    var list = Array.isArray(items) ? items : [];
    var q = String(query || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(function(item){
      var hay = [
        item.title,
        item.subtitle,
        item.city,
        item.venue,
        item.category,
        item.excerpt,
        item.kind,
        item.genre
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.indexOf(q) > -1;
    });
  }

  return {
    shortUid: shortUid,
    interestLabel: interestLabel,
    resolveSavedFavorites: resolveSavedFavorites,
    buildUpcomingEvents: buildUpcomingEvents,
    buildCommunityActivities: buildCommunityActivities,
    filterDashboardItems: filterDashboardItems
  };
});
