/* GWM: pencarian autoscope.
   Satu kotak untuk semua: event, kota & provinsi, gunung, halaman situs, dan FAQ/Bantuan.
   Cara kerja: semua kata di kotak harus cocok (AND), awalan kata dan salah ketik ringan ikut dihitung,
   singkatan umum (jkt, bdg, jogja, jabar...) dikenali, dan hasil dikelompokkan lalu diurutkan menurut kecocokan.
   Awalan opsional untuk mempersempit: event: kota: gunung: halaman: bantuan: (juga versi Inggris).
   Data statis ada di js/search-index.js (dibuat build.py). Event dan kota komunitas diambil dari Supabase sekali saat pertama dibuka. */
(function(){
var inp=document.getElementById("gq");if(!inp)return;
var inp0=inp,EXTRA=[];
var tr=window.IB_T||function(k){return k},LANG=window.IB_LANG==="en"?"en":"id",LI=LANG==="en"?1:0;
var C=window.IB_CONFIG||{},REG=window.IB_REGIONS||{},MTN=window.IB_MOUNTAINS||[],SX=window.IB_SX||{pages:[],faq:[],prov:{}};
var MON=tr("mon").split(",");

/* ---------- util ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function rx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function norm(s){s=String(s==null?"":s).toLowerCase();try{s=s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")}catch(e){}return s.replace(/[^a-z0-9]+/g," ").trim()}
function ic(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function read(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function provName(p){return LANG==="en"&&SX.prov&&SX.prov[p]||p}
function provOf(c){for(var p in REG)if(REG[p].indexOf(c)>-1)return p;return""}
function lev(a,b,max){var la=a.length,lb=b.length;if(Math.abs(la-lb)>max)return max+1;
  var prev=[],cur=[],i,j;for(j=0;j<=lb;j++)prev[j]=j;
  for(i=1;i<=la;i++){cur[0]=i;var mn=i;
    for(j=1;j<=lb;j++){var c=a.charCodeAt(i-1)===b.charCodeAt(j-1)?0:1;cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+c);if(cur[j]<mn)mn=cur[j]}
    if(mn>max)return max+1;var t=prev;prev=cur;cur=t}
  return prev[lb]}

/* ---------- kamus: singkatan, kata sambung, bulan ---------- */
var ALIAS={jkt:"jakarta",dki:"jakarta",bdg:"bandung",jogja:"yogyakarta",jogya:"yogyakarta",yogya:"yogyakarta",jogjakarta:"yogyakarta",diy:"yogyakarta",
 sby:"surabaya",dps:"denpasar",tangsel:"tangerang selatan",mlg:"malang",smg:"semarang",mdn:"medan",plg:"palembang",mks:"makassar",bpp:"balikpapan",
 ikn:"nusantara",solo:"solo",lmg:"lamongan",bwi:"banyuwangi",pwt:"purwokerto",pkb:"pekanbaru",jpr:"jayapura",mnd:"manado",amb:"ambon",
 jabar:"jawa barat",jateng:"jawa tengah",jatim:"jawa timur",sumut:"sumatera utara",sumbar:"sumatera barat",sumsel:"sumatera selatan",
 kaltim:"kalimantan timur",kalsel:"kalimantan selatan",kalbar:"kalimantan barat",kalteng:"kalimantan tengah",kaltara:"kalimantan utara",
 sulsel:"sulawesi selatan",sulut:"sulawesi utara",sulteng:"sulawesi tengah",sultra:"sulawesi tenggara",ntb:"nusa tenggara barat",ntt:"nusa tenggara timur",kepri:"kepulauan riau",
 gn:"gunung",mt:"gunung",mtn:"gunung",mount:"gunung",tix:"tiket"};
var STOP={ini:1,itu:1,this:1,that:1,di:1,ke:1,dan:1,yang:1,untuk:1,dari:1,the:1,in:1,at:1,of:1,to:1,for:1,with:1,a:1,an:1,on:1};
var PFX={event:"event",events:"event",acara:"event",kota:"place",wilayah:"place",daerah:"place",provinsi:"place",city:"place",place:"place",places:"place",
 gunung:"mtn",gn:"mtn",mountain:"mtn",mt:"mtn",halaman:"page",page:"page",pages:"page",bantuan:"faq",help:"faq",faq:"faq"};
var MID=["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"],
    MEN=["january","february","march","april","may","june","july","august","september","october","november","december"];
var CATKW={konser:"konser musik festival gig live concert music",naikgunung:"naik gunung pendakian hiking open trip trekking camping mountain",pameran:"pameran expo exhibition seni art",festival:"festival musik seni fest",komedi:"komedi stand up comedy open mic lawak",seminar:"seminar konferensi talkshow workshop conference talk",meetup:"meetup komunitas trivia nobar mahjong gathering",lainnya:"teater pertunjukan pameran properti lainnya other"};
var CATIC={konser:"mic",naikgunung:"mtn",pameran:"bag",festival:"ticket",komedi:"chat",seminar:"note",meetup:"users",lainnya:"cal"};
var PGIC={home:"home",events:"cal",hike:"mtn",invite:"users",comm:"users",submit:"plus",help:"help",contact:"help",terms:"note",privacy:"note",login:"users",profile:"users",saved:"heart",done:"clock",concert:"mic",expo:"bag",hiking:"mtn",deals:"store",promo:"megaphone"};
var TYPES=["event","place","mtn","page","faq"],CAP=4,CAP_OTHER=3;

/* ---------- tanggal (zona WIB) ---------- */
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function days(a,b){return Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/864e5)}
function endOf(e){return e.end_date||e.event_date}
function evStatus(e){var t=today(),s=days(t,e.event_date),en=days(t,endOf(e));
  if(en<0)return{k:"past",n:s};
  if(s<=0)return{k:"live",n:0,l:tr(en===0&&s===0?"today":en===0?"lastday":"ongoing")};
  return{k:s<=7?"soon":"next",n:s,l:s===1?tr("tomorrow"):tr("indays",{n:s})}}
function gratis(e){return/gratis|free/i.test(e.price_label||"")}

/* ---------- dokumen yang dicari ---------- */
function mk(type,title,fields,o){var d={type:type,title:title,tn:norm(title),f:[]};
  fields.forEach(function(x){var t=norm(x[0]);if(!t)return;var w=t.split(" "),u=[],seen={};w.forEach(function(z){if(!seen[z]){seen[z]=1;u.push(z)}});d.f.push({w:u,b:x[1]})});
  for(var k in o)d[k]=o[k];return d}
var DOCS={page:[],faq:[],mtn:[],place:[],event:[]},EVENTS=null,STATE="idle";

function buildStatic(){
  var AREAS=window.IB_AREAS||{};
  (SX.pages||[]).forEach(function(p){
    DOCS.page.push(mk("page",p.t[LI],[[p.t[0],3],[p.t[1],3],[p.kw,1.2]],{href:p.h,icon:PGIC[p.k]||"search",sub:tr(p.type==="cat"?"sx_p_sub_cat":"sx_p_sub_page")}))});
  (SX.faq||[]).forEach(function(f){
    DOCS.faq.push(mk("faq",f.q[LI],[[f.q[0],3],[f.q[1],3],[f.a[0],.8],[f.a[1],.8]],{href:"bantuan#faq-"+f.n,icon:"help",sub:f.a[LI].length>96?f.a[LI].slice(0,93).replace(/\s+\S*$/,"")+"…":f.a[LI]}))});
  MTN.forEach(function(m){var name=m[0],short=name.replace(/^Gunung\s+/i,"");
    DOCS.mtn.push(mk("mtn",name,[[name,3],[short,3],[m[1]+" "+provName(m[1]),1],["gunung gn mt mountain naik gunung",.6]],
      {href:"gunung?q="+encodeURIComponent(short),icon:"mtn",short:norm(short),mdpl:m[2],prov:m[1]}))});
  Object.keys(REG).forEach(function(p){
    DOCS.place.push(mk("place",provName(p),[[p,3],[provName(p),3],["provinsi province wilayah daerah",.6]],{href:"event?prov="+encodeURIComponent(p),icon:"pin",kind:"prov",prov:p}));
    REG[p].forEach(function(c){
      var areaStr=AREAS[c]?AREAS[c].join(" "):"";
      DOCS.place.push(mk("place",c,[[c,3],[p+" "+provName(p),.9],[areaStr,1.1],["kota city wilayah daerah",.6]],{href:"event?kota="+encodeURIComponent(c),icon:"pin",kind:"city",city:c,prov:p}))})})}

function dedupe(rows){function nk(t){return String(t||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,10)}
  var m={},out=[];rows.forEach(function(r){var k=[r.city_id||r.city,r.event_date,nk(r.title)].join("|"),i=m[k];
    if(i===undefined){m[k]=out.length;out.push(r)}else if(!out[i].poster_url&&r.poster_url)out[i]=r});return out}

function evDoc(e,st){
  var city=e.city||"",pv=provOf(city),d=new Date(e.event_date+"T00:00:00"),mi=d.getMonth();
  var kw=["event acara",CATKW[e.category]||"",MID[mi]+" "+MEN[mi]+" "+MON[mi],gratis(e)?"gratis free":""];
  if(st.k==="live")kw.push("berlangsung sedang live ongoing hari ini today sekarang now");
  if(st.n===1)kw.push("besok tomorrow");
  if(st.k!=="next"&&st.k!=="past")kw.push("minggu ini pekan ini this week soon");
  var ttl=LANG==="en"&&e.title_en?e.title_en:e.title,cat=tr("cat_"+e.category)||e.category;
  var sub=[cat,e.venue&&city&&e.venue!==city?e.venue+", "+city:(e.venue||city)].filter(Boolean).join(" · ");
  return mk("event",ttl,[[e.title,3],[e.title_en,3],[e.venue,2],[city,2],[e.mountain,2],[e.genre,2],[e.organizer,1.5],[pv+" "+provName(pv),1],
    [e.price_label,.8],[kw.join(" "),.7],[String(e.description||"").slice(0,400),.4]],
    {href:"event?e="+encodeURIComponent(e.slug||e.id),evId:String(e.id),icon:CATIC[e.category]||"cal",sub:sub,date:e.event_date,st:st,
     dm:("0"+d.getDate()).slice(-2)+" "+MON[mi],bonus:st.k==="live"?.35:st.n<=7?.2:st.n<=30?.1:0})}

function buildEvents(rows){DOCS.event=[];var cnt={city:{},prov:{},mtn:{}};
  rows.forEach(function(e){var st=evStatus(e);if(st.k==="past")return;
    var city=e.city||"",pv=provOf(city);
    DOCS.event.push(evDoc(e,st));
    if(city)cnt.city[city]=(cnt.city[city]||0)+1;if(pv)cnt.prov[pv]=(cnt.prov[pv]||0)+1;
    if(e.category==="naikgunung"){var hay=norm((e.title||"")+" "+(e.mountain||"")+" "+(e.venue||""));
      DOCS.mtn.forEach(function(m){if(m.short&&hay.indexOf(m.short)>-1)cnt.mtn[m.short]=(cnt.mtn[m.short]||0)+1})}});
  DOCS.place.forEach(function(p){p.n=p.kind==="city"?cnt.city[p.city]||0:cnt.prov[p.prov]||0});
  DOCS.mtn.forEach(function(m){m.n=cnt.mtn[m.short]||0})}

/* Dipakai app.js supaya daftar di halaman Event/Gunung memakai aturan cocok yang sama dengan panel (kategori, bulan, gratis, provinsi, dll). */
var MC=typeof WeakMap==="function"?new WeakMap():null;
window.IB_EventMatch=function(e,q){var p=parse(q),toks=tokens(p.q);if(!toks.length)return true;
  var d=MC&&MC.get(e);if(!d){d=evDoc(e,evStatus(e));if(MC)MC.set(e,d)}return!!score(d,toks,false)};

function buildComm(rows){DOCS.place=DOCS.place.filter(function(p){return p.kind!=="comm"});
  rows.forEach(function(c){DOCS.place.push(mk("place",tr("sx_community",{c:c.city}),[[c.city,2.5],["komunitas community forum grup diskusi",1.5]],
    {href:"komunitas?kota="+encodeURIComponent(c.city),icon:"users",kind:"comm",city:c.city}))})}

function loadData(){if(STATE!=="idle")return;STATE="loading";
  var pending=2,fin=function(){if(--pending===0){STATE="ready"}if(open)run()};
  if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY){EVENTS=window.IB_SAMPLE||[];buildEvents(EVENTS);STATE="ready";return}
  var h={apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+C.SUPABASE_ANON_KEY};
  IB_loadEvents()   /* berbagi unduhan dengan app.js (js/events-src.js) */
   .then(function(rows){EVENTS=dedupe(rows)})
   .catch(function(){EVENTS=window.IB_SAMPLE||[]})
   .then(function(){buildEvents(EVENTS);fin()});
  fetch(C.SUPABASE_URL+"/rest/v1/forum_city_stats?select=city,active,sort&order=sort",{headers:h})
   .then(function(r){if(!r.ok)throw 0;return r.json()})
   .then(function(rows){buildComm(rows.filter(function(c){return c.active}))})
   .catch(function(){}).then(fin)}

