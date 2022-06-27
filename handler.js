const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const crypto = require("crypto");
const resizeImg = require('resize-img');
const fetch = require('node-fetch');

const BUCKET_NAME = process.env.BUCKET_NAME;

const sendResponse = (code, signedUrl, imageName) => {
  return {
    statusCode: code,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      signedUrl,
      imageName
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
    //ACL: isPublic ? 'public-read' : null,
    Expires: 600 // 10 minutes
  };

  const signedUrl = S3.getSignedUrl('putObject', s3Params)
  const imageName = `${filename}.${ext}`;
  return sendResponse(200, signedUrl, imageName);
}

const resize = async (imgName, height, width, contentType) => {
  const imageURL = S3.getSignedUrl('getObject', {
    Bucket: BUCKET_NAME,
    Key: imgName,
    Expires: 600 //time to expire in seconds
  });
  console.log(imageURL);
  const temp = await fetch(imageURL);
  const blob = await temp.buffer();
  const w = parseInt(width);
  const h = parseInt(height);
  const image = await resizeImg(blob, { width: w, height: h });

  const params = {
    Bucket: BUCKET_NAME,
    Key: imgName,
    Body: image,
    //ACL: 'public-read',
    ContentType: contentType,
    Expires: 600
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
      imageUrl: imageURL
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
      const { imgName, height, width, contentType } = JSON.parse(event.body);
      console.log(imgName, height, width, contentType);
      return await resize(imgName, height, width, contentType);
    }
  }
  catch (error) {
    console.log(error);
  }
};