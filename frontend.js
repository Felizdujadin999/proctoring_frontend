async function getKey() {
    try {
      const response = await fetch("http://localhost:3000/api/getQuestionKey");
      const data = await response.json();
      const key = data;
      console.log("this is key-->", key);
      return key;
    } catch (error) {
      console.error("Error fetching key -->:", error);
      throw error; 
    }
  }
  
  async function getQuestions() {
    try {
      const response = await fetch("http://localhost:3000/api/questions");
      const data = await response.json();
      const encryptedQuestions = data.encryptQuestions;
      console.log("this is encrypted q:", encryptedQuestions);
      const key = await getKey();
      const decryptedQuestions = decryptData(encryptedQuestions, key);
      console.log("this is the decrypted questions:", decryptedQuestions.questionList);
      displayQuestions(decryptedQuestions.questionList);
    } catch (error) {
      console.error("Error fetching questions -->:", error);
    }
  }
  
  function displayQuestions(questions) {
    const container = document.getElementById("questions-container");
    container.innerHTML = ``;
    questions.forEach((question, index) => {
      const questionElement = document.createElement("div");
      questionElement.innerHTML = `
        <p>${index + 1}. ${question.question}</p>
        <ul>${question.options
          .map((option) => `<li>${option.text}</li>`)
          .join("")}</ul>
      `;
      container.appendChild(questionElement);
    });
  }
  
  function decryptData(encryptedData, key) {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  }
  
  
  getQuestions();
  
  export { getQuestions, displayQuestions };