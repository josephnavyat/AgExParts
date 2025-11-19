import React, { useState, useRef } from 'react';
import getImageUrl from '../utils/getImageUrl.js';

export default function SmartImage({ src, alt = '', className, style, loading = 'lazy', onLoad, onError, sizes, srcSet }) {
  const attemptsRef = useRef(0);
  const [current, setCurrent] = useState(() => {
    if (!src) return '/logo.png';
    const s = String(src).trim();
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    return getImageUrl(s);
  });

  const tryNext = () => {
    attemptsRef.current += 1;
    const attempt = attemptsRef.current;
    // Derive filename and extension
    try {
      const s = String(src || '').trim();
      const filename = s.split('/').pop();
      const extIdx = filename.lastIndexOf('.');
      const baseName = extIdx !== -1 ? filename.slice(0, extIdx) : filename;
      const ext = extIdx !== -1 ? filename.slice(extIdx) : '';

      if (attempt === 1) {
        // try webp variant
        const webp = baseName + (ext ? '.webp' : '.webp');
        setCurrent(getImageUrl(webp));
        return;
      }
      if (attempt === 2) {
        // try numbered variant _2
        const v2 = `${baseName}_2${ext}`;
        setCurrent(getImageUrl(v2));
        return;
      }
      if (attempt === 3) {
        // try thumbnail webp name.thumb.webp or baseName.thumb.webp
        const thumb = `${baseName}.thumb.webp`;
        setCurrent(getImageUrl(thumb));
        return;
      }
    } catch (e) {
      // fall through
    }
    // final fallback
    setCurrent('/logo.png');
  };

  const handleError = (e) => {
    if (attemptsRef.current < 3) {
      tryNext();
    } else {
      setCurrent('/logo.png');
    }
    if (typeof onError === 'function') onError(e);
  };

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onError={handleError}
      onLoad={onLoad}
      sizes={sizes}
      srcSet={srcSet}
    />
  );
}
