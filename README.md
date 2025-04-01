# Nxt Cloud

A modern, secure cloud storage application built with React Native and Expo.

## Latest Version 1.9.0

## Features

- **Secure File Storage**: Store and access your files securely in the cloud
- **Folder Organization**: Create folders and subfolders to organize your content
- **File Operations**: Upload, download, move, and delete files easily
- **Media Capture**: Take photos and record videos directly from the app
- **File Sharing**: Receive files shared from other apps and upload directly to cloud
- **File Preview**: Preview images, videos, PDFs, and text files
- **Sorting Options**: Sort files by name, date, size, or type
- **Biometric Authentication**: Secure access with fingerprint or Face ID
- **Dark Mode Support**: Comfortable viewing in low-light environments

## New in Version 1.9.0
- **Enhanced Video Preview**: Better video playback experience with fullscreen support and native controls
- **Share from Gallery**: Upload files directly from other apps using the share feature
- **Video Recording**: Capture videos directly within the app and upload to cloud storage
- **File Sorting**: Sort files by multiple criteria including name, date, size, and type
- **Improved UI**: More compact and user-friendly interface

## Technologies Used

- React Native
- Expo
- AWS S3 Compatible Storage (Cloudflare R2)
- React Navigation
- Expo FileSystem
- Expo Camera & Image Picker

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository
```bash
git clone https://github.com/enclave-projects/Nxt-Cloud.git
cd nxt-cloud
```

2. Install dependencies
```bash
npm install
```

3. Create a `config` folder in the root directory and add your R2 configuration
```javascript
// r2Config.js
export const R2_CONFIG = {
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
  endpoint: 'YOUR_ENDPOINT',
  region: 'auto',
  bucket: 'YOUR_BUCKET_NAME'
};
```

4. Start the development server
```bash
npm start
```

## Build

To build for production:

```bash
expo build:android
expo build:ios
```

## Privacy and Security

- Files are encrypted in transit and at rest
- Biometric authentication for secure access
- Screen capture prevention (optional setting)
- Automatic session timeouts

## License

This project is licensed under the MIT License - see the LICENSE file for details.
