if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,"")+location.search);
(function(){
var C=window.IB_CONFIG,DUM=document.createElement("div"),MODE=window.IB_MODE||"all",$=function(i){return document.getElementById(i)||DUM};
var tr=window.IB_T||function(k){return k},LOC=tr("locale"),MON=tr("mon").split(",");
var CAT={konser:tr("cat_konser"),naikgunung:tr("cat_naikgunung"),pameran:tr("cat_pameran"),festival:tr("cat_festival"),komedi:tr("cat_komedi"),seminar:tr("cat_seminar"),meetup:tr("cat_meetup"),lainnya:tr("cat_lainnya")};
var GRAD={konser:["#3b1a78","#ff3d81"],pameran:["#b45309","#e11d48"],festival:["#7c2d12","#f59e0b"],komedi:["#0f766e","#facc15"],seminar:["#1e3a8a","#38bdf8"],meetup:["#6d28d9","#ec4899"],lainnya:["#334155","#64748b"]};
var CICON={naikgunung:"mtn",pameran:"bag",festival:"ticket",komedi:"chat",seminar:"note",meetup:"users",lainnya:"cal"};
var DIF={pemula:tr("dif_pemula"),menengah:tr("dif_menengah"),sulit:tr("dif_sulit")};
var SOC={},state={inv:false,cat:"semua",city:"semua",when:"semua",price:"semua",sort:"date",q:"",prov:"",macro:"",artist:"",genre:"",radiusKm:0,view:"grid",events:[],limit:12};
var F=window.IB_Facets||{norm:function(x){return String(x||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()},slug:function(x){return String(x||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")},artists:function(){return[]},genres:function(){return[]},hasArtist:function(){return true},hasGenre:function(){return true}};
var saved=read("ib_saved",[]);
var kp=new URLSearchParams(location.search).get("kat");
if(MODE==="all"&&/^(konser|naikgunung|pameran|festival|komedi|seminar|meetup|lainnya|tersimpan|selesai)$/.test(kp||""))state.cat=kp;
if(MODE==="home")state.when="week";if(MODE==="gunung")state.cat="naikgunung";
/* tautan dari panel pencarian (alamat dibuat rapi, huruf kecil dan tanda hubung):
   ?q=blood+saga  ?artis=dewa-19  ?genre=k-pop  ?kota=bandung  ?prov=jawa-barat  ?kat=konser
   Nama biasa (?kota=Bandung, ?prov=Jawa%20Barat) tetap diterima, jadi tautan lama tidak rusak. */
var QP=new URLSearchParams(location.search);
function pick(map,v){var n=F.norm(v);if(!n)return"";for(var k in map)if(F.norm(k)===n)return k;return""}
if(MODE!=="home"){if(QP.get("q"))state.q=QP.get("q").trim().replace(/\s+/g," ").slice(0,80);
  var qk=QP.get("kota");if(qk&&window.IB_REGIONS){for(var pp in IB_REGIONS){var hit=IB_REGIONS[pp].filter(function(c){return F.norm(c)===F.norm(qk)})[0];if(hit){state.city=hit;break}}}
  var qp=QP.get("prov");if(qp&&window.IB_REGIONS){var pk=pick(IB_REGIONS,qp);if(pk)state.prov=pk}
  var qa=QP.get("artis")||QP.get("artist");if(qa)state.artist=F.norm(qa).slice(0,60);
  var qg=QP.get("genre");if(qg)state.genre=F.norm(qg).slice(0,40);
  if(QP.get("sort")==="new")state.sort="new";
  var qm=QP.get("macro");if(qm&&window.IB_MACRO&&IB_MACRO[qm])state.macro=qm;var qr=parseInt(QP.get("rad")||"0",10);if(qr>0)state.radiusKm=qr}
/* rapikan alamat di bilah browser: urutan tetap, spasi jadi +, nama wilayah jadi slug */
function tidyUrl(){if(MODE==="home"||!history.replaceState)return;
  if(!(QP.get("q")||QP.get("artis")||QP.get("artist")||QP.get("genre")||QP.get("kota")||QP.get("prov")))return;
  var o=[],used={};function add(k,v){if(v!==""&&v!=null)o.push(k+"="+encodeURIComponent(v).replace(/%20/g,"+").replace(/%2C/g,","))}
  var kt=QP.get("kat");if(kt)add("kat",kt);
  if(state.artist)add("artis",F.slug(state.artist));if(state.genre)add("genre",F.slug(state.genre));
  if(state.city!=="semua"&&QP.get("kota"))add("kota",F.slug(state.city));if(state.prov&&QP.get("prov"))add("prov",F.slug(state.prov));
  if(state.macro)add("macro",state.macro);if(state.radiusKm)add("rad",state.radiusKm);if(state.q)add("q",state.q);
  ["kat","artis","artist","genre","kota","prov","macro","rad","q"].forEach(function(k){used[k]=1});
  QP.forEach(function(v,k){if(!used[k])add(k,v)});
  var next=o.length?"?"+o.join("&"):"";if(next!==location.search)history.replaceState(null,"",location.pathname+next+location.hash)}
tidyUrl();
/* lokasi tersimpan tidak boleh menyempitkan hasil pencarian: kata, artis, atau genre dicari di seluruh Indonesia */
var HAS_Q=!!(state.q||state.artist||state.genre);
if(!HAS_Q&&!QP.get("kota")&&!QP.get("prov")&&!QP.get("macro")){try{var svLoc=JSON.parse(localStorage.getItem("gwm_loc")||"null");if(svLoc&&typeof svLoc==="object"){if(svLoc.city)state.city=svLoc.city;if(svLoc.prov)state.prov=svLoc.prov;if(svLoc.macro)state.macro=svLoc.macro;if(svLoc.radiusKm)state.radiusKm=+svLoc.radiusKm||0}}catch(e){}}
try{if(localStorage.getItem("gwm_view")==="list")state.view="list"}catch(e){}
function read(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var esc=window.esc||function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function toast(m){if(window.toast)return window.toast(m);var t=$("toast");if(t){t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},2400)}}
function ic(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function prov(c){for(var p in IB_REGIONS)if(IB_REGIONS[p].indexOf(c)>-1)return p;return""}
/* ---- Logika tanggal (zona WIB, bukan jam perangkat) ---- */
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function days(a,b){return Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/864e5)}
function endOf(e){return e.end_date||e.event_date}
function isActive(e){return endOf(e)>=today()}
function isFeatured(e){if(!e||!e.is_featured)return false;if(e.featured_until&&e.featured_until<today())return false;return true}
function featBadge(e){if(!isFeatured(e))return"";var lab=(e.sponsor_label||(window.IB_CONFIG&&(window.IB_LANG==="en"?IB_CONFIG.FEATURED_LABEL_EN:IB_CONFIG.FEATURED_LABEL_ID))||(window.IB_T?IB_T("feat"):"Featured"));return'<span class="badge feat">'+esc(lab)+'</span>'}
/* Status: live = sedang berjalan (multi-hari / hari-H), soon = <=7 hari, next = lebih jauh, past = selesai */
function status(e){var t=today(),s=days(t,e.event_date),en=days(t,endOf(e));
  if(en<0)return{k:"past",l:tr("past"),n:s};
  if(s<=0)return{k:"live",l:en===0&&s===0?tr("today"):en===0?tr("lastday"):tr("ongoing"),n:0};
  return{k:s<=7?"soon":"next",l:s===1?tr("tomorrow"):tr("indays",{n:s}),n:s}}
function gratis(e){return/gratis|free/i.test(e.price_label||"")}
function paid(e){return!gratis(e)&&/\d/.test(e.price_label||"")}
function dparts(s){var d=new Date(s+"T00:00:00");return{d:("0"+d.getDate()).slice(-2),m:MON[d.getMonth()],full:d.toLocaleDateString(LOC,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}}
function rng(e){var a=new Date(e.event_date+"T00:00:00"),b=new Date(endOf(e)+"T00:00:00"),o={day:"numeric",month:"short"},y={day:"numeric",month:"short",year:"numeric"};
  return e.event_date===endOf(e)?a.toLocaleDateString(LOC,y):a.toLocaleDateString(LOC,o)+" – "+b.toLocaleDateString(LOC,y)}
function purl(u){u=String(u||"");return/^(https?:|data:|\/\/)/.test(u)?u:"../"+u.replace(/^\//,"")}
/* tautan dari database hanya boleh http/https; handle IG hanya huruf, angka, titik, garis bawah */
function waDigits(n){n=String(n||"").replace(/\D/g,"");return/^62\d{8,13}$/.test(n)?n:""}
function safeUrl(u){u=String(u||"").trim();return/^https?:\/\//i.test(u)?u:""}
function igHandle(s){var h=String(s||"").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i,"").replace(/^@/,"").replace(/[\/?#].*$/,"");return/^[A-Za-z0-9._]{1,30}$/.test(h)?h:""}
function posterStyle(e,fit){var g=e.g||GRAD[e.category]||["#14532d","#ff5a1f"],bg="linear-gradient(160deg,"+g[0]+","+g[1]+")";
  if(!e.poster_url)return"background:"+bg;
  var u="url('"+esc(purl(e.poster_url)).replace(/'/g,"%27")+"')";
  /* --po dipakai CSS .pf (latar buram) dan .pfo (poster utuh). fit=true: poster tidak dipotong, rasio apa pun muat. */
  return"--po:"+u+";background:"+(fit?"":u+" center/cover,")+bg}
function deco(e){return e.poster_url?'<span class="pfo" aria-hidden="true"></span>':'<svg class="deco" aria-hidden="true"><use href="#'+(e.category==="naikgunung"?"ridge":"bars")+'"/></svg>'}
/* info tambahan per kategori (teks polos, belum di-escape) */
function info(e){return e.category==="naikgunung"?[e.mountain,e.altitude_mdpl?e.altitude_mdpl+" "+tr("mdpl"):"",DIF[e.difficulty]||"",e.duration]:e.category==="pameran"?[]:[e.genre]}
function kind(e){return[CAT[e.category]||e.category].concat(info(e)).filter(Boolean).join(" · ")}
function ttl(e){return window.IB_LANG==="en"&&e.title_en?e.title_en:e.title}
function dsc(e){return window.IB_LANG==="en"&&e.description_en?e.description_en:e.description}
function isSaved(id){return saved.indexOf(String(id))>-1}
/* Buang duplikat: kota + tanggal mulai + 10 huruf/angka pertama judul sama = satu event (pertahankan yang punya poster/tiket). */
function nk(t){return String(t||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,10)}
function dedupe(rows){var m={},out=[];rows.forEach(function(r){var k=[r.city_id||r.city,r.event_date,nk(r.title)].join("|"),i=m[k];
  if(i===undefined){m[k]=out.length;out.push(r)}else if(!out[i].poster_url&&r.poster_url||!out[i].ticket_url&&r.ticket_url&&!!out[i].poster_url===!!r.poster_url)out[i]=r});return out}
/* ---- Data ---- */
function load(){
  if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY){state.events=IB_SAMPLE;return Promise.resolve()}
  return IB_loadEvents()   /* js/events-src.js: satu unduhan bersama, kolom terpilih, cadangan data/events.json */
   .then(function(rows){state.events=dedupe(rows)})
   .catch(function(){state.events=IB_SAMPLE;toast(tr("loadfail"))})
   .then(loadSocial);
}
function loadSocial(){if(!window.sb)return;
  return window.sb.from("event_social").select("*").then(function(r){(r.data||[]).forEach(function(z){SOC[z.event_id]=z})},function(){})}
function loadChips(){var box=$("kChips");if(!box||!window.sb)return;
  window.sb.from("forum_city_stats").select("*").order("sort").then(function(r){var A=(r.data||[]).filter(function(c){return c.active});if(!A.length)return;
    /* kotamu dulu (kota terpilih / kota awal), lalu urutan bawaan; yang tidak muat di satu baris disembunyikan, "Semua kota" selalu ada */
    var my="";try{var sl=JSON.parse(localStorage.getItem("gwm_loc")||"null");my=(sl&&sl.city&&sl.city!=="semua")?sl.city:""}catch(e){}
    my=my||(window.IB_CONFIG&&IB_CONFIG.DEFAULT_CITY)||"";
    A=A.filter(function(c){return c.city===my}).concat(A.filter(function(c){return c.city!==my}));
    box.innerHTML=A.map(function(c){return'<a class="kchip" data-fit="1" href="komunitas?kota='+encodeURIComponent(c.city)+'">'+esc(c.city)+(c.posts?' <small>'+c.posts+'</small>':'')+'</a>'}).join("")+'<a class="kchip all" href="komunitas">'+esc(tr("home_allcities"))+'</a>';
    var fit=function(){var it=[].slice.call(box.querySelectorAll("[data-fit]"));it.forEach(function(a){a.hidden=false});if(!box.clientWidth)return;for(var k=it.length-1;k>=0&&box.scrollWidth>box.clientWidth+1;k--)it[k].hidden=true};
    fit();var t;window.addEventListener("resize",function(){clearTimeout(t);t=setTimeout(fit,150)})},function(){})}
function invN(e){return SOC[e.id]?+SOC[e.id].open_invites||0:0}
/* "Baru": hanya saat daftar diurutkan terbaru (event?sort=new) dan ada acuan kunjungan dari beranda di sesi ini. */
var NEWBASE=0;try{NEWBASE=+sessionStorage.getItem("gwm_home_base")||0}catch(e){}
function newBadge(e){var C=window.IB_SinceCore;return state.sort==="new"&&NEWBASE&&C&&C.isNewSince(e,NEWBASE)?'<span class="badge int">'+esc(tr("sn_new"))+'</span>':""}
function invBadge(e){var n=invN(e),w=SOC[e.id]?+SOC[e.id].interested||0:0;
  return n?'<span class="badge inv">'+esc(tr("aj_open_badge",{n:n}))+'</span>':(w?'<span class="badge int">'+esc(tr("aj_interest_n",{n:w}))+'</span>':"")}
/* ---- Klasifikasi & filter ---- */
function hay(e){return(e.title+" "+(e.title_en||"")+" "+(e.venue||"")+" "+(e.mountain||"")+" "+(e.genre||"")+" "+(e.city||"")+" "+(e.organizer||"")).toLowerCase()}
function locMatch(e){
  if(window.IB_PortalCore){
    return IB_PortalCore.filterEventsByLocation([e],{city:state.city,prov:state.prov,macro:state.macro,radiusKm:state.radiusKm},window.IB_REGIONS||{},window.IB_GEO||{},window.IB_MACRO||{}).length>0;
  }
  return(state.city==="semua"||e.city===state.city)&&(!state.prov||(IB_REGIONS[state.prov]||[]).indexOf(e.city)>-1);
}
function base(e,noWhen){var qs=state.q.toLowerCase().split(/\s+/).filter(Boolean),h=hay(e);
  return locMatch(e)
   &&(noWhen||state.when==="semua"||(state.when==="live"?status(e).k==="live":status(e).n<=(state.when==="week"?7:30)))
   &&(!state.artist||F.hasArtist(e,state.artist))&&(!state.genre||F.hasGenre(e,state.genre))
   &&(!state.inv||invN(e)>0)
   &&(state.price==="semua"||(state.price==="gratis"?gratis(e):paid(e)))
   &&(!state.q||(window.IB_EventMatch?IB_EventMatch(e,state.q):qs.every(function(w){return h.indexOf(w)>-1})))}
function list(){var past=state.cat==="selesai";
  var arr=state.events.filter(function(e){if(!base(e))return false;
    if(past)return!isActive(e);if(!isActive(e))return false;
    if(state.cat==="tersimpan")return isSaved(e.id);
    return state.cat==="semua"||e.category===state.cat})
   .sort(function(a,b){if(past)return a.event_date<b.event_date?1:-1;
     var fa=isFeatured(a)?1:0,fb=isFeatured(b)?1:0;if(fa!==fb)return fb-fa;
     var ba=+a.boost_score||0,bb=+b.boost_score||0;if(ba!==bb)return bb-ba;
     if(state.sort==="new")return(b.created_at||"")<(a.created_at||"")?-1:1;
     return a.event_date<b.event_date?-1:1});
  if(!past&&state.sort==="date"&&window.IB_MonetizeCore&&C&&C.MONETIZE){
    return IB_MonetizeCore.rankPortalEvents(arr,C.MONETIZE.SPONSORED_EVENTS||{});
  }
  return arr;}
function badge(e){var s=status(e);return'<span class="badge '+s.k+'">'+(s.k==="live"?"● ":"")+esc(s.l)+'</span>'}
function where(e){return esc(e.venue||e.city||"")+(e.venue&&e.city&&e.venue!==e.city&&state.city==="semua"?", "+esc(e.city):"")}
function priceOf(e){return e.price_label||""}
function buddyBtn(e){return'<button class="buddy" type="button" data-bd="'+esc(e.id)+'" aria-label="'+esc(tr("buddy_aria"))+'">'+ic("users")+'<span>'+esc(tr("buddy_btn"))+'</span></button>'}
function tile(e){var p=dparts(e.event_date),s=status(e),on=isSaved(e.id);
  var sp=e._sponsored?'<span class="meta-sp">'+esc(tr("promo_partner_badge"))+'</span>':'';
  return'<div class="tile'+(s.k==="past"?' past':'')+(e._sponsored?' is-sp':'')+'" data-id="'+esc(e.id)+'" tabindex="0" role="button" aria-label="'+esc(ttl(e))+'"><div class="thumb'+(e.poster_url?' pf':'')+'" style="'+posterStyle(e,1)+'">'+deco(e)+
    '<div class="d"><b>'+p.d+'</b><span>'+p.m+'</span></div>'+
    '<button class="fav sh" type="button" data-sh="'+esc(e.id)+'" aria-label="'+esc(tr("share"))+'">'+ic("share")+'</button>'+
    '<button class="fav" type="button" data-sv="'+esc(e.id)+'" aria-pressed="'+on+'" aria-label="'+esc(tr("sv_label"))+'">'+ic("heart")+'</button></div>'+
    '<div><div class="tt">'+esc(ttl(e))+'</div><div class="tm">'+where(e)+'</div><div class="tm">'+esc(kind(e))+(sp?' · '+sp:'')+'</div><div class="tm">'+badge(e)+newBadge(e)+featBadge(e)+invBadge(e)+'</div>'+
    '<div class="tm p'+(priceOf(e)?'':' t')+'">'+esc(priceOf(e)||tr("price_tbd"))+'</div>'+(s.k==="past"?'':buddyBtn(e))+'</div></div>'}
function row(e){var p=dparts(e.event_date),s=status(e),on=isSaved(e.id);
  var sp=e._sponsored?' · <span class="meta-sp">'+esc(tr("promo_partner_badge"))+'</span>':'';
  return'<div class="r'+(s.k==="past"?' past':'')+'" data-id="'+esc(e.id)+'" role="button" tabindex="0"><div class="rd" style="'+posterStyle(e)+'"><div><b>'+p.d+'</b><span>'+p.m+'</span></div></div>'+
    '<div class="rt"><b>'+esc(ttl(e))+'</b><span>'+esc(kind(e))+' · '+esc(rng(e))+sp+'</span></div>'+
    '<div class="rc">'+where(e)+'</div><div class="rs">'+badge(e)+newBadge(e)+featBadge(e)+invBadge(e)+'</div>'+
    '<div class="rp'+(priceOf(e)?'':' t')+'">'+esc(priceOf(e)||tr("price_soon"))+'</div>'+
    '<div class="ra">'+(s.k==="past"?'':'<button class="rf rbd" type="button" data-bd="'+esc(e.id)+'" aria-label="'+esc(tr("buddy_aria"))+'" title="'+esc(tr("buddy_btn"))+'">'+ic("users")+'</button>')+'<button class="rf" type="button" data-sh="'+esc(e.id)+'" aria-label="'+esc(tr("share"))+'">'+ic("share")+'</button>'+
    '<button class="rf" type="button" data-sv="'+esc(e.id)+'" aria-pressed="'+on+'" aria-label="'+esc(tr("sv_label"))+'">'+ic("heart")+'</button></div></div>'}
function sec(h,arr){if(!arr.length)return"";
  return'<div class="group">'+(h?'<h2>'+esc(h)+' <small>'+arr.length+'</small></h2>':'')+
   (state.view==="grid"?'<div class="tiles">'+arr.map(tile).join("")+'</div>':
    '<div class="rows"><div class="r rh"><div></div><div>'+tr("col_event")+'</div><div class="rc">'+tr("col_place")+'</div><div class="rs">'+tr("col_status")+'</div><div>'+tr("col_price")+'</div><div></div></div>'+arr.map(row).join("")+'</div>')+'</div>'}
function group(l){var G=[["live",tr("g_live")],["soon",tr("g_soon")],["next",tr("g_next")]];
  if(state.cat==="selesai"||state.sort!=="date")return sec("",l);
  return G.map(function(g){return sec(g[1],l.filter(function(e){return status(e).k===g[0]}))}).join("")}
/* ---- Sidebar & chip kategori ---- */
var NAVS=[["home","n_home","home","./"],["semua","n_all","cal","event"],["konser","cat_konser","mic","event?kat=konser"],["naikgunung","cat_naikgunung","mtn","gunung"],["pameran","cat_pameran","bag","event?kat=pameran"],["festival","cat_festival","ticket","event?kat=festival"],["komedi","cat_komedi","chat","event?kat=komedi"],["seminar","cat_seminar","note","event?kat=seminar"],["meetup","cat_meetup","users","event?kat=meetup"],["lainnya","cat_lainnya","cal","event?kat=lainnya"],["blog","n_blog","doc","../blog/"],["komunitas","n_forum","users","komunitas"],["ajukan","n_submit","plus","ajukan"],["bantuan","n_help","help","bantuan"]],
    MINE=[["tersimpan","tab_saved","heart","event?kat=tersimpan"],["selesai","tab_done","clock","event?kat=selesai"]];
function curKey(){return MODE==="home"?"home":MODE==="gunung"?"naikgunung":state.cat}
function item(c,n,chip){var cur=curKey()===c[0],inpage=MODE==="all"&&c[0]!=="home"&&c[0]!=="naikgunung"&&c[0]!=="ajukan"&&c[0]!=="komunitas"&&c[0]!=="bantuan"&&c[0]!=="blog";
  return'<a href="'+c[3]+'" data-c="'+c[0]+'"'+(inpage?' data-in="1"':'')+(cur?' aria-current="true"':'')+'>'+(chip?'':ic(c[2]))+esc(tr(c[1]))+(chip||n==null?'':'<span class="n">'+n+'</span>')+'</a>'}
function nav(){
  var act=state.events.filter(function(e){return isActive(e)&&base(e,true)}),n=function(c){return c==="semua"?act.length:act.filter(function(e){return e.category===c}).length};
  var nSaved=act.filter(function(e){return isSaved(e.id)}).length,nDone=state.events.filter(function(e){return!isActive(e)&&base(e,true)}).length;
  $("navCat").innerHTML=NAVS.map(function(c){return item(c,c[0]==="home"||c[0]==="ajukan"||c[0]==="komunitas"||c[0]==="bantuan"||c[0]==="blog"?null:n(c[0]))}).join("");
  $("navMine").innerHTML=MINE.map(function(c){return item(c,c[0]==="tersimpan"?nSaved:nDone)}).join("");
  $("mCat").innerHTML=NAVS.concat(MINE).map(function(c){return item(c,null,true)}).join("");
  var cnt={},all=state.events.filter(isActive);all.forEach(function(e){if(e.city)cnt[e.city]=(cnt[e.city]||0)+1});
  var names=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]||a.localeCompare(b)}).slice(0,10);
  if(state.city!=="semua"&&names.indexOf(state.city)<0)names.push(state.city);
  $("navCity").innerHTML=[["semua",tr("n_allcity"),all.length]].concat(names.map(function(c){return[c,c,cnt[c]||0]})).map(function(c){
    return'<button type="button" data-city="'+esc(c[0])+'" aria-pressed="'+(state.city===c[0])+'">'+ic("pin")+esc(c[1])+'<span class="n">'+c[2]+'</span></button>'}).join("")}
/* ---- Ticker event akan datang (hanya di beranda) ---- */
function tick(){var box=$("tick");if(MODE!=="home")return;
  var up=state.events.filter(function(e){var k=status(e).k;return(k==="soon"||k==="next")&&base(e,true)})
   .sort(function(a,b){return a.event_date<b.event_date?-1:a.event_date>b.event_date?1:0}).slice(0,12);
  if(!up.length){box.hidden=true;return}
  var set=up.map(function(e){var p=dparts(e.event_date),s=status(e);
    return'<button type="button" class="tk" data-id="'+esc(e.id)+'"><b>'+p.d+' '+p.m+'</b><span class="tn">'+esc(ttl(e))+'</span>'+(e.city?'<span class="tc">'+esc(e.city)+'</span>':'')+'<i class="'+s.k+'">'+esc(s.l)+'</i></button>'}).join("");
  var dup=set.replace(/<button /g,'<button tabindex="-1" aria-hidden="true" ');
  $("trk").innerHTML='<div class="tg">'+set+'</div><div class="tg dup" aria-hidden="true">'+dup+'</div>';
  $("trk").style.animationDuration=Math.max(18,up.length*5)+"s";box.hidden=false}
/* chip "Hasil untuk ..." di atas daftar bila filter datang dari pencarian */
var fchip=document.createElement("div");fchip.className="fchip";fchip.hidden=true;
if($("list").parentNode&&$("list")!==DUM)$("list").parentNode.insertBefore(fchip,$("list"));
function clearFilterUrl(){if(history.replaceState){var u=new URL(location.href);["q","prov","artis","artist","genre"].forEach(function(k){u.searchParams.delete(k)});history.replaceState(null,"",u.pathname+u.search)}}
var FLAB={};
function facetLabel(kind,key){var ck=kind+"|"+key;if(FLAB[ck])return FLAB[ck];
  state.events.some(function(e){return(kind==="a"?F.artists(e):F.genres(e)).some(function(x){if(x.k===key){FLAB[ck]=x.label;return true}})});
  return FLAB[ck]||key.replace(/\b[a-z]/g,function(c){return c.toUpperCase()})}
function chip(){var parts=[];if(state.q)parts.push(tr("sx_filter_chip",{q:state.q}));
  if(state.artist)parts.push(tr("sx_filter_artist",{a:facetLabel("a",state.artist)}));
  if(state.genre)parts.push(tr("sx_filter_genre",{g:facetLabel("g",state.genre)}));
  if(state.prov)parts.push(tr("sx_filter_prov",{p:IB_PROV(state.prov)}));
  fchip.hidden=!parts.length;if(!parts.length)return;
  fchip.innerHTML='<span>'+esc(parts.join(" · "))+'</span><button type="button" id="fchipX">'+esc(tr("sx_filter_clear"))+'</button>';
  $("fchipX").onclick=function(){state.q="";state.prov="";state.artist="";state.genre="";clearFilterUrl();render()}}
function render(){
  var l=list(),total=l.length,act=state.events.filter(isActive),pv=prov(state.city);
  if(MODE==="home")l=l.slice(0,state.limit);
  if(MODE==="all")$("evTitle").textContent=state.cat==="selesai"?tr("h_archive"):state.cat==="tersimpan"?tr("h_saved"):(state.city==="semua"?tr("h_active"):tr("h_active_city",{c:state.city}));
  var live=act.filter(function(e){return status(e).k==="live"}),up=act.filter(function(e){return status(e).k!=="live"});
  var vInv=act.reduce(function(t,e){return t+invN(e)},0),vInt=act.reduce(function(t,e){return t+(SOC[e.id]?+SOC[e.id].interested||0:0)},0);
  $("sEv").textContent=act.length;$("sInv").textContent=vInv;$("sInt").textContent=vInt;
  /* Belum ada ajakan: jangan pamerkan angka 0, ganti dengan ajakan menjadi yang pertama */
  if($("sInv")!==DUM){var cI=$("sInv").parentNode,cT=$("sInt").parentNode,bx=cI.parentNode,cta=bx.querySelector(".stat.cta"),zero=!vInv&&!vInt;
    cI.hidden=cT.hidden=zero;
    if(zero&&!cta){cta=document.createElement("a");cta.className="stat cta";cta.href="event";cta.innerHTML="<b></b><span></span>";bx.appendChild(cta)}
    if(cta){cta.hidden=!zero;cta.firstChild.textContent=tr("st_cta_h");cta.lastChild.textContent=tr("st_cta_p")}}
  $("sNext").textContent=live.length?tr("st_now"):up.length?(function(n){return tr(n===1?"st_day1":"st_days",{n:n})})(Math.min.apply(null,up.map(function(e){return status(e).n}))):"-";
  nav();$("city").value=state.city;$("cnt").textContent=tr("found",{n:l.length});
  $("vGrid").setAttribute("aria-pressed",state.view==="grid");$("vList").setAttribute("aria-pressed",state.view==="list");
  $("list").innerHTML=l.length?group(l):'<div class="group"><div class="empty"><b>'+(state.cat==="tersimpan"?tr("empty_saved"):(MODE==="home"?tr("empty_home"):tr("empty")))+'</b>'+(state.cat==="tersimpan"?'':MODE==="home"?'<a class="btn line" href="event">'+tr("see_all")+'</a>':'<button class="btn line" id="reset2" type="button">'+tr("reset_f")+'</button>')+'</div></div>';
  var r=$("reset2");if(r)r.onclick=reset;
  tick();chip();
  var mb=$("more");if(mb!==DUM){mb.hidden=total<=l.length;if(!mb.hidden)$("moreB").textContent=tr("nv_more",{n:total-l.length})}
  var wxCity=state.city!=="semua"?state.city:(state.prov&&IB_REGIONS[state.prov]?IB_REGIONS[state.prov][0]:(state.macro&&window.IB_MACRO&&IB_MACRO[state.macro]?(IB_REGIONS[IB_MACRO[state.macro][0]]||[])[0]:"semua"));
  if(window.IB_Now)IB_Now.setCity(wxCity||"semua");
  document.dispatchEvent(new CustomEvent("ib:render"))}
function reset(){state.limit=12;state.inv=false;var fb=$("fInv");if(fb){fb.setAttribute("aria-pressed","false");fb.classList.remove("on")}state.cat=MODE==="gunung"?"naikgunung":"semua";state.city="semua";state.when="semua";state.price="semua";state.sort="date";state.q="";state.prov="";state.artist="";state.genre="";state.macro="";state.radiusKm=0;
  try{localStorage.removeItem("gwm_loc")}catch(e){}
  ["city","when","price","sort"].forEach(function(i){$(i).value=state[i]});clearFilterUrl();render()}
/* ---- Aksi: simpan, bagikan, kalender, peta ---- */
function toggleSave(id){id=String(id);var i=saved.indexOf(id);if(i>-1)saved.splice(i,1);else saved.push(id);write("ib_saved",saved);toast(i>-1?tr("sv_rm"):tr("sv_add"));render()}
function ics(e){var f=function(s){return s.replace(/-/g,"")},n=new Date(endOf(e)+"T00:00:00Z");n.setUTCDate(n.getUTCDate()+1);
  var t=function(s){return String(s||"").replace(/[\\;,]/g,"\\$&").replace(/\r?\n/g,"\\n")};
  var fold=function(l){var o=[];while(l.length>70){o.push(l.slice(0,70));l=" "+l.slice(70)}o.push(l);return o.join("\r\n")};
  var loc=[e.venue,e.city].filter(Boolean).join(", "),tk=safeUrl(e.ticket_url);
  var b=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GoWithDME//"+window.IB_LANG.toUpperCase(),"BEGIN:VEVENT","UID:"+e.id+"@gowithdme.com","DTSTAMP:"+new Date().toISOString().replace(/[-:]|\.\d+/g,""),"DTSTART;VALUE=DATE:"+f(e.event_date),"DTEND;VALUE=DATE:"+n.toISOString().slice(0,10).replace(/-/g,""),"SUMMARY:"+t(ttl(e))]
   .concat(loc?["LOCATION:"+t(loc)]:[],["DESCRIPTION:"+t(dsc(e)||"")],tk?["URL:"+tk]:[],["END:VEVENT","END:VCALENDAR"]).map(fold).join("\r\n");
  var u=URL.createObjectURL(new Blob([b],{type:"text/calendar;charset=utf-8"})),a=document.createElement("a");
  a.href=u;a.download=(ttl(e)||"event").replace(/\W+/g,"-").replace(/^-+|-+$/g,"")+".ics";if(a.download===".ics")a.download="event.ics";
  document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);toast(tr("ics_ok"))}
/* Tautan bagikan = halaman statis /id/e/<slug> (punya judul, deskripsi, dan gambar OG per event; perayap medsos tidak menjalankan JS). Tanpa slug: kembali ke tautan aplikasi. */
function evUrl(e){var b=location.origin+location.pathname.replace(/[^\/]*$/,"");return e.slug?b+"e/"+encodeURIComponent(e.slug):b+(e.category==="naikgunung"?"gunung":"event")+"?e="+encodeURIComponent(e.id)}
function byId(id){return state.events.filter(function(x){return String(x.id)===String(id)})[0]}
function share(e){var d={title:ttl(e),text:e.city?tr("share_text",{t:ttl(e),c:e.city}):tr("share_text2",{t:ttl(e)}),url:evUrl(e),image:e.poster_url?purl(e.poster_url):"",meta:[rng(e),e.city].filter(Boolean).join(" · ")};
  if(window.IB_Share)return IB_Share.open(d);
  if(navigator.clipboard)navigator.clipboard.writeText(d.text+" "+d.url).then(function(){toast(tr("copied"))});else toast(tr("copy_manual"))}
/* Tombol "Cari teman": gulir ke bagian ajakan di rincian event dan buka formulir "Buat ajakan".
   Belum login: handler formulir sendiri yang mengarahkan ke halaman login. */
function goBuddy(){var n=0,t=setInterval(function(){var box=$("ajk"),b=box&&box.querySelector('[data-x="new"]');
  if(!b&&++n<=40)return;clearInterval(t);if(!box)return;
  var f=box.querySelector("form.nw");if(b&&f&&f.hidden)b.click();
  (f&&!f.hidden?f:box).scrollIntoView({behavior:"smooth",block:"center"});
  var i=box.querySelector("form.nw:not([hidden]) input[name=t]");if(i)try{i.focus({preventScroll:true})}catch(x){}},150)}
function openEv(id,buddy){
  var e=byId(id);if(!e)return;var p=dparts(e.event_date);
  document.dispatchEvent(new CustomEvent("ib:open",{detail:{id:e.id}}));
  var inf=info(e).filter(Boolean).join(" · "),multi=e.end_date&&e.end_date!==e.event_date;
  var rawTicket=safeUrl(e.ticket_url);
  var tixUrl=rawTicket&&window.IB_MonetizeCore?IB_MonetizeCore.buildPartnerTicketUrl(rawTicket,e.slug||e.id,C&&C.MONETIZE&&C.MONETIZE.AFFILIATE):rawTicket;
  var areas=(e.city&&window.IB_AREAS&&IB_AREAS[e.city])?IB_AREAS[e.city]:null;
  $("dBody").innerHTML='<div class="dp'+(e.poster_url?' pf':'')+'" style="'+posterStyle(e,1)+'">'+deco(e)+badge(e)+featBadge(e)+'<button class="dx" type="button" id="dX" aria-label="'+esc(tr("close"))+'">&times;</button></div><div class="db"><h2>'+esc(ttl(e))+'</h2><ul class="dm">'+
   '<li>'+ic("cal")+'<span>'+p.full+(multi?esc(tr("to"))+dparts(e.end_date).full:'')+'</span></li>'+
   '<li>'+ic("pin")+'<span>'+esc(e.venue||e.city)+(e.city&&e.venue!==e.city?', '+esc(e.city):'')+'</span></li>'+
   '<li>'+ic("tag")+'<span>'+esc(e.price_label||tr("price_tbd"))+'</span></li>'+
   '<li>'+ic(CICON[e.category]||"mic")+'<span>'+esc(CAT[e.category]||e.category)+(inf?' · '+esc(inf):'')+'</span></li>'+
   (e.organizer||e.quota?'<li>'+ic("note")+'<span>'+(e.organizer?esc(tr("organizer"))+': '+esc(e.organizer):'')+(e.organizer&&e.quota?' · ':'')+(e.quota?esc(tr("quota"))+': '+esc(e.quota)+' '+esc(tr("aj_people")):'')+'</span></li>':'')+
   '</ul>'+(areas?'<p class="meta"><b>'+esc(tr("ev_areas_lbl",{c:e.city}))+'</b> '+esc(areas.join(" · "))+'</p>':'')+(e.is_community?'<p class="meta"><span class="cmty">'+esc(tr("community"))+'</span> '+esc(tr("community_note"))+'</p>':'')+
   (e.lineup?'<p><b>'+tr("lineup")+'</b> '+esc(e.lineup)+'</p>':'')+'<p>'+esc(dsc(e)||tr("nodesc"))+'</p><div class="pact">'
   +'<button class="btn buddy-d" type="button" id="dBuddy">'+ic("users")+tr("buddy_btn_d")+'</button>'
   +(tixUrl?'<a class="btn" id="dTicketLink" target="_blank" rel="noopener noreferrer" href="'+esc(tixUrl)+'">'+tr("ticket")+'</a>':'<span class="btn line" style="opacity:.6">'+tr("noticket")+'</span>') 
   +'</div><div class="row">'
   +(waDigits(e.contact_wa)?'<a class="btn" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+waDigits(e.contact_wa)+'?text='+encodeURIComponent(tr("wa_hello",{t:ttl(e)}))+'">'+tr("wa_contact")+'</a>':'')
   +(igHandle(e.source_ig)?'<a class="btn line" target="_blank" rel="noopener noreferrer" href="https://instagram.com/'+encodeURIComponent(igHandle(e.source_ig))+'">'+tr("source")+esc(igHandle(e.source_ig))+'</a>':'')
   +'<a class="btn line" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((e.venue||"")+" "+(e.city||""))+'">'+ic("pin")+tr("map")+'</a>'
   +(e.slug?'<a class="btn line" href="e/'+encodeURIComponent(e.slug)+'">'+tr("guide")+'</a>':'')
   +'<button class="btn line" type="button" id="dIcs">'+ic("cal")+tr("cal")+'</button><button class="btn line" type="button" id="dShare">'+ic("share")+tr("share")+'</button>'
   +'<button class="btn line" type="button" id="close">'+tr("close")+'</button></div><div class="ad-slot" data-ad-slot="event_detail" hidden></div><div id="ajk" class="ajk"></div><div id="fe" class="fe"></div></div>';
  $("dlg").showModal();
  if(history.replaceState){var u=new URL(location.href);u.searchParams.set("e",e.slug||e.id);u.searchParams.delete("teman");history.replaceState(null,"",u.pathname+u.search)}
  $("close").onclick=function(){$("dlg").close()};$("dX").onclick=function(){$("dlg").close()};
  $("dIcs").onclick=function(){ics(e)};$("dShare").onclick=function(){share(e)};$("dBuddy").onclick=goBuddy;if(buddy)goBuddy();
  var tl=$("dTicketLink");if(tl&&tl!==DUM)tl.onclick=function(){try{var n=+localStorage.getItem("gwm_aff_clicks")||0;localStorage.setItem("gwm_aff_clicks",String(n+1))}catch(ex){}};
  if(window.IB_Ajakan)IB_Ajakan.mount(e,$("ajk"));else $("ajk").innerHTML='<p class="meta">'+tr("aj_off")+'</p>';
  if(window.IB_ForumEvent)IB_ForumEvent.mount(e,$("fe"));
  if(window.IB_Ads)IB_Ads.mount($("dBody"),{city:e.city});
}
/* ---- Pasang elemen & event ---- */
var sel=$("city");
function buildCities(){var cur=state.city,cnt={},act=state.events.filter(isActive),known={};
  act.forEach(function(e){if(e.city)cnt[e.city]=(cnt[e.city]||0)+1});
  sel.innerHTML='<option value="semua">'+tr("allcities")+'</option>';
  function grp(label,list){var g=document.createElement("optgroup");g.label=label;list.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c+(cnt[c]?" ("+cnt[c]+")":"");g.appendChild(o)});sel.appendChild(g)}
  Object.keys(IB_REGIONS).forEach(function(p){IB_REGIONS[p].forEach(function(c){known[c]=1});grp(IB_PROV(p),IB_REGIONS[p])});
  var extra=Object.keys(cnt).filter(function(c){return!known[c]});if(extra.length)grp(tr("othercities"),extra);
  sel.value=cur}
buildCities();
["city","when","price","sort"].forEach(function(i){$(i).onchange=function(){state[i]=this.value;render()}});
$("reset").onclick=reset;
if(new URLSearchParams(location.search).get("ajakan")==="1")state.inv=true;
var fi=$("fInv");if(fi){if(state.inv){fi.setAttribute("aria-pressed","true");fi.classList.add("on")}fi.textContent=tr("f_inv");fi.onclick=function(){state.inv=!state.inv;this.setAttribute("aria-pressed",state.inv);this.classList.toggle("on",state.inv);render()}}
$("vGrid").onclick=function(){state.view="grid";try{localStorage.setItem("gwm_view","grid")}catch(e){}render()};
$("vList").onclick=function(){state.view="list";try{localStorage.setItem("gwm_view","list")}catch(e){}render()};
function catClick(ev){var a=ev.target.closest("a[data-in]");if(!a)return;ev.preventDefault();state.cat=a.dataset.c;
  if(history.replaceState)history.replaceState(null,"",a.dataset.c==="semua"?location.pathname:location.pathname+"?kat="+a.dataset.c);render()}
$("navCat").onclick=catClick;$("navMine").onclick=catClick;$("mCat").onclick=catClick;
$("navCity").onclick=function(ev){var b=ev.target.closest("[data-city]");if(!b)return;state.city=b.dataset.city;render()};
function openOrSave(ev){var bd=ev.target.closest("[data-bd]");if(bd){ev.stopPropagation();return openEv(bd.dataset.bd,true)}
  var h=ev.target.closest("[data-sh]");if(h){ev.stopPropagation();var he=byId(h.dataset.sh);if(he)share(he);return}
  var s=ev.target.closest("[data-sv]");if(s){ev.stopPropagation();return toggleSave(s.dataset.sv)}var b=ev.target.closest(".tile,.r");if(b&&b.dataset.id)openEv(b.dataset.id)}
$("list").onclick=openOrSave;
if($("moreB")!==DUM)$("moreB").onclick=function(){state.limit+=12;render()};
$("tick").onclick=function(ev){var b=ev.target.closest(".tk");if(b&&b.dataset.id)openEv(b.dataset.id)};
$("list").onkeydown=function(ev){if((ev.key==="Enter"||ev.key===" ")&&ev.target.dataset&&ev.target.dataset.id&&(ev.target.classList.contains("tile")||ev.target.classList.contains("r"))){ev.preventDefault();openEv(ev.target.dataset.id)}};
$("dlg").onclick=function(ev){if(ev.target===this)this.close()};
$("dlg").addEventListener("close",function(){if(history.replaceState){var u=new URL(location.href);if(u.searchParams.has("e")){u.searchParams.delete("e");history.replaceState(null,"",u.pathname+u.search)}}});
$("login").onclick=function(ev){ev.preventDefault();location.href=this.getAttribute("href")||"login"};
$("year").textContent=new Date().getFullYear();
[].forEach.call(document.querySelectorAll("[data-mail]"),function(a){var k=a.getAttribute("data-mail"),m=k==="admin"?C.CONTACT_EMAIL_ADMIN:k==="personal"?C.CONTACT_EMAIL_PERSONAL:C.CONTACT_EMAIL;if(m){a.href="mailto:"+m;if(a.textContent.indexOf("@")>-1)a.textContent=m}});
loadChips();
window.IB_OpenEv=function(id){var e=byId(id);if(!e)return false;openEv(id)};
/* API kecil untuk beranda portal (js/home.js). Tidak mengubah data, hanya membaca dan mengatur filter. */
window.IB_Api={ready:false,
  events:function(){return state.events},
  filteredCount:function(){return list().length},
  filters:function(){return{cat:state.cat,when:state.when,price:state.price,inv:state.inv,city:state.city,prov:state.prov,macro:state.macro,radiusKm:state.radiusKm}},
  set:function(o){o=o||{};["cat","when","price"].forEach(function(k){if(o[k]!=null)state[k]=o[k]});if(o.inv!=null)state.inv=!!o.inv;state.limit=12;render()},
  setLocation:function(loc){
    loc=loc||{};
    state.city=loc.city||"semua";
    state.prov=loc.prov||"";
    state.macro=loc.macro||"";
    state.radiusKm=+loc.radiusKm||0;
    state.limit=12;
    try{
      if(state.city==="semua"&&!state.prov&&!state.macro)localStorage.removeItem("gwm_loc");
      else localStorage.setItem("gwm_loc",JSON.stringify({city:state.city,prov:state.prov,macro:state.macro,radiusKm:state.radiusKm}));
    }catch(e){}
    if($("city")!==DUM)$("city").value=state.city;
    render();
  },
  count:function(c){return state.events.filter(function(e){return isActive(e)&&base(e)&&(c==="semua"||e.category===c)}).length},
  countAll:function(c){return state.events.filter(function(e){return isActive(e)&&(c==="semua"||e.category===c)}).length},
  invites:function(){return state.events.reduce(function(t,e){return t+(isActive(e)?invN(e):0)},0)},
  savedN:function(){return state.events.filter(function(e){return isActive(e)&&isSaved(e.id)}).length},
  purl:purl,status:status,dparts:dparts,ttl:ttl,rng:rng,kind:kind,posterStyle:posterStyle,deco:deco,isActive:isActive,byId:byId,open:openEv,
  today:today,days:days,where:where,esc:esc,gratis:gratis};
load().then(function(){IB_Api.ready=true;buildCities();if($("sort")!==DUM)$("sort").value=state.sort;if(MODE==="home"&&!state.events.some(function(e){return isActive(e)&&status(e).k==="live"})){$("note").hidden=false}render();
  document.dispatchEvent(new CustomEvent("ib:ready"));
  var qs=new URLSearchParams(location.search),want=qs.get("e");if(want){var w=state.events.filter(function(x){return String(x.slug)===want||String(x.id)===want})[0];if(w)openEv(w.id,qs.get("teman")==="1")}});
})();
if(location.hash&&!/^#(blog|deals|promo|tools|top)$/.test(location.hash))history.replaceState(null,"",location.pathname+location.search);
document.addEventListener("click",function(e){
  var a=e.target.closest('a[href^="#"]');if(!a)return;
  e.preventDefault();
  var t=document.getElementById(a.getAttribute("href").slice(1));
  if(t)t.scrollIntoView({behavior:"smooth"});else scrollTo({top:0,behavior:"smooth"});
});