/* ---------- mesin cocok ---------- */
function q1(t,w,fz,lo){if(w===t)return 1;
  if(lo&&t.length<4)return 0;
  if(w.indexOf(t)===0)return t.length>1?.88:.5;
  if(t.length>=3&&w.indexOf(t)>0)return .5;
  if(fz&&t.length>=4&&w.length>=4&&w.charAt(0)===t.charAt(0)){var m=t.length>=7?2:1,d=lev(t,w.length>t.length+m?w.slice(0,t.length+m):w,m);if(d<=m)return d===1?.45:.35}
  return 0}
function score(d,toks,any){var sum=0,minq=1,hit=0,i,k,j;
  for(i=0;i<toks.length;i++){var t=toks[i],best=0,bq=0;
    for(k=0;k<d.f.length;k++){var f=d.f[k],fb=0;
      for(j=0;j<f.w.length;j++){var q=q1(t,f.w[j],f.b>=.7,f.b<1);if(q>fb){fb=q;if(q===1)break}}
      if(fb*f.b>best){best=fb*f.b;bq=fb}}
    if(!best){if(!any)return null;continue}
    hit++;sum+=best;if(bq<minq)minq=bq}
  if(!hit||(any&&hit<Math.ceil(toks.length/2)))return null;
  var qn=toks.join(" "),bonus=0;
  if(d.tn===qn)bonus=3;else if(d.tn.indexOf(qn)===0)bonus=1.6;else if(d.tn.indexOf(qn)>-1)bonus=.8;
  return{s:sum/toks.length+bonus+(d.bonus||0),fz:minq<.5}}
