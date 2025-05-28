export const helmetConfig = {
  global: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", 'https://localhost:8085'],
      scriptSrc: ["'self'", 'https://localhost:8085'],
      styleSrc: ["'self'", 'https://localhost:8085', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://localhost:8085', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://localhost:8085'],
      connectSrc: ["'self'", 'https://localhost:8085'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"], // anti clickjacking
      upgradeInsecureRequests: [], // force https
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' as const },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' as const },
  permissionsPolicy: {
    features: {
      geolocation: ['none'],
      camera: ['none'],
      microphone: ['none'],
      fullscreen: ['self'],
      payment: ['none'],
      usb: ['none'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' as const },
};
