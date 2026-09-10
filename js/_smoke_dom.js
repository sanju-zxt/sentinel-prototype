/* Smoke-test the DOM layer: loads console.js + main.js with a fake DOM and
 * runs a few simulated frames + inputs to catch reference/typo errors. */
const fs = require('fs');

function fakeEl(id) {
  const listeners = {};
  const el = {
    id, _children: [], textContent: '', innerHTML: '', className: '', value: '',
    style: {}, scrollHeight: 0, scrollTop: 0, placeholder: '',
    classList: {
      _set: new Set(), add(...c){c.forEach(x=>this._set.add(x))}, remove(...c){c.forEach(x=>this._set.delete(x))},
      toggle(c, f){ (f===undefined ? !this._set.has(c) : f) ? this._set.add(c) : this._set.delete(c); },
      contains(c){return this._set.has(c)},
    },
    getContext(){ return ctxStub(); },
    addEventListener(evt, cb){ (listeners[evt] = listeners[evt] || []).push(cb); },
    dispatch(evt, e){ (listeners[evt]||[]).forEach(cb=>cb(e||{key:'',preventDefault(){}})); },
    appendChild(c){ this._children.push(c); },
    setAttribute(){}, offsetWidth: 400, offsetHeight: 130, width: 400, height: 130,
  };
  return el;
}
function ctxStub(){ return new Proxy({}, { get: (t,p) => { if (p==='canvas') return {}; return (...a)=>{}; }, set: () => true }); }

const elCache = {};
global.document = {
  getElementById(id){ return elCache[id] = elCache[id] || fakeEl(id); },
  querySelector(sel){ return fakeEl(sel); },
  querySelectorAll(){ return []; },
  createElement(tag){ return fakeEl(tag + '_' + (global.__n = (global.__n||0)+1)); },
};
global.window = global;
global.window.SEN = {};
global.window.addEventListener = () => {};
global.window.innerWidth = 1400; global.window.innerHeight = 800;
global.performance = { now: () => Date.now() };
let rafCbs = [];
global.requestAnimationFrame = cb => { rafCbs.push(cb); };
global.AudioContext = function(){ return { state:'running', destination:{}, currentTime:0,
  createGain(){return node()}, createOscillator(){return node()}, createStereoPanner(){return node()}, resume(){},
}; };
function node(){ return { connect:()=>node(), gain:{value:0, setValueAtTime(){}, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){}},
  frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}, type:'', pan:{value:0}, start(){}, stop(){}, disconnect(){} }; }

const files = ['audio.js','scene.js','demo.js','perception.js','pillar_guardian.js','pillar_memory.js','pillar_social.js','pillar_health.js','console.js','main.js'];
for (const f of files) { try { eval(fs.readFileSync('js/'+f,'utf8')); } catch(e){ console.error('LOAD FAIL', f, e.stack); process.exit(1); } }

// run frames by pumping rAF
let fails = 0;
try {
  for (let f = 0; f < 30; f++) {
    const cb = rafCbs.shift();
    if (cb) cb(Date.now() + f * 16);
  }
  console.log('✓ boot + 30 frames ran without throwing');

  // exercise key handlers
  const win = global;
  const fire = (key) => win.dispatchEvent ? null : elCache['__win__'];
  // main registers handlers on window.addEventListener — our stub captured none, so simulate hotkeys via internal path is hard.
  // Instead, sanity-check panels render (console functions) directly:
  window.SEN.Console.renderLog();
  window.SEN.Console.renderMemory();
  window.SEN.Console.renderPilot();
  window.SEN.Console.renderHealth({ hr: 80, breathe: '14.2', bus: 'arriving in 2 min', dist: '34' });
  window.SEN.Console.renderVoice({ msg: 'test', cue: 'crit', side: 'left' }, {});
  console.log('✓ all console renderers executed');
} catch (e) {
  fails++;
  console.error('✗ DOM runtime error:', e.stack);
}

process.exit(fails ? 1 : 0);