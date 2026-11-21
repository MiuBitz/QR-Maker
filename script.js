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
  const showBackground = document.getElementById('show-background');
  const darkMode = document.getElementById('dark-mode');
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
  let debounceTimeout = null;

  darkMode.checked = document.documentElement.dataset.theme === 'dark';
  darkMode.addEventListener('change', () => {
    const theme = darkMode.checked ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('qr-maker-theme', theme);
    } catch {}
  });

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

  function updateBackgroundControls() {
    bgColorPicker.disabled = !showBackground.checked;
    bgHexInput.disabled = !showBackground.checked;
    renderCanvas.classList.toggle('transparent-preview', !showBackground.checked);
  }

  showBackground.addEventListener('change', () => {
    updateBackgroundControls();
    generateQRCode();
  });

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
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
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
    const bgColor = showBackground.checked ? bgColorPicker.value : null;
    const levelKey = correctionLevelSelect.value || 'H';
    const correctLevel = correctLevels[levelKey] !== undefined ? correctLevels[levelKey] : 2;
    const exportDim = parseInt(exportSizeSelect.value, 10) || 500;

    // Reset hidden container
    qrcodeTarget.innerHTML = '';

    try {
      // Use QRCode.js to create the base QR Matrix
      const qr = new QRCode(qrcodeTarget, {
        text: rawPayload,
        width: 1,
        height: 1,
        correctLevel: correctLevel
      });

      // Read the matrix from the bundled QRCode.js version.
      paintToMasterCanvas(qr._oQRCode, exportDim, bgColor, fgColor);
    } catch (err) {
      console.error('QR Code generation error:', err);
    }
  }

  // Draw onto the master render canvas with high DPI and optional emblem
  function paintToMasterCanvas(matrix, dim, bgColor, fgColor) {
    renderCanvas.width = dim;
    renderCanvas.height = dim;
    const ctx = renderCanvas.getContext('2d');

    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, dim, dim);
    }

    const moduleCount = matrix.getModuleCount();
    const quietZone = 4;
    const moduleSize = dim / (moduleCount + quietZone * 2);
    const edges = Array.from({ length: moduleCount + 1 }, (_, index) =>
      Math.round((index + quietZone) * moduleSize)
    );
    ctx.fillStyle = fgColor;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix.isDark(row, col)) {
          ctx.fillRect(edges[col], edges[row], edges[col + 1] - edges[col], edges[row + 1] - edges[row]);
        }
      }
    }

    drawCenterEmblem(ctx, dim, bgColor, fgColor, moduleSize);
  }

  // Draw Center Emblem (Emoji or Custom Logo)
  function drawCenterEmblem(ctx, dim, bgColor, fgColor, moduleSize) {
    if (selectedIcon === 'none') return;

    const center = dim / 2;
    const badgeSize = Math.round(dim * 0.22);
    const radius = Math.round(badgeSize * 0.28);
    const half = badgeSize / 2;
    const hasCustomLogo = selectedIcon === 'custom' && customLogoImage;

    // Draw background badge pill
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(center - half, center - half, badgeSize, badgeSize, radius);
    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = Math.round(dim * 0.02);
      ctx.shadowOffsetY = Math.round(dim * 0.008);
      ctx.fill();
    } else {
      ctx.save();
      ctx.clip();
      ctx.clearRect(0, 0, dim, dim);
      ctx.restore();
    }

    if (!hasCustomLogo) {
      ctx.lineWidth = Math.max(2, Math.round(dim * 0.008));
      ctx.strokeStyle = fgColor;
      ctx.stroke();
    }
    ctx.restore();

    // Render Emoji or Logo
    if (hasCustomLogo) {
      ctx.save();
      // Offset the stroke so its inner edge meets the logo's rounded edge.
      const outlineOffset = moduleSize / 2;
      const outlineStart = center - half - outlineOffset;
      const outlineSize = badgeSize + moduleSize;
      ctx.beginPath();
      ctx.roundRect(outlineStart, outlineStart, outlineSize, outlineSize, radius + outlineOffset);
      ctx.lineWidth = moduleSize;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(center - half, center - half, badgeSize, badgeSize, radius);
      ctx.clip();
      ctx.drawImage(customLogoImage, center - half, center - half, badgeSize, badgeSize);
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
    if (debounceTimeout !== null) generateQRCode();
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
    if (debounceTimeout !== null) generateQRCode();
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
  updateBackgroundControls();
  generateQRCode();
});
