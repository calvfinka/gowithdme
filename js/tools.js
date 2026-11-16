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
  var t=+$("total").value||0,n=Math.max(1,+$("orang").value||1),a=+$("admin").value||0;
  var per=Math.ceil((t*(1+a/100))/n/1000)*1000;
  $("hasil").innerHTML=t?tr("per")+' <b>Rp'+per.toLocaleString(tr("numloc"))+'</b><br><small>'+tr("round",{a:a})+'</small>':tr("fill");
}
["total","orang","admin"].forEach(function(i){$(i).oninput=calc});calc();
})();
