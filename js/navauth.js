/* Header sadar-login: memperbarui tombol profil & lencana pesan belum dibaca di topbar dan mega menu. */
(function(){
var tok=null;
try{
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i);
    if(/^sb-.+-auth-token$/.test(k)){
      var v=JSON.parse(localStorage.getItem(k)||"null");
      if(v&&(v.refresh_token||v.access_token)){tok=v;break}
    }
  }
}catch(e){}
/* ---- Menu "Akun Saya": ikon tambahan + item akun (tanpa mengubah HTML tiap halaman) ---- */
(function(){
var acc=document.querySelector("#mm .mm-acc");if(!acc||acc.dataset.nvx)return;acc.dataset.nvx="1";
var en=/^en/i.test(document.documentElement.lang||"");
var L=en?{evt:"My events",out:"Log out"}:{evt:"Event saya",out:"Keluar"};
/* ikon dua-warna, memakai kelas yang sama dengan ikon menu lain (iaw/iao/iaos/iabs) */
if(!document.getElementById("ia-evt")){
  var sp=document.createElementNS("http://www.w3.org/2000/svg","svg");
  sp.setAttribute("width","0");sp.setAttribute("height","0");sp.setAttribute("aria-hidden","true");sp.style.position="absolute";
  sp.innerHTML='<symbol id="ia-evt" viewBox="0 0 24 24"><rect class="iaw" x="3.5" y="5" width="17" height="16" rx="3"/><path class="iao" d="M3.5 8a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v2.5h-17z"/><path class="iaws" d="M8 2.8v3.4M16 2.8v3.4"/><path class="iabs" d="M12 13.5v5M9.5 16h5"/></symbol>'
   +'<symbol id="ia-out" viewBox="0 0 24 24"><rect class="iaw" x="3.5" y="3" width="10" height="18" rx="2.5"/><path class="iaos" d="M10.5 12H21M17.5 8l3.5 4-3.5 4"/></symbol>';
  document.body.appendChild(sp);
}
function item(href,icon,txt,cls){
  var a=document.createElement("a");a.href=href;if(cls)a.className=cls;
  a.innerHTML='<svg class="i" aria-hidden="true"><use href="#'+icon+'"/></svg>';
  a.appendChild(document.createTextNode(txt));return a;
}
var share=acc.querySelector(".mm-share,#pgShare");
function put(n){share?acc.insertBefore(n,share):acc.appendChild(n)}
/* Tersimpan: dipindah dari "Jelajah" ke "Akun Saya" (favorit adalah data pribadi) */
var sv=document.querySelector('#mm a[href="event?kat=tersimpan"]');if(sv)put(sv);
var hasTok=false;
try{for(var i=0;i<localStorage.length;i++){if(/^sb-.+-auth-token$/.test(localStorage.key(i))){hasTok=true;break}}}catch(e){}
if(!hasTok)return;
put(item("ajukan#mineBox","ia-evt",L.evt,"mm-evt"));
var out=item("./","ia-out",L.out,"mm-out");
acc.appendChild(out);
out.addEventListener("click",function(ev){
  ev.preventDefault();
  var go=function(){location.href="./"};
  try{if(window.sb&&window.sb.auth){window.sb.auth.signOut().then(go,go);return}}catch(e){}
  try{Object.keys(localStorage).forEach(function(k){if(/^sb-.+-auth-token$/.test(k))localStorage.removeItem(k)})}catch(e){}
  go();
});
})();

if(!tok)return;

var acc=document.getElementById("tbAccBtn");
var msgBtn=document.getElementById("tbMsgBtn");
var msgBadge=document.getElementById("tbMsgBadge");
var tr=window.IB_T||function(k){return k};

if(acc){
  acc.href="profil";
  acc.classList.add("is-in");
  acc.setAttribute("aria-label",tr("nav_prof_aria")||tr("nav_profile")||"Profil");
  var nick="";
  try{
    var u=tok.user||(tok.currentSession&&tok.currentSession.user);
    nick=(u&&u.user_metadata&&(u.user_metadata.nickname||u.user_metadata.full_name))||(u&&u.email?u.email.split("@")[0]:"");
  }catch(e){}
  var sp=acc.querySelector("span");
  if(sp)sp.textContent=nick?nick.slice(0,14):(tr("nav_profile")||"Profil");
}
if(msgBtn)msgBtn.hidden=false;

var m=document.querySelector("#mm .mm-msg");
var C=window.IB_CONFIG||{};
if(tok.access_token&&(!tok.expires_at||tok.expires_at*1000>Date.now())&&C.SUPABASE_URL){
  fetch(C.SUPABASE_URL+"/rest/v1/rpc/chat_unread",{
    method:"POST",
    headers:{apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+tok.access_token,"Content-Type":"application/json"},
    body:"{}"
  })
  .then(function(r){return r.ok?r.json():0})
  .then(function(n){
    n=+n||0;
    if(n>0){
      var txt=n>99?"99+":String(n);
      if(m){var b=document.createElement("b");b.className="nb";b.textContent=txt;m.appendChild(b)}
      if(msgBadge){msgBadge.textContent=txt;msgBadge.hidden=false}
      var ic=document.querySelector(".mm-ico");if(ic)ic.dataset.m="1";
    }
  }).catch(function(){});
}
})();
