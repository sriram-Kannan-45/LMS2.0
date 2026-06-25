/**
 * Captures a video frame from a MediaStream (the screen share stream)
 * and returns it as a compressed base64 JPEG string.
 * 
 * @param {MediaStream} stream - The screen share MediaStream
 * @param {number} quality - JPEG compression quality (0.0 to 1.0)
 * @returns {Promise<string|null>} Resolves to a base64 data URL string or null if failed
 */
export function captureFrame(stream, quality = 0.5) {
  return new Promise((resolve) => {
    try {
      if (!stream) {
        return resolve(null);
      }
      
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0) {
        return resolve(null);
      }

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      // When the video metadata is loaded, play it and capture the frame
      video.onloadedmetadata = () => {
        video.play()
          .then(() => {
            // Give it a tiny moment to ensure the stream is drawing actual pixels
            setTimeout(() => {
              try {
                const canvas = document.createElement('canvas');
                // Use the video's actual stream dimensions, or fall back to track settings
                const width = video.videoWidth || 1280;
                const height = video.videoHeight || 720;
                
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  return resolve(null);
                }

                ctx.drawImage(video, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Clean up the video element
                video.srcObject = null;
                video.pause();
                
                resolve(dataUrl);
              } catch (err) {
                console.error('Error drawing frame to canvas:', err);
                resolve(null);
              }
            }, 100);
          })
          .catch((err) => {
            console.error('Error playing video for captureFrame:', err);
            resolve(null);
          });
      };

      video.onerror = (err) => {
        console.error('Video error in captureFrame:', err);
        resolve(null);
      };
    } catch (err) {
      console.error('Failed to capture frame from stream:', err);
      resolve(null);
    }
  });
}