function tokens(q){var out=[],seen={};norm(q).split(" ").forEach(function(w){if(!w)return;
  (ALIAS[w]?ALIAS[w].split(" "):[w]).forEach(function(x){if(!seen[x]){seen[x]=1;out.push(x)}})});
  var keep=out.filter(function(x){return!STOP[x]});return(keep.length?keep:out).slice(0,6)}
function parse(raw){var q=raw.trim(),m=/^([a-z]+):\s*(.*)$/i.exec(q);
  if(m&&PFX[m[1].toLowerCase()])return{scope:PFX[m[1].toLowerCase()],q:m[2]};return{scope:"",q:q}}
function search(raw,scopeSel){var p=parse(raw),toks=tokens(p.q),eff=p.scope||scopeSel||"all";
  var res={event:[],place:[],mtn:[],page:[],faq:[]},tot={all:0},partial=false;
  if(norm(p.q).length<2)return{toks:toks,res:res,tot:tot,eff:eff,q:p.q,empty:true};
  function pass(any){tot={all:0};TYPES.forEach(function(t){var list=[];
    DOCS[t].forEach(function(d){var r=score(d,toks,any);if(r)list.push({d:d,s:r.s,fz:r.fz})});
    /* salah ketik ringan hanya dipakai bila tidak ada kecocokan yang bersih di jenis yang sama */
    if(any||list.some(function(x){return!x.fz}))list=list.filter(function(x){return!x.fz});
    list.sort(function(a,b){return b.s-a.s||(a.d.date&&b.d.date?(a.d.date<b.d.date?-1:1):0)||(a.d.title<b.d.title?-1:1)});
    res[t]=list;tot[t]=list.length;tot.all+=list.length})}
  pass(false);
  if(!tot.all&&toks.length>1){pass(true);partial=tot.all>0}
  return{toks:toks,res:res,tot:tot,eff:eff,q:p.q,empty:false,partial:partial}}
