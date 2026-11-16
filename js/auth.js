(function(){var tr=window.IB_T||function(k){return k};
if(!sb){msg((!window.supabase?tr("a_lib"):!(window.IB_CONFIG&&IB_CONFIG.SUPABASE_URL)?tr("a_cfg"):tr("a_notready")),"err");return}
var mode="login",holding=false,AFTER="gwm_after";
/* Arah setelah masuk: ?next=... atau beranda. Disimpan di sessionStorage supaya tetap jalan setelah Google/email membawa pengguna kembali. */
function setAfter(){try{sessionStorage.setItem(AFTER,JSON.stringify({to:safeNext("./"),t:Date.now()}))}catch(e){}}
function takeAfter(){try{var v=JSON.parse(sessionStorage.getItem(AFTER)||"null");sessionStorage.removeItem(AFTER);return v&&Date.now()-v.t<6e5?v.to:null}catch(e){return null}}
function goAfter(){var to=takeAfter();if(!to)return false;msg(tr("a_redirect"),"ok");setTimeout(function(){location.href=to},350);return true}
function seg(m){mode=m;$("fLogin").hidden=m!=="login";$("fReg").hidden=m!=="reg";$("sLogin").classList.toggle("on",m==="login");$("sReg").classList.toggle("on",m==="reg");msg("")}
$("sLogin").onclick=function(){seg("login")};$("sReg").onclick=function(){seg("reg")};
$("fLogin").onsubmit=function(e){e.preventDefault();msg(tr("processing"));holding=true;setAfter();
  sb.auth.signInWithPassword({email:$("lEmail").value.trim(),password:$("lPass").value}).then(function(r){
    if(r.error){holding=false;takeAfter();return msg(/not confirmed/i.test(r.error.message||"")?tr("a_unconfirmed"):tr("a_bad"),"err")}
    msg(tr("a_redirect"),"ok");logLocation(function(){holding=false;goAfter()})})};
$("fReg").onsubmit=function(e){e.preventDefault();
  if(!$("rConsent").checked)return msg(tr("a_consent"),"err");
  msg(tr("processing"));setAfter();
  sb.auth.signUp({email:$("rEmail").value.trim(),password:$("rPass").value,options:{data:{nickname:$("rNick").value.trim()},emailRedirectTo:location.href}}).then(function(r){
    if(r.error){takeAfter();return msg(r.error.message,"err")}
    var us=r.data&&r.data.user;if(us&&us.identities&&us.identities.length===0){takeAfter();return msg(tr("a_exists"),"err")}
    if(!r.data.session)takeAfter();
    msg(r.data.session?tr("a_created"):tr("a_created_mail"),"ok")})};
$("bGoogle").onclick=function(){msg(tr("a_gredir"));setAfter();
  sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:"select_account"}}}).then(function(r){if(r.error)msg(tr("a_goff"),"err")})};
$("lForgot").onclick=function(){var em=$("lEmail").value.trim();if(!em)return msg(tr("a_needmail"),"err");
  sb.auth.resetPasswordForEmail(em,{redirectTo:location.href}).then(function(r){msg(r.error?r.error.message:tr("a_resetsent"),r.error?"err":"ok")})};
$("bOut").onclick=function(){sb.auth.signOut().then(function(){location.href="./"},function(){location.href="./"})};
// Placeholder deteksi lokasi: GPS browser. Pencatatan ke login_logs lewat Edge Function "log-login" (tahap 3).
function logLocation(done){
  var fin=false,end=function(){if(!fin){fin=true;if(done)done()}},t=setTimeout(end,7000);
  if(!navigator.geolocation){$("locSt").textContent=tr("a_nogps");clearTimeout(t);return end()}
  navigator.geolocation.getCurrentPosition(function(p){
    $("locSt").textContent=tr("a_loc",{m:Math.round(p.coords.accuracy)});
    try{sb.functions.invoke("log-login",{body:{lat:p.coords.latitude,lng:p.coords.longitude,device:navigator.userAgent}}).catch(function(){})}catch(x){}
    clearTimeout(t);end()
  },function(){$("locSt").textContent=tr("a_denied");clearTimeout(t);end()},{enableHighAccuracy:true,timeout:6000});
}
$("bLoc").onclick=function(){logLocation()};
var recovering=false;
function show(){if(recovering||holding)return;getMe().then(function(m){
  $("guest").hidden=!!m;$("me").hidden=!m;if(!m)return;
  var p=m.profile,n=p.nickname||m.user.email.split("@")[0];
  $("av").textContent=p.avatar_url?"":n.charAt(0).toUpperCase();$("av").style.background=p.avatar_url?"center/cover url('"+p.avatar_url.replace(/'/g,"%27")+"')":"";$("nm").textContent=n;$("em").textContent=m.user.email;
  $("bv").hidden=!p.verified;$("ba").hidden=p.role!=="admin";$("lAdmin").hidden=p.role!=="admin";
  $("pNick").value=p.nickname||"";loadCities($("pCity"),true).then(function(){$("pCity").value=p.city_id||""});
  loadExtra(m.user.id);
})}
/* ---- profil diperluas: bio, minat, level, privasi, statistik (supabase/schema_profil.sql) ---- */
var INT=["konser","festival","pameran","naikgunung","camping","pop","rock","indie","edm","jazz","hiphop","dangdut","kpop"],LV=["pemula","menengah","sulit"],sel=[];
function drawInt(){$("pInt").innerHTML=INT.map(function(k){return'<button type="button" class="chip" data-k="'+k+'" aria-pressed="'+(sel.indexOf(k)>-1)+'">'+esc(tr("it_"+k))+'</button>'}).join("")}
$("pInt").onclick=function(ev){var b=ev.target.closest("[data-k]");if(!b)return;var k=b.dataset.k,i=sel.indexOf(k);
  if(i>-1)sel.splice(i,1);else{if(sel.length>=8)return msg(tr("pe_max"),"err");sel.push(k)}drawInt()};
