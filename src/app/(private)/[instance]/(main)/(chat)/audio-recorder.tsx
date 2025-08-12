import { useState, useRef } from "react";
import { IconButton, CircularProgress } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";

interface AudioRecorderProps {
  onAudioRecorded?: (file: File) => void;
}

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function AudioRecorder({ onAudioRecorded }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingTime, setRecordingTime] = useState(0); // Tempo de gravação em segundos

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mpeg" });
        audioChunksRef.current = [];

        if (onAudioRecorded) {
          const file = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });
          onAudioRecorded(file);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0); // Reinicia o contador

      // Inicia o timer para atualizar o tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Erro ao acessar o microfone:", error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 pr-1 sm:pr-2">
      {!isRecording ? (
        <IconButton 
          color="primary" 
          onClick={startRecording} 
          size="small"
          className="!p-1 sm:!p-2"
        >
          <MicIcon fontSize="small" />
        </IconButton>
      ) : (
        <IconButton 
          color="error" 
          onClick={stopRecording} 
          size="small"
          className="!p-1 sm:!p-2"
        >
          <StopIcon fontSize="small" />
        </IconButton>
      )}

      {isRecording && (
        <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap">
          {formatTime(recordingTime)}
        </span>
      )}
    </div>
  );
}
