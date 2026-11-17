/* GWM — beranda portal: banner berputar, ticker "Segera hadir", pintasan berlencana, tab topik, sapaan dan "terakhir dilihat".
   Membaca data lewat window.IB_Api (js/app.js). Tidak ada permintaan jaringan sendiri. */
(function(){
var d=document,tr=window.IB_T||function(k){return k},$=function(i){return d.getElementById(i)};
var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function rd(k,x){try{return JSON.parse(localStorage.getItem(k))||x}catch(e){return x}}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function low(){return d.documentElement.getAttribute("data-tier")==="low"}
var A=null;

/* ---------- urutan "segera hadir": yang sedang berlangsung dulu, lalu paling dekat ---------- */
function upcoming(){return A.events().filter(function(e){return A.isActive(e)}).sort(function(a,b){
  var sa=A.status(a),sb=A.status(b);return(sa.k==="live"?0:1)-(sb.k==="live"?0:1)||(a.event_date<b.event_date?-1:a.event_date>b.event_date?1:0)})}
function sub(e){var s=A.status(e),p=A.dparts(e.event_date);return s.k==="live"?s.l:p.d+" "+p.m}

/* ---------- ticker bergulir ---------- */
var trI=0,trT=null,trN=0;
function trend(){var box=$("nvTrend");if(!box)return;
  var L=upcoming().slice(0,10);
  if(!L.length){box.hidden=true;return}
  box.hidden=false;trN=L.length;
  var li=function(e,i){return'<li><a href="'+esc(link(e))+'" data-id="'+esc(e.id)+'"><b>'+(i+1)+'</b><span>'+esc(A.ttl(e))+'</span><small>'+esc(sub(e))+'</small></a></li>'};
  $("nvRollL").innerHTML=L.map(li).join("");
  $("nvTrList").innerHTML=L.map(li).join("");
  trI=0;roll(0);clearInterval(trT);
  if(!reduce&&!low()&&L.length>1)trT=setInterval(function(){if(!d.hidden&&!$("nvTrT").matches(":hover")&&$("nvTrList").hidden)roll(trI+1)},3200)}
function roll(i){trI=(i+trN)%trN;var l=$("nvRollL");l.style.transform="translateY(-"+trI*34+"px)"}
function link(e){return(e.category==="naikgunung"?"gunung":"event")+"?e="+encodeURIComponent(e.slug||e.id)}
function trendBind(){var t=$("nvTrT"),l=$("nvTrList");if(!t)return;
  t.onclick=function(){var o=l.hidden;l.hidden=!o;t.setAttribute("aria-expanded",o?"true":"false")};
  function pick(ev){var a=ev.target.closest("a[data-id]");if(!a)return;ev.preventDefault();l.hidden=true;t.setAttribute("aria-expanded","false");A.open(a.dataset.id)}
  $("nvRollL").onclick=pick;l.onclick=pick;
  d.addEventListener("click",function(e){if(!l.hidden&&!e.target.closest("#nvTrend")){l.hidden=true;t.setAttribute("aria-expanded","false")}});
  d.addEventListener("keydown",function(e){if(e.key==="Escape"&&!l.hidden){l.hidden=true;t.setAttribute("aria-expanded","false");t.focus()}})}

/* ---------- banner berputar ---------- */
var bI=0,bT=null,bN=0,bPaused=false,bUser=false;
function banner(){var box=$("nvBan");if(!box)return;
  var L=upcoming().filter(function(e){return e.poster_url}).slice(0,6);
  if(L.length<2)L=upcoming().slice(0,5);
  if(!L.length){box.hidden=true;return}
  bN=L.length;box.hidden=false;
  $("nvBanTrk").innerHTML=L.map(function(e,i){var s=A.status(e),loc=A.where(e);
    return'<article class="nv-sl" role="group" aria-roledescription="slide" aria-label="'+esc(tr("nv_slide",{n:i+1,t:L.length}))+'" data-id="'+esc(e.id)+'">'+
      '<div class="nv-sl-bg" style="'+A.posterStyle(e)+'"></div><div class="nv-sl-in"><div class="nv-sl-tx">'+
      '<span class="badge '+s.k+'">'+(s.k==="live"?"● ":"")+esc(s.l)+'</span><h3>'+esc(A.ttl(e))+'</h3>'+
      '<p>'+esc(A.rng(e))+(loc?' · '+loc:'')+(e.price_label?' · '+esc(e.price_label):'')+'</p>'+
      '<button class="btn" type="button" tabindex="-1">'+esc(tr("nv_view"))+'</button></div>'+
      (e.poster_url?'<img class="nv-sl-po" src="'+esc(A.purl(e.poster_url))+'" alt="" loading="lazy" decoding="async">':'<div class="nv-sl-po" style="'+A.posterStyle(e)+'">'+A.deco(e)+'</div>')+'</div></article>'}).join("");
  go(0,true);auto()}
function go(i,quiet){bI=(i+bN)%bN;$("nvBanTrk").style.transform="translateX(-"+bI*100+"%)";
  $("nvBanN").innerHTML='<b>'+(bI+1)+'</b> / '+bN;
  [].forEach.call($("nvBanTrk").children,function(s,k){s.setAttribute("aria-hidden",k===bI?"false":"true");[].forEach.call(s.querySelectorAll("button"),function(b){b.tabIndex=k===bI?0:-1})})}
function auto(){clearInterval(bT);if(reduce||low()||bPaused||bN<2)return;bT=setInterval(function(){if(!d.hidden&&!$("nvBan").matches(":hover")&&!$("nvBan").contains(d.activeElement))go(bI+1)},5200)}
function bannerBind(){var box=$("nvBan");if(!box)return;
  $("nvPrev").onclick=function(){go(bI-1)};$("nvNext").onclick=function(){go(bI+1)};
  var pp=$("nvPP");function lbl(){pp.setAttribute("aria-label",box.dataset[bPaused?"play":"pause"]);box.classList.toggle("paused",bPaused)}
  if(reduce||low()){bPaused=true}lbl();
  pp.onclick=function(){bPaused=!bPaused;lbl();auto()};
  box.addEventListener("click",function(e){if(e.target.closest(".nv-ban-ctl"))return;var s=e.target.closest(".nv-sl");if(s)A.open(s.dataset.id)});
  box.addEventListener("keydown",function(e){if(e.key==="ArrowLeft"){go(bI-1)}else if(e.key==="ArrowRight"){go(bI+1)}});
  var x0=null,y0=0,trk=$("nvBanTrk");
  trk.addEventListener("touchstart",function(e){x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  trk.addEventListener("touchend",function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.4)go(bI+(dx<0?1:-1))},{passive:true})}

/* ---------- pintasan: lencana jumlah + titik halaman (HP) ---------- */
function badges(){
  var m={semua:A.countAll("semua"),konser:A.countAll("konser"),pameran:A.countAll("pameran"),naikgunung:A.countAll("naikgunung"),inv:A.invites(),saved:A.savedN()};
  [].forEach.call(d.querySelectorAll("#nvApps .ap-n"),function(i){var n=m[i.dataset.n]||0;i.hidden=!n;i.textContent=n>99?"99+":n})}
function dots(){var box=$("nvApps"),dt=$("nvDots");if(!box||!dt)return;
  var pages=Math.ceil(box.children.length/8);dt.innerHTML=new Array(pages+1).join("<i></i>");
  function mark(){var p=Math.round(box.scrollLeft/Math.max(1,box.clientWidth));[].forEach.call(dt.children,function(x,k){x.classList.toggle("on",k===p)})}
  box.addEventListener("scroll",mark,{passive:true});mark()}

/* ---------- tab topik ---------- */
var H={live:"nv_h_live",week:"nv_h_week",month:"nv_h_month",semua:"nv_h_any"};
function tabs(){var f=A.filters();
  [].forEach.call(d.querySelectorAll("#nvCat button"),function(b){var c=b.dataset.cat;b.setAttribute("aria-pressed",f.cat===c);
    var n=A.count(c);b.querySelector("small").textContent=n||""});
  [].forEach.call(d.querySelectorAll("#nvFlt button"),function(b){var on=b.dataset.when?f.when===b.dataset.when:b.dataset.price?f.price===b.dataset.price:b.dataset.inv?f.inv:false;b.setAttribute("aria-pressed",on)});
  var h=$("nowH");if(h)h.textContent=tr(H[f.when]||"nv_h_any")}
function tabsBind(){var box=$("nvTabs");if(!box)return;
  box.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var f=A.filters();
    if(b.dataset.cat)A.set({cat:b.dataset.cat});
    else if(b.dataset.when)A.set({when:b.dataset.when});
    else if(b.dataset.price)A.set({price:f.price===b.dataset.price?"semua":b.dataset.price});
    else if(b.dataset.inv)A.set({inv:!f.inv})})}

