/* html2canvas 1.4.1 is bundled locally; image export sends no customer data to a server. */
const saveImageButton = document.getElementById('save-image');
saveImageButton.addEventListener('click', async () => {
  const originalText = saveImageButton.textContent;
  saveImageButton.disabled = true;
  saveImageButton.textContent = '圖片產生中…';
  try {
    await document.fonts.ready;
    const canvas = await html2canvas(document.querySelector('.page'), {
      width: 1400,
      height: 925,
      scale: 2,
      foreignObjectRendering: true,
      backgroundColor: '#ffffff',
      windowWidth: 1600,
      windowHeight: 1100,
      onclone(clonedDocument) {
        const page = clonedDocument.querySelector('.page');
        page.style.transform = 'none';
        page.style.boxShadow = 'none';
        page.style.margin = '0';
        // Avoid serializing computed column widths as extra fixed columns.
        clonedDocument.querySelectorAll('.teaching-note').forEach(note => {
          if (clonedDocument.defaultView.getComputedStyle(note).columnCount !== 'auto') note.style.columnWidth = 'auto';
        });
        clonedDocument.querySelector('.stage').style.cssText = 'width:1400px;height:925px;overflow:visible';
        clonedDocument.querySelector('.viewport').style.overflow = 'visible';
        clonedDocument.querySelectorAll('input').forEach(input => {
          input.setAttribute('value', input.value);
          input.removeAttribute('placeholder');
          input.blur();
        });
      },
    });
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      value => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png',
    ));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const client = document.getElementById('client').value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
    link.href = url;
    link.download = `保障金三角${client ? '_' + client : ''}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Allow mobile browsers time to finish opening/downloading the image.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    alert('圖片儲存失敗，請使用 Chrome、Edge 或 Safari 重新開啟網頁後再試。');
  } finally {
    saveImageButton.disabled = false;
    saveImageButton.textContent = originalText;
  }
});
