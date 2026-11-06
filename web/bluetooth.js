export const SERVICE='000001f0-0000-1000-8000-00805f9b34fb';
export const WRITE='000001f1-0000-1000-8000-00805f9b34fb';
export const NOTIFY='000001f2-0000-1000-8000-00805f9b34fb';
export function connectionErrorMessage(error,deviceSelected){
 return error.name==='NotFoundError'&&!deviceSelected?'No badge selected. Tap connect to try again.':'Couldn’t connect. Make sure your badge is in Bluetooth mode and try again.';
}
export async function requestBadge(bluetooth,onDevice=()=>{},{showAll=false,onNotification=()=>{}}={}){
 const options=showAll?{acceptAllDevices:true,optionalServices:[SERVICE]}:{filters:[{namePrefix:'E-badge'},{namePrefix:'E-Badge'}],optionalServices:[SERVICE]};
 const device=await bluetooth.requestDevice(options);
 onDevice(device);
 try{const server=await device.gatt.connect();const service=await server.getPrimaryService(SERVICE);const write=await service.getCharacteristic(WRITE);const notify=await service.getCharacteristic(NOTIFY);notify.addEventListener?.('characteristicvaluechanged',event=>onNotification(event.target.value));await notify.startNotifications();return {device,write}}
 catch(e){if(device.gatt.connected)device.gatt.disconnect();throw e}
}
export async function sendPackets(write,chunks,{isCancelled=()=>false,isConnected=()=>true,onProgress=()=>{},delay=()=>new Promise(r=>setTimeout(r,20))}={}){
 for(let i=0;i<chunks.length;i++){if(isCancelled())throw Error('Transfer cancelled; the badge may contain an incomplete image');if(!isConnected())throw Error('Badge disconnected during transfer');await write.writeValueWithoutResponse(chunks[i]);await delay();onProgress(i+1,chunks.length)}
}
