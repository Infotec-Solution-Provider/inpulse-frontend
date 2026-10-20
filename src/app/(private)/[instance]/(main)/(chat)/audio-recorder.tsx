import { Mic, Square } from "lucide-react";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon } from "@/lib/ui-system/icons";
import { useEffect, useRef, useState } from "react";

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
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recordingTime, setRecordingTime] = useState(0); // Tempo de gravação em segundos

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
    };
  }, []);

  const startRecording = async () => {
    try {
      clearTimer();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        clearTimer();
        stopStream();
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
    clearTimer();
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="ip-composer-recorder">
      {!isRecording ? (
        <OperationalIconButton label="Gravar áudio" onClick={startRecording}>
          <UiIcon icon={Mic} scale="toolbar" />
        </OperationalIconButton>
      ) : (
        <OperationalIconButton
          label="Parar gravação"
          className="ip-composer-recording-stop"
          onClick={stopRecording}
        >
          <UiIcon icon={Square} scale="toolbar" />
        </OperationalIconButton>
      )}

      {isRecording && (
        <span className="ip-composer-recording-time" role="status">
          Gravando {formatTime(recordingTime)}
        </span>
      )}
    </div>
  );
}
