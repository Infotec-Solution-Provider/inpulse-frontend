import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url), vr = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const doubles = "/tests/sector-namespace/doubles.ts";
const stubs = {
  "@/app/auth-context": `export { AuthContext,useAuthContext } from '${doubles}'`,
  "whatsapp-context": `export { WhatsappContext,useWhatsappContext } from '${doubles}'`,
  "@/lib/sdk-local": `export { UsersClient } from '${doubles}'; export const FileDirType={PUBLIC:'PUBLIC'}; export const UserRole={ADMIN:'ADMIN',ACTIVE:'ATIVO',RECEPTIONIST:'RECEP',BOTH:'AMBOS',EXTERNAL:'EXTERNO'};`,
  "@/lib/services/files.service": `export default {getFileDownloadUrl:id=>'https://files.example.test/'+id,uploadBrowserFile:async()=>{throw Error('No upload in this fixture')}}`,
  "@/lib/services/crm-users.service": `export { crmUsersService as default } from '${doubles}'`,
  "@/lib/ui-system/query-state": `import {useState} from 'react'; export function useCrmQueryState(_key,value){return useState(value)}`,
  "@/lib/ui-system/leave-guard": `export function useCrmLeaveGuard(){}`,
  "@/lib/ui-system/crm-dialog": `export {Dialog as CrmDialog} from '@mui/material'`,
  "crm-user-shift-selector": `export default function Shift(){return null}`,
  "next/link": `import React from 'react'; export default function Link(props){return React.createElement('a',props)}`,
};
const port=Number(process.env.SECTOR_NAMESPACE_TEST_PORT || 4209);
const server=await createServer({configFile:false,root:fileURLToPath(new URL('../../',import.meta.url)),cacheDir:`node_modules/.vite-sector-namespace-${port}`,
  define:{'process.env.NEXT_PUBLIC_USERS_URL':JSON.stringify('http://fixture.test'),'process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH':JSON.stringify('')},
  resolve:{alias:{'@':fileURLToPath(new URL('../../src',import.meta.url))}},
  plugins:[{name:'sector-namespace-fixtures',enforce:'pre',
    configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url==='/'||req.url?.startsWith('/?'))req.url='/tests/sector-namespace/index.html';next()})},
    resolveId(source){
      if(source in stubs)return '\0sector:'+source;
      if(source.endsWith('/whatsapp-context'))return '\0sector:whatsapp-context';
      if(source.endsWith('/auth-context'))return '\0sector:@/app/auth-context';
      if(source.endsWith('/crm-user-shift-selector'))return '\0sector:crm-user-shift-selector';
      if(source.endsWith('/sdk-local'))return '\0sector:@/lib/sdk-local';
      for(const key of ['@/lib/services/files.service','@/lib/services/crm-users.service','@/lib/ui-system/query-state','@/lib/ui-system/leave-guard','@/lib/ui-system/crm-dialog']){
        if(source.replaceAll('\\','/').endsWith(key.replace('@/','/src/')))return '\0sector:'+key;
      }
      if(source.endsWith('/files.service'))return '\0sector:@/lib/services/files.service';
      if(source.endsWith('/crm-users.service'))return '\0sector:@/lib/services/crm-users.service';
    },load(id){if(id.startsWith('\0sector:'))return stubs[id.slice(8)]},
  }],server:{host:'127.0.0.1',port,strictPort:true,hmr:false}});
await server.listen();
