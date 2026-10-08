var ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
var MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function uploadBase64Image(file, folderPropertyKey) {
  if (!file || !file.base64) throw appError('VALIDATION_ERROR', 'Missing file');
  if (ACCEPTED_IMAGE_TYPES.indexOf(file.mime_type) === -1) {
    throw appError('VALIDATION_ERROR', 'Unsupported file type');
  }
  var bytes = Utilities.base64Decode(file.base64);
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw appError('VALIDATION_ERROR', 'File is larger than 5MB');
  }
  var folderId = PropertiesService.getScriptProperties().getProperty(folderPropertyKey);
  if (!folderId) throw appError('CONFIG_ERROR', folderPropertyKey + ' is not configured');

  var safeName = String(file.name || 'upload').replace(/[^\w.\-ก-๙]/g, '_');
  var blob = Utilities.newBlob(bytes, file.mime_type, new Date().getTime() + '-' + safeName);
  var folder = DriveApp.getFolderById(folderId);
  var driveFile = folder.createFile(blob);
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    file_id: driveFile.getId(),
    url: 'https://drive.google.com/thumbnail?id=' + driveFile.getId() + '&sz=w1600'
  };
}
