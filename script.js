const getFaviconFormat = () => {
    const link = document.createElement('link');
    const supportsSvg = link.relList && link.relList.supports && link.relList.supports('icon') && !!document.createElementNS;
    if (supportsSvg) return 'svg';

    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d')) ? 'png' : 'ico';
  };

  const setFavicon = (scheme) => {
    const favicon = document.getElementById('dynamic-favicon');
    const format = getFaviconFormat();
    const timestamp = new Date().getTime(); // Cache busting

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

    favicon.href = `/favicons/${filename}?t=${timestamp}`;  // Cache busting
    favicon.type = type;
  };

  window.onload = () => {
    const match = window.matchMedia('(prefers-color-scheme: dark)');
    setFavicon(match.matches ? 'dark' : 'light');
  };

  const match = window.matchMedia('(prefers-color-scheme: dark)');
  match.addEventListener('change', (e) => {
    setFavicon(e.matches ? 'dark' : 'light');
  });