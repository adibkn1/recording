# Snap Camera Kit for Web - Front-End Template 🎥

This repository serves as a **template** for building front-end applications using the Snap Camera Kit for Web. It provides essential features to help developers integrate Snap Lens effects into their web AR project with recording feature.

> ⚠️ **SECURITY WARNING**  
> **DO NOT USE THIS REPOSITORY FOR CLIENT PROJECTS**  
> The Camera Kit App Token will be exposed in the client-side code, making it accessible to anyone who visits the web AR app. This could lead to unauthorized usage and potential security risks.
>
> 💡 **Recommended Usage**:
>
> - For development and testing only
> - Use a server-side solution for production deployments

## Features ✨

- **Recording Feature** 📹: Users can record videos showcasing Snap Lens effects by simply pressing a button.
- **Share & Download** 💾: After processing the video, users can:
  - **Share** 📤: Easily share the video to any social media app on their phone.
  - **Download** ⬇️: Save the video locally for future use.

## Tech Stack 🛠️

- Camera Kit for Web V1.0.0📸
- Webpack (for bundling and local HTTPS development) 📦
- JavaScript/HTML/CSS 💻
- MediaRecorder API (for video recording) 🎬
- Web Share API (for sharing functionality) 🔗

## Project Structure 📁

```
├── src/                # Source files
│   ├── index.html     # Main HTML file
│   ├── index.js       # Entry point
│   ├── config.js      # Camera Kit configuration
│   └── styles/        # CSS styles
├── docs/              # Production build output
├── webpack.config.js  # Webpack configuration
└── package.json       # Project dependencies
```

## Getting Started 🚀

### Prerequisites 📋

- **Node.js**: Ensure you have [Node.js](https://nodejs.org/) installed on your system.
- **npm**: Comes bundled with Node.js, verify it is installed by running:
  ```
  npm -v
  ```
- **Webpack**: This repository uses Webpack as the module bundler.

### Installation 💿

1. Clone the repository:
   ```
   git clone https://github.com/your-username/snap-camera-kit-template.git
   ```
2. Navigate to the project directory:
   ```
   cd snap-camera-kit-template
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Configuration ⚙️

1. In `src/config.js`, replace the placeholder values:
   ```javascript
   export const CONFIG = {
     LENS_ID: "__LENS_ID__", // Your Lens ID
     GROUP_ID: "__GROUP_ID__", // Your Group ID
     API_TOKEN: "__API_TOKEN__", // Your API Token
   }
   ```
2. These credentials can be obtained from [Snap's Camera Kit Dashboard](https://camera-kit.snapchat.com/)

### Local Testing 🔍

To test the project locally:

1. Start the development server:

   ```
   npm run serve
   ```

   This will launch a local server, typically accessible at `http://localhost:9000`. Open the URL in your browser to test the application.

   Using webpack, you can also access the local server with https on your mobile devices at `https://yourIPAddress:9000`. This will be provided on your terminal by webpack.

2. Make changes to the code, and the server will automatically reload the app to reflect your updates.

### Building for Production 🏗️

To create a production-ready build, run:

```
npm run build
```

The optimized output will be stored in the `docs` directory, ready for deployment.

## Browser Support 🌐

- Chrome (desktop & mobile) - Recommended ✅
- Safari (iOS 14.5+) 📱
- Firefox (desktop & mobile) 🦊
- Edge (Chromium-based) 🌍

Note: For optimal AR experience, using Chrome on mobile devices is recommended.

## Troubleshooting 🔧

### Common Issues ⚠️

- **Camera not working on mobile** 📱:
  - Ensure you're using the HTTPS URL provided by webpack
  - Check if camera permissions are granted
  - Verify you're using a supported browser
- **Lens not loading** 🎭:
  - Verify your Camera Kit credentials are correct
  - Check browser console for specific error messages
  - Ensure your lens is published and active
- **Recording issues** 🎬:
  - Check if device has sufficient storage
  - Ensure browser supports MediaRecorder API
  - Verify required permissions are granted

### Mobile Debugging 🐛

To debug on mobile devices:

1. Connect your mobile device to your computer via USB
2. Enable USB debugging on your Android device or trust the computer on your iOS device
3. On Chrome desktop, navigate to `chrome://inspect`
4. Find your device and the web page under "Remote Target"
5. Click "inspect" to open Chrome DevTools for your mobile device
6. You can now see console logs and debug your mobile web app

## Credits 👏

This repository is derived from Vincent Trastour's excellent Camera Kit workshop resources. Full credit goes to Vincent for the foundational materials that inspired this project.

- **Workshop Resource**: [Camera Kit Workshop](https://maisonbleue.github.io/camera_kit_workshop/)
- **YouTube Video**: [Camera Kit Workshop Video](https://www.youtube.com/watch?v=ZQM9Ua_JKMY&t=459s&ab_channel=SnapAR)

## License 📄

This project is open-source and can be modified and distributed under the terms of your chosen license. Please respect the credits provided above when using or sharing this template.

---

Happy coding! 🎥✨
