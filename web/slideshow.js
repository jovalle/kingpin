// The badge plays 100 ms frames. Each image occupies 20 frames, including
// a half-second crossfade into the next image (including the loop).
export function slideshowFrame(index,count){
 const perImage=20, fadeFrames=5, within=index%perImage, image=Math.floor(index/perImage)%count;
 return {image,next:(image+1)%count,alpha:within>=perImage-fadeFrames?(within-(perImage-fadeFrames)+1)/fadeFrames:0};
}
