const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const fileInput = document.getElementById("fileInput");
const levelSelect = document.getElementById("level");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const timerEl = document.getElementById("timer");
const previewImage = document.getElementById("previewImage");

const popup = document.getElementById("popup");
const popupEmoji = document.getElementById("popupEmoji");
const popupTitle = document.getElementById("popupTitle");
const finalImage = document.getElementById("finalImage");
const scoreEl = document.getElementById("score");
const closePopup = document.getElementById("closePopup");

const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");

const bgMusic = document.getElementById("bgMusic");
const soundPick = document.getElementById("soundPick");
const soundSnap = document.getElementById("soundSnap");
const soundWin = document.getElementById("soundWin");
const soundLose = document.getElementById("soundLose");

const bgToggle = document.getElementById("bgToggle");
const sfxToggle = document.getElementById("sfxToggle");
const bgVolume = document.getElementById("bgVolume");
const sfxVolume = document.getElementById("sfxVolume");

let bgMuted = false;
let sfxMuted = false;
let bgLevel = 0.5;
let sfxLevel = 0.6;

let img = new Image();
img.src = "image.jpg";

let pieces = [];

let rows = 2;
let cols = 4;

let pieceW = 0;
let pieceH = 0;
let tabSize = 0;

let boardW = 0;
let boardH = 0;

let selected = null;
let offsetX = 0;
let offsetY = 0;

let timeLeft = 100;
let timer = null;

let gameStarted = false;
let gamePaused = false;
let gameFinished = false;

// ================= AUDIO =================
function playSfx(audio){
  if(sfxMuted) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = sfxLevel;
  audio.play().catch(()=>{});
}

function fadeBg(to=0.2){
  const target = bgMuted ? 0 : to;
  const step = (target - bgMusic.volume)/15;
  let count = 0;

  const fx = setInterval(()=>{
    bgMusic.volume += step;
    count++;

    if(count>=15){
      bgMusic.volume = target;
      clearInterval(fx);
    }
  },40);
}

document.body.addEventListener("click",()=>{
  bgMusic.volume = bgMuted ? 0 : bgLevel;
  bgMusic.play().catch(()=>{});
},{once:true});

bgVolume.addEventListener("input",e=>{
  bgLevel = +e.target.value;
  if(!bgMuted) bgMusic.volume = bgLevel;
});

sfxVolume.addEventListener("input",e=>{
  sfxLevel = +e.target.value;
});

bgToggle.addEventListener("click",()=>{
  bgMuted = !bgMuted;
  bgToggle.textContent = bgMuted ? "🔇" : "🎵";
  bgMusic.volume = bgMuted ? 0 : bgLevel;
});

sfxToggle.addEventListener("click",()=>{
  sfxMuted = !sfxMuted;
  sfxToggle.textContent = sfxMuted ? "🔇" : "🔊";
});

// ================= IMAGE =================
img.onload = ()=>{
  previewImage.src = img.src;
  fitCanvasToImage();
  draw();
};

fileInput.addEventListener("change",e=>{
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = ev=>{
    img.src = ev.target.result;
    previewImage.src = img.src;
  };

  reader.readAsDataURL(file);
});

// ================= RESPONSIVE BOARD =================
function fitCanvasToImage(){

  const maxW = Math.min(window.innerWidth*0.88,900);
  const maxH = Math.min(window.innerHeight*0.72,700);

  const ratio = img.width / img.height;

  boardW = maxW;
  boardH = boardW / ratio;

  if(boardH > maxH){
    boardH = maxH;
    boardW = boardH * ratio;
  }

  canvas.width = boardW;
  canvas.height = boardH;
}

window.addEventListener("resize",()=>{
  fitCanvasToImage();

  if(gameStarted){
    rebuildPieceLayout();
  }

  draw();
});

// ================= TIMER =================
function updateTimer(){
  timerEl.textContent = `⏱ ${timeLeft}s`;
}

function startTimer(){
  clearInterval(timer);

  timeLeft = 100;
  updateTimer();

  timer = setInterval(()=>{

    if(gamePaused || gameFinished) return;

    timeLeft--;
    updateTimer();

    if(timeLeft<=0){
      clearInterval(timer);
      loseGame();
    }

  },1000);
}

// ================= BUTTON =================
startBtn.addEventListener("click",startGame);

pauseBtn.addEventListener("click",()=>{
  if(!gameStarted || gameFinished) return;

  gamePaused = !gamePaused;
  pauseBtn.textContent = gamePaused ? "▶ Resume" : "⏸ Pause";
});

// ================= START =================
function startGame(){

  gameStarted = true;
  gamePaused = false;
  gameFinished = false;

  pauseBtn.textContent = "⏸ Pause";

  const level = +levelSelect.value;

  if(level===4){
    rows = 2;
    cols = 2;
  }else{
    rows = 2;
    cols = 4;
  }

  fitCanvasToImage();

  pieceW = boardW / cols;
  pieceH = boardH / rows;
  tabSize = Math.min(pieceW,pieceH)*0.22;

  createPieces();
  startTimer();
  draw();
}

