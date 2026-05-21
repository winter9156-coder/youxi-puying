const COS = require('cos-nodejs-sdk-v5');
const cos = new COS({
  SecretId: process.env.TENCENT_COS_SECRET_ID,
  SecretKey: process.env.TENCENT_COS_SECRET_KEY,
});
const B = process.env.TENCENT_COS_BUCKET;
const R = process.env.TENCENT_COS_REGION;

// 列出所有文件
cos.getBucket({ Bucket: B, Region: R }, (err, data) => {
  if (err) { console.log('list error:', err); return; }
  const files = data.Contents;
  let done = 0;
  files.forEach((f, i) => {
    // 复制自身，清除 Content-Disposition 和 force-download
    cos.putObjectCopy({
      Bucket: B, Region: R,
      Key: f.Key,
      CopySource: `${B}.cos.${R}.myqcloud.com/${f.Key}`,
      Headers: {
        'x-cos-metadata-directive': 'Replaced',
        'Content-Disposition': '',
      }
    }, (err2) => {
      done++;
      if (err2) console.log(`FAIL ${f.Key}:`, err2.message);
      else console.log(`OK ${f.Key}`);
      if (done === files.length) console.log('全部完成');
    });
  });
});
