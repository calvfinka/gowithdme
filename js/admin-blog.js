/* Blog di /admin: tulisan teks (tanpa foto), maks 15000 karakter, mode Teks atau HTML. Tabel blog_posts (supabase/schema_blog.sql).
   Aturan mode Teks dan penyaring HTML HARUS sama dengan tools/blog.py. */
(function(){
if(!window.sb)return;
var $=function(i){return document.getElementById(i)},MAX=1e9;
var CATS=[["berita","Berita"],["opini","Opini & Cerita"],["gaya-hidup","Gaya Hidup"],["hiburan","Hiburan"],["wisata","Wisata"],["teknologi","Teknologi"],["tips","Tips & Panduan"],["panduan-konser","Panduan Konser"],["tips-gunung","Tips Gunung"],["review","Review"],["komunitas","Komunitas"]];
var CN={};CATS.forEach(function(c){CN[c[0]]=c[1]});
var MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
var posts=[],editing=null,mode="text",slugDirty=false,loaded=false,cur=null;
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
/* ---- daftar ---- */
function hint(e){var m=e.message||"";return/does not exist|schema cache|blog_posts/i.test(m)?"Jalankan supabase/schema_blog.sql di SQL Editor Supabase, lalu muat ulang. ("+m+")":m}
function load(){return sb.from("blog_posts").select("id,title,slug,category,body,is_html,status,published_at,updated_at").order("created_at",{ascending:false}).limit(500).then(function(r){
  if(r.error){msg(hint(r.error),"err");return}posts=r.data||[];loaded=true;draw()})}
function draw(){
  $("bgList").innerHTML=posts.length?posts.map(function(p){var pub=p.status==="published";
    return'<div class="it"><div class="ib"><b>'+esc(p.title)+'</b><div class="meta">'+esc(CN[p.category]||p.category)+" · "+(pub?"Terbit "+fd(p.published_at):"Draft")+" · "+p.body.length+' karakter · '+(p.is_html?"HTML":"Teks")+'</div><div class="meta">blog/'+esc(p.category)+"/"+esc(p.slug)+'</div>'+
    '<div class="bar"><button class="btn ghost" data-bg="edit" data-id="'+p.id+'" type="button">Edit</button><button class="btn ghost" data-bg="tog" data-id="'+p.id+'" type="button">'+(pub?"Jadikan draft":"Terbitkan")+'</button><button class="btn ghost" data-bg="del" data-id="'+p.id+'" type="button">Hapus</button>'+(pub?'<a class="btn ghost" href="blog/'+esc(p.category)+"/"+esc(p.slug)+'" target="_blank" rel="noopener">Lihat</a>':"")+"</div></div></div>"}).join(""):'<div class="empty">Belum ada tulisan. Ketuk "Tulisan baru".</div>'}
/* ---- form ---- */
function setMode(m){mode=m;[].forEach.call(document.querySelectorAll("#bgMode button"),function(b){b.classList.toggle("on",b.dataset.m===m)});
  $("bgHelp").innerHTML=m==="html"?"Mode HTML. Tag yang diizinkan: p, br, h2-h4, ul, ol, li, strong, b, em, i, u, a (href), blockquote, code, pre, hr, table. Tag lain dibuang saat tayang.":
    "Mode Teks: <code>## Judul bagian</code>, <code>### Sub</code>, <code>- daftar</code>, <code>**tebal**</code>, <code>[teks](https://alamat)</code>. Baris kosong = paragraf baru.";
  prev()}
function cc(){var n=$("bgBody").value.length;$("bgCc").textContent=n+" karakter";$("bgCc").style.color=n>MAX?"var(--err)":""}
function prev(){cc();$("bgPv").innerHTML=render($("bgBody").value,mode==="html")||'<span class="meta">Pratinjau tampil di sini.</span>'}
function show(f){$("bgForm").hidden=!f;$("bgList").hidden=f;$("bgNew").hidden=f}
function openForm(p){editing=p?p.id:null;cur=p||null;slugDirty=!!p;
  $("bgTitleH").textContent=p?"Edit tulisan":"Tulisan baru";
  $("bgTitle").value=p?p.title:"";$("bgCat").value=p?p.category:CATS[0][0];$("bgSlug").value=p?p.slug:"";$("bgSlug").disabled=!!p;$("bgBody").value=p?p.body:"";
  $("bgDel").hidden=!p;setMode(p&&p.is_html?"html":"text");show(true);scrollTo(0,0)}
function save(status){
  var title=$("bgTitle").value.trim(),slug=$("bgSlug").value.trim(),body=$("bgBody").value,cat=$("bgCat").value;
  if(title.length<3)return msg("Judul minimal 3 karakter.","err");
  if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))return msg("Alamat hanya huruf kecil, angka, dan tanda hubung.","err");
  if(!body.trim())return msg("Isi tulisan masih kosong.","err");
  if(body.length>MAX)return msg("Isi melebihi "+MAX+" karakter ("+body.length+").","err");
  var d={title:title,category:cat,body:body,is_html:mode==="html",status:status};
  if(status==="published"&&!(cur&&cur.published_at))d.published_at=new Date().toISOString();
  var q;if(editing)q=sb.from("blog_posts").update(d).eq("id",editing);else{d.slug=slug;q=sb.from("blog_posts").insert(d)}
  q.then(function(r){if(r.error)return msg(/duplicate|unique/i.test(r.error.message)?"Alamat ini sudah dipakai di kategori yang sama.":hint(r.error),"err");
    load().then(function(){show(false);msg(status==="published"?"Tersimpan dan terbit. Sudah bisa dibuka lewat tombol Lihat; halaman permanennya dibuat saat sinkron (otomatis, paling lama 1 jam).":"Tersimpan sebagai draft.","ok")})})}