function didYouMean(q){var n=norm(q);if(n.length<3)return null;var best=null,bd=99,max=Math.max(2,Math.floor(n.length/4));
  DOCS.place.concat(DOCS.mtn).forEach(function(d){if(d.kind==="comm")return;var t=d.tn,x=lev(n,t,max);
    if(x>max&&t.indexOf(" ")>-1)t.split(" ").forEach(function(w){var y=lev(n,w,max);if(y<x)x=y});
    if(x<bd&&x<=max){bd=x;best=d}});return best}

/* ---------- tampilan ---------- */
var scrim=document.createElement("div");scrim.className="sxs";scrim.hidden=true;
var panel=document.createElement("div");panel.className="sxp";panel.id="sxPanel";panel.hidden=true;
panel.innerHTML='<div class="sxc" id="sxChips" role="group" hidden></div><div class="sxl" id="sxList" role="listbox"></div><div class="sxf"><span>'+esc(tr("sx_hint"))+'</span></div><div class="sxsr" id="sxLive" aria-live="polite"></div>';
document.body.appendChild(scrim);document.body.appendChild(panel);
inp.setAttribute("aria-controls","sxList");
var elList=panel.querySelector("#sxList"),elChips=panel.querySelector("#sxChips"),elLive=panel.querySelector("#sxLive");
var open=false,scopeSel="all",active=-1,items=[],lastQ="";
var SCOPES=[["all","sx_scope_all"],["event","sx_t_event"],["place","sx_t_place"],["mtn","sx_t_mtn"],["page","sx_t_page"],["faq","sx_t_faq"]];

