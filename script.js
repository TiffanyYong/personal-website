const getFaviconFormat = () => {
    const link = document.createElement('link');

    const supportsSvg = link.relList && link.relList.supports && link.relList.supports('icon') && !!document.createElementNS;
    if (supportsSvg) return 'svg';

    const canvas = document.createElement('canvas');
    const supportsPng = !!(canvas.getContext && canvas.getContext('2d'));
    if (supportsPng) return 'png';

    return 'ico';
  };

  const setFavicon = (scheme) => {
    const favicon = document.getElementById('dynamic-favicon');
    const format = getFaviconFormat();

    let filename = '';
    let type = '';

    if (format === 'svg') {
      filename = scheme === 'dark' ? 'dark-favicon.svg' : 'favicon.svg';
      type = 'image/svg+xml';
    } else if (format === 'png') {
      filename = scheme === 'dark' ? 'dark-favicon-512x512.png' : 'favicon-512x512.png';
      type = 'image/png';
    } else {
      filename = scheme === 'dark' ? 'dark-favicon.ico' : 'favicon.ico';
      type = 'image/x-icon';
    }

    favicon.href = filename;
    favicon.type = type;
  };

  const match = window.matchMedia('(prefers-color-scheme: dark)');
  setFavicon(match.matches ? 'dark' : 'light');

  match.addEventListener('change', (e) => {
    setFavicon(e.matches ? 'dark' : 'light');
  });