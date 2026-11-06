"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResult = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const browser = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

export type PlayAudioOptions = {
  audioFile?: string;
  timeRange?: [number, number];
  role?: "0" | "1";
};

export function useMicrophone() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [hasRealMic, setHasRealMic] = useState(false);
  const [hasDetectedSpeech, setHasDetectedSpeech] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeDataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const microphoneInitializationRef = useRef<Promise<boolean> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isRecordingRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioActivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Pre-load voices for SpeechSynthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      };
    }
  }, []);

  // Request & initialize Microphone stream
  const initMicrophone = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("getUserMedia is not supported on this browser");
      return false;
    }

    if (streamRef.current && analyserRef.current) {
      if (audioCtxRef.current?.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      setHasRealMic(true);
      return true;
    }

    if (microphoneInitializationRef.current) {
      return microphoneInitializationRef.current;
    }

    const initialization = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });

        streamRef.current = stream;
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        timeDataArrayRef.current = new Uint8Array(analyser.fftSize);
        setHasRealMic(true);

        try {
          const mimeType = [
            "audio/webm;codecs=opus",
            "audio/mp4;codecs=mp4a.40.2",
            "audio/webm",
            "audio/mp4",
          ].find((type) => MediaRecorder.isTypeSupported(type));
          const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorder.onstop = () => {
            if (chunksRef.current.length > 0) {
              const blob = new Blob(chunksRef.current, {
                type: recorder.mimeType || "audio/webm",
              });
              setRecordedAudio(blob);
              if (recordingUrlRef.current) {
                URL.revokeObjectURL(recordingUrlRef.current);
              }
              const url = URL.createObjectURL(blob);
              recordingUrlRef.current = url;
              setRecordingUrl(url);
            }
          };
          recorderRef.current = recorder;
        } catch {
          // MediaRecorder optional
        }

        return true;
      } catch (err) {
        console.warn("Microphone access denied or error:", err);
        setHasRealMic(false);
        return false;
      }
    })();

    microphoneInitializationRef.current = initialization;
    try {
      return await initialization;
    } finally {
      if (microphoneInitializationRef.current === initialization) {
        microphoneInitializationRef.current = null;
      }
    }
  }, []);

  // Start speech recognition engine
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const RecognitionCtor = getSpeechRecognitionCtor();
    if (!RecognitionCtor) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const rec = new RecognitionCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (ev) => {
        let fullText = "";
        for (let i = 0; i < ev.results.length; i++) {
          fullText += `${ev.results[i][0].transcript} `;
        }
        setTranscript(fullText.trim());
      };
      rec.onend = () => {
        if (isRecordingRef.current && recognitionRef.current === rec) {
          try {
            rec.start();
          } catch {}
        }
      };
      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.warn("Speech recognition error:", err);
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // Stop recording voice
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (audioActivityIntervalRef.current) {
      clearInterval(audioActivityIntervalRef.current);
      audioActivityIntervalRef.current = null;
    }
    stopSpeechRecognition();
    if (recorderRef.current && recorderRef.current.state === "recording") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
  }, [stopSpeechRecognition]);

  // Start recording voice
  const startRecording = useCallback(async () => {
    // Ensure microphone is initialized
    const microphoneReady = await initMicrophone();
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }

    setHasDetectedSpeech(false);
    chunksRef.current = [];
    setRecordedAudio(null);
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null;
      setRecordingUrl(null);
    }
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state === "inactive") {
          recorderRef.current.start(1000);
        } else if (recorderRef.current.state === "paused") {
          recorderRef.current.resume();
        }
      } catch {}
    }

    startSpeechRecognition();
    setIsRecording(true);

    if (audioActivityIntervalRef.current) {
      clearInterval(audioActivityIntervalRef.current);
    }

    const analyser = analyserRef.current;
    if (microphoneReady && analyser) {
      const samples = new Uint8Array(analyser.fftSize);
      let speechFrameCount = 0;
      let speechStarted = false;
      let lastVoiceAt = 0;
      audioActivityIntervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const amplitude = (sample - 128) / 128;
          energy += amplitude * amplitude;
        }
        const rms = Math.sqrt(energy / samples.length);

        if (rms >= 0.03) {
          speechFrameCount += 1;
          lastVoiceAt = Date.now();
          if (!speechStarted && speechFrameCount >= 2) {
            speechStarted = true;
            setHasDetectedSpeech(true);
          }
        } else {
          speechFrameCount = 0;
        }

        if (speechStarted && Date.now() - lastVoiceAt >= 1800) {
          stopRecording();
        }
      }, 100);
    }
  }, [initMicrophone, startSpeechRecognition, stopRecording]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (isPlayingOriginal) return;

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isPlayingOriginal, isRecording, startRecording, stopRecording]);

  // Play reference sentence immediately, and automatically start mic recording when finished
  const playOriginalAndRecord = useCallback(
    (
      sentence: string,
      options?: PlayAudioOptions,
      onFinish?: () => void
    ) => {
      if (typeof window === "undefined") return;

      // 1. Immediately stop current mic recording
      stopRecording();
      setIsPlayingOriginal(true);
      void initMicrophone();

      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
        resumeIntervalRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      let completed = false;
      const handleEnd = () => {
        if (completed) return;
        completed = true;

        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current = null;
        }

        utteranceRef.current = null;
        setIsPlayingOriginal(false);
        onFinish?.();

        // Ngay khi đoạn âm thanh gốc phát xong -> Micro mới chạy
        startRecording();
      };

      // Phương thức phát bằng file audio cắt lát (nếu có file wav trong public/)
      const playWithAudioSlice = () => {
        if (!options?.audioFile || !options.timeRange) return false;

        try {
          const filePath = /^https?:\/\//i.test(options.audioFile)
            ? options.audioFile
            : "/" + options.audioFile.replace(/^\//, "");
          const [startTime, endTime] = options.timeRange;
          const audio = new Audio();
          audio.preload = "auto";
          audio.setAttribute("playsinline", "");
          audio.src = filePath;
          audioElementRef.current = audio;

          let fallbackStarted = false;
          const fallback = () => {
            if (completed || fallbackStarted) return;
            fallbackStarted = true;
            audio.pause();
            audioElementRef.current = null;
            playWithSpeechSynthesis();
          };
          audio.onloadedmetadata = () => {
            if (startTime > 0) {
              try {
                audio.currentTime = startTime;
              } catch {
                fallback();
              }
            }
          };
          audio.ontimeupdate = () => {
            if (audio.currentTime >= endTime) {
              audio.pause();
              handleEnd();
            }
          };
          audio.onended = handleEnd;
          audio.onerror = fallback;
          void audio.play().catch(fallback);
          return true;
        } catch {
          return false;
        }
      };

      // Phương thức phát bằng Web SpeechSynthesis
      const playWithSpeechSynthesis = () => {
        if (!("speechSynthesis" in window)) {
          handleEnd();
          return;
        }

        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = "en-US";
        utterance.rate = 0.95;

        if (options?.role === "0") {
          utterance.pitch = 0.92;
        } else {
          utterance.pitch = 1.05;
        }

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice =
          voices.find((v) => v.lang === "en-US" && !v.name.includes("whisper")) ||
          voices.find((v) => v.lang.startsWith("en"));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = handleEnd;
        utterance.onerror = (e) => {
          console.warn("SpeechSynthesis error:", e);
          handleEnd();
        };

        utteranceRef.current = utterance;

        resumeIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 3000);

        window.speechSynthesis.speak(utterance);
      };

      // Thử phát từ audio file lát cắt trước, nếu không có file sẽ tự động fallback sang SpeechSynthesis
      if (!playWithAudioSlice()) {
        playWithSpeechSynthesis();
      }
    },
    [initMicrophone, startRecording, stopRecording]
  );

  // Keyboard shortcut 'R'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "r" || e.key === "R") &&
        !["input", "textarea"].includes(
          (document.activeElement?.tagName || "").toLowerCase()
        )
      ) {
        toggleRecording();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleRecording]);

  const replayRecordedAudio = useCallback(async (): Promise<boolean> => {
    if (recordingUrl) {
      const audio = new Audio(recordingUrl);
      try {
        await audio.play();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [recordingUrl]);

  const clearAttempt = useCallback(() => {
    setTranscript("");
    setHasDetectedSpeech(false);
    setRecordedAudio(null);
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null;
    }
    setRecordingUrl(null);
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
      }
      if (audioActivityIntervalRef.current) {
        clearInterval(audioActivityIntervalRef.current);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (recordingUrlRef.current) {
        URL.revokeObjectURL(recordingUrlRef.current);
      }
      stopSpeechRecognition();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopSpeechRecognition]);

  return {
    isRecording,
    isPlayingOriginal,
    hasRealMic,
    hasDetectedSpeech,
    initMicrophone,
    startRecording,
    stopRecording,
    toggleRecording,
    playOriginalAndRecord,
    analyserRef,
    timeDataArrayRef,
    transcript,
    recordedAudio,
    replayRecordedAudio,
    clearAttempt,
  };
}
