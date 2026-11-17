/* Penghitung kunjungan anonim untuk Statistik admin. Aturan privasi ada di supabase/schema_statistik.sql dan Kebijakan Privasi.
   Tanpa cookie, tanpa IP, tanpa akun. Hanya: halaman, bahasa, jenis perangkat, situs asal, kode acak per browser.
   Tidak jalan bila: Do Not Track / Global Privacy Control aktif, perangkat ditandai "jangan hitung" oleh admin, atau situs dibuka lokal. */
(function(){
var C=window.IB_CONFIG||{};
if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY||!window.fetch)return;
if(/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)||location.protocol==="file:")return;
if(navigator.doNotTrack==="1"||window.doNotTrack==="1"||navigator.globalPrivacyControl)return;
try{if(localStorage.getItem("gwm_notrack")==="1")return}catch(e){}
var vid="";try{vid=localStorage.getItem("gwm_vid")||"";if(!/^[A-Za-z0-9]{16,40}$/.test(vid)){var a=new Uint8Array(12);crypto.getRandomValues(a);vid=[].map.call(a,function(b){return("0"+b.toString(16)).slice(-2)}).join("");localStorage.setItem("gwm_vid",vid)}}catch(e){return}
var parts=location.pathname.replace(/\/+$/,"").split("/").filter(Boolean),lang=/^(id|en)$/.test(parts[0]||"")?parts.shift():(document.documentElement.lang==="en"?"en":"id");
var path=(parts.join("/").replace(/\.html$/,"")||"beranda").toLowerCase().slice(0,60).replace(/[^a-z0-9_\/-]/g,"");
var w=window.innerWidth||1024,device=w<640?"mobile":w<1024?"tablet":"desktop",ref="";
try{if(document.referrer){var h=new URL(document.referrer).hostname.replace(/^www\./,"");if(h&&h!==location.hostname.replace(/^www\./,""))ref=h}}catch(e){}
function send(kind,ev){
  fetch(C.SUPABASE_URL+"/rest/v1/rpc/track_hit",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json",apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+C.SUPABASE_ANON_KEY},
    body:JSON.stringify({p_kind:kind,p_path:path,p_lang:lang,p_device:device,p_ref:ref||null,p_vid:vid,p_event:ev||null})}).catch(function(){})}
/* satu kunjungan per halaman per 30 menit (muat ulang tidak menambah hitungan) */
var k="gwm_hit_"+path+"_"+lang,now=Date.now(),last=0;
try{last=+sessionStorage.getItem(k)||0}catch(e){}
if(now-last>30*60*1000){try{sessionStorage.setItem(k,String(now))}catch(e){}send("view")}
/* rincian event dibuka (app.js memicu "ib:open") dan klik tombol tiket */
var cur=null,seen={};
document.addEventListener("ib:open",function(e){var id=e.detail&&e.detail.id;if(!id)return;cur=id;if(seen[id])return;seen[id]=1;send("event",id)});
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("#dBody a.btn[target=_blank]");if(a&&cur)send("ticket",cur)});
})();
