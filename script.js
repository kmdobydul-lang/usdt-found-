// Live frontend logic (local-only, no backend)
// Constants
const CONVERT_RATE = 0.01;
const MIN_WITHDRAW = 2;
const MINING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RECHARGE_BNB_ADDRESS = '0x53f90e7a0d2834b772890f4f456d51aaed61de43';

// Storage helpers
function getState(k,d){ try{ return JSON.parse(localStorage.getItem(k)); }catch{ return d; } }
function setState(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

// state
let state = {
  wlfi: getState('wlfi') ?? 0.00,
  usdt: getState('usdt') ?? 0.00,
  teamCount: getState('teamCount') ?? 0,
  miningEnd: getState('miningEnd') ?? null,
  miningActive: getState('miningActive') ?? false
};

// elements
const el = id => document.getElementById(id);
const wlfiAmountEl = el('wlfiAmount');
const meWLFIEl = el('meWLFI');
const meUSDTEl = el('meUSDT');
const progressInner = el('progressInner');
const progressTimer = el('progressTimer');
const mineActionBtn = el('mineActionBtn');
const mineStatus = el('mineStatus');
const mineMessage = el('mineMessage');
const refLinkEl = el('refLink');
const copyRefBtn = el('copyRefBtn');
const teamCountEl = el('teamCount');
const fakeInviteBtn = el('fakeInviteBtn');


// nav
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(target).classList.add('active');
  });
});

// referral: simple unique id per browser (for demo)
let userId = localStorage.getItem('wf_userid');
if(!userId){ userId = 'U'+Math.floor(Math.random()*900000+10000); localStorage.setItem('wf_userid', userId); }
const baseInvite = window.location.origin + window.location.pathname;
refLinkEl.value = `${baseInvite}?ref=${userId}`;
copyRefBtn.addEventListener('click', ()=> {
  navigator.clipboard && navigator.clipboard.writeText(refLinkEl.value);
  alert('Referral link copied!');
});

// simulate invite
fakeInviteBtn.addEventListener('click', ()=> {
  state.teamCount = parseInt(state.teamCount) + 1;
  setState('teamCount', state.teamCount);
  renderAll();
});

// render
let miningInterval = null;
function renderAll(){
  wlfiAmountEl.innerText = parseFloat(state.wlfi).toFixed(2);
  meWLFIEl.innerText = parseFloat(state.wlfi).toFixed(2);
  meUSDTEl.innerText = parseFloat(state.usdt).toFixed(2);
  teamCountEl.innerText = state.teamCount;
  updateMiningUI();
  setState('wlfi', state.wlfi);
  setState('usdt', state.usdt);
  setState('teamCount', state.teamCount);
}

// mining logic
function updateMiningUI(){
  if(state.miningActive && state.miningEnd){
    const remain = state.miningEnd - Date.now();
    if(remain <= 0){
      progressInner.style.width = '100%';
      progressTimer.innerText = 'Ready to claim';
      mineActionBtn.innerText = 'Collect Reward (5 WLFI)';
      mineActionBtn.disabled = false;
      mineStatus.innerText = 'Completed';
      mineActionBtn.onclick = collectReward;
      if(miningInterval){ clearInterval(miningInterval); miningInterval=null; }
    } else {
      const pct = ((MINING_DURATION_MS - remain)/MINING_DURATION_MS)*100;
      progressInner.style.width = pct + '%';
      const hrs = Math.floor(remain/3600000);
      const mins = Math.floor((remain%3600000)/60000);
      const secs = Math.floor((remain%60000)/1000);
      progressTimer.innerText = `${hrs}h ${mins}m ${secs}s left`;
      mineStatus.innerText = 'Mining...';
      mineActionBtn.innerText = 'Mining...';
      mineActionBtn.disabled = true;
      if(!miningInterval){
        miningInterval = setInterval(updateMiningUI, 1000);
      }
    }
  } else {
    progressInner.style.width = '0%';
    progressTimer.innerText = 'Not started';
    mineActionBtn.innerText = 'Start Mining';
    mineActionBtn.disabled = false;
    mineStatus.innerText = 'Idle';
    mineActionBtn.onclick = startMining;
    if(miningInterval){ clearInterval(miningInterval); miningInterval=null; }
  }
}

function startMining(){
  state.miningActive = true;
  state.miningEnd = Date.now() + MINING_DURATION_MS;
  setState('miningActive', true);
  setState('miningEnd', state.miningEnd);
  mineMessage.innerText = 'Mining started. Come back after 24 hours to collect 5 WLFI.';
  renderAll();
}

