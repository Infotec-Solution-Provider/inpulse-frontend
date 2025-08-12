import { FC, MouseEvent, useCallback, useState, useRef, useEffect } from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import { IconButton, Dialog, DialogContent, IconButton as MuiIconButton, Zoom } from '@mui/material';
import { Close as CloseIcon, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon } from '@mui/icons-material';
import filesService from '@/lib/services/files.service';
import { useTheme } from '@mui/material/styles';

interface MessageFileProps {
  fileName: string;
  fileType: string;
  fileSize: number | string; // Accept both string and number
  fileId: number;
  onClickImage?: (url: string) => void;
}

const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isInWebView = (): boolean => {
  return /(WebView|inpulse-app)/i.test(navigator.userAgent);
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const MessageFile: FC<MessageFileProps> = ({
  fileName,
  fileType,
  fileSize,
  fileId,
  onClickImage,
}) => {
  const url = filesService.getFileDownloadUrl(fileId);
  const isMobileOrWebView = isMobileDevice() || isInWebView();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Efeito para limpar a referência do áudio quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Convert fileSize to a valid number, default to 0 if parsing fails or is invalid
  const numericFileSize = (() => {
    if (fileSize === null || fileSize === undefined) return 0;
    const num = typeof fileSize === 'string' ? parseFloat(fileSize) : Number(fileSize);
    return isNaN(num) ? 0 : Math.max(0, num);
  })();
  const fileSizeText = formatFileSize(numericFileSize);

  const togglePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => {
        console.error('Erro ao reproduzir áudio:', e);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, url]);

  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const theme = useTheme();

  const handleImageClick = useCallback((e: MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    setOpen(true);
    setZoom(1);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setZoom(1);
  }, []);

  const zoomIn = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  if (fileType.includes('image')) {
    return (
      <>
        <div className="max-w-full flex justify-center">
          <img
            src={url}
            alt={fileName}
            className="max-h-64 max-w-full cursor-pointer rounded-lg object-contain hover:opacity-90"
            onClick={handleImageClick}
          />
        </div>
        
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="lg"
          PaperProps={{
            style: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden',
              maxHeight: '90vh',
              maxWidth: '90vw',
            },
          }}
          BackdropProps={{
            style: {
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
            },
          }}
          onClick={handleClose}
        >
          <DialogContent
            onClick={e => e.stopPropagation()}
            sx={{
              p: 0,
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={url}
              alt={fileName}
              style={{
                maxHeight: '80vh',
                maxWidth: '80vw',
                objectFit: 'contain',
                transform: `scale(${zoom})`,
                transition: 'transform 0.2s ease-in-out',
                cursor: 'zoom-in',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setZoom(prev => (prev === 1 ? 2 : 1));
              }}
            />
            
            <div style={{
              position: 'absolute',
              top: theme.spacing(1),
              right: theme.spacing(1),
              display: 'flex',
              gap: theme.spacing(1),
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: theme.shape.borderRadius,
              padding: theme.spacing(0.5),
            }}>
              <MuiIconButton
                size="small"
                onClick={zoomOut}
                color="inherit"
                sx={{ color: 'white' }}
                title="Zoom Out"
              >
                <ZoomOutIcon />
              </MuiIconButton>
              <MuiIconButton
                size="small"
                onClick={zoomIn}
                color="inherit"
                sx={{ color: 'white' }}
                title="Zoom In"
              >
                <ZoomInIcon />
              </MuiIconButton>
              <MuiIconButton
                size="small"
                onClick={handleClose}
                color="inherit"
                sx={{ color: 'white' }}
                title="Fechar"
              >
                <CloseIcon />
              </MuiIconButton>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (fileType.includes('video')) {
    return (
      <div className="w-full max-w-2xl">
        <video
          controls
          className="max-h-96 w-full rounded-lg"
          src={url}
        >
          Seu navegador não suporta o elemento de vídeo.
        </video>
      </div>
    );
  }

  if (fileType.includes('audio')) {
    if (isMobileOrWebView) {
      // Mobile/WebView audio player com controles de play/pause
      return (
        <div className="w-full p-2 rounded-md bg-green-100 dark:bg-green-900">
          <div 
            className="flex items-center gap-3 p-2 active:bg-green-200 dark:active:bg-green-800 rounded"
            onClick={togglePlayPause}
            style={{
              WebkitTapHighlightColor: 'transparent',
              cursor: 'pointer',
              WebkitTouchCallout: 'none',
              userSelect: 'none',
              touchAction: 'manipulation'
            }}
          >
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-green-200 dark:bg-green-800">
              {isPlaying ? (
                <svg
                  className="w-5 h-5 text-green-700 dark:text-green-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-green-700 dark:text-green-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                Mensagem de áudio
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {fileSizeText}
              </p>
            </div>
            <a
              href={url}
              download
              className="p-2 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
              onClick={(e) => e.stopPropagation()}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              <DownloadIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      );
    }
    
    // Desktop - Versão com controles de play/pause
    return (
      <div className="w-full p-2 rounded-md bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 transition-colors">
        <div 
          className="flex items-center gap-3 p-2 rounded cursor-pointer"
          onClick={togglePlayPause}
        >
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-green-200 dark:bg-green-800">
            {isPlaying ? (
              <svg
                className="w-5 h-5 text-green-700 dark:text-green-300"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-green-700 dark:text-green-300"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              Mensagem de áudio
            </p>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {fileSizeText}
            </p>
          </div>
          <a
            href={url}
            download
            className="p-2 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
            onClick={(e) => e.stopPropagation()}
          >
            <DownloadIcon className="w-5 h-5" />
          </a>
        </div>
      </div>
    );
  }

  // Default file download for unsupported types
  return (
    <div className="w-full p-3 rounded-md bg-gray-100 dark:bg-gray-800">
      <div className="flex flex-col p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <div className="flex items-start gap-3 w-full">
          <div className="flex-shrink-0 pt-0.5">
            <DownloadIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
              {fileName}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-300">
                {fileSizeText}
              </p>
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
              >
                Baixar
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
