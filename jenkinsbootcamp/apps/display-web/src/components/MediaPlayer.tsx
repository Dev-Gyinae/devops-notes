import { useRef, useEffect } from 'react';

interface Props {
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'HTML';
  duration: number;
  transition?: string;
  onComplete: () => void;
}

export function MediaPlayer({ url, type, duration, transition = 'fade', onComplete }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type !== 'VIDEO') {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onComplete, duration * 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [url, type, duration, onComplete]);

  // Map transition name to CSS animation
  const getAnimation = () => {
    switch (transition) {
      case 'fade':       return 'mediaFadeIn 0.6s ease';
      case 'slide':
      case 'slide-left': return 'mediaSlideLeft 0.45s ease';
      case 'slide-right':return 'mediaSlideRight 0.45s ease';
      case 'slide-up':   return 'mediaSlideUp 0.45s ease';
      case 'zoom-in':    return 'mediaZoomIn 0.5s ease';
      case 'zoom-out':   return 'mediaZoomOut 0.5s ease';
      case 'flip':       return 'mediaFlip 0.6s ease';
      case 'blur':       return 'mediaBlur 0.5s ease';
      case 'wipe':       return 'mediaWipe 0.5s ease';
      case 'none':       return 'none';
      default:           return 'mediaFadeIn 0.6s ease';
    }
  };

  const animStyle: React.CSSProperties = { animation: getAnimation() };

  const renderMedia = () => {
    if (type === 'IMAGE') {
      return (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', ...animStyle }} />
      );
    }
    if (type === 'VIDEO') {
      return (
        <video src={url} autoPlay muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', ...animStyle }}
          onEnded={onComplete} onError={onComplete} />
      );
    }
    if (type === 'HTML') {
      return (
        <iframe src={url} style={{ width: '100%', height: '100%', border: 'none', display: 'block', ...animStyle }}
          allowFullScreen title="Content" />
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 1 }}>
      <style>{`
        @keyframes mediaFadeIn    { from { opacity: 0; }                                              to { opacity: 1; } }
        @keyframes mediaSlideLeft { from { transform: translateX(60px); opacity: 0; }                 to { transform: translateX(0); opacity: 1; } }
        @keyframes mediaSlideRight{ from { transform: translateX(-60px); opacity: 0; }                to { transform: translateX(0); opacity: 1; } }
        @keyframes mediaSlideUp   { from { transform: translateY(60px); opacity: 0; }                 to { transform: translateY(0); opacity: 1; } }
        @keyframes mediaZoomIn    { from { transform: scale(1.08); opacity: 0; }                      to { transform: scale(1); opacity: 1; } }
        @keyframes mediaZoomOut   { from { transform: scale(0.92); opacity: 0; }                      to { transform: scale(1); opacity: 1; } }
        @keyframes mediaFlip      { from { transform: rotateY(90deg); opacity: 0; }                   to { transform: rotateY(0deg); opacity: 1; } }
        @keyframes mediaBlur      { from { filter: blur(20px); opacity: 0; }                          to { filter: blur(0); opacity: 1; } }
        @keyframes mediaWipe      { from { clip-path: inset(0 100% 0 0); }                            to { clip-path: inset(0 0% 0 0); } }
      `}</style>
      {renderMedia()}
    </div>
  );
}