function hl(t,toks){t=String(t||"");var ts=toks.filter(function(x){return x.length>1});if(!ts.length)return esc(t);
  var re=new RegExp(ts.map(rx).join("|"),"ig"),out="",last=0,m;
  while((m=re.exec(t))){if(!m[0]){re.lastIndex++;continue}out+=esc(t.slice(last,m.index))+"<mark>"+esc(m[0])+"</mark>";last=m.index+m[0].length}
  return out+esc(t.slice(last))}
/* Panel menempel pada kotak cari yang TERLIHAT: kotak besar di beranda bila utuh di bawah header, kalau tidak, tepat di bawah header.
   Dihitung ulang saat gulir/ubah ukuran, karena browser bisa menggulir halaman setelah kotak difokuskan (header lengket menutupi kotak). */
function topEdge(){var tb=document.querySelector(".topbar");return tb?Math.max(0,tb.getBoundingClientRect().bottom):0}
function sr(r,Z){return r&&{top:r.top/Z,bottom:r.bottom/Z,left:r.left/Z,width:r.width/Z,height:r.height/Z}}
function fit(){var Z=window.GWM_Z||1,tbB=topEdge()/Z,vv=window.visualViewport,vh=(vv?vv.height:window.innerHeight)/Z,vw=(document.documentElement.clientWidth||window.innerWidth)/Z,
  box=inp.closest("[data-sxanchor]"),r=box&&sr(box.getBoundingClientRect(),Z),
  shown=!!(r&&r.height>0&&r.top>=tbB-1&&r.bottom<=vh),top,ar;
  if(shown){ar=r;top=r.bottom+6;scrim.style.top="0px"}
  else{var hs=document.querySelector(".tb-main .search"),hr=hs&&sr(hs.getBoundingClientRect(),Z);
    var hsOn=hs&&hr.width>0&&getComputedStyle(hs).visibility!=="hidden";ar=hsOn?hr:(r&&r.width>0?r:(hr&&hr.width>0?hr:null));top=(tbB||52)+6;scrim.style.top=(tbB||52)+"px"}
  top=Math.min(top,Math.max(8,vh-220));
  panel.style.top=top+"px";panel.style.maxHeight=Math.max(220,vh-top-12)+"px";
  if(ar&&vw>640){var w=Math.min(Math.max(ar.width,360),vw-16),l=Math.min(Math.max(8,ar.left),vw-w-8);
    panel.style.left=l+"px";panel.style.width=w+"px";panel.style.transform="none"}
  else{panel.style.left=panel.style.width=panel.style.transform=""}}
