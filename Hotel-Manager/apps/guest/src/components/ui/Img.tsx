import { useState } from 'react';
import clsx from 'clsx';
import { useParallax } from '../../hooks/useParallax';

interface ImgProps {
  src: string;
  alt: string;
  /** container classes — set the aspect ratio / size here */
  className?: string;
  imgClassName?: string;
  /** eager-load (use for the hero / above-the-fold imagery) */
  priority?: boolean;
  /** scroll-linked vertical parallax (image is oversized to avoid gaps) */
  parallax?: boolean;
  parallaxSpeed?: number;
}

/**
 * Cover image with a warm gradient fallback shown while loading or if the
 * source fails — so the Japandi layout always reads as intentional.
 */
export default function Img({
  src,
  alt,
  className,
  imgClassName,
  priority,
  parallax,
  parallaxSpeed,
}: ImgProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const parallaxRef = useParallax<HTMLImageElement>({ speed: parallaxSpeed });

  return (
    <div className={clsx('img-fallback relative overflow-hidden', className)}>
      {!failed && (
        <img
          ref={parallax ? parallaxRef : undefined}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={clsx(
            'object-cover transition-opacity duration-[900ms] ease-breath',
            parallax
              ? 'absolute inset-x-0 -top-[15%] h-[130%] w-full'
              : 'h-full w-full',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
