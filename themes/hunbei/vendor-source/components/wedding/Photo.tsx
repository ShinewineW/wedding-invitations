/* oxlint-disable next/no-img-element -- Local responsive photographs need no image service. */
import { photographs } from '@/lib/wedding';
export default function Photo({
  index,
  eager = false,
  className = '',
}: {
  index: number;
  eager?: boolean;
  className?: string;
}) {
  const photo = photographs[index];
  const base = `/wedding2/images/${photo.original.replace('.jpg', '')}`;
  const widths =
    photo.width > photo.height ? [768, 1280, 1920, 2560] : [768, 1280, 1920];
  // The wide photograph is cropped taller on phones; account for its full
  // rendered width so faces stay sharp on high-density screens.
  const sizes =
    photo.paper === 'book'
      ? '(max-width: 700px) max(88vw, 67.5svh), (min-width: 1410px) 1240px, 88vw'
      : photo.paper === 'memo' || photo.paper === 'rose'
        ? '(max-width: 700px) 88vw, (min-width: 1410px) 680px, 48vw'
        : photo.paper === 'postcard'
          ? '(max-width: 700px) 84vw, (min-width: 1410px) 480px, 34vw'
          : '(max-width: 700px) 86vw, (min-width: 1410px) 600px, 42vw';
  return (
    <img
      draggable={false}
      className={className}
      src={`${base}-1280.webp`}
      srcSet={widths
        .map((width) => `${base}-${width}.webp ${width}w`)
        .join(', ')}
      sizes={sizes}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      style={{ objectPosition: photo.position }}
    />
  );
}
