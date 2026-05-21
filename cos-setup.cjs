const COS = require('cos-nodejs-sdk-v5');
const cos = new COS({
  SecretId: process.env.TENCENT_COS_SECRET_ID,
  SecretKey: process.env.TENCENT_COS_SECRET_KEY,
});
cos.putBucketWebsite({
  Bucket: process.env.TENCENT_COS_BUCKET,
  Region: process.env.TENCENT_COS_REGION,
  WebsiteConfiguration: {
    IndexDocument: { Suffix: 'index.html' },
    ErrorDocument: { Key: 'index.html' },
    RoutingRules: [{
      RuleNumber: 1,
      Condition: { HttpErrorCodeReturnedEquals: 404 },
      Redirect: { Protocol: 'https', ReplaceKeyWith: 'index.html' }
    }]
  }
}, (err, data) => {
  if (err) console.log('FAILED:', JSON.stringify(err));
  else console.log('静态网站已开启');
});
// 也设置CORS
cos.putBucketCors({
  Bucket: process.env.TENCENT_COS_BUCKET,
  Region: process.env.TENCENT_COS_REGION,
  CORSRules: [{
    AllowedOrigin: ['*'],
    AllowedMethod: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
    AllowedHeader: ['*'],
    ExposeHeader: ['ETag', 'Content-Length', 'x-cos-request-id'],
    MaxAgeSeconds: '3600'
  }]
}, (err) => {
  if (err) console.log('CORS FAILED:', JSON.stringify(err));
  else console.log('CORS 已配置');
});
