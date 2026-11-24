/* GoWithDME: pencarian autoscope.
   Satu kotak untuk semua: event, artis/penampil, genre, kota & provinsi, gunung, artikel blog, postingan komunitas, nama akun, halaman situs, dan FAQ/Bantuan.
   Cara kerja: semua kata di kotak harus cocok (AND), awalan kata dan salah ketik ringan ikut dihitung,
   singkatan umum (jkt, bdg, jogja, jabar...) dikenali, dan hasil dikelompokkan lalu diurutkan menurut kecocokan.
   Awalan opsional untuk mempersempit: event: artis: genre: kota: gunung: artikel: komunitas: akun: halaman: bantuan: (juga versi Inggris).
   Artikel: dari blog/index.json (statis, tanpa Supabase). Postingan komunitas: tampilan publik forum_posts_public, dicari saat mengetik (jeda 0,3 detik, minimal 3 huruf, hasil disimpan).
   Akun: tabel profiles, HANYA bila pengguna sudah masuk (RLS "lihat profil" hanya untuk authenticated); yang diambil cuma id, nickname, verified.
   Artis dan genre diambil dari kolom lineup dan genre tiap event (pembantunya: window.IB_Facets di js/events-src.js).
   Alamat tautan dibuat rapi dan mudah dibaca: event?artis=dewa-19  event?genre=k-pop  event?kota=jakarta  event?q=blood+saga
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
function norm(s){s=String(s==null?"":s).toLowerCase().replace(/ø/g,"o").replace(/æ/g,"ae").replace(/ß/g,"ss").replace(/đ/g,"d").replace(/ł/g,"l");try{s=s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")}catch(e){}return s.replace(/[^a-z0-9]+/g," ").trim()}
function ic(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function read(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var F=window.IB_Facets||{slug:function(x){return norm(x).replace(/ /g,"-")},artists:function(){return[]},genres:function(){return[]}};
function sl(x){return F.slug(x)}
function qenc(x){return encodeURIComponent(x).replace(/%20/g,"+")}   /* spasi jadi + supaya alamat tidak penuh %20 */
function shortVenue(v,city){v=String(v||"").split(",")[0].trim();if(!v)return city||"";
  return city&&norm(v).indexOf(norm(city))<0?v+", "+city:v}
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
 gunung:"mtn",gn:"mtn",mountain:"mtn",mt:"mtn",artikel:"blog",blog:"blog",article:"blog",articles:"blog",tulisan:"blog",
 komunitas:"post",postingan:"post",post:"post",posts:"post",forum:"post",diskusi:"post",community:"post",
 akun:"user",user:"user",users:"user",pengguna:"user",orang:"user",account:"user",accounts:"user",artis:"artist",artist:"artist",artists:"artist",penampil:"artist",musisi:"artist",lineup:"artist",
 genre:"genre",genres:"genre",aliran:"genre",halaman:"page",page:"page",pages:"page",bantuan:"faq",help:"faq",faq:"faq"};
var MID=["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"],
    MEN=["january","february","march","april","may","june","july","august","september","october","november","december"];
var CATKW={konser:"konser musik festival gig live concert music",naikgunung:"naik gunung pendakian hiking open trip trekking camping mountain",pameran:"pameran expo exhibition seni art",festival:"festival musik seni fest",komedi:"komedi stand up comedy open mic lawak",seminar:"seminar konferensi talkshow workshop conference talk",meetup:"meetup komunitas trivia nobar mahjong gathering",lainnya:"teater pertunjukan pameran properti lainnya other"};
var CATIC={konser:"mic",naikgunung:"mtn",pameran:"bag",festival:"ticket",komedi:"chat",seminar:"note",meetup:"users",lainnya:"cal"};
var PGIC={home:"home",events:"cal",hike:"mtn",invite:"users",comm:"users",submit:"plus",help:"help",contact:"help",terms:"note",privacy:"note",login:"users",profile:"users",saved:"heart",done:"clock",concert:"mic",expo:"bag",hiking:"mtn",deals:"store",promo:"megaphone"};
var TYPES=["event","artist","genre","place","mtn","blog","post","user","page","faq"],CAP=5,CAP_OTHER=3,MAXROWS=8;

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
var DOCS={page:[],faq:[],mtn:[],place:[],event:[],artist:[],genre:[],blog:[],post:[],user:[]},EVENTS=null,STATE="idle";