/* ---------- sapaan ---------- */
function greet(){if(!d.body.classList.contains("nv-in"))return;var n="";
  try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.+-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k)||"null"),m=v&&v.user&&v.user.user_metadata||{};n=String(m.nickname||m.full_name||m.name||"").split(" ")[0].slice(0,24)}}}catch(e){}
  $("nvHi").textContent=n?tr("nv_r_hi",{n:n}):tr("nv_r_hi2")}

/* ---------- terakhir dilihat (hanya di perangkat ini) ---------- */
var VK="gwm_viewed";
function recent(){var ids=rd(VK,[]),ul=$("nvRecL");if(!ul)return;
  var L=ids.map(function(id){return A.byId(id)}).filter(Boolean).slice(0,5);
  ul.innerHTML=L.map(function(e){return'<li><button type="button" data-id="'+esc(e.id)+'"><span class="th" style="'+A.posterStyle(e)+'"></span><span class="tx"><b>'+esc(A.ttl(e))+'</b><small>'+esc(A.rng(e))+'</small></span></button></li>'}).join("");
  $("nvRecNone").hidden=!!L.length;$("nvRecClr").hidden=!L.length}
function recentBind(){var ul=$("nvRecL");if(!ul)return;
  ul.onclick=function(e){var b=e.target.closest("button[data-id]");if(b)A.open(b.dataset.id)};
  $("nvRecClr").onclick=function(){wr(VK,[]);recent()};
  d.addEventListener("ib:open",function(e){var id=String(e.detail.id),L=rd(VK,[]).filter(function(x){return String(x)!==id});L.unshift(id);wr(VK,L.slice(0,8));recent()})}

function init(){A=window.IB_Api;if(!A)return;
  trendBind();bannerBind();tabsBind();recentBind();greet();dots();
  paint();
  d.addEventListener("ib:render",function(){tabs();badges()});}
function paint(){trend();banner();badges();tabs();recent()}
var started=false;
function start(){if(started)return;started=true;init()}
d.addEventListener("ib:ready",start);
if(window.IB_Api&&window.IB_Api.ready)start();
})();
