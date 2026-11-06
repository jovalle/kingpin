// Offsets describe how far the image moves, in units of the visible crop width.
export function clampOffset(width,height,zoom,offset={x:0,y:0}){
 const side=Math.min(width,height)/zoom;
 const limitX=Math.max(0,(width-side)/(2*side));
 const limitY=Math.max(0,(height-side)/(2*side));
 const clamp=(value,limit)=>Math.max(-limit,Math.min(limit,value)) || 0;
 return {x:clamp(offset.x,limitX),y:clamp(offset.y,limitY)};
}
export function cropRect(width,height,zoom,offset={x:0,y:0}){
 const side=Math.min(width,height)/zoom;
 const position=clampOffset(width,height,zoom,offset);
 return {x:(width-side)/2-position.x*side,y:(height-side)/2-position.y*side,side};
}
// Size the full source rather than clipping it to the preview before it moves.
export function previewPlacement(width,height,zoom,offset={x:0,y:0}){
 const position=clampOffset(width,height,zoom,offset);
 const short=Math.min(width,height);
 return {width:width/short*100,height:height/short*100,x:50+position.x*100,y:50+position.y*100};
}