var fitRaf=0;function fitSoon(){if(!open||fitRaf)return;fitRaf=requestAnimationFrame(function(){fitRaf=0;if(open)fit()})}
function setOpen(v){if(open===v)return;open=v;panel.hidden=scrim.hidden=!v;inp.setAttribute("aria-expanded",v?"true":"false");
  if(v){fit();loadData();run();fitSoon();setTimeout(fitSoon,120);setTimeout(fitSoon,350)}else{active=-1;inp.removeAttribute("aria-activedescendant")}}

function itemHtml(r,toks,i){var d=r.d,meta="";
  if(d.type==="event")meta='<span class="sxm'+(d.st.k==="live"?" on":"")+'">'+esc(d.dm)+'<small>'+esc(d.st.k==="live"?d.st.l:d.st.k==="soon"?d.st.l:"")+'</small></span>';
  else if(d.type==="place"&&(d.kind==="city"||d.kind==="prov")&&EVENTS)meta='<span class="sxm">'+esc(d.n?tr("sx_events_n",{n:d.n}):"")+'</span>';
  else if(d.type==="mtn")meta='<span class="sxm">'+esc(d.n?tr("sx_trips",{n:d.n}):d.mdpl?d.mdpl.toLocaleString(tr("numloc"))+" "+tr("mdpl"):"")+'</span>';
  var sub=d.sub;
  if(d.type==="place"){sub=d.kind==="prov"?tr("sx_prov"):d.kind==="city"?tr("sx_city")+" · "+provName(d.prov):tr("sx_community_sub",{c:d.city})}
  if(d.type==="mtn")sub=provName(d.prov)+(d.mdpl&&d.n?" · "+d.mdpl.toLocaleString(tr("numloc"))+" "+tr("mdpl"):"");
  return'<a class="sxr" role="option" id="sxo'+i+'" aria-selected="false" href="'+esc(d.href)+'" data-i="'+i+'"'+(d.evId?' data-ev="'+esc(d.evId)+'"':"")+'>'
    +'<span class="sxi">'+ic(d.icon)+'</span><span class="sxt"><b>'+hl(d.title,toks)+'</b><small>'+(d.type==="faq"?hl(sub,toks):esc(sub))+'</small></span>'+meta+'</a>'}
function actHtml(icon,label,href,i,extra){return'<a class="sxr act" role="option" id="sxo'+i+'" aria-selected="false" href="'+esc(href)+'" data-i="'+i+'"'+(extra||"")+'><span class="sxi">'+ic(icon)+'</span><span class="sxt"><b>'+esc(label)+'</b></span></a>'}

function trendDocs(){return DOCS.event.filter(function(d){return d.st.k!=="past"}).sort(function(a,b){return(a.st.k==="live"?0:1)-(b.st.k==="live"?0:1)||(a.date<b.date?-1:a.date>b.date?1:0)}).slice(0,5)}
function renderEmpty(){
  var rec=read("gwm_recent_q",[]),h="",tr5=trendDocs(),base=rec.length;
  if(rec.length){h+='<div class="sxg"><span>'+esc(tr("sx_recent"))+'</span><button type="button" data-clr="1">'+esc(tr("sx_clear"))+'</button></div>'+
    rec.map(function(q,i){return'<a class="sxr" role="option" id="sxo'+i+'" aria-selected="false" href="#" data-q="'+esc(q)+'" data-i="'+i+'"><span class="sxi">'+ic("clock")+'</span><span class="sxt"><b>'+esc(q)+'</b></span></a>'}).join("")}
  if(tr5.length){h+='<div class="sxg"><span>'+esc(tr("nv_trend_h"))+'</span></div>'+tr5.map(function(d,n){var i=base+n;
    return'<a class="sxr" role="option" id="sxo'+i+'" aria-selected="false" href="'+esc(d.href)+'" data-i="'+i+'" data-ev="'+esc(d.evId)+'"><span class="sxi rk'+(n<3?' top':'')+'">'+(n+1)+'</span><span class="sxt"><b>'+esc(d.title)+'</b><small>'+esc(d.sub)+'</small></span><span class="sxm'+(d.st.k==="live"?" on":"")+'">'+esc(d.dm)+'<small>'+esc(d.st.k==="live"?d.st.l:d.st.k==="soon"?d.st.l:"")+'</small></span></a>'}).join("")}
  h+='<div class="sxg"><span>'+esc(tr("sx_try"))+'</span></div><div class="sxtry">'+[1,2,3,4,5,6].map(function(n){var t=tr("sx_try"+n);return'<button type="button" data-q="'+esc(t)+'">'+esc(t)+'</button>'}).join("")+'</div>';
  elList.innerHTML=h;elChips.hidden=true;elLive.textContent="";items=[].slice.call(elList.querySelectorAll("a.sxr"));setActive(-1)}

