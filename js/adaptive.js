/* GWM — tampilan adaptif.
   1) Membaca kemampuan perangkat (RAM, inti CPU, hemat data, GPU software, gerakan dikurangi) lalu memasang
      <html data-tier="low|mid|high" data-dev="phone|tablet|desktop" data-motion="full|reduce">.
   2) Setelah halaman tampil, mengukur frame-rate singkat; kalau patah-patah, tingkat diturunkan satu level (satu sesi).
   3) Pengguna bisa memilih manual di footer: Otomatis / Hemat / Seimbang / Penuh (disimpan di perangkat).
   4) Perilaku UI: menu aktif, tab bawah, tombol ke atas, bayangan bilah atas, lewati ke konten, warna bilah browser.
   Dimuat di <head> (sinkron) supaya atribut terpasang sebelum halaman digambar, jadi tidak berkedip. */
(function(){
  var d=document,r=d.documentElement,K="gwm-quality",P="gwm-qprobe",ORDER=["low","mid","high"];
  var mode="auto",ss=null;
  try{mode=localStorage.getItem(K)||"auto"}catch(e){}
  if(mode!=="low"&&mode!=="mid"&&mode!=="high")mode="auto";
  function mq(q){try{return !!(window.matchMedia&&matchMedia(q).matches)}catch(e){return false}}
  function dev(){var w=window.innerWidth||screen.width||1024;return w<=640?"phone":(w<=1000?"tablet":"desktop")}
  function softGPU(){
    try{var c=d.createElement("canvas"),g=c.getContext("webgl")||c.getContext("experimental-webgl");if(!g)return false;
      var x=g.getExtension("WEBGL_debug_renderer_info");if(!x)return false;
      var n=String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)||"");
      var l=g.getExtension("WEBGL_lose_context");if(l)l.loseContext();
      return /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(n)}catch(e){return false}
  }
  function detect(){
    var n=navigator,c=n.connection||{},mem=n.deviceMemory,cores=n.hardwareConcurrency||4,ph=dev()==="phone";
    if(c.saveData||/(^|slow-)2g/.test(c.effectiveType||""))return "low";
    if((mem&&mem<=2)||cores<=2)return "low";
    if(softGPU())return "low";
    var t="mid";
    if((!mem||mem>=6)&&cores>=(ph?8:6))t="high";
    if(c.effectiveType==="3g"&&t==="high")t="mid";
    return t;
  }
  function lower(a,b){return ORDER[Math.min(ORDER.indexOf(a),ORDER.indexOf(b))]}
  var base=detect(),tier=base;
  if(mode!=="auto")tier=mode;
  else{try{var p=sessionStorage.getItem(P);if(p&&ORDER.indexOf(p)>-1)tier=lower(tier,p)}catch(e){}}
  var reduce=mq("(prefers-reduced-motion: reduce)");
  function paint(){r.setAttribute("data-tier",tier);r.setAttribute("data-dev",dev());r.setAttribute("data-motion",reduce?"reduce":"full")}
  paint();
  // transisi halus antar-halaman (Chrome/Edge/Safari baru): hanya di tingkat sedang/tinggi
  if(tier!=="low"&&!reduce){try{var st=d.createElement("style");st.textContent="@view-transition{navigation:auto}::view-transition-old(root),::view-transition-new(root){animation-duration:.16s}";d.head.appendChild(st)}catch(e){}}
  window.GWM_PERF={get tier(){return tier},get mode(){return mode},get dev(){return dev()},
    set:function(m){
      if(m!=="auto"&&ORDER.indexOf(m)<0)m="auto";
      mode=m;try{localStorage.setItem(K,m);if(m!=="auto")sessionStorage.removeItem(P)}catch(e){}
      tier=m==="auto"?base:m;paint();mark();
    }};
  var resizeT;window.addEventListener("resize",function(){clearTimeout(resizeT);resizeT=setTimeout(paint,150)},{passive:true});

  // ---- ukur frame-rate setelah halaman tampil (hanya mode otomatis) ----
  function probe(){
    if(mode!=="auto"||tier==="low"||reduce)return;
    var ts=[],last=0,n=0,t0=performance.now();
    function f(t){
      if(d.hidden)return;
      if(last)ts.push(t-last);last=t;n++;
      if(n<48&&performance.now()-t0<3500)requestAnimationFrame(f);else done();
    }
    function done(){
      ts=ts.slice(6);if(ts.length<15)return;
      ts.sort(function(a,b){return a-b});
      var med=ts[Math.floor(ts.length/2)],p90=ts[Math.floor(ts.length*.9)];
      if(med>26||p90>45){tier=ORDER[Math.max(0,ORDER.indexOf(tier)-1)];try{sessionStorage.setItem(P,tier)}catch(e){}paint();mark()}
      else{try{sessionStorage.setItem(P,tier)}catch(e){}}
    }
    requestAnimationFrame(f);
  }
  function whenIdle(fn,ms){var go=function(){setTimeout(fn,ms)};if(d.readyState==="complete")go();else window.addEventListener("load",go,{once:true})}
  whenIdle(probe,900);

  // ---- tombol pilihan kualitas di footer ----
  function mark(){
    [].forEach.call(d.querySelectorAll(".qsw [data-q]"),function(b){b.setAttribute("aria-pressed",b.getAttribute("data-q")===mode?"true":"false")});
  }
  function hasSession(){try{for(var i=0;i<localStorage.length;i++){if(/^sb-.+-auth-token$/.test(localStorage.key(i)))return true}}catch(e){}return false}

  d.addEventListener("DOMContentLoaded",function(){
    var tb=d.querySelector(".tabbar"),top=d.querySelector(".topbar"),T=tb?tb.dataset:{};
    var seg=(location.pathname.replace(/\/+$/,"").split("/").pop()||"").replace(/\.html$/,"");
    var key=seg===""||seg==="index"||seg==="id"||seg==="en"?"home":seg;
    // menu aktif
    [].forEach.call(d.querySelectorAll(".pnav a[data-k],.tabbar a[data-k]"),function(a){if(a.getAttribute("data-k")===key)a.setAttribute("aria-current","page")});
    // halaman yang punya bilah bawah sendiri
    if(key==="pesan"||key==="login")d.body.classList.add("nobar");
    // tab Akun: ke Profil kalau sudah masuk, ke Masuk kalau belum
    var me=d.getElementById("tabMe");if(me&&!hasSession())me.setAttribute("href","login");
    // lewati ke konten
    var main=d.querySelector("main.main")||d.querySelector(".page")||d.querySelector("main");
    if(main){if(!main.id)main.id="main";main.setAttribute("tabindex","-1");
      var sk=d.createElement("a");sk.className="skip";sk.href="#"+main.id;sk.textContent=T.skip||"Skip to content";d.body.insertBefore(sk,d.body.firstChild)}
    // tombol ke atas
    var up=d.createElement("button");up.type="button";up.className="totop";up.setAttribute("aria-label",T.top||"Back to top");
    up.innerHTML='<svg class="i" aria-hidden="true"><use href="#i-up"/></svg>';
    up.onclick=function(){window.scrollTo({top:0,behavior:tier==="low"||reduce?"auto":"smooth"})};d.body.appendChild(up);
    var tick=false;
    function onScroll(){if(tick)return;tick=true;requestAnimationFrame(function(){tick=false;var y=window.pageYOffset||0;
      if(top)top.classList.toggle("scrolled",y>6);up.classList.toggle("on",y>700)})}
    window.addEventListener("scroll",onScroll,{passive:true});onScroll();
    // pilihan kualitas
    mark();var qs=d.querySelector(".qsw");
    if(qs)qs.addEventListener("click",function(e){var b=e.target.closest("[data-q]");if(b)window.GWM_PERF.set(b.getAttribute("data-q"))});
    // warna bilah browser mengikuti tema
    var meta=d.querySelector('meta[name="theme-color"]');
    function theme(){if(!meta)return;var c=getComputedStyle(r).getPropertyValue("--bg").trim();if(c)meta.setAttribute("content",c)}
    theme();try{new MutationObserver(theme).observe(r,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}
    // kilau mengikuti kursor pada kartu event (hanya PC tingkat tinggi)
    var raf=0,ex=0,ey=0,et=null;
    d.addEventListener("pointermove",function(e){
      if(tier!=="high"||e.pointerType!=="mouse"||dev()!=="desktop")return;
      var t=e.target.closest&&e.target.closest(".tile");if(!t)return;
      ex=e.clientX;ey=e.clientY;et=t;if(raf)return;
      raf=requestAnimationFrame(function(){raf=0;var th=et.querySelector(".thumb");if(!th)return;var b=th.getBoundingClientRect();
        th.style.setProperty("--mx",(ex-b.left)+"px");th.style.setProperty("--my",(ey-b.top)+"px")});
    },{passive:true});
  });
})();
