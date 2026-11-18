/* Panel Admin > Filter Kata Terlarang (Wilayah Indonesia)
   Mengelola kamus kata terlarang, uji kalimat langsung, dan memantau pelanggaran berbasis User ID.
   Bekerja dengan localStorage secara langsung dan sinkron otomatis ke Supabase jika schema_word_filter.sql sudah dijalankan. */
(function(){
  var WF = window.IB_WordFilter;
  if (!WF) return;
  var $ = function(i){ return document.getElementById(i); };
  var box = $("v_words");
  if (!box) return;

  var activeCat = "all";
  var searchQ = "";
  var showAllBuiltIn = false;
  var remoteWords = [];
  var remoteLogs = [];
  var loadedRemote = false;

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function fmtTime(iso){
    if (!iso) return "";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      }).format(new Date(iso));
    } catch (e) { return iso; }
  }

  function showMsg(t, k){
    if (typeof window.msg === "function") window.msg(t, k);
  }

  function syncBadges(){
    var logs = mergedLogs();
    var cnt = logs.length;
    var sw = $("sWords");
    if (sw) { sw.hidden = !cnt; sw.textContent = cnt; }
    var wc = $("wCta"), nw = $("nWordV");
    if (wc && nw) { nw.textContent = cnt; wc.hidden = !cnt; }
  }

  function mergedCustomWords(){
    var local = WF.getCustomWords().map(function(x){
      return typeof x === "string" ? { word: x, category: "custom", source: "local" } : { word: x.word, category: x.category || "custom", source: "local" };
    });
    var seen = {};
    var out = [];
    remoteWords.forEach(function(r){
      var w = String(r.word || "").toLowerCase().trim();
      if (!w || seen[w]) return;
      seen[w] = 1;
      out.push({ word: w, category: r.category || "custom", source: "supabase" });
    });
    local.forEach(function(l){
      var w = String(l.word || "").toLowerCase().trim();
      if (!w || seen[w]) return;
      seen[w] = 1;
      out.push(l);
    });
    return out;
  }

  function mergedLogs(){
    var local = WF.getViolations();
    var seen = {};
    var out = [];
    remoteLogs.forEach(function(r){
      var key = r.id || (r.user_id + "|" + r.created_at + "|" + r.matched_words);
      if (seen[key]) return;
      seen[key] = 1;
      out.push({
        id: r.id,
        userId: r.user_id,
        userLabel: r.nickname || r.user_label || "Pengguna",
        context: r.context || "forum",
        categories: r.category ? [r.category] : [],
        matchedWords: r.matched_words ? String(r.matched_words).split(/\s*,\s*/).filter(Boolean) : [],
        excerpt: r.excerpt || "",
        createdAt: r.created_at,
        source: "supabase"
      });
    });
    local.forEach(function(l){
      var key = l.id || (l.userId + "|" + l.createdAt);
      if (seen[key]) return;
      seen[key] = 1;
      out.push(l);
    });
    out.sort(function(a, b){ return (a.createdAt || "") < (b.createdAt || "") ? 1 : -1; });
    return out;
  }

  function loadRemote(){
    if (!window.sb || loadedRemote) return Promise.resolve();
    loadedRemote = true;
    var pWords = sb.from("prohibited_words").select("word,category,active,created_at").eq("active", true).order("created_at", { ascending: false }).limit(500);
    var pLogs = sb.from("word_violations").select("id,user_id,context,category,matched_words,excerpt,created_at,profiles(nickname)").order("created_at", { ascending: false }).limit(100);
    return Promise.all([pWords, pLogs]).then(function(res){
      if (!res[0].error && Array.isArray(res[0].data)) {
        remoteWords = res[0].data;
      }
      if (!res[1].error && Array.isArray(res[1].data)) {
        remoteLogs = res[1].data.map(function(r){
          var pr = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return {
            id: r.id,
            user_id: r.user_id,
            nickname: pr && pr.nickname ? pr.nickname : null,
            context: r.context,
            category: r.category,
            matched_words: r.matched_words,
            excerpt: r.excerpt,
            created_at: r.created_at
          };
        });
      }
      render();
    }, function(){ /* silent fallback ke localStorage jika SQL filter belum dipasang */ });
  }

  function renderTestResult(){
    var inp = $("wfTestInput"), out = $("wfTestOut");
    if (!inp || !out) return;
    var txt = inp.value.trim();
    if (!txt) {
      out.innerHTML = '<span class="meta">Ketik kata atau kalimat untuk menguji deteksi otomatis (termasuk leetspeak &amp; spasi tersamar).</span>';
      return;
    }
    var res = WF.check(txt, { extraWords: remoteWords });
    if (res.ok) {
      out.innerHTML = '<div class="msg ok" style="margin:0">✓ <b>Lolos Filter</b> — Tidak ditemukan kata terlarang wilayah Indonesia.</div>';
    } else {
      var cats = res.categories.map(function(c){ return WF.categoryLabel(c, "id"); }).join(", ");
      var words = res.matches.map(function(m){ return '<code>' + esc(WF.maskWord(m.word)) + '</code> <small class="meta">(' + esc(WF.categoryLabel(m.category, "id")) + ')</small>'; }).join(" · ");
      out.innerHTML = '<div class="msg err" style="margin:0">⛔ <b>Diblokir Otomatis</b> · Kategori: <b>' + esc(cats) + '</b><div style="margin-top:4px">Terdeteksi: ' + words + '</div></div>';
    }
  }

  function render(){
    var custom = mergedCustomWords();
    var allDefaultCount = 0;
    Object.keys(WF.DEFAULT_WORDS).forEach(function(k){ allDefaultCount += WF.DEFAULT_WORDS[k].length; });
    var logs = mergedLogs();

    /* KPI cards */
    var kpiEl = $("wfKpi");
    if (kpiEl) {
      kpiEl.innerHTML =
        '<div class="kp"><small>Total Kata Diblokir</small><b class="mono">' + (allDefaultCount + custom.length) + '</b><span class="kn">Bawaan Indonesia + Kustom</span></div>' +
        '<div class="kp"><small>Aturan Bawaan</small><b class="mono">' + allDefaultCount + '</b><span class="kn">5 kategori standar</span></div>' +
        '<div class="kp"><small>Kata Kustom Admin</small><b class="mono">' + custom.length + '</b><span class="kn">Ditambahkan dari panel</span></div>' +
        '<div class="kp"><small>Pelanggaran User ID</small><b class="mono">' + logs.length + '</b><span class="kn">Tercatat pada akun login</span></div>';
    }

    /* Filter tabs */
    var tabsEl = $("wfCatTabs");
    if (tabsEl) {
      var cats = [["all", "Semua"]].concat(Object.keys(WF.CATEGORIES).map(function(k){ return [k, WF.CATEGORIES[k].id]; }));
      tabsEl.innerHTML = cats.map(function(c){
        return '<button class="tab' + (activeCat === c[0] ? " on" : "") + '" data-wfcat="' + esc(c[0]) + '" type="button">' + esc(c[1]) + '</button>';
      }).join("");
    }

    /* Word list */
    var wordsEl = $("wfWordList");
    var togBtn = $("wfToggleAll");
    if (togBtn) {
      togBtn.textContent = showAllBuiltIn ? "Ringkas kamus bawaan" : ("Lihat semua kata (" + allDefaultCount + ")");
    }
    if (wordsEl) {
      var list = [];
      custom.forEach(function(c){ list.push({ word: c.word, category: c.category, custom: true, source: c.source }); });
      var includeBuiltIn = showAllBuiltIn || activeCat !== "all" || !!searchQ;
      if (includeBuiltIn) {
        Object.keys(WF.DEFAULT_WORDS).forEach(function(cat){
          WF.DEFAULT_WORDS[cat].forEach(function(w){
            list.push({ word: w, category: cat, custom: false, source: "default" });
          });
        });
      }
      var q = searchQ.toLowerCase();
      var filtered = list.filter(function(item){
        if (activeCat !== "all" && item.category !== activeCat) return false;
        if (q && item.word.indexOf(q) < 0) return false;
        return true;
      });
      if (!includeBuiltIn && !filtered.length) {
        wordsEl.innerHTML = '<div class="wf-summary">' +
          Object.keys(WF.DEFAULT_WORDS).map(function(cat){
            return '<button type="button" class="wf-cat-pill" data-wfcat="' + esc(cat) + '">' +
              '<span class="wf-cat-dot" data-cat="' + esc(cat) + '"></span>' +
              '<b>' + esc(WF.categoryLabel(cat, "id")) + '</b>' +
              '<span class="mono">' + WF.DEFAULT_WORDS[cat].length + '</span>' +
            '</button>';
          }).join("") + '</div>';
      } else {
        wordsEl.innerHTML = filtered.length
          ? '<div class="wf-tags">' + filtered.slice(0, 160).map(function(item){
              return '<span class="wf-tag' + (item.custom ? " custom" : "") + '">' +
                '<span class="wf-cat-dot" data-cat="' + esc(item.category) + '"></span>' +
                '<b>' + esc(item.word) + '</b>' +
                '<small>' + esc(WF.categoryLabel(item.category, "id")) + '</small>' +
                (item.custom ? '<button type="button" class="wf-del" data-wfdel="' + esc(item.word) + '" aria-label="Hapus kata ' + esc(item.word) + '">×</button>' : '') +
                '</span>';
            }).join("") + '</div>' + (filtered.length > 160 ? '<p class="meta">Menampilkan 160 dari ' + filtered.length + ' kata. Gunakan pencarian untuk mempersempit.</p>' : '')
          : '<div class="empty">Tidak ada kata terlarang yang cocok dengan filter ini.</div>';
      }
    }

    /* Violation logs per User ID */
    var logEl = $("wfLogList");
    if (logEl) {
      if (!logs.length) {
        logEl.innerHTML = '<div class="empty">Belum ada percobaan penulisan kata terlarang dari pengguna login.</div>';
      } else {
        logEl.innerHTML = '<div class="tw"><table class="tbl wf-tbl"><thead><tr>' +
          '<th>User ID</th><th>Pengguna</th><th>Konteks</th><th>Kategori &amp; Kata</th><th>Cuplikan</th><th>Waktu (WIB)</th>' +
          '</tr></thead><tbody>' +
          logs.slice(0, 50).map(function(l){
            var uid = WF.shortUid(l.userId);
            var cats = (l.categories || []).map(function(c){ return WF.categoryLabel(c, "id"); }).join(", ");
            var wds = (l.matchedWords || []).join(", ");
            return '<tr>' +
              '<td><code class="uid-tag mono" title="' + esc(l.userId || "") + '">' + esc(uid) + '</code></td>' +
              '<td><b>' + esc(l.userLabel || "Pengguna") + '</b></td>' +
              '<td><span class="badge">' + esc(l.context || "input") + '</span></td>' +
              '<td><span class="badge adm">' + esc(cats || "Terlarang") + '</span> <span class="mono" style="font-size:12px">' + esc(wds) + '</span></td>' +
              '<td class="wf-ex">' + esc(l.excerpt || "-") + '</td>' +
              '<td class="meta">' + esc(fmtTime(l.createdAt)) + '</td>' +
              '</tr>';
          }).join("") + '</tbody></table></div>';
      }
    }

    syncBadges();
    renderTestResult();
  }

  function bind(){
    var addForm = $("wfAddForm");
    if (addForm) {
      addForm.onsubmit = function(ev){
        ev.preventDefault();
        var word = ($("wfNewWord").value || "").trim();
        var cat = $("wfNewCat").value || "custom";
        var res = WF.addCustomWord(word, cat);
        if (!res.ok) return showMsg(res.error, "err");
        $("wfNewWord").value = "";
        if (window.sb) {
          sb.rpc("admin_words_upsert", { p_word: res.word, p_category: res.category }).then(function(r){
            if (!r.error) {
              remoteWords.unshift({ word: res.word, category: res.category, source: "supabase" });
            }
            render();
            showMsg('Kata "' + res.word + '" ditambahkan ke daftar blokir Indonesia.', "ok");
          }, function(){
            render();
            showMsg('Kata "' + res.word + '" disimpan secara lokal.', "ok");
          });
        } else {
          render();
          showMsg('Kata "' + res.word + '" ditambahkan.', "ok");
        }
      };
    }

    var testInp = $("wfTestInput");
    if (testInp) testInp.addEventListener("input", renderTestResult);

    var srch = $("wfSearch");
    if (srch) srch.addEventListener("input", function(){ searchQ = this.value.trim(); render(); });

    box.addEventListener("click", function(ev){
      var togBtn = ev.target.closest("#wfToggleAll");
      if (togBtn) {
        showAllBuiltIn = !showAllBuiltIn;
        render();
        return;
      }
      var catBtn = ev.target.closest("[data-wfcat]");
      if (catBtn) {
        activeCat = catBtn.dataset.wfcat;
        render();
        return;
      }
      var delBtn = ev.target.closest("[data-wfdel]");
      if (delBtn) {
        var w = delBtn.dataset.wfdel;
        WF.removeCustomWord(w);
        remoteWords = remoteWords.filter(function(r){ return String(r.word || "").toLowerCase() !== w.toLowerCase(); });
        if (window.sb) {
          sb.rpc("admin_words_delete", { p_word: w }).then(function(){}, function(){});
        }
        render();
        showMsg('Kata "' + w + '" dihapus dari daftar kustom.', "ok");
        return;
      }
      var clearBtn = ev.target.closest("#wfClearLogs");
      if (clearBtn) {
        var doClear = function(){
          WF.clearViolations();
          remoteLogs = [];
          render();
          showMsg("Log pelanggaran lokal dibersihkan.", "ok");
        };
        if (typeof window.admAsk === "function") {
          window.admAsk({ title: "Bersihkan Log Pelanggaran", text: "Hapus catatan pelanggaran filter kata lokal di browser ini?" }).then(function(ok){ if (ok) doClear(); });
        } else {
          doClear();
        }
      }
    });

    document.addEventListener("click", function(ev){
      var nav = ev.target.closest("[data-v='words']");
      if (nav) {
        loadRemote().then(render);
      }
    });
  }

  bind();
  render();
})();