function buildStatic(){
  var AREAS=window.IB_AREAS||{};
  (SX.pages||[]).forEach(function(p){
    DOCS.page.push(mk("page",p.t[LI],[[p.t[0],3],[p.t[1],3],[p.kw,1.2]],{href:p.h,icon:PGIC[p.k]||"search",sub:tr(p.type==="cat"?"sx_p_sub_cat":"sx_p_sub_page")}))});
  (SX.faq||[]).forEach(function(f){
    DOCS.faq.push(mk("faq",f.q[LI],[[f.q[0],3],[f.q[1],3],[f.a[0],.8],[f.a[1],.8]],{href:"bantuan#faq-"+f.n,icon:"help",sub:f.a[LI].length>96?f.a[LI].slice(0,93).replace(/\s+\S*$/,"")+"…":f.a[LI]}))});
  MTN.forEach(function(m){var name=m[0],short=name.replace(/^Gunung\s+/i,"");
    DOCS.mtn.push(mk("mtn",name,[[name,3],[short,3],[m[1]+" "+provName(m[1]),1],["gunung gn mt mountain naik gunung",.6]],
      {href:"gunung?q="+qenc(short),icon:"mtn",short:norm(short),mdpl:m[2],prov:m[1]}))});
  Object.keys(REG).forEach(function(p){
    DOCS.place.push(mk("place",provName(p),[[p,3],[provName(p),3],["provinsi province wilayah daerah",.6]],{href:"event?prov="+sl(p),icon:"pin",kind:"prov",prov:p}));
    REG[p].forEach(function(c){
      var areaStr=AREAS[c]?AREAS[c].join(" "):"";
      DOCS.place.push(mk("place",c,[[c,3],[p+" "+provName(p),.9],[areaStr,1.1],["kota city wilayah daerah",.6]],{href:"event?kota="+sl(c),icon:"pin",kind:"city",city:c,prov:p}))})})}

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
  var al=F.artists(e),gl=F.genres(e),alab=al.map(function(a){return a.label}),glab=gl.map(function(g){return g.label});
  /* bentuk rapat (kpop, bigbang) supaya "kpop" tetap menemukan "K-pop" */
  var compact=al.concat(gl).map(function(x){return x.k.replace(/ /g,"")}).filter(function(x){return x.length>2}).join(" ");
  var venue=shortVenue(e.venue,city),g1=e.category==="naikgunung"||e.category==="pameran"?"":(String(e.genre||"").length<=28?String(e.genre||"").trim():(glab[0]||""));
  var sub=[cat,g1,venue].filter(Boolean).join(" · ");
  var lu=alab.length?alab.slice(0,3).join(", ")+(alab.length>3?" +"+(alab.length-3):""):"";
  return mk("event",ttl,[[e.title,3],[e.title_en,3],[e.lineup,2.5],[e.venue,2],[city,2],[e.mountain,2],[e.genre,2],[glab.join(" "),1.2],[e.organizer,1.5],[pv+" "+provName(pv),1],
    [e.price_label,.8],[compact,1],[kw.join(" "),.7],[String(e.description||"").slice(0,400),.4]],
    {href:"event?e="+encodeURIComponent(e.slug||e.id),evId:String(e.id),icon:CATIC[e.category]||"cal",sub:sub,date:e.event_date,st:st,lu:lu,lun:norm(alab.join(" ")),
     dm:("0"+d.getDate()).slice(-2)+" "+MON[mi],bonus:st.k==="live"?.35:st.n<=7?.2:st.n<=30?.1:0})}

