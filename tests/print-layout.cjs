// Run with: node tests/print-layout.cjs (requires Playwright and Chromium).
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fs.readFileSync('index.html'))}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const fields=page.locator('input[data-key]');assert.equal(await fields.count(),30);
  for(let i=0;i<30;i++)await fields.nth(i).fill(i?'123456':'列印測試');
  const saved=await fields.evaluateAll(xs=>xs.map(x=>x.value));
  for(const mode of ['shown','hidden']){
   if(mode==='hidden')await page.getByRole('button',{name:'顯示／隱藏講解註解'}).click();
   await page.emulateMedia({media:'print'});
   const rects=await page.evaluate(()=>{
    const r=s=>{const a=document.querySelector(s).getBoundingClientRect();return {width:a.width,height:a.height}};
    return {canvas:r('.page'),stage:r('.stage'),position:getComputedStyle(document.querySelector('.viewport')).position};
   });
   assert.equal(rects.position,'fixed');
   assert.ok(rects.canvas.width<=rects.stage.width&&rects.canvas.height<=rects.stage.height);
   for(const scale of [1]){
    const pdf=await page.pdf({format:'A4',landscape:true,preferCSSPageSize:true,scale,printBackground:true});
    assert.equal([...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length,1);
    const text=require('node:child_process').execFileSync('pdftotext',['-','-'],{input:pdf,encoding:'utf8'});
    assert.equal((text.match(/123456/g)||[]).length,29);
    assert.deepEqual(await fields.evaluateAll(xs=>xs.map(x=>x.value)),saved);
    console.log('PASS',mode,'A4 landscape one page; scale',scale);
   }
   await page.emulateMedia({media:'screen'});
  }
  assert.deepEqual(errors,[]);
  assert.equal(fs.readFileSync('index.html','utf8'),fs.readFileSync('保障金三角_依照公版_修正版.html','utf8'));
  console.log('PASS 30 fields unchanged; both HTML entry points match; no JavaScript errors');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
