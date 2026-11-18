/* Admin > Arsip: impor cadangan Blogger (.xml/.atom atau .zip Takeout) ke Supabase, langsung dari browser.
   Berkas dibaca bertahap (4 MB), dipecah per <entry>, dibersihkan, lalu di-upsert per paket kecil.
   Aman diulang: kunci (koleksi, src_id) mencegah duplikat, jadi impor yang terputus bisa dilanjutkan dengan berkas yang sama. */
(function(){
if(!window.sb||!window.ArsipSan)return;
var $=function(i){return document.getElementById(i)},S=ArsipSan,CHUNK=4*1048576,BATCH_BYTES=1200000,BATCH_ROWS=25,DEF="ISIBLOGPINDAHANDATIBLOGSPOT";
var running=false,cancel=false,loaded=false;
var NS='xmlns="http://www.w3.org/2005/Atom" xmlns:blogger="http://schemas.google.com/blogger/2018" xmlns:thr="http://purl.org/syndication/thread/1.0" xmlns:gd="http://schemas.google.com/g/2005" xmlns:georss="http://www.georss.org/georss" xmlns:app="http://www.w3.org/2007/app" xmlns:openSearch="http://a9.com/-/spec/opensearchrss/1.0/" xmlns:media="http://search.yahoo.com/mrss/"';
function msg(t,k){var m=$("msg");if(!m)return;m.textContent=t||"";m.className="msg"+(k?" "+k:"");m.hidden=!t}
function hint(e){var m=(e&&e.message)||String(e);return/does not exist|schema cache|arsip_/i.test(m)?"Tabel arsip belum ada. Jalankan sekali di terminal: bash tools/arsip_setup.sh  ("+m+")":m}
function fmt(n){return n>=1048576?(n/1048576).toFixed(1)+" MB":Math.round(n/1024)+" KB"}
function kol(v){return(v||"").toUpperCase().replace(/[^A-Z0-9_-]+/g,"").slice(0,80)||DEF}
function slugify(t){return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100).replace(/-+$/,"")}
function h6(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36).slice(0,6)}
function tx(el,tag){var n=el.getElementsByTagName(tag)[0];return n?n.textContent:""}
function iso(s){var d=new Date(s);return isNaN(d)?null:d.toISOString()}
/* ---- tampilan progres ---- */
var st;function reset(){st={post:0,hal:0,kom:0,lewat:0,gagal:0,bytes:0,total:1,files:0};draw()}
function draw(){
  var p=Math.min(100,Math.round(st.bytes/st.total*100));
  $("arBar").style.width=p+"%";$("arPct").textContent=p+"%";
  $("arStat").innerHTML="<b>"+st.post+"</b> tulisan · <b>"+st.hal+"</b> halaman · <b>"+st.kom+"</b> komentar · "+st.lewat+" dilewati"+(st.gagal?' · <span style="color:var(--err)">'+st.gagal+" gagal</span>":"")}
