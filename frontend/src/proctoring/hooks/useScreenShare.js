/**
 * useScreenShare — request and monitor a screen-share stream via
 * navigator.mediaDevices.getDisplayMedia. Detects if the user
 * stops sharing (the "Stop" pill in Chrome) and fires onStop.
 *
 *   const { stream, isSharing, request, stop, error } =
 *       useScreenShare({ onStop, onDenied });
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useScreenShare({ onStop, onDenied } = {}) {
  const [stream, setStream] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);
  const onStopRef = useRef(onStop);
  const onDeniedRef = useRef(onDenied);

  useEffect(() => { onStopRef.current = onStop; }, [onStop]);
  useEffect(() => { onDeniedRef.current = onDenied; }, [onDenied]);

  const request = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      const e = new Error('Screen sharing is not supported in this browser');
      setError(e); onDeniedRef.current?.(e);
      return null;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });
      setStream(s);
      setIsSharing(true);

      // The user can stop sharing at any time via the browser UI.
      s.getVideoTracks().forEach(track => {
        track.addEventListener('ended', () => {
          setIsSharing(false);
          setStream(null);
          onStopRef.current?.();
        });
      });

      return s;
    } catch (err) {
      setError(err);
      onDeniedRef.current?.(err);
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setIsSharing(false);
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  }, [stream]);

  return { stream, isSharing, request, stop, error };
}