function run(){var raw=inp.value;lastQ=raw;
  if(!raw.trim()){scopeSel="all";renderEmpty();return}
  var r=search(raw,scopeSel);
  if(r.empty){renderEmpty();return}
  var eff=r.eff,h="",i=0,order;
  /* chip lingkup: hanya yang punya hasil */
  elChips.hidden=false;
  elChips.innerHTML=SCOPES.filter(function(s){return s[0]==="all"||r.tot[s[0]]}).map(function(s){
    return'<button type="button" data-s="'+s[0]+'" aria-pressed="'+(eff===s[0])+'">'+esc(tr(s[1]))+'<small>'+(s[0]==="all"?r.tot.all:r.tot[s[0]])+'</small></button>'}).join("");
  if(!r.tot.all){
    var dm=didYouMean(r.q);
    h='<div class="sxe"><b>'+esc(tr("sx_none",{q:r.q}))+'</b><p>'+esc(tr("sx_none_tip"))+'</p>'+(dm?'<p><button type="button" class="sxdm" data-q="'+esc(dm.title)+'">'+esc(tr("sx_dym"))+' <u>'+esc(dm.title)+'</u>?</button></p>':"")+'</div>';
    h+=actHtml("help",tr("sx_ask"),"bantuan#kontak",0)+actHtml("plus",tr("sx_submit"),"ajukan",1);
    elList.innerHTML=h;items=[].slice.call(elList.querySelectorAll("a.sxr"));setActive(-1);elLive.textContent=tr("sx_none",{q:r.q});return}
  order=eff==="all"?TYPES.filter(function(t){return r.tot[t]}).sort(function(a,b){return r.res[b][0].s-r.res[a][0].s}):[eff];
  if(r.partial)h+='<div class="sxn">'+esc(tr("sx_partial"))+'</div>';
  order.forEach(function(t){var list=r.res[t];if(!list.length)return;
    var cap=eff==="all"?(t==="event"?CAP:CAP_OTHER):30,shown=list.slice(0,cap);
    h+='<div class="sxg" role="presentation"><span>'+esc(tr("sx_t_"+t))+'</span>'+(eff==="all"&&list.length>shown.length?'<button type="button" data-s="'+t+'">'+esc(tr("sx_more",{n:list.length-shown.length}))+'</button>':"")+'</div>';
    shown.forEach(function(x){h+=itemHtml(x,r.toks,i++)})});
  if(r.tot.event&&!r.partial&&(eff==="all"||eff==="event"))h+=actHtml("search",tr("sx_all_events",{q:r.q}),"event?q="+encodeURIComponent(r.q),i++);
  elList.innerHTML=h;items=[].slice.call(elList.querySelectorAll("a.sxr"));setActive(0);
  elLive.textContent=tr("sx_status",{n:r.tot.all})+(STATE==="loading"?" · "+tr("sx_loading"):"")}

function setActive(n){if(active>-1&&items[active]){items[active].setAttribute("aria-selected","false")}
  active=items.length?Math.max(-1,Math.min(n,items.length-1)):-1;
  if(active>-1&&items[active]){var el=items[active];el.setAttribute("aria-selected","true");inp.setAttribute("aria-activedescendant",el.id);
    var a=el.offsetTop,b=a+el.offsetHeight;if(a<elList.scrollTop+30)elList.scrollTop=Math.max(0,a-40);else if(b>elList.scrollTop+elList.clientHeight)elList.scrollTop=b-elList.clientHeight+8}
  else inp.removeAttribute("aria-activedescendant")}
function remember(){var q=parse(inp.value).q.trim();if(norm(q).length<2)return;
  var rec=read("gwm_recent_q",[]).filter(function(x){return x.toLowerCase()!==q.toLowerCase()});rec.unshift(q);write("gwm_recent_q",rec.slice(0,6))}

