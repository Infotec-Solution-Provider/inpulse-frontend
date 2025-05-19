import { useRef, useState } from "react";
import ImageIcon from "@mui/icons-material/Image";

interface AvatarInputProps {
  onChange?: (file: File | null) => void;
  initialImage?: string | null;
  size?: string;
}

export default function AvatarInput({ onChange, initialImage }: AvatarInputProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImage || null);
  const groupImageInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (onChange) {
      onChange(file);
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      return;
    }

    setImagePreview(null);
  };

  return (
    <div>
      <button
        className="borde h-32 w-32 overflow-hidden rounded-md border border-white/20 hover:border-white hover:bg-indigo-500/10"
        onClick={() => {
          if (groupImageInputRef.current) {
            groupImageInputRef.current.click();
          }
        }}
      >
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Preview"
            className="h-full w-full rounded-md border border-slate-600 object-cover"
          />
        ) : (
          <ImageIcon fontSize="large" />
        )}
      </button>
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageChange}
        ref={groupImageInputRef}
      />
    </div>
  );
}
