import type { Area } from 'react-easy-crop';

export type ImageCropPreset = {
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  label: string;
};

export const IMAGE_CROP_PRESETS = {
  avatar: {
    aspect: 1,
    outputWidth: 512,
    outputHeight: 512,
    label: 'Ajustar avatar',
  },
  cover: {
    aspect: 16 / 9,
    outputWidth: 1400,
    outputHeight: 788,
    label: 'Ajustar capa',
  },
  gallery: {
    aspect: 4 / 3,
    outputWidth: 1000,
    outputHeight: 750,
    label: 'Ajustar foto',
  },
} satisfies Record<string, ImageCropPreset>;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getOutputType(file: File) {
  if (file.type === 'image/png' || file.type === 'image/webp') {
    return file.type;
  }

  return 'image/jpeg';
}

function getExtension(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function cropImageFile({
  file,
  imageSrc,
  crop,
  outputWidth,
  outputHeight,
  quality = 0.92,
}: {
  file: File;
  imageSrc: string;
  crop: Area;
  outputWidth: number;
  outputHeight: number;
  quality?: number;
}) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Nao foi possivel preparar a imagem.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const outputType = getOutputType(file);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
        } else {
          reject(new Error('Nao foi possivel gerar a imagem ajustada.'));
        }
      },
      outputType,
      quality,
    );
  });

  const originalName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
  return new File([blob], `${originalName}-ajustada.${getExtension(outputType)}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}
