import {parseGIF,decompressFrames} from 'gifuct-js';
import {cropRect} from './crop.js';
import {slideshowFrame} from './slideshow.js';
import {stillContainer,animationContainer,envelope} from './protocol.js';
const canvas = (w,h) => {const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const jpeg = c => new Promise((resolve,reject)=>c.toBlob(async b=>b?resolve(new Uint8Array(await b.arrayBuffer())):reject(Error('Could not encode a frame')),'image/jpeg',0.8));
// The badge was observed to show roughly the top-left 360 × 360 of a 368 × 368 frame.
// Put the chosen crop in that visible area; extend its edge into the remaining pixels.
function draw(source,w,h,zoom,offset){
 const c=canvas(368,368),ctx=c.getContext('2d'),{x,y,side}=cropRect(w,h,zoom,offset);
 ctx.fillStyle='#000';ctx.fillRect(0,0,368,368);
 ctx.drawImage(source,x,y,side,side,0,0,360,360);
 ctx.drawImage(c,359,0,1,360,360,0,8,360);
 ctx.drawImage(c,0,359,368,1,0,360,368,8);
 return c;
}
const delay=()=>new Promise(r=>setTimeout(r,0));
async function imageFrame(file,zoom,offset){const bitmap=await createImageBitmap(file);try{return await jpeg(draw(bitmap,bitmap.width,bitmap.height,zoom,offset))}finally{bitmap.close()}}
async function videoFrames(file,zoom,progress,offset){
 const url=URL.createObjectURL(file),video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.src=url;
 try{await new Promise((res,rej)=>{video.onloadedmetadata=res;video.onerror=()=>rej(Error('This video format is not supported by your browser'))});if(!Number.isFinite(video.duration)||video.duration<=0)throw Error('Could not read video duration');const n=Math.ceil(video.duration*10);if(n>600)throw Error('Please choose a video of 60 seconds or less');const result=[];
 for(let i=0;i<n;i++){video.currentTime=Math.min(i/10,Math.max(0,video.duration-.001));await new Promise((res,rej)=>{video.onseeked=res;video.onerror=()=>rej(Error('Could not decode video frame'))});result.push(await jpeg(draw(video,video.videoWidth,video.videoHeight,zoom,offset)));progress(i+1,n)}return result;
 }finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url)}
}
async function gifFrames(file,zoom,progress,offset){
 const gif=parseGIF(await file.arrayBuffer()), decoded=decompressFrames(gif,true), width=gif.lsd.width,height=gif.lsd.height;if(!decoded.length)throw Error('GIF has no frames');const total=decoded.reduce((n,f)=>n+Math.max(f.delay||100,10),0);if(total>60000)throw Error('Please choose a GIF of 60 seconds or less');
 const composite=canvas(width,height),ctx=composite.getContext('2d',{willReadFrequently:true}), scratch=canvas(1,1);let elapsed=0,next=0,previous=null,frames=[];
 for(const f of decoded){
  if(previous?.disposalType===2)ctx.clearRect(previous.dims.left,previous.dims.top,previous.dims.width,previous.dims.height);
  if(previous?.disposalType===3 && previous.restore)ctx.putImageData(previous.restore,0,0);
  const restore=f.disposalType===3?ctx.getImageData(0,0,width,height):null;
  scratch.width=f.dims.width;scratch.height=f.dims.height;const sctx=scratch.getContext('2d');sctx.putImageData(new ImageData(f.patch,f.dims.width,f.dims.height),0,0);ctx.drawImage(scratch,f.dims.left,f.dims.top);
  const end=elapsed+Math.max(f.delay||100,10);let encoded=null;while(next<end){if(!encoded)encoded=await jpeg(draw(composite,width,height,zoom,offset));frames.push(encoded);next+=100;progress(Math.min(next,total),total)}elapsed=end;previous={...f,restore};await delay();
 }return frames;
}
export async function prepare(file,zoom=1,progress=()=>{},offset={x:0,y:0}){
 let frames,kind;if(file.type==='image/gif'||file.name.toLowerCase().endsWith('.gif')){frames=await gifFrames(file,zoom,progress,offset);kind=frames.length>1?5:6}
 else if(file.type.startsWith('video/')){frames=await videoFrames(file,zoom,progress,offset);kind=frames.length>1?5:6}
 else if(file.type.startsWith('image/')){frames=[await imageFrame(file,zoom,offset)];kind=6}
 else throw Error('Choose an image, GIF, or video supported by your browser');
 return {kind,frameCount:frames.length,message:envelope(kind,kind===5?animationContainer(frames):stillContainer(frames[0]))};
}

export async function prepareSlideshow(files,zoom=1,progress=()=>{},offset={x:0,y:0}){
 if(files.length<2||files.length>30||files.some(f=>!f.type.startsWith('image/')||f.type==='image/gif'))throw Error('Choose 2–30 still images for an animation.');
 const bitmaps=[];try{
  for(const file of files)bitmaps.push(await createImageBitmap(file));
  const images=bitmaps.map(b=>draw(b,b.width,b.height,zoom,offset));
  const frameCount=files.length*20,frames=[],cached=[];
  for(let i=0;i<frameCount;i++){
   const {image,next,alpha}=slideshowFrame(i,files.length);
   if(!cached[image])cached[image]=await jpeg(images[image]);
   if(!alpha)frames.push(cached[image]);
   else if(alpha===1){if(!cached[next])cached[next]=await jpeg(images[next]);frames.push(cached[next])}
   else{const c=canvas(368,368),ctx=c.getContext('2d');ctx.drawImage(images[image],0,0);ctx.globalAlpha=alpha;ctx.drawImage(images[next],0,0);frames.push(await jpeg(c))}
   progress(i+1,frameCount);if(i%10===0)await delay();
  }
  return {kind:5,frameCount,message:envelope(5,animationContainer(frames))};
 }finally{bitmaps.forEach(b=>b.close())}
}
