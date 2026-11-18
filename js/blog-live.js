(function(){
  var C = window.IB_CONFIG || {};
  var URL = (C.SUPABASE_URL || "").replace(/\/+$/, "");
  var KEY = C.SUPABASE_ANON_KEY || "";
  if (!URL || !KEY) return;

  var CATS = {"berita":"Berita","opini":"Opini & Cerita","gaya-hidup":"Gaya Hidup","hiburan":"Hiburan","wisata":"Wisata","teknologi":"Teknologi","tips":"Tips & Panduan","panduan-konser":"Panduan Konser","tips-gunung":"Tips Gunung","review":"Review","komunitas":"Komunitas"};
  var MON = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[c]})}
  function fd(s){if(!s)return"";var d=new Date(s);return isNaN(d)?"":d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()}
  function inl(t){return t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" rel="noopener nofollow">$1</a>')}
  function t2h(b){var out=[],para=[],lst=[];
    function fp(){if(para.length){out.push("<p>"+para.map(function(x){return inl(esc(x))}).join("<br>")+"</p>");para=[]}}
    function fl(){if(lst.length){out.push("<ul>"+lst.map(function(x){return"<li>"+inl(esc(x))+"</li>"}).join("")+"</ul>");lst=[]}}
    b.replace(/\r\n?/g,"\n").split("\n").forEach(function(line){
      if(!line.trim()){fp();fl()}
      else if(line.indexOf("## ")===0){fp();fl();out.push("<h2>"+inl(esc(line.slice(3).trim()))+"</h2>")}
      else if(line.indexOf("### ")===0){fp();fl();out.push("<h3>"+inl(esc(line.slice(4).trim()))+"</h3>")}
      else if(line.indexOf("- ")===0){fp();lst.push(line.slice(2).trim())}
      else{fl();para.push(line.trim())}});
    fp();fl();return out.join("")}
  var OK={P:1,BR:1,H2:1,H3:1,H4:1,UL:1,OL:1,LI:1,STRONG:1,B:1,EM:1,I:1,U:1,A:1,BLOCKQUOTE:1,CODE:1,PRE:1,HR:1,TABLE:1,THEAD:1,TBODY:1,TR:1,TH:1,TD:1},
      DROP={SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,TEMPLATE:1,NOSCRIPT:1,SVG:1,MATH:1,FORM:1,TEXTAREA:1,SELECT:1,BUTTON:1,HEAD:1,TITLE:1};
  function safeHref(v){v=String(v||"").replace(/[\x00-\x20]+/g,"");return/^(https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(v)?v:""}
  function walk(n){if(n.nodeType===3)return esc(n.nodeValue);if(n.nodeType!==1)return"";var t=n.tagName;if(DROP[t])return"";
    var inner=[].map.call(n.childNodes,walk).join("");if(!OK[t])return inner;t=t.toLowerCase();
    if(t==="br"||t==="hr")return"<"+t+">";
    if(t==="a"){var h=safeHref(n.getAttribute("href"));return h?'<a href="'+esc(h)+'" rel="noopener nofollow">'+inner+"</a>":"<a>"+inner+"</a>"}
    return"<"+t+">"+inner+"</"+t+">"}
  function renderBody(body,isHtml){return isHtml?walk(new DOMParser().parseFromString("<body>"+body+"</body>","text/html").body):t2h(body)}
  function snippet(body,isHtml){
    var tmp=document.createElement("div");tmp.innerHTML=renderBody(body,isHtml);
    var txt=(tmp.textContent||"").replace(/\s+/g," ").trim();
    return txt.length>155?txt.slice(0,155)+"…":txt;
  }

  var path = location.pathname.replace(/\/+$/, "");
  var parts = path.split("/");
  var bi = parts.indexOf("blog");
  var curCat = (bi > -1 && parts[bi + 1] && CATS[parts[bi + 1]]) ? parts[bi + 1] : "";
  var basePrefix = curCat ? "../../" : "../";

  function openReader(p){
    var main = document.querySelector("main.bl-main");
    if (!main) return;
    document.title = p.title + " – Blog GWM";
    main.innerHTML = '<p><a href="' + basePrefix + 'blog/' + (curCat ? curCat + "/" : "") + '">← Kembali ke daftar blog</a></p>' +
      '<article class="bl-art"><h1>' + esc(p.title) + '</h1>' +
      '<p class="bl-meta"><span>' + esc(CATS[p.category] || p.category) + '</span> · <time>' + fd(p.published_at) + '</time></p>' +
      '<div class="bl-body">' + renderBody(p.body, p.is_html) + '</div></article>';
    window.scrollTo(0, 0);
  }

  function renderPosts(posts){
    var q = new URLSearchParams(location.search);
    var qCat = q.get("cat"), qSlug = q.get("post");
    if (qCat && qSlug) {
      var hit = posts.filter(function(x){ return x.category === qCat && x.slug === qSlug; });
      if (hit.length) { openReader(hit[0]); return; }
    }
    var main = document.querySelector("main.bl-main");
    if (!main) return;
    var list = main.querySelector(".bl-list");
    var filtered = curCat ? posts.filter(function(x){ return x.category === curCat; }) : posts;
    if (!list && filtered.length) {
      var emp = main.querySelector(".empty");
      if (emp) emp.remove();
      list = document.createElement("div");
      list.className = "bl-list";
      main.appendChild(list);
    }
    if (!list) return;

    var pubMap = {};
    filtered.forEach(function(p){ pubMap[p.category + "/" + p.slug] = p; });

    [].forEach.call(list.querySelectorAll("article.bl-card"), function(card){
      var a = card.querySelector("h2 a"); if (!a) return;
      var href = a.getAttribute("href") || "";
      var m = href.match(/([a-z0-9-]+)\/([a-z0-9-]+)(?:\.html)?$/);
      if (m && !pubMap[m[1] + "/" + m[2]]) card.remove();
    });

    filtered.slice().reverse().forEach(function(p){
      var key = p.category + "/" + p.slug;
      var exists = [].some.call(list.querySelectorAll("article.bl-card h2 a"), function(a){
        return (a.getAttribute("href") || "").indexOf(key) > -1;
      });
      if (exists) return;
      var liveUrl = basePrefix + "blog/?cat=" + encodeURIComponent(p.category) + "&post=" + encodeURIComponent(p.slug);
      var art = document.createElement("article");
      art.className = "bl-card";
      art.innerHTML = '<h2><a href="' + liveUrl + '">' + esc(p.title) + '</a></h2>' +
        '<p class="bl-meta"><span>' + esc(CATS[p.category] || p.category) + '</span> · <time>' + fd(p.published_at) + '</time></p>' +
        '<p>' + esc(snippet(p.body, p.is_html)) + '</p>';
      art.querySelector("a").addEventListener("click", function(e){
        e.preventDefault();
        history.pushState(null, "", liveUrl);
        openReader(p);
      });

      if (curCat) {
        list.insertBefore(art, list.firstChild);
      } else {
        var secs = [].filter.call(list.querySelectorAll("section.bl-sec"), function(s){
          var sh = s.querySelector(".bl-sh a");
          return sh && (sh.getAttribute("href") || "").indexOf("/" + p.category + "/") > -1;
        });
        var sec = secs.length ? secs[0] : null;
        if (!sec) {
          sec = document.createElement("section");
          sec.className = "bl-sec";
          sec.innerHTML = '<p class="bl-sh"><a href="' + basePrefix + 'blog/' + esc(p.category) + '/">' + esc(CATS[p.category] || p.category) + '</a><span>0</span></p>';
          list.insertBefore(sec, list.firstChild);
        }
        var sh = sec.querySelector(".bl-sh");
        sec.insertBefore(art, sh ? sh.nextSibling : sec.firstChild);
      }
    });

    [].forEach.call(list.querySelectorAll("section.bl-sec"), function(sec){
      var cnt = sec.querySelectorAll("article.bl-card").length;
      var sp = sec.querySelector(".bl-sh span");
      if (sp) sp.textContent = cnt;
      if (cnt === 0) sec.style.display = "none";
    });
  }

  /* Hemat egress: daftar ringan dulu (tanpa isi tulisan), lalu isi hanya untuk tulisan yang belum punya kartu statis
     (hasil build) atau yang sedang dibuka lewat ?cat=&post=. Dulu: isi 200 tulisan diunduh di setiap kunjungan. */
  var H = { "apikey": KEY, "Authorization": "Bearer " + KEY },
      BASE = URL + "/rest/v1/blog_posts?status=eq.published";
  function jget(u){ return fetch(u, { headers: H }).then(function(r){ return r.ok ? r.json() : []; }); }
  jget(BASE + "&select=id,title,slug,category,is_html,published_at&order=published_at.desc&limit=200").then(function(meta){
    if (!Array.isArray(meta)) return;
    var q = new URLSearchParams(location.search), qCat = q.get("cat"), qSlug = q.get("post"),
        hrefs = [].map.call(document.querySelectorAll("main.bl-main article.bl-card h2 a"), function(a){ return a.getAttribute("href") || ""; });
    var need = meta.filter(function(p){
      if (qCat && qSlug && p.category === qCat && p.slug === qSlug) return true;
      if (curCat && p.category !== curCat) return false;
      var key = p.category + "/" + p.slug;
      return !hrefs.some(function(h){ return h.indexOf(key) > -1; });
    });
    var bodies = {};
    var done = function(){
      meta.forEach(function(p){ p.body = bodies[p.id] ? bodies[p.id].body : ""; });
      renderPosts(meta);
    };
    if (!need.length) return done();
    jget(BASE + "&select=id,body&id=in.(" + need.map(function(p){ return p.id; }).join(",") + ")").then(function(rows){
      (rows || []).forEach(function(r){ bodies[r.id] = r; });
      done();
    });
  }).catch(function(){});
})();
