const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const crypto = require("crypto");
const resizeImg = require('resize-img');
const fetch = require('node-fetch');

const BUCKET_NAME = process.env.BUCKET_NAME;

const sendResponse = (code, signedUrl, fileUrl) => {
  return {
    statusCode: code,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      signedUrl,
      fileUrl
    })
  }
}

const getId = () => {
  return crypto.randomBytes(8).toString('hex');
}

const uploadToBucket = async (contentType, ext, isPublic) => {
  let filename = getId(); // random file name
  var s3Params = {
    Bucket: BUCKET_NAME,
    Key: `${filename}.${ext}`,
    ContentType: contentType,
    ACL: isPublic ? 'public-read' : null,
    Expires: 600 // 10 minutes
  };

  const signedUrl = S3.getSignedUrl('putObject', s3Params);
  const imgUrl = `https://${BUCKET_NAME}.s3.us-east-1.amazonaws.com/${filename}.${ext}`;
  return sendResponse(200, signedUrl, imgUrl);
}

const resize = async (imageURL, height, width) => {
  const temp = await fetch(imageURL);
  const blob = await temp.buffer();
  const w = parseInt(width);
  const h = parseInt(height);
  const image = await resizeImg(blob, { width: w, height: h });

  let imgName = imageURL.split(".com/")[1];
  const params = {
    Bucket: BUCKET_NAME,
    Key: imgName,
    Body: image,
    ACL: 'public-read',
    ContentType: "image/jpeg"
  };
  const res = await S3.putObject(params).promise();
  console.log("uploadResult :: " + JSON.stringify(res));
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      success: true,
      message: "uploaded successfully",
    })
  }
}

module.exports.hello = async (event) => {
  console.log(event);
  try {
    if (event.httpMethod === 'POST' && event.path === '/') {
      const { contentType, ext, isPublic } = JSON.parse(event.body);
      console.log(contentType, ext, isPublic);
      return await uploadToBucket(contentType, ext, isPublic);
    }
    if (event.httpMethod === 'POST' && event.path === '/resize/') {
      const { imgUrl, height, width } = JSON.parse(event.body);
      console.log(imgUrl, height, width);
      return await resize(imgUrl, height, width);
    }

  }
  catch (error) {
    console.log(error);
  }
};