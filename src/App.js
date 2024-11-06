import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { Howl } from 'howler';
import './App.css';
import soundURL from './assets/canhbao.mp3';

var sound = new Howl({
  src: [soundURL]
});

// sound.play();

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 50;
const TOUCHED_CONFIDENCE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const canPlaySound = useRef(true);
  const [touched, setTouched] = useState(false);



  const init = async () => {
    console.log('Wait for loading model');
    await setupCamera();
    mobilenetModule.current = await mobilenet.load();
    classifier.current = knnClassifier.create();
    alert('Init Success');
  }

  useEffect(() => {
    init();
  }, []);

  const setupCamera = async () => {
    console.log('setupCamera...');
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            let video = document.querySelector('.video');
            video.srcObject = stream;
            video.onloadedmetadata = () => {
              video.play();
              resolve();
            };
          },
          error => {
            reject();
          }
        );
      } else {
        reject();
      }
    });
  }

  const train = async (label) => {
    if (mobilenetModule.current && classifier.current && video.current) {
      for (let i = 0; i < TRAINING_TIMES; i++) {
        console.log(`Process Tranning ${parseInt(((i + 1) / TRAINING_TIMES) * 100)}%`);
        const embedding = mobilenetModule.current.infer(video.current, true);
        classifier.current.addExample(embedding, label);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      console.error('Model or classifier not loaded or video not available');
    }
  };
  
  const check = async () => {
    if (classifier.current && classifier.current.getNumClasses() > 0) {
      const embedding = mobilenetModule.current.infer(video.current, true);
      const result = await classifier.current.predictClass(embedding);
      if (result.label === TOUCHED_LABEL && result.confidences[result.label] > TOUCHED_CONFIDENCE) {
        console.log('Touched'); 
        if (canPlaySound.current) {
          sound.play();
          setTouched(true);
          canPlaySound.current = false;
        }
        }
      } else {
        console.log('Not Touched');
        setTouched(false);
       
    }
    setTimeout(() => {
      check();
      canPlaySound.current = true;
    }, 1000);
  }
  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video
        ref={video}
        className='video'
        autoPlay
      />
      <div className="control">
        <button className='btn' onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className='btn' onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className='btn' onClick={() => {check()}}>Run</button>
      </div>
    </div>

  );
}



export default App;
