// Run: node tests/save-image.cjs (requires Playwright and Chromium).
const {chromium}=require('playwright');
const assert=require('node:assert/strict'), http=require('node:http'), fs=require('node:fs');
(async()=>{
 const server=http.createServer(require('./serve.cjs')).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const fields=page.locator('input[data-key]');assert.equal(await fields.count(),30);
  for(let i=0;i<30;i++)await fields.nth(i).fill(i?'123456':'圖片驗收');
  const values=await fields.evaluateAll(xs=>xs.map(x=>x.value));
  const storage=await page.evaluate(()=>localStorage.getItem('protection_triangle_reference_v6'));
  for(const mode of ['shown','hidden']){
   if(mode==='hidden'){
    await page.getByRole('button',{name:'顯示／隱藏講解註解'}).click();
    await page.setViewportSize({width:390,height:844});
   }
   // Verify the actual cloned export document contains every current input value.
   await page.evaluate(()=>{
    const render=window.html2canvas;
    window.html2canvas=(element,options)=>render(element,{...options,onclone(doc){
     options.onclone(doc);
     window.exportedValues=[...doc.querySelectorAll('input[data-key]')].map(x=>x.value);
     window.exportedNotesHidden=doc.body.classList.contains('hide-notes');
     window.serializedValues=[...doc.querySelectorAll('input[data-key]')].map(x=>x.getAttribute('value'));
    }});
   });
   const downloadPromise=page.waitForEvent('download');
   await page.getByRole('button',{name:'儲存圖片',exact:true}).click();
   const download=await downloadPromise;
   assert.equal(download.suggestedFilename(),'保障金三角_圖片驗收.png');
   const file='/tmp/insurance-export-'+mode+'.png';await download.saveAs(file);
   const png=fs.readFileSync(file);
   assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
   assert.equal(png.readUInt32BE(16),2800);assert.equal(png.readUInt32BE(20),1850);
   assert.deepEqual(await page.evaluate(()=>window.exportedValues),values);
   assert.deepEqual(await page.evaluate(()=>window.serializedValues),values);
   assert.equal(await page.evaluate(()=>window.exportedNotesHidden),mode==='hidden');
   assert.deepEqual(await fields.evaluateAll(xs=>xs.map(x=>x.value)),values);
   assert.equal(await page.evaluate(()=>localStorage.getItem('protection_triangle_reference_v6')),storage);
   assert.equal(await page.getByRole('button',{name:'儲存圖片',exact:true}).isEnabled(),true);
   console.log('PASS',mode,'PNG 2800x1850; all 30 values preserved; filename and UI recovery');
  }
  assert.equal(requests.every(url=>url.startsWith('http://127.0.0.1:')),true);
  await page.evaluate(()=>window.html2canvas=()=>Promise.reject(new Error('test failure')));
  const dialogPromise=page.waitForEvent('dialog');
  const clicking=page.getByRole('button',{name:'儲存圖片',exact:true}).click();
  const dialog=await dialogPromise;assert.match(dialog.message(),/儲存失敗/);await dialog.dismiss();await clicking;
  assert.equal(await page.getByRole('button',{name:'儲存圖片',exact:true}).isEnabled(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS export failure recovers button; no remote requests or JavaScript errors');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
