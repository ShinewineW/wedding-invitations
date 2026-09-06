/* oxlint-disable next/no-img-element -- Local responsive WebP files are optimized before build. */
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
  // These local WebP variants are already resized; no image server is required.
  return (
    <img
      draggable={false}
      className={className}
      src={`/wedding/images/${photo.src}-640.webp`}
      srcSet={`/wedding/images/${photo.src}-640.webp 640w, /wedding/images/${photo.src}-1280.webp 1280w`}
      sizes="(max-width: 700px) 90vw, 54vw"
      alt={photo.alt}
      width="640"
      height="960"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding={eager ? 'sync' : 'async'}
      style={{ objectPosition: photo.position }}
    />
  );
}
