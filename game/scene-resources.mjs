// One decoded image per versioned URL, with bounded work and page ownership.
export function createSceneResources({version,concurrency=4,onProgress=()=>{}}){
  const entries=new Map(),queue=[];let active=0,disposed=false,completed=0,requested=0;
  const controller=new AbortController();
  function url(path){const u=new URL(path,location.href);u.searchParams.set('v',version);return u.href;}
  function report(){if(!disposed)onProgress({completed,requested,active,queued:queue.length});}
  function pump(){
    while(!disposed&&active<concurrency&&queue.length){const job=queue.shift();active++;report();
      Promise.resolve().then(()=>{if(disposed)throw new DOMException('场景已离开','AbortError');return job.run();}).then(value=>{if(disposed)throw new DOMException('场景已离开','AbortError');job.value=value;completed++;return value;}).then(value=>{active--;report();pump();job.resolve(value);},error=>{active--;entries.delete(job.key);report();pump();job.reject(error);});
    }
  }
  function request(kind,path,run){
    if(disposed)return Promise.reject(new DOMException('场景已离开','AbortError'));
    const address=url(path),key=kind+':'+address;
    if(entries.has(key))return entries.get(key).promise;
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const job={key,address,promise,resolve,reject,run:()=>run(address,job)};entries.set(key,job);queue.push(job);requested++;pump();return promise;
  }
  function image(path){return request('image',path,async (address,job)=>{
    const im=new Image();
    await new Promise((resolve,reject)=>{job.cancel=()=>{im.onload=im.onerror=null;im.removeAttribute('src');reject(new DOMException('场景已离开','AbortError'));};im.onload=resolve;im.onerror=()=>reject(Error('素材加载失败：'+new URL(address).pathname));im.src=address;});
    if(im.decode)await im.decode();
    im.onload=im.onerror=null;job.cancel=null;
    if(disposed){im.removeAttribute('src');throw new DOMException('场景已离开','AbortError');}return im;
  });}
  function json(path){return request('json',path,async address=>{const response=await fetch(address,{signal:controller.signal});if(!response.ok)throw Error('地图加载失败：'+response.status);return response.json();});}
  function releaseImage(path){const key='image:'+url(path),job=entries.get(key);if(!job?.value)return false;job.value.removeAttribute('src');job.value=null;entries.delete(key);return true;}
  function dispose(){if(disposed)return;disposed=true;controller.abort();queue.length=0;const error=new DOMException('场景已离开','AbortError');for(const job of entries.values()){job.cancel?.();job.reject(error);if(job.value instanceof HTMLImageElement)job.value.removeAttribute('src');job.value=null;}entries.clear();}
  return {url,image,json,releaseImage,dispose,stats:()=>({requested,completed,active,queued:queue.length,retained:entries.size,imagePixelBytes:[...entries.values()].reduce((total,job)=>total+(job.value instanceof HTMLImageElement?job.value.naturalWidth*job.value.naturalHeight*4:0),0),disposed})};
}
