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
function norm(rows){return rows.map(function(r){if(r.cities){r.city=r.cities.name}delete r.cities;return r})}
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
