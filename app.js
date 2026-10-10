const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const state = {
  articles: [],
  status: {},
  view: 'latest',
  q: '',
  type: '',
  liveArticles: []
};

const flags = { SE:'🇸🇪', NO:'🇳🇴', DK:'🇩🇰', EE:'🇪🇪', LV:'🇱🇻', LT:'🇱🇹', DE:'🇩🇪', AT:'🇦🇹', CH:'🇨🇭', NL:'🇳🇱', BE:'🇧🇪', FR:'🇫🇷', GB:'🇬🇧', IE:'🇮🇪', PL:'🇵🇱', CZ:'🇨🇿', SK:'🇸🇰', IT:'🇮🇹', ES:'🇪🇸', PT:'🇵🇹', UA:'🇺🇦', RU:'🇷🇺', US:'🇺🇸', CA:'🇨🇦', AU:'🇦🇺' };

function esc(value='') {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function fmtDate(value) {
  if (!value) return '–';
  const d = new Date(value);
  return new Intl.DateTimeFormat('fi-FI',{dateStyle:'medium',timeStyle:'short'}).format(d);
}
function ageHours(value) { return (Date.now() - new Date(value).getTime()) / 36e5; }
function seenIds() { try { return new Set(JSON.parse(localStorage.getItem('seenIds') || '[]')); } catch { return new Set(); } }
function markSeen(ids) {
  const all = seenIds(); ids.forEach(id => all.add(id));
  localStorage.setItem('seenIds', JSON.stringify([...all].slice(-3000)));
}
function groupClusters(items) {
  const map = new Map();
  for (const a of items) {
    const key = a.cluster_id || a.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(a);
  }
  return [...map.values()].map(group => group.sort((a,b)=>new Date(a.published_at)-new Date(b.published_at)));
}
function filtered() {
  const q = state.q.trim().toLocaleLowerCase('fi');
  return [...state.articles, ...state.liveArticles].filter(a => {
    const hay = [a.title,a.title_fi,a.publisher,a.country,a.agency,a.domain].filter(Boolean).join(' ').toLocaleLowerCase('fi');
    return (!q || hay.includes(q)) && (!state.type || a.type === state.type);
  });
}
function updateStats() {
  const items = state.articles;
  const countries = new Set(items.map(a=>a.country).filter(Boolean));
  const pubs = new Set(items.map(a=>a.domain).filter(Boolean));
  const new24 = items.filter(a=>ageHours(a.first_seen || a.published_at) <= 24).length;
  $('#countryCount').textContent = countries.size;
  $('#publicationCount').textContent = pubs.size;
  $('#new24Count').textContent = new24;
  $('#lastChecked').textContent = state.status.last_data_update ? fmtDate(state.status.last_data_update) : 'Ei vielä datapäivitystä';
  if (new24 > 0) {
    $('#statusHeadline').textContent = `${new24} UUTTA OSUMAA / 24 H`;
    $('#statusHeadline').style.color = 'var(--red)';
    $('#statusDetail').textContent = `Tietokannassa ${items.length} julkaisua. Syndikoinnit niputetaan yhteen.`;
  } else {
    $('#statusHeadline').textContent = 'EI UUSIA OSUMIA / 24 H';
    $('#statusHeadline').style.color = 'var(--green)';
    $('#statusDetail').textContent = `Tietokannassa ${items.length} julkaisua.`;
  }
}
function renderCluster(group) {
  const leader = [...group].sort((a,b)=>(b.importance||0)-(a.importance||0))[0];
  const seen = seenIds();
  const isNew = group.some(a => !seen.has(a.id));
  const flag = flags[leader.country_code] || '🌐';
  const agency = leader.agency ? ` · ${esc(leader.agency)}` : '';
  const synd = group.length > 1;
  const badgeType = synd ? 'SYNDICATED' : (leader.type || 'ORIGINAL');
  const links = group.map(a => `<a class="syndication-link" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.publisher || a.domain)}${a.agency ? ` · ${esc(a.agency)}`:''} →</a>`).join('');
  setTimeout(()=>markSeen(group.map(a=>a.id)), 1200);
  return `<article class="cluster">
    <div class="cluster-main">
      <div class="kicker">${flag} ${esc(leader.country || 'Tuntematon')} · ${esc(leader.publisher || leader.domain)}
        <span class="badge">${badgeType}</span>
        <span class="badge priority-${leader.importance || 2}">TÄRKEYS ${leader.importance || 2}/5</span>
        ${isNew ? '<span class="badge new">NEW</span>' : ''}
      </div>
      <h2 class="article-title">${esc(leader.title)}</h2>
      ${leader.title_fi && leader.title_fi !== leader.title ? `<div class="translation">${esc(leader.title_fi)}</div>`:''}
      <div class="meta"><span>${fmtDate(leader.published_at)}</span>${leader.author?`<span>${esc(leader.author)}</span>`:''}${agency?`<span>${agency.slice(3)}</span>`:''}${synd?`<span>${group.length} julkaisua samassa nipussa</span>`:''}</div>
      ${leader.summary_fi ? `<p class="summary">${esc(leader.summary_fi)}</p>`:''}
      <a class="open-link" href="${esc(leader.url)}" target="_blank" rel="noopener noreferrer">Avaa alkuperäinen →</a>
    </div>
    ${synd ? `<details class="syndications"><summary>Syndikoitu ${group.length} julkaisuun</summary><div class="syndications-list">${links}</div></details>`:''}
  </article>`;
}
function renderLatest(items) {
  const clusters = groupClusters(items).sort((a,b)=> new Date(Math.max(...b.map(x=>new Date(x.published_at)))) - new Date(Math.max(...a.map(x=>new Date(x.published_at)))));
  return clusters.length ? clusters.map(renderCluster).join('') : `<div class="empty">Ei osumia tällä suodatuksella.</div>`;
}
function renderCountries(items) {
  const map = new Map();
  items.forEach(a=>map.set(a.country || 'Tuntematon',(map.get(a.country || 'Tuntematon')||0)+1));
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).map(([country,count])=>{
    const sample = items.find(a=>a.country===country); const flag=flags[sample?.country_code]||'🌐';
    return `<button class="country-row" data-country="${esc(country)}"><strong>${flag} ${esc(country)}</strong><span class="count-pill">${count}</span></button>`;
  }).join('') || `<div class="empty">Ei maita.</div>`;
}
function renderAgencies(items) {
  const map = new Map();
  items.filter(a=>a.agency).forEach(a=>map.set(a.agency,(map.get(a.agency)||0)+1));
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).map(([agency,count])=>`<div class="agency-row"><strong>${esc(agency)}</strong><span class="count-pill">${count}</span></div>`).join('') || `<div class="empty">Ei tunnistettuja uutistoimistoja.</div>`;
}
function renderTimeline(items) {
  return [...items].sort((a,b)=>new Date(b.published_at)-new Date(a.published_at)).map(a=>`<div class="timeline-row"><div class="timeline-time">${fmtDate(a.published_at)}</div><div><strong>${flags[a.country_code]||'🌐'} ${esc(a.publisher||a.domain)}</strong> · <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a>${a.agency?` <span class="badge">${esc(a.agency)}</span>`:''}</div></div>`).join('') || `<div class="empty">Ei osumia.</div>`;
}
function render() {
  updateStats();
  const items = filtered();
  if (state.view==='latest') $('#content').innerHTML = renderLatest(items);
  if (state.view==='countries') {
    $('#content').innerHTML = renderCountries(items);
    $$('.country-row').forEach(btn=>btn.addEventListener('click',()=>{state.q=btn.dataset.country; $('#searchInput').value=state.q; state.view='latest'; setActiveTab(); render();}));
  }
  if (state.view==='agencies') $('#content').innerHTML = renderAgencies(items);
  if (state.view==='timeline') $('#content').innerHTML = renderTimeline(items);
}
function setActiveTab() { $$('.tab').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view)); }

