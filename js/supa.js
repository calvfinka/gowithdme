if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,"")+location.search+location.hash);
// Klien Supabase bersama (login.html & admin.html). SDK dimuat dari CDN sebelum file ini.
(function(){
  var C=window.IB_CONFIG||{};
  window.sb=(window.supabase&&C.SUPABASE_URL&&C.SUPABASE_ANON_KEY)?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
  window.$=function(i){return document.getElementById(i)};
  window.esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
  window.msg=function(t,type){var m=$("msg");if(!m)return;m.hidden=!t;m.textContent=t||"";m.className="msg "+(type||"")};
  window.getMe=function(){
    if(!sb)return Promise.resolve(null);
    return sb.auth.getSession().then(function(r){var s=r.data.session;if(!s)return null;
      return sb.from("profiles").select("*").eq("id",s.user.id).single().then(function(p){return{user:s.user,profile:p.data||{}}})});
  };
  window.loadCities=function(sel,withEmpty){
    return sb.from("cities").select("id,name").order("name").then(function(r){
      sel.innerHTML=(withEmpty?'<option value="">'+(window.IB_T?IB_T("pickcity"):"Pilih kota")+'</option>':"")+(r.data||[]).map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join("")});
  };
})();
