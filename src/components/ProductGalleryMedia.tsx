import React from 'react';
import { isProductVideoUrl } from '../utils/productGallery.ts';

interface ProductGalleryMediaProps {
  src: string;
  alt: string;
  className?: string;
  /** object-fit class for media element */
  fitClassName?: string;
}

/** Renders image or muted autoplay looping video (no controls / no sound). */
export const ProductGalleryMedia: React.FC<ProductGalleryMediaProps> = ({
  src,
  alt,
  className = '',
  fitClassName = 'object-contain object-center',
}) => {
  if (isProductVideoUrl(src)) {
    return (
      <video
        src={src}
        className={`${fitClassName} ${className}`.trim()}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        controls={false}
        disablePictureInPicture
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={`${fitClassName} ${className}`.trim()}
    />
  );
};
