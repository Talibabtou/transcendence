export const helmetConfig = {
  global: true,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
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
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' as const },
};
