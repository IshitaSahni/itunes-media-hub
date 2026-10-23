import { useCallback, useEffect, useRef, useState } from "react";

export default function useAudioPlayer() {
  const audioRef = useRef(null);

  if (audioRef.current === null) {
    audioRef.current = new Audio();
  }

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const audio = audioRef.current;

    audio.volume = 0.8;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(
        Number.isFinite(audio.duration) ? audio.duration : 0
      );
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();

      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener(
        "durationchange",
        handleDurationChange
      );
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio.src) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Audio playback failed:", error);
      }
    } else {
      audio.pause();
    }
  }, []);

  const playPreview = useCallback(async (item) => {
    if (!item.previewUrl) return;

    const audio = audioRef.current;

    if (audio.src === item.previewUrl) {
      if (audio.paused) {
        try {
          await audio.play();
        } catch (error) {
          console.error("Audio playback failed:", error);
        }
      } else {
        audio.pause();
      }

      return;
    }

    audio.pause();
    audio.src = item.previewUrl;
    audio.load();

    setCurrentTrack(item);
    setCurrentTime(0);
    setDuration(0);

    try {
      await audio.play();
    } catch (error) {
      console.error("Audio playback failed:", error);
    }
  }, []);

  const seek = useCallback((percentage) => {
    const audio = audioRef.current;

    if (
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      audio.currentTime =
        (percentage / 100) * audio.duration;
    }
  }, []);

  const changeVolume = useCallback((newVolume) => {
    const audio = audioRef.current;

    const safeVolume = Math.max(
      0,
      Math.min(1, newVolume)
    );

    audio.volume = safeVolume;
    setVolume(safeVolume);
  }, []);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playPreview,
    togglePlayback,
    seek,
    changeVolume,
  };
}