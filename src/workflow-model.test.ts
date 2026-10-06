import {describe,it,expect} from 'vitest';
import {validateFlow,validateSkill,applyTemplate} from './workflow-model';
describe('Workflow validation',()=>{
 const step={id:crypto.randomUUID(),kind:'delay',ref:'',value:'1'};
 it('rejects duplicate step IDs and unbounded delay',()=>{expect(()=>validateFlow({name:'Flow',description:'',steps:[step,step]})).toThrow();expect(()=>validateFlow({name:'Flow',description:'',steps:[{...step,value:'90000'}]})).toThrow();});
 it('requires resolved skill references',()=>{expect(()=>validateFlow({name:'Flow',description:'',steps:[{...step,kind:'skill'}]})).toThrow();});
 it('substitutes input as data without evaluating it',()=>{expect(applyTemplate('Result: {{input}}','${process.env.SECRET}')).toBe('Result: ${process.env.SECRET}');expect(()=>applyTemplate('{{input}}{{input}}','a'.repeat(10000))).toThrow();});
 it('requires connections for API skills and valid methods',()=>{expect(()=>validateSkill({name:'API',description:'',kind:'api',instructions:'',connectionId:'',method:'GET',path:'/'})).toThrow();});
});
