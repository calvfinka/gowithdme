/* Blog di /admin: tulisan teks (tanpa foto), maks 15000 karakter, mode Teks atau HTML. Tabel blog_posts (supabase/schema_blog.sql).
   Aturan mode Teks dan penyaring HTML HARUS sama dengan tools/blog.py. */
(function(){
if(!window.sb)return;
var $=function(i){return document.getElementById(i)},MAX=1e9;
var CATS=[["berita","Berita"],["opini","Opini & Cerita"],["gaya-hidup","Gaya Hidup"],["hiburan","Hiburan"],["wisata","Wisata"],["teknologi","Teknologi"],["tips","Tips & Panduan"],["panduan-konser","Panduan Konser"],["tips-gunung","Tips Gunung"],["review","Review"],["komunitas","Komunitas"]];
var CN={};CATS.forEach(function(c){CN[c[0]]=c[1]});
var MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
var checks={},chunks=[],priorPct=0,priorLen=0,curRes=null,tm=null,posts=[],editing=null,mode="text",slugDirty=false,loaded=false,cur=null,tags=[],tagsTouched=false,tagCol=true;
function msg(t,k){var m=$("msg");if(!m)return;m.textContent=t||"";m.className="msg"+(k?" "+k:"");m.hidden=!t}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[c]})}
function fd(s){if(!s)return"";var d=new Date(s);return isNaN(d)?"":d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()}
function slugify(t){return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60).replace(/-+$/,"")}
/* ---- mode Teks ---- */
function inl(t){return t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" rel="noopener nofollow">$1</a>')}
function t2h(b){var out=[],para=[],lst=[];
  function fp(){if(para.length){out.push("<p>"+para.map(function(x){return inl(esc(x))}).join("<br>")+"</p>");para=[]}}
  function fl(){if(lst.length){out.push("<ul>"+lst.map(function(x){return"<li>"+inl(esc(x))+"</li>"}).join("")+"</ul>");lst=[]}}
  b.replace(/\r\n?/g,"\n").split("\n").forEach(function(line){
    if(!line.trim()){fp();fl()}
    else if(line.indexOf("## ")===0){fp();fl();out.push("<h2>"+inl(esc(line.slice(3).trim()))+"</h2>")}
    else if(line.indexOf("### ")===0){fp();fl();out.push("<h3>"+inl(esc(line.slice(4).trim()))+"</h3>")}
    else if(line.indexOf("- ")===0){fp();lst.push(line.slice(2).trim())}
    else{fl();para.push(line.trim())}});
  fp();fl();return out.join("")}
/* ---- mode HTML: hanya tag aman ---- */
var OK={P:1,BR:1,H2:1,H3:1,H4:1,UL:1,OL:1,LI:1,STRONG:1,B:1,EM:1,I:1,U:1,A:1,BLOCKQUOTE:1,CODE:1,PRE:1,HR:1,TABLE:1,THEAD:1,TBODY:1,TR:1,TH:1,TD:1},
    DROP={SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,TEMPLATE:1,NOSCRIPT:1,SVG:1,MATH:1,FORM:1,TEXTAREA:1,SELECT:1,BUTTON:1,HEAD:1,TITLE:1};
function safeHref(v){v=String(v||"").replace(/[\x00-\x20]+/g,"");return/^(https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(v)?v:""}
function walk(n){if(n.nodeType===3)return esc(n.nodeValue);if(n.nodeType!==1)return"";var t=n.tagName;if(DROP[t])return"";
  var inner=[].map.call(n.childNodes,walk).join("");if(!OK[t])return inner;t=t.toLowerCase();
  if(t==="br"||t==="hr")return"<"+t+">";
  if(t==="a"){var h=safeHref(n.getAttribute("href"));return h?'<a href="'+esc(h)+'" rel="noopener nofollow">'+inner+"</a>":"<a>"+inner+"</a>"}
  return"<"+t+">"+inner+"</"+t+">"}
function sanitize(h){return walk(new DOMParser().parseFromString("<body>"+h+"</body>","text/html").body)}
function render(body,isHtml){return isHtml?sanitize(body):t2h(body)}
/* ---- tag: maks. 8 per tulisan; saran otomatis dari kamus kata kunci + tag yang sudah dipakai tulisan lain + baris "Kata kunci:" ---- */
var MAXT=8;
var VOC=[["gunung",/\bgunung\b/g],["pendakian",/\b(?:pendakian|mendaki|naik gunung|hiking|trekking)\b/g],["tips pemula",/\bpemula\b/g],
 ["packing",/\b(?:packing|perlengkapan|carrier|ransel)\b/g],["keselamatan",/\b(?:keselamatan|safety|p3k|hipotermia|tersesat|evakuasi)\b/g],
 ["camping",/\b(?:camping|berkemah|tenda)\b/g],["jalur pendakian",/\b(?:basecamp|jalur|via|pos pendakian)\b/g],["open trip",/\bopen trip\b/g],
 ["konser",/\bkonser\b/g],["festival",/\bfestival\b/g],["musik",/\b(?:musik|lagu|album|band|penyanyi)\b/g],["k-pop",/\b(?:k-?pop|korea|idol)\b/g],
 ["tiket",/\b(?:tiket|presale|war tiket)\b/g],["nonton sendirian",/\b(?:sendirian|solo traveler|solo)\b/g],["budget",/\b(?:budget|hemat|murah|biaya|anggaran)\b/g],
 ["wisata",/\b(?:wisata|destinasi|liburan|jalan-jalan)\b/g],["transportasi",/\b(?:kereta|bus|travel|angkutan|transportasi|bandara)\b/g],
 ["cuaca",/\b(?:cuaca|hujan|angin|suhu|dingin)\b/g],["kuliner",/\b(?:kuliner|makanan|makan|restoran)\b/g],["fotografi",/\b(?:foto|fotografi|kamera)\b/g],
 ["teknologi",/\b(?:teknologi|aplikasi|gawai|smartphone|internet|digital)\b/g],["ai",/\b(?:ai|kecerdasan buatan|chatgpt|nvidia)\b/g],
 ["saham",/\b(?:saham|investasi|pemegang saham|bursa)\b/g],["keamanan siber",/\b(?:siber|peretasan|keamanan data|malware)\b/g],
 ["komunitas",/\bkomunitas\b/g],["cari teman",/\b(?:cari teman|ajakan|bareng|teman perjalanan)\b/g],["review",/\b(?:review|ulasan|pengalaman)\b/g],
 ["gaya hidup",/\b(?:gaya hidup|kebiasaan|rutinitas)\b/g],["kesehatan",/\b(?:kesehatan|sehat|olahraga|stamina)\b/g],["keuangan",/\b(?:uang|dompet|tabungan|keuangan)\b/g],
 ["profil band",/\b(?:biodata|profil|personel|anggota band)\b/g],["punk",/\bpunk\b/g],["bandung",/\bbandung\b/g],["jakarta",/\bjakarta\b/g],["bali",/\bbali\b/g],["bogor",/\bbogor\b/g],["yogyakarta",/\b(?:yogyakarta|jogja)\b/g]];
function cleanTag(t){return String(t||"").replace(/[,\u060c;#]/g," ").replace(/\s+/g," ").trim().slice(0,30)}
function hasTag(t){var k=t.toLowerCase();return tags.some(function(x){return x.toLowerCase()===k})}
function addTag(t){t=cleanTag(t);if(t.length<2||hasTag(t)||tags.length>=MAXT)return false;tags.push(t);return true}
function drawTags(){
  $("bgTagChips").innerHTML=tags.map(function(t,i){return'<button type="button" data-tg="'+i+'" aria-label="Hapus tag '+esc(t)+'">'+esc(t)+'<b>×</b></button>'}).join("");
  var inp=$("bgTagIn");inp.disabled=!tagCol;inp.placeholder=tagCol?(tags.length>=MAXT?"sudah "+MAXT+" tag":"ketik tag, lalu koma atau Enter"):"Jalankan supabase/schema_blog_tags.sql dulu";
  drawSug()}
function suggest(){
  var title=$("bgTitle").value,raw=$("bgBody").value;if(!raw.trim()&&!title.trim())return[];
  var txt=raw;if(mode==="html"){try{txt=new DOMParser().parseFromString("<body>"+raw+"</body>","text/html").body.textContent||""}catch(e){}}
  var low=(" "+txt+" ").toLowerCase(),tl=(" "+title+" ").toLowerCase(),sc={},label={};
  function add(name,n,w){var k=name.toLowerCase();if(!n)return;sc[k]=(sc[k]||0)+n*w;if(!label[k])label[k]=name}
  VOC.forEach(function(v){var a=low.match(v[1]),b=tl.match(v[1]);var na=a?a.length:0,nb=b?b.length:0;if(nb||na>=3)add(v[0],na+nb*4,1)});
  posts.forEach(function(p){if(p.id===editing||!p.tags)return;p.tags.forEach(function(t){var k=t.toLowerCase();if(k.length<3)return;var i=low.indexOf(k),j=tl.indexOf(k);if(i>-1||j>-1)add(t,(i>-1?2:0)+(j>-1?4:0),1)})});
  var m=txt.match(/kata kunci\s*:\s*([^\n]+)\s*$/i);if(m)m[1].split(",").forEach(function(t){t=cleanTag(t);if(t.length>1)add(t,50,1)});
  return Object.keys(sc).sort(function(a,b){return sc[b]-sc[a]}).map(function(k){return label[k]}).filter(function(t){return !hasTag(t)}).slice(0,6)}
var sugList=[];
function drawSug(){
  sugList=tagCol&&tags.length<MAXT?suggest():[];
  $("bgTagSug").innerHTML=sugList.map(function(t,i){return'<button type="button" data-sg="'+i+'">'+esc(t)+"</button>"}).join("");
  $("bgTagSugT").hidden=!sugList.length}
function sugRefresh(){
  if(!$("bgTagBox")||$("bgForm").hidden)return;
  if(tagCol&&!tagsTouched&&!tags.length&&$("bgBody").value.length>=300){suggest().slice(0,4).forEach(addTag);drawTags()}else drawSug()}
function commitTagInput(){var inp=$("bgTagIn"),v=inp.value;if(!v.trim())return;v.split(/[,\n]/).forEach(function(t){if(addTag(t))tagsTouched=true});inp.value="";drawTags()}
function bindTags(){
  var inp=$("bgTagIn");if(!inp)return;
  inp.addEventListener("keydown",function(e){
    if(e.key==="Enter"||e.key===","){e.preventDefault();commitTagInput()}
    else if(e.key==="Backspace"&&!inp.value&&tags.length){tags.pop();tagsTouched=true;drawTags()}});
  inp.addEventListener("input",function(){if(/[,\n]$/.test(inp.value))commitTagInput()});
  inp.addEventListener("blur",commitTagInput);
  $("bgTagChips").addEventListener("click",function(e){var b=e.target.closest("button[data-tg]");if(!b)return;tags.splice(+b.dataset.tg,1);tagsTouched=true;drawTags()});
  $("bgTagSug").addEventListener("click",function(e){var b=e.target.closest("button[data-sg]");if(!b)return;if(addTag(sugList[+b.dataset.sg]))tagsTouched=true;drawTags()})}
/* ---- daftar ---- */
function hint(e){var m=e.message||"";return/does not exist|schema cache|blog_posts|blog_checks|source_/i.test(m)?"Jalankan supabase/schema_blog.sql dan supabase/schema_blog_orisinalitas.sql di SQL Editor Supabase, lalu muat ulang. ("+m+")":m}
function badgeOf(p){if(!window.IBOrig)return"";var ck=checks[p.id];return" · "+IBOrig.badge(ck?ck.level:IBOrig.quick(p).level,!ck)}
function curPaste(){var b=$("bgBody").value,len=b.length;if(!len||!window.IBOrig)return 0;var s=IBOrig.pastePct(b,chunks),pr=priorLen?Math.round(priorPct*Math.min(priorLen,len)/len):0;return Math.min(100,s+pr)}
function orig(){if(!window.IBOrig||!$("bgOrig"))return;curRes=IBOrig.analyze({title:$("bgTitle").value,body:$("bgBody").value,isHtml:mode==="html",pasted:curPaste(),others:posts,selfId:editing});IBOrig.draw($("bgOrig"),curRes)}
function origSoon(){clearTimeout(tm);tm=setTimeout(function(){orig();sugRefresh()},450)}
/* Tombol Lihat: bila halaman permanennya sudah dibuat sinkron (ada di blog/index.json) buka alamat blog/<kategori>/<alamat>;
   bila belum (atau daftar tidak terbaca), buka 404.html?blog=... yang membaca tulisan langsung dari Supabase. Tidak bergantung pada host menyajikan 404.html. */
var built=null;
function loadBuilt(){if(built)return;built={};try{fetch("blog/index.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.posts){j.posts.forEach(function(x){built[x.k]=1});if(loaded)draw()}}).catch(function(){})}catch(e){}}
function viewUrl(p){var k=p.category+"/"+p.slug;return built&&built[k]?"blog/"+esc(k):"404.html?blog="+encodeURIComponent(p.category)+"%2F"+encodeURIComponent(p.slug)}
function load(){loadBuilt();
  var cols="id,title,slug,category,body,is_html,status,published_at,updated_at",S=",source_name,source_url",combos=[S+",tags",S,",tags",""],n=0;
  function q(c){return sb.from("blog_posts").select(c).order("created_at",{ascending:false}).limit(500)}
  function done(r,withX){if(r.error){msg(hint(r.error),"err");return}posts=r.data||[];loaded=true;
    if(!withX){checks={};draw();return}
    return sb.from("blog_checks").select("post_id,level,paste_pct,ack").then(function(c){checks={};(c.data||[]).forEach(function(z){checks[z.post_id]=z});draw()})}
  function next(){var x=combos[n++];return q(cols+x).then(function(r){
    if(r.error&&n<combos.length&&/column|source_|tags|schema cache|does not exist/i.test(r.error.message||""))return next();
    tagCol=/tags/.test(x);return done(r,/source_/.test(x))})}
  return next()}
function draw(){
  $("bgList").innerHTML=posts.length?posts.map(function(p){var pub=p.status==="published";
    return'<div class="it"><div class="ib"><b>'+esc(p.title)+'</b><div class="meta">'+esc(CN[p.category]||p.category)+" · "+(pub?"Terbit "+fd(p.published_at):"Draft")+" · "+p.body.length+' karakter · '+(p.is_html?"HTML":"Teks")+badgeOf(p)+(p.tags&&p.tags.length?" · "+esc(p.tags.join(", ")):"")+'</div><div class="meta">blog/'+esc(p.category)+"/"+esc(p.slug)+'</div>'+
    '<div class="bar"><button class="btn ghost" data-bg="edit" data-id="'+p.id+'" type="button">Edit</button><button class="btn ghost" data-bg="tog" data-id="'+p.id+'" type="button">'+(pub?"Jadikan draft":"Terbitkan")+'</button><button class="btn ghost" data-bg="del" data-id="'+p.id+'" type="button">Hapus</button>'+(pub?'<a class="btn ghost" href="'+viewUrl(p)+'" target="_blank" rel="noopener">Lihat</a>':"")+"</div></div></div>"}).join(""):'<div class="empty">Belum ada tulisan. Ketuk "Tulisan baru".</div>'}
/* ---- form ---- */
function setMode(m){mode=m;[].forEach.call(document.querySelectorAll("#bgMode button"),function(b){b.classList.toggle("on",b.dataset.m===m)});
  $("bgHelp").innerHTML=m==="html"?"Mode HTML. Tag yang diizinkan: p, br, h2-h4, ul, ol, li, strong, b, em, i, u, a (href), blockquote, code, pre, hr, table. Tag lain dibuang saat tayang.":
    "Mode Teks: <code>## Judul bagian</code>, <code>### Sub</code>, <code>- daftar</code>, <code>**tebal**</code>, <code>[teks](https://alamat)</code>. Baris kosong = paragraf baru.";
  prev()}
function cc(){var n=$("bgBody").value.length;$("bgCc").textContent=n+" karakter";$("bgCc").style.color=n>MAX?"var(--err)":""}
function prev(){cc();$("bgPv").innerHTML=render($("bgBody").value,mode==="html")||'<span class="meta">Pratinjau tampil di sini.</span>'}
function show(f){$("bgForm").hidden=!f;$("bgList").hidden=f;$("bgNew").hidden=f}
function openForm(p){editing=p?p.id:null;cur=p||null;slugDirty=!!p;chunks=[];priorLen=p?p.body.length:0;priorPct=(p&&checks[p.id])?checks[p.id].paste_pct:0;tags=(p&&p.tags)?p.tags.slice(0,MAXT):[];tagsTouched=tags.length>0;if($("bgTagIn"))$("bgTagIn").value="";
  $("bgTitleH").textContent=p?"Edit tulisan":"Tulisan baru";
  $("bgTitle").value=p?p.title:"";$("bgCat").value=p?p.category:CATS[0][0];$("bgSlug").value=p?p.slug:"";$("bgSlug").disabled=!!p;$("bgBody").value=p?p.body:"";
  if($("bgSrcName")){$("bgSrcName").value=(p&&p.source_name)||"";$("bgSrcUrl").value=(p&&p.source_url)||"";$("bgAck").checked=!!(p&&checks[p.id]&&checks[p.id].ack)}
  $("bgDel").hidden=!p;setMode(p&&p.is_html?"html":"text");show(true);scrollTo(0,0);orig();drawTags();sugRefresh()}
function save(status){
  var title=$("bgTitle").value.trim(),slug=$("bgSlug").value.trim(),body=$("bgBody").value,cat=$("bgCat").value;
  var sn=$("bgSrcName")?$("bgSrcName").value.trim():"",su=$("bgSrcUrl")?$("bgSrcUrl").value.trim():"";
  commitTagInput();sugRefresh();
  if(title.length<3)return msg("Judul minimal 3 karakter.","err");
  if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))return msg("Alamat hanya huruf kecil, angka, dan tanda hubung.","err");
  if(!body.trim())return msg("Isi tulisan masih kosong.","err");
  if(body.length>MAX)return msg("Isi melebihi "+MAX+" karakter ("+body.length+").","err");
  if(su&&!/^https?:\/\/\S+$/i.test(su))return msg("Tautan sumber harus diawali http:// atau https://.","err");
  orig();
  if(status==="published"&&curRes){
    if(curRes.level!=="rendah"&&!$("bgAck").checked)return msg('Tulisan ini terdeteksi "'+curRes.level+'" kemungkinan salinan. Baca panel Pemeriksa orisinalitas, lalu centang konfirmasi.',"err");
    if(curRes.level==="tinggi"&&!sn)return msg("Isi nama sumber: sebagian besar isi tulisan ini berasal dari teks yang ditempel.","err")}
  var d={title:title,category:cat,body:body,is_html:mode==="html",status:status};
  if(tagCol)d.tags=tags.slice(0,MAXT);
  if(sn||(cur&&cur.source_name)){d.source_name=sn||null;d.source_url=su||null}
  if(status==="published"&&!(cur&&cur.published_at))d.published_at=new Date().toISOString();
  var q;if(editing)q=sb.from("blog_posts").update(d).eq("id",editing).select("id").single();else{d.slug=slug;q=sb.from("blog_posts").insert(d).select("id").single()}
  q.then(function(r){if(r.error)return msg(/duplicate|unique/i.test(r.error.message)?"Alamat ini sudah dipakai di kategori yang sama.":hint(r.error),"err");
    var id=(r.data&&r.data.id)||editing,res=curRes,ack=$("bgAck")?$("bgAck").checked:false;
    var ck=(res&&id)?sb.from("blog_checks").upsert({post_id:id,paste_pct:res.pasted,level:res.level,flags:res.flags.map(function(f){return{k:f.k,lv:f.lv,t:f.t}}),ack:ack,body_len:body.length,checked_at:new Date().toISOString()},{onConflict:"post_id"}).then(function(){},function(){}):Promise.resolve();
    try{sessionStorage.removeItem("gwm_blogtab_v1")}catch(e){}
    return ck.then(load).then(function(){show(false);msg(status==="published"?"Tersimpan dan terbit. Sudah bisa dibuka lewat tombol Lihat; halaman permanennya dibuat saat sinkron (otomatis, paling lama 1 jam).":"Tersimpan sebagai draft.","ok")})})}
function bind(){
  var o=$("bgNew");if(!o)return;
  o.onclick=function(){msg("");openForm(null)};
  var bd=$("bgBody");
  bd.addEventListener("paste",function(e){var t=e.clipboardData||window.clipboardData,x=t?t.getData("text"):"";if(x&&x.length>=20)chunks.push(x);origSoon()});
  bd.addEventListener("drop",function(e){var x=e.dataTransfer?e.dataTransfer.getData("text"):"";if(x&&x.length>=20)chunks.push(x);origSoon()});
  bd.addEventListener("input",origSoon);$("bgTitle").addEventListener("input",origSoon);
  ["bgSrcName","bgSrcUrl","bgAck"].forEach(function(i){var el=$(i);if(el)el.addEventListener("input",origSoon)});
  $("bgMode").addEventListener("click",origSoon);
  $("bgCancel").onclick=function(){show(false)};
  $("bgBody").addEventListener("input",prev);
  $("bgTitle").addEventListener("input",function(){if(!slugDirty&&!editing)$("bgSlug").value=slugify($("bgTitle").value)});
  $("bgSlug").addEventListener("input",function(){slugDirty=true;this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,"")});
  $("bgMode").addEventListener("click",function(e){var b=e.target.closest("button");if(b)setMode(b.dataset.m)});
  $("bgSaveD").onclick=function(){save("draft")};$("bgSaveP").onclick=function(){save("published")};
  $("bgDel").onclick=function(){delPost(cur)};
  var HOME=["panduan-konser","tips-gunung","komunitas"];
  var s=$("bgCat");s.innerHTML=CATS.map(function(c){return'<option value="'+c[0]+'">'+c[1]+(HOME.indexOf(c[0])>=0?" · tampil di beranda":"")+"</option>"}).join("")}
function delPost(p){if(!p)return;
  var goDel=function(){sb.from("blog_posts").delete().eq("id",p.id).then(function(r){if(r.error)return msg(hint(r.error),"err");try{sessionStorage.removeItem("gwm_blogtab_v1")}catch(e){}load().then(function(){show(false);msg("Tulisan dihapus.","ok")})})};
  if(typeof window.admAsk==="function"){admAsk({title:"Hapus tulisan blog",text:'Hapus "'+p.title+'"? Halaman publik hilang saat sinkron berikutnya.',ok:"Hapus"}).then(function(ok){if(ok)goDel()})}
  else goDel()}
document.addEventListener("click",function(ev){
  var b=ev.target.closest("button");if(!b)return;
  if(b.dataset.v==="blog"&&!loaded){load()}
  if(b.dataset.v==="blog"){show(false)}
  if(b.dataset.bg){var p=posts.filter(function(x){return x.id===b.dataset.id})[0];if(!p)return;
    if(b.dataset.bg==="edit")openForm(p);
    if(b.dataset.bg==="del")delPost(p);
    if(b.dataset.bg==="tog"){var pub=p.status==="published";
      if(!pub&&window.IBOrig){var ck=checks[p.id],lv=ck?ck.level:IBOrig.quick(p).level;if(lv!=="rendah"&&!(ck&&ck.ack))return msg("Tulisan ini perlu konfirmasi orisinalitas. Buka Edit, baca panel Pemeriksa orisinalitas, centang konfirmasi, lalu Terbitkan.","err")}
      var d={status:pub?"draft":"published"};if(!pub&&!p.published_at)d.published_at=new Date().toISOString();
      sb.from("blog_posts").update(d).eq("id",p.id).then(function(r){if(r.error)return msg(hint(r.error),"err");load().then(function(){msg(pub?"Dijadikan draft.":"Terbit. Sudah bisa dibuka lewat tombol Lihat; halaman permanennya dibuat saat sinkron.","ok")})})}}
});
bindTags();
bind();
})();
