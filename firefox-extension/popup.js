document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const castBtn = document.getElementById('cast');
  const pauseBtn = document.getElementById('pause');
  const playBtn = document.getElementById('play');
  const stopBtn = document.getElementById('stop');
  let videoUrl = null;

  function updateStatus(text) {
    status.textContent = text;
  }

  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    const tabId = tabs[0].id;
    browser.tabs.sendMessage(tabId, {type: 'GET_VIDEO_URL'}).then(resp => {
      videoUrl = resp && resp.url;
      if (!videoUrl) {
        updateStatus('No video detected');
      } else {
        updateStatus('Video detected');
      }
    });
  });

  castBtn.addEventListener('click', () => {
    if (!videoUrl) return;
    updateStatus('Casting...');
    browser.runtime.sendMessage({type: 'CAST', url: videoUrl}).then(res => {
      if (res && res.success) {
        updateStatus('Playing on TV');
      } else {
        updateStatus('Error: ' + (res && res.error));
      }
    });
  });

  pauseBtn.addEventListener('click', () => {
    browser.runtime.sendMessage({type: 'PAUSE'});
  });

  playBtn.addEventListener('click', () => {
    browser.runtime.sendMessage({type: 'PLAY'});
  });

  stopBtn.addEventListener('click', () => {
    browser.runtime.sendMessage({type: 'STOP'});
  });
});
