/* Saran otomatis saat mengetik di kolom formulir. Pilihan muncul di bawah kolom dan bisa langsung diketuk.
   IB_Suggest.bind(el, {items: fn -> hasil IB_SuggestCore.collect, city: fn -> nama kota (opsional), multi: true untuk daftar berkoma, min: huruf minimum, limit}).
   Logika pemilihan ada di js/suggest-core.js (diuji di Node); berkas ini hanya tampilan dan papan ketik. */
(function(){
var SC=window.IB_SuggestCore;if(!SC)return;
var uid=0,tr=window.IB_T||function(k){return k};
window.IB_Suggest={bind:function(el,o){
  if(!el)return;o=o||{};
  var label=el.closest("label")||el.parentNode,box=document.createElement("div"),id="sgx"+(++uid),cur=[],act=-1,quiet=false;
  label.classList.add("sgw");box.className="sgx";box.id=id;box.hidden=true;box.setAttribute("role","listbox");box.setAttribute("aria-label",tr("sg_list"));
  label.appendChild(box);
  el.setAttribute("autocomplete","off");el.setAttribute("aria-autocomplete","list");el.setAttribute("aria-controls",id);el.setAttribute("aria-expanded","false");
  function close(){box.hidden=true;act=-1;el.setAttribute("aria-expanded","false")}
  function mark(){[].forEach.call(box.children,function(b,i){var on=i===act;b.classList.toggle("on",on);b.setAttribute("aria-selected",on?"true":"false")})}
  function tok(){return SC.tokenAt(el.value,el.selectionStart,!!o.multi)}
  function open(){
    var t=tok();
    if(t.text.length<(o.min||0))return close();
    cur=SC.rank((o.items&&o.items())||[],t.text,{city:o.city?o.city():"",exclude:t.others,limit:o.limit||6});act=-1;
    if(!cur.length)return close();
    box.innerHTML="";
    cur.forEach(function(s,i){var b=document.createElement("button");b.type="button";b.setAttribute("role","option");b.dataset.i=i;b.textContent=s;box.appendChild(b)});
    box.hidden=false;el.setAttribute("aria-expanded","true");mark()}
  function pick(i){
    var s=cur[i];if(s==null)return;
    var r=SC.replaceToken(el.value,tok(),s,!!o.multi);
    el.value=r.value;try{el.setSelectionRange(r.caret,r.caret)}catch(e){}
    quiet=true;el.dispatchEvent(new Event("input",{bubbles:true}));quiet=false;
    close();if(o.multi)open()}
  el.addEventListener("input",function(){if(!quiet)open()});
  el.addEventListener("focus",open);
  el.addEventListener("click",function(){if(o.multi)open()});
  el.addEventListener("blur",function(){setTimeout(close,150)});
  el.addEventListener("keydown",function(ev){
    var k=ev.key;
    if(box.hidden){if(k==="ArrowDown")open();return}
    if(k==="ArrowDown"||k==="ArrowUp"){ev.preventDefault();act=(act+(k==="ArrowDown"?1:-1)+cur.length)%cur.length;mark()}
    else if(k==="Enter"&&act>-1){ev.preventDefault();pick(act)}
    else if(k==="Escape"||k==="Tab")close()});
  box.addEventListener("mousedown",function(e){e.preventDefault()});
  box.addEventListener("click",function(e){var b=e.target.closest("button");if(b)pick(+b.dataset.i)});
}};
})();
