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
