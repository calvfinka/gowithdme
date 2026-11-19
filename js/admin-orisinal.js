/* Pemeriksa orisinalitas tulisan blog (jalan di browser admin). Hasilnya INDIKATOR, bukan bukti plagiarisme:
   ia tidak bisa mencocokkan dengan seluruh internet, hanya dengan tulisan lain di blog ini dan ciri-ciri teks hasil salin. */
(function(){
var ZW=/[\u200B-\u200D\uFEFF\u2060]/g,cache={};
function strip(t,html){if(!html)return t||"";try{return new DOMParser().parseFromString("<body>"+t+"</body>","text/html").body.textContent||""}catch(e){return String(t).replace(/<[^>]+>/g," ")}}
function norm(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim()}
function words(s){var n=norm(s);return n?n.split(" "):[]}
function shingles(w,n){var o={},c=0;for(var i=0;i+n<=w.length;i++){var k=w.slice(i,i+n).join(" ");if(!o[k]){o[k]=1;c++}}return{set:o,n:c}}
function contain(a,b){if(!a.n)return 0;var s=0;for(var k in a.set)if(b.set[k])s++;return s/a.n}
function shOf(p){var key=p.id+":"+(p.body||"").length;if(!cache[key])cache[key]=shingles(words(strip(p.body,p.is_html)),5);return cache[key]}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[c]})}
/* Berapa persen isi yang masih berupa teks tempelan (kalimat tempelan yang sudah ditulis ulang tidak dihitung) */
function pastePct(body,chunks){var len=body.length;if(!len||!chunks.length)return 0;var tot=0,seen={};
  chunks.forEach(function(c){c.split(/[\n.!?]+/).forEach(function(p){p=p.trim();if(p.length>=12&&!seen[p]&&body.indexOf(p)>=0){seen[p]=1;tot+=p.length+1}})});
  return Math.min(100,Math.round(tot/len*100))}
