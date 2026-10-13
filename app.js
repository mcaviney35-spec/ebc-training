const $=s=>document.querySelector(s),V=$('#view');
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('ebc_'+k))??d}catch(e){return d}},set:(k,v)=>localStorage.setItem('ebc_'+k,JSON.stringify(v))};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=ms=>{const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return `${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`};
let map,watchId,tick;
function cleanup(){if(map){map.remove();map=null}if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}clearInterval(tick)}
function countdown(){const d=Math.ceil((new Date(TREK_DATE)-new Date())/864e5);$('#cd').textContent=d>0?`${d} days to Base Camp (trek starts 7 Oct 2028)`:'You made it, legend!'}
function attempts(id){return LS.get('att_'+id,[])}
function pb(id){const a=attempts(id);return a.length?a.reduce((b,x)=>x.ms<b.ms?x:b):null}
function list(){cleanup();V.innerHTML=`<p class="muted">Nine Mourne routes, Terry. Pick one, hit Start, and away ye go.</p>`+ROUTES.map(r=>{const p=pb(r.id);return `<div class="card" onclick="location.hash='r/${r.id}'"><h3>${r.n}. ${esc(r.name)}${r.bench?' ⭐':''}</h3><span class="pill ${r.grade.split(' ')[0]}">${r.grade}</span><span class="muted">${r.dist} · ${r.asc} · ${r.time}</span>${p?`<div class="pb">PB ${fmt(p.ms)} · ${attempts(r.id).length} goes</div>`:''}</div>`}).join('')}
async function loadGpx(n){const t=await (await fetch('gpx/'+n+'.gpx')).text();const x=new DOMParser().parseFromString(t,'application/xml');return [...x.getElementsByTagName('trkpt')].map(p=>[+p.getAttribute('lat'),+p.getAttribute('lon')])}
function chart(a){if(a.length<2)return '<p class="muted">Do it twice and you\'ll get a progress chart here.</p>';const W=320,H=140,P=30,v=a.map(x=>x.ms/6e4),mx=Math.max(...v),mn=Math.min(...v),r=(mx-mn)||1;const pts=v.map((y,i)=>[P+i*(W-P-10)/(v.length-1),10+(H-P)*(mx-y)/r]);
return `<svg viewBox="0 0 ${W} ${H}" width="100%"><text x="0" y="14" fill="#95d5b2" font-size="10">${Math.round(mx)}m</text><text x="0" y="${H-P+10}" fill="#95d5b2" font-size="10">${Math.round(mn)}m</text><polyline fill="none" stroke="#ffd166" stroke-width="2.5" points="${pts.map(p=>p.join(',')).join(' ')}"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#ffd166"/>`).join('')}<text x="${P}" y="${H-5}" fill="#95d5b2" font-size="10">oldest → newest (lower = faster)</text></svg>`}
async function route(id){cleanup();const r=ROUTES.find(x=>x.id==id);if(!r)return list();const T=LS.get('timer_'+id,{run:false,acc:0,t0:0});const a=attempts(id),p=pb(id);
V.innerHTML=`<button class="back" onclick="location.hash=''">‹ All routes</button><h2 style="margin:4px 0">${r.n}. ${esc(r.name)}</h2><span class="pill ${r.grade.split(' ')[0]}">${r.grade}</span>${r.bench?'<span class="pill">⭐ Benchmark</span>':''}
<div id="map" class="map"></div><button class="btn sm" id="loc">📍 Show me on the map</button> <span id="gps" class="muted"></span>
<div class="card"><div class="timer" id="tm">${fmt(0)}</div><div style="text-align:center"><button class="btn go" id="ss"></button><button class="btn stop" id="fin">Finish</button><button class="btn sm" id="rst">Reset</button></div>
<label class="muted">Pack weight (kg, optional)</label><input id="kg" type="number" inputmode="decimal" step="0.5" value="${T.kg??''}"><label class="muted">Notes (weather, how the legs felt…)</label><textarea id="nt" rows="2">${esc(T.notes??'')}</textarea></div>
<div class="card"><h3>Your times</h3>${p?`<div class="pb">🏆 Personal best: ${fmt(p.ms)} (${new Date(p.date).toLocaleDateString('en-GB')}${p.kg?`, ${p.kg}kg`:''})</div>`:'<p class="muted">No times yet. Get out there!</p>'}${chart(a)}
${a.length?`<table><tr><th>Date</th><th>Time</th><th>Pack</th><th>Notes</th><th></th></tr>${a.slice().reverse().map(x=>`<tr><td>${new Date(x.date).toLocaleDateString('en-GB')}</td><td>${fmt(x.ms)}</td><td>${x.kg?x.kg+'kg':''}</td><td>${esc(x.notes)}</td><td><button class="btn sm" onclick="delAtt('${id}',${x.date})">✕</button></td></tr>`).join('')}</table>`:''}</div>
<div class="card"><dl><dt>Distance</dt><dd>${r.dist}</dd><dt>Ascent</dt><dd>${r.asc}</dd><dt>Time</dt><dd>${r.time}</dd><dt>Difficulty</dt><dd>${r.diff}</dd><dt>Start</dt><dd>${esc(r.start)}</dd><dt>Grid ref</dt><dd>${r.grid}</dd></dl>
<p class="muted">${esc(r.suits)}</p><h3>Directions</h3><ol>${r.dir.map(d=>`<li>${esc(d)}</li>`).join('')}</ol><a href="${r.url}" target="_blank" rel="noopener">Official WalkNI page ↗</a> · ${r.gpx.map(g=>`<a href="gpx/${g}.gpx" download>${g}.gpx</a>`).join(' · ')}</div>
<p class="muted">Mountain weather turns fast. Check MWIS and carry a map and compass, don't rely on the phone.</p>`;
map=L.map("map");map.setView([54.18,-5.95],11);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
try{const segs=await Promise.all(r.gpx.map(loadGpx));const cols=['#e63946','#3a86ff'];let all=[];segs.forEach((s,i)=>{L.polyline(s,{color:cols[i],weight:4}).addTo(map);all=all.concat(s)});
L.circleMarker(segs[0][0],{radius:8,color:'#fff',fillColor:'#2dc653',fillOpacity:1}).addTo(map).bindPopup('Start: '+r.grid);map.invalidateSize();map.fitBounds(L.latLngBounds(all),{padding:[15,15]});setTimeout(()=>{if(map){map.invalidateSize();map.fitBounds(L.latLngBounds(all),{padding:[15,15]})}},300)}catch(e){map.setView([54.18,-5.95],11)}
let me;$('#loc').onclick=()=>{if(!navigator.geolocation)return $('#gps').textContent='No GPS on this device';$('#gps').textContent='Finding you…';
watchId=navigator.geolocation.watchPosition(pos=>{const ll=[pos.coords.latitude,pos.coords.longitude];if(!me){me=L.circleMarker(ll,{radius:8,color:'#fff',fillColor:'#3a86ff',fillOpacity:1}).addTo(map);map.panTo(ll)}else me.setLatLng(ll);$('#gps').textContent=`±${Math.round(pos.coords.accuracy)}m`},e=>$('#gps').textContent='GPS not allowed/available',{enableHighAccuracy:true})};
const save=()=>{T.kg=$('#kg').value;T.notes=$('#nt').value;LS.set('timer_'+id,T)};$('#kg').oninput=save;$('#nt').oninput=save;
const el=()=>T.acc+(T.run?Date.now()-T.t0:0);const draw=()=>{$('#tm').textContent=fmt(el());$('#ss').textContent=T.run?'Pause':(T.acc?'Resume':'Start')};draw();tick=setInterval(draw,1000);
$('#ss').onclick=()=>{if(T.run){T.acc+=Date.now()-T.t0;T.run=false}else{T.t0=Date.now();T.run=true}save();draw()};
$('#rst').onclick=()=>{if(el()&&!confirm('Reset the clock?'))return;Object.assign(T,{run:false,acc:0,t0:0});save();draw()};
$('#fin').onclick=()=>{const ms=el();if(ms<1000)return alert('Start the clock first, ya chancer!');const prev=pb(id);const list=attempts(id);list.push({date:Date.now(),ms,kg:parseFloat($('#kg').value)||null,notes:$('#nt').value.trim()});LS.set('att_'+id,list);LS.set('timer_'+id,{run:false,acc:0,t0:0});
alert(!prev||ms<prev.ms?`New personal best: ${fmt(ms)}! Class.`:`Saved: ${fmt(ms)}. PB is still ${fmt(prev.ms)}, keep at it.`);route(id)}}
window.delAtt=(id,d)=>{if(!confirm('Delete this attempt?'))return;LS.set('att_'+id,attempts(id).filter(x=>x.date!=d));route(id)};
function plan(){cleanup();const today=new Date().toISOString().slice(0,10),done=LS.get('ms',{});const cur=PHASES.find(p=>today>=p.from&&today<=p.to);
const n=Object.values(done).filter(Boolean).length;
V.innerHTML=`<div class="card"><h3>⛰️ ${$('#cd').textContent}</h3><p class="muted">Booked with EverTrek, 7 to 21 Oct 2028, you and Corey. About 100 weekends, Terry, and the Mournes are on your doorstep.</p></div>
${PHASES.map(p=>`<div class="card phase ${cur===p?'now':''}">${cur===p?'<span class="pill" style="background:#ffd166;color:#000">YOU ARE HERE</span>':''}<h3>Phase ${p.n}: ${p.name} – '${p.tag}'</h3><div class="muted">${p.dates} · Pack ${p.pack}</div><p>${p.goal}</p><ul>${p.week.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`).join('')}
<div class="card"><h3>Milestones (${n}/${MILESTONES.length})</h3>${MILESTONES.map((m,i)=>`<label class="ms ${done[i]?'done':''}"><input type="checkbox" data-i="${i}" ${done[i]?'checked':''}><span><b>${m[0]}</b> – ${esc(m[1])}</span></label>`).join('')}</div>
<p class="muted">Not medical advice: see your GP before ramping up.</p>`;
V.querySelectorAll('.ms input').forEach(c=>c.onchange=()=>{done[c.dataset.i]=c.checked;LS.set('ms',done);plan()})}
function data(){cleanup();V.innerHTML=`<div class="card"><h3>Back up your data</h3><p class="muted">Everything lives on this phone only. No accounts, no tracking. Save a backup now and again in case the phone goes for a swim.</p>
<button class="btn" id="ex">⬇️ Export backup (JSON)</button><h3 style="margin-top:16px">Restore</h3><input type="file" id="im" accept="application/json,.json"><p id="msg" class="muted"></p></div>`;
$('#ex').onclick=async()=>{const o={app:'ebc-training',v:1,exported:new Date().toISOString(),data:{}};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('ebc_'))o.data[k]=localStorage.getItem(k)}
const blob=new Blob([JSON.stringify(o,null,1)],{type:'application/json'}),name=`ebc-backup-${new Date().toISOString().slice(0,10)}.json`,file=new File([blob],name,{type:'application/json'});
if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return}catch(e){}}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click()};
$('#im').onchange=async e=>{try{const o=JSON.parse(await e.target.files[0].text());if(o.app!=='ebc-training')throw 0;if(!confirm('Replace data on this phone with the backup?'))return;Object.keys(localStorage).filter(k=>k.startsWith('ebc_')).forEach(k=>localStorage.removeItem(k));Object.entries(o.data).forEach(([k,v])=>k.startsWith('ebc_')&&localStorage.setItem(k,v));$('#msg').textContent='Restored, sound as a pound.'}catch(x){$('#msg').textContent="That doesn't look like an EBC backup file."}}}
function nav(){countdown();const h=location.hash.slice(1);const t=h.startsWith('r/')||!h?'routes':h;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));window.scrollTo(0,0);
if(h.startsWith('r/'))route(h.slice(2));else if(h=='plan')plan();else if(h=='data')data();else list()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>location.hash=b.dataset.t=='routes'?'':b.dataset.t);
window.onhashchange=nav;nav();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
