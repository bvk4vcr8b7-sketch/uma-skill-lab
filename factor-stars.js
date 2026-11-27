'use strict';
// Compare the silhouette of trailing symbols; unrecognised shapes stay in the OCR text for review.
function starColumns(ctx,x,y,width,height){
  const data=ctx.getImageData(x,y,width,height).data;
  const pixel=(col,row)=>{const i=4*(row*width+col);return .299*data[i]+.587*data[i+1]+.114*data[i+2]};
  const corners=[pixel(0,0),pixel(width-1,0),pixel(0,height-1),pixel(width-1,height-1)].sort((a,b)=>a-b);
  const bg=(corners[1]+corners[2])/2;
  const ink=(col,row)=>Math.abs(pixel(col,row)-bg)>55;
  const runs=[];let run=null;
  for(let col=0;col<width;col++){
    let top=height,bottom=-1;
    for(let row=0;row<height;row++)if(ink(col,row)){top=Math.min(row,top);bottom=row}
    if(bottom<0){run=null;continue}
    if(!run){run={left:col,right:col,top,bottom};runs.push(run)}
    run.right=col;run.top=Math.min(run.top,top);run.bottom=Math.max(run.bottom,bottom);
  }
  return runs.map(r=>{
    const mask=[];for(let v=0;v<16;v++)for(let u=0;u<16;u++)mask.push(ink(r.left+Math.floor((u+.5)*(r.right-r.left+1)/16),r.top+Math.floor((v+.5)*(r.bottom-r.top+1)/16)));
    return {...r,mask};
  });
}
async function readFactorLines(worker,file){
  const img=new Image(),url=URL.createObjectURL(file);img.src=url;
  try{
    await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const ref=document.createElement('canvas');ref.width=64;ref.height=64;
    const c=ref.getContext('2d');c.fillStyle='white';c.fillRect(0,0,64,64);c.fillStyle='black';c.font='48px sans-serif';c.fillText('★',4,50);
    const template=starColumns(c,0,0,64,64)[0]?.mask;
    const result=(await worker.recognize(canvas)).data;
    if(!template||!result.lines?.length)return result.text;
    const lines=[];
    for(const line of result.lines){
      const b=line.bbox,x=Math.max(0,b.x0-3),y=Math.max(0,b.y0-3),w=Math.min(canvas.width,b.x1+3)-x,h=Math.min(canvas.height,b.y1+3)-y;
      if(w<8||h<6){lines.push(line.text);continue}
      const runs=starColumns(ctx,x,y,w,h);
      const stars=[];
      for(const r of runs.reverse()){
        const score=r.mask.filter((v,i)=>v&&template[i]).length/r.mask.filter((v,i)=>v||template[i]).length;
        if(score<.78)break;stars.push(r);
      }
      if(!stars.length||stars.length>3||stars.at(-1).left<5){lines.push(line.text);continue}
      const name=(await worker.recognize(canvas,{rectangle:{left:x,top:y,width:stars.at(-1).left,height:h}})).data.text.trim();
      lines.push(name+'★'.repeat(stars.length));
    }
    return lines.join('\n');
  }finally{URL.revokeObjectURL(url)}
}