/* ---------- peristiwa ---------- */
var tm;
function syncVals(){EXTRA.concat([inp0]).forEach(function(o){if(o&&o!==inp)o.value=inp.value})}
function onInput(){clearTimeout(tm);syncVals();tm=setTimeout(function(){if(!open)setOpen(true);else run()},50)}
function onFocus(){setOpen(true)}
function submit(){var q=inp.value.trim();if(!q){inp.focus();return}
  if(open&&active>-1&&items[active]){items[active].click();return}
  var p=parse(q);remember();location.href=(p.scope==="mtn"?"gunung":"event")+"?q="+encodeURIComponent(p.q||q)}
function onKey(e){var k=e.key;
  if(k==="ArrowDown"){e.preventDefault();if(!open)setOpen(true);else setActive(active<items.length-1?active+1:0)}
  else if(k==="ArrowUp"){e.preventDefault();if(open)setActive(active>0?active-1:items.length-1)}
  else if(k==="Enter"){e.preventDefault();submit()}
  else if(k==="Escape"){if(open){e.preventDefault();setOpen(false)}else if(inp.value){inp.value="";syncVals()}}
}
function use(el){if(inp===el)return;if(open)setOpen(false);inp=el;inp.setAttribute("aria-controls","sxList")}
function bind(el,extra){if(extra)EXTRA.push(el);
  el.addEventListener("input",function(){use(el);onInput()});
  el.addEventListener("focus",function(){use(el);onFocus()});
  el.addEventListener("click",function(){use(el);onFocus()});
  el.addEventListener("keydown",function(e){use(el);onKey(e)});
  var go=el.parentNode&&el.parentNode.querySelector(".sxgo");if(go)go.addEventListener("click",function(){use(el);submit()})}
bind(inp0,false);
var hero=document.getElementById("gq2");if(hero){hero.setAttribute("aria-controls","sxList");bind(hero,true)}
function visible(el){var r=el.getBoundingClientRect();return r.height>0&&r.top>=topEdge()-1&&r.bottom<=window.innerHeight}
document.addEventListener("keydown",function(e){
  var t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
  if((e.key==="/"&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k")){e.preventDefault();var f=hero&&visible(hero)?hero:inp0;f.focus();f.select()}});
panel.addEventListener("mousedown",function(e){e.preventDefault()});
scrim.addEventListener("click",function(){setOpen(false)});
document.addEventListener("focusin",function(e){if(open&&e.target!==inp&&!panel.contains(e.target))setOpen(false)});
window.addEventListener("resize",function(){if(open)fit()});
var scT;window.addEventListener("scroll",function(){fitSoon();clearTimeout(scT);scT=setTimeout(fitSoon,160)},{passive:true});
/* kotak cari di header baru muncul/hilang setelah IntersectionObserver jalan (class nv-hv): hitung ulang saat itu terjadi */
try{new MutationObserver(fitSoon).observe(document.body,{attributes:true,attributeFilter:["class"]})}catch(e){}
if(window.visualViewport){window.visualViewport.addEventListener("resize",function(){if(open)fit()});window.visualViewport.addEventListener("scroll",fitSoon)}
window.addEventListener("pageshow",function(e){if(e.persisted)setOpen(false)});
panel.addEventListener("click",function(e){
  var c=e.target.closest("[data-clr]");if(c){e.preventDefault();write("gwm_recent_q",[]);run();return}
  var s=e.target.closest("[data-s]");if(s){e.preventDefault();scopeSel=s.dataset.s;run();inp.focus();return}
  var q=e.target.closest("[data-q]");if(q){e.preventDefault();inp.value=q.dataset.q;scopeSel="all";run();inp.focus();return}
  var a=e.target.closest("a.sxr");if(!a)return;
  remember();
  if(a.dataset.ev&&window.IB_OpenEv){var ok=window.IB_OpenEv(a.dataset.ev);if(ok!==false){e.preventDefault();setOpen(false);return}}
  var h=a.getAttribute("href")||"";if(h.indexOf("#")>-1&&h.split("#")[0]===(location.pathname.split("/").pop()||"")){setOpen(false)}});

buildStatic();
})();