// ================= CREATE PIECES =================
function createPieces(){

  pieces = [];

  const edges = [];

  for(let y=0;y<rows;y++){

    edges[y] = [];

    for(let x=0;x<cols;x++){

      const top = y===0 ? 0 : -edges[y-1][x].bottom;
      const left = x===0 ? 0 : -edges[y][x-1].right;
      const right = x===cols-1 ? 0 : (Math.random()>0.5?1:-1);
      const bottom = y===rows-1 ? 0 : (Math.random()>0.5?1:-1);

      edges[y][x] = {
        top,right,bottom,left
      };

      const padTop = top ? tabSize : 0;
      const padRight = right ? tabSize : 0;
      const padBottom = bottom ? tabSize : 0;
      const padLeft = left ? tabSize : 0;

      const sx = x*(img.width/cols)-padLeft;
      const sy = y*(img.height/rows)-padTop;

      const sw = img.width/cols + padLeft + padRight;
      const sh = img.height/rows + padTop + padBottom;

      const c = document.createElement("canvas");
      c.width = pieceW + padLeft + padRight;
      c.height = pieceH + padTop + padBottom;

      const pctx = c.getContext("2d");

      const px = padLeft;
      const py = padTop;

      pctx.beginPath();
      pctx.moveTo(px,py);

      drawPiecePath(
        pctx,
        px,
        py,
        pieceW,
        pieceH,
        edges[y][x]
      );

      pctx.closePath();
      pctx.clip();

      pctx.drawImage(
        img,
        sx,sy,sw,sh,
        0,0,c.width,c.height
      );

      pieces.push({
        canvas:c,
        x:Math.random()*(boardW-pieceW),
        y:Math.random()*(boardH-pieceH),
        correctX:x*pieceW,
        correctY:y*pieceH,
        padLeft,
        padTop,
        width:pieceW,
        height:pieceH,
        fixed:false
      });
    }
  }
}

// ================= PATH =================
function drawPiecePath(ctx,x,y,w,h,e){

  // top
  if(e.top===0){
    ctx.lineTo(x+w,y);
  }else{
    ctx.lineTo(x+w*0.35,y);

    ctx.bezierCurveTo(
      x+w*0.42,
      y-(tabSize*e.top),

      x+w*0.58,
      y-(tabSize*e.top),

      x+w*0.65,
      y
    );

    ctx.lineTo(x+w,y);
  }

  // right
  if(e.right===0){
    ctx.lineTo(x+w,y+h);
  }else{
    ctx.lineTo(x+w,y+h*0.35);

    ctx.bezierCurveTo(
      x+w+(tabSize*e.right),
      y+h*0.42,

      x+w+(tabSize*e.right),
      y+h*0.58,

      x+w,
      y+h*0.65
    );

    ctx.lineTo(x+w,y+h);
  }

  // bottom
  if(e.bottom===0){
    ctx.lineTo(x,y+h);
  }else{
    ctx.lineTo(x+w*0.65,y+h);

    ctx.bezierCurveTo(
      x+w*0.58,
      y+h+(tabSize*e.bottom),

      x+w*0.42,
      y+h+(tabSize*e.bottom),

      x+w*0.35,
      y+h
    );

    ctx.lineTo(x,y+h);
  }

  // left
  if(e.left===0){
    ctx.lineTo(x,y);
  }else{
    ctx.lineTo(x,y+h*0.65);

    ctx.bezierCurveTo(
      x-(tabSize*e.left),
      y+h*0.58,

      x-(tabSize*e.left),
      y+h*0.42,

      x,
      y+h*0.35
    );

    ctx.lineTo(x,y);
  }
}

// resize keep state
function rebuildPieceLayout(){
  pieceW = boardW / cols;
  pieceH = boardH / rows;
}

// ================= DRAW =================
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  pieces.forEach(piece=>{
    ctx.drawImage(
      piece.canvas,
      piece.x - piece.padLeft,
      piece.y - piece.padTop
    );
  });

  if(
    gameStarted &&
    !gameFinished &&
    pieces.length &&
    pieces.every(p=>p.fixed)
  ){
    winGame();
  }
}

// ================= GAME STATE =================
function winGame(){
  if(gameFinished) return;

  gameFinished = true;
  clearInterval(timer);
  showPopup(true);
}

function loseGame(){
  if(gameFinished) return;

  gameFinished = true;
  clearInterval(timer);
  showPopup(false);
}

// ================= POPUP =================
function showPopup(win){

  popup.classList.add("show");
  finalImage.src = img.src;

  if(win){
    popupEmoji.textContent = "🎉";
    popupTitle.textContent = "Chúc Mừng Bạn Đã Thành Công";
    scoreEl.textContent = `⭐ Điểm của bạn: ${timeLeft*10}`;

    fadeBg(0.2);
    playSfx(soundWin);
    startConfetti();

    // Sau 2 giây tự chơi ván mới
    setTimeout(()=>{
      if(popup.classList.contains("show")){
        nextGame();
      }
    },2000);

}else{

    popupEmoji.textContent = "⏱";
    popupTitle.textContent = "Rất Tiếc Bạn Đã Hết Thời Gian";
    scoreEl.textContent = "💪 Hãy thử lại nhé!";

    fadeBg(0.2);
    playSfx(soundLose);
  }
}

