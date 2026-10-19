import {useSyncExternalStore} from 'react';
let state={instance:'tenant-a',token:'token-a',user:{CODIGO:1,NIVEL:'ADMIN'}};const subscribers=new Set<()=>void>();
export const useAuthContext=()=>useSyncExternalStore(callback=>{subscribers.add(callback);return()=>subscribers.delete(callback)},()=>state);
export function switchTenant(){state={...state,instance:'tenant-b',token:'token-b'};subscribers.forEach(callback=>callback())}
export class CustomerSearchClient { private token='';setAuth(value:string){this.token=value}async getSearchOptions(kind:string,search:string,page:number){const response=await fetch('/options/'+kind+'?'+new URLSearchParams({search,page:String(page)}),{headers:{'x-fixture-token':this.token}});if(!response.ok)throw new Error('Fixture failure');return response.json()}}