async function loadData() {
  const [a,s] = await Promise.all([
    fetch(`./data/articles.json?v=${Date.now()}`).then(r=>r.json()),
    fetch(`./data/status.json?v=${Date.now()}`).then(r=>r.json()).catch(()=>({}))
  ]);
  state.articles = a;
  state.status = s;
  render();
}

async function liveSearch() {
  const btn=$('#liveSearchBtn'); const notice=$('#liveNotice');
  btn.disabled=true; btn.textContent='Haetaan…'; notice.classList.remove('hidden'); notice.textContent='Tehdään live-haku GDELTistä. Tulokset näkyvät tässä selaimessa heti; yhteiseen historiaan ne tallentuvat seuraavassa automaattihaussa.';
  try {
    const queries = [
      '"Finnish news agency STT"', '"finska nyhetsbyrån" STT', '"finsk nyhetsbyrå" STT', '"Soome uudisteagentuur" STT', 'STT "news agency" closure'
    ];
    const found=[];
    for (const query of queries) {
      const url='https://api.gdeltproject.org/api/v2/doc/doc?' + new URLSearchParams({query,mode:'artlist',format:'json',maxrecords:'50',timespan:'3d',sort:'datedesc'});
      const res=await fetch(url); if(!res.ok) continue; const data=await res.json();
      for (const x of (data.articles||[])) {
        const domain=(x.domain||new URL(x.url).hostname).replace(/^www\./,'');
        if (/\.(fi)$/.test(domain) || ['yle.fi','hs.fi','stt.fi','sttinfo.fi'].some(d=>domain.endsWith(d))) continue;
        found.push({
          id:'live-'+btoa(unescape(encodeURIComponent(x.url))).replace(/[^a-z0-9]/gi,'').slice(-24),
          cluster_id:'live-'+(x.title||'').toLowerCase().replace(/\W+/g,'-').slice(0,70),
          title:x.title||domain,
          title_fi:null,
          url:x.url,
          domain,
          publisher:domain,
          country:x.sourcecountry||'Live-haku',
          country_code:null,
          published_at:x.seendate ? x.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,'$1-$2-$3T$4:$5:$6Z') : new Date().toISOString(),
          author:null, agency:null, type:'ORIGINAL', importance:2,
          summary_fi:'Live-haun löytämä ehdokas. Automaattinen tausta-ajo tekee lopullisen suodatuksen ja ryhmittelyn.',
          first_seen:new Date().toISOString(), live:true
        });
      }
    }
    const oldUrls=new Set(state.articles.map(a=>a.url)); const uniq=[]; const seen=new Set();
    for(const a of found){ if(!oldUrls.has(a.url)&&!seen.has(a.url)){seen.add(a.url);uniq.push(a);} }
    state.liveArticles=uniq;
    notice.textContent=uniq.length ? `Live-haku valmis: ${uniq.length} mahdollista uutta osumaa. Ne on merkitty ehdokkaiksi, kunnes tausta-ajo vahvistaa ne.` : 'Live-haku valmis: ei uusia ehdokkaita juuri nyt.';
    render();
  } catch (e) {
    notice.textContent='Live-haku epäonnistui. Automaattinen GitHub Actions -haku jatkaa silti normaalisti.';
  } finally { btn.disabled=false; btn.textContent='Hae nyt'; }
}

$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{state.view=btn.dataset.view;setActiveTab();render();}));
$('#searchInput').addEventListener('input',e=>{state.q=e.target.value;render();});
$('#typeFilter').addEventListener('change',e=>{state.type=e.target.value;render();});
$('#liveSearchBtn').addEventListener('click',liveSearch);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
loadData().catch(err=>{$('#content').innerHTML=`<div class="empty">Tietojen lataus epäonnistui. ${esc(err.message)}</div>`;});
