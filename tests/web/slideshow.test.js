import test from 'node:test';
import assert from 'node:assert/strict';
import {slideshowFrame} from '../../web/slideshow.js';
test('slideshow stays for two seconds and crossfades in a loop',()=>{
 assert.deepEqual(slideshowFrame(0,2),{image:0,next:1,alpha:0});
 assert.deepEqual(slideshowFrame(14,2),{image:0,next:1,alpha:0});
 assert.deepEqual(slideshowFrame(19,2),{image:0,next:1,alpha:1});
 assert.deepEqual(slideshowFrame(20,2),{image:1,next:0,alpha:0});
 assert.deepEqual(slideshowFrame(39,2),{image:1,next:0,alpha:1});
});
