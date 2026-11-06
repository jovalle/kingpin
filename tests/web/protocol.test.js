import test from 'node:test';
import assert from 'node:assert/strict';
import {frame, packetize, stillContainer, animationContainer, envelope} from '../../web/protocol.js';
const hex = b => Buffer.from(b).toString('hex');
test('observed packet header and checksum', () => {
 assert.equal(hex(frame(6,41,0,new Uint8Array())), 'f106002900000000e0');
 const parts = packetize(5,new Uint8Array([1,2,3,4,5]),12);
 assert.equal(parts.length,2); assert.equal(hex(parts[0].slice(0,8)),'f105000200010003');
 assert.ok(parts.every(p => p.reduce((a,b)=>a+b,0)%256===0));
});
test('observed image and animation containers', () => {
 const jpg=Uint8Array.of(255,216,255,217);
 const still=stillContainer(jpg); assert.equal(hex(still.slice(0,12)),'494d42000400000024000000');
 const anim=animationContainer([jpg,jpg]); const v=new DataView(anim.buffer);
 assert.equal(v.getUint32(0,true),0x12345678); assert.equal(v.getUint32(4,true),56); assert.equal(v.getUint32(8,true),2); assert.equal(v.getUint32(44,true),64); assert.equal(v.getUint32(68,true),100); assert.equal(v.getUint32(104,true),64);
 assert.equal(new TextDecoder().decode(envelope(5,Uint8Array.of(42))),'{"type":5,"data":*}');
});
test('rejects unsupported oversized packet counts and malformed input',()=>{
 assert.throws(()=>packetize(5,new Uint8Array(65536*11),20));
 assert.throws(()=>stillContainer(Uint8Array.of(1,2,3)));
 assert.throws(()=>animationContainer([]));
});
