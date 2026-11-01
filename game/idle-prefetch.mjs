// Optional work never competes with initial scene preparation or foreground loads.
export function scheduleIdlePrefetch({resources,load,cacheBytes=()=>0,budget=64*1024*1024,reserve=4*1024*1024,delay=1500}){
  let timer=0,idle=0,stopped=false,state='waiting',reason='delay';
  const cancelIdle=()=>{if(idle&&window.cancelIdleCallback)cancelIdleCallback(idle);idle=0;};
  function schedule(ms=delay){if(stopped)return;clearTimeout(timer);timer=setTimeout(tryIdle,ms);}
  function eligible(){const stats=resources.stats();if(document.hidden)return 'hidden';if(stats.disposed)return 'disposed';if(stats.active||stats.queued)return 'foreground-work';if(stats.imagePixelBytes+cacheBytes()+reserve>budget)return 'budget';return null;}
  function run(deadline){idle=0;const blocked=eligible();if(blocked||deadline.timeRemaining()<4){reason=blocked||'busy';schedule();return;}state='loading';reason=null;Promise.resolve().then(load).then(()=>{state='complete';},()=>{state='failed';}).finally(()=>{if(stopped)state='stopped';});}
  function tryIdle(){if(stopped)return;const blocked=eligible();if(blocked){reason=blocked;if(blocked!=='disposed')schedule();return;}
    if(window.requestIdleCallback)idle=window.requestIdleCallback(run);
    else{state='deferred';reason='idle-api-unavailable';} // Foreground use still loads on demand.
  }
  const visibility=()=>{cancelIdle();if(!document.hidden)schedule(0);};document.addEventListener('visibilitychange',visibility);schedule();
  return {stats:()=>({state,reason,budget,reserve}),stop(){stopped=true;state='stopped';clearTimeout(timer);cancelIdle();document.removeEventListener('visibilitychange',visibility);}};
}