function collectReward(){
  state.wlfi = parseFloat(state.wlfi) + 5;
  state.miningActive = false;
  state.miningEnd = null;
  setState('miningActive', false);
  setState('miningEnd', null);
  mineMessage.innerText = '✅ You collected 5 WLFI!';
  renderAll();
}

// Convert modal logic
const openConvert = el('openConvert');
const modalConvert = el('modalConvert');
const convertInput = el('convertInput');
const convertDo = el('convertDo');
const convertResult = el('convertResult');
const closeConvert = el('closeConvert');

openConvert.addEventListener('click', ()=> modalConvert.classList.remove('hidden'));
closeConvert.addEventListener('click', ()=> modalConvert.classList.add('hidden'));
convertDo.addEventListener('click', ()=> {
  const v = parseFloat(convertInput.value || 0);
  if(!v || v <= 0){ alert('Enter WLFI amount'); return; }
  if(v > state.wlfi){ alert('Not enough WLFI'); return; }
  const converted = v * CONVERT_RATE;
  state.wlfi = parseFloat(state.wlfi) - v;
  state.usdt = parseFloat(state.usdt) + converted;
  setState('wlfi', state.wlfi); setState('usdt', state.usdt);
  convertResult.innerText = `Converted ${v} WLFI → ${converted.toFixed(2)} USDT`;
  renderAll();
});

// Recharge modal
const openRecharge = el('openRecharge');
const modalRecharge = el('modalRecharge');
const rechargeSelect = el('rechargeSelect');
const rechargeInfo = el('rechargeInfo');
const closeRecharge = el('closeRecharge');

openRecharge.addEventListener('click', ()=> { modalRecharge.classList.remove('hidden'); updateRechargeInfo(); });
closeRecharge.addEventListener('click', ()=> modalRecharge.classList.add('hidden'));
rechargeSelect.addEventListener('change', updateRechargeInfo);
function updateRechargeInfo(){
  const v = rechargeSelect.value;
  if(v === 'USDT'){
    rechargeInfo.innerHTML = `<div>Deposit USDT (ERC20 / TRC20). Use your user-id as memo.</div>`;
  } else {
    rechargeInfo.innerHTML = `<div>Deposit BNB (BEP20) to address:<br><code style="color:#9ee9b8">${RECHARGE_BNB_ADDRESS}</code></div>`;
  }
}

// Withdraw modal
const openWithdraw = el('openWithdraw');
const modalWithdraw = el('modalWithdraw');
const withdrawMethod = el('withdrawMethod');
const binanceInput = el('binanceInput');
const bitgetInput = el('bitgetInput');
const withdrawAmount = el('withdrawAmount');
const submitWithdraw = el('submitWithdraw');
const withdrawMsg = el('withdrawMsg');
const closeWithdraw = el('closeWithdraw');

openWithdraw.addEventListener('click', ()=> modalWithdraw.classList.remove('hidden'));
closeWithdraw.addEventListener('click', ()=> modalWithdraw.classList.add('hidden'));
withdrawMethod.addEventListener('change', ()=>{
  const v = withdrawMethod.value;
  if(v === 'binance'){ binanceInput.classList.remove('hidden'); bitgetInput.classList.add('hidden'); }
  else { bitgetInput.classList.remove('hidden'); binanceInput.classList.add('hidden'); }
});
submitWithdraw.addEventListener('click', ()=>{
  const amount = parseFloat(withdrawAmount.value || 0);
  if(isNaN(amount) || amount <= 0){ alert('Enter withdraw amount'); return; }
  if(amount < MIN_WITHDRAW){ alert('Minimum withdraw is ' + MIN_WITHDRAW + ' USDT'); return; }
  if(amount > state.usdt){ alert('Not enough USDT balance'); return; }
  const method = withdrawMethod.value;
  if(method === 'binance' && !binanceInput.value.trim()){ alert('Enter Binance UID'); return; }
  if(method === 'bitget' && !bitgetInput.value.trim()){ alert('Enter Bitget UID'); return; }
  // simulate withdraw
  state.usdt = parseFloat(state.usdt) - amount;
  setState('usdt', state.usdt);
  withdrawMsg.innerText = `Withdraw request submitted. Method: ${method.toUpperCase()}, Amount: ${amount.toFixed(2)} USDT`;
  renderAll();
});

// Restore mining on load
(function init(){
  const miningActive = getState('miningActive') ?? false;
  const miningEnd = getState('miningEnd') ?? null;
  if(miningActive && miningEnd){ state.miningActive = true; state.miningEnd = miningEnd; }
  else { state.miningActive = false; state.miningEnd = null; setState('miningActive', false); setState('miningEnd', null); }
  renderAll();
})();
