/* STARS OF BLOOD - music engine (lifted from the reference player, UI stripped,
   shares the game AudioContext and master bus). Plays any STARS_OF_BLOOD track/stinger. */
(function(){
"use strict";
var M = STARS_OF_BLOOD;
var ac=null, out=null, delaySend, delayNode, reverbSend, noiseBuf;
function ensure(acIn, outIn){
  if (ac) return;
  ac = acIn; out = outIn;
  delaySend = ac.createGain();
  delayNode = ac.createDelay(2); delayNode.delayTime.value = 0.32;
  var dfb = ac.createGain(); dfb.gain.value = 0.35;
  var dlp = ac.createBiquadFilter(); dlp.type = "lowpass"; dlp.frequency.value = 2400;
  delaySend.connect(delayNode); delayNode.connect(dlp); dlp.connect(dfb); dfb.connect(delayNode);
  delayNode.connect(out);
  reverbSend = ac.createGain();
  var conv = ac.createConvolver();
  var rate = ac.sampleRate, len = rate*2.2;
  var ir = ac.createBuffer(2, len, rate);
  for (var c=0;c<2;c++){ var d=ir.getChannelData(c);
    for (var i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4); }
  conv.buffer = ir;
  reverbSend.connect(conv); conv.connect(out);
  noiseBuf = ac.createBuffer(1, rate, rate);
  var nd = noiseBuf.getChannelData(0);
  for (var j=0;j<nd.length;j++) nd[j]=Math.random()*2-1;
}
function midi(name){ var m=/^([A-G])(#|b)?(-?\d)$/.exec(name);
  var base={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]];
  if(m[2]==="#")base++; if(m[2]==="b")base--;
  return (parseInt(m[3],10)+1)*12+base; }
function freq(name){ return 440*Math.pow(2,(midi(name)-69)/12); }
var lastFreq = {};
function tone(p,name,t,dur,vel){
  var g=ac.createGain(); g.connect(out);
  if (p.send&&p.send.delay){ var ds=ac.createGain(); ds.gain.value=p.send.delay; g.connect(ds); ds.connect(delaySend); }
  if (p.send&&p.send.reverb){ var rs=ac.createGain(); rs.gain.value=p.send.reverb; g.connect(rs); rs.connect(reverbSend); }
  var dest=g;
  if (p.cutoff){ var f=ac.createBiquadFilter(); f.type="lowpass";
    f.frequency.setValueAtTime(p.cutoff,t);
    if (p.filterEnv){ var f0=p.cutoff*Math.pow(2,p.filterEnv);
      f.frequency.setValueAtTime(Math.max(60,f0),t);
      f.frequency.exponentialRampToValueAtTime(p.cutoff,t+Math.max(0.08,dur*0.5)); }
    f.Q.value=p.q||1; f.connect(g); dest=f; }
  var peak=p.gain*(vel||1), atk=p.attack||0.005, rel=p.release||0.2, sus=p.sustain==null?0.8:p.sustain;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(peak,t+atk);
  if (sus>0){ g.gain.linearRampToValueAtTime(peak*sus,t+atk+0.06);
    g.gain.setValueAtTime(peak*sus,Math.max(t+atk+0.06,t+dur));
    g.gain.linearRampToValueAtTime(0.0001,t+dur+rel); }
  else g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(dur,rel));
  var stop=t+dur+rel+0.1, fq=freq(name);
  var oscs=[{type:p.osc,ratio:1,detune:0,mix:1}];
  if (p.osc2) oscs.push({type:p.osc2.type,ratio:p.osc2.ratio||1,detune:p.osc2.detune||0,mix:p.osc2.mix||0.5});
  oscs.forEach(function(o){
    var osc=ac.createOscillator(); osc.type=o.type;
    osc.frequency.setValueAtTime(fq*o.ratio,t);
    if (o.detune) osc.detune.value=o.detune;
    if (p.glide && lastFreq[p.patchName] && p.patchName.indexOf("Lead")>=0){
      osc.frequency.setValueAtTime(lastFreq[p.patchName]*o.ratio,t);
      osc.frequency.exponentialRampToValueAtTime(fq*o.ratio,t+p.glide); }
    if (p.vibrato){ var lfo=ac.createOscillator(), lg=ac.createGain();
      lfo.frequency.value=p.vibrato.rate;
      lg.gain.value=fq*(Math.pow(2,p.vibrato.depth/1200)-1);
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t+0.05); lfo.stop(stop); }
    var og=ac.createGain(); og.gain.value=o.mix;
    osc.connect(og); og.connect(dest);
    osc.start(t); osc.stop(stop);
  });
  lastFreq[p.patchName]=fq;
}
function drum(p,t,vel){
  if (p.drum==="kick"){ var o=ac.createOscillator(), g=ac.createGain();
    o.frequency.setValueAtTime(p.from,t);
    o.frequency.exponentialRampToValueAtTime(p.to,t+p.sweep);
    g.gain.setValueAtTime(p.gain*(vel||1),t);
    g.gain.exponentialRampToValueAtTime(0.001,t+p.decay);
    o.connect(g); g.connect(out); o.start(t); o.stop(t+p.decay+0.05);
  } else { var s=ac.createBufferSource(); s.buffer=noiseBuf;
    var f=ac.createBiquadFilter(); f.type="highpass"; f.frequency.value=p.hp;
    var g2=ac.createGain();
    g2.gain.setValueAtTime(p.gain*(vel||1),t);
    g2.gain.exponentialRampToValueAtTime(0.001,t+p.decay);
    s.connect(f); f.connect(g2); g2.connect(out);
    s.start(t); s.stop(t+p.decay+0.05); }
}
var playing=null, timer=null;
function play(key){
  if (!ac) return;
  stop();
  var tr=M.tracks[key]||M.stingers[key]; if(!tr) return;
  var isStinger=!!M.stingers[key];
  var stepDur=60/tr.bpm/4, events=[];
  tr.parts.forEach(function(part){
    var p=M.patches[part.patch]; p.patchName=part.patch;
    part.notes.forEach(function(n){ events.push({step:n[0],p:p,name:n[1],dur:n[2],vel:n[3]}); });
  });
  events.sort(function(a,b){return a.step-b.step;});
  var loopDur=tr.loopSteps*stepDur;
  playing={t0:ac.currentTime+0.08,evIdx:0,loop:0};
  timer=setInterval(function(){
    var horizon=ac.currentTime+0.15;
    for(;;){
      var e=events[playing.evIdx];
      if(!e){ if(isStinger) return; playing.evIdx=0; playing.loop++; continue; }
      var et=playing.t0+playing.loop*loopDur+e.step*stepDur;
      if(et>horizon) break;
      if(e.p.kind==="drum") drum(e.p,et,e.vel); else tone(e.p,e.name,et,e.dur*stepDur,e.vel);
      playing.evIdx++;
    }
  },30);
}
function stop(){ if(timer) clearInterval(timer); timer=null; playing=null; }
window.SOBMusic={init:ensure, play:play, stop:stop, key:null,
  track:function(k){ if(this.key!==k){ this.key=k; play(k); } }};
})();
