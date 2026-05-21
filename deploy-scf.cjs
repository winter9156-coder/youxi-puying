// SCF全站部署 - 在项目目录下运行
const tencentcloud = require('tencentcloud-sdk-nodejs-scf');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取COS凭证
const env = {};
fs.readFileSync('/Users/chuningwang/.workbuddy/skills/腾讯云COS/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^\s*TENCENT_COS_(\w+)=['"](.+?)['"]\s*$/);
  if (m) env[m[1]] = m[2];
});

const SRC = __dirname;
const cred = { secretId: env.SECRET_ID, secretKey: env.SECRET_KEY };

async function main() {
  // 1. 准备部署包
  console.log('[1/6] 准备部署包...');
  execSync(`rm -rf /tmp/scf-site && mkdir -p /tmp/scf-site/dist`, { stdio:'ignore' });
  execSync(`cp -r ${SRC}/dist/* /tmp/scf-site/dist/`, { stdio:'ignore' });
  execSync(`cp ${SRC}/scf-proxy/scf_index.py /tmp/scf-site/index.py`, { stdio:'ignore' });
  execSync(`cd /tmp/scf-site && zip -r /tmp/scf-site.zip . -x ".*"`, { stdio:'pipe' });
  const size = fs.statSync('/tmp/scf-site.zip').size;
  console.log(`  包大小: ${(size/1024).toFixed(1)}KB`);

  // 2. 读取DEEPSEEK_API_KEY
  let apiKey = '';
  try {
    const e = fs.readFileSync(SRC + '/.env', 'utf8');
    const m = e.match(/DEEPSEEK_API_KEY=(\S+)/);
    if (m) apiKey = m[1];
  } catch(e) {}
  console.log('[2/6] API Key:', apiKey ? '已配置' : '未配置');

  const scfClient = new tencentcloud.scf.v20180416.Client({ credential: cred, region: 'ap-beijing' });
  const zipBase64 = fs.readFileSync('/tmp/scf-site.zip').toString('base64');

  // 3. 删除旧函数（如果存在）
  console.log('[3/6] 部署云函数...');
  try {
    await scfClient.DeleteFunction({ FunctionName: 'youxi-full-site' });
    console.log('  已删除旧函数，等待生效...');
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    if (e.code !== 'ResourceNotFound') console.log('  删除旧函数:', e.message);
  }

  // 4. 创建新函数
  try {
    const result = await scfClient.CreateFunction({
      FunctionName: 'youxi-full-site',
      Code: { ZipFile: zipBase64 },
      Handler: 'index.main_handler',
      Runtime: 'Python3.9',
      Timeout: 60,
      MemorySize: 256,
      Environment: { 
        Variables: [{ Key: 'DEEPSEEK_API_KEY', Value: apiKey }] 
      },
      Description: '蒲英向阳 全站服务（前端+API代理）',
    });
    console.log('  函数创建成功:', result.FunctionName);
  } catch (e) {
    if (e.code === 'ResourceInUse') {
      console.log('  函数已存在，更新代码...');
      await scfClient.UpdateFunctionCode({
        FunctionName: 'youxi-full-site',
        Handler: 'index.main_handler',
        Code: { ZipFile: zipBase64 },
        Runtime: 'Nodejs18',
      });
      await scfClient.UpdateFunctionConfiguration({
        FunctionName: 'youxi-full-site',
        Timeout: 60,
        MemorySize: 256,
        Environment: { Variables: [{ Key: 'DEEPSEEK_API_KEY', Value: apiKey }] },
      });
      console.log('  函数代码已更新');
    } else {
      throw e;
    }
  }

  // 5. 等待函数就绪
  console.log('[4/6] 等待函数就绪...');
  await new Promise(r => setTimeout(r, 10000));

  // 6. 获取API网关URL
  console.log('[5/6] 获取函数信息...');
  const info = await scfClient.GetFunction({ FunctionName: 'youxi-full-site' });
  console.log('  状态:', info.Status);
  
  if (info.Triggers && info.Triggers.length > 0) {
    console.log('\n  已有触发器:');
    info.Triggers.forEach(t => {
      console.log(`    ${t.Type}: ${t.TriggerDesc || '(详情见控制台)'}`);
    });
  } else {
    console.log('\n[6/6] 创建API网关触发器...');
    try {
      const trigger = await scfClient.CreateTrigger({
        FunctionName: 'youxi-full-site',
        TriggerName: 'youxi-site-gw',
        Type: 'APIGW',
        TriggerDesc: JSON.stringify({
          api: {
            serviceName: 'puying-service',
            serviceType: 'NORMAL',
            protocol: 'HTTPS',
            netTypes: ['OUTER'],
            isPrefix: true,
          },
          apiList: [{ method: 'ANY', path: '/', apiBusinessType: 'NORMAL' }],
        }),
      });
      console.log('  触发器创建成功:', trigger.RequestId);
    } catch (e) {
      console.log('  触发器创建:', e.message);
      console.log('  请手动在控制台创建API网关触发器');
    }
  }

  console.log('\n========== 部署完成 ==========');
  console.log('函数名: youxi-full-site');
  console.log('请前往 SCF 控制台查看 API 网关 URL:');
  console.log('https://console.cloud.tencent.com/scf/index?rid=8');
  console.log('在函数详情页 → 触发管理 → API网关 即可看到访问地址');
  console.log('==============================');
}

main().catch(e => {
  console.error('部署失败:', e.code || '', (e.message || '').substring(0, 200));
});
