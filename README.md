# Nxt Cloud

A personal cloud storage solution built with Expo and React Native.

## Features
- File upload with progress tracking and cancellation
- File management (list, delete, download, move)
- Folder navigation
- Device authentication and app protection (prevents screen capture when enabled)
- Notifications integration

## Folder Structure
- **/assets**  
  Contains images and sound assets, e.g., `nxt-cloud-logo.png`, `nxt-logo-nobg.png`, `notification_sound.wav`.
- **/components**  
  Reusable UI components like `ProgressBar.js`, `FileActionMenu.js`, `FilePreview.js`, and `StorageGraph.js`.
- **/config**  
  Configuration files such as `r2Config.js` for Cloudflare R2 settings.
- **/context**  
  Global context providers like `AuthContext.js` that handle authentication and settings.
- **/screens**  
  Application screens including `LoginScreen.js`, `HomeScreen.js`, `SettingsScreen.js`, and (potentially) `CameraScreen.js`.
- **/utils**  
  Utility functions for file operations (`fileOperations.js`), notifications (`notifications.js`), and storage statistics (`storageStats.js`).
- **/constants**  
  Theme and styling constants defined in `theme.js`.
- **App.js**  
  The main entry point that sets up navigation, global state, and applies global settings.

## Setup
1. Clone the repository:
   ```
   git clone https://github.com/enclave-projects/Nxt-Cloud.git
   ```
2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
3. Configure any required environment variables.
4. Start the development server with:
   ```
   expo start
   ```

## Build and Deployment
Use Expo's EAS build system to build and deploy your app.

## Customization and Rebranding
This project is open source and welcomes your customization. Anyone can rebuild this project by changing the credentials and making personalized modifications. Feel free to adjust configuration files (e.g., `config/r2Config.js`), update styling, and add or remove features to create your own version.

## License
This project is licensed under the MIT License.

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/enclave-projects/Nxt-Cloud?utm_source=oss&utm_medium=github&utm_campaign=enclave-projects%2FNxt-Cloud&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
