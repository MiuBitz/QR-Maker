// QR Maker Studio - Main Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  const urlInput = document.getElementById('url-input');
  const btnClearUrl = document.getElementById('btn-clear-url');
  const textInput = document.getElementById('text-input');
  const charCount = document.getElementById('char-count');
  const wifiSsid = document.getElementById('wifi-ssid');
  const wifiAuth = document.getElementById('wifi-auth');
  const wifiPass = document.getElementById('wifi-pass');
  const emailAddr = document.getElementById('email-addr');
  const emailSubject = document.getElementById('email-subject');

  const fgColorPicker = document.getElementById('fg-color');
  const fgHexInput = document.getElementById('fg-hex');
  const bgColorPicker = document.getElementById('bg-color');
  const bgHexInput = document.getElementById('bg-hex');
  const swatches = document.querySelectorAll('.swatch-btn');

  const iconChips = document.querySelectorAll('.icon-chip');
  const customLogoInput = document.getElementById('custom-logo-input');
  const uploadedBadge = document.getElementById('uploaded-preview-badge');
  const uploadedFilename = document.getElementById('uploaded-filename');
  const btnRemoveLogo = document.getElementById('btn-remove-logo');

  const exportSizeSelect = document.getElementById('export-size');
  const correctionLevelSelect = document.getElementById('correction-level');

  const qrcodeTarget = document.getElementById('qrcode-target');
  const renderCanvas = document.getElementById('render-canvas');
  const summaryText = document.getElementById('summary-text');
  const testLink = document.getElementById('test-link');
  const btnDownload = document.getElementById('btn-download');
  const btnCopy = document.getElementById('btn-copy');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  const presetChips = document.querySelectorAll('.preset-chip');

  // State
  let activeTab = 'url';
  let selectedIcon = 'none'; // 'none' | 'rocket' | 'game' | 'link' | 'star' | 'heart' | 'custom'
  let customLogoImage = null;
  let qrEngine = null;
  let debounceTimeout = null;

  // Error Correction mapping for QRCode.js
  const correctLevels = {
    'L': (typeof QRCode !== 'undefined' && QRCode.CorrectLevel) ? QRCode.CorrectLevel.L : 1,
    'M': (typeof QRCode !== 'undefined' && QRCode.CorrectLevel) ? QRCode.CorrectLevel.M : 0,
    'Q': (typeof QRCode !== 'undefined' && QRCode.CorrectLevel) ? QRCode.CorrectLevel.Q : 3,
    'H': (typeof QRCode !== 'undefined' && QRCode.CorrectLevel) ? QRCode.CorrectLevel.H : 2
  };

  // Toast Helper
  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Switch Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      document.getElementById(`content-${activeTab}`).classList.add('active');
      triggerGenerate();
    });
  });

  // Color Pickers Sync
  function syncColor(picker, hexInput) {
    picker.addEventListener('input', () => {
      hexInput.value = picker.value.toUpperCase();
      triggerGenerate();
    });
    hexInput.addEventListener('input', () => {
      let val = hexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        picker.value = val;
        triggerGenerate();
      }
    });
  }
  syncColor(fgColorPicker, fgHexInput);
  syncColor(bgColorPicker, bgHexInput);

  // Preset Palette Swatches
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const fg = swatch.dataset.fg;
      const bg = swatch.dataset.bg;
      fgColorPicker.value = fg;
      fgHexInput.value = fg.toUpperCase();
      bgColorPicker.value = bg;
      bgHexInput.value = bg.toUpperCase();
      triggerGenerate();
    });
  });

  // Icon Selection
  iconChips.forEach(chip => {
    chip.addEventListener('click', () => {
      iconChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedIcon = chip.dataset.icon;
      if (selectedIcon !== 'none' && correctionLevelSelect.value !== 'H') {
        correctionLevelSelect.value = 'H';
      }
      triggerGenerate();
    });
  });

  // Custom Logo Upload
  customLogoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          customLogoImage = img;
          selectedIcon = 'custom';
          iconChips.forEach(c => c.classList.remove('active'));
          uploadedFilename.textContent = file.name;
          uploadedBadge.classList.remove('hidden');
          correctionLevelSelect.value = 'H';
          triggerGenerate();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  btnRemoveLogo.addEventListener('click', () => {
    customLogoImage = null;
    customLogoInput.value = '';
    uploadedBadge.classList.add('hidden');
    selectedIcon = 'none';
    const defaultChip = document.querySelector('.icon-chip[data-icon="none"]');
    if (defaultChip) defaultChip.classList.add('active');
    triggerGenerate();
  });

  // Preset quick chips
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const url = chip.dataset.url;
      
      // Activate URL tab
      const urlTab = document.getElementById('tab-url');
      if (urlTab) urlTab.click();

      // Clean protocol prefix for the input display
      const cleanUrl = url.replace(/^https?:\/\//, '');
      urlInput.value = cleanUrl;

      // Special styling theme if Miusoft
      if (chip.id === 'preset-miusoft') {
        fgColorPicker.value = '#0f172a';
        fgHexInput.value = '#0F172A';
        bgColorPicker.value = '#ffffff';
        bgHexInput.value = '#FFFFFF';

        const noneChip = document.querySelector('.icon-chip[data-icon="none"]');
        if (noneChip) noneChip.click();
      }

      triggerGenerate();
    });
  });

  // URL Clear Button
  btnClearUrl.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.focus();
    triggerGenerate();
  });

  // Text count & inputs
  textInput.addEventListener('input', () => {
    charCount.textContent = textInput.value.length;
    triggerGenerate();
  });

  // Watch other inputs
  [urlInput, wifiSsid, wifiAuth, wifiPass, emailAddr, emailSubject, exportSizeSelect, correctionLevelSelect].forEach(el => {
    el.addEventListener('input', triggerGenerate);
    el.addEventListener('change', triggerGenerate);
  });

  // Determine current payload to encode
  function getPayload() {
    switch (activeTab) {
      case 'url': {
        let val = urlInput.value.trim();
        if (!val) return 'https://miusoftgames.github.io/';
        if (!/^https?:\/\//i.test(val)) {
          return 'https://' + val;
        }
        return val;
      }
      case 'text':
        return textInput.value.trim() || 'Hello from QR Maker Studio!';
      case 'wifi': {
        const ssid = wifiSsid.value.trim() || 'MyWiFi';
        const type = wifiAuth.value || 'WPA';
        const pass = wifiPass.value || '';
        return `WIFI:T:${type};S:${ssid};P:${pass};;`;
      }
      case 'contact': {
        const email = emailAddr.value.trim() || 'creator@miusoftgames.com';
        const subject = encodeURIComponent(emailSubject.value.trim() || 'Inquiry about Miusoft Games');
        return `mailto:${email}?subject=${subject}`;
      }
      default:
        return 'https://miusoftgames.github.io/';
    }
  }

  function triggerGenerate() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(generateQRCode, 120);
  }

  // Core Render Routine
  function generateQRCode() {
    const rawPayload = getPayload();
    summaryText.textContent = rawPayload;
    summaryText.title = rawPayload;

    if (activeTab === 'url' || rawPayload.startsWith('http')) {
      testLink.href = rawPayload;
      testLink.style.display = 'inline-flex';
    } else {
      testLink.style.display = 'none';
    }

    const fgColor = fgColorPicker.value;
    const bgColor = bgColorPicker.value;
    const levelKey = correctionLevelSelect.value || 'H';
    const correctLevel = correctLevels[levelKey] !== undefined ? correctLevels[levelKey] : 2;
    const exportDim = parseInt(exportSizeSelect.value, 10) || 500;

    // Reset hidden container
    qrcodeTarget.innerHTML = '';

    try {
      // Use QRCode.js to create the base QR Matrix
      new QRCode(qrcodeTarget, {
        text: rawPayload,
        width: exportDim,
        height: exportDim,
        colorDark: fgColor,
        colorLight: bgColor,
        correctLevel: correctLevel
      });

      // Small delay to allow canvas or img element to render in DOM
      setTimeout(() => {
        paintToMasterCanvas(exportDim, bgColor, fgColor);
      }, 50);
    } catch (err) {
      console.error('QR Code generation error:', err);
    }
  }

  // Draw onto the master render canvas with high DPI and optional emblem
  function paintToMasterCanvas(dim, bgColor, fgColor) {
    const ctx = renderCanvas.getContext('2d');
    renderCanvas.width = dim;
    renderCanvas.height = dim;

    const sourceCanvas = qrcodeTarget.querySelector('canvas');
    const sourceImg = qrcodeTarget.querySelector('img');

    if (sourceCanvas) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sourceCanvas, 0, 0, dim, dim);
      drawCenterEmblem(ctx, dim, bgColor, fgColor);
    } else if (sourceImg && sourceImg.src) {
      const img = new Image();
      img.onload = () => {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, dim, dim);
        drawCenterEmblem(ctx, dim, bgColor, fgColor);
      };
      img.src = sourceImg.src;
    }
  }

  // Draw Center Emblem (Emoji or Custom Logo)
  function drawCenterEmblem(ctx, dim, bgColor, fgColor) {
    if (selectedIcon === 'none') return;

    const center = dim / 2;
    const badgeSize = Math.round(dim * 0.22);
    const radius = Math.round(badgeSize * 0.28);
    const half = badgeSize / 2;

    // Draw background badge pill
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(center - half, center - half, badgeSize, badgeSize, radius);
    ctx.fillStyle = bgColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = Math.round(dim * 0.02);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(dim * 0.008);
    ctx.fill();

    // Subtle border matching QR color
    ctx.lineWidth = Math.max(2, Math.round(dim * 0.008));
    ctx.strokeStyle = fgColor;
    ctx.stroke();
    ctx.restore();

    // Render Emoji or Logo
    if (selectedIcon === 'custom' && customLogoImage) {
      const imgPad = badgeSize * 0.16;
      const imgDim = badgeSize - (imgPad * 2);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(center - half + imgPad, center - half + imgPad, imgDim, imgDim, radius * 0.7);
      ctx.clip();
      ctx.drawImage(customLogoImage, center - half + imgPad, center - half + imgPad, imgDim, imgDim);
      ctx.restore();
    } else {
      let emoji = '🚀';
      if (selectedIcon === 'game') emoji = '🎮';
      if (selectedIcon === 'link') emoji = '🔗';
      if (selectedIcon === 'star') emoji = '⭐';
      if (selectedIcon === 'heart') emoji = '❤️';
      if (selectedIcon === 'rocket') emoji = '🚀';

      ctx.save();
      ctx.font = `${Math.round(badgeSize * 0.55)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, center, center);
      ctx.restore();
    }
  }

  // Download Handler
  btnDownload.addEventListener('click', () => {
    renderCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      let name = 'qrcode';
      if (activeTab === 'url') {
        const val = urlInput.value.toLowerCase();
        if (val.includes('miusoft')) name = 'miusoft-qr';
        else name = 'website-qr';
      } else if (activeTab === 'wifi') {
        name = 'wifi-qr';
      }
      a.href = url;
      a.download = `${name}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('QR Code image downloaded (HD PNG)!');
    }, 'image/png');
  });

  // Copy to Clipboard Handler
  btnCopy.addEventListener('click', async () => {
    try {
      renderCanvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Could not create blob');
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('Copied QR code to clipboard!');
        } else {
          showToast('Clipboard image copy not supported in this browser.');
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Copy error:', err);
      showToast('Could not copy automatically. You can download the PNG!');
    }
  });

  // Initial trigger on load
  generateQRCode();
});