$("pBio").oninput=function(){$("pBioN").textContent=this.value.length};
$("pLevel").innerHTML='<option value="">'+esc(tr("pe_nolevel"))+'</option>'+LV.map(function(k){return'<option value="'+k+'">'+esc(tr("lv_"+k))+'</option>'}).join("");
function loadExtra(id){
  Promise.all([sb.rpc("profile_view",{p_id:id}),sb.from("profile_extra").select("log_visits").eq("user_id",id).maybeSingle()]).then(function(x){
    var r=x[0];if(r.error||!r.data){$("fExtra").hidden=true;return}
    $("fExtra").hidden=false;var d=r.data,st=d.stats||{};
    $("sPosts").textContent=st.posts||0;$("sJoined").textContent=st.joined||0;$("sHosted").textContent=st.hosted||0;
    $("pBio").value=d.bio||"";$("pBioN").textContent=($("pBio").value||"").length;sel=(d.interests||[]).slice();drawInt();$("pLevel").value=d.level||"";
    $("pPublic").checked=d.is_public!==false;$("pShowV").checked=d.show_visitors!==false;$("pLog").checked=!(x[1].data&&x[1].data.log_visits===false)})}
$("fExtra").hidden=true;
/* Satu tombol Simpan untuk semua isian. Berhasil -> halaman profil (atau ?next=...). Batal -> tujuan yang sama tanpa menyimpan. */
$("pCancel").href=safeNext("profil");
$("fAll").onsubmit=function(e){e.preventDefault();var btn=this.querySelector('[type="submit"]'),nick=$("pNick").value.trim();
  if(!nick)return msg(tr("pe_nick_need"),"err");
  btn.disabled=true;msg(tr("processing"));
  getMe().then(function(m){return sb.from("profiles").update({nickname:nick,city_id:$("pCity").value||null}).eq("id",m.user.id)}).then(function(r){
    if(r.error)throw r.error;
    return $("fExtra").hidden?null:sb.rpc("profile_save",{p_bio:$("pBio").value,p_interests:sel,p_level:$("pLevel").value||null,p_public:$("pPublic").checked,p_show_visitors:$("pShowV").checked,p_log_visits:$("pLog").checked})
  }).then(function(r){
    if(r&&r.error)throw r.error;
    msg(tr("pe_saved_go"),"ok");var to=safeNext("profil");if(to==="profil")to="profil?saved=1";
    setTimeout(function(){location.href=to},700)
  }).catch(function(err){btn.disabled=false;msg((err&&err.message)||tr("a_notready"),"err")})};
sb.auth.onAuthStateChange(function(ev){
  if(ev==="PASSWORD_RECOVERY"){recovering=true;$("guest").hidden=true;$("me").hidden=true;$("rec").hidden=false;msg(tr("a_recover"),"ok");return}
  if(ev==="SIGNED_IN"&&!holding&&goAfter())return;
  show()});
$("fRec").onsubmit=function(e){e.preventDefault();var p=$("nPass").value;
  if(p.length<8)return msg(tr("a_pass8"),"err");
  sb.auth.updateUser({password:p}).then(function(r){if(r.error)return msg(r.error.message,"err");
    recovering=false;$("rec").hidden=true;$("nPass").value="";msg(tr("a_passok"),"ok");show()})};
show();
})();
