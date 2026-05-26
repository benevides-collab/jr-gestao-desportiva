"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/components/app/athlete-avatar";

type PhotoUploadProps = {
  name: string;
  currentPhotoUrl?: string | null;
  label?: string;
};

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxSize = 2 * 1024 * 1024;

export function PhotoUpload({
  name,
  currentPhotoUrl,
  label = "Foto 3x4 do atleta",
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(currentPhotoUrl ?? "");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState("");

  const initials = useMemo(() => getInitials(name) || "JR", [name]);
  const hasPhoto = Boolean(previewUrl) && !removePhoto;

  return (
    <div className="space-y-3 md:col-span-2">
      <Label htmlFor="photo">{label}</Label>
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center">
        <div className="w-28 shrink-0">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Prévia da foto 3x4"
              className="aspect-[3/4] w-full rounded-md border border-zinc-200 object-cover"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-md border border-zinc-200 bg-white text-lg font-black text-zinc-500">
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <input type="hidden" name="removePhoto" value={removePhoto ? "true" : ""} />
          <input
            ref={inputRef}
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              setError("");
              setRemovePhoto(false);

              if (!file) {
                return;
              }

              if (!acceptedTypes.includes(file.type)) {
                setError("Use uma imagem JPG, PNG ou WEBP.");
                event.target.value = "";
                return;
              }

              if (file.size > maxSize) {
                setError("A foto deve ter no máximo 2 MB.");
                event.target.value = "";
                return;
              }

              setPreviewUrl(URL.createObjectURL(file));
            }}
          />

          <p className="text-sm font-semibold text-zinc-700">
            Formatos aceitos: JPG, PNG ou WEBP. Máximo 2 MB.
          </p>

          {error ? <p className="text-sm font-bold text-jr-red">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              {hasPhoto ? "Alterar foto" : "Selecionar foto"}
            </Button>
            {hasPhoto ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPreviewUrl("");
                  setRemovePhoto(true);

                  if (inputRef.current) {
                    inputRef.current.value = "";
                  }
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Remover foto
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
