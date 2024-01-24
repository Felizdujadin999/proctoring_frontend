let userStream;
let screenStream;
let countdownTimer;
let timeLeft = 1800;
const video = document.getElementById("userVideo");
const canvas = document.getElementById("overlay");
const userAnswers = [];
let currentQuestionIndex = 0;
let theQuestions = null

const startFaceApi = () => {
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  ]).then(startWebcam);
};

const startWebcam = () => {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(function (streamObj) {
      userStream = streamObj;
      video.srcObject = userStream;
      console.log("this is video: ", video.srcObject);
      document.getElementById("screenShareButton").style.display = "block";
      document.getElementById("startTestButton").style.display = "none";
    })
    .catch(function (err) {
      console.log("Error accessing the webcam: " + err);
    });
};

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    // console.log("this is detections: ", detections);
  }, 100);
});

const startScreenShare = () => {
  navigator.mediaDevices
    .getDisplayMedia({ video: true })
    .then(function (screenStreamObj) {
      const screenVideo = document.getElementById("screenVideo");

      const filteredTracks = screenStreamObj
        .getTracks()
        .filter((track) => track.label.includes("screen"));

      if (filteredTracks.length > 0) {
        const filteredStream = new MediaStream(filteredTracks);
        screenVideo.srcObject = filteredStream;
        screenStream = filteredStream;
        document.getElementById("startTestButton").style.display = "block";
      } else {
        alert("You have to share your entire screen!");
        console.log("Error: Unable to find entire screen track.");
      }
    })
    .catch(function (err) {
      console.log("Error sharing the screen: " + err);
    });
};

const startTest = async () => {
  document.getElementById("startTestButton").style.display = "none";
  document.getElementById("webcamButton").style.display = "none";
  document.getElementById("screenShareButton").style.display = "none";
  document.getElementById("questions").style.display = "block";
   await fetchQuestions();
  startTimer();
  displayQuestion(theQuestions[currentQuestionIndex]);
  lockTab();
};

const finishTest = () => {
  clearInterval(countdownTimer);
  stopWebcam();
  stopScreenShare();
  document.getElementById("questions").style.display = "none";
  document.getElementById("timer").style.display = "none";
  document.getElementById("startTestButton").style.display = "none";
  console.log("This is user answers: ", JSON.stringify(userAnswers));
  releaseTab();
};

function decryptQuestions(encryptedData, key) {
  const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
  const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
  return decryptedData;
}

const fetchQuestions = () => {
  return new Promise((resolve, reject) => {
    fetch("http://localhost:3000/api/getQuestionKey")
      .then((response) => response.json())
      .then((data) => {
        const encryptedQuestionsKey = data;

        fetch("http://localhost:3000/api/questions")
          .then((response) => response.json())
          .then((data) => {
            const encryptedQuestions = data.encryptQuestions;
            const decryptedQuestions = decryptQuestions(
              encryptedQuestions,
              encryptedQuestionsKey
            );
            theQuestions = decryptedQuestions.questionList;
            resolve(); 
          })
          .catch((error) => {
            console.error("Error fetching question:", error);
            reject(error);
          });
      })
      .catch((error) => {
        console.error("Error fetching key:", error);
        reject(error);
      });
  });
};


const quitTest = () => {
  clearInterval(countdownTimer);
  const quitConfirmation = confirm(
    "Are you sure you want to quit the test? If you quit, your progress will be lost."
  );
  if (quitConfirmation) {
    stopWebcam();
    stopScreenShare();
    document.getElementById("questions").style.display = "none";
    document.getElementById("timer").style.display = "none";
    document.getElementById("startTestButton").style.display = "none";
    releaseTab();
  } else {

    startTimer(); 
  }
};

const stopWebcam = () => {
  if (userStream) {
    userStream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  const userVideo = document.getElementById("userVideo");
  userVideo.srcObject = null;
};

const stopScreenShare = () => {
  if (screenStream) {
    screenStream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  const screenVideo = document.getElementById("screenVideo");
  screenVideo.srcObject = null;
};


const selectOption = (option) => {
  console.log("Selected Option: " + option);
  userAnswers.push(option);
  displayNextQuestion();
};


const displayNextQuestion = () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < theQuestions.length) {
    const nextQuestion = theQuestions[currentQuestionIndex];
    displayQuestion(nextQuestion);
  } else {
    finishTest();
  }
};


const updateOptions = (options) => {
  const optionButtons = document.querySelectorAll(".option button");
  options.forEach((option, optionIndex) => {
    optionButtons[optionIndex].innerHTML = `${String.fromCharCode(65 + optionIndex)} - ${option.text}`;
    optionButtons[optionIndex].onclick = () => selectOption(String.fromCharCode(65 + optionIndex));
  });
};



const displayQuestion = (question) => {
  console.log(" i don dey diaplay questions");
  const questionContainer = document.getElementById("questions-container");
  questionContainer.innerHTML = `
    <p>${currentQuestionIndex + 1}. ${question.question}</p>
  `;
  updateOptions(question.options);
};



const startTimer = () => {
  countdownTimer = setInterval(function () {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById("countdown").innerHTML = `Time left: ${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
    if (timeLeft <= 0) {
      clearInterval(countdownTimer);
      finishTest();
    }
  }, 1000);
};


const lockTab = () => {
  window.onbeforeunload = () => {
    console.log("this guy dey try commot for here");
    const notice = "";
    return notice;
  };
};

function releaseTab() {}