function log(t,err){var l=$("arLog");var d=document.createElement("div");d.textContent=t;if(err)d.style.color="var(--err)";l.appendChild(d);l.scrollTop=l.scrollHeight}
/* ---- penerima entri ---- */
function Sink(opt){
  var rows=[],bytes=0,koms=[],slugs={},self=this,posts={};
  async function send(table,data,conflict){
    for(var a=0;a<4;a++){
      var r=await sb.from(table).upsert(data,{onConflict:conflict});
      if(!r.error)return null;
      if(a<3)await new Promise(function(ok){setTimeout(ok,800*(a+1))});else return r.error}}
  async function flushPosts(){
    if(!rows.length)return;var b=rows;rows=[];bytes=0;
    var seen={};b=b.filter(function(x){if(seen[x.src_id])return false;seen[x.src_id]=1;return true});
    var e=await send("arsip_blog",b,"koleksi,src_id");
    if(!e){b.forEach(function(x){x.jenis==="page"?st.hal++:st.post++});return}
    if(/does not exist|schema cache/i.test(e.message))throw e;
    for(var i=0;i<b.length;i++){var e2=await send("arsip_blog",[b[i]],"koleksi,src_id");
      if(e2){st.gagal++;log("Gagal: "+(b[i].title||b[i].src_id).slice(0,60)+" — "+e2.message,true)}else{b[i].jenis==="page"?st.hal++:st.post++}}}
  async function flushKoms(){
    if(!koms.length)return;var b=koms;koms=[];
    var seen={};b=b.filter(function(x){if(seen[x.src_id])return false;seen[x.src_id]=1;return true});
    var e=await send("arsip_komentar",b,"koleksi,src_id");
    if(e){st.gagal+=b.length;log("Komentar gagal: "+e.message,true)}else st.kom+=b.length}
  this.add=async function(xml){
    var doc;try{doc=new DOMParser().parseFromString("<feed "+NS+">"+xml+"</feed>","application/xml")}catch(e){st.lewat++;return}
    if(doc.getElementsByTagName("parsererror").length){st.lewat++;return}
    var en=doc.getElementsByTagName("entry")[0];if(!en){st.lewat++;return}
    var type=(tx(en,"blogger:type")||"").toUpperCase(),status=(tx(en,"blogger:status")||"LIVE").toUpperCase();
    if(!type){var cs=en.getElementsByTagName("category");for(var i=0;i<cs.length;i++){var t=cs[i].getAttribute("term")||"";var m=t.match(/kind#(\w+)$/);if(m){type=m[1].toUpperCase();break}}}
    if(type!=="POST"&&type!=="PAGE"&&type!=="COMMENT"){st.lewat++;return}
    if(status==="SOFT_TRASHED"||status==="DELETED"){st.lewat++;return}
    var id=tx(en,"id").trim();if(!id){st.lewat++;return}
    var raw=tx(en,"content");
    if(type==="COMMENT"){
      if(!opt.komentar){st.lewat++;return}
      var rep=en.getElementsByTagName("thr:in-reply-to")[0],ref=rep?rep.getAttribute("ref"):"";if(!ref){st.lewat++;return}
      var an=en.getElementsByTagName("author")[0];
      koms.push({koleksi:opt.koleksi,src_id:id,post_src_id:ref,penulis:(an?tx(an,"name"):"").slice(0,120)||null,body:S.plain(raw).slice(0,5000),published_at:iso(tx(en,"published"))});
      if(koms.length>=200)await flushKoms();return}
    if(type==="PAGE"&&!opt.halaman){st.lewat++;return}
    var title=tx(en,"title").trim().slice(0,300),body=S.clean(raw),text=S.plain(body);
    var fn=tx(en,"blogger:filename").trim(),slug=fn?fn.replace(/^\/+/,"").replace(/\.html?$/i,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,150):"";
    if(!slug)slug=(slugify(title)||"tanpa-judul")+"-"+h6(id);
    if(slugs[slug]&&slugs[slug]!==id)slug=slug.slice(0,140)+"-"+h6(id);
    slugs[slug]=id;
    var labels=[],cs2=en.getElementsByTagName("category");
    for(var j=0;j<cs2.length;j++){if(/blogger\.com\/atom\/ns#/.test(cs2[j].getAttribute("scheme")||""))labels.push((cs2[j].getAttribute("term")||"").slice(0,60))}
    var an2=en.getElementsByTagName("author")[0];
    var pub=status==="LIVE"&&opt.terbit;
    var row={koleksi:opt.koleksi,src_id:id,slug:slug,jenis:type==="PAGE"?"page":"post",title:title||"(Tanpa judul)",body:body,ringkasan:text.replace(/\s+/g," ").slice(0,220),labels:labels.filter(Boolean),penulis:(an2?tx(an2,"name"):"").slice(0,120)||null,path_asal:fn||null,status:pub?"published":"draft",published_at:iso(tx(en,"published")),updated_src:iso(tx(en,"updated"))};
    rows.push(row);bytes+=body.length+400;
    if(rows.length>=BATCH_ROWS||bytes>=BATCH_BYTES)await flushPosts()};
  this.end=async function(){await flushPosts();await flushKoms()}}
/* ---- pemecah <entry> bertahap ---- */
function Splitter(onEntry){
  var buf="",dec=new TextDecoder("utf-8");
  this.push=async function(u8,last){
    buf+=dec.decode(u8,{stream:!last});
    for(;;){
      var a=buf.indexOf("<entry");if(a<0){buf=buf.slice(Math.max(0,buf.length-8));break}
      var b=buf.indexOf("</entry>",a);if(b<0){buf=buf.slice(a);if(buf.length>60e6)throw new Error("Satu entri lebih dari 60 MB, berkas tidak wajar.");break}
      b+=8;var e=buf.slice(a,b);buf=buf.slice(b);await onEntry(e);if(cancel)return}}}
async function readChunks(file,fn){
  for(var o=0;o<file.size&&!cancel;o+=CHUNK){
    var u8=new Uint8Array(await file.slice(o,o+CHUNK).arrayBuffer());
    await fn(u8,o+CHUNK>=file.size);st.bytes=Math.min(file.size,o+CHUNK);draw()}}
function loadFflate(){
  if(window.fflate)return Promise.resolve();
  return new Promise(function(ok,no){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js";s.onload=ok;s.onerror=function(){no(new Error("Pustaka unzip gagal dimuat. Atau ekstrak ZIP dulu lalu unggah berkas .atom/.xml di dalamnya."))};document.head.appendChild(s)})}
async function importZip(file,sink){
  await loadFflate();
  var queue=[],cur=null,unz=new fflate.Unzip();unz.register(fflate.UnzipInflate);
  unz.onfile=function(f){
    if(!/\.(atom|xml)$/i.test(f.name)||/(^|\/)(\.|__MACOSX)/.test(f.name)){return}
    st.files++;log("Membaca "+f.name);
    var sp=new Splitter(function(x){return sink.add(x)}),ended=false;
    f.ondata=function(err,chunk,final){if(err){log("Gagal buka "+f.name+": "+err,true);return}queue.push({sp:sp,chunk:chunk,final:final})};
    f.start()};
  async function drain(){while(queue.length&&!cancel){var q=queue.shift();await q.sp.push(q.chunk,q.final)}}
  await readChunks(file,async function(u8,last){unz.push(u8,last);await drain()});
  await drain()}
async function run(){
  var f=$("arFile").files[0];if(!f)return msg("Pilih berkas cadangan Blogger dulu.","err");
  var isZip=/\.zip$/i.test(f.name);if(!isZip&&!/\.(xml|atom)$/i.test(f.name))return msg("Berkas harus .xml, .atom, atau .zip.","err");
  var opt={koleksi:kol($("arKoleksi").value),terbit:$("arLive").checked,halaman:$("arHal").checked,komentar:$("arKom").checked};
  $("arKoleksi").value=opt.koleksi;msg("");$("arLog").innerHTML="";reset();st.total=f.size;
  running=true;cancel=false;$("arGo").hidden=true;$("arStop").hidden=false;$("arFile").disabled=true;$("arProg").hidden=false;
  var sink=new Sink(opt),t0=Date.now();
  try{
    log("Mulai: "+f.name+" ("+fmt(f.size)+") → koleksi "+opt.koleksi);
    if(isZip)await importZip(f,sink);
    else{var sp=new Splitter(function(x){return sink.add(x)});await readChunks(f,function(u8,last){return sp.push(u8,last)})}
    await sink.end();
    if(!cancel){st.bytes=st.total;draw()}
    if(!cancel){var r=await sb.from("arsip_impor").insert({koleksi:opt.koleksi,nama_berkas:f.name,ukuran:f.size,jml_post:st.post,jml_halaman:st.hal,jml_komentar:st.kom,jml_lewat:st.lewat});if(r.error)log("Riwayat tidak tersimpan: "+r.error.message,true)}
    var dt=Math.round((Date.now()-t0)/1000);
    if(cancel){msg("Dihentikan. Yang sudah masuk tetap tersimpan; unggah berkas yang sama untuk melanjutkan (tanpa duplikat).","err")}
    else if(!st.post&&!st.hal)msg("Tidak ada tulisan yang ditemukan. Pastikan ini berkas cadangan Blogger (Setelan > Kelola blog > Cadangkan konten).","err");
    else msg("Selesai dalam "+dt+" detik: "+st.post+" tulisan, "+st.hal+" halaman, "+st.kom+" komentar masuk ke koleksi "+opt.koleksi+".","ok")
  }catch(e){msg(hint(e),"err");log(hint(e),true)}
  running=false;$("arGo").hidden=false;$("arStop").hidden=true;$("arFile").disabled=false;loadList()}
/* ---- daftar koleksi ---- */
async function loadList(){
  var box=$("arList");
  var r=await sb.from("arsip_impor").select("koleksi,nama_berkas,ukuran,created_at").order("created_at",{ascending:false}).limit(200);
  if(r.error){box.innerHTML='<div class="empty">'+S.esc(hint(r.error))+"</div>";return}
  loaded=true;var by={};(r.data||[]).forEach(function(x){(by[x.koleksi]=by[x.koleksi]||[]).push(x)});
  var ks=Object.keys(by);
  if(!ks.length){box.innerHTML='<div class="empty">Belum ada arsip. Unggah berkas cadangan Blogger di atas.</div>';return}
  var cnt=await Promise.all(ks.map(function(k){return Promise.all([sb.from("arsip_blog").select("id",{count:"exact",head:true}).eq("koleksi",k),sb.from("arsip_blog").select("id",{count:"exact",head:true}).eq("koleksi",k).eq("status","draft")]).then(function(a){return[a[0].count||0,a[1].count||0]})}));
  box.innerHTML=ks.map(function(k,i){var f=by[k][0];
    return'<div class="it"><div class="ib"><b>'+S.esc(k)+'</b><div class="meta">'+cnt[i][0]+" entri"+(cnt[i][1]?" ("+cnt[i][1]+" draft)":"")+" · terakhir: "+S.esc(f.nama_berkas||"")+" ("+fmt(f.ukuran||0)+")</div>"+
    '<div class="bar"><a class="btn ghost" href="arsip?k='+encodeURIComponent(k)+'" target="_blank" rel="noopener">Lihat</a><button class="btn ghost" data-ar="pub" data-k="'+S.esc(k)+'" type="button">Terbitkan semua</button><button class="btn ghost" data-ar="del" data-k="'+S.esc(k)+'" type="button">Hapus koleksi</button></div></div></div>'}).join("")}
document.addEventListener("click",async function(ev){
  var b=ev.target.closest("button");if(!b)return;
  if(b.dataset.v==="arsip"&&!loaded)loadList();
  if(b.dataset.ar==="del"){var k=b.dataset.k;if(!confirm('Hapus SEMUA arsip di koleksi "'+k+'" (tulisan + komentar)? Tidak bisa dibatalkan.'))return;
    var r=await sb.rpc("arsip_hapus_koleksi",{k:k});if(r.error)return msg(hint(r.error),"err");msg("Koleksi "+k+" dihapus.","ok");loadList()}
  if(b.dataset.ar==="pub"){var k2=b.dataset.k;if(!confirm('Terbitkan semua draft di koleksi "'+k2+'"?'))return;
    var r2=await sb.from("arsip_blog").update({status:"published"}).eq("koleksi",k2).eq("status","draft");if(r2.error)return msg(hint(r2.error),"err");msg("Semua draft diterbitkan.","ok");loadList()}});
$("arGo").onclick=run;
$("arStop").onclick=function(){cancel=true;$("arStop").disabled=true;setTimeout(function(){$("arStop").disabled=false},1500)};
$("arFile").addEventListener("change",function(){var f=this.files[0];$("arFileInfo").textContent=f?f.name+" · "+fmt(f.size):"";if(f&&$("arKoleksi").value==="")$("arKoleksi").value=DEF});
$("arKoleksi").value=DEF;
window.addEventListener("beforeunload",function(e){if(running){e.preventDefault();e.returnValue=""}});
})();
