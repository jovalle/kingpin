const enc = new TextEncoder();
const join = (...parts) => { const out = new Uint8Array(parts.reduce((n,p)=>n+p.length,0)); let i=0; for(const p of parts){out.set(p,i); i+=p.length} return out };
const header = size => {const b=new Uint8Array(size); return [b,new DataView(b.buffer)]};
function validJpeg(j) { return j instanceof Uint8Array && j.length>=4 && j[0]===255 && j[1]===216 && j.at(-2)===255 && j.at(-1)===217 }
export function frame(type,total,remaining,payload){
 if(![5,6].includes(type)||!Number.isInteger(total)||!Number.isInteger(remaining)||total<1||total>65535||remaining<0||remaining>=total||payload.length>496) throw Error('Invalid packet');
 const [b,v]=header(payload.length+9); b[0]=0xf1;b[1]=type;v.setUint16(2,total);v.setUint16(4,remaining);v.setUint16(6,payload.length);b.set(payload,8);b[b.length-1]=(-b.reduce((a,x)=>a+x,0))&255;return b;
}
export function packetize(type,payload,maxWrite=244){
 if(!(payload instanceof Uint8Array)||!payload.length||!Number.isInteger(maxWrite)||maxWrite<10||maxWrite>505) throw Error('Invalid transfer size');
 const chunk=maxWrite-9,count=Math.ceil(payload.length/chunk);if(count>65535)throw Error('Animation is too large to send. Try a shorter clip.');
 return Array.from({length:count},(_,i)=>frame(type,count,count-i-1,payload.subarray(i*chunk,(i+1)*chunk)));
}
export function stillContainer(jpg){
 if(!validJpeg(jpg))throw Error('Invalid JPEG frame'); const [b,v]=header(36);b.set(enc.encode('IMB\0'));v.setUint32(4,4,true);v.setUint32(8,jpg.length+32,true);v.setUint32(12,11,true);v.setUint16(16,368,true);v.setUint16(18,368,true);v.setUint32(20,36,true);v.setUint32(24,jpg.length,true);return join(b,jpg);
}
export function animationContainer(frames){
 if(!frames.length||frames.length>99999||frames.some(f=>!validJpeg(f)))throw Error('Invalid animation frames');
 let size=32+frames.length*16; const offsets=frames.map(f=>{const n=size;size+=32+f.length;return n}); if(size>0xffffffff)throw Error('Animation is too large');
 const [b,v]=header(size);v.setUint32(0,0x12345678,true);v.setUint32(4,24+frames.length*16,true);v.setUint32(8,frames.length,true);v.setUint32(12,100,true);b.set(enc.encode('output/100ms'),16);v.setUint32(28,size-1,true);
 frames.forEach((f,i)=>{const o=offsets[i], table=32+16*i;b.set(enc.encode(`frame_${String(i+1).padStart(5,'0')}.`),table);v.setUint32(table+12,o,true);v.setUint32(o,o,true);v.setUint32(o+4,offsets[(i+1)%frames.length],true);v.setUint32(o+8,11,true);v.setUint16(o+12,368,true);v.setUint16(o+14,368,true);v.setUint32(o+16,o+32,true);v.setUint32(o+20,f.length,true);b.set(f,o+32)});return b;
}
export function envelope(type,data){if(![5,6].includes(type)||!data.length)throw Error('Invalid content');return join(enc.encode(`{"type":${type},"data":`),data,enc.encode('}'))}
