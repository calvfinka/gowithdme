/* Header sadar-login: tombol "Masuk" jadi "Profil" + ikon Pesan dengan jumlah belum dibaca. Tanpa memuat SDK (baca sesi dari localStorage). */
(function(){
var tok=null;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);
  if(/^sb-.+-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k)||"null");if(v&&(v.refresh_token||v.access_token))tok=v}}}catch(e){}
if(!tok)return;
var m=document.querySelector("#mm .mm-msg");if(!m)return;
var C=window.IB_CONFIG||{};
if(tok.access_token&&(!tok.expires_at||tok.expires_at*1000>Date.now())&&C.SUPABASE_URL)
 fetch(C.SUPABASE_URL+"/rest/v1/rpc/chat_unread",{method:"POST",headers:{apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+tok.access_token,"Content-Type":"application/json"},body:"{}"})
  .then(function(r){return r.ok?r.json():0}).then(function(n){if(+n>0){var b=document.createElement("b");b.className="nb";b.textContent=n>99?"99+":n;m.appendChild(b);var ic=document.querySelector(".mm-ico");if(ic)ic.dataset.m="1"}}).catch(function(){});
})();
