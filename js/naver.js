/* GWM — perilaku bersama gaya portal (semua halaman): mega menu "Semua layanan", status masuk, kotak cari header
   yang muncul saat kotak besar di beranda keluar layar, dan tema dari menu. Tanpa data event; aman dimuat di halaman mana pun. */
(function(){
var d=document,B=d.body,mm=d.getElementById("mm");
function loggedIn(){try{for(var i=0;i<localStorage.length;i++){if(/^sb-.+-auth-token$/.test(localStorage.key(i)))return true}}catch(e){}return false}
if(loggedIn())B.classList.add("nv-in");

/* ---- mega menu ---- */
if(mm){
  var btns=[].slice.call(d.querySelectorAll(".js-mm")),last=null;
  function top(){var t=d.querySelector(".topbar");return t?Math.max(0,Math.round(t.getBoundingClientRect().bottom/(window.GWM_Z||1)))+8:64}
  function setOpen(v){
    if(v===!mm.hidden)return;
    mm.hidden=!v;B.classList.toggle("mm-open",v);
    btns.forEach(function(b){b.setAttribute("aria-expanded",v?"true":"false")});
    if(v){last=d.activeElement;mm.style.setProperty("--mmt",top()+"px");
      var f=mm.querySelector(".mm-g a");if(f&&window.innerWidth/(window.GWM_Z||1)>640)f.focus();else{var c=mm.querySelector("[data-mmx].ico-btn");if(c)c.focus()}}
    else if(last&&last.focus){last.focus()}}
  btns.forEach(function(b){b.addEventListener("click",function(){setOpen(mm.hidden)})});
  mm.addEventListener("click",function(e){if(e.target.closest("[data-mmx]")){setOpen(false);return}
    var a=e.target.closest("a");if(a){var h=a.getAttribute("href")||"",pg=location.pathname.split("/").pop()||"";if(h.indexOf("#")>-1&&h.split("#")[0]===pg)setOpen(false)}});
  d.addEventListener("keydown",function(e){
    if(mm.hidden)return;
    if(e.key==="Escape"){e.preventDefault();setOpen(false);return}
    if(e.key==="Tab"){var f=[].slice.call(mm.querySelectorAll("a[href],button")).filter(function(x){return x.offsetParent!==null});
      if(!f.length)return;var a=f[0],z=f[f.length-1];
      if(e.shiftKey&&d.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&d.activeElement===z){e.preventDefault();a.focus()}}});
  window.addEventListener("resize",function(){if(!mm.hidden)mm.style.setProperty("--mmt",top()+"px")});
  window.addEventListener("pageshow",function(e){if(e.persisted)setOpen(false)});
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
