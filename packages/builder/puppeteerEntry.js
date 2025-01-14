import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';

// reactive-video-root-component is a webpack alias
// eslint-disable-next-line import/no-unresolved
import RootComponent from 'reactive-video-root-component';

import { VideoContextProvider, setAsyncRenderDoneCb, anyAsyncRendersRegistered, Api } from 'reactive-video';
// import { setAsyncRenderDoneCb, anyAsyncRendersRegistered } from 'reactive-video/dist/asyncRegistry';
// import Api from 'reactive-video/dist/api';

const getId = (currentFrame) => `frame-${currentFrame}`;

// https://github.com/mifi/reactive-video/issues/4
// This is a bit hacky. trying to make sure we don't get dup frames (previous frame rendered again)
// So we wait for the browser to completely finish rendering of all DOM updates that react have done
const awaitDomRenderSettled = async () => new Promise((resolve) => {
  window.requestAnimationFrame(() => {
    setTimeout(() => {
      resolve();
    }, 0);
  });
});

window.awaitDomRenderSettled = awaitDomRenderSettled;

const PuppeteerRoot = ({
  devMode, width, height, fps, serverPort, durationFrames, waitForAsyncRenders, renderId, userData, videoComponentType = 'ffmpeg', ffmpegStreamFormat, jpegQuality, secret,
}) => {
  const [currentFrame, setCurrentFrame] = useState();

  // We need to set this immediately (synchronously) or we risk the callee calling window.renderFrame before it has been set
  window.renderFrame = async (n) => {
    if (n == null) {
      setCurrentFrame(); // clear screen
      return [];
    }

    const promise = waitForAsyncRenders();

    // const promise = tryElement(getId(n));
    setCurrentFrame(n);
    // await promise

    // Need to wait for all components to register themselves
    await awaitDomRenderSettled();
    // await new Promise((resolve) => setTimeout(resolve, 1000));

    // If none were registered (e.g. just simple HTML), don't await
    if (anyAsyncRendersRegistered()) {
      return promise;
    }
    return [];
  };

  const api = useMemo(() => Api({ serverPort, renderId, secret }), [renderId, serverPort, secret]);

  // if (currentFrame == null) return <div id="frame-cleared" />;
  if (currentFrame == null) return null;

  const frameCanvasStyle = {
    width,
    height,
    overflow: 'hidden',
    position: 'relative',
  };

  // <div key={currentFrame} id={getId(currentFrame)}>
  return (
    <div id={getId(currentFrame)} style={frameCanvasStyle}>
      <VideoContextProvider
        currentFrame={currentFrame}
        durationFrames={durationFrames}
        width={width}
        height={height}
        fps={fps}
        api={api}
        userData={userData}
        videoComponentType={videoComponentType}
        ffmpegStreamFormat={ffmpegStreamFormat}
        jpegQuality={jpegQuality}
        isPuppeteer
      >
        {devMode && <div id="currentFrame" style={{ fontSize: 18, position: 'absolute', zIndex: 100, background: 'white' }}>{currentFrame} ID{renderId}</div>}

        <RootComponent />
      </VideoContextProvider>
    </div>
  );
};

window.setupReact = ({ devMode, width, height, fps, serverPort, durationFrames, renderId, userData, videoComponentType, ffmpegStreamFormat, jpegQuality, secret }) => {
  async function waitForAsyncRenders() {
    return new Promise((resolve) => {
      setAsyncRenderDoneCb((errors) => {
        // console.log('asyncRenderDoneCb');
        resolve(errors);
      });
    });
  }

  ReactDOM.render(<PuppeteerRoot devMode={devMode} width={width} height={height} fps={fps} serverPort={serverPort} durationFrames={durationFrames} waitForAsyncRenders={waitForAsyncRenders} renderId={renderId} userData={userData} videoComponentType={videoComponentType} ffmpegStreamFormat={ffmpegStreamFormat} jpegQuality={jpegQuality} secret={secret} />, document.getElementById('root'));
};

// https://github.com/puppeteer/puppeteer/issues/422#issuecomment-708142856
window.haveFontsLoaded = async () => {
  const ready = await document.fonts.ready;
  return ready.status === 'loaded';
};
