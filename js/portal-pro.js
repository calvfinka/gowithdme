/* GWM Super-Portal Pro: 38-Province Location Explorer (+Radius & Basecamps),
   Multi-Stream Portal Tabs (Events, Hiking, Blog, Deals & Partners),
   Monetization Calculator & Ad Booking Hub, Regional Pulse & Native Spotlight. */
(function(){
  var d=document,$=function(id){return d.getElementById(id)};
  var tr=window.IB_T||function(k){return k};
  var L=window.IB_LANG==="en"?"en":"id";
  var REG=window.IB_REGIONS||{},MAC=window.IB_MACRO||{},GEO=window.IB_GEO||{},AREAS=window.IB_AREAS||{};
  var C=window.IB_CONFIG||{},PC=window.IB_PortalCore,MC=window.IB_MonetizeCore;
  var INIT_HASH=(location.hash||"").replace(/^#/,"");

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function pv(p){return window.IB_PROV?window.IB_PROV(p):p}
  function activeEvents(){return window.IB_Api?IB_Api.events().filter(IB_Api.isActive):[]}

  /* ---- Active location label across topbar & portal ---- */
  function curLoc(){
    if(window.IB_Api&&IB_Api.filters){
      var f=IB_Api.filters();
      return{city:f.city||"semua",prov:f.prov||"",macro:f.macro||"",radiusKm:+f.radiusKm||0};
    }
    try{var s=JSON.parse(localStorage.getItem("gwm_loc")||"null");if(s)return s}catch(e){}
    return{city:"semua",prov:"",macro:"",radiusKm:0};
  }
  function formatLocLabel(loc){
    if(loc.city&&loc.city!=="semua"){
      if(loc.radiusKm>0)return loc.city+" (+"+loc.radiusKm+" km)";
      return loc.city;
    }
    if(loc.prov)return pv(loc.prov);
    if(loc.macro)return loc.macro;
    return tr("loc_all_id");
  }
  function updateLocBadges(){
    var loc=curLoc(),lbl=formatLocLabel(loc);
    var tb=$("tbLocLbl");if(tb)tb.textContent=lbl;
    var hasLoc=(loc.city&&loc.city!=="semua")||!!loc.prov||!!loc.macro;
    var sbTxt=$("locScopeTxt"),sbClr=$("locScopeClear");
    if(sbTxt&&window.IB_Api){
      var n=IB_Api.filteredCount?IB_Api.filteredCount():IB_Api.count("semua");
      sbTxt.textContent=hasLoc?tr("loc_scope_detail",{label:lbl,n:n}):tr("loc_scope_all",{n:n});
      if(sbClr)sbClr.hidden=!hasLoc;
    }
    if($("locQuickBar")&&$("locQuickBar").onclick)renderQuickBar();
  }

  /* ---- Hero Macro-Region Quick Switcher ---- */
  /* Bilah wilayah satu baris yang menyesuaikan: urutan prioritas = wilayah terpilih, wilayah kotamu, lalu yang paling banyak event.
     Chip yang tidak muat di lebar layar ikut terlipat ke "Lainnya +N" (dikelompokkan Jawa & Bali / Luar Jawa). */
  var qbOpen=false;
  function macroGroup(m){return /^(Jabodetabek|Jawa|Bali)/i.test(m)?"java":"out"}
  function myMacro(l){
    var city=(l.city&&l.city!=="semua")?l.city:(C.DEFAULT_CITY||"");
    if(!PC||!city)return "";
    var prov=l.prov||PC.resolveProvince(city,REG);
    return prov?(PC.resolveMacroRegion(prov,MAC)||""):"";
  }
  function macroOrder(l){
    var macros=Object.keys(MAC),ev=activeEvents(),cnt={};
    macros.forEach(function(m){
      cnt[m]=PC&&ev.length?ev.filter(function(e){return PC.filterEventsByLocation([e],{city:"semua",prov:"",macro:m,radiusKm:0},REG,GEO,MAC).length>0}).length:0;
    });
    var first=[l.macro,myMacro(l)].filter(function(m,i,a){return m&&macros.indexOf(m)>=0&&a.indexOf(m)===i});
    var rest=macros.filter(function(m){return first.indexOf(m)<0}).sort(function(a,b){return cnt[b]-cnt[a]||macros.indexOf(a)-macros.indexOf(b)});
    return first.concat(rest);
  }
  /* sembunyikan chip berprioritas terendah sampai satu baris muat; kembalikan yang disembunyikan */
  function fitRow(row,sel){
    var items=[].slice.call(row.querySelectorAll(sel)),hid=[];
    items.forEach(function(b){b.hidden=false});
    if(!row.clientWidth)return hid;  /* belum tampil (lebar 0): jangan sembunyikan apa pun */
    for(var k=items.length-1;k>=0&&row.scrollWidth>row.clientWidth+1;k--){items[k].hidden=true;hid.unshift(items[k])}
    return hid;
  }
  function renderQuickBar(){
    var qb=$("locQuickBar");if(!qb)return;
    var l=curLoc(),cur=l.macro||"",hasLoc=(l.city&&l.city!=="semua")||!!l.prov||!!l.macro,order=macroOrder(l);
    var btn=function(m,x){return'<button type="button" '+(x||"")+' data-qmacro="'+esc(m)+'" aria-pressed="'+(cur===m?"true":"false")+'">'+esc(m)+'</button>'};
    var row='<button type="button" class="lqb-all" data-qmacro="" aria-pressed="'+(!hasLoc?"true":"false")+'">'+esc(tr("loc_all_id"))+'</button>'+
      order.map(function(m){return btn(m,'data-fit="1"')}).join("")+
      '<button type="button" class="lqb-tog" id="qbarMore" aria-expanded="'+(qbOpen?"true":"false")+'"></button>'+
      '<button type="button" class="lqb-exp" id="qbarExplorer" title="38 '+esc(tr("loc_prov_h"))+' · 120+" aria-label="38 '+esc(tr("loc_prov_h"))+' · 120+"><svg class="i" aria-hidden="true"><use href="#i-compass"/></svg></button>';
    qb.innerHTML='<div class="lqb-row">'+row+'</div><div class="lqb-more" id="qbarPanel" hidden></div>';
    var rowEl=qb.firstChild,tog=$("qbarMore");
    tog.textContent=tr("loc_more",{n:order.length});  /* ukur dengan label terpanjang */
    var hid=fitRow(rowEl,"[data-fit]");
    if(!hid.length){tog.hidden=true;return}
    tog.textContent=qbOpen?tr("loc_less"):tr("loc_more",{n:hid.length});
    if(qbOpen){
      var panel=$("qbarPanel"),names=hid.map(function(b){return b.dataset.qmacro}),h="";
      [["java","loc_grp_java"],["out","loc_grp_out"]].forEach(function(g){
        var ms=names.filter(function(m){return macroGroup(m)===g[0]});
        if(ms.length)h+='<div class="lqb-grp"><span class="lqb-gl">'+esc(tr(g[1]))+'</span>'+ms.map(function(m){return btn(m)}).join("")+'</div>';
      });
      panel.innerHTML=h;panel.hidden=false;
    }
  }
  var qbT;window.addEventListener("resize",function(){clearTimeout(qbT);qbT=setTimeout(function(){if($("locQuickBar")&&$("locQuickBar").onclick)renderQuickBar()},150)});
  function buildQuickMacroBar(){
    var qb=$("locQuickBar");if(!qb)return;
    renderQuickBar();
    qb.onclick=function(e){
      var ex=e.target.closest("#qbarExplorer");if(ex){openLocModal();return}
      var tg=e.target.closest("#qbarMore");if(tg){qbOpen=!qbOpen;renderQuickBar();return}
      var b=e.target.closest("[data-qmacro]");if(!b)return;
      var m=b.dataset.qmacro;
      if(window.IB_Api&&IB_Api.setLocation){
        IB_Api.setLocation(m?{city:"semua",prov:"",macro:m,radiusKm:0}:{city:"semua",prov:"",macro:"",radiusKm:0});
      }else{
        location.href=m?("event?macro="+encodeURIComponent(m)):"event";
      }
    };
  }

  /* ---- 38-Province Location Explorer Dialog ---- */
  var draft={city:"semua",prov:"",macro:"",radiusKm:0,mode:"city"};
  function openLocModal(){
    var dlg=$("locDlg");if(!dlg)return;
    var cur=curLoc();
    draft={city:cur.city||"semua",prov:cur.prov||"",macro:cur.macro||"",radiusKm:+cur.radiusKm||0,mode:"city"};
    if(!draft.macro&&draft.prov&&PC)draft.macro=PC.resolveMacroRegion(draft.prov,MAC);
    if(!draft.macro&&draft.city!=="semua"&&PC){
      var rp=PC.resolveProvince(draft.city,REG);
      if(rp){draft.prov=rp;draft.macro=PC.resolveMacroRegion(rp,MAC)}
    }
    if(cur.prov&&cur.city==="semua")draft.mode="prov";
    else if(cur.macro&&!cur.prov&&cur.city==="semua")draft.mode="macro";
    if($("locSearch"))$("locSearch").value="";
    renderLocModal();
    if(dlg.showModal)dlg.showModal();
  }
  function countByCity(){
    var cnt={};activeEvents().forEach(function(e){if(e.city)cnt[e.city]=(cnt[e.city]||0)+1});
    return cnt;
  }
  function renderLocModal(){
    var dlg=$("locDlg");if(!dlg)return;
    var q=($("locSearch")?$("locSearch").value:"").trim().toLowerCase();
    var cnt=countByCity(),macros=Object.keys(MAC),provs=Object.keys(REG);

    /* Macros column */
    var mHtml='<button type="button" data-lm="" class="'+(draft.macro===""?"on":"")+'"><span>'+esc(tr("loc_all_id"))+'</span></button>';
    macros.forEach(function(m){
      mHtml+='<button type="button" data-lm="'+esc(m)+'" class="'+(draft.macro===m?"on":"")+'"><span>'+esc(m)+'</span></button>';
    });
    $("locMacros").innerHTML=mHtml;

    /* Provinces column */
    var visProvs=q?provs.filter(function(p){
      return p.toLowerCase().indexOf(q)>-1||pv(p).toLowerCase().indexOf(q)>-1||(REG[p]||[]).some(function(c){
        return c.toLowerCase().indexOf(q)>-1||(AREAS[c]||[]).some(function(a){return a.toLowerCase().indexOf(q)>-1});
      });
    }):(draft.macro?(MAC[draft.macro]||[]):provs);
    if(!draft.prov&&visProvs.length)draft.prov=visProvs[0];
    if(draft.prov&&visProvs.indexOf(draft.prov)<0&&visProvs.length)draft.prov=visProvs[0];

    $("locProvs").innerHTML=visProvs.length?visProvs.map(function(p){
      var pTotal=(REG[p]||[]).reduce(function(s,c){return s+(cnt[c]||0)},0);
      return'<button type="button" data-lp="'+esc(p)+'" class="'+(draft.prov===p?"on":"")+'"><span>'+esc(pv(p))+'</span>'+(pTotal?'<small>'+pTotal+'</small>':'')+'</button>';
    }).join(""):'<p class="meta">—</p>';

    /* Cities column */
    var visCities=[];
    if(q){
      provs.forEach(function(p){
        var pMatch=p.toLowerCase().indexOf(q)>-1||pv(p).toLowerCase().indexOf(q)>-1;
        (REG[p]||[]).forEach(function(c){
          var aMatch=(AREAS[c]||[]).some(function(a){return a.toLowerCase().indexOf(q)>-1});
          if(pMatch||c.toLowerCase().indexOf(q)>-1||aMatch)visCities.push({c:c,p:p});
        });
      });
    }else if(draft.prov&&REG[draft.prov]){
      visCities=REG[draft.prov].map(function(c){return{c:c,p:draft.prov}});
    }
    $("locCityH").textContent=q?(tr("loc_city_h")+" ("+visCities.length+")"):(draft.prov?pv(draft.prov):tr("loc_city_h"));
    $("locCities").innerHTML=visCities.length?visCities.map(function(it){
      var on=draft.city===it.c&&draft.mode==="city";
      return'<button type="button" data-lc="'+esc(it.c)+'" data-lcp="'+esc(it.p)+'" class="'+(on?"on":"")+'"><span>'+esc(it.c)+'</span>'+(cnt[it.c]?'<small>'+cnt[it.c]+'</small>':'')+'</button>';
    }).join(""):'<p class="meta">—</p>';

    /* Radius buttons */
    var radVal=draft.mode==="prov"?"prov":draft.mode==="macro"?"macro":String(draft.radiusKm||0);
    [].forEach.call($("locRad").querySelectorAll("button"),function(b){
      b.setAttribute("aria-pressed",b.dataset.rad===radVal?"true":"false");
    });

    /* Extra info: Sub-areas/Basecamps + Nearby cities in radius */
    var extra=$("locExtra"),parts=[];
    if(draft.city&&draft.city!=="semua"){
      if(AREAS[draft.city]){
        parts.push('<div class="locd-exb"><b>'+esc(tr("loc_areas_h"))+' · '+esc(draft.city)+'</b><p>'+esc(AREAS[draft.city].join(" · "))+'</p></div>');
      }
      var rad=+draft.radiusKm||50;
      if(PC&&GEO[draft.city]){
        var near=PC.getNearbyCities(draft.city,GEO,rad).slice(0,8);
        if(near.length){
          parts.push('<div class="locd-exb"><b>'+esc(tr("loc_near_h"))+' ('+rad+' km)</b><div class="locd-near">'+near.map(function(x){
            return'<button type="button" data-lc="'+esc(x.city)+'">'+esc(x.city)+' <small>'+x.distanceKm+' km</small></button>';
          }).join("")+'</div></div>');
        }
      }
    }
    extra.hidden=!parts.length;extra.innerHTML=parts.join("");

    /* Summary text */
    var summary=tr("loc_all_id");
    if(draft.mode==="macro"&&draft.macro)summary=draft.macro;
    else if(draft.mode==="prov"&&draft.prov)summary=pv(draft.prov);
    else if(draft.city&&draft.city!=="semua")summary=draft.city+(draft.radiusKm>0?" (+"+draft.radiusKm+" km)":"");
    $("locSelTxt").textContent=summary;
  }

  function applyDraftLocation(){
    var loc={city:"semua",prov:"",macro:"",radiusKm:0};
    if(draft.mode==="macro"&&draft.macro)loc.macro=draft.macro;
    else if(draft.mode==="prov"&&draft.prov)loc.prov=draft.prov;
    else if(draft.city&&draft.city!=="semua"){loc.city=draft.city;loc.radiusKm=+draft.radiusKm||0;}
    try{
      if(loc.city==="semua"&&!loc.prov&&!loc.macro)localStorage.removeItem("gwm_loc");
      else localStorage.setItem("gwm_loc",JSON.stringify(loc));
    }catch(e){}
    var dlg=$("locDlg");if(dlg&&dlg.close)dlg.close();
    if(window.IB_Api&&IB_Api.setLocation){
      IB_Api.setLocation(loc);
    }else{
      var p=new URLSearchParams();
      if(loc.city!=="semua"){p.set("kota",loc.city);if(loc.radiusKm)p.set("rad",String(loc.radiusKm))}
      else if(loc.prov)p.set("prov",loc.prov);
      else if(loc.macro)p.set("macro",loc.macro);
      location.href="event"+(p.toString()?"?"+p.toString():"");
    }
  }

  function bindLocationExplorer(){
    ["tbLocBtn","railLocOpen","locScopeChange"].forEach(function(id){
      var el=$(id);if(el)el.addEventListener("click",openLocModal);
    });
    if($("locScopeClear"))$("locScopeClear").addEventListener("click",function(){
      if(window.IB_Api&&IB_Api.setLocation)IB_Api.setLocation({city:"semua",prov:"",macro:"",radiusKm:0});
    });
    var dlg=$("locDlg");if(!dlg)return;
    $("locDlgX").onclick=function(){dlg.close()};
    dlg.onclick=function(e){if(e.target===dlg)dlg.close()};
    $("locSearch").oninput=renderLocModal;
    $("locMacros").onclick=function(e){
      var b=e.target.closest("[data-lm]");if(!b)return;
      draft.macro=b.dataset.lm;draft.prov="";draft.city="semua";draft.mode=draft.macro?"macro":"city";
      renderLocModal();
    };
    $("locProvs").onclick=function(e){
      var b=e.target.closest("[data-lp]");if(!b)return;
      draft.prov=b.dataset.lp;if(PC)draft.macro=PC.resolveMacroRegion(draft.prov,MAC);
      draft.city=(REG[draft.prov]||[])[0]||"semua";draft.mode="prov";
      renderLocModal();
    };
    $("locCities").onclick=function(e){
      var b=e.target.closest("[data-lc]");if(!b)return;
      draft.city=b.dataset.lc;draft.prov=b.dataset.lcp||draft.prov;
      if(PC&&draft.prov)draft.macro=PC.resolveMacroRegion(draft.prov,MAC);
      draft.mode="city";renderLocModal();
    };
    $("locExtra").onclick=function(e){
      var b=e.target.closest("[data-lc]");if(!b)return;
      draft.city=b.dataset.lc;draft.mode="city";
      if(PC){var rp=PC.resolveProvince(draft.city,REG);if(rp){draft.prov=rp;draft.macro=PC.resolveMacroRegion(rp,MAC)}}
      renderLocModal();
    };
    $("locRad").onclick=function(e){
      var b=e.target.closest("[data-rad]");if(!b)return;
      var r=b.dataset.rad;
      if(r==="prov"){draft.mode="prov";draft.radiusKm=0}
      else if(r==="macro"){draft.mode="macro";draft.radiusKm=0}
      else{draft.mode="city";draft.radiusKm=parseInt(r,10)||0;if(draft.city==="semua"&&draft.prov&&REG[draft.prov])draft.city=REG[draft.prov][0]}
      renderLocModal();
    };
    $("locReset").onclick=function(){
      draft={city:"semua",prov:"",macro:"",radiusKm:0,mode:"city"};applyDraftLocation();
    };
    $("locApply").onclick=applyDraftLocation;
  }

  /* ---- Multi-Portal Workspace Tabs (Events / Hike / Blog / Deals / Promo) ---- */
  var curTab="events",blogPosts=null,blogCat="semua";
  function switchTab(tab,scroll){
    if(["events","hike","blog","deals","promo"].indexOf(tab)<0)tab="events";
    curTab=tab;
    var pts=$("portalTabs");
    if(pts)[].forEach.call(pts.querySelectorAll("[data-ptab]"),function(b){
      b.setAttribute("aria-selected",b.dataset.ptab===tab?"true":"false");
    });
    if($("paneEvents"))$("paneEvents").hidden=!(tab==="events"||tab==="hike");
    if($("paneBlog"))$("paneBlog").hidden=tab!=="blog";
    if($("paneDeals"))$("paneDeals").hidden=tab!=="deals";
    if($("panePromo"))$("panePromo").hidden=tab!=="promo";

    if((tab==="events"||tab==="hike")&&window.IB_Api&&IB_Api.set){
      IB_Api.set({cat:tab==="hike"?"naikgunung":"semua"});
    }
    if(tab==="blog")loadBlog();
    if(tab==="deals")renderDeals();
    if(tab==="promo")initPromo();

    if(history.replaceState&&d.body.classList.contains("nv-home")){
      var h=tab==="events"?"":("#"+tab);
      history.replaceState(null,"",location.pathname+location.search+h);
    }
    if(scroll&&pts)pts.scrollIntoView({behavior:"smooth",block:"start"});
  }

  /* ---- Berita & Panduan Blog Tab ---- */
  var BLOG_CAT_LABELS={berita:"Berita","panduan-konser":"Panduan Konser","tips-gunung":"Tips Gunung",wisata:"Wisata",opini:"Opini",review:"Review",komunitas:"Komunitas"};
  /* nama niche mengikuti bahasa halaman (kamus blog_c_*); kategori lain memakai nama bawaan */
  function blogCatLabel(c){var k="blog_c_"+String(c).replace(/-/g,"_"),t=tr(k);return t&&t!==k?t:(BLOG_CAT_LABELS[c]||c||"Blog")}
  var BLOG_SHOW=6,blogAll=false;
  function stripHtml(s){return String(s||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
  /* Sumber tab: tulisan yang admin terbitkan di Supabase (langsung, jadi hasil panel admin ikut berubah di beranda).
     Cadangan: data/posts.json (hasil build) bila Supabase gagal/dijeda. Hanya topik terkait (IB_BlogTab.TOPICS).
     Hemat egress: simpan 2 menit di sessionStorage; admin-blog.js ikut menghapusnya bila admin menyimpan dari tab yang sama; tab lain menyusul <=2 menit. */
  var BLOG_KEY="gwm_blogtab_v1",BLOG_TTL=120000,BLOG_PER_TOPIC=8;
  function blogCacheGet(){try{var o=JSON.parse(sessionStorage.getItem(BLOG_KEY)||"null");if(o&&Array.isArray(o.rows)&&Date.now()-o.t<BLOG_TTL)return o.rows}catch(e){}return null}
  function blogCachePut(rows){try{sessionStorage.setItem(BLOG_KEY,JSON.stringify({t:Date.now(),rows:rows}))}catch(e){}}
  function blogLive(){
    var BT=window.IB_BlogTab,U=(C.SUPABASE_URL||"").replace(/\/+$/,""),K=C.SUPABASE_ANON_KEY||"";
    if(!BT||!U||!K)return Promise.resolve(null);
    var cols="id,title,slug,category,body,is_html,published_at";
    var url=U+"/rest/v1/blog_posts?status=eq.published&"+BT.query()+"&select="+cols+"&order=published_at.desc&limit="+(BT.TOPICS.length*BLOG_PER_TOPIC);
    return fetch(url,{headers:{apikey:K,Authorization:"Bearer "+K}}).then(function(r){return r.ok?r.json():null}).then(function(rows){
      return Array.isArray(rows)?BT.limit(rows,BLOG_PER_TOPIC):null;
    }).catch(function(){return null});
  }
  function loadBlog(){
    var grid=$("blogGrid");if(!grid)return;
    if(blogPosts){renderBlog();return}
    var cached=blogCacheGet();
    if(cached){blogPosts=cached;renderBlog();return}
    grid.innerHTML='<div class="sk"></div><div class="sk"></div>';
    blogLive().then(function(rows){
      if(rows){blogPosts=rows;blogCachePut(rows);renderBlog();return}
      return fetch("../data/posts.json").then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(arr){
        blogPosts=Array.isArray(arr)?arr:[];renderBlog();
      }).catch(function(){blogPosts=[];renderBlog()});
    });
  }
  function renderBlog(){
    var grid=$("blogGrid"),catsEl=$("blogCats");if(!grid||!blogPosts)return;
    var BT=window.IB_BlogTab,all=BT?BT.keep(blogPosts):blogPosts;
    var cats=["semua"].concat(BT?BT.topics(all):[]);
    if(cats.indexOf(blogCat)<0)blogCat="semua";
    if(catsEl){
      catsEl.innerHTML=cats.map(function(c){
        var lbl=c==="semua"?tr("blog_cat_all"):blogCatLabel(c);
        return'<button type="button" data-bc="'+esc(c)+'" aria-pressed="'+(blogCat===c)+'">'+esc(lbl)+'</button>';
      }).join("");
      catsEl.onclick=function(e){var b=e.target.closest("[data-bc]");if(!b)return;blogCat=b.dataset.bc;blogAll=false;renderBlog()};
    }
    var list=all.filter(function(p){return blogCat==="semua"||p.category===blogCat});
    if(!list.length){grid.innerHTML='<div class="empty"><b>'+esc(tr("blog_empty"))+'</b></div>';return}
    var more=blogAll?0:Math.max(0,list.length-BLOG_SHOW);
    if(more)list=list.slice(0,BLOG_SHOW);
    grid.innerHTML=list.map(function(p,idx){
      var txt=stripHtml(p.body),excerpt=txt.slice(0,140).replace(/\s+\S*$/,"")+"…";
      var mins=Math.max(2,Math.round(txt.split(/\s+/).length/180));
      var dt=String(p.published_at||"").slice(0,10);
      var catLbl=blogCatLabel(p.category);
      return'<article class="blog-card" data-bidx="'+blogPosts.indexOf(p)+'">'+
        '<div class="bc-meta"><span>'+esc(catLbl)+'</span><span> · '+esc(dt)+'</span><span> · '+esc(tr("blog_min",{n:mins}))+'</span></div>'+
        '<h3>'+esc(p.title)+'</h3><p>'+esc(excerpt)+'</p>'+
        '<div class="bc-foot"><button type="button" class="lnk" data-bopen="'+blogPosts.indexOf(p)+'">'+esc(tr("blog_read"))+' →</button><a class="lnk" href="../blog/'+esc(p.category||"berita")+'/'+esc(p.slug)+'">URL</a></div>'+
      '</article>';
    }).join("")+(more?'<div class="nv-more" style="grid-column:1/-1"><button type="button" class="btn line" data-bmore="1">'+esc(tr("blog_more",{n:more}))+'</button></div>':"");
    grid.onclick=function(e){
      if(e.target.closest("[data-bmore]")){blogAll=true;renderBlog();return}
      if(e.target.closest("a"))return;
      var card=e.target.closest("[data-bidx],[data-bopen]");if(!card)return;
      var i=+(card.dataset.bopen!=null?card.dataset.bopen:card.dataset.bidx);
      openPostModal(blogPosts[i]);
    };
  }
  function mdToSimpleHtml(txt){
    return String(txt||"").split(/\n\n+/).map(function(blk){
      blk=blk.trim();if(!blk)return"";
      if(/^###\s+/.test(blk))return"<h4>"+esc(blk.replace(/^###\s+/,""))+"</h4>";
      if(/^##\s+/.test(blk))return"<h3>"+esc(blk.replace(/^##\s+/,""))+"</h3>";
      if(/^- /.test(blk)){
        return"<ul>"+blk.split("\n").map(function(li){return"<li>"+esc(li.replace(/^- /,""))+"</li>"}).join("")+"</ul>";
      }
      return"<p>"+esc(blk).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\*([^*]+)\*/g,"<em>$1</em>")+"</p>";
    }).join("");
  }
  function openPostModal(p){
    var dlg=$("postDlg"),body=$("postDlgBody");if(!dlg||!body||!p)return;
    var catLbl=blogCatLabel(p.category);
    var content=p.is_html?p.body:mdToSimpleHtml(p.body);
    body.innerHTML='<div class="postd-h"><div><div class="meta">'+esc(catLbl)+' · '+esc(String(p.published_at||"").slice(0,10))+'</div><h2>'+esc(p.title)+'</h2></div><button type="button" class="ico-btn" id="postDlgX" aria-label="'+esc(tr("close"))+'"><svg class="i" aria-hidden="true"><use href="#i-x"/></svg></button></div>'+
      '<div class="postd-b">'+content+'</div>'+
      '<div class="postd-f"><a class="btn line" href="../blog/'+esc(p.category||"berita")+'/'+esc(p.slug)+'">'+esc(tr("blog_all"))+'</a><button type="button" class="btn pri" id="postDlgClose">'+esc(tr("close"))+'</button></div>';
    dlg.showModal();
    $("postDlgX").onclick=function(){dlg.close()};
    $("postDlgClose").onclick=function(){dlg.close()};
    dlg.onclick=function(e){if(e.target===dlg)dlg.close()};
  }

  /* ---- Deals & Partners Tab ---- */
  function renderDeals(){
    var grid=$("dealsGrid");if(!grid||!C.MONETIZE)return;
    var deals=C.MONETIZE.PARTNER_DEALS||[],aff=C.MONETIZE.AFFILIATE||{};
    var clk=+localStorage.getItem("gwm_aff_clicks")||0;
    if($("dealsClicks"))$("dealsClicks").textContent=tr("deals_clicks",{n:clk});
    grid.innerHTML=deals.map(function(dl){
      var title=L==="en"?dl.title_en:dl.title_id;
      var desc=L==="en"?dl.desc_en:dl.desc_id;
      var badge=L==="en"?dl.badge_en:dl.badge_id;
      var price=L==="en"?dl.price_en:dl.price_id;
      var cta=L==="en"?dl.cta_en:dl.cta_id;
      var href=dl.url==="#monetize"?"#promo":dl.url;
      if(/^https?:\/\//i.test(href)&&MC)href=MC.buildPartnerTicketUrl(href,dl.id,aff);
      var ext=/^https?:\/\//i.test(href)?' target="_blank" rel="noopener noreferrer"':"";
      return'<article class="deal-card"><div class="deal-top"><span class="deal-part">'+esc(dl.partner)+'</span><span class="deal-tag">'+esc(badge)+'</span></div>'+
        '<h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p>'+
        '<div class="deal-meta"><span>'+esc(dl.city)+'</span><span> · <b>'+esc(price)+'</b></span></div>'+
        '<div class="deal-act"><a class="btn sm pri" href="'+esc(href)+'"'+ext+' data-deal="'+esc(dl.id)+'">'+esc(cta)+'</a></div>'+
      '</article>';
    }).join("");
    grid.onclick=function(e){
      var a=e.target.closest("[data-deal]");if(!a)return;
      try{var n=(+localStorage.getItem("gwm_aff_clicks")||0)+1;localStorage.setItem("gwm_aff_clicks",String(n));if($("dealsClicks"))$("dealsClicks").textContent=tr("deals_clicks",{n:n})}catch(ex){}
      if(a.getAttribute("href")==="#promo"){e.preventDefault();switchTab("promo",true)}
    };
  }

  /* ---- Promote & Monetize ROI Calculator + Booking Form ---- */
  var promoInited=false,selTier="city_spotlight";
  function initPromo(){
    var tiersBox=$("promoTiers"),citySel=$("promoCity"),weeksSel=$("promoWeeks");
    if(!tiersBox||!MC)return;
    if(!promoInited){
      promoInited=true;
      var allCities=[];Object.keys(REG).forEach(function(p){allCities=allCities.concat(REG[p])});
      allCities.sort();
      citySel.innerHTML=allCities.map(function(c){return'<option value="'+esc(c)+'">'+esc(c)+'</option>'}).join("");
      var cur=curLoc();citySel.value=(cur.city&&cur.city!=="semua"&&GEO[cur.city])?cur.city:"Bandung";
      tiersBox.onclick=function(e){
        var b=e.target.closest("[data-tier]");if(!b)return;
        selTier=b.dataset.tier;renderPromo();
      };
      citySel.onchange=renderPromo;weeksSel.onchange=renderPromo;
      var form=$("promoForm");
      if(form)form.onsubmit=handlePromoSubmit;
    }
    renderPromo();
  }
  function promoTierMeta(id){
    if(id==="free")return{name:tr("promo_tier_free"),perks:tr("promo_tier_free_d")};
    if(id==="national_portal")return{name:tr("promo_tier_nat"),perks:tr("promo_tier_nat_d")};
    return{name:tr("promo_tier_city"),perks:tr("promo_tier_city_d")};
  }
  function renderPromo(){
    var tiersBox=$("promoTiers"),estBox=$("promoEstBox"),citySel=$("promoCity"),weeksSel=$("promoWeeks");
    if(!tiersBox||!estBox||!MC)return;
    var order=["free","city_spotlight","national_portal"].filter(function(id){return!!MC.PROMO_TIERS[id]});
    tiersBox.innerHTML=order.map(function(id){
      var t=MC.PROMO_TIERS[id],meta=promoTierMeta(id);
      var pr=t.pricePerWeekIdr?(MC.formatRupiah(t.pricePerWeekIdr)+"/mg"):(L==="en"?"Free":"Gratis");
      return'<button type="button" class="tier-opt'+(selTier===id?" on":"")+'" data-tier="'+esc(id)+'">'+
        '<div class="tier-h"><b>'+esc(meta.name)+'</b><span>'+esc(pr)+'</span></div>'+
        '<small>'+esc(meta.perks)+'</small>'+
      '</button>';
    }).join("");
    var est=MC.estimatePromoCampaign({tierId:selTier,weeks:+weeksSel.value||1,city:citySel.value||"Bandung"});
    estBox.innerHTML='<div class="est-grid">'+
      '<div><span>'+esc(tr("promo_reach"))+'</span><b class="mono">'+est.estImpressions.toLocaleString(tr("numloc"))+'</b></div>'+
      '<div><span>'+esc(tr("promo_clicks"))+'</span><b class="mono">'+est.estClicks.toLocaleString(tr("numloc"))+'</b></div>'+
      '<div><span>'+esc(tr("promo_total"))+'</span><b class="mono">'+esc(MC.formatRupiah(est.totalCostIdr))+'</b></div>'+
    '</div>'+(est.discountPct?'<p class="est-disc">'+esc(tr("promo_disc",{p:est.discountPct}))+'</p>':"");
  }
  var promoBusy=false;
  var PROMO_PKG_ID={free:"Listing Komunitas (Gratis)",city_spotlight:"City Spotlight",national_portal:"Banner Nasional (Portal Hero)"};
  function promoShowErr(res,key,args){res.hidden=false;res.className="promo-res err";res.textContent=tr(key,args)}
  function promoShowOk(res,okKey,code,msgTxt,synced){
    var waHref="https://wa.me/"+(C.CONTACT_WA||"6282243562960")+"?text="+encodeURIComponent(msgTxt);
    var mailHref="mailto:"+(C.CONTACT_EMAIL||"halo@gowithdme.com")+"?subject="+encodeURIComponent("Order Promosi "+code)+"&body="+encodeURIComponent(msgTxt);
    res.hidden=false;res.className="promo-res "+(synced?"ok":"warn");
    res.innerHTML='<p>'+esc(tr(okKey,{code:code}))+'</p><div class="promo-res-act"><a class="btn sm pri" target="_blank" rel="noopener noreferrer" href="'+esc(waHref)+'">'+esc(tr("promo_wa_send"))+'</a><a class="btn sm line" href="'+esc(mailHref)+'">'+esc(tr("promo_mail_send"))+'</a></div>';
  }
  function handlePromoSubmit(e){
    e.preventDefault();
    if(promoBusy)return;
    var res=$("promoResult");if(!res||!MC)return;
    var city=$("promoCity").value||"Bandung",weeks=+$("promoWeeks").value||1;
    var f={org:$("prOrg").value,title:$("prTitle").value,wa:$("prWa").value,note:$("prNote").value,tierId:selTier,city:city};
    var v=MC.validatePromoLead(f);
    if(!v.ok){
      promoShowErr(res,v.field==="org"?"promo_err_name":v.field==="title"?"promo_err_title":"promo_err_wa");
      var fid={org:"prOrg",title:"prTitle",wa:"prWa"}[v.field];if(fid&&$(fid).focus)$(fid).focus();
      return;
    }
    var est=MC.estimatePromoCampaign({tierId:selTier,weeks:weeks,city:city});
    var btn=$("promoForm").querySelector('button[type="submit"]'),btnTxt=btn?btn.textContent:"";
    promoBusy=true;if(btn){btn.disabled=true;btn.textContent=tr("promo_sending")}
    res.hidden=true;
    var args=MC.buildSponsorLeadArgs(f,est);
    var canSend=!!window.sb&&C.SPONSOR_LEADS_ENABLED!==false;
    var call=canSend?Promise.resolve(window.sb.rpc("submit_sponsor_lead",args)).then(function(r){return r},function(err){return{error:err||{message:"network"}}}):Promise.resolve({error:{message:"offline"}});
    call.then(function(r){
      promoBusy=false;if(btn){btn.disabled=false;btn.textContent=btnTxt}
      var err=r&&r.error;
      /* P0001 = penolakan sengaja dari fungsi SQL (validasi / pembatas laju): tampilkan, jangan buat kode palsu */
      if(err&&err.code==="P0001"){
        promoShowErr(res,/terlalu banyak/i.test(err.message||"")?"promo_err_rate":"promo_err_server",{why:err.message||""});
        return;
      }
      var synced=!err&&r&&r.data&&r.data.code;
      var code=synced?String(r.data.code):MC.buildPromoOrderCode(city,selTier);
      var msgTxt="Halo GWM! Order Promosi "+code+(synced?"":" (belum tercatat di server)")+"\nBrand/EO: "+f.org.trim()+"\nEvent: "+f.title.trim()+"\nPaket: "+(PROMO_PKG_ID[selTier]||selTier)+" ("+weeks+" minggu · "+city+")\nEstimasi Investasi: "+MC.formatRupiah(est.totalCostIdr)+"\nWA: "+v.wa+(f.note.trim()?"\nCatatan: "+f.note.trim():"");
      try{
        var prev=JSON.parse(localStorage.getItem("gwm_promo_orders")||"[]");
        prev.unshift({code:code,org:f.org.trim(),title:f.title.trim(),wa:v.wa,note:f.note.trim(),tier:selTier,city:city,weeks:weeks,totalIdr:est.totalCostIdr,synced:!!synced,createdAt:new Date().toISOString()});
        localStorage.setItem("gwm_promo_orders",JSON.stringify(prev.slice(0,12)));
      }catch(ex){}
      promoShowOk(res,synced?"promo_ok":"promo_ok_offline",code,msgTxt,!!synced);
      if(synced&&$("promoForm"))$("promoForm").reset();
    });
  }

  /* ---- Right Rail: Regional Pulse & Nearby Cities + Native Sponsor ---- */
  function renderRightRail(){
    var bars=$("railPulseBars"),nearBox=$("railNearBox"),spBox=$("nvSponsorCard");
    var evs=activeEvents();
    if(bars&&PC){
      var raw=PC.summarizeRegionDensity(evs,REG,MAC)||{};
      var byM=raw.byMacro||{};
      var sum=Object.keys(MAC).map(function(m){return{macro:m,count:byM[m]||0}}).sort(function(a,b){return b.count-a.count}).slice(0,6);
      var max=Math.max(1,sum[0]?sum[0].count:1);
      bars.innerHTML=sum.map(function(row){
        var pct=row.count?Math.max(8,Math.round(row.count/max*100)):0;
        return'<button type="button" class="pulse-row" data-rmacro="'+esc(row.macro)+'">'+
          '<div class="pulse-lbl"><span>'+esc(row.macro)+'</span><b class="mono">'+row.count+'</b></div>'+
          '<div class="pulse-trk"><i style="width:'+pct+'%"></i></div>'+
        '</button>';
      }).join("");
      bars.onclick=function(e){
        var b=e.target.closest("[data-rmacro]");if(!b)return;
        if(window.IB_Api&&IB_Api.setLocation)IB_Api.setLocation({city:"semua",prov:"",macro:b.dataset.rmacro,radiusKm:0});
      };
    }
    if(nearBox&&PC){
      var loc=curLoc(),ref=(loc.city&&loc.city!=="semua"&&GEO[loc.city])?loc.city:(C.DEFAULT_CITY||"Bandung");
      var near=PC.getNearbyCities(ref,GEO,100).slice(0,6);
      if(near.length){
        nearBox.hidden=false;
        nearBox.innerHTML='<h4>'+esc(tr("rail_near_h",{c:ref}))+'</h4><div class="near-chips">'+near.map(function(n){
          return'<button type="button" data-ncity="'+esc(n.city)+'">'+esc(n.city)+' <small>'+n.distanceKm+' km</small></button>';
        }).join("")+'</div>';
        nearBox.onclick=function(e){
          var b=e.target.closest("[data-ncity]");if(!b)return;
          if(window.IB_Api&&IB_Api.setLocation)IB_Api.setLocation({city:b.dataset.ncity,prov:"",macro:"",radiusKm:50});
        };
      }else nearBox.hidden=true;
    }
    if(spBox&&C.MONETIZE&&C.MONETIZE.NATIVE_SPONSOR){
      var sp=C.MONETIZE.NATIVE_SPONSOR;
      spBox.innerHTML='<h3><span>'+esc(tr("rail_sponsor_h"))+'</span><span class="sp-tier-hint">'+esc(L==="en"?sp.tier_hint_en:sp.tier_hint_id)+'</span></h3>'+
        '<b>'+esc(L==="en"?sp.title_en:sp.title_id)+'</b>'+
        '<p>'+esc(L==="en"?sp.desc_en:sp.desc_id)+'</p>'+
        '<button type="button" class="btn pri block" id="railPromoGo">'+esc(L==="en"?sp.cta_en:sp.cta_id)+'</button>';
      $("railPromoGo").onclick=function(){switchTab("promo",true)};
    }
  }

  /* ---- Global event bindings ---- */
  function bindPortalNav(){
    var qscope=$("sxQuickScope");
    if(qscope){
      qscope.onclick=function(e){
        var bt=e.target.closest("[data-ptab]");if(bt){switchTab(bt.dataset.ptab,true);return}
        var bq=e.target.closest("[data-sq]");if(!bq)return;
        var inp=$("gq2");if(!inp)return;
        inp.value=bq.dataset.sq;inp.focus();
        inp.dispatchEvent(new Event("input",{bubbles:true}));
      };
    }
    var pTabs=$("portalTabs");
    if(pTabs){
      pTabs.onclick=function(e){
        var b=e.target.closest("[data-ptab]");if(!b)return;
        switchTab(b.dataset.ptab,false);
      };
    }
    d.addEventListener("click",function(e){
      var a=e.target.closest(".js-tab-link[data-ptab]");if(!a)return;
      if($("portalTabs")){
        e.preventDefault();
        var mm=$("mm");if(mm&&!mm.hidden){var closeBtn=mm.querySelector("[data-mmx]");if(closeBtn)closeBtn.click();}
        switchTab(a.dataset.ptab,true);
      }
    });
  }

  d.addEventListener("ib:ready",function(){
    updateLocBadges();
    renderRightRail();
    var h=(location.hash||"").replace(/^#/,"")||INIT_HASH;
    if(h==="blog"||h==="deals"||h==="promo")switchTab(h,true);
  });
  d.addEventListener("ib:render",function(){
    updateLocBadges();
    renderRightRail();
  });

  buildQuickMacroBar();
  bindLocationExplorer();
  bindPortalNav();
  updateLocBadges();
  renderRightRail();

  window.IB_PortalPro={openLoc:openLocModal,switchTab:switchTab,updateLoc:updateLocBadges};
})();
