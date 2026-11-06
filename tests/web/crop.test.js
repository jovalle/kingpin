import test from 'node:test';
import assert from 'node:assert/strict';
import {cropRect, clampOffset} from '../../web/crop.js';

test('centered and dragged crops share the same bounded geometry',()=>{
 assert.deepEqual(cropRect(800,400,1,{x:0,y:0}),{x:200,y:0,side:400});
 assert.deepEqual(cropRect(800,400,1,{x:.25,y:1}),{x:100,y:0,side:400});
 assert.deepEqual(cropRect(400,400,2,{x:9,y:-9}),{x:0,y:200,side:200});
 assert.deepEqual(clampOffset(800,400,2,{x:-10,y:10}),{x:-1.5,y:.5});
});

test('zooming out clamps offsets without exposing empty space',()=>{
 assert.deepEqual(clampOffset(400,400,1,{x:.4,y:-.4}),{x:0,y:0});
 assert.deepEqual(cropRect(400,800,2,{x:0,y:.5}),{x:100,y:200,side:200});
});

test('preview retains full non-square media and matches the exported crop',async()=>{
 const {previewPlacement}=await import('../../web/crop.js');
 for(const [width,height,zoom,offset] of [[400,800,1,{x:0,y:.5}],[800,400,2,{x:-.5,y:.2}]]){
  const view=previewPlacement(width,height,zoom,offset);
  const crop=cropRect(width,height,zoom,offset);
  assert.ok(view.width>100||view.height>100);
  const left=view.x/100-view.width/100*zoom/2;
  const top=view.y/100-view.height/100*zoom/2;
  assert.ok(Math.abs(-left/(view.width/100*zoom)*width-crop.x)<1e-9);
  assert.ok(Math.abs(-top/(view.height/100*zoom)*height-crop.y)<1e-9);
 }
});
