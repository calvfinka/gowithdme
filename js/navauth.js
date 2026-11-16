/* Header sadar-login: tombol "Masuk" jadi "Profil" + ikon Pesan dengan jumlah belum dibaca. Tanpa memuat SDK (baca sesi dari localStorage). */
(function(){
var a=document.getElementById("login");if(!a)return;
var tok=null;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);
  if(/^sb-.+-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k)||"null");if(v&&(v.refresh_token||v.access_token))tok=v}}}catch(e){}
if(!tok)return;
var T=window.IB_T||function(k){return k};
a.textContent=T("nav_profile");a.setAttribute("href","profil");a.classList.remove("pri");a.classList.add("line");
var m=document.createElement("a");m.className="ico-btn ms-ico";m.href="pesan";m.setAttribute("aria-label",T("msg_nav"));
m.innerHTML='<span aria-hidden="true">✉</span><b class="nb" hidden></b>';a.parentNode.insertBefore(m,a);
var C=window.IB_CONFIG||{};
if(tok.access_token&&(!tok.expires_at||tok.expires_at*1000>Date.now())&&C.SUPABASE_URL)
 fetch(C.SUPABASE_URL+"/rest/v1/rpc/chat_unread",{method:"POST",headers:{apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+tok.access_token,"Content-Type":"application/json"},body:"{}"})
  .then(function(r){return r.ok?r.json():0}).then(function(n){var b=m.querySelector(".nb");if(+n>0){b.textContent=n>99?"99+":n;b.hidden=false}}).catch(function(){});
})();
