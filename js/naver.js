/* GoWithDME — perilaku bersama gaya portal (semua halaman): mega menu "Semua layanan", status masuk, kotak cari header
   yang muncul saat kotak besar di beranda keluar layar, dan tema dari menu. Tanpa data event; aman dimuat di halaman mana pun. */
(function(){
var d=document,B=d.body,mm=d.getElementById("mm");
function loggedIn(){try{for(var i=0;i<localStorage.length;i++){if(/^sb-.+-auth-token$/.test(localStorage.key(i)))return true}}catch(e){}return false}
if(loggedIn())B.classList.add("nv-in");

/* ---- mega menu ---- */
if(mm){
  var btns=[].slice.call(d.querySelectorAll(".js-mm")),last=null,anc=null;
  function place(){var b=d.querySelector(".tb-main .mm-ico");if(!b||!b.offsetParent)b=anc||btns[0];if(!b)return;var Z=window.GWM_Z||1;var pn=mm.querySelector(".mm-in"),w=pn?pn.offsetWidth:400,vw=(d.documentElement.clientWidth||window.innerWidth)/Z;mm.style.setProperty("--mml",Math.max(8,Math.min(Math.round(b.getBoundingClientRect().left/Z),Math.round(vw-w-8)))+"px")}
  function top(){var t=d.querySelector(".topbar");return t?Math.max(0,Math.round(t.getBoundingClientRect().bottom/(window.GWM_Z||1)))+8:64}
  /* urutan menu mengikuti susunan di markup; angka jumlah item di judul grup tidak dipakai lagi (hapus sisa badge lama bila ada) */
  function tidy(){
    [].forEach.call(mm.querySelectorAll(".mm-g section"),function(sec){
      var h=sec.querySelector("h3");if(!h)return;
      var b=h.querySelector(".mm-n");if(b)b.remove()
    })}
  function setOpen(v){
    if(v===!mm.hidden)return;
    mm.hidden=!v;B.classList.toggle("mm-open",v);if(v)try{tidy()}catch(e){}
    btns.forEach(function(b){b.setAttribute("aria-expanded",v?"true":"false")});
    if(v){last=d.activeElement;mm.style.setProperty("--mmt",top()+"px");place();buildCity();
      var pn=mm.querySelector(".mm-in");if(pn){pn.scrollTop=0;pn.focus({preventScroll:true})}}
    else if(last&&last.focus){last.focus()}}
  btns.forEach(function(b){b.addEventListener("click",function(){anc=b;setOpen(mm.hidden)})});
  var mi=mm.querySelector(".mm-in");if(mi)mi.addEventListener("scroll",function(){mi.classList.toggle("sc",mi.scrollTop>4)},{passive:true});
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
  var R=null,P=[],tpl="{p}",qb=false;
  function link(c){return'<a href="event?kota='+encodeURIComponent(c)+'">'+esc(c)+(cc[c]?'<small>'+cc[c]+'</small>':"")+'</a>'}
  function show(p){var cl=d.getElementById("mmCl");if(cl)cl.innerHTML='<a class="all" href="event?prov='+encodeURIComponent(p)+'">'+esc(tpl.replace("{p}",pv(p)))+'</a>'+R[p].map(link).join("")}
  function buildCity(){
    if(cbuilt||!cbox||!window.IB_REGIONS)return;
    cbuilt=true;cbox.hidden=false;R=window.IB_REGIONS;tpl=cbox.dataset.all||"{p}";
    var tot={};P=Object.keys(R);
    P.forEach(function(p){tot[p]=R[p].reduce(function(s,c){return s+(cc[c]||0)},0)});
    var order=P.map(function(p,i){return[p,i]}).sort(function(a,b){return(tot[b[0]]>0)-(tot[a[0]]>0)||tot[b[0]]-tot[a[0]]||a[1]-b[1]}).map(function(x){return x[0]});
    d.getElementById("mmCity").innerHTML='<select class="mm-ps" id="mmPs" aria-label="'+esc(cbox.querySelector("h3").textContent)+'">'+order.map(function(p){return'<option value="'+esc(p)+'">'+esc(pv(p))+(tot[p]?" ("+tot[p]+")":"")+'</option>'}).join("")+'</select><div class="mm-cl" id="mmCl"></div>';
    var ps=d.getElementById("mmPs");ps.value=order[0];show(order[0]);
    ps.addEventListener("change",function(){show(ps.value)});
    var q=d.getElementById("mmCityQ");
    if(q&&!qb){qb=true;q.addEventListener("input",function(){
      var v=q.value.trim().toLowerCase(),ps=d.getElementById("mmPs"),cl=d.getElementById("mmCl"),none=d.getElementById("mmNone");
      if(!ps||!cl)return;
      if(!v){ps.hidden=false;none.hidden=true;show(ps.value);return}
      ps.hidden=true;var m=[];
      P.forEach(function(p){var pm=(p+" "+pv(p)).toLowerCase().indexOf(v)>-1;R[p].forEach(function(c){if(pm||c.toLowerCase().indexOf(v)>-1)m.push(c)})});
      cl.innerHTML=m.slice(0,40).map(link).join("");none.hidden=m.length>0})}
  }
  window.GWM_MM={counts:function(c){cc=c||{};if(cbuilt){cbuilt=false;d.getElementById("mmCity").innerHTML="";buildCity()}}};
  [].forEach.call(mm.querySelectorAll(".yr"),function(y){y.textContent=new Date().getFullYear()});
}

/* ---- HP: kotak cari header berupa ikon; ketukan pertama membuka dan memfokuskan kotak, bukan mengirim pencarian kosong ---- */
d.addEventListener("click",function(e){
  var g=e.target.closest&&e.target.closest(".tb-main .search .sxgo");if(!g)return;
  var i=g.parentNode.querySelector("input");
  if(i&&i.getBoundingClientRect().width<8){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();i.focus()}
},true);

/* ---- beranda: kotak cari header tersembunyi selama kotak besar terlihat ---- */
var hero=d.getElementById("sxHero");
if(hero&&B.classList.contains("nv-home")&&"IntersectionObserver" in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(en){B.classList.toggle("nv-hv",en.isIntersecting)})},{rootMargin:"-60px 0px 0px 0px",threshold:0.01});
  io.observe(hero);
}
})();
