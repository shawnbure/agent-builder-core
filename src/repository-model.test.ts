import {describe,it,expect} from 'vitest';
import {repositoryPath,repositoryName,parseCodePatch,validateCodeSettings} from './repository-model';
import {blankSpec,validateSpec} from './agent-model';
const code={connectionId:'12345678-1234-1234-1234-123456789abc',baseBranch:'main',contextFiles:['README.md'],testCommand:'npm test',setupCommand:'npm ci'};
describe('code agents',()=>{
 it('preserves the code type and forces review',()=>{const spec=validateSpec({...blankSpec,type:'code',code,engine:'workers-ai',requireApproval:false});expect(spec.type).toBe('code');expect(spec.code).toMatchObject(code);expect(spec.requireApproval).toBe(true);});
 it('validates autonomous policy and limits',()=>{expect(validateCodeSettings({...code,submission:'draft',taskSource:'issues',issueLabel:'workrr'})).toMatchObject({submission:'draft',taskSource:'issues',maxSteps:10});for(const patch of [{maxSteps:0},{maxAttempts:99},{maxMinutes:0},{maxAiCostMicro:-1},{submission:'merge'},{taskSource:'issues',issueLabel:''}])expect(()=>validateCodeSettings({...code,...patch})).toThrow();});
 it('keeps existing assistants compatible',()=>expect(validateSpec(blankSpec).type).toBe('assistant'));
 it.each(['../secret','/tmp/file','.git/config','a/../../b','a\\b','a//b','a/./b','a\nfile'])('rejects unsafe path %s',p=>expect(()=>repositoryPath(p)).toThrow());
 it('rejects unsupported code engines and missing connection',()=>{expect(()=>validateSpec({...blankSpec,type:'code',code})).toThrow(/Workers AI/);expect(()=>validateCodeSettings({...code,connectionId:''})).toThrow(/connection/);});
 it('requires explicit validation and context',()=>{expect(()=>validateCodeSettings({...code,testCommand:''})).toThrow();expect(()=>validateCodeSettings({...code,contextFiles:[]})).toThrow();});
 it('parses additions and deletions but rejects duplicate paths',()=>{const p={title:'Fix',summary:'Why',files:[{path:'a.ts',content:'ok'},{path:'b.ts',content:null}]};expect(parseCodePatch(JSON.stringify(p)).files).toHaveLength(2);expect(()=>parseCodePatch(JSON.stringify({...p,files:[p.files[0],p.files[0]]}))).toThrow(/duplicate/);});
 it('bounds model patches',()=>expect(()=>parseCodePatch(JSON.stringify({title:'Fix',summary:'why',files:[{path:'a.ts',content:'a'.repeat(80001)}]}))).toThrow(/80,000/));
 it('rejects arbitrary origins and supports GitLab subgroups',()=>{expect(repositoryName('team/sub/repo','gitlab')).toBe('team/sub/repo');expect(()=>repositoryName('https://evil.example/repo','github')).toThrow();expect(()=>repositoryName('team/sub/repo','github')).toThrow();});
});
