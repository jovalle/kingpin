// Observed on 01f2: a0, type, 24-bit big-endian JSON length, JSON, zero-sum checksum.
export function createStatusParser(){
 let pending=[];
 return {push(value){
  const bytes=value instanceof DataView?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):new Uint8Array(value);
  pending.push(...bytes);const results=[];
  while(pending.length){
   const start=pending.indexOf(0xa0);if(start<0){pending=[];break}if(start)pending.splice(0,start);
   if(pending.length<5)break;
   const size=(pending[2]<<16)|(pending[3]<<8)|pending[4];
   if(size>4096){pending.shift();continue}const total=size+6;if(pending.length<total)break;
   const packet=pending.splice(0,total);if(packet.reduce((sum,b)=>sum+b,0)%256!==0||packet[1]!==13)continue;
   try{const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(packet.slice(5,-1))));
    if(data.type!==13||!Number.isSafeInteger(data.allspace)||!Number.isSafeInteger(data.freespace)||data.freespace<0||data.allspace<0||data.freespace>data.allspace||data.allspace>Number.MAX_SAFE_INTEGER/1024)continue;
    const totalBytes=data.allspace*1024,freeBytes=data.freespace*1024;results.push({totalBytes,freeBytes,usedBytes:totalBytes-freeBytes});
   }catch{}
  }
  return results;
 }};
}
