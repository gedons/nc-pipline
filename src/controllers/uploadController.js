const cloudinary = require('../config/cloudinaryConfig');
const streamifier = require('streamifier');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = req.file.mimetype.startsWith('audio') ? 'video' : 'auto';
    
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: 'chat_app',
            timestamp: timestamp,
          },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req);
    console.log('[uploadFile] Cloudinary upload result:', result);
    res.status(200).json({ 
      success: true, 
      fileUrl: result.secure_url,
      public_id: result.public_id 
    });
  } catch (error) {
    console.error('[uploadFile] Error uploading file:', error);
    res.status(500).json({ success: false, message: 'File upload failed', error: error.message });
  }
};
