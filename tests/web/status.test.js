import test from 'node:test';
import assert from 'node:assert/strict';
import {createStatusParser} from '../../web/status.js';
const packet=Uint8Array.from(Buffer.from('a00d0000637b2274797065223a31332c22616c6c7370616365223a31363338342c22667265657370616365223a343335322c226465766e616d65223a22222c2273697a65223a223336382c333638222c2274696d655f6d6f6465223a312c226272616e64223a307de5','hex'));
test('decodes a captured badge heartbeat, including split notifications',()=>{
 const p=createStatusParser();assert.deepEqual(p.push(packet.subarray(0,20)),[]);
 assert.deepEqual(p.push(packet.subarray(20)),[{totalBytes:16777216,freeBytes:4456448,usedBytes:12320768}]);
});
test('rejects corrupt and invalid data and resumes on the next packet',()=>{
 const p=createStatusParser(),bad=packet.slice();bad[bad.length-1]^=1;
 assert.deepEqual(p.push(bad),[]);assert.equal(p.push(packet).length,1);
});
