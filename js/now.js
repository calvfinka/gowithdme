/* Tanggal, jam (WIB), dan cuaca. Cuaca asli dari Open-Meteo (gratis, tanpa kunci), mengikuti kota yang dipilih. */
(function(){
var $=function(i){return document.getElementById(i)};
if(!$("nTime"))return;
var tr=window.IB_T||function(k){return k},LOC=tr("locale"),C=window.IB_CONFIG||{},GEO=window.IB_GEO||{};
var city=null,cache={},seq=0;
/* tanggal & jam */
var fDay=new Intl.DateTimeFormat(LOC,{timeZone:"Asia/Jakarta",weekday:"long"}),
    fDate=new Intl.DateTimeFormat(LOC,{timeZone:"Asia/Jakarta",day:"numeric",month:"long",year:"numeric"}),
    fTime=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
var fYmd=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}),
    fWd=new Intl.DateTimeFormat(LOC,{timeZone:"UTC",weekday:"short"}),fMon=new Intl.DateTimeFormat(LOC,{timeZone:"Asia/Jakarta",month:"long",year:"numeric"}),calKey="";
/* kalender mini bulan ini (minggu mulai Minggu, hari ini dilingkari) */
function cal(y,m,d,n){
  var el=$("nCal");if(!el)return;var k=y+"-"+m+"-"+d;if(k===calKey)return;calKey=k;
  var first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),dim=new Date(Date.UTC(y,m,0)).getUTCDate(),pd=new Date(Date.UTC(y,m-1,0)).getUTCDate(),
      rows=Math.ceil((first+dim)/7),h="",i,v,c;
  for(i=0;i<7;i++)h+='<span class="h'+(i?"":" s")+'">'+fWd.format(new Date(Date.UTC(2021,0,3+i)))+"</span>";
  for(i=0;i<rows*7;i++){v=i-first+1;c=i%7?"":"s";
    if(v<1){v+=pd;c+=" o"}else if(v>dim){v-=dim;c+=" o"}else if(v===d)c+=" t";
    h+='<span class="'+c+'"'+(c.indexOf("t")>-1&&v===d?' aria-current="date"':"")+">"+v+"</span>"}
  el.innerHTML=h;el.setAttribute("role","group");el.setAttribute("aria-label",fMon.format(n))}
function tick(){var n=new Date(),p=fYmd.format(n).split("-"),b=$("nBig");$("nDay").textContent=fDay.format(n);$("nDate").textContent=fDate.format(n);$("nTime").textContent=fTime.format(n);
  if(b)b.textContent=p[1]+"."+p[2];cal(+p[0],+p[1],+p[2],n)}
tick();setInterval(tick,1000);
/* cuaca */
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function wmo(c,day){
  if(c===0)return day?"sun":"moon";if(c<=2)return"partly";if(c===3)return"cloud";if(c===45||c===48)return"fog";
  if(c>=51&&c<=57)return"drizzle";if((c>=61&&c<=67)||(c>=80&&c<=82))return"rain";if(c>=95)return"storm";return"cloud"}
function label(ic){return tr(ic==="sun"?"wx_clear":ic==="moon"?"wx_clearn":"wx_"+ic)}
function icon(n){return'<svg class="wi" aria-hidden="true"><use href="#w-'+n+'"/></svg>'}
function dayName(iso){var p=iso.split("-");return new Intl.DateTimeFormat(LOC,{weekday:"short"}).format(new Date(+p[0],+p[1]-1,+p[2]))}
function todayIso(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function paint(name,d,isDefault){
  var h=d.days[0];
  $("wNow").innerHTML=icon(d.ic)+'<div class="deg">'+d.t+'°</div><div class="wd"><b>'+esc(label(d.ic))+'</b><span>'+esc(name)+(isDefault?" ("+esc(tr("wx_def"))+")":"")+'</span><span>'+esc(tr("wx_hl",{h:h.max,l:h.min,p:h.p}))+'</span></div>';
  var t=d.today||todayIso();
  $("wFc").innerHTML='<div class="fc">'+d.days.map(function(x){
    return'<div class="fd"><span class="w">'+esc(x.d===t?tr("wx_today"):dayName(x.d))+'</span>'+icon(x.ic)+'<span class="t">'+x.max+'° <i>'+x.min+'°</i></span><span class="p">'+x.p+'%</span></div>'}).join("")+'</div>';
  $("wSrc").textContent=tr("wx_src")}
function msg(t){$("wNow").innerHTML='<div class="wmsg">'+esc(t)+'</div>';$("wFc").innerHTML="";$("wSrc").textContent=""}
function load(){
  var isDef=!city||city==="semua",name=isDef?(C.DEFAULT_CITY||"Jakarta"):city,g=GEO[name],my=++seq;
  if(!g)return msg(tr("wx_fail",{c:name}));
  if(cache[name])return paint(name,cache[name],isDef);
  msg(tr("wx_load"));
  var ctl=window.AbortController?new AbortController():null,to=setTimeout(function(){ctl&&ctl.abort()},8000);
  fetch("https://api.open-meteo.com/v1/forecast?latitude="+g[0]+"&longitude="+g[1]+"&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5",ctl?{signal:ctl.signal}:{})
  .then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){
    clearTimeout(to);
    var d={today:String(j.current.time||"").slice(0,10),t:Math.round(j.current.temperature_2m),ic:wmo(j.current.weather_code,j.current.is_day===1),
      days:j.daily.time.map(function(t,i){var p=j.daily.precipitation_probability_max[i]||0,c=j.daily.weather_code[i],ic=wmo(c,true);
        if(ic==="sun"&&p>=60)ic="rain";else if((ic==="sun"||ic==="partly")&&p>=40&&c<=3)ic="partly";
        return{d:t,max:Math.round(j.daily.temperature_2m_max[i]),min:Math.round(j.daily.temperature_2m_min[i]),p:p,ic:ic}})};
    cache[name]=d;if(my===seq)paint(name,d,isDef);
  }).catch(function(){clearTimeout(to);if(my===seq)msg(tr("wx_fail",{c:name}))});
}
window.IB_Now={setCity:function(c){if(c===city)return;city=c;load()}};
if(city===null){city="semua";load()}
})();
