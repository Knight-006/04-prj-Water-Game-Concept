const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const messageEl = document.getElementById('message');
const obstaclesCheckbox = document.getElementById('obstacles');
const timeInput = document.getElementById('timeInput');

let score = 0;
let timeLeft = 60;
let spawnInterval = 900; // ms between spawns
let lifeMin = 500, lifeMax = 1200;
let spawnTimer = null;
let gameTimer = null;
let running = false;
let slowUntil = 0;

function random(min, max){ return Math.random()*(max-min)+min }

function showMessage(text, ms=1800){
  messageEl.textContent = text;
  messageEl.style.opacity = 1;
  clearTimeout(messageEl._hide);
  messageEl._hide = setTimeout(()=>{ messageEl.style.opacity = 0 }, ms);
}

function updateScore(delta){
  score = Math.max(0, score + delta);
  scoreEl.textContent = score;
  // difficulty scaling every 10 points
  const stage = Math.floor(score/10);
  spawnInterval = Math.max(220, 900 - stage*120);
  lifeMin = Math.max(200, 500 - stage*30);
  lifeMax = Math.max(480, 1200 - stage*80);
  if([10,20,30,50].includes(score)){
    const msgs = {10:'You just funded 10 seconds of clean water!',20:"You're flowing!",30:'Riding the current!',50:'Clean water unlocked!'};
    showMessage(msgs[score]||'Nice!');
  }
}

function spawnCan(){
  if(!running) return;
  // if slowed by mud puddle, skip spawns sometimes
  const now = Date.now();
  if(now < slowUntil && Math.random() < 0.6) return;

  const el = document.createElement('div');
  el.className = 'can';
  // decide type: good, bad (broken pipe), mud
  const obstacles = obstaclesCheckbox.checked;
  let type = 'good';
  const r = Math.random();
  if(obstacles && r>0.85) type='bad';
  else if(obstacles && r>0.75) type='mud';
  el.classList.add(type);
  el.innerHTML = `<div class="label">${type==='good'?'JERRY':'${!type?"": type}'} </div>`;
  // position
  const pad = 8;
  const gw = gameArea.clientWidth - 100 - pad;
  const gh = gameArea.clientHeight - 100 - pad;
  const x = Math.max(8, Math.floor(random(0, gw))); 
  const y = Math.max(8, Math.floor(random(40, gh)));
  el.style.left = x+'px';
  el.style.top = y+'px';

  // show animation
  gameArea.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));

  const life = Math.floor(random(lifeMin, lifeMax));
  const remove = ()=>{ if(el.parentNode) el.parentNode.removeChild(el) };

  const timeoutId = setTimeout(remove, life);

  function tapped(e){
    if(!running) return;
    el.classList.add('tap-feedback');
    setTimeout(()=>el.classList.remove('tap-feedback'),120);
    clearTimeout(timeoutId);
    remove();
    if(type==='good'){
      updateScore(1);
    } else if(type==='bad'){
      updateScore(-1);
      showMessage('Oops — broken pipe! -1');
    } else if(type==='mud'){
      showMessage('Mud puddle — slows spawns');
      slowUntil = Date.now() + 3000;
    }
  }

  el.addEventListener('click', tapped, {passive:true});
  el.addEventListener('touchstart', tapped, {passive:true});
}

function startGame(){
  if(running) return;
  score = 0; updateScore(0);
  timeLeft = parseInt(timeInput.value,10)||60;
  timerEl.textContent = timeLeft;
  running = true;
  showMessage('Go!');

  // spawn loop
  spawnTimer = setInterval(spawnCan, spawnInterval);
  // also call immediately a few times
  for(let i=0;i<3;i++) setTimeout(spawnCan,i*150);

  gameTimer = setInterval(()=>{
    timeLeft -=1;
    timerEl.textContent = timeLeft;
    // adjust spawn interval on-the-fly
    clearInterval(spawnTimer);
    spawnTimer = setInterval(spawnCan, spawnInterval);
    if(timeLeft<=0){ stopGame(); showMessage('Time — game over'); }
  },1000);
}

function stopGame(){
  running=false;
  clearInterval(spawnTimer); clearInterval(gameTimer);
  // remove any cans
  document.querySelectorAll('.can').forEach(n=>n.remove());
  showMessage(`Final score: ${score}`);
}

startBtn.addEventListener('click', ()=>{
  if(!running) startGame(); else stopGame();
  startBtn.textContent = running? 'Stop Game' : 'Start Game';
});

// basic mobile-friendly touch: allow tapping anywhere to also spawn a nearby can when idle
gameArea.addEventListener('touchstart', (e)=>{
  if(!running) return;
  // spawn a can near the touch
  const t = e.touches[0];
  const rect = gameArea.getBoundingClientRect();
  const el = document.createElement('div');
  el.className='can good show';
  el.style.left = Math.min(Math.max(8, t.clientX - rect.left - 44),'');
  el.style.top = Math.min(Math.max(40, t.clientY - rect.top - 44),'');
});
