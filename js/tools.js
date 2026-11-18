(function(){
var $=function(i){return document.getElementById(i)};
var tr=window.IB_T||function(k){return k},ITEMS=tr("pack").split("|");
var KEY="ib_packing",saved={};
try{saved=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
$("pl").innerHTML=ITEMS.map(function(t,i){return'<li><label><input type="checkbox" data-i="'+i+'"'+(saved[i]?" checked":"")+'> '+t+'</label></li>'}).join("");
function prog(){var n=document.querySelectorAll("#pl input:checked").length;$("pbar").style.width=(n/ITEMS.length*100)+"%";$("pcount").textContent=tr("pcount",{n:n,m:ITEMS.length})}
$("pl").onchange=function(e){saved[e.target.dataset.i]=e.target.checked;try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(x){}prog()};
$("pReset").onclick=function(){saved={};try{localStorage.removeItem(KEY)}catch(x){}[].forEach.call(document.querySelectorAll("#pl input"),function(i){i.checked=false});prog()};
prog();
function calc(){
  var t=Math.max(0,+$("total").value||0),n=Math.max(1,Math.floor(+$("orang").value||1)),a=Math.min(30,Math.max(0,+$("admin").value||0));
  var hf=$("hostFee")?Math.min(25,Math.max(0,+$("hostFee").value||0)):0;
  var res=window.IB_MonetizeCore?IB_MonetizeCore.calculateTripSplitWithFee(t,n,a,hf):{perPerson:Math.ceil(t*(100+a)/(100000*n))*1000,grandTotal:Math.round(t*(100+a+hf)/100)};
  var note=hf>0?tr("host_fee_note",{a:a,h:hf,g:res.grandTotal.toLocaleString(tr("numloc"))}):tr("round",{a:a});
  $("hasil").innerHTML=t?tr("per")+' <b>Rp'+res.perPerson.toLocaleString(tr("numloc"))+'</b><br><small>'+note+'</small>':tr("fill");
}
["total","orang","admin","hostFee"].forEach(function(i){if($(i))$(i).oninput=calc});calc();
})();
