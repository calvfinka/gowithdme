/* GWM — perilaku bersama gaya portal (semua halaman): mega menu "Semua layanan", status masuk, kotak cari header
   yang muncul saat kotak besar di beranda keluar layar, dan tema dari menu. Tanpa data event; aman dimuat di halaman mana pun. */
(function(){
var d=document,B=d.body,mm=d.getElementById("mm");
function loggedIn(){try{for(var i=0;i<localStorage.length;i++){if(/^sb-.+-auth-token$/.test(localStorage.key(i)))return true}}catch(e){}return false}
if(loggedIn())B.classList.add("nv-in");

/* ---- mega menu ---- */
if(mm){
  var btns=[].slice.call(d.querySelectorAll(".js-mm")),last=null,anc=null;
  function place(){var b=anc||btns[0];if(!b)return;var Z=window.GWM_Z||1;var pn=mm.querySelector(".mm-in"),w=pn?pn.offsetWidth:400,vw=(d.documentElement.clientWidth||window.innerWidth)/Z;mm.style.setProperty("--mml",Math.max(8,Math.min(Math.round(b.getBoundingClientRect().left/Z),Math.round(vw-w-8)))+"px")}
  function top(){var t=d.querySelector(".topbar");return t?Math.max(0,Math.round(t.getBoundingClientRect().bottom/(window.GWM_Z||1)))+8:64}
  function setOpen(v){
    if(v===!mm.hidden)return;
    mm.hidden=!v;B.classList.toggle("mm-open",v);
    btns.forEach(function(b){b.setAttribute("aria-expanded",v?"true":"false")});
    if(v){last=d.activeElement;mm.style.setProperty("--mmt",top()+"px");place();buildCity();
      var pn=mm.querySelector(".mm-in");if(pn)pn.focus({preventScroll:true})}
    else if(last&&last.focus){last.focus()}}
  btns.forEach(function(b){b.addEventListener("click",function(){anc=b;setOpen(mm.hidden)})});
  mm.addEventListener("click",function(e){if(e.target.closest("[data-mmx]")){setOpen(false);return}
    var a=e.target.closest("a");if(a){var h=a.getAttribute("href")||"",pg=location.pathname.split("/").pop()||"";if(h.indexOf("#")>-1&&h.split("#")[0]===pg)setOpen(false)}});
  d.addEventListener("keydown",function(e){
    if(mm.hidden)return;
    if(e.key==="Escape"){e.preventDefault();setOpen(false);return}
    if(e.key==="Tab"){var f=[].slice.call(mm.querySelectorAll("a[href],button")).filter(function(x){return x.offsetParent!==null});
      if(!f.length)return;var a=f[0],z=f[f.length-1];
      if(e.shiftKey&&d.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&d.activeElement===z){e.preventDefault();a.focus()}}});
  window.addEventListener("resize",function(){if(!mm.hidden){mm.style.setProperty("--mmt",top()+"px");place()}});
  window.addEventListener("pageshow",function(e){if(e.persisted)setOpen(false)});

  /* ---- kota per provinsi (jumlah event dari cache yang ditulis app.js) ---- */
  var cc={},cbox=d.getElementById("mmCityBox"),cbuilt=false;
  try{var cj=JSON.parse(localStorage.getItem("gwm-cc")||"null");if(cj&&cj.c)cc=cj.c}catch(e){}
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function pv(p){return window.IB_PROV?window.IB_PROV(p):p}
  function buildCity(){
    if(cbuilt||!cbox)return;
    if(!window.IB_REGIONS){return}
    cbuilt=true;cbox.hidden=false;
    var R=window.IB_REGIONS,P=Object.keys(R),tot={},chev='<svg class="i" aria-hidden="true"><use href="#i-chev-d"/></svg>';
    P.forEach(function(p){tot[p]=R[p].reduce(function(s,c){return s+(cc[c]||0)},0)});
    P=P.map(function(p,i){return[p,i]}).sort(function(a,b){return(tot[b[0]]>0)-(tot[a[0]]>0)||tot[b[0]]-tot[a[0]]||a[1]-b[1]}).map(function(x){return x[0]});
    var all=[];P.forEach(function(p){R[p].forEach(function(c){all.push(c)})});
    var pop=all.filter(function(c){return cc[c]>0}).sort(function(a,b){return cc[b]-cc[a]}).slice(0,6),pb=d.getElementById("mmPop");
    if(pop.length){pb.hidden=false;pb.innerHTML=pop.map(function(c){return'<a href="event?kota='+encodeURIComponent(c)+'">'+esc(c)+'<small>'+cc[c]+'</small></a>'}).join("")}
    var opened=false,tpl=cbox.dataset.all||"{p}",evt=cbox.dataset.ev||"{n}";
    d.getElementById("mmCity").innerHTML=P.map(function(p){
      var o=!opened&&tot[p]>0;if(o)opened=true;
      return'<details class="mm-pv" data-p="'+esc((p+" "+pv(p)).toLowerCase())+'" data-o="'+(o?1:0)+'"'+(o?" open":"")+'><summary><span>'+esc(pv(p))+'</span><small>'+(tot[p]?esc(evt.replace("{n}",tot[p])):R[p].length)+'</small>'+chev+'</summary><div class="mm-cl"><a class="all" href="event?prov='+encodeURIComponent(p)+'">'+esc(tpl.replace("{p}",pv(p)))+'</a>'
        +R[p].map(function(c){return'<a href="event?kota='+encodeURIComponent(c)+'">'+esc(c)+(cc[c]?'<small>'+cc[c]+'</small>':"")+'</a>'}).join("")+'</div></details>'}).join("");
    var q=d.getElementById("mmCityQ");
    if(q)q.addEventListener("input",function(){
      var v=q.value.trim().toLowerCase(),any=false;
      pb.hidden=!!v||!pop.length;
      [].forEach.call(cbox.querySelectorAll(".mm-pv"),function(dt){
        var pm=!!v&&dt.dataset.p.indexOf(v)>-1,hit=!v;
        [].forEach.call(dt.querySelectorAll(".mm-cl a"),function(a){
          if(a.classList.contains("all")){a.hidden=!!v;return}
          var m=!v||pm||a.textContent.toLowerCase().indexOf(v)>-1;a.hidden=!m;if(m)hit=true});
        dt.hidden=!hit;if(hit)any=true;dt.open=v?hit:dt.dataset.o==="1"});
      d.getElementById("mmNone").hidden=any||!v});
  }
  window.GWM_MM={counts:function(c){cc=c||{};if(cbuilt){cbuilt=false;d.getElementById("mmCity").innerHTML="";buildCity()}}};
  var th=d.getElementById("mmTheme"),t0=d.getElementById("theme");
  if(th&&t0)th.addEventListener("click",function(){t0.click()});
}

/* ---- beranda: kotak cari header tersembunyi selama kotak besar terlihat ---- */
var hero=d.getElementById("sxHero");
if(hero&&B.classList.contains("nv-home")&&"IntersectionObserver" in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(en){B.classList.toggle("nv-hv",en.isIntersecting)})},{rootMargin:"-60px 0px 0px 0px",threshold:0.01});
  io.observe(hero);
}
})();
