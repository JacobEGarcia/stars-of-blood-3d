/* STARS OF BLOOD - audio: synthesized SFX + generative score. No samples. */
(function(){
const A = {
  ctx:null, master:null, music:null, sfx:null, muted:false, started:false,
  mode:'title', // title | field | combat | port
  _seqTimer:null, _step:0,

  init(){
    if (A.started) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    A.ctx = new C();
    A.master = A.ctx.createGain(); A.master.gain.value = .8; A.master.connect(A.ctx.destination);
    A.sfx = A.ctx.createGain(); A.sfx.gain.value = .9; A.sfx.connect(A.master);
    A.music = A.ctx.createGain(); A.music.gain.value = .34; A.music.connect(A.master);
    A.started = true;
    A._noise = A._makeNoise();
    A.loadSamples();
    window.SOBMusic.init(A.ctx, A.music);
    A.mode = 'title';
    window.SOBMusic.track('title');
  },
  resume(){ if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); },
  shieldHit(){ if(!A.started) return; if(A._sfx('hit_shield',.7)) return; A.hit(); },
  dockUndock(){ A._sfx('dock_undock',.9); },
  mineArm(){ A._sfx('mine_arm',.6); },
  mineDetonate(){ A._sfx('mine_detonate',.9); },
  latch(){ A._sfx('harvester_latch',.9); },
  turretDie(){ A._sfx('turret_die',.8); },
  shieldDown(){ A._sfx('shield_down',1); },
  boost(){ A._sfx('engine_boost',.7); },
  shopBuy(){ A._sfx('shop_buy',.8); },
  missileLock(){ A._sfx('missile_lock',.6); },
  toggleMute(){ A.muted = !A.muted; if (A.master) A.master.gain.value = A.muted ? 0 : .8; return A.muted; },

  _makeNoise(){
    const len = A.ctx.sampleRate * 1.2, buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = Math.random()*2-1;
    return buf;
  },

  /* ---------- sample layer (audio-lane pack; synth stays as fallback) ---------- */
  samples:{}, _musicSrc:null, _musicKey:null,
  MUSIC_FILES:{ title:'title', freeport:'freeport_dock',
    combat_ch1:'combat_ch1', combat_ch2:'combat_ch2', combat_ch3:'combat_ch3',
    boss_tithe:'boss_tithe', boss_final:'boss_final',
    planet:'planet_surface', planet_combat:'combat_planet', boss_vault:'boss_vault',
    gallery:'gallery_ambient' },
  loadSamples(){
    const all=['title','freeport_dock','combat_ch1','combat_ch2','combat_ch3','boss_tithe','boss_final',
      'planet_surface','combat_planet','boss_vault','gallery_ambient',
      'planet_descent','orbit_ascent','vault_crack',
      'furnace_die','wind_gust','gallery_open','art_zoom','ui_back',
      'mission_complete','mission_failed','chapter_complete','player_death',
      'laser_player','laser_enemy','hit_hull','hit_shield','explosion_small','explosion_big',
      'missile_launch','missile_lock','cargo_pickup','dock_engage','dock_undock','shop_buy',
      'ui_move','ui_confirm','alarm_port','engine_boost','mine_arm','mine_detonate',
      'harvester_latch','turret_die','shield_down'];
    const tryLoad=(n,attempt)=>{
      fetch('assets/audio/'+n+'.ogg')
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b=>A.ctx.decodeAudioData(b))
      .then(buf=>{ A.samples[n]=buf;
        if(A.MUSIC_FILES[A._trackFor(A.mode)]===n) A._playMusic(A.mode); })
      .catch(()=>{ if(attempt<3) setTimeout(()=>tryLoad(n,attempt+1), 600*Math.pow(3,attempt-1));
        else A.samples[n]=null; }); };
    all.forEach(n=>tryLoad(n,1));
  },
  _sfx(n, vol){ const b=A.samples[n]; if(!b) return false;
    const s=A.ctx.createBufferSource(); s.buffer=b;
    const g=A.ctx.createGain(); g.gain.value=vol||1;
    s.connect(g); g.connect(A.sfx); s.start(); return true; },
  _playMusic(mode){
    const track=A._trackFor(mode), file=A.MUSIC_FILES[track], buf=file&&A.samples[file];
    if(buf){
      window.SOBMusic.stop(); window.SOBMusic.key=track;
      if(A._musicKey===track && A._musicSrc) return;
      if(A._musicSrc){ try{A._musicSrc.stop();}catch(e){} A._musicSrc=null; }
      const s=A.ctx.createBufferSource(); s.buffer=buf; s.loop=true;
      s.connect(A.music); s.start(); A._musicSrc=s; A._musicKey=track;
    } else {
      if(A._musicSrc){ try{A._musicSrc.stop();}catch(e){} A._musicSrc=null; A._musicKey=null; }
      window.SOBMusic.track(track);
    }
  },

  /* ---------- SFX ---------- */
  _env(g, t, a, peak, dec){ g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+a);
    g.gain.exponentialRampToValueAtTime(.0001,t+a+dec); },
  _osc(type, f0, t, dur, f1){
    const o = A.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0,t);
    if (f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1), t+dur);
    o.start(t); o.stop(t+dur+.02); return o;
  },
  _noiseSrc(t, dur){ const s = A.ctx.createBufferSource(); s.buffer = A._noise; s.loop = true;
    s.start(t); s.stop(t+dur+.05); return s; },

  laser(){ if(!A.started) return; if(A._sfx('laser_player',.55)) return; const t=A.ctx.currentTime, g=A.ctx.createGain();
    A._env(g,t,.004,.16,.09); A._osc('square', 880+Math.random()*220, t, .1, 220).connect(g);
    g.connect(A.sfx); },
  enemyLaser(){ if(!A.started) return; if(A._sfx('laser_enemy',.4)) return; const t=A.ctx.currentTime, g=A.ctx.createGain();
    A._env(g,t,.004,.10,.12); A._osc('sawtooth', 420, t, .12, 90).connect(g); g.connect(A.sfx); },
  hit(){ if(!A.started) return; const t=A.ctx.currentTime, g=A.ctx.createGain();
    A._env(g,t,.002,.22,.07); const n=A._noiseSrc(t,.09); const f=A.ctx.createBiquadFilter();
    f.type='bandpass'; f.frequency.value=2400; n.connect(f); f.connect(g); g.connect(A.sfx); },
  hullHit(){ if(!A.started) return; if(A._sfx('hit_hull',.8)) return; const t=A.ctx.currentTime, g=A.ctx.createGain();
    A._env(g,t,.003,.34,.24); A._osc('triangle', 140, t, .26, 40).connect(g);
    const n=A._noiseSrc(t,.2); const f=A.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
    n.connect(f); f.connect(g); g.connect(A.sfx); },
  boom(big){ if(!A.started) return;
    if(big){ if(A._sfx('explosion_big',1)){ A.duck(2.5); return; } }
    else if(A._sfx('explosion_small',.9)) return; const t=A.ctx.currentTime, g=A.ctx.createGain();
    const dec = big ? 1.4 : .55;
    A._env(g,t,.005, big ? .6 : .32, dec);
    A._osc('sine', big?90:120, t, dec, 24).connect(g);
    const n=A._noiseSrc(t,dec); const f=A.ctx.createBiquadFilter(); f.type='lowpass';
    f.frequency.setValueAtTime(big?2600:1800,t); f.frequency.exponentialRampToValueAtTime(120,t+dec);
    n.connect(f); f.connect(g); g.connect(A.sfx); },
  pickup(){ if(!A.started) return; if(A._sfx('cargo_pickup',.8)) return; const t=A.ctx.currentTime, g=A.ctx.createGain();
    A._env(g,t,.005,.14,.22); A._osc('sine', 520, t, .1, 1040).connect(g);
    const g2=A.ctx.createGain(); A._env(g2,t+.09,.005,.11,.18);
    A._osc('sine', 780, t+.09, .1, 1560).connect(g2); g.connect(A.sfx); g2.connect(A.sfx); },
  missile(){ if(!A.started) return; if(A._sfx('missile_launch',.8)) return; const t=A.ctx.currentTime, g=A.ctx.createGain();
    A._env(g,t,.02,.16,.5); const n=A._noiseSrc(t,.5); const f=A.ctx.createBiquadFilter();
    f.type='bandpass'; f.frequency.setValueAtTime(600,t); f.frequency.exponentialRampToValueAtTime(2400,t+.5);
    n.connect(f); f.connect(g); g.connect(A.sfx); },
  dock(){ if(!A.started) return; if(A._sfx('dock_engage',.9)) return; const t=A.ctx.currentTime;
    [220,277,330,440].forEach((fr,i)=>{ const g=A.ctx.createGain();
      A._env(g,t+i*.12,.01,.14,.5); A._osc('triangle', fr, t+i*.12, .5).connect(g); g.connect(A.sfx); }); },
  uiClick(){ if(!A.started) return; if(A._sfx('ui_confirm',.5)) return; const t=A.ctx.currentTime, g=A.ctx.createGain();
    A._env(g,t,.003,.1,.06); A._osc('square', 660, t, .07, 660).connect(g); g.connect(A.sfx); },
  alarm(){ if(!A.started) return; if(A._sfx('alarm_port',.7)) return; const t=A.ctx.currentTime;
    for(let i=0;i<3;i++){ const g=A.ctx.createGain(); A._env(g,t+i*.24,.01,.12,.2);
      A._osc('sawtooth', 320, t+i*.24, .2, 280).connect(g); g.connect(A.sfx); } },

  /* ---------- score (STARS_OF_BLOOD data via SOBMusic engine) ---------- */
  _trackFor(mode){
    if (A._gallery) return 'gallery';
    if (A._mi===8){ // THE SAND TITHE: planetary soundscape
      if (mode==='combat') return (A._phase>=2) ? 'boss_vault' : 'planet_combat';
      return 'planet';
    }
    if (mode==='port') return 'freeport';
    if (mode==='combat'){
      if (A._mi===2) return 'boss_tithe';
      if (A._mi===9) return 'boss_final';
      const ch = A._mi==null ? 1 : A._mi<3 ? 1 : A._mi<6 ? 2 : 3;
      return 'combat_ch'+ch;
    }
    return 'title';
  },
  setMission(mi){ A._mi=mi; A._phase=1; if (A.started) A._playMusic(A.mode); },
  setPhase(p){ if (A._phase!==p){ A._phase=p; if (A.started) A._playMusic(A.mode); } },
  gallery(on){ A._gallery=on; if (A.started) A._playMusic(A.mode); },
  windGust(){ A._sfx('wind_gust',.5); },
  furnaceDie(){ A._sfx('furnace_die',.9); },
  galleryOpen(){ A._sfx('gallery_open',.8); },
  artZoom(){ A._sfx('art_zoom',.7); },
  uiBack(){ A._sfx('ui_back',.6); },
  duck(sec){ if(!A.started) return; const t=A.ctx.currentTime;
    A.music.gain.cancelScheduledValues(t); A.music.gain.setValueAtTime(.12,t);
    A.music.gain.linearRampToValueAtTime(.34,t+(sec||2.5)); },
  setMode(m){
    if (A.mode === m || !A.started) { A.mode = m; return; }
    A.mode = m;
    A._playMusic(m);
  },
  stinger(name){
    if (!A.started) return;
    const f={victory:'mission_complete',failed:'mission_failed',death:'player_death',chapter:'chapter_complete',descent:'planet_descent',ascent:'orbit_ascent',vaultcrack:'vault_crack'}[name];
    if (f && A.samples[f]){ A.duck(3); A._sfx(f,1); return; }
    window.SOBMusic.key = null; // force restart path
    window.SOBMusic.play(name);
    // after stinger, hand back to the mode track
    const dur = name==='death' ? 4.5 : 3.2;
    setTimeout(()=>{ if (A.started){ window.SOBMusic.key = null; A._musicKey=null; A._playMusic(A.mode); } }, dur*1000);
  }
};
window.SOBAudio = A;
})();
