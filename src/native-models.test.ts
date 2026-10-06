import {describe,it,expect} from 'vitest';
import {normalizeModels} from './native-models';
import {blankSpec,validateSpec} from './agent-model';
const row=(name:string,type:string,date?:string)=>({name,source:1,task:{name:type},created_at:date,properties:[],tags:[]});
describe('Native Cloudflare models',()=>{
 it('groups by type then descending provider dates and puts missing dates last',()=>{const result=normalizeModels([row('@cf/a/old','Text Generation','2024-01-01'),row('@cf/a/unknown','Text Generation'),row('@cf/a/new','Text Generation','2026-01-01'),row('@cf/a/image','Images','2025-01-01'),row('openai/external','Text Generation','2027-01-01')]);expect(result.map(m=>m.name)).toEqual(['@cf/a/image','@cf/a/new','@cf/a/old','@cf/a/unknown']);expect(result[1]?.dateKind).toBe('added');});
 it('does not retain retired gateway settings and rejects external model IDs',()=>{const s=validateSpec({...blankSpec,gatewayConnectionId:'old',gatewayModel:'openai/anything'});expect(s).not.toHaveProperty('gatewayConnectionId');expect(()=>validateSpec({...blankSpec,model:'openai/anything'})).toThrow();});
});
