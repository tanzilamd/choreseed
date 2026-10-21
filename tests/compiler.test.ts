import test from 'node:test';import assert from 'node:assert/strict';
import { decodeCompilation } from '../src/providers.js';
const input={headers:['Name','Email'],instructions:'Trim Name',clarification:'',sources:[]};
const ready={outcome:'ready',title:'Trim name',operations:[{type:'trim',column:'Name',references:['instruction']}],assumptions:[]};
test('model response validation rejects invalid JSON, executable or invented steps, fields and citations',()=>{
 assert.throws(()=>decodeCompilation('{broken',input));
 for(const patch of [{operations:[{type:'javascript',code:'alert(1)',references:['instruction']}]},{operations:[{type:'trim',column:'Phone',references:['instruction']}]},{operations:[{type:'trim',column:'Name',references:['source-99']}]},{operations:[{type:'trim',column:'Name',references:['Trim Name']}]}])assert.throws(()=>decodeCompilation(JSON.stringify({...ready,...patch}),input));
 assert.equal(decodeCompilation(JSON.stringify(ready),input).outcome,'ready');
});
test('clarification and unsupported responses require actionable text; a ready label alone is insufficient',()=>{
 assert.throws(()=>decodeCompilation('{"outcome":"ready"}',input));
 assert.throws(()=>decodeCompilation('{"outcome":"needs_clarification","questions":[]}',input));
 assert.equal(decodeCompilation('{"outcome":"needs_clarification","questions":["Which key and keep rule?"]}',input).outcome,'needs_clarification');
 assert.equal(decodeCompilation('{"outcome":"unsupported","reason":"No joins."}',input).outcome,'unsupported');
});
