const tencentcloud = require('tencentcloud-sdk-nodejs-scf');
const tencentcloudCam = require('tencentcloud-sdk-nodejs-cam');
const fs = require('fs');

const sid = process.env.TENCENT_COS_SECRET_ID;
const sk = process.env.TENCENT_COS_SECRET_KEY;
const env = { credential: { secretId: sid, secretKey: sk }, region: 'ap-beijing' };

const scfClient = new tencentcloud.scf.v20180416.Client(env);
const camClient = new tencentcloudCam.cam.v20190116.Client(env);

async function main() {
  // 1. 创建 SCF 服务角色
  try {
    const roleResult = await camClient.CreateRole({
      RoleName: 'SCF_QcsRole',
      PolicyDocument: JSON.stringify({
        version: '2.0',
        statement: [{
          effect: 'allow',
          principal: { service: ['scf.qcloud.com'] },
          action: ['sts:AssumeRole'],
        }],
      }),
      Description: 'SCF 默认服务角色',
    });
    console.log('✅ 角色创建成功');
    
    // 关联 SCF 完整访问策略
    await camClient.AttachRolePolicy({
      PolicyId: 163198,  // QcloudSCFFullAccess
      AttachRoleName: 'SCF_QcsRole',
    });
    console.log('✅ 策略已关联');
  } catch (e) {
    if (e.code === 'InvalidParameter.RoleNameInUse') {
      console.log('ℹ️ 角色已存在');
    } else {
      console.log('⚠️ 角色创建失败:', e.message);
      console.log('需要手动在 CAM 控制台创建角色 SCF_QcsRole');
      console.log('请前往: https://console.cloud.tencent.com/cam/role');
    }
  }

  // 2. 等待角色生效
  await new Promise(r => setTimeout(r, 5000));

  // 3. 创建 SCF 函数
  try {
    const zipBase64 = fs.readFileSync('/tmp/scf-pkg.zip').toString('base64');
    const result = await scfClient.CreateFunction({
      FunctionName: 'youxi-deepseek-proxy',
      Code: { ZipFile: zipBase64 },
      Handler: 'index.main_handler',
      Runtime: 'Nodejs16',
      Timeout: 60,
      MemorySize: 128,
      Role: 'SCF_QcsRole',
      Environment: {
        Variables: [{ Key: 'DEEPSEEK_API_KEY', Value: process.env.DEEPSEEK_API_KEY || '' }],
      },
    });
    console.log('✅ 云函数创建成功:', result.FunctionName);
  } catch (e) {
    if (e.code === 'ResourceInUse') {
      console.log('ℹ️ 云函数已存在');
    } else {
      console.log('❌ 云函数创建失败:', e.code, '-', e.message);
      return;
    }
  }

  // 4. 创建 API 网关触发器
  await new Promise(r => setTimeout(r, 3000));
  try {
    const triggerResult = await scfClient.CreateTrigger({
      FunctionName: 'youxi-deepseek-proxy',
      TriggerName: 'youxi-api',
      Type: 'APIGW',
      TriggerDesc: JSON.stringify({
        api: {
          serviceName: 'youxi-service',
          serviceType: 'NORMAL',
          protocol: 'HTTPS',
          netTypes: ['OUTER'],
          isPrefix: true,
        },
        apiList: [{ method: 'ANY', path: '/', apiBusinessType: 'NORMAL' }],
      }),
    });
    console.log('✅ API 网关触发器创建成功');
  } catch (e) {
    console.log('⚠️ 触发器创建失败:', e.message);
    console.log('请在控制台手动配置触发器:');
    console.log('https://console.cloud.tencent.com/scf/index?rid=8');
  }

  // 5. 获取函数信息
  try {
    const info = await scfClient.GetFunction({ FunctionName: 'youxi-deepseek-proxy' });
    console.log('\n📋 函数信息:');
    console.log('   名称:', info.FunctionName);
    console.log('   状态:', info.Status);
    console.log('   运行时:', info.Runtime);
    if (info.Triggers) {
      console.log('   触发器:', info.Triggers.map(t => t.Type + ' -> ' + (t.TriggerDesc || '')).join(', '));
    }
  } catch (e) {
    console.log('查询函数信息失败:', e.message);
  }
}

main();