function nextGame(){

  popup.classList.remove("show");
  stopConfetti();

  bgMusic.volume = bgMuted ? 0 : bgLevel;

  // reset trạng thái
  selected = null;
  gameFinished = false;

  // bắt đầu ván mới
  startGame();
}

closePopup.addEventListener("click", nextGame);

// ================= DRAG MOUSE =================
canvas.addEventListener("mousedown",e=>{
  if(!gameStarted || gamePaused || gameFinished) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for(let i=pieces.length-1;i>=0;i--){

    const p = pieces[i];
    if(p.fixed) continue;

    if(
      mx>=p.x &&
      mx<=p.x+p.width &&
      my>=p.y &&
      my<=p.y+p.height
    ){
      selected = p;
      offsetX = mx-p.x;
      offsetY = my-p.y;

      pieces.splice(i,1);
      pieces.push(p);

      playSfx(soundPick);
      draw();
      break;
    }
  }
});

canvas.addEventListener("mousemove",e=>{
  if(!selected) return;

  const rect = canvas.getBoundingClientRect();

  selected.x = e.clientX - rect.left - offsetX;
  selected.y = e.clientY - rect.top - offsetY;

  draw();
});

window.addEventListener("mouseup",()=>{
  dropPiece();
});

// ================= TOUCH =================
canvas.addEventListener("touchstart",e=>{
  e.preventDefault();

  if(!gameStarted || gamePaused || gameFinished) return;

  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];

  const mx = t.clientX - rect.left;
  const my = t.clientY - rect.top;

  for(let i=pieces.length-1;i>=0;i--){

    const p = pieces[i];
    if(p.fixed) continue;

    if(
      mx>=p.x &&
      mx<=p.x+p.width &&
      my>=p.y &&
      my<=p.y+p.height
    ){
      selected = p;
      offsetX = mx-p.x;
      offsetY = my-p.y;

      pieces.splice(i,1);
      pieces.push(p);

      playSfx(soundPick);
      draw();
      break;
    }
  }
},{passive:false});

canvas.addEventListener("touchmove",e=>{
  e.preventDefault();

  if(!selected) return;

  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];

  selected.x = t.clientX - rect.left - offsetX;
  selected.y = t.clientY - rect.top - offsetY;

  draw();
},{passive:false});

window.addEventListener("touchend",()=>{
  dropPiece();
});

// ================= SNAP =================
function dropPiece(){

  if(!selected) return;

  const snap = 14;

  if(
    Math.abs(selected.x-selected.correctX)<snap &&
    Math.abs(selected.y-selected.correctY)<snap
  ){
    selected.x = selected.correctX;
    selected.y = selected.correctY;
    selected.fixed = true;

    playSfx(soundSnap);
  }

  selected = null;
  draw();
}

// ================= CONFETTI =================
let confetti = [];
let confettiAnim = null;

function startConfetti(){

  confettiCanvas.width = popup.clientWidth;
  confettiCanvas.height = popup.clientHeight;

  confetti = [];

  for(let i=0;i<120;i++){
    confetti.push({
      x:Math.random()*confettiCanvas.width,
      y:Math.random()*-confettiCanvas.height,
      w:6+Math.random()*8,
      h:10+Math.random()*14,
      vy:2+Math.random()*4,
      vx:-2+Math.random()*4,
      rot:Math.random()*360
    });
  }

  cancelAnimationFrame(confettiAnim);
  animateConfetti();
}

function animateConfetti(){

  confettiCtx.clearRect(
    0,0,
    confettiCanvas.width,
    confettiCanvas.height
  );

  confetti.forEach(c=>{

    c.x += c.vx;
    c.y += c.vy;
    c.rot += 5;

    if(c.y>confettiCanvas.height){
      c.y = -20;
    }

    confettiCtx.save();
    confettiCtx.translate(c.x,c.y);
    confettiCtx.rotate(c.rot*Math.PI/180);

    const colors=[
      "#00f7ff",
      "#ffdd00",
      "#ff4fd8",
      "#7dff72",
      "#ffffff"
    ];

    confettiCtx.fillStyle =
      colors[Math.floor(Math.random()*colors.length)];

    confettiCtx.fillRect(
      -c.w/2,
      -c.h/2,
      c.w,
      c.h
    );

    confettiCtx.restore();
  });

  confettiAnim = requestAnimationFrame(animateConfetti);
}

function stopConfetti(){
  cancelAnimationFrame(confettiAnim);

  confettiCtx.clearRect(
    0,0,
    confettiCanvas.width,
    confettiCanvas.height
  );
}

// ================= INIT =================
fitCanvasToImage();
draw();