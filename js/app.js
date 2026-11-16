if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,"")+location.search);
(function(){
var C=window.IB_CONFIG,DUM=document.createElement("div"),MODE=window.IB_MODE||"all",$=function(i){return document.getElementById(i)||DUM};
var tr=window.IB_T||function(k){return k},LOC=tr("locale"),MON=tr("mon").split(",");
var CAT={konser:tr("cat_konser"),naikgunung:tr("cat_naikgunung"),pameran:tr("cat_pameran")};
var DIF={pemula:tr("dif_pemula"),menengah:tr("dif_menengah"),sulit:tr("dif_sulit")};
var state={cat:"semua",city:"semua",when:"semua",price:"semua",sort:"date",q:"",view:"grid",events:[]};
var saved=read("ib_saved",[]);
var kp=new URLSearchParams(location.search).get("kat");
if(MODE==="all"&&/^(konser|naikgunung|pameran|tersimpan|selesai)$/.test(kp||""))state.cat=kp;
if(MODE==="home")state.when="live";if(MODE==="gunung")state.cat="naikgunung";
try{if(localStorage.getItem("gwm_view")==="list")state.view="list"}catch(e){}
function read(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function toast(m){var t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},2400)}
function ic(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function prov(c){for(var p in IB_REGIONS)if(IB_REGIONS[p].indexOf(c)>-1)return p;return""}
/* ---- Logika tanggal (zona WIB, bukan jam perangkat) ---- */
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function days(a,b){return Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/864e5)}
function endOf(e){return e.end_date||e.event_date}
function isActive(e){return endOf(e)>=today()}
/* Status: live = sedang berjalan (multi-hari / hari-H), soon = <=7 hari, next = lebih jauh, past = selesai */
function status(e){var t=today(),s=days(t,e.event_date),en=days(t,endOf(e));
  if(en<0)return{k:"past",l:tr("past"),n:s};
  if(s<=0)return{k:"live",l:en===0&&s===0?tr("today"):en===0?tr("lastday"):tr("ongoing"),n:0};
  return{k:s<=7?"soon":"next",l:s===1?tr("tomorrow"):tr("indays",{n:s}),n:s}}
function gratis(e){return/gratis|free/i.test(e.price_label||"")}
function dparts(s){var d=new Date(s+"T00:00:00");return{d:("0"+d.getDate()).slice(-2),m:MON[d.getMonth()],full:d.toLocaleDateString(LOC,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}}
function rng(e){var a=new Date(e.event_date+"T00:00:00"),b=new Date(endOf(e)+"T00:00:00"),o={day:"numeric",month:"short"},y={day:"numeric",month:"short",year:"numeric"};
  return e.event_date===endOf(e)?a.toLocaleDateString(LOC,y):a.toLocaleDateString(LOC,o)+" – "+b.toLocaleDateString(LOC,y)}
function purl(u){return/^(https?:|data:|\/)/.test(u)?u:"../"+u}
function posterStyle(e){var g=e.g||(e.category==="konser"?["#3b1a78","#ff3d81"]:e.category==="pameran"?["#b45309","#e11d48"]:["#14532d","#ff5a1f"]),bg="linear-gradient(160deg,"+g[0]+","+g[1]+")";return"background:"+(e.poster_url?"url('"+esc(purl(e.poster_url)).replace(/'/g,"%27")+"') center/cover,":"")+bg}
function deco(e){return e.poster_url?"":'<svg class="deco" aria-hidden="true"><use href="#'+(e.category==="naikgunung"?"ridge":"bars")+'"/></svg>'}
/* info tambahan per kategori (teks polos, belum di-escape) */
function info(e){return e.category==="konser"?[e.genre]:e.category==="naikgunung"?[e.mountain,e.altitude_mdpl?e.altitude_mdpl+" "+tr("mdpl"):"",DIF[e.difficulty]||"",e.duration]:[]}
function kind(e){return[CAT[e.category]||e.category].concat(info(e)).filter(Boolean).join(" · ")}
function ttl(e){return window.IB_LANG==="en"&&e.title_en?e.title_en:e.title}
function dsc(e){return window.IB_LANG==="en"&&e.description_en?e.description_en:e.description}
function isSaved(id){return saved.indexOf(String(id))>-1}
/* ---- Data ---- */
function load(){
  if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY){state.events=IB_SAMPLE;return Promise.resolve()}
  var u=C.SUPABASE_URL+"/rest/v1/events?select=*,cities(name)&status=eq.published&order=event_date.asc";
  return fetch(u,{headers:{apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+C.SUPABASE_ANON_KEY}})
   .then(function(r){if(!r.ok)throw 0;return r.json()})
   .then(function(rows){state.events=rows.map(function(r){r.city=r.cities&&r.cities.name;return r})})
   .catch(function(){state.events=IB_SAMPLE;toast(tr("loadfail"))});
}
/* ---- Klasifikasi & filter ---- */
function base(e,noWhen){var q=state.q.toLowerCase();
  return(state.city==="semua"||e.city===state.city)
   &&(noWhen||state.when==="semua"||(state.when==="live"?status(e).k==="live":status(e).n<=(state.when==="week"?7:30)))
   &&(state.price==="semua"||(state.price==="gratis")===gratis(e))
   &&(e.title+" "+(e.title_en||"")+" "+(e.venue||"")+" "+(e.mountain||"")+" "+(e.genre||"")+" "+(e.city||"")).toLowerCase().indexOf(q)>-1}
function list(){var past=state.cat==="selesai";
  return state.events.filter(function(e){if(!base(e))return false;
    if(past)return!isActive(e);if(!isActive(e))return false;
    if(state.cat==="tersimpan")return isSaved(e.id);
    return state.cat==="semua"||e.category===state.cat})
   .sort(function(a,b){if(past)return a.event_date<b.event_date?1:-1;
     if(state.sort==="new")return(b.created_at||"")<(a.created_at||"")?-1:1;
     return a.event_date<b.event_date?-1:1})}
function badge(e){var s=status(e);return'<span class="badge '+s.k+'">'+(s.k==="live"?"● ":"")+esc(s.l)+'</span>'}
function where(e){return esc(e.venue||e.city||"")+(e.venue&&e.city&&e.venue!==e.city&&state.city==="semua"?", "+esc(e.city):"")}
function priceOf(e){return e.price_label||""}
function tile(e){var p=dparts(e.event_date),s=status(e),on=isSaved(e.id);
  return'<div class="tile'+(s.k==="past"?' past':'')+'" data-id="'+esc(e.id)+'" tabindex="0" role="button" aria-label="'+esc(ttl(e))+'"><div class="thumb" style="'+posterStyle(e)+'">'+deco(e)+
    '<div class="d"><b>'+p.d+'</b><span>'+p.m+'</span></div>'+
    '<button class="fav" type="button" data-sv="'+esc(e.id)+'" aria-pressed="'+on+'" aria-label="'+esc(tr("sv_label"))+'">'+ic("heart")+'</button></div>'+
    '<div><div class="tt">'+esc(ttl(e))+'</div><div class="tm">'+where(e)+'</div><div class="tm">'+esc(kind(e))+'</div><div class="tm">'+badge(e)+'</div>'+
    '<div class="tm p'+(priceOf(e)?'':' t')+'">'+esc(priceOf(e)||tr("price_tbd"))+'</div></div></div>'}
function row(e){var p=dparts(e.event_date),s=status(e),on=isSaved(e.id);
  return'<div class="r'+(s.k==="past"?' past':'')+'" data-id="'+esc(e.id)+'" role="button" tabindex="0"><div class="rd" style="'+posterStyle(e)+'"><div><b>'+p.d+'</b><span>'+p.m+'</span></div></div>'+
    '<div class="rt"><b>'+esc(ttl(e))+'</b><span>'+esc(kind(e))+' · '+esc(rng(e))+'</span></div>'+
    '<div class="rc">'+where(e)+'</div><div class="rs">'+badge(e)+'</div>'+
    '<div class="rp'+(priceOf(e)?'':' t')+'">'+esc(priceOf(e)||tr("price_soon"))+'</div>'+
    '<button class="rf" type="button" data-sv="'+esc(e.id)+'" aria-pressed="'+on+'" aria-label="'+esc(tr("sv_label"))+'">'+ic("heart")+'</button></div>'}
function sec(h,arr){if(!arr.length)return"";
  return'<div class="group">'+(h?'<h2>'+esc(h)+' <small>'+arr.length+'</small></h2>':'')+
   (state.view==="grid"?'<div class="tiles">'+arr.map(tile).join("")+'</div>':
    '<div class="rows"><div class="r rh"><div></div><div>'+tr("col_event")+'</div><div class="rc">'+tr("col_place")+'</div><div class="rs">'+tr("col_status")+'</div><div>'+tr("col_price")+'</div><div></div></div>'+arr.map(row).join("")+'</div>')+'</div>'}
function group(l){var G=[["live",tr("g_live")],["soon",tr("g_soon")],["next",tr("g_next")]];
  if(state.cat==="selesai"||state.sort!=="date")return sec("",l);
  return G.map(function(g){return sec(g[1],l.filter(function(e){return status(e).k===g[0]}))}).join("")}
/* ---- Sidebar & chip kategori ---- */
var NAVS=[["home","n_home","home","./"],["semua","n_all","cal","event"],["konser","cat_konser","mic","event?kat=konser"],["naikgunung","cat_naikgunung","mtn","gunung"],["pameran","cat_pameran","bag","event?kat=pameran"]],
    MINE=[["tersimpan","tab_saved","heart","event?kat=tersimpan"],["selesai","tab_done","clock","event?kat=selesai"]];
function curKey(){return MODE==="home"?"home":MODE==="gunung"?"naikgunung":state.cat}
function item(c,n,chip){var cur=curKey()===c[0],inpage=MODE==="all"&&c[0]!=="home"&&c[0]!=="naikgunung";
  return'<a href="'+c[3]+'" data-c="'+c[0]+'"'+(inpage?' data-in="1"':'')+(cur?' aria-current="true"':'')+'>'+(chip?'':ic(c[2]))+esc(tr(c[1]))+(chip||n==null?'':'<span class="n">'+n+'</span>')+'</a>'}
function nav(){
  var act=state.events.filter(function(e){return isActive(e)&&base(e,true)}),n=function(c){return c==="semua"?act.length:act.filter(function(e){return e.category===c}).length};
  var nSaved=act.filter(function(e){return isSaved(e.id)}).length,nDone=state.events.filter(function(e){return!isActive(e)&&base(e,true)}).length;
  $("navCat").innerHTML=NAVS.map(function(c){return item(c,c[0]==="home"?null:n(c[0]))}).join("");
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
function render(){
  var l=list(),act=state.events.filter(isActive),pv=prov(state.city);
  if(MODE==="all")$("evTitle").textContent=state.cat==="selesai"?tr("h_archive"):state.cat==="tersimpan"?tr("h_saved"):(state.city==="semua"?tr("h_active"):tr("h_active_city",{c:state.city}));
  var live=act.filter(function(e){return status(e).k==="live"}),up=act.filter(function(e){return status(e).k!=="live"});
  $("sEv").textContent=act.length;$("sLive").textContent=live.length;
  $("sWeek").textContent=act.filter(function(e){var s=status(e);return s.k!=="live"&&s.n<=7}).length;
  $("sNext").textContent=live.length?tr("st_now"):up.length?tr("st_days",{n:Math.min.apply(null,up.map(function(e){return status(e).n}))}):"-";
  nav();$("city").value=state.city;$("cnt").textContent=tr("found",{n:l.length});
  $("vGrid").setAttribute("aria-pressed",state.view==="grid");$("vList").setAttribute("aria-pressed",state.view==="list");
  $("list").innerHTML=l.length?group(l):'<div class="group"><div class="empty"><b>'+(state.cat==="tersimpan"?tr("empty_saved"):(MODE==="home"?tr("empty_home"):tr("empty")))+'</b>'+(state.cat==="tersimpan"?'':MODE==="home"?'<a class="btn line" href="event">'+tr("see_all")+'</a>':'<button class="btn line" id="reset2" type="button">'+tr("reset_f")+'</button>')+'</div></div>';
  var r=$("reset2");if(r)r.onclick=reset;
  tick();
  if(window.IB_Now)IB_Now.setCity(state.city)}
function reset(){state.cat=MODE==="gunung"?"naikgunung":"semua";state.city="semua";state.when="semua";state.price="semua";state.sort="date";state.q="";
  ["city","when","price","sort"].forEach(function(i){$(i).value=state[i]});$("q").value="";render()}
/* ---- Aksi: simpan, bagikan, kalender, peta ---- */
function toggleSave(id){id=String(id);var i=saved.indexOf(id);if(i>-1)saved.splice(i,1);else saved.push(id);write("ib_saved",saved);toast(i>-1?tr("sv_rm"):tr("sv_add"));render()}
function ics(e){var f=function(s){return s.replace(/-/g,"")},n=new Date(endOf(e)+"T00:00:00Z");n.setUTCDate(n.getUTCDate()+1);
  var t=function(s){return String(s||"").replace(/[\\;,]/g,"\\$&").replace(/\n/g,"\\n")};
  var b=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GWM//ID","BEGIN:VEVENT","UID:"+e.id+"@gowithdme.com","DTSTAMP:"+new Date().toISOString().replace(/[-:]|\.\d+/g,""),"DTSTART;VALUE=DATE:"+f(e.event_date),"DTEND;VALUE=DATE:"+n.toISOString().slice(0,10).replace(/-/g,""),"SUMMARY:"+t(e.title),"LOCATION:"+t((e.venue||"")+", "+(e.city||"")),"DESCRIPTION:"+t(e.description),"END:VEVENT","END:VCALENDAR"].join("\r\n");
  var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([b],{type:"text/calendar"}));a.download=(e.title||"event").replace(/\W+/g,"-")+".ics";a.click();toast(tr("ics_ok"))}
function share(e){var d={title:e.title,text:tr("share_text",{t:e.title,c:e.city||""}),url:location.origin+location.pathname};
  if(navigator.share)navigator.share(d).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(d.text+" "+d.url).then(function(){toast(tr("copied"))});else toast(tr("copy_manual"))}
function openEv(id){
  var e=state.events.filter(function(x){return String(x.id)===String(id)})[0];if(!e)return;var p=dparts(e.event_date);
  var inf=info(e).filter(Boolean).join(" · "),multi=e.end_date&&e.end_date!==e.event_date;
  $("dBody").innerHTML='<div class="dp" style="'+posterStyle(e)+'">'+deco(e)+badge(e)+'</div><div class="db"><h2>'+esc(ttl(e))+'</h2><ul class="dm">'+
   '<li>'+ic("cal")+'<span>'+p.full+(multi?esc(tr("to"))+dparts(e.end_date).full:'')+'</span></li>'+
   '<li>'+ic("pin")+'<span>'+esc(e.venue||e.city)+(e.city&&e.venue!==e.city?', '+esc(e.city):'')+'</span></li>'+
   '<li>'+ic("tag")+'<span>'+esc(e.price_label||tr("price_tbd"))+'</span></li>'+
   '<li>'+ic(e.category==="naikgunung"?"mtn":e.category==="pameran"?"bag":"mic")+'<span>'+esc(CAT[e.category]||e.category)+(inf?' · '+esc(inf):'')+'</span></li></ul>'+
   (e.lineup?'<p><b>'+tr("lineup")+'</b> '+esc(e.lineup)+'</p>':'')+'<p>'+esc(dsc(e)||tr("nodesc"))+'</p><div class="row">'
   +(e.ticket_url?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(e.ticket_url)+'">'+tr("ticket")+'</a>':'<span class="btn line" style="opacity:.6">'+tr("noticket")+'</span>')
   +(e.source_ig?'<a class="btn line" target="_blank" rel="noopener noreferrer" href="https://instagram.com/'+esc(String(e.source_ig).replace(/^@/,""))+'">'+tr("source")+esc(String(e.source_ig).replace(/^@/,""))+'</a>':'')
   +'<a class="btn line" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((e.venue||"")+" "+(e.city||""))+'">'+ic("pin")+tr("map")+'</a>'
   +'<button class="btn line" type="button" id="dIcs">'+ic("cal")+tr("cal")+'</button><button class="btn line" type="button" id="dShare">'+ic("share")+tr("share")+'</button>'
   +'<button class="btn line" type="button" id="close">'+tr("close")+'</button></div><div id="ajk" class="ajk"></div></div>';
  $("dlg").showModal();
  $("close").onclick=function(){$("dlg").close()};
  $("dIcs").onclick=function(){ics(e)};$("dShare").onclick=function(){share(e)};
  if(window.IB_Ajakan)IB_Ajakan.mount(e,$("ajk"));else $("ajk").innerHTML='<p class="meta">'+tr("aj_off")+'</p>';
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
$("q").oninput=function(){state.q=this.value;render()};
$("vGrid").onclick=function(){state.view="grid";try{localStorage.setItem("gwm_view","grid")}catch(e){}render()};
$("vList").onclick=function(){state.view="list";try{localStorage.setItem("gwm_view","list")}catch(e){}render()};
function catClick(ev){var a=ev.target.closest("a[data-in]");if(!a)return;ev.preventDefault();state.cat=a.dataset.c;
  if(history.replaceState)history.replaceState(null,"",a.dataset.c==="semua"?location.pathname:location.pathname+"?kat="+a.dataset.c);render()}
$("navCat").onclick=catClick;$("navMine").onclick=catClick;$("mCat").onclick=catClick;
$("navCity").onclick=function(ev){var b=ev.target.closest("[data-city]");if(!b)return;state.city=b.dataset.city;render()};
function openOrSave(ev){var s=ev.target.closest("[data-sv]");if(s){ev.stopPropagation();return toggleSave(s.dataset.sv)}var b=ev.target.closest(".tile,.r");if(b&&b.dataset.id)openEv(b.dataset.id)}
$("list").onclick=openOrSave;
$("tick").onclick=function(ev){var b=ev.target.closest(".tk");if(b&&b.dataset.id)openEv(b.dataset.id)};
$("list").onkeydown=function(ev){if((ev.key==="Enter"||ev.key===" ")&&ev.target.dataset&&ev.target.dataset.id&&(ev.target.classList.contains("tile")||ev.target.classList.contains("r"))){ev.preventDefault();openEv(ev.target.dataset.id)}};
$("dlg").onclick=function(ev){if(ev.target===this)this.close()};
$("login").onclick=function(ev){ev.preventDefault();location.href="login"};
$("year").textContent=new Date().getFullYear();
[].forEach.call(document.querySelectorAll("[data-mail]"),function(a){if(C.CONTACT_EMAIL)a.href="mailto:"+C.CONTACT_EMAIL});
load().then(function(){buildCities();if(MODE==="home"&&!state.events.some(function(e){return isActive(e)&&status(e).k==="live"})){state.when="week";$("note").hidden=false}render()});
})();
if(location.hash)history.replaceState(null,"",location.pathname+location.search);
document.addEventListener("click",function(e){
  var a=e.target.closest('a[href^="#"]');if(!a)return;
  e.preventDefault();
  var t=document.getElementById(a.getAttribute("href").slice(1));
  if(t)t.scrollIntoView({behavior:"smooth"});else scrollTo({top:0,behavior:"smooth"});
});
