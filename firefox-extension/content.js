function getVideoSource() {
  const video = document.querySelector('video');
  if (!video) return null;
  return video.currentSrc || video.src || (video.querySelector('source') && video.querySelector('source').src);
}

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_VIDEO_URL') {
    sendResponse({url: getVideoSource()});
  }
});