var DL=/^\s*["“(]?[A-ZÀ-Ý][A-ZÀ-Ý .'’\-]{2,30}(?:,\s*[A-Za-zÀ-ÿ.' \-]{2,40})?\s*(?:\([A-Za-z. ]{2,20}\)\s*)?[—–-]\s/;
var AG=/^\s*\((ANTARA|AFP|AP|Reuters|Antaranews)\)/i;
var BP=/(?:\b(?:baca juga|baca selengkapnya|simak juga|baca artikel|klik di sini|hak cipta|all rights reserved|follow (?:us|kami)|editor\s*:|penulis\s*:|reporter\s*:|redaktur\s*:|foto\s*:|ilustrasi\s*:)|©|\(red\)|copyright)/gi;
/* o: {title, body, isHtml, pasted(0-100), others:[{id,title,body,is_html}], selfId, noSim} */
function analyze(o){
  var text=strip(o.body,o.isHtml),F=[],score=0,pp=o.pasted|0,title=o.title||"";
  function add(lv,k,t,d){F.push({k:k,lv:lv,t:t,d:d});score+=lv}
  var lines=text.split(/\n+/).map(function(x){return x.trim()}).filter(Boolean),t0=text;
  if(lines.length&&title&&norm(lines[0])===norm(title)){add(0,"judul","Baris pertama sama dengan judul","Tidak masalah: baris ini dibuang otomatis saat tayang, tapi hapus saja supaya rapi.");t0=text.replace(lines[0],"")}
  if(pp>=70)add(5,"tempel","Hampir seluruh isi ditempel ("+pp+"%)","Teks ini tampaknya disalin dari tempat lain, bukan diketik di editor ini.");
  else if(pp>=40)add(3,"tempel","Sebagian besar isi ditempel ("+pp+"%)","Banyak teks masuk lewat tempel (paste). Tulis ulang dengan kata-katamu sendiri.");
  else if(pp>=15)add(1,"tempel","Sebagian isi ditempel ("+pp+"%)","Ada potongan yang ditempel. Pastikan sudah ditulis ulang atau dikutip dengan sumber.");
  var head=t0.slice(0,220);
  if(DL.test(head)||AG.test(head))add(2,"dateline","Pembuka bergaya kantor berita","Pola seperti \"KOTA, MEDIA — \" khas berita yang disalin. Tulis pembukamu sendiri.");
  var bp=(text.match(BP)||[]).length;
  if(bp>=2)add(2,"boiler","Ada sisa teks khas situs berita ("+bp+" penanda)","Mis. \"Baca juga\", nama editor, atau hak cipta. Biasanya ikut tersalin dari halaman asli.");
  else if(bp===1)add(1,"boiler","Ada satu penanda khas situs berita","Mis. \"Baca juga\" atau nama editor. Hapus bila itu sisa salinan.");
  var zw=(text.match(ZW)||[]).length,nb=(text.match(/\u00A0/g)||[]).length;
  if(zw>0||nb>=3)add(1,"tak-terlihat","Ada karakter tak terlihat","Spasi khusus atau karakter tak terlihat sering ikut saat menyalin dari web.");
  if((text.match(/https?:\/\/\S+/g)||[]).length>=4)add(1,"url","Banyak tautan di isi tulisan","Empat tautan atau lebih sering berasal dari artikel yang disalin utuh.");
  var w=words(text);
  if(!o.noSim&&w.length>=40&&o.others&&o.others.length){
    var A=shingles(w,5),best=null;
    o.others.forEach(function(p){if(p.id===o.selfId||!p.body)return;var c=contain(A,shOf(p));if(!best||c>best.c)best={c:c,t:p.title}});
    if(best){var pc=Math.round(best.c*100);
      if(best.c>=.25)add(3,"mirip","Mirip "+pc+"% dengan \""+best.t+"\"","Banyak rangkaian kata yang sama dengan tulisan lain di blog ini.");
      else if(best.c>=.1)add(1,"mirip","Agak mirip ("+pc+"%) dengan \""+best.t+"\"","Sebagian kalimat sama dengan tulisan lain di blog ini.")}}
  return{level:score>=5?"tinggi":score>=3?"sedang":"rendah",score:score,flags:F,pasted:pp,words:w.length}}
function quick(p){return analyze({title:p.title,body:p.body,isHtml:p.is_html,pasted:0,noSim:true})}
var LV={rendah:["Risiko rendah","#0E5A46","#fff"],sedang:["Perlu dicek","#F5B416","#222"],tinggi:["Risiko tinggi","#C0392B","#fff"]};
function badge(level,auto){var l=LV[level]||LV.rendah;return'<span style="display:inline-block;padding:1px 9px;border-radius:99px;font-size:11.5px;font-weight:700;background:'+l[1]+';color:'+l[2]+'">'+l[0]+(auto?" (otomatis)":"")+"</span>"}
function draw(box,r,opt){
  if(!box)return;opt=opt||{};
  var h='<p style="margin:0 0 6px">'+badge(r.level)+' <span class="meta">Tempel: '+r.pasted+'% · '+r.words+' kata</span></p>';
  var real=r.flags.filter(function(f){return f.lv>0}),info=r.flags.filter(function(f){return f.lv===0});
  h+=real.length||info.length?'<ul style="margin:6px 0 8px;padding-left:18px;font-size:13px;line-height:1.5">'+real.concat(info).map(function(f){return'<li><b>'+esc(f.t)+'</b><br><span class="meta">'+esc(f.d)+'</span></li>'}).join("")+"</ul>":'<p class="meta">Tidak ada tanda salinan yang terdeteksi.</p>';
  if(r.level!=="rendah")h+='<p class="meta" style="margin:0 0 8px">'+(r.level==="tinggi"?'Wajib isi <b>nama sumber</b> dan centang konfirmasi di bawah sebelum Terbitkan.':'Centang konfirmasi di bawah sebelum Terbitkan.')+'</p>';
  h+='<p class="meta" style="margin:0 0 8px;font-size:12px">Ini indikator, bukan bukti. Pemeriksa tidak bisa mencocokkan dengan seluruh internet, hanya dengan tulisan lain di blog ini dan ciri-ciri teks hasil salin.</p>';
  box.innerHTML=h}
window.IBOrig={analyze:analyze,quick:quick,pastePct:pastePct,badge:badge,draw:draw};
})();
