const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const read=name=>JSON.parse(fs.readFileSync('data/catalog/'+name+'.json'));
for(const baseline of [true,false]){
 const skills=read('skills'),extra=read('extraBranches');
 if(!baseline)for(const s of skills)if(!s.branches?.length)s.branches=extra[s.id];
 const courses=read('courses'),geometry=read('geometry'),catalog={skills,geometry,effectTypes:read('effectTypes')};
 const course=courses.courses.find(x=>x.id===10810);
 const ctx=vm.createContext({catalog,catalogSkills:new Map(skills.map(s=>[s.id,s])),rawDB:{'data/courses.json':courses},state:{racePreset:'loh202611',course:course.place,meters:3000,distance:course.distClass,surface:course.ground,turn:course.turn,season:'秋',style:'差し'},$:()=>({value:'10810'})});
 vm.runInContext(baseline?cp.execFileSync('git',['show','7cf7f9a:race-plan.js'],{encoding:'utf8'}):fs.readFileSync('race-plan.js','utf8'),ctx);
 const counts={position:0,impossible:0,unknown:0};
 for(const s of skills){const branches=ctx.skillBranches({skillId:s.id});const possible=branches.filter(r=>r.spans.length);
 if(branches.length&&!possible.length)counts.impossible++;else if(possible.length&&possible.every(r=>r.spatial&&!r.unknown))counts.position++;else counts.unknown++}
 console.log(baseline?'before':'after',counts,skills.length);
}
