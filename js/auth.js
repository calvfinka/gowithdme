(function(){var tr=window.IB_T||function(k){return k};
if(!sb){msg((!window.supabase?tr("a_lib"):!(window.IB_CONFIG&&IB_CONFIG.SUPABASE_URL)?tr("a_cfg"):tr("a_notready")),"err");return}
var mode="login";
function seg(m){mode=m;$("fLogin").hidden=m!=="login";$("fReg").hidden=m!=="reg";$("sLogin").classList.toggle("on",m==="login");$("sReg").classList.toggle("on",m==="reg");msg("")}
$("sLogin").onclick=function(){seg("login")};$("sReg").onclick=function(){seg("reg")};
$("fLogin").onsubmit=function(e){e.preventDefault();msg(tr("processing"));
  sb.auth.signInWithPassword({email:$("lEmail").value.trim(),password:$("lPass").value}).then(function(r){
    if(r.error)return msg(tr("a_bad"),"err");msg("");logLocation()})};
$("fReg").onsubmit=function(e){e.preventDefault();
  if(!$("rConsent").checked)return msg(tr("a_consent"),"err");
  msg(tr("processing"));
  sb.auth.signUp({email:$("rEmail").value.trim(),password:$("rPass").value,options:{data:{nickname:$("rNick").value.trim()},emailRedirectTo:location.href}}).then(function(r){
    if(r.error)return msg(r.error.message,"err");
    msg(r.data.session?tr("a_created"):tr("a_created_mail"),"ok")})};
$("bGoogle").onclick=function(){msg(tr("a_gredir"));
  sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:"select_account"}}}).then(function(r){if(r.error)msg(tr("a_goff"),"err")})};
$("lForgot").onclick=function(){var em=$("lEmail").value.trim();if(!em)return msg(tr("a_needmail"),"err");
  sb.auth.resetPasswordForEmail(em,{redirectTo:location.href}).then(function(r){msg(r.error?r.error.message:tr("a_resetsent"),r.error?"err":"ok")})};
$("bOut").onclick=function(){sb.auth.signOut()};
$("fProf").onsubmit=function(e){e.preventDefault();getMe().then(function(m){
  sb.from("profiles").update({nickname:$("pNick").value.trim(),city_id:$("pCity").value||null}).eq("id",m.user.id).then(function(r){
    msg(r.error?r.error.message:tr("a_saved"),r.error?"err":"ok");if(!r.error)show()})})};
// Placeholder deteksi lokasi: GPS browser. Pencatatan ke login_logs lewat Edge Function "log-login" (tahap 3).
function logLocation(){
  if(!navigator.geolocation)return $("locSt").textContent=tr("a_nogps");
  navigator.geolocation.getCurrentPosition(function(p){
    $("locSt").textContent=tr("a_loc",{m:Math.round(p.coords.accuracy)});
    try{sb.functions.invoke("log-login",{body:{lat:p.coords.latitude,lng:p.coords.longitude,device:navigator.userAgent}}).catch(function(){})}catch(x){}
  },function(){$("locSt").textContent=tr("a_denied")},{enableHighAccuracy:true,timeout:10000});
}
$("bLoc").onclick=logLocation;
function show(){getMe().then(function(m){
  $("guest").hidden=!!m;$("me").hidden=!m;if(!m)return;
  var p=m.profile,n=p.nickname||m.user.email.split("@")[0];
  $("av").textContent=p.avatar_url?"":n.charAt(0).toUpperCase();$("av").style.background=p.avatar_url?"center/cover url('"+p.avatar_url.replace(/'/g,"%27")+"')":"";$("nm").textContent=n;$("em").textContent=m.user.email;
  $("bv").hidden=!p.verified;$("ba").hidden=p.role!=="admin";$("lAdmin").hidden=p.role!=="admin";
  $("pNick").value=p.nickname||"";loadCities($("pCity"),true).then(function(){$("pCity").value=p.city_id||""});
})}
sb.auth.onAuthStateChange(function(){show()});show();
})();
