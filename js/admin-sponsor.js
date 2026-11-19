/* Panel Admin > Lead Sponsor: lead dari formulir Promote, pembayaran manual, dan aktivasi Featured.
   Data hanya lewat RPC admin_* (butuh supabase/patch_sponsor_leads.sql). */
(function(){
  var box=document.getElementById("v_sponsor");
  if(!box||!window.sb)return;
  var $=function(i){return document.getElementById(i)};
  var STATUS={new:"Baru",contacted:"Sudah dihubungi",won:"Berhasil",lost:"Batal"};
  var PKG={free:"Listing Komunitas",city_spotlight:"City Spotlight",national_portal:"Banner Nasional"};
  var BOOST={free:0,city_spotlight:50,national_portal:100};
  var MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  var rows=[],events=null,eventsLoading=false,filter="",q="",loaded=false,loading=false,failed="";

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function rp(n){return window.IB_MonetizeCore?IB_MonetizeCore.formatRupiah(n):"Rp"+n}
  function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
  function addDays(iso,n){var d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
  function fd(iso){if(!iso)return"";var d=new Date(String(iso).slice(0,10)+"T00:00:00");return d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()}
  function when(iso){
    if(!iso)return"";
    try{return new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso))+" WIB"}catch(e){return iso}
  }
  /* hanya http(s) yang dijadikan tautan; selain itu tampil sebagai teks biasa */
  function linkify(t){
    var s=String(t||"").trim();if(!s)return"";
    return /^https?:\/\/\S+$/i.test(s)?'<a href="'+esc(s)+'" target="_blank" rel="noopener noreferrer">'+esc(s)+'</a>':esc(s);
  }
  function count(st){return rows.filter(function(r){return!st||r.status===st}).length}
  function sum(list,f){return list.reduce(function(a,r){return a+(Number(f(r))||0)},0)}
  function badge(){var n=count("new"),d=$("sSpon");if(d){d.hidden=!n;d.textContent=n}}

  function stats(){
    var open=rows.filter(function(r){return r.status==="new"||r.status==="contacted"});
    var received=rows.filter(function(r){return r.paid_at});
    var t=[
      ["Lead baru",count("new"),"perlu dihubungi",""],
      ["Dalam proses",count("contacted"),"potensi "+rp(sum(open,function(r){return r.est_total_idr})),""],
      ["Berhasil",count("won"),"dari "+rows.length+" lead",""],
      ["Pembayaran diterima",rp(sum(received,function(r){return r.paid_idr})),received.length+" lead lunas","hl"]
    ];
    return'<div class="sp-stats">'+t.map(function(x){return'<div class="sp-stat '+x[3]+'"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b><small>'+esc(x[2])+'</small></div>'}).join("")+'</div>';
  }

  function card(r){
    var wa=r.contact_wa?'<a class="btn pri sm" href="https://wa.me/'+esc(r.contact_wa)+'?text='+encodeURIComponent("Halo, saya dari GWM soal pesanan promosi "+(r.order_code||"")+" ("+(r.event_title||"")+").")+'" target="_blank" rel="noopener noreferrer">Chat WhatsApp</a>':"";
    var mail=r.contact_email?'<a href="mailto:'+esc(r.contact_email)+'">'+esc(r.contact_email)+'</a>':"";
    var chips=[PKG[r.package]||r.package,r.city,r.weeks?r.weeks+" minggu":""].filter(Boolean).map(function(c){return'<span class="sp-chip">'+esc(c)+'</span>'}).join("")+
      (r.est_total_idr!=null?'<span class="sp-chip money">Estimasi '+esc(rp(r.est_total_idr))+'</span>':"");
    var opts=Object.keys(STATUS).map(function(k){return'<option value="'+k+'"'+(k===r.status?" selected":"")+'>'+STATUS[k]+'</option>'}).join("");
    var amt=r.paid_idr!=null?r.paid_idr:(r.est_total_idr!=null?r.est_total_idr:"");
    var until=addDays(today(),(r.weeks||1)*7);
    var live=r.event_id
      ?'<p class="sp-live">✓ Sudah ditayangkan sebagai Featured'+(r.featured_at?' · '+esc(fd(r.featured_at)):"")+'</p>'
      :'<details class="sp-act" data-act="'+esc(r.id)+'"><summary>Aktifkan sebagai Featured</summary>'+
        '<label class="f">Event yang ditayangkan<select data-f="event"><option value="">Memuat daftar event…</option></select></label>'+
        '<label class="f">Tayang sampai<input data-f="until" type="date" value="'+until+'" min="'+today()+'"></label>'+
        '<label class="f">Label sponsor<input data-f="label" type="text" maxlength="40" value="'+(r.package==="free"?"":"Partner")+'"></label>'+
        '<button class="btn pri sm" type="button" data-activate="'+esc(r.id)+'">Aktifkan Featured</button></details>';
    return'<article class="sp-card'+(r.status==="new"?" new":"")+'" data-id="'+esc(r.id)+'">'+
      '<div class="sp-hd"><div><h3>'+esc(r.organizer_name)+'</h3><p>'+esc(r.event_title||"")+'</p></div>'+
        '<span class="badge'+(r.status==="new"?" adm":r.status==="won"?" pub":"")+'">'+esc(STATUS[r.status]||r.status)+'</span></div>'+
      '<div class="sp-chips">'+chips+'</div>'+
      '<div class="sp-contact">'+wa+mail+'<span class="sp-code">'+esc(r.order_code||"(tanpa kode)")+' · '+esc(when(r.created_at))+'</span></div>'+
      (r.budget_note?'<div class="sp-note">Catatan pemohon: '+linkify(r.budget_note)+'</div>':"")+
      '<div class="sp-grid">'+
        '<div class="sp-box"><h4>Tindak lanjut</h4>'+
          '<label class="f">Status<select data-f="status">'+opts+'</select></label>'+
          '<label class="f">Catatan internal<textarea data-f="notes" rows="2" maxlength="1000" placeholder="mis. sudah telepon, minta invoice">'+esc(r.notes||"")+'</textarea></label></div>'+
        '<div class="sp-box"><h4>Pembayaran (manual)</h4>'+
          '<label class="sp-pay"><input data-f="paid" type="checkbox"'+(r.paid_at?" checked":"")+'> Sudah dibayar</label>'+
          (r.paid_at?'<p class="sp-paid-at">Dibayar '+esc(when(r.paid_at))+'</p>':"")+
          '<label class="f">Nomor invoice<input data-f="invoice" type="text" maxlength="60" value="'+esc(r.invoice_no||"")+'" placeholder="INV-2026-001"></label>'+
          '<label class="f">Nominal diterima (Rp)<input data-f="amount" type="number" min="0" step="1000" inputmode="numeric" value="'+esc(amt)+'"></label></div>'+
      '</div>'+
      live+
      '<div class="sp-ft"><small>'+(r.updated_at?"Diubah "+esc(when(r.updated_at)):"Belum pernah diubah")+'</small><button class="btn pri sm" type="button" data-save="'+esc(r.id)+'">Simpan perubahan</button></div>'+
    '</article>';
  }

  function draw(){
    var st=$("spStats");if(st)st.innerHTML=failed?"":stats();
    var tabs=$("spTabs");
    if(tabs)tabs.innerHTML=[["","Semua"]].concat(Object.keys(STATUS).map(function(k){return[k,STATUS[k]]})).map(function(t){
      return'<button class="tab'+(filter===t[0]?" on":"")+'" data-sp="'+t[0]+'" type="button">'+t[1]+' <small>'+count(t[0])+'</small></button>'}).join("");
    var list=$("spList");if(!list)return;
    if(failed){list.innerHTML='<div class="empty">'+esc(failed)+'</div>';return}
    var ql=q.toLowerCase();
    var l=rows.filter(function(r){
      if(filter&&r.status!==filter)return false;
      return!ql||[r.organizer_name,r.event_title,r.order_code,r.contact_wa,r.contact_email,r.city,r.invoice_no].join(" ").toLowerCase().indexOf(ql)>-1;
    });
    list.innerHTML=l.length?l.map(card).join(""):'<div class="empty">'+(rows.length?"Tidak ada lead yang cocok dengan filter.":"Belum ada permintaan sponsor. Permintaan dari halaman Promote akan muncul di sini.")+'</div>';
  }

  function load(force){
    if(loading||(loaded&&!force))return;
    loading=true;
    var list=$("spList");if(list&&!rows.length)list.innerHTML='<div class="empty">Memuat…</div>';
    Promise.resolve(sb.rpc("admin_list_sponsor_leads",{p_status:null,p_limit:500})).then(function(r){
      loading=false;
      if(r.error){
        failed=/admin_list_sponsor_leads|PGRST202|42883/i.test((r.error.message||"")+(r.error.code||""))
          ?"Fungsi admin belum ada di database. Jalankan supabase/patch_sponsor_leads.sql di SQL Editor Supabase, lalu muat ulang."
          :friendlyErr(r.error);
        draw();return;
      }
      failed="";loaded=true;rows=r.data||[];badge();draw();
    },function(err){loading=false;failed=friendlyErr(err);draw()});
  }

  /* daftar event terbit dimuat sekali, hanya saat admin membuka "Aktifkan sebagai Featured" */
  function fillEvents(sel){
    function paint(){
      var cur=sel.value;
      sel.innerHTML='<option value="">— pilih event —</option>'+events.map(function(e){return'<option value="'+esc(e.id)+'">'+esc(e.title)+' · '+esc(fd(e.event_date))+'</option>'}).join("");
      sel.value=cur;
    }
    if(events)return paint();
    if(eventsLoading)return;
    eventsLoading=true;
    Promise.resolve(sb.from("events").select("id,title,event_date").eq("status","published").gte("event_date",addDays(today(),-30)).order("event_date",{ascending:true}).limit(400)).then(function(r){
      eventsLoading=false;events=r.data||[];
      [].forEach.call(document.querySelectorAll('.sp-act[open] [data-f="event"]'),function(s){var c=s.value;fillEventsNow(s,c)});
    },function(){eventsLoading=false;sel.innerHTML='<option value="">Gagal memuat event</option>'});
  }
  function fillEventsNow(sel,cur){
    sel.innerHTML='<option value="">— pilih event —</option>'+(events||[]).map(function(e){return'<option value="'+esc(e.id)+'">'+esc(e.title)+' · '+esc(fd(e.event_date))+'</option>'}).join("");
    if(cur)sel.value=cur;
  }

  function lead(id){return rows.filter(function(x){return x.id===id})[0]}
  function val(c,f){var el=c.querySelector('[data-f="'+f+'"]');return el?el.value:""}

  document.addEventListener("click",function(ev){
    var b=ev.target.closest("button");if(!b)return;
    if(b.dataset.v==="sponsor")load(true);
    if(b.dataset.sp!==undefined&&b.closest("#spTabs")){filter=b.dataset.sp;draw()}
    if(b.id==="spRefresh")load(true);
    var c=b.closest(".sp-card");
    if(b.dataset.save&&c){
      var paid=c.querySelector('[data-f="paid"]').checked,amt=val(c,"amount").trim();
      var r0=lead(b.dataset.save)||{};
      if(paid&&amt==="")amt=String(r0.est_total_idr||0);
      b.disabled=true;
      Promise.resolve(sb.rpc("admin_update_sponsor_lead",{p_id:b.dataset.save,p_status:val(c,"status"),p_notes:val(c,"notes"),
        p_paid:paid,p_invoice:val(c,"invoice"),p_paid_idr:paid?Math.max(0,Math.round(Number(amt))||0):null})).then(function(r){
        b.disabled=false;
        if(r.error)return msg(friendlyErr(r.error),"err");
        msg("Lead diperbarui.","ok");load(true);
      },function(err){b.disabled=false;msg(friendlyErr(err),"err")});
    }
    if(b.dataset.activate&&c){
      var l=lead(b.dataset.activate)||{},eid=val(c,"event"),until=val(c,"until");
      if(!eid)return msg("Pilih event yang akan ditayangkan.","err");
      if(!until||until<today())return msg("Tanggal akhir tayang harus hari ini atau setelahnya.","err");
      var go=function(){
        b.disabled=true;
        Promise.resolve(sb.rpc("admin_activate_sponsor",{p_lead:l.id,p_event:eid,p_until:until,p_label:val(c,"label"),p_boost:BOOST[l.package]||0})).then(function(r){
          b.disabled=false;
          if(r.error)return msg(friendlyErr(r.error),"err");
          msg("Event tayang sebagai Featured sampai "+fd(until)+". Status lead: Berhasil.","ok");load(true);
        },function(err){b.disabled=false;msg(friendlyErr(err),"err")});
      };
      if(!l.paid_at&&window.admAsk)admAsk({title:"Belum ditandai dibayar",text:"Lead ini belum ditandai sudah dibayar. Tetap aktifkan Featured?",ok:"Tetap aktifkan"}).then(function(ok){if(ok)go()});
      else go();
    }
  });
  /* isi daftar event saat panel "Aktifkan" dibuka */
  document.addEventListener("toggle",function(ev){
    var d=ev.target;if(!d.classList||!d.classList.contains("sp-act")||!d.open)return;
    fillEvents(d.querySelector('[data-f="event"]'));
  },true);
  if($("spQ"))$("spQ").oninput=function(){q=this.value.trim();draw()};

  /* hitung lead baru untuk titik merah di menu setelah admin terverifikasi */
  var tries=0,iv=setInterval(function(){tries++;
    if($("panel")&&!$("panel").hidden){clearInterval(iv);load(false)}
    else if(tries>60)clearInterval(iv)},500);
})();
