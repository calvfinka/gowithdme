/* Pemuat daftar event bersama (hemat egress Supabase). Dipakai app.js dan search.js lewat IB_loadEvents().
   - Satu unduhan dipakai bersama (dulu app.js dan pencarian masing-masing mengunduh daftar yang sama).
   - Disimpan di sessionStorage 5 menit, jadi pindah halaman tidak mengunduh ulang.
   - Hanya kolom yang dipakai tampilan (bukan select=*). Tambah kolom baru di COLS bila tampilan memakainya.
   - Cadangan otomatis: bila satu sumber gagal (mis. Supabase dijeda), dipakai sumber lain.
   Pilihan sumber utama di js/config.js:  EVENTS_SOURCE: "live" (Supabase dulu, default) atau "static" (data/events.json dulu, 0 egress;
   isinya diperbarui workflow "Sinkron konten" tiap jam, atau segera setelah terbit bila supabase/auto_sinkron.sql dipasang). */
(function(){
var C=window.IB_CONFIG||{},KEY="gwm_events_v1",TTL=5*60*1000,STATIC="../data/events.json",P=null,
COLS="id,title,title_en,slug,category,city_id,venue,event_date,end_date,price_label,description,description_en,poster_url,ticket_url,source_ig,created_at,genre,lineup,organizer,mountain,altitude_mdpl,difficulty,duration,is_community,quota,contact_wa,cities(name)";
function jget(u,h){return fetch(u,h?{headers:h}:undefined).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){if(!Array.isArray(j))throw new Error("format");return j})}
function live(){var h={apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+C.SUPABASE_ANON_KEY};
  return jget(C.SUPABASE_URL+"/rest/v1/events?select="+COLS+"&status=eq.published&order=event_date.asc",h)}
function stat(){return jget(STATIC)}
/* satu bentuk baris untuk kedua sumber: Supabase memberi cities:{name}, data/events.json sudah memberi city */
function norm(rows){var L=window.IB_Lineup;return rows.map(function(r){if(r.cities){r.city=r.cities.name}delete r.cities;if(L&&r.lineup)r.lineup=L.clean(r.lineup);return r})}
function cached(){try{var s=JSON.parse(sessionStorage.getItem(KEY)||"null");if(s&&Date.now()-s.t<TTL&&Array.isArray(s.d))return s.d}catch(e){}return null}
function keep(d){try{sessionStorage.setItem(KEY,JSON.stringify({t:Date.now(),d:d}))}catch(e){}}
function copy(d){return d.map(function(x){var y={},k;for(k in x)y[k]=x[k];return y})}
window.IB_loadEvents=function(){
  if(!P){var c=cached();
    if(c)P=Promise.resolve(c);
    else{var canLive=!!(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY),order=C.EVENTS_SOURCE==="static"?[stat,live]:[live,stat];
      if(!canLive)order=[stat];
      P=order.reduce(function(p,f){return p.catch(function(){return f()})},Promise.reject()).then(function(r){var d=norm(r);keep(d);return d});
      P.catch(function(){P=null})}}
  return P.then(copy)};
})();

/* Pembantu artis & genre (dipakai search.js dan app.js).
   - artists(e): nama penampil dari kolom lineup (dipecah koma / feat / ft / ;), tanpa catatan dalam kurung dan tanpa teks "line-up menyusul".
   - genres(e): genre dari kolom genre (dipecah / , &), ditambah induknya (mis. "Indie / rock" -> Indie dan Rock). K-pop tetap berdiri sendiri.
   - slug(s): bentuk rapi untuk alamat tautan, mis. "The Jesus and Mary Chain" -> the-jesus-and-mary-chain  (event?artis=the-jesus-and-mary-chain).
   - kunci (key) = norm(nama); halaman Event menerima slug maupun nama biasa, jadi tautan lama tetap jalan. */
(function(){
var JUNK=/line.?up|menyusul|diumumkan|bintang tamu|musisi lain|special guest|guest star|tanpa |karaoke night|showcase|tahap \d|and more|dan lainnya|paduan suara|live cooking|demo$|^(dll|dkk|tba|tbc|band|friends|guest|session)$/i;
var BASE={rock:"Rock",metal:"Metal",pop:"Pop",jazz:"Jazz",folk:"Folk",punk:"Punk",indie:"Indie",hardcore:"Hardcore",dangdut:"Dangdut",edm:"EDM","hip hop":"Hip hop"};
var SKIPG=/^(lainnya|other|others|campuran|musik)$/i;
function norm(s){s=String(s==null?"":s).toLowerCase().replace(/ø/g,"o").replace(/æ/g,"ae").replace(/ß/g,"ss").replace(/đ/g,"d").replace(/ł/g,"l");
  try{s=s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")}catch(e){}return s.replace(/[^a-z0-9]+/g," ").trim()}
function slug(s){return norm(s).replace(/ /g,"-")}
function ucf(s){s=String(s||"").trim();return s?s.charAt(0).toUpperCase()+s.slice(1):s}
function uniq(list){var seen={},out=[];list.forEach(function(x){if(x.k&&!seen[x.k]){seen[x.k]=1;out.push(x)}});return out}
function artists(e){var raw=String(e&&e.lineup||"");if(!raw)return[];
  raw=raw.replace(/\([^)]*\)/g," ").replace(/\[[^\]]*\]/g," ");
  var out=raw.split(/\s*[,;\n]\s*|\s+(?:feat\.?|ft\.?|featuring|\+)\s+/i).map(function(x){return x.replace(/\s+/g," ").replace(/\s*&\s*(band|friends)$/i,"").replace(/^[\s\-–:]+|[\s\-–:]+$/g,"")})
    .filter(function(x){return x.length>=2&&x.length<=40&&!JUNK.test(x)&&!/^\d+$/.test(x)}).map(function(x){return{k:norm(x),label:x}});
  return uniq(out)}
function genres(e){var raw=String(e&&e.genre||"");if(!raw)return[];var out=[];
  raw.split(/\s*[\/,&]\s*/).forEach(function(x){x=x.trim();if(x.length<2||SKIPG.test(x))return;var k=norm(x);if(!k)return;
    out.push({k:k,label:BASE[k]||ucf(x)});
    if(!/^k /.test(k)&&k.indexOf(" ")>-1){Object.keys(BASE).forEach(function(b){if((" "+k+" ").indexOf(" "+b+" ")>-1&&b!==k)out.push({k:b,label:BASE[b]})})}});
  return uniq(out)}
function hasArtist(e,key){if(!key)return true;var a=artists(e);for(var i=0;i<a.length;i++)if(a[i].k===key)return true;
  return(" "+norm(e&&e.lineup)+" ").indexOf(" "+key+" ")>-1||(" "+norm(e&&e.title)+" ").indexOf(" "+key+" ")>-1}
function hasGenre(e,key){if(!key)return true;var g=genres(e);for(var i=0;i<g.length;i++)if(g[i].k===key)return true;return false}
window.IB_Facets={norm:norm,slug:slug,artists:artists,genres:genres,hasArtist:hasArtist,hasGenre:hasGenre};
})();
