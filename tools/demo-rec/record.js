// Sentinel demo recorder (tiny, byte-gated). Proof-only: boots the REAL
// deployed app under the REAL bundled chromium-1234 chrome.exe with a
// context-video recorder, plays the hotkey story, then leaves out/*.webm.
// Voice-over is narrated separately from timeline.json.
const fs=require('fs');const os=require('os');const path=require('path');
const OUT=path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
const WROOT='C:/Users/Sanju/Projects/sentinel-prototype';
const CACHE=path.join(os.homedir(),'AppData','Local','ms-playwright');
function chrome(){
  const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap((e)=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p];});
  const dirs=fs.readdirSync(CACHE).filter((d)=>/^chromium-(\d+)$/i.test(d)&&!/-headless/i.test(d));
  for(const d of dirs){const exe=walk(path.join(CACHE,d)).find((p)=>/chrome\.exe$/i.test(p));if(exe)return exe;}
  const sh=fs.readdirSync(CACHE).filter((d)=>/chromium_headless_shell/i.test(d));
  for(const d of sh){const exe=walk(path.join(CACHE,d)).find((p)=>/headless_shell.*\.exe$/i.test(p));if(exe)return exe;}
  throw new Error('no chrome.exe in ms-playwright cache');
}
const pw=require('playwright-core');
const exe=chrome();
(async()=>{
  console.log('chromium:',exe);
  const browser=await pw.chromium.launch({executablePath:exe,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--lang=en-US']});
  const context=await browser.newContext({viewport:{width:1280,height:800},locale:'en-US',
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0+Safari/537.36 SentinelDemoRec',
    recordVideo:{dir:OUT,size:{width:1280,height:800}}});
  const page=await context.newPage();
  const t0=Date.now();const tl=[];const stamp=()=>((Date.now()-t0)/1000).toFixed(2);
  const mark=(m)=>{const t=stamp();tl.push({t:+t,label:m});console.log('['+t+'s] '+m);};
  page.on('console',(m)=>{const s=(m.text()||'').trim();
    if(/sentinel|silent|guide|navig|meters|nudge|arriv|keys|EXIT|cafe|speak/i.test(s)){console.log('   (voice) '+s.slice(0,110));}});
  const LIVE='https://sanju-zxt.github.io/sentinel-prototype/';
  await page.goto(LIVE,{waitUntil:'load'});await page.waitForTimeout(600);
  mark('boot: Sentinel says hello, then silence');
  await page.waitForTimeout(2600);
  mark('silence-first intro breathes (perception filter watches the plaza)');
  await page.keyboard.press('0');
  mark("press '0' -> AUTO TOUR: Sentinel walks itself through the plaza, hands-free");
  await page.waitForTimeout(7200);mark('. stop: crosswalk (spoken)');
  await page.waitForTimeout(6400);mark('. stop: nearest EXIT');
  await page.waitForTimeout(6400);mark('. stop: the keys POI (Memory Palace)');
  await page.waitForTimeout(6400);mark('. stop: the cafe');
  await page.waitForTimeout(6400);mark('. loop-close re-anchor, tour auto-ends');
  await page.keyboard.press('n');
  mark("press 'N' -> guided turn-by-turn: nearest landmark, spoken side+distance");
  await page.waitForTimeout(6200);mark(". nudge 'turn right — the cafe, 32 meters'");
  await page.waitForTimeout(6400);mark('. arrival announced, guide stops');
  const btn=page.locator('#voice-toggle');
  if(await btn.count()){
    await btn.evaluate((el)=>{el.click();});
    mark('🎙️ VOICE one-shot listen (headless DOM-click — graceful; keyboard always works)');
    await page.waitForTimeout(2500);}
  await page.keyboard.press('5');
  mark("type '5' (what voice routing would send) -> demo 5: Memory Palace");
  await page.waitForTimeout(4200);mark('. Memory Palace: spoken landmark + Memory chip');
  await page.waitForTimeout(2000);
  await context.close();await browser.close();
  const vid=fs.readdirSync(OUT).find((f)=>/\.webm$/i.test(f));
  fs.writeFileSync(path.join(OUT,'timeline.json'),JSON.stringify({video:vid,timeline:tl},null,2));
  console.log('DONE video='+vid+' marks='+tl.length);
  for(const e of tl) console.log('   '+e.t+'s  '+e.label);
})().catch((e)=>{console.error('RECORD FAIL',e);process.exit(1);});