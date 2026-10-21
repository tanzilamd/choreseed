import test from 'node:test';import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';import { tmpdir } from 'node:os';import { join } from 'node:path';
import { Ledger } from '../src/ledger.js';
test('atomic concurrency, failed/uncertain accounting and budget exhaustion',()=>{
  const l=new Ledger(':memory:',.3,1);const a=l.reserve('compile','s','i',.15);
  assert.throws(()=>l.reserve('compile','s2','i2',.15),/already running/);l.finish(a);
  const b=l.reserve('compile','s2','i2',.15);l.finish(b);
  assert.equal(l.status().aiAccountedUsd,.3);assert.throws(()=>l.reserve('compile','s3','i3',.15),/exhausted/);
  const c=l.reserve('browser','s','i',1);l.finish(c,1);assert.throws(()=>l.reserve('browser','s2','i2',1),/exhausted/);l.close();
});
test('3/day per session and 3/hour per IP, with separate browser limits',()=>{
 let now=Date.UTC(2026,9,22);const l=new Ledger(':memory:',4,55,()=>now);
 for(let i=0;i<3;i++){const a=l.reserve('compile','s','i'+i,.15);l.finish(a,.001);}
 assert.throws(()=>l.reserve('compile','s','newip',.15),/paused/);
 for(let i=0;i<3;i++){const a=l.reserve('compile','other'+i,'sameip',.15);l.finish(a,.001);}
 assert.throws(()=>l.reserve('compile','new','sameip',.15),/paused/);
 now+=3600001;const a=l.reserve('compile','new','sameip',.15);l.finish(a,0);l.close();
});
test('restart retains quota and full pending reservation; an anomalous cost pauses AI',()=>{
 const dir=mkdtempSync(join(tmpdir(),'choreseed-'));const path=join(dir,'ledger.sqlite');
 let l=new Ledger(path);l.reserve('compile','s','i',.15);l.close();l=new Ledger(path);
 assert.equal(l.status().aiAccountedUsd,.15);const row=l.db.prepare('SELECT state FROM attempts').get() as any;assert.equal(row.state,'uncertain');
 const a=l.reserve('compile','s2','i2',.15);l.finish(a,.2);assert.equal(l.status().accountingPaused,true);assert.throws(()=>l.reserve('compile','s3','i3',.15),/accounting anomaly/);l.close();rmSync(dir,{recursive:true});
});
