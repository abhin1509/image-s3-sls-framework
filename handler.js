const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const crypto = require("crypto");

const BUCKET_NAME = process.env.BUCKET_NAME;

const sendResponse = (code, signedUrl, fileUrl) => {
  return {
      statusCode: code,
      headers: {
          "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        signedUrl, fileUrl
      })
  }
}

const getId = () => {
  return crypto.randomBytes(8).toString('hex');
}

module.exports.hello = async (event) => {
  console.log(event);
  const {contentType,ext,isPublic} = JSON.parse(event.body);
  //const {contentType,ext,isPublic} = event;
  console.log(contentType,ext,isPublic);
  try {
    let filename = getId(); // random file name
    var s3Params = {
        Bucket: BUCKET_NAME,
        Key: `${filename}.${ext}`,
        ContentType: contentType,
        ACL: isPublic ? 'public-read' : null,
        Expires: 600 // 10 minutes
    };

    const signedUrl = S3.getSignedUrl('putObject', s3Params);
    const imgUrl= `https://${BUCKET_NAME}.s3.us-east-1.amazonaws.com/${filename}.${ext}`;
    return sendResponse(200, signedUrl, imgUrl);
} catch (error) {
    console.log(error);
  }
};