function buildFacets(rows){DOCS.artist=[];DOCS.genre=[];var A={},G={};
  rows.forEach(function(e){if(evStatus(e).k==="past"||e.category==="naikgunung")return;var city=e.city||"";
    F.artists(e).forEach(function(a){var x=A[a.k]||(A[a.k]={label:a.label,n:0,cities:[]});x.n++;if(city&&x.cities.indexOf(city)<0)x.cities.push(city)});
    F.genres(e).forEach(function(g){var x=G[g.k]||(G[g.k]={label:g.label,n:0});x.n++})});
  Object.keys(A).forEach(function(k){var a=A[k],c=a.cities.slice(0,2).join(", ")+(a.cities.length>2?" +"+(a.cities.length-2):"");
    DOCS.artist.push(mk("artist",a.label,[[a.label,3],[k.replace(/ /g,""),1.5],["artis artist penampil musisi lineup performer",.6]],
      {href:"event?artis="+sl(a.label),icon:"mic",n:a.n,place:c}))});
  Object.keys(G).forEach(function(k){var g=G[k];
    DOCS.genre.push(mk("genre",g.label,[[g.label,3],[k.replace(/ /g,""),1.5],["genre aliran musik",.6]],{href:"event?genre="+sl(k),icon:"ticket",n:g.n}))})}

function buildEvents(rows){DOCS.event=[];var cnt={city:{},prov:{},mtn:{}};buildFacets(rows);
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

/* ---------- artikel blog (statis) ---------- */
var BLOGCAT={berita:"Berita",opini:"Opini & Cerita","gaya-hidup":"Gaya Hidup",hiburan:"Hiburan",wisata:"Wisata",teknologi:"Teknologi",tips:"Tips & Panduan","panduan-konser":"Panduan Konser","tips-gunung":"Tips Gunung",review:"Review",komunitas:"Komunitas"};
function buildBlog(rows){DOCS.blog=[];(rows||[]).forEach(function(p){if(!p||!p.t||!p.k)return;var cn=BLOGCAT[p.c]||p.c||"",dt=p.d?new Date(p.d):null,ok=dt&&!isNaN(dt),
  dm=ok?("0"+dt.getDate()).slice(-2)+" "+MON[dt.getMonth()]:"";
  DOCS.blog.push(mk("blog",p.t,[[p.t,3],[cn,1],[p.c,.6],[p.x,.8],["artikel blog tulisan berita article",.5]],{href:"../blog/"+p.k,icon:"doc",sub:cn,dm:dm,date:p.d||""}))})}
function loadBlog(cb){fetch("../blog/index.json").then(function(r){return r.ok?r.json():{posts:[]}}).then(function(j){buildBlog(j&&j.posts)}).catch(function(){}).then(cb)}

function loadData(){if(STATE!=="idle")return;STATE="loading";
  var pending=3,fin=function(){if(--pending===0){STATE="ready"}if(open)run()};
  if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY){EVENTS=window.IB_SAMPLE||[];buildEvents(EVENTS);STATE="ready";loadBlog(function(){if(open)run()});return}
  loadBlog(fin);
  var h={apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+C.SUPABASE_ANON_KEY};
  IB_loadEvents()   /* berbagi unduhan dengan app.js (js/events-src.js) */
   .then(function(rows){EVENTS=dedupe(rows)})
   .catch(function(){EVENTS=window.IB_SAMPLE||[]})
   .then(function(){buildEvents(EVENTS);fin()});
  fetch(C.SUPABASE_URL+"/rest/v1/forum_city_stats?select=city,active,sort&order=sort",{headers:h})
   .then(function(r){if(!r.ok)throw 0;return r.json()})
   .then(function(rows){buildComm(rows.filter(function(c){return c.active}))})
   .catch(function(){}).then(fin)}

/* ---------- postingan komunitas dan akun (dicari saat mengetik) ---------- */
var REM={seq:0,tm:0,busy:false,auth:null,cache:{}};
function localToken(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);
  if(/^sb-.+-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k)||"null");if(v&&v.access_token&&(!v.expires_at||v.expires_at*1000>Date.now()))return v.access_token}}}catch(e){}return null}
