import filesService from "@/lib/services/files.service";
import { useContext, useMemo, useRef, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import { AppContext } from "../../app-context";
import { IconButton, Menu, MenuItem, Button } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CloseIcon from "@mui/icons-material/Close";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";

interface MessageFileProps {
  fileName: string;
  fileType: string;
  fileSize: string;
  fileId: number;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200, 300];

export default function MessageFile({ fileName, fileType, fileSize, fileId }: MessageFileProps) {
  const { closeModal, openModal } = useContext(AppContext);

  const handleClickImage = () => {
    const url = filesService.getFileDownloadUrl(fileId);
    openModal(<ZoomableImageModal url={url} alt={fileName} onClose={closeModal} />);
  };

  function ZoomableImageModal({
    url,
    alt,
    onClose,
  }: {
    url: string;
    alt: string;
    onClose: () => void;
  }) {
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const lastPosition = useRef<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 3;

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const zoomPercent = Math.round(zoom * 100);

    const onWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY / 500;
      setZoom((z) => {
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
        if (newZoom !== z && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const offsetX = e.clientX - rect.left - rect.width / 2 - position.x;
          const offsetY = e.clientY - rect.top - rect.height / 2 - position.y;
          setPosition((pos) => ({
            x: pos.x - offsetX * (newZoom / z - 1),
            y: pos.y - offsetY * (newZoom / z - 1),
          }));
        }
        return newZoom;
      });
    };

    const onMouseDown = (e: React.MouseEvent) => {
      if (zoom === 1) return;
      e.preventDefault();
      lastPosition.current = { x: e.clientX, y: e.clientY };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!lastPosition.current) return;
      e.preventDefault();
      const dx = e.clientX - lastPosition.current.x;
      const dy = e.clientY - lastPosition.current.y;
      setPosition((pos) => ({ x: pos.x + dx, y: pos.y + dy }));
      lastPosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      lastPosition.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    const resetZoom = () => {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    };

    const handleSelectZoom = (level: number) => {
      const newZoom = level / 100;
      setZoom(newZoom);
      setPosition({ x: 0, y: 0 });
      setAnchorEl(null);
    };

    const handleClickDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleCloseDropdown = () => {
      setAnchorEl(null);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90 p-4 text-white"
        style={{ userSelect: "none" }}
      >
        <header className="mb-2 flex w-full max-w-[95vw] items-center justify-between">
          <Button
            variant="outlined"
            onClick={handleClickDropdown}
            sx={{ color: "white", borderColor: "white", minWidth: 70, fontWeight: "bold" }}
          >
            {zoomPercent}%
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleCloseDropdown}
            PaperProps={{
              style: {
                backgroundColor: "#222",
                color: "white",
                minWidth: 80,
              },
            }}
          >
            {ZOOM_LEVELS.map((level) => (
              <MenuItem
                key={level}
                selected={level === zoomPercent}
                onClick={() => handleSelectZoom(level)}
                sx={{
                  "&.Mui-selected": { backgroundColor: "rgba(255,255,255,0.2)" },
                }}
              >
                {level}%
              </MenuItem>
            ))}
          </Menu>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </header>

        <div
          ref={containerRef}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          className="relative flex max-h-[85vh] max-w-[95vw] cursor-grab items-center justify-center overflow-hidden rounded bg-black"
          style={{ flexGrow: 1, width: "100%" }}
        >
          <img
            src={url}
            alt={alt}
            draggable={false}
            onClick={(e) => {
              if (zoom !== 1 || !containerRef.current) return;
              const rect = containerRef.current.getBoundingClientRect();
              const clickX = e.clientX - rect.left - rect.width / 2 - position.x;
              const clickY = e.clientY - rect.top - rect.height / 2 - position.y;
              const targetZoom = Math.min(1.5, MAX_ZOOM);
              setPosition((pos) => ({
                x: pos.x - clickX * (targetZoom / zoom - 1),
                y: pos.y - clickY * (targetZoom / zoom - 1),
              }));
              setZoom(targetZoom);
            }}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transition: "transform 0.1s ease-out",
              maxWidth: "100%",
              maxHeight: "85vh",
              objectFit: "contain",
              cursor: zoom === 1 ? "zoom-in" : "grab",
              userSelect: "none",
            }}
          />
          <div
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded bg-black bg-opacity-60 p-1"
            style={{ userSelect: "none" }}
          >
            <IconButton
              onClick={() => setZoom((z) => Math.min(z + 0.25, MAX_ZOOM))}
              sx={{
                color: "white",
                bgcolor: "transparent",
                borderRadius: 1,
                padding: 0,
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                },
              }}
              aria-label="Zoom In"
              size="small"
            >
              <ZoomInIcon />
            </IconButton>

            <IconButton
              onClick={() => setZoom((z) => Math.max(z - 0.25, MIN_ZOOM))}
              sx={{
                color: "white",
                bgcolor: "transparent",
                borderRadius: 1,
                padding: 0,
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                },
              }}
              aria-label="Zoom Out"
              size="small"
            >
              <ZoomOutIcon />
            </IconButton>

            <IconButton
              onClick={resetZoom}
              sx={{
                color: "white",
                width: 36,
                height: 36,
                borderRadius: 1,
                padding: 0,
                bgcolor: "transparent",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                },
              }}
              aria-label="Reset Zoom"
              size="small"
            >
              <AspectRatioIcon fontSize="small" />
            </IconButton>
          </div>
        </div>
      </div>
    );
  }

  const fileComponent = useMemo(() => {
    const url = filesService.getFileDownloadUrl(fileId);

    if (fileType.includes("image")) {
      return (
        <img
          src={url}
          alt={fileName}
          className="max-h-[20rem] max-w-[40rem] cursor-zoom-in sm:max-h-[15rem] sm:max-w-[100%]"
          onClick={handleClickImage}
        />
      );
    }

    if (fileType.includes("video")) {
      return (
        <video
          controls
          className="max-h-[15rem] max-w-[40rem] object-contain sm:max-h-[10rem] sm:max-w-full"
        >
          <source src={url} type={fileType} />
        </video>
      );
    }

    if (fileType.includes("audio")) {
      return (
        <audio controls>
          <source src={url} type={fileType} />
        </audio>
      );
    }

    const fileSizeText = () => {
      const size = parseInt(fileSize, 10);
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex h-16 w-52 items-center justify-center gap-2 hover:text-indigo-500"
      >
        <DownloadIcon />
        <p> ({fileSizeText()})</p>
      </a>
    );
  }, [fileId, fileName, fileType, fileSize]);

  return <div>{fileComponent}</div>;
}
