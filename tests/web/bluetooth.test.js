import test from 'node:test';
import assert from 'node:assert/strict';
import {requestBadge, sendPackets, SERVICE, WRITE, NOTIFY} from '../../web/bluetooth.js';
test('opens badge chooser, connects, and subscribes to notifications',async()=>{
 let options, subscribed=false;
 const writer={writeValueWithoutResponse:async()=>{}};
 const service={getCharacteristic:async uuid=>uuid===WRITE?writer:uuid===NOTIFY?{startNotifications:async()=>{subscribed=true}}:null};
 const device={gatt:{connect:async()=>({getPrimaryService:async uuid=>{assert.equal(uuid,SERVICE);return service}})}};
 const result=await requestBadge({requestDevice:async opts=>{options=opts;return device}});
 assert.equal(options.filters[0].namePrefix,'E-badge');assert.deepEqual(options.optionalServices,[SERVICE]);assert.equal(result.device,device);assert.equal(result.write,writer);assert.ok(subscribed);
});
test('sends packets in order, reporting progress and stopping on cancel',async()=>{
 const sent=[],updates=[];let cancel=false;
 await assert.rejects(sendPackets({writeValueWithoutResponse:async p=>{sent.push(p[0]);if(p[0]===2)cancel=true}},[Uint8Array.of(1),Uint8Array.of(2),Uint8Array.of(3)],{isCancelled:()=>cancel,onProgress:(n)=>updates.push(n),delay:async()=>{}}),/cancelled/i);
 assert.deepEqual(sent,[1,2]);assert.deepEqual(updates,[1,2]);
});

test('can broaden the browser chooser when the badge name differs',async()=>{
 let options; const device={gatt:{connect:async()=>({getPrimaryService:async()=>({getCharacteristic:async()=>({startNotifications:async()=>{}})})})}};
 await requestBadge({requestDevice:async o=>{options=o;return device}},()=>{},{showAll:true});
 assert.equal(options.acceptAllDevices,true); assert.equal(options.filters,undefined); assert.deepEqual(options.optionalServices,[SERVICE]);
});

test('subscribes to notifications and forwards their DataView',async()=>{
 let handler;const notification={addEventListener:(type,fn)=>{assert.equal(type,'characteristicvaluechanged');handler=fn},startNotifications:async()=>{}};
 const writer={};const service={getCharacteristic:async uuid=>uuid===NOTIFY?notification:writer};
 const device={gatt:{connect:async()=>({getPrimaryService:async()=>service})}};let received;
 await requestBadge({requestDevice:async()=>device},()=>{},{onNotification:value=>{received=value}});
 const data=new DataView(Uint8Array.of(1,2).buffer);handler({target:{value:data}});assert.equal(received,data);
});

test('connection errors explain cancellation and failures without browser jargon',async()=>{
 const {connectionErrorMessage}=await import('../../web/bluetooth.js');
 assert.equal(connectionErrorMessage({name:'NotFoundError'},false),'No badge selected. Tap connect to try again.');
 assert.equal(connectionErrorMessage({name:'NotFoundError'},true),'Couldn’t connect. Make sure your badge is in Bluetooth mode and try again.');
 assert.equal(connectionErrorMessage({name:'NetworkError',message:'GATT error'},true),'Couldn’t connect. Make sure your badge is in Bluetooth mode and try again.');
});