function getToken(){return new Promise(function(res){
  try{if(window.sb&&window.sb.auth&&window.sb.auth.getSession){window.sb.auth.getSession().then(function(r){var ss=r&&r.data&&r.data.session;res(ss&&ss.access_token||localToken())}).catch(function(){res(localToken())});return}}catch(e){}
  res(localToken())})}
function buildPosts(rows){DOCS.post=(rows||[]).map(function(p){
  var kind=tr("k_tab_"+p.kind),sub=[kind,p.city,p.author_name?tr("k_by")+" "+p.author_name:""].filter(Boolean).join(" · ");
  return mk("post",p.title,[[p.title,3],[p.author_name,1.5],[p.city,1.5],[kind,1],[String(p.body||"").slice(0,400),.6]],
    {href:"komunitas?kota="+qenc(p.city||"")+"&p="+encodeURIComponent(p.id),icon:"chat",sub:sub,n:+p.reply_count||0,date:p.last_activity})})}
function buildUsers(rows){DOCS.user=(rows||[]).filter(function(u){return u&&u.id&&u.nickname}).map(function(u){
  return mk("user",u.nickname,[[u.nickname,3]],{href:"profil?u="+encodeURIComponent(u.id),icon:"user",init:String(u.nickname).trim().charAt(0).toUpperCase()||"?",verified:!!u.verified})})}
function remote(){
  if(!open||!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY)return;
  var raw=inp.value,p=parse(raw),toks=tokens(p.q),nq=norm(p.q),eff=p.scope||scopeSel||"all";
  if(!toks.length||nq.length<2)return;
  var wantPost=(eff==="all"||eff==="post")&&nq.length>=3,wantUser=eff==="all"||eff==="user";
  if(!wantPost&&!wantUser)return;
  var t=toks.slice().sort(function(a,b){return b.length-a.length})[0],ck=t+"|"+(wantPost?1:0)+(wantUser?1:0),hit=REM.cache[ck];
  if(hit){buildPosts(hit.posts);buildUsers(hit.users);REM.auth=hit.auth;REM.busy=false;if(open&&inp.value===raw)run();return}
  var my=++REM.seq;REM.busy=true;
  getToken().then(function(tk){
    var base=C.SUPABASE_URL.replace(/\/+$/,"")+"/rest/v1/",pat="*"+encodeURIComponent(t)+"*";
    function get(url,auth){var h={apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+(auth||C.SUPABASE_ANON_KEY)};
      return fetch(base+url,{headers:h}).then(function(r){if(!r.ok)throw 0;return r.json()}).catch(function(){return[]})}
    var pp=wantPost?get("forum_posts_public?select=id,city,kind,title,body,author_name,reply_count,last_activity&or=(title.ilike."+pat+",body.ilike."+pat+",author_name.ilike."+pat+")&order=last_activity.desc&limit=12"):Promise.resolve([]);
    var uu=wantUser&&tk?get("profiles?select=id,nickname,verified&nickname=ilike."+pat+"&order=nickname.asc&limit=8",tk):Promise.resolve([]);
    return Promise.all([pp,uu]).then(function(r){
      var auth=!!tk;REM.cache[ck]={posts:r[0],users:r[1],auth:auth};
      if(my!==REM.seq)return;
      REM.busy=false;REM.auth=auth;buildPosts(r[0]);buildUsers(r[1]);if(open&&inp.value===raw)run()})
  }).catch(function(){if(my===REM.seq){REM.busy=false;if(open)run()}})}
function remoteSoon(){clearTimeout(REM.tm);REM.tm=setTimeout(remote,320)}

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
function tokens(q){var out=[],seen={};norm(q).replace(/\bk (pop|rock)\b/g,"k$1").split(" ").forEach(function(w){if(!w)return;
  (ALIAS[w]?ALIAS[w].split(" "):[w]).forEach(function(x){if(!seen[x]){seen[x]=1;out.push(x)}})});
  var keep=out.filter(function(x){return!STOP[x]});return(keep.length?keep:out).slice(0,6)}
