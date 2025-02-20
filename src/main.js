import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from "@snap/camera-kit"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { CONFIG } from "./config.js"

if (CONFIG.API_TOKEN === "__API_TOKEN__") {
  throw new Error("Please configure your Camera Kit credentials in config.js")
}

;(async function () {
  let mediaRecorder
  let recordedChunks = []
  let isBackFacing = false
  let recordPressedCount = 0
  let processedVideo = null
  const loadingIcon = document.getElementById('loading')

  const ffmpeg = new FFmpeg()
  //Replace with your own api token, lens id, and group id
  const apiToken = CONFIG.API_TOKEN
  const lensID = CONFIG.LENS_ID
  const groupID = CONFIG.GROUP_ID

  const cameraKit = await bootstrapCameraKit({
    apiToken: apiToken,
  })

  //Set which camera will be used
  //'user' = front camera
  //'environment' = back camera
  const constraints = {
    video: {
      facingMode: "user",
      width: { ideal: 3840, min: 1280 },  // 4K width
      height: { ideal: 2160, min: 720 },  // 4K height (16:9 aspect ratio)
      aspectRatio: { ideal: 16/9 }  // Add aspect ratio constraint
    },
    audio: false // Optional: Disable microphone
  }

  //Get canvas element for live render target
  const liveRenderTarget = document.getElementById("canvas")

  // Set canvas size to maintain aspect ratio
  const aspectRatio = 16/9;
  const width = window.innerWidth;
  const height = width / aspectRatio;
  liveRenderTarget.style.width = '100%';
  liveRenderTarget.style.height = 'auto';

  //Create camera kit session and assign liveRenderTarget canvas to render out live render target from camera kit
  const session = await cameraKit.createSession({ liveRenderTarget })

  //Check if getUserMedia is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('getUserMedia is not supported');
    alert('Your browser does not support accessing the camera. Please use a modern browser like Chrome or Firefox.');
    return;
  }

  try {
    // First explicitly request permissions on desktop
    await navigator.permissions.query({ name: 'camera' })
      .then(async (permissionStatus) => {
        if (permissionStatus.state === 'denied') {
          throw new Error('Camera permission was denied');
        }
      })
      .catch(error => {
        console.log('Permissions API not supported, falling back to getUserMedia');
      });

    // Then check available devices
    const permissions = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = permissions.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length === 0) {
      throw new Error('No video devices found');
    }

    // For desktop browsers, try with 4K constraints first
    let mediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (initialError) {
      console.warn('Failed with 4K constraints, trying HD:', initialError);
      // Fallback to HD if 4K fails
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },  // Fix height for HD (1080p)
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      });
    }

    const source = createMediaStreamSource(mediaStream, { cameraType: "user" });

    //Set up source settings so that it renders out correctly on browser
    await session.setSource(source);
    //only for front camera use
    source.setTransform(Transform2D.MirrorX);
    await source.setRenderSize(window.innerWidth, window.innerHeight);
    await session.setFPSLimit(60);
    await session.play(); //plays live target by default
  } catch (error) {
    console.error('Error accessing camera:', error.name, error.message);
    if (error.name === 'NotAllowedError' || error.message === 'Camera permission was denied') {
      alert('Camera access was denied. Please grant camera permissions in your browser settings and reload the page.\n\nIn Chrome: Click the camera icon in the address bar and select "Allow".');
    } else if (error.name === 'NotFoundError') {
      alert('No camera found on your device.');
    } else if (error.name === 'NotReadableError') {
      alert('Camera is already in use by another application.');
    } else if (error.name === 'OverconstrainedError') {
      // If we get an OverconstrainedError, try again with no constraints
      try {
        let mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const source = createMediaStreamSource(mediaStream, { cameraType: "user" });
        await session.setSource(source);
        source.setTransform(Transform2D.MirrorX);
        await source.setRenderSize(window.innerWidth, window.innerHeight);
        await session.setFPSLimit(60);
        await session.play();
      } catch (retryError) {
        console.error('Error on retry:', retryError);
        alert('Could not access camera. Please check your camera settings and reload the page.');
      }
    } else {
      alert('Error accessing camera. Please make sure you have granted camera permissions and are using a supported browser.');
    }
    return;
  }

  //Assign Lens ID (left) and Group ID(Right) to camera kit
  const lens = await cameraKit.lensRepository.loadLens(lensID, groupID)

  await session.applyLens(lens)

  //Get all elements require to perform logics
  const recordButton = document.getElementById("record-button")
  const recordOutline = document.getElementById("outline")
  const actionbutton = document.getElementById("action-buttons")
  const switchButton = document.getElementById("switch-button")
  const backButtonContainer = document.getElementById("back-button-container")

  recordButton.addEventListener("click", async () => {
    //first check if it should start record or stop record
    // even number = start, odd number = stop
    if (recordPressedCount % 2 == 0) {
      //Manage media recorder and start recording
      manageMediaRecorder(session)

      //Show stop record button
      recordButton.style.backgroundImage = "url('./assets/RecordStop.png')"
    } else {
      //hide stop record button
      RecordButtonToggle(false)
      //switch back to record button when recording stopped
      recordButton.style.backgroundImage = "url('./assets/RecordButton.png')"
      //Stop media recording
      mediaRecorder.stop()
    }
    recordPressedCount += 1
  })

  switchButton.addEventListener("click", () => {
    //update & switch between front and back camera
    updateCamera(session)
  })

  /*
  ========================================
  Functions
  ========================================
  */

  //To convert recorded video to proper mp4 format that can be shared to social media
  async function fixVideoDuration(blob) {
    console.log(blob)
    // Load FFmpeg.js
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    })

    // Write the input video blob to FFmpeg's virtual filesystem
    await ffmpeg.writeFile("input.mp4", await fetchFile(blob))

    // Reprocess the video to ensure metadata is added correctly
    await ffmpeg.exec(["-i", "input.mp4", "-movflags", "faststart", "-c", "copy", "output.mp4"])

    // Read the fixed video file from the virtual filesystem
    const fixedData = await ffmpeg.readFile("output.mp4")

    // Create a new Blob for the fixed video
    const fixedBlob = new Blob([fixedData.buffer], { type: "video/mp4" })

    // Return the fixed Blob
    return fixedBlob
  }

  //Function to toggle record button visibility
  function RecordButtonToggle(isVisible) {
    if (isVisible) {
      recordOutline.style.display = "block"
      recordButton.style.display = "block"
    } else {
      recordOutline.style.display = "none"
      recordButton.style.display = "none"
    }
  }

  //Function to switch camera between front & back
  async function updateCamera(session) {
    isBackFacing = !isBackFacing

    try {
      if (mediaStream) {
        await session.pause()
        mediaStream.getVideoTracks().forEach(track => track.stop())
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: isBackFacing ? "environment" : "user" },
            width: { ideal: 3840, min: 1280 },
            height: { ideal: 2160, min: 720 },
            aspectRatio: { ideal: 16/9 }
          }
        })
      } catch (error) {
        console.warn('Failed with 4K constraints, trying HD:', error);
        // If 4K fails, try HD
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: isBackFacing ? "environment" : "user" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 16/9 }
          }
        })
      }

      const source = createMediaStreamSource(mediaStream, {
        cameraType: isBackFacing ? "environment" : "user"
      })

      await session.setSource(source)
      
      // Apply transform based on camera type
      if (!isBackFacing) {
        source.setTransform(Transform2D.MirrorX)
      } else {
        source.setTransform(Transform2D.None)  // Reset transform for back camera
      }

      await source.setRenderSize(window.innerWidth, window.innerHeight)
      await session.play()

      console.log('Camera switched to:', isBackFacing ? 'back' : 'front');
    } catch (error) {
      console.error('Error switching camera:', error.name, error.message)
      if (error.name === 'NotAllowedError') {
        alert('Camera access was denied. Please grant camera permissions and reload the page.')
      } else if (error.name === 'NotFoundError') {
        alert('Could not find the ' + (isBackFacing ? 'back' : 'front') + ' camera.')
      } else if (error.name === 'OverconstrainedError') {
        // Try one last time with basic constraints
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: isBackFacing ? "environment" : "user"
            }
          });
          const source = createMediaStreamSource(mediaStream, {
            cameraType: isBackFacing ? "environment" : "user"
          });
          await session.setSource(source);
          if (!isBackFacing) {
            source.setTransform(Transform2D.MirrorX)
          } else {
            source.setTransform(Transform2D.None)
          }
          await source.setRenderSize(window.innerWidth, window.innerHeight);
          await session.play();
        } catch (retryError) {
          console.error('Final camera switch attempt failed:', retryError);
          alert('Failed to switch camera. Your device might not support camera switching.');
          isBackFacing = !isBackFacing;  // Revert the flag
        }
      } else {
        alert('Failed to switch camera. Please check your device permissions.')
        isBackFacing = !isBackFacing
      }
    }
  }

  //Function to setup media recorder and start recording
  function manageMediaRecorder(session) {
    console.log("session output capture")
    const ms = liveRenderTarget.captureStream(60)
    mediaRecorder = new MediaRecorder(ms, { mimeType: "video/mp4" })
    console.log("create media recorder")
    recordedChunks = []
    // Handle recorded data once it is available
    mediaRecorder.ondataavailable = (event) => {
      console.log("start record")

      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }
    // Handle recording data when recording stopped
    mediaRecorder.onstop = async () => {
      console.log("stop record")
      try {
        //display loading icon while video is being processed
        if (loadingIcon) {
          loadingIcon.style.display = "block"
        } else {
          console.warn("Loading icon element not found")
        }

        const blob = new Blob(recordedChunks, { type: "video/mp4" })
        console.log("Created initial blob:", blob.size, "bytes")
        
        const fixedBlob = await fixVideoDuration(blob)
        console.log("Created fixed blob:", fixedBlob.size, "bytes")
        
        // Generate a URL for the fixed video
        const url = URL.createObjectURL(fixedBlob)
        
        //hide loading icon once video is done processing
        if (loadingIcon) {
          loadingIcon.style.display = "none"
        }
        
        displayPostRecordButtons(url, fixedBlob)
      } catch (error) {
        console.error("Error in recording stop handler:", error)
        if (loadingIcon) {
          loadingIcon.style.display = "none"
        }
        alert("Error processing video. Please try again.")
      }
    }
    //Start recording
    mediaRecorder.start()
  }

  function displayPostRecordButtons(url, fixedBlob) {
    actionbutton.style.display = "block"
    backButtonContainer.style.display = "block"
    switchButton.style.display = "none"

    //Logic for when download button is selected
    document.getElementById("download-button").onclick = () => {
      const a = document.createElement("a")
      a.href = url
      a.download = "recording.mp4" //Change downloaded file name here
      a.click()
      a.remove()
    }

    //Logic for when share button is selected
    document.getElementById("share-button").onclick = async () => {
      try {
        const file = new File([fixedBlob], "recording.mp4", { type: "video/mp4" }) // Convert blob to file

        // Check if sharing files is supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Recorded Video",
            text: "Check out this recording!",
          })
          console.log("File shared successfully")
        } else {
          console.error("Sharing files is not supported on this device.")
        }
      } catch (error) {
        console.error("Error while sharing:", error)
      }
    }

    document.getElementById("back-button").addEventListener("click", () => {
      //TODO: Add logic to go back to recording
      actionbutton.style.display = "none"
      backButtonContainer.style.display = "none"
      RecordButtonToggle(true)
    })
  }
})()
