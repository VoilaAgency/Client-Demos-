/* Convert legacy MPEG program streams in the user's tab. */
'use strict';

self.onmessage=async({data:file})=>{
  try {
    importScripts('ffmpeg-core.js');
    const response=await fetch('ffmpeg-core.wasm.gz');
    if(!response.ok)throw Error('Could not load the MPEG converter.');
    const wasmBinary=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const ffmpeg=await createFFmpegCore({wasmBinary});
    ffmpeg.FS.writeFile('input.mpg',new Uint8Array(await file.arrayBuffer()));
    const result=ffmpeg.exec('-i','input.mpg','-map','0:v:0','-an','-vf','scale=min(960\\,iw):-2',
      '-c:v','libx264','-pix_fmt','yuv420p','-preset','ultrafast','-movflags','+faststart','output.mp4');
    if(result!==0)throw Error('Could not convert this MPEG. Try exporting the clip as MP4.');
    const bytes=ffmpeg.FS.readFile('output.mp4');
    self.postMessage({bytes},[bytes.buffer]);
  }catch(error){self.postMessage({error:error.message});}
};