function parse(raw){var q=raw.trim(),m=/^([a-z]+):\s*(.*)$/i.exec(q);
  if(m&&PFX[m[1].toLowerCase()])return{scope:PFX[m[1].toLowerCase()],q:m[2]};return{scope:"",q:q}}
function search(raw,scopeSel){var p=parse(raw),toks=tokens(p.q),eff=p.scope||scopeSel||"all";
  var res={},tot={all:0},partial=false;TYPES.forEach(function(t){res[t]=[]});
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
  DOCS.place.concat(DOCS.mtn,DOCS.artist,DOCS.genre).forEach(function(d){if(d.kind==="comm")return;var t=d.tn,x=lev(n,t,max);
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
var SCOPES=[["all","sx_scope_all"],["event","sx_t_event"],["artist","sx_t_artist"],["genre","sx_t_genre"],["place","sx_t_place"],["mtn","sx_t_mtn"],["blog","sx_t_blog"],["post","sx_t_post"],["user","sx_t_user"],["page","sx_t_page"],["faq","sx_t_faq"]];

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
  var vo=vv?vv.offsetTop/Z:0;top=Math.min(top,Math.max(8,vh+vo-220));
  panel.style.top=top+"px";panel.style.maxHeight=Math.max(220,vh+vo-top-12)+"px";
  if(ar&&vw>640){var w=Math.min(Math.max(ar.width,360),vw-16),l=Math.min(Math.max(8,ar.left),vw-w-8);
    panel.style.left=l+"px";panel.style.width=w+"px";panel.style.transform="none"}
  else{panel.style.left=panel.style.width=panel.style.transform=""}}
var fitRaf=0;function fitSoon(){if(!open||settling||fitRaf)return;fitRaf=requestAnimationFrame(function(){fitRaf=0;if(open)fit()})}
/* Buka/tutup dengan transisi. Kelas "in" memicu animasi; elemen baru di-hidden setelah animasi keluar selesai. */
var reduceM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches,hideT=0,settling=false,narrowQ=window.matchMedia?matchMedia("(max-width:900px)"):{matches:false};
function showIn(){requestAnimationFrame(function(){requestAnimationFrame(function(){if(!open)return;scrim.classList.add("in");if(!settling)panel.classList.add("in")})})}
function setOpen(v){if(open===v)return;open=v;clearTimeout(hideT);inp.setAttribute("aria-expanded",v?"true":"false");
  if(v){panel.hidden=scrim.hidden=false;fit();loadData();run();remoteSoon();showIn();fitSoon();setTimeout(fitSoon,120);setTimeout(fitSoon,350)}
  else{active=-1;inp.removeAttribute("aria-activedescendant");settling=false;panel.classList.remove("in");scrim.classList.remove("in");
    hideT=setTimeout(function(){if(!open)panel.hidden=scrim.hidden=true},reduceM?0:200)}}
/* Di layar sempit: gulir halus supaya kotak cari berada tepat di bawah header (ruang daftar maksimal di atas papan ketik),
   lalu panel muncul setelah gulir berhenti. Panel tidak mengejar posisi selama gulir, jadi tidak lompat-lompat. */
function alignDelta(){var box=inp.closest("[data-sxanchor]");if(!box||!narrowQ.matches)return 0;
  var Z=window.GWM_Z||1,r=box.getBoundingClientRect();if(!r.height)return 0;
  var d=r.top-(topEdge()+12*Z),de=document.documentElement,maxDown=Math.max(0,de.scrollHeight-window.innerHeight-window.pageYOffset);
  d=d>0?Math.min(d,maxDown):Math.max(d,-window.pageYOffset);return Math.abs(d)<6?0:d}
function alignOpen(){var d=alignDelta();
  if(!d){setOpen(true);return}
  settling=true;setOpen(true);
  try{window.scrollBy({top:d,left:0,behavior:reduceM?"auto":"smooth"})}catch(e){window.scrollBy(0,d)}
  var last=-1,still=0,t0=performance.now();
  (function wait(){if(!open||!settling)return;
    var y=window.pageYOffset;still=y===last?still+1:0;last=y;
    if(still>=4||performance.now()-t0>900){settling=false;fit();panel.classList.add("in");return}
    requestAnimationFrame(wait)})()}

function itemHtml(r,toks,i){var d=r.d,meta="";
  if(d.type==="event")meta='<span class="sxm'+(d.st.k==="live"?" on":"")+'">'+esc(d.dm)+'<small>'+esc(d.st.k==="live"?d.st.l:d.st.k==="soon"?d.st.l:"")+'</small></span>';
  else if(d.type==="place"&&(d.kind==="city"||d.kind==="prov")&&EVENTS)meta='<span class="sxm">'+esc(d.n?tr("sx_events_n",{n:d.n}):"")+'</span>';
  else if(d.type==="blog")meta='<span class="sxm">'+esc(d.dm||"")+'</span>';
  else if(d.type==="post")meta='<span class="sxm">'+esc(d.n?tr("sx_replies_n",{n:d.n}):"")+'</span>';
  else if(d.type==="artist"||d.type==="genre")meta='<span class="sxm">'+esc(tr("sx_events_n",{n:d.n}))+'</span>';
  else if(d.type==="mtn")meta='<span class="sxm">'+esc(d.n?tr("sx_trips",{n:d.n}):d.mdpl?d.mdpl.toLocaleString(tr("numloc"))+" "+tr("mdpl"):"")+'</span>';
  var sub=d.sub;
  if(d.type==="place"){sub=d.kind==="prov"?tr("sx_prov"):d.kind==="city"?tr("sx_city")+" · "+provName(d.prov):tr("sx_community_sub",{c:d.city})}
  if(d.type==="artist")sub=tr("sx_artist")+(d.place?" · "+d.place:"");
  if(d.type==="genre")sub=tr("sx_genre");
  if(d.type==="user")sub=tr("sx_user");
  var lm=d.type==="event"&&d.lu&&toks.some(function(t){return t.length>1&&(" "+d.lun).indexOf(" "+t)>-1});
  if(lm)sub=tr("sx_lineup")+": "+d.lu;
  if(d.type==="mtn")sub=provName(d.prov)+(d.mdpl&&d.n?" · "+d.mdpl.toLocaleString(tr("numloc"))+" "+tr("mdpl"):"");
  return'<a class="sxr" role="option" id="sxo'+i+'" aria-selected="false" href="'+esc(d.href)+'" data-i="'+i+'"'+(d.evId?' data-ev="'+esc(d.evId)+'"':"")+'>'
    +(d.type==="user"?'<span class="sxi av" aria-hidden="true">'+esc(d.init)+'</span>':'<span class="sxi">'+ic("search")+'</span>')+'<span class="sxt"><b>'+hl(d.title,toks)+(d.verified?' <i class="sxv" aria-label="Verified">✓</i>':"")+'</b><small>'+(d.type==="faq"||d.type==="post"||lm?hl(sub,toks):esc(sub))+'</small></span>'+meta+'<span class="sxfill" data-q="'+esc(d.title)+'" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M17 17 7 7M7 15V7h8"/></svg></span></a>'}
function actHtml(icon,label,href,i,extra){return'<a class="sxr act" role="option" id="sxo'+i+'" aria-selected="false" href="'+esc(href)+'" data-i="'+i+'"'+(extra||"")+'><span class="sxi">'+ic(icon)+'</span><span class="sxt"><b>'+esc(label)+'</b></span></a>'}

/* Lanjut ke subdomain: pencarian lengkap (search.gowithdme.com) dan asisten AI (ai.gowithdme.com). Tautan biasa, tanpa permintaan jaringan tambahan. */
function xtra(q,i){q=String(q||"").trim().slice(0,200);var t=q.length>18?q.slice(0,18)+"…":q,e=' target="_blank" rel="noopener"';
  return actHtml("search",tr("sx_full",{q:t}),"https://search.gowithdme.com/?q="+qenc(q),i,e)+actHtml("spark",tr("sx_ai",{q:t}),"https://ai.gowithdme.com/?q="+qenc(q),i+1,e)}
function trendDocs(){return DOCS.event.filter(function(d){return d.st.k!=="past"}).sort(function(a,b){return(a.st.k==="live"?0:1)-(b.st.k==="live"?0:1)||(a.date<b.date?-1:a.date>b.date?1:0)}).slice(0,5)}
function renderEmpty(){
  var rec=read("gwm_recent_q",[]),h="",tr5=trendDocs(),base=rec.length;
  if(rec.length){h+='<div class="sxg"><span>'+esc(tr("sx_recent"))+'</span><button type="button" data-clr="1">'+esc(tr("sx_clear"))+'</button></div>'+
    rec.map(function(q,i){return'<a class="sxr" role="option" id="sxo'+i+'" aria-selected="false" href="#" data-q="'+esc(q)+'" data-i="'+i+'"><span class="sxi">'+ic("clock")+'</span><span class="sxt"><b>'+esc(q)+'</b></span></a>'}).join("")}
  if(tr5.length){h+='<div class="sxg"><span>'+esc(tr("nv_trend_h"))+'</span></div>'+tr5.map(function(d,n){var i=base+n;
    return'<a class="sxr" role="option" id="sxo'+i+'" aria-selected="false" href="'+esc(d.href)+'" data-i="'+i+'" data-ev="'+esc(d.evId)+'"><span class="sxi rk'+(n<3?' top':'')+'">'+(n+1)+'</span><span class="sxt"><b>'+esc(d.title)+'</b><small>'+esc(d.sub)+'</small></span><span class="sxm'+(d.st.k==="live"?" on":"")+'">'+esc(d.dm)+'<small>'+esc(d.st.k==="live"?d.st.l:d.st.k==="soon"?d.st.l:"")+'</small></span></a>'}).join("")}
  elList.innerHTML=h;elChips.hidden=true;elLive.textContent="";items=[].slice.call(elList.querySelectorAll("a.sxr"));setActive(-1)}

function run(){var raw=inp.value;lastQ=raw;panel.classList.toggle("sxq",!!raw.trim());
  if(!raw.trim()){scopeSel="all";renderEmpty();return}
  var r=search(raw,scopeSel);
  if(r.empty){renderEmpty();return}
  var eff=r.eff,h="",i=0,order;
  /* chip lingkup: hanya yang punya hasil */
  elChips.hidden=false;
  elChips.innerHTML=SCOPES.filter(function(s){return s[0]==="all"||r.tot[s[0]]}).map(function(s){
    return'<button type="button" data-s="'+s[0]+'" aria-pressed="'+(eff===s[0])+'">'+esc(tr(s[1]))+'<small>'+(s[0]==="all"?r.tot.all:r.tot[s[0]])+'</small></button>'}).join("");
  if(!r.tot.all){
    if(REM.busy){elList.innerHTML='<div class="sxn">'+esc(tr("sx_searching"))+'</div>';items=[];setActive(-1);return}
    var dm=didYouMean(r.q);
    h='<div class="sxe"><b>'+esc(tr("sx_none",{q:r.q}))+'</b><p>'+esc(tr("sx_none_tip"))+'</p>'+(dm?'<p><button type="button" class="sxdm" data-q="'+esc(dm.title)+'">'+esc(tr("sx_dym"))+' <u>'+esc(dm.title)+'</u>?</button></p>':"")+'</div>';
    h+=xtra(r.q,0)+actHtml("help",tr("sx_ask"),"bantuan#kontak",2)+actHtml("plus",tr("sx_submit"),"ajukan",3);
    if(eff==="user"&&REM.auth===false)h+=actHtml("user",tr("sx_login_users"),"login",4);
    elList.innerHTML=h;items=[].slice.call(elList.querySelectorAll("a.sxr"));setActive(-1);elLive.textContent=tr("sx_none",{q:r.q});return}
  order=eff==="all"?TYPES.filter(function(t){return r.tot[t]}).sort(function(a,b){return r.res[b][0].s-r.res[a][0].s}):[eff];
  if(r.partial)h+='<div class="sxn">'+esc(tr("sx_partial"))+'</div>';
  order.forEach(function(t){var list=r.res[t];if(!list.length)return;
    var cap=eff==="all"?Math.min(t==="event"?CAP:CAP_OTHER,MAXROWS-i):30;if(cap<=0)return;var shown=list.slice(0,cap);
    h+='<div class="sxg" role="presentation"><span>'+esc(tr("sx_t_"+t))+'</span>'+(eff==="all"&&list.length>shown.length?'<button type="button" data-s="'+t+'">'+esc(tr("sx_more",{n:list.length-shown.length}))+'</button>':"")+'</div>';
    shown.forEach(function(x){h+=itemHtml(x,r.toks,i++)})});
  if(r.tot.event&&!r.partial&&(eff==="all"||eff==="event"))h+=actHtml("search",tr("sx_all_events",{q:r.q}),"event?q="+qenc(r.q),i++);
  h+=xtra(r.q,i);i+=2;
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
function onInput(){clearTimeout(tm);syncVals();tm=setTimeout(function(){if(!open)setOpen(true);else run();remoteSoon()},50)}
function onFocus(){if(open||settling)return;alignOpen()}
function submit(){var q=inp.value.trim();if(!q){kf(inp);return}
  if(open&&active>-1&&items[active]){items[active].click();return}
  var p=parse(q),t=(p.q||q).trim();remember();
  if(p.scope==="user"){kf(inp);return}
  location.href=p.scope==="blog"?"../blog/"+(norm(t)?"?q="+qenc(t):""):p.scope==="post"?"komunitas":p.scope==="artist"&&norm(t)?"event?artis="+sl(t):p.scope==="genre"&&norm(t)?"event?genre="+sl(t):(p.scope==="mtn"?"gunung":"event")+"?q="+qenc(t)}
function onKey(e){var k=e.key;
  if(k==="ArrowDown"){e.preventDefault();if(!open)setOpen(true);else setActive(active<items.length-1?active+1:0)}
  else if(k==="ArrowUp"){e.preventDefault();if(open)setActive(active>0?active-1:items.length-1)}
  else if(k==="Enter"){e.preventDefault();submit()}
  else if(k==="Escape"){if(open){e.preventDefault();setOpen(false)}else if(inp.value){inp.value="";syncVals()}}
}
/* Fokus tanpa gulir otomatis: memfokuskan input di header lengket membuat browser melompat ke atas halaman. */
function kf(el){try{el.focus({preventScroll:true})}catch(e){el.focus()}}
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
  if((e.key==="/"&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k")){e.preventDefault();var f=hero&&visible(hero)?hero:inp0;kf(f);f.select()}});
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
  var s=e.target.closest("[data-s]");if(s){e.preventDefault();scopeSel=s.dataset.s;run();kf(inp);return}
  var q=e.target.closest("[data-q]");if(q){e.preventDefault();inp.value=q.dataset.q;scopeSel="all";run();kf(inp);return}
  var a=e.target.closest("a.sxr");if(!a)return;
  remember();
  if(a.dataset.ev&&window.IB_OpenEv){var ok=window.IB_OpenEv(a.dataset.ev);if(ok!==false){e.preventDefault();setOpen(false);return}}
  var h=a.getAttribute("href")||"";if(h.indexOf("#")>-1&&h.split("#")[0]===(location.pathname.split("/").pop()||"")){setOpen(false)}});

buildStatic();
})();
