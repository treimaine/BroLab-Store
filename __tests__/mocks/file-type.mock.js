// Mock pour file-type
module.exports = {
  fileTypeFromBuffer: jest.fn().mockResolvedValue({
    mime: 'audio/mpeg',
    ext: 'mp3'
  }),
  fileTypeFromFile: jest.fn().mockResolvedValue({
    mime: 'audio/mpeg',
    ext: 'mp3'
  }),
  fileTypeFromStream: jest.fn().mockResolvedValue({
    mime: 'audio/mpeg',
    ext: 'mp3'
  }),
  supported: {
    audio: ['mp3', 'wav', 'aiff', 'flac'],
    image: ['jpg', 'png', 'gif', 'webp'],
    document: ['pdf']
  }
}; 