function bind(){
  var o=$("bgNew");if(!o)return;
  o.onclick=function(){msg("");openForm(null)};
  $("bgCancel").onclick=function(){show(false)};
  $("bgBody").addEventListener("input",prev);
  $("bgTitle").addEventListener("input",function(){if(!slugDirty&&!editing)$("bgSlug").value=slugify($("bgTitle").value)});
  $("bgSlug").addEventListener("input",function(){slugDirty=true;this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,"")});
  $("bgMode").addEventListener("click",function(e){var b=e.target.closest("button");if(b)setMode(b.dataset.m)});
  $("bgSaveD").onclick=function(){save("draft")};$("bgSaveP").onclick=function(){save("published")};
  $("bgDel").onclick=function(){delPost(cur)};
  var s=$("bgCat");s.innerHTML=CATS.map(function(c){return'<option value="'+c[0]+'">'+c[1]+"</option>"}).join("")}
function delPost(p){if(!p)return;
  var goDel=function(){sb.from("blog_posts").delete().eq("id",p.id).then(function(r){if(r.error)return msg(hint(r.error),"err");load().then(function(){show(false);msg("Tulisan dihapus.","ok")})})};
  if(typeof window.admAsk==="function"){admAsk({title:"Hapus tulisan blog",text:'Hapus "'+p.title+'"? Halaman publik hilang saat sinkron berikutnya.',ok:"Hapus"}).then(function(ok){if(ok)goDel()})}
  else goDel()}
document.addEventListener("click",function(ev){
  var b=ev.target.closest("button");if(!b)return;
  if(b.dataset.v==="blog"&&!loaded){load()}
  if(b.dataset.v==="blog"){show(false)}
  if(b.dataset.bg){var p=posts.filter(function(x){return x.id===b.dataset.id})[0];if(!p)return;
    if(b.dataset.bg==="edit")openForm(p);
    if(b.dataset.bg==="del")delPost(p);
    if(b.dataset.bg==="tog"){var pub=p.status==="published",d={status:pub?"draft":"published"};if(!pub&&!p.published_at)d.published_at=new Date().toISOString();
      sb.from("blog_posts").update(d).eq("id",p.id).then(function(r){if(r.error)return msg(hint(r.error),"err");load().then(function(){msg(pub?"Dijadikan draft.":"Terbit. Sudah bisa dibuka lewat tombol Lihat; halaman permanennya dibuat saat sinkron.","ok")})})}}
});
bind();
})();
