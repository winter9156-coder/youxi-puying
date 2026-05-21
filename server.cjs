const http=require('http'),https=require('https'),fs=require('fs'),path=require('path'),crypto=require('crypto');
require('dotenv').config();
const{Document,Packer,Paragraph,TextRun,ImageRun,AlignmentType,BorderStyle}=require('docx');
const bcrypt=require('bcryptjs');
const createApiRouter=require('./server/api.cjs');
const store=require('./server/store.cjs');
const clean=s=>s.replace(/\*\*/g,'').replace(/\*/g,'').replace(/#{1,6}\s*/g,'');
const serverApiKey=process.env.DEEPSEEK_API_KEY||'';
const apiRouter=createApiRouter();
const JWT_SECRET=process.env.JWT_SECRET||'youxi-puying-secret-2026';

// JSON用户存储（当MySQL不可用时使用）
let jsonUsers=null;
try{
  jsonUsers=JSON.parse(fs.readFileSync(path.join(__dirname,'server','users.json'),'utf8'));
  console.log('✅ 已加载',Object.keys(jsonUsers).length,'个用户账号');
}catch(e){console.log('⚠️ 未找到users.json，将使用MySQL');}

function findUser(username){
  if(jsonUsers&&jsonUsers[username])return jsonUsers[username];
  return null;
}

function generateToken(user){
  const payload={id:user.id,name:user.name,username:user.username,role:user.role,iat:Date.now()};
  const b64=Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig=crypto.createHmac('sha256',JWT_SECRET).update(b64).digest('base64');
  return b64+'.'+sig;
}

function verifyToken(token){
  try{
    const parts=token.split('.');
    if(parts.length!==2)return null;
    const sig=crypto.createHmac('sha256',JWT_SECRET).update(parts[0]).digest('base64');
    if(sig!==parts[1])return null;
    const payload=JSON.parse(Buffer.from(parts[0],'base64').toString());
    return payload;
  }catch(e){return null;}
}

function getAuthUser(headers){
  const ah=headers['authorization']||headers['Authorization']||'';
  if(!ah.startsWith('Bearer '))return null;
  return verifyToken(ah.slice(7));
}

function sendJSON(r,code,data){
  r.writeHead(code,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
  r.end(JSON.stringify(data));
}

function readBody(q){
  return new Promise(resolve=>{
    let b=[];
    q.on('data',c=>b.push(c));
    q.on('end',()=>resolve(JSON.parse(Buffer.concat(b).toString())));
  });
}

http.createServer((q,r)=>{
  const u=q.url,m=q.method;
  r.setHeader('Access-Control-Allow-Origin','*');
  r.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  r.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(m==='OPTIONS'){r.writeHead(200);r.end();return;}
  
  // Login
  if(u==='/api/login'&&m==='POST'){
    readBody(q).then(async data=>{
      try{
        const{username,password}=data;
        if(!username||!password){sendJSON(r,400,{error:'请输入用户名和密码'});return;}
        const user=findUser(username.trim());
        if(!user){sendJSON(r,401,{error:'用户名或密码错误'});return;}
        const ok=bcrypt.compareSync(password,user.password);
        if(!ok){sendJSON(r,401,{error:'用户名或密码错误'});return;}
        const token=generateToken(user);
        sendJSON(r,200,{token,user:{id:user.id,name:user.name,username:user.username,role:user.role,data:user.data||{}}});
      }catch(e){sendJSON(r,500,{error:e.message});}
    }).catch(()=>sendJSON(r,400,{error:'无效的请求数据'}));
    return;
  }
  
  // Get current user info
  if(u==='/api/me'&&m==='GET'){
    const authUser=getAuthUser(q.headers);
    if(!authUser){sendJSON(r,401,{error:'未登录'});return;}
    const fullUser=findUser(authUser.username);
    sendJSON(r,200,{user:{...authUser,data:fullUser?.data||{}}});
    return;
  }

  // Admin-only: 获取所有用户数据包（仅王洋洋可访问）
  if(u==='/api/admin/users'&&m==='GET'){
    const authUser=getAuthUser(q.headers);
    if(!authUser||authUser.name!=='王洋洋'){sendJSON(r,403,{error:'无权限'});return;}
    if(!jsonUsers){sendJSON(r,500,{error:'用户数据不可用'});return;}
    const allData=Object.values(jsonUsers).map(u=>({
      name:u.name,role:u.role,data:u.data
    }));
    sendJSON(r,200,{users:allData,total:allData.length});
    return;
  }

  // Admin: 获取数据统计
  if(u==='/api/admin/stats'&&m==='GET'){
    const au=getAuthUser(q.headers);
    if(!au||au.name!=='王洋洋'){sendJSON(r,403,{error:'无权限'});return;}
    (async()=>{sendJSON(r,200,{stats:await store.getStats(),users:jsonUsers?Object.keys(jsonUsers).length:0});})().catch(e=>sendJSON(r,500,{error:e.message}));
    return;
  }

  // Admin: 获取全部数据
  if(u==='/api/admin/data'&&m==='GET'){
    const au=getAuthUser(q.headers);
    if(!au||au.name!=='王洋洋'){sendJSON(r,403,{error:'无权限'});return;}
    (async()=>{sendJSON(r,200,await store.getAllData());})().catch(e=>sendJSON(r,500,{error:e.message}));
    return;
  }

  // Admin: 下载全部数据
  if(u==='/api/admin/data/download'&&m==='GET'){
    const au=getAuthUser(q.headers);
    if(!au||au.name!=='王洋洋'){sendJSON(r,403,{error:'无权限'});return;}
    (async()=>{const data=await store.exportData();
    r.writeHead(200,{'Content-Type':'application/json','Content-Disposition':'attachment;filename=youxi-full-data.json'});
    r.end(data);})().catch(e=>sendJSON(r,500,{error:e.message}));
    return;
  }

  // Admin: COS备份
  if(u==='/api/admin/backup-to-cos'&&m==='POST'){
    const au=getAuthUser(q.headers);
    if(!au||au.name!=='王洋洋'){sendJSON(r,403,{error:'无权限'});return;}
    if(!cosClient){sendJSON(r,500,{error:'COS未配置'});return;}
    (async()=>{
    const data=await store.exportData();
    const date=new Date().toISOString().split('T')[0];
    cosClient.putObject({
      Bucket:'wcn0506-1426318802',Region:'ap-beijing',
      Key:'backups/youxi-data-'+date+'.json',
      Body:data,ContentType:'application/json'
    },(e,d)=>{
      if(e){sendJSON(r,500,{error:e.message});return;}
      sendJSON(r,200,{success:true,url:'https://wcn0506-1426318802.cos.ap-beijing.myqcloud.com/backups/youxi-data-'+date+'.json'});
    });
    })().catch(e=>sendJSON(r,500,{error:e.message}));
    return;
  }

  // REST API
  if(u.startsWith('/api/')&&!u.startsWith('/api/download')&&!u.startsWith('/api/login')&&!u.startsWith('/api/me')&&!u.startsWith('/api/admin')){apiRouter(q,r,u,m);return;}
  // Word: 观察记录下载
  if(u==='/api/download-docx'&&m==='POST'){let b=[];q.on('data',c=>b.push(c));q.on('end',async()=>{try{const d=JSON.parse(Buffer.concat(b));const tp=t=>t.split('\n').filter(l=>l.trim()).map(l=>new Paragraph({spacing:{after:120},children:[new TextRun(clean(l))]}));const ch=[new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:300},children:[new TextRun({text:'蒲二幼自主游戏追记（室内）',bold:true,size:36})]}),new Paragraph({spacing:{after:200},children:[new TextRun(clean('班级：'+d.context)),new TextRun('    记录人：')]}),new Paragraph({spacing:{after:60},children:[new TextRun({text:'分析对象',bold:true})]}),new Paragraph({spacing:{after:120},children:[new TextRun(clean(d.childName))]}),new Paragraph({spacing:{after:60},children:[new TextRun({text:'观察时间',bold:true})]}),new Paragraph({spacing:{after:200},children:[new TextRun(clean(d.date))]}),new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'观察实录',bold:true,size:24})]}),...tp(clean(d.description))];if(d.photos&&d.photos.length)ch.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'现场素材',bold:true,size:24})]}),...d.photos.map(p=>new Paragraph({spacing:{before:60,after:60},alignment:AlignmentType.CENTER,children:[new ImageRun({data:Buffer.from(p.split(',')[1],'base64'),transformation:{width:480,height:360}})]})));if(d.childExpression)ch.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'幼儿表达表征记录',bold:true,size:24})]}),...tp(clean(d.childExpression)));if(d.teacherDialogue)ch.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'师幼共读对话',bold:true,size:24})]}),...tp(clean(d.teacherDialogue)));if(d.summary)ch.push(new Paragraph({spacing:{before:60,after:60},children:[new TextRun({text:'行为摘要',bold:true,size:22})]}),...tp(clean(d.summary)));if(d.analysis)ch.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'观察分析',bold:true,size:24})]}),...tp(clean(d.analysis)));if(d.strategy)ch.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'教育支持策略',bold:true,size:24})]}),...tp(clean(d.strategy)));ch.push(new Paragraph({spacing:{before:300},alignment:AlignmentType.CENTER,border:{top:{style:BorderStyle.SINGLE,size:6,color:'CCCCCC',space:1}},children:[]}),new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'以上分析基于本次单一观察片段，请结合幼儿日常表现与家庭背景综合判断',italics:true,color:'888888',size:18})]}));const doc=new Document({styles:{default:{document:{run:{font:'宋体',size:22}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:ch}]});const buf=await Packer.toBuffer(doc);r.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment;filename=report.docx','Content-Length':buf.length});r.end(buf);}catch(e){r.writeHead(500);r.end('err');}});return;}
  // Word: 发展档案下载
  if(u==='/api/download-profile-docx'&&m==='POST'){let b=[];q.on('data',c=>b.push(c));q.on('end',async()=>{try{const d=JSON.parse(Buffer.concat(b));const ch=[new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:200},children:[new TextRun({text:d.childName?clean(d.childName)+' — 发展档案':'幼儿发展档案',bold:true,size:36})]}),new Paragraph({spacing:{after:300},children:[new TextRun('班级：'+(d.className||'未设置'))]})];if(d.radarImage){ch.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'各领域发展概览',bold:true,size:24})]}));ch.push(new Paragraph({spacing:{after:100},alignment:AlignmentType.CENTER,children:[new ImageRun({data:Buffer.from(d.radarImage.split(',')[1],'base64'),transformation:{width:400,height:400}})]}))}if(d.scores&&d.scores.length){ch.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'各领域发展概览',bold:true,size:24})]}));for(var i=0;i<d.scores.length;i++){var s=d.scores[i];ch.push(new Paragraph({spacing:{after:80},children:[new TextRun({text:s.label+': ',bold:true,size:22}),new TextRun(s.score+'分')]}))}}if(d.summary){ch.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'学习发展小结',bold:true,size:24})]}));var lines=d.summary.split('\n').filter(function(l){return l.trim()});for(var j=0;j<lines.length;j++){ch.push(new Paragraph({spacing:{after:100},children:[new TextRun(clean(lines[j]))]}))}}ch.push(new Paragraph({spacing:{before:300},alignment:AlignmentType.CENTER,border:{top:{style:BorderStyle.SINGLE,size:6,color:'CCCCCC',space:1}},children:[]}));const doc=new Document({styles:{default:{document:{run:{font:'宋体',size:22}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:ch}]});const buf=await Packer.toBuffer(doc);r.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment;filename=profile.docx','Content-Length':buf.length});r.end(buf);}catch(e){r.writeHead(500);r.end('err');}});return;}
  // Word: 方案下载
  if(u==='/api/download-plan-docx'&&m==='POST'){let b=[];q.on('data',c=>b.push(c));q.on('end',async()=>{try{const d=JSON.parse(Buffer.concat(b));const tp=t=>t.split('\n').filter(l=>l.trim()).map(l=>new Paragraph({spacing:{after:120},children:[new TextRun(clean(l))]}));const ch=[new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:300},children:[new TextRun({text:clean(d.title),bold:true,size:36})]}),new Paragraph({spacing:{after:200},children:[new TextRun('生成时间：'+d.date)]})];ch.push(...tp(clean(d.content)));ch.push(new Paragraph({spacing:{before:300},alignment:AlignmentType.CENTER,border:{top:{style:BorderStyle.SINGLE,size:6,color:'CCCCCC',space:1}},children:[]}));const doc=new Document({styles:{default:{document:{run:{font:'宋体',size:22}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:ch}]});const buf=await Packer.toBuffer(doc);r.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment;filename=plan.docx','Content-Length':buf.length});r.end(buf);}catch(e){r.writeHead(500);r.end('err');}});return;}
  // AI proxy
  if(u.startsWith('/proxy/ai/')){let b=[];q.on('data',c=>b.push(c));q.on('end',()=>{const auth=q.headers['authorization'];const finalAuth=auth&&auth.length>7?auth:(serverApiKey?'Bearer '+serverApiKey:'');const pr=https.request({hostname:'api.deepseek.com',port:443,path:u.replace('/proxy/ai',''),method:m,headers:{'Content-Type':q.headers['content-type']||'application/json','Authorization':finalAuth}});pr.on('response',prs=>{let d=[];prs.on('data',c=>d.push(c));prs.on('end',()=>{const buf=Buffer.concat(d);r.writeHead(prs.statusCode,{'Content-Type':prs.headers['content-type']||'text/plain','Content-Length':buf.length});r.end(buf);});});pr.on('error',()=>{r.writeHead(502);r.end('')});pr.end(Buffer.concat(b));});return;}
  // Static files
  let f=u==='/'?'/index.html':u,fp=path.join(__dirname,'dist',f),ext=path.extname(f).slice(1);
  if(!fs.existsSync(fp))fp=path.join(__dirname,'dist','index.html'),ext='html';
  r.writeHead(200,{'Content-Type':{'html':'text/html','js':'text/javascript','css':'text/css'}[ext]||'application/octet-stream','Content-Disposition':'inline'});
  r.end(fs.readFileSync(fp));
}).listen(5173,'0.0.0.0');
