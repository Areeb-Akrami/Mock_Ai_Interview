const API_KEY = 'AIzaSyAqQpdtS-xednVSoWvJKctIqOfygikZGco';
const MAX_QUESTIONS = 5;

const interviewTypes = {
    general: {
        name: "General Interview",
        description: "Common interview questions across all job types",
        icon: "briefcase"
    },
    technical: {
        name: "Technical Interview",
        description: "Programming and technical problem-solving questions",
        icon: "code"
    },
    behavioral: {
        name: "Behavioral Interview",
        description: "Questions about past experiences and situations",
        icon: "user"
    },
    hr: {
        name: "HR Interview",
        description: "Questions about culture fit and career goals",
        icon: "users"
    }
};

let currentInterview = {
    type: null,
    questions: [],
    currentQuestionIndex: -1,
    scores: [],
    startTime: null
};

// Add these at the top of the file with other global variables
let recognition = null;
let synthesis = window.speechSynthesis;
let isListening = false;
let stream = null;
let videoEnabled = false;
let audioEnabled = false;
let isSpeaking = false;
let continuousListening = false;
let timerInterval = null;
let isMuted = false;
let currentSpeech = '';

// Add these variables at the top with other globals
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// Add these NLP-related variables at the top with other globals
let sentiment = null;
let keywordExtractor = null;
let confidenceScore = 0;

// Practice Section Functionality
function loadQuestions() {
    const questionList = document.getElementById('questionList');
    // Clear existing questions
    questionList.innerHTML = '';
    
    // Generate a few sample questions using AI
    ['technical', 'behavioral', 'general', 'hr'].forEach(async (type) => {
        try {
            const question = await generateQuestion(type);
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.setAttribute('data-category', type);
            questionElement.innerHTML = `
                <h3>${question.question}</h3>
                <div class="question-tips">
                    <h4>Tips:</h4>
                    <ul class="tips-list">
                        ${question.tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
                <button class="practice-btn" onclick="startPractice('${type}')">
                    Practice This Question
                </button>
            `;
            questionList.appendChild(questionElement);
        } catch (error) {
            console.error('Error loading practice question:', error);
        }
    });
}

// Update startPractice function to use AI
async function startPractice(type) {
    // Navigate to interview session with selected type
    document.querySelector('.nav-link[data-section="home"]').click();
    setTimeout(async () => {
        // Start interview with the selected type
        await startInterview(type);
        beginInterview();
    }, 300);
}

// Initialize interview types
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.interview-types');
    Object.entries(interviewTypes).forEach(([type, data]) => {
        const button = document.createElement('button');
        button.className = 'interview-type-btn';
        button.setAttribute('data-type', type);
        button.innerHTML = `
            <i class="fas fa-${data.icon}"></i>
            <h3>${data.name}</h3>
            <p>${data.description}</p>
        `;
        button.onclick = () => selectInterviewType(type);
        container.appendChild(button);
    });
    
    initializeSpeechRecognition();
    
    // Initialize voices for speech synthesis
    synthesis.onvoiceschanged = () => {
        synthesis.getVoices();
    };

    document.getElementById('toggleVideo').addEventListener('click', toggleVideo);
    document.getElementById('toggleAudio').addEventListener('click', toggleAudio);

    // Add intersection observer for section animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    // Observe all sections
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });

    // Add click event listener to back button
    const backButton = document.querySelector('.back-btn');
    if (backButton) {
        backButton.addEventListener('click', backToHome);
    }

    // Add navigation functionality
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link and corresponding section
            link.classList.add('active');
            const sectionId = link.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });

    // Initialize questions when page loads
    loadQuestions();

    // Initialize draggable avatar
    makeAvatarDraggable();
});

// Update selectInterviewType function
function selectInterviewType(type) {
    const buttons = document.querySelectorAll('.interview-type-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));
    
    const selectedBtn = document.querySelector(`[data-type="${type}"]`);
    selectedBtn.classList.add('selected');
    
    // Enable start button and add click handler
    const startButton = document.getElementById('startButton');
    startButton.disabled = false;
    startButton.onclick = () => startInterview(type);
}

// Update startInterview function
async function startInterview(type) {
    try {
        await initializeCamera();
        currentInterview = {
            type: type,
            questions: [],
            currentQuestionIndex: -1,
            scores: [],
            startTime: null
        };
        showInterviewInterface();
    } catch (error) {
        console.error('Error starting interview:', error);
        showError('Failed to start interview. Please check camera permissions.');
    }
}

// Add these functions to handle avatar controls

function toggleMute() {
    const muteBtn = document.getElementById('muteBtn');
    isMuted = !isMuted;
    
    if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.querySelector('i').className = 'fas fa-microphone-slash';
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.querySelector('i').className = 'fas fa-microphone';
        if (currentSpeech) {
            speakText(currentSpeech);
        }
    }
}

// Update beginInterview function to handle loading states better
async function beginInterview() {
    if (!currentInterview.type) {
        showError('Please select an interview type first');
        return;
    }
    
    const loaderId = showLoading();
    
    try {
        const questionData = await generateQuestion(currentInterview.type);
        
        // Clear existing chat and show first question
        clearChat();
        currentInterview.questions = [questionData];
        currentInterview.currentQuestionIndex = 0;
        currentInterview.startTime = new Date();
        
        // Start timer
        startTimer();
        
        // Display the question
        await displayQuestion(questionData);
        updateProgress();
        
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to generate question. Please try again.');
        clearChat();
    } finally {
        hideLoading(loaderId);
    }
}

// Update the generateQuestion function to have type-specific prompts
async function generateQuestion(type) {
    try {
        let prompt = '';
        switch(type) {
            case 'technical':
                prompt = `Generate a technical interview question related to programming, system design, or algorithms. 
                Return strictly in this JSON format:
                {
                    "question": "A challenging technical question",
                    "context": "Technical context explaining what skills this tests",
                    "tips": [
                        "Technical approach tip",
                        "Implementation consideration",
                        "Best practice suggestion"
                    ]
                }`;
                break;
            
            case 'behavioral':
                prompt = `Generate a behavioral interview question about past experiences and situations.
                Return strictly in this JSON format:
                {
                    "question": "A situation-based behavioral question",
                    "context": "What this reveals about the candidate's soft skills",
                    "tips": [
                        "STAR method application tip",
                        "Key points to include",
                        "Communication strategy"
                    ]
                }`;
                break;
            
            case 'hr':
                prompt = `Generate an HR interview question about culture fit, career goals, or company alignment.
                Return strictly in this JSON format:
                {
                    "question": "An HR/cultural fit question",
                    "context": "What this reveals about candidate's alignment with company",
                    "tips": [
                        "Company research tip",
                        "Professional goal alignment",
                        "Cultural value demonstration"
                    ]
                }`;
                break;
            
            default: // general
                prompt = `Generate a general interview question suitable for any role.
                Return strictly in this JSON format:
                {
                    "question": "A professional interview question",
                    "context": "Purpose of this question in evaluating candidates",
                    "tips": [
                        "Structure suggestion",
                        "Key elements to include",
                        "Professional presentation tip"
                    ]
                }`;
        }

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
        return questionData;

    } catch (error) {
        console.error('Error generating question:', error);
        // Type-specific fallback questions
        const fallbackQuestions = {
            technical: {
                question: "Explain the concept of RESTful APIs and their key principles.",
                context: "This tests understanding of modern web architecture.",
                tips: [
                    "Define REST and its characteristics",
                    "Explain HTTP methods and their uses",
                    "Discuss real-world applications"
                ]
            },
            behavioral: {
                question: "Tell me about a challenging project you managed and how you handled it.",
                context: "This reveals leadership and problem-solving abilities.",
                tips: [
                    "Use the STAR method",
                    "Focus on your specific actions",
                    "Highlight the outcomes achieved"
                ]
            },
            hr: {
                question: "Where do you see yourself in five years?",
                context: "This shows career planning and alignment with company goals.",
                tips: [
                    "Align with company growth",
                    "Show realistic ambition",
                    "Demonstrate commitment to growth"
                ]
            },
            general: {
                question: "Tell me about yourself and your experience.",
                context: "This helps understand your background and communication skills.",
                tips: [
                    "Focus on relevant experience",
                    "Keep it concise and structured",
                    "Highlight key achievements"
                ]
            }
        };

        return fallbackQuestions[type] || fallbackQuestions.general;
    }
}

// Update showInterviewInterface function
function showInterviewInterface() {
    const setupEl = document.querySelector('.interview-setup');
    const sessionEl = document.querySelector('.interview-session');
    const inputSection = document.querySelector('.input-section');
    
    setupEl.style.opacity = '0';
    setupEl.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        setupEl.style.display = 'none';
        sessionEl.style.display = 'block';
        inputSection.style.display = 'block';
        
        sessionEl.style.opacity = '0';
        sessionEl.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            sessionEl.style.opacity = '1';
            sessionEl.style.transform = 'translateY(0)';
        });
    }, 300);
}

// Update clearChat function to remove loading state
function clearChat() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = '<div class="welcome-message"><h2>Interview Started! 🚀</h2></div>';
    // Remove any existing loaders
    const loaders = document.querySelectorAll('.loader');
    loaders.forEach(loader => loader.remove());
}

// Update displayQuestion function to animate avatar
async function displayQuestion(questionData) {
    const chatContainer = document.getElementById('chatContainer');
    const questionElement = document.createElement('div');
    questionElement.className = 'message bot-message';
    questionElement.innerHTML = `
        <div class="question-header">
            <i class="fas fa-user-tie"></i>
            <span>Interviewer</span>
        </div>
        <h3>${questionData.question}</h3>
        <p class="context">${questionData.context}</p>
        <div class="tips">
            <h4>Tips:</h4>
            <ul>
                ${questionData.tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        </div>
    `;
    chatContainer.appendChild(questionElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Animate avatar and speak
    const avatar = document.querySelector('.avatar');
    if (avatar) {
        avatar.classList.add('speaking');
        await speakText(questionData.question);
        avatar.classList.remove('speaking');
    }
}

// Add displayUserMessage function
function displayUserMessage(message) {
    const chatContainer = document.getElementById('chatContainer');
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <i class="fas fa-user"></i>
                <span>You</span>
            </div>
            <div class="message-text">
                ${message}
            </div>
        </div>
    `;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add auto-resize functionality for textarea
document.getElementById('userInput').addEventListener('input', function() {
    this.style.height = '';
    this.style.height = this.scrollHeight + 'px';
});

// Show typing indicator when AI is processing
function showTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

function hideTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Update handleSubmit to generate next question using AI
async function handleSubmit() {
    const userInput = document.getElementById('userInput');
    const answer = userInput.value.trim();
    if (!answer) return;

    // Disable input while processing
    userInput.disabled = true;
    
    // Display user message immediately
    displayUserMessage(answer);
    userInput.value = '';
    userInput.style.height = '';

    try {
        // Show typing indicator
        showTypingIndicator();

        // Perform NLP analysis
        const nlpAnalysis = await analyzeResponse(answer);
        
        // Generate feedback incorporating NLP insights
        const feedbackData = await generateEnhancedFeedback(
            currentInterview.questions[currentInterview.currentQuestionIndex].question,
            answer,
            currentInterview.type,
            nlpAnalysis
        );

        // Hide typing indicator
        hideTypingIndicator();

        // Display feedback
        await displayEnhancedFeedback(feedbackData, nlpAnalysis);

        // Generate next question in background
        if (currentInterview.currentQuestionIndex < MAX_QUESTIONS - 1) {
            // Show loading state for next question
            showNextQuestionLoading();
            
            try {
                const nextQuestion = await generateQuestion(currentInterview.type);
                currentInterview.questions.push(nextQuestion);
                currentInterview.currentQuestionIndex++;
                await displayQuestion(nextQuestion);
                
                // Re-enable input
                userInput.disabled = false;
                userInput.placeholder = "Type your answer here...";
            } catch (error) {
                console.error('Error generating next question:', error);
                showError('Failed to load next question. Please try again.');
            }
        } else {
            showInterviewSummary();
        }

    } catch (error) {
        console.error('Error:', error);
        showError('Failed to process response. Please try again.');
        userInput.disabled = false;
    }
}

// Update loading functions with unique IDs
function showLoading() {
    const loaderId = 'loader-' + Date.now();
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.id = loaderId;
    document.body.appendChild(loader);
    return loaderId;
}

// Update hideLoading function to be more reliable
function hideLoading(loaderId) {
    const loader = document.getElementById(loaderId);
    if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            if (loader && loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }, 300);
    }
    // Clean up any other stray loaders
    const loaders = document.querySelectorAll('.loader');
    loaders.forEach(loader => {
        if (loader.id !== loaderId) {
            loader.parentNode.removeChild(loader);
        }
    });
}

// Add retry mechanism for API calls
async function retryFetch(url, options, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error; // Last retry failed
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
    }
}

// Update generateFeedback function to be more efficient
async function generateFeedback(question, answer, type) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Evaluate this ${type} interview answer. Question: "${question}" Answer: "${answer}"
                        Respond strictly in this JSON format:
                        {
                            "feedback": "brief constructive feedback",
                            "score": number between 1-10,
                            "strengths": ["key strength 1", "key strength 2"],
                            "improvements": ["improvement 1", "improvement 2"]
                        }`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 200
                }
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);

    } catch (error) {
        console.error('Feedback generation error:', error);
        // Return quick feedback if API fails
        return {
            feedback: "Thank you for your response.",
            score: 7,
            strengths: ["Response recorded"],
            improvements: ["Continue to next question"]
        };
    }
}

// Update displayFeedback function to remove insights
async function displayFeedback(feedbackData) {
    const chatContainer = document.getElementById('chatContainer');
    
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'message bot-message feedback-message';
    feedbackElement.innerHTML = `
        <div class="feedback-header">
            <i class="fas fa-comment-dots"></i>
            <span>Feedback</span>
        </div>
        
        <div class="feedback-content">
            <p>${feedbackData.feedback}</p>
            <div class="feedback-score">Score: ${feedbackData.score}/10</div>
        </div>
    `;
    
    chatContainer.appendChild(feedbackElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Re-enable input for next question
    const userInput = document.getElementById('userInput');
    userInput.disabled = false;
    userInput.placeholder = "Type your answer here...";
}

// Add this helper function
function showNextQuestionLoading() {
    const chatContainer = document.getElementById('chatContainer');
    const loadingElement = document.createElement('div');
    loadingElement.className = 'message bot-message loading-message';
    loadingElement.innerHTML = `
        <div class="loading-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <p>Preparing next question...</p>
    `;
    chatContainer.appendChild(loadingElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add this helper function for error display
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    document.body.appendChild(errorDiv);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        errorDiv.classList.add('fade-out');
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

function updateProgress() {
    const progress = ((currentInterview.currentQuestionIndex + 1) / MAX_QUESTIONS) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = 
        `Question ${currentInterview.currentQuestionIndex + 1}/${MAX_QUESTIONS}`;
    
    // Show end interview button if we've reached max questions
    if (currentInterview.currentQuestionIndex + 1 >= MAX_QUESTIONS) {
        showInterviewSummary();
    }
}

function startTimer() {
    setInterval(() => {
        if (currentInterview.startTime) {
            const duration = Math.floor((new Date() - currentInterview.startTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            document.getElementById('duration').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function showInterviewSummary() {
    const chatContainer = document.getElementById('chatContainer');
    const averageScore = currentInterview.scores.reduce((a, b) => a + b, 0) / currentInterview.scores.length;
    
    chatContainer.innerHTML += `
        <div class="interview-summary">
            <h2>Interview Complete! 🎉</h2>
            <div class="summary-stats">
                <div class="stat">
                    <h3>Average Score</h3>
                    <p>${averageScore.toFixed(1)}/10</p>
                </div>
                <div class="stat">
                    <h3>Duration</h3>
                    <p>${document.getElementById('duration').textContent}</p>
                </div>
                <div class="stat">
                    <h3>Questions Completed</h3>
                    <p>${currentInterview.scores.length}/${MAX_QUESTIONS}</p>
                </div>
            </div>
            <div class="summary-actions">
                <button onclick="restartInterview()" class="restart-btn">
                    <i class="fas fa-redo"></i> Start New Interview
                </button>
            </div>
        </div>
    `;
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function restartInterview() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    document.querySelector('.video-container').style.display = 'none';
    // Reset the interview interface
    document.querySelector('.interview-setup').style.display = 'block';
    document.querySelector('.interview-session').style.display = 'none';
    document.querySelector('.input-section').style.display = 'block';
    
    // Reset progress
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = 'Question 0/5';
    document.getElementById('duration').textContent = '00:00';
    document.getElementById('averageScore').textContent = 'Score: 0/10';
    
    // Reset current interview
    currentInterview = {
        type: null,
        questions: [],
        currentQuestionIndex: -1,
        scores: [],
        startTime: null
    };
}

// Handle Enter key in textarea
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
});

// Add this function to initialize speech recognition
function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            isListening = true;
            document.getElementById('micButton').classList.add('recording');
        };
        
        recognition.onend = () => {
            isListening = false;
            document.getElementById('micButton').classList.remove('recording');
            // Only restart if continuous listening is enabled and AI is not speaking
            if (continuousListening && !synthesis.speaking) {
                recognition.start();
            }
        };
        
        recognition.onresult = (event) => {
            // Don't process results if AI is currently speaking
            if (synthesis.speaking) return;
            
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                document.getElementById('userInput').value = finalTranscript;
                // Add a small delay before auto-submit to prevent catching AI's voice
                if (continuousListening) {
                    setTimeout(() => {
                        handleSubmit();
                    }, 500);
                }
            }
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            document.getElementById('micButton').classList.remove('recording');
            continuousListening = false;
        };
    } else {
        console.error('Speech recognition not supported');
        document.getElementById('micButton').style.display = 'none';
    }
}

// Add function to toggle microphone
function toggleMic() {
    if (!recognition) {
        initializeSpeechRecognition();
    }
    
    continuousListening = !continuousListening;
    
    if (continuousListening) {
        // Only start recognition if AI is not currently speaking
        if (!synthesis.speaking) {
            recognition.start();
        }
        showNotification('Voice mode activated. Speak your answers.');
    } else {
        recognition.stop();
        showNotification('Voice mode deactivated.');
    }
}

// Update the speakText function to pause speech recognition while AI is speaking
async function speakText(text) {
    currentSpeech = text;
    
    if (isMuted) return;

    // Stop recognition before AI speaks
    if (recognition) {
        recognition.stop();
        isListening = false;
    }

    return new Promise((resolve) => {
        if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9; // Slightly slower rate
            utterance.pitch = 1;
            
            // Use a clear female voice if available
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.lang === 'en-US' && voice.name.includes('Female')
            );
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            // When AI finishes speaking, wait before restarting recognition
            utterance.onend = () => {
                setTimeout(() => {
                    if (continuousListening) {
                        recognition.start();
                        isListening = true;
                    }
                    resolve();
                }, 1000); // Longer delay after speaking
            };

            window.speechSynthesis.speak(utterance);
        } else {
            resolve();
        }
    });
}

// Add this helper function
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add this function after initializeSpeechRecognition
async function initializeCamera() {
    try {
        const videoContainer = document.querySelector('.video-container');
        videoContainer.style.display = 'block';
        videoContainer.style.opacity = '0';
        
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: true
        });
        
        const videoElement = document.getElementById('userVideo');
        videoElement.srcObject = stream;
        
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve();
            };
        });
        
        videoEnabled = true;
        audioEnabled = true;
        updateMediaButtons();
        
        // Fade in video container
        requestAnimationFrame(() => {
            videoContainer.style.opacity = '1';
        });
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showError('Unable to access camera. Please check permissions: ' + error.message);
        document.querySelector('.video-container').style.display = 'none';
    }
}

// Add these functions to handle media controls
function toggleVideo() {
    if (!stream) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        videoEnabled = videoTrack.enabled;
        
        // Add transition effect
        const videoElement = document.getElementById('userVideo');
        videoElement.style.transition = 'opacity 0.3s ease';
        videoElement.style.opacity = videoEnabled ? '1' : '0';
        
        updateMediaButtons();
    }
}

function toggleAudio() {
    if (!stream) return;
    
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        audioEnabled = audioTrack.enabled;
        updateMediaButtons();
        
        // Show feedback
        showNotification(audioEnabled ? 'Microphone unmuted' : 'Microphone muted');
    }
}

function updateMediaButtons() {
    const videoBtn = document.getElementById('toggleVideo');
    const audioBtn = document.getElementById('toggleAudio');
    
    if (videoBtn) {
        videoBtn.innerHTML = `<i class="fas fa-video${videoEnabled ? '' : '-slash'}"></i>`;
        videoBtn.classList.toggle('disabled', !videoEnabled);
        videoBtn.title = videoEnabled ? 'Turn off camera' : 'Turn on camera';
    }
    
    if (audioBtn) {
        audioBtn.innerHTML = `<i class="fas fa-microphone${audioEnabled ? '' : '-slash'}"></i>`;
        audioBtn.classList.toggle('disabled', !audioEnabled);
        audioBtn.title = audioEnabled ? 'Mute microphone' : 'Unmute microphone';
    }
}

// Update the backToHome function
function backToHome() {
    // Stop timer if running
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Stop camera and audio
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    // Reset interview state
    currentInterview = {
        type: null,
        questions: [],
        currentQuestionIndex: -1,
        scores: [],
        startTime: null
    };
    
    // Reset video and audio states
    videoEnabled = false;
    audioEnabled = false;
    
    // Hide interview interface and show setup
    const setupEl = document.querySelector('.interview-setup');
    const sessionEl = document.querySelector('.interview-session');
    const videoContainer = document.querySelector('.video-container');
    const inputSection = document.querySelector('.input-section');
    
    // Add fade out animation
    sessionEl.style.opacity = '0';
    sessionEl.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        // Hide interview elements
        sessionEl.style.display = 'none';
        videoContainer.style.display = 'none';
        inputSection.style.display = 'none';
        
        // Show and animate setup
        setupEl.style.display = 'block';
        setupEl.style.opacity = '0';
        setupEl.style.transform = 'translateY(-20px)';
        
        requestAnimationFrame(() => {
            setupEl.style.opacity = '1';
            setupEl.style.transform = 'translateY(0)';
        });
        
        // Reset all states
        document.getElementById('chatContainer').innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to InterviewAI! 🚀</h2>
                <p>Choose an interview type to begin.</p>
            </div>
        `;
        
        // Reset progress indicators
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = 'Question 1/10';
        document.getElementById('duration').textContent = '00:00';
        document.getElementById('averageScore').textContent = 'Score: 0/10';
        
        // Reset input
        document.getElementById('userInput').value = '';
        
        // Reset styles
        sessionEl.style.opacity = '';
        sessionEl.style.transform = '';
        setupEl.style.opacity = '';
        setupEl.style.transform = '';
    }, 300);
}

// Add this function to toggle video size
function toggleVideoSize() {
    const container = document.querySelector('.video-container');
    const btn = container.querySelector('.minimize-btn i');
    
    container.classList.toggle('minimized');
    btn.classList.toggle('fa-compress');
    btn.classList.toggle('fa-expand');
}

// Add these CSS styles for user messages
const styles = `
.user-message {
    margin: 1rem 0;
    padding: 1rem;
    border-radius: 12px;
    background: linear-gradient(145deg, var(--accent-color), var(--accent-hover));
    align-self: flex-end;
    max-width: 80%;
    animation: slideInFromBottom 0.3s ease;
}

.user-message .message-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.9);
}

.user-message .message-text {
    color: white;
    line-height: 1.5;
}

.message-content {
    word-break: break-word;
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Practice Section Functionality
function filterQuestions() {
    const category = document.getElementById('categoryFilter').value;
    const searchText = document.getElementById('searchQuestions').value.toLowerCase();
    const questionItems = document.querySelectorAll('.question-item');

    questionItems.forEach(item => {
        const questionCategory = item.dataset.category;
        const questionText = item.querySelector('h3').textContent.toLowerCase();
        const categoryMatch = category === 'all' || questionCategory === category;
        const searchMatch = questionText.includes(searchText);
        
        item.style.display = categoryMatch && searchMatch ? 'block' : 'none';
    });
}

// Resources section functionality
function loadResource(type) {
    switch(type) {
        case 'tips':
            window.location.href = '#tips';
            showInterviewTips();
            break;
        case 'resume':
            window.location.href = '#resume';
            showResumeGuide();
            break;
        case 'videos':
            window.location.href = '#videos';
            showVideoTutorials();
            break;
    }
}

function showInterviewTips() {
    const tips = {
        preparation: [
            'Research the company thoroughly',
            'Practice common questions',
            'Prepare relevant examples',
        ],
        during: [
            'Use the STAR method',
            'Maintain good eye contact',
            'Ask thoughtful questions',
        ]
    };
    
    // Implementation for showing tips
    alert('Interview tips feature coming soon!');
}

function showResumeGuide() {
    const resourcesSection = document.getElementById('resources');
    resourcesSection.innerHTML = `
        <div class="resource-content">
            <h2>Resume Writing Guide</h2>
            <div class="resume-sections">
                <div class="resume-section">
                    <h3>Essential Components</h3>
                    <ul>
                        <li>Contact Information</li>
                        <li>Professional Summary</li>
                        <li>Work Experience</li>
                        <li>Education</li>
                        <li>Skills</li>
                    </ul>
                </div>
                <div class="resume-section">
                    <h3>Best Practices</h3>
                    <ul>
                        <li>Keep it concise (1-2 pages)</li>
                        <li>Use action verbs</li>
                        <li>Quantify achievements</li>
                        <li>Proofread carefully</li>
                        <li>Tailor to job description</li>
                    </ul>
                </div>
                <div class="resume-templates">
                    <h3>Resume Templates</h3>
                    <div class="template-grid">
                        <div class="template-card">
                            <img src="path/to/template1.jpg" alt="Professional Template">
                            <button onclick="downloadTemplate('professional')">Download</button>
                        </div>
                        <div class="template-card">
                            <img src="path/to/template2.jpg" alt="Creative Template">
                            <button onclick="downloadTemplate('creative')">Download</button>
                        </div>
                    </div>
                </div>
            </div>
            <button class="back-to-resources" onclick="showResourcesHome()">Back to Resources</button>
        </div>
    `;
}

function showVideoTutorials() {
    const resourcesSection = document.getElementById('resources');
    resourcesSection.innerHTML = `
        <div class="resource-content">
            <h2>Video Tutorials</h2>
            <div class="video-grid">
                <div class="video-card">
                    <div class="video-thumbnail">
                        <img src="path/to/thumbnail1.jpg" alt="Interview Tips">
                        <button onclick="playVideo('interview-tips')">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    <h3>Mastering the STAR Method</h3>
                    <p>Learn how to structure your answers effectively</p>
                </div>
                <div class="video-card">
                    <div class="video-thumbnail">
                        <img src="path/to/thumbnail2.jpg" alt="Body Language">
                        <button onclick="playVideo('body-language')">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    <h3>Body Language Tips</h3>
                    <p>Non-verbal communication in interviews</p>
                </div>
            </div>
            <button class="back-to-resources" onclick="showResourcesHome()">Back to Resources</button>
        </div>
    `;
}

function showResourcesHome() {
    const resourcesSection = document.getElementById('resources');
    resourcesSection.innerHTML = `
        <h2>Interview Resources</h2>
        <div class="resources-grid">
            <div class="resource-card" onclick="loadResource('tips')">
                <i class="fas fa-book"></i>
                <h3>Interview Tips</h3>
                <p>Essential tips for successful interviews</p>
                <button class="resource-btn">Learn More</button>
            </div>
            <div class="resource-card" onclick="loadResource('resume')">
                <i class="fas fa-file-alt"></i>
                <h3>Resume Guide</h3>
                <p>Create an impressive resume</p>
                <button class="resource-btn">View Guide</button>
            </div>
            <div class="resource-card" onclick="loadResource('videos')">
                <i class="fas fa-video"></i>
                <h3>Video Tutorials</h3>
                <p>Watch interview preparation videos</p>
                <button class="resource-btn">Watch Now</button>
            </div>
        </div>
    `;
}

// Resources Section Functionality
function showQuestionLibrary() {
    const questions = [
        {
            category: 'behavioral',
            questions: [
                'Tell me about a challenging project you worked on.',
                'How do you handle conflicts in a team?',
                'Describe a time you showed leadership.',
            ]
        },
        {
            category: 'technical',
            questions: [
                'Explain REST API principles.',
                'What is dependency injection?',
                'Describe your debugging process.',
            ]
        }
    ];
    
    // Implementation for showing questions
    alert('Question library feature coming soon!');
}

function downloadTemplate() {
    // Implementation for template download
    alert('Template download feature coming soon!');
}

function toggleReference(card) {
    card.classList.toggle('active');
}

// Save checklist state
document.querySelectorAll('.checklist input').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        localStorage.setItem(`resume-checklist-${checkbox.id}`, e.target.checked);
    });
    
    // Load saved state
    const saved = localStorage.getItem(`resume-checklist-${checkbox.id}`);
    if (saved) {
        checkbox.checked = saved === 'true';
    }
});

// Add function to handle home navigation
function goToHome() {
    // Switch to home section
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('home').classList.add('active');
    
    // Show interview setup
    const setupEl = document.querySelector('.interview-setup');
    if (setupEl) setupEl.style.display = 'block';
    
    // Hide interview session
    const sessionEl = document.querySelector('.interview-session');
    if (sessionEl) sessionEl.style.display = 'none';
    
    // Clear chat container
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to InterviewAI! 🚀</h2>
                <p>Choose an interview type to begin.</p>
            </div>
        `;
    }
}

// Add this function to make avatar draggable
function makeAvatarDraggable() {
    const avatarContainer = document.querySelector('.avatar-container');
    
    // Load saved position
    const savedPosition = JSON.parse(localStorage.getItem('avatarPosition')) || { x: 20, y: 20 };
    xOffset = savedPosition.x;
    yOffset = savedPosition.y;
    
    setTranslate(xOffset, yOffset, avatarContainer);

    // Mouse events
    avatarContainer.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events
    avatarContainer.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);
}

function dragStart(e) {
    const avatarContainer = document.querySelector('.avatar-container');
    
    if (e.type === "touchstart") {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
    } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
    }

    if (e.target === avatarContainer || avatarContainer.contains(e.target)) {
        isDragging = true;
        avatarContainer.classList.add('dragging');
        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        const avatarContainer = document.querySelector('.avatar-container');

        if (e.type === "touchmove") {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }

        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, avatarContainer);
    }
}

function dragEnd(e) {
    if (isDragging) {
        isDragging = false;
        const avatarContainer = document.querySelector('.avatar-container');
        avatarContainer.classList.remove('dragging');
        document.body.style.userSelect = '';
        
        // Save position
        localStorage.setItem('avatarPosition', JSON.stringify({ x: xOffset, y: yOffset }));
    }
}

function setTranslate(xPos, yPos, el) {
    // Allow movement anywhere on screen
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;
    
    // Ensure avatar stays within viewport
    xPos = Math.min(Math.max(0, xPos), maxX);
    yPos = Math.min(Math.max(0, yPos), maxY);
    
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
}

// Add this function after generateFeedback
async function analyzeResponse(answer) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Analyze this interview answer for: 
                        1. Sentiment (positive/negative/neutral)
                        2. Key topics/keywords
                        3. Confidence level (based on language used)
                        4. Clarity of communication
                        
                        Answer: "${answer}"
                        
                        Return strictly in this JSON format:
                        {
                            "sentiment": "positive/negative/neutral",
                            "keywords": ["keyword1", "keyword2"],
                            "confidence_score": number between 0-1,
                            "clarity_score": number between 0-1,
                            "language_analysis": {
                                "filler_words_count": number,
                                "technical_terms": ["term1", "term2"],
                                "sentence_structure": "simple/complex/balanced"
                            }
                        }`
                    }]
                }]
            })
        });

        if (!response.ok) throw new Error('NLP analysis failed');
        
        const data = await response.json();
        const analysis = JSON.parse(data.candidates[0].content.parts[0].text);
        
        // Update global confidence score
        confidenceScore = analysis.confidence_score;
        
        return analysis;
    } catch (error) {
        console.error('Error in NLP analysis:', error);
        return null;
    }
}

// Update handleSubmit to include NLP analysis
async function handleSubmit() {
    const userInput = document.getElementById('userInput');
    const answer = userInput.value.trim();
    if (!answer) return;

    userInput.disabled = true;
    displayUserMessage(answer);
    userInput.value = '';
    userInput.style.height = '';

    try {
        showTypingIndicator();

        // Perform NLP analysis
        const nlpAnalysis = await analyzeResponse(answer);
        
        // Generate feedback incorporating NLP insights
        const feedbackData = await generateEnhancedFeedback(
            currentInterview.questions[currentInterview.currentQuestionIndex].question,
            answer,
            currentInterview.type,
            nlpAnalysis
        );

        hideTypingIndicator();
        await displayEnhancedFeedback(feedbackData, nlpAnalysis);

        // Continue with next question generation...
        if (currentInterview.currentQuestionIndex < MAX_QUESTIONS - 1) {
            showNextQuestionLoading();
            try {
                const nextQuestion = await generateQuestion(currentInterview.type);
                currentInterview.questions.push(nextQuestion);
                currentInterview.currentQuestionIndex++;
                await displayQuestion(nextQuestion);
                userInput.disabled = false;
                userInput.placeholder = "Type your answer here...";
            } catch (error) {
                console.error('Error generating next question:', error);
                showError('Failed to load next question. Please try again.');
            }
        } else {
            showInterviewSummary();
        }

    } catch (error) {
        console.error('Error:', error);
        showError('Failed to process response. Please try again.');
        userInput.disabled = false;
    }
}

// Add this function to generate enhanced feedback using NLP insights
async function generateEnhancedFeedback(question, answer, type, nlpAnalysis) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Generate enhanced feedback for this ${type} interview answer.
                        Question: "${question}"
                        Answer: "${answer}"
                        NLP Analysis: ${JSON.stringify(nlpAnalysis)}
                        
                        Return strictly in this JSON format:
                        {
                            "feedback": "detailed feedback incorporating NLP insights",
                            "score": number between 1-10,
                            "strengths": ["strength1", "strength2"],
                            "improvements": ["improvement1", "improvement2"],
                            "language_feedback": {
                                "tone": "feedback about tone",
                                "clarity": "feedback about clarity",
                                "confidence": "feedback about confidence level"
                            }
                        }`
                    }]
                }]
            })
        });

        if (!response.ok) throw new Error('Feedback generation failed');
        
        const data = await response.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);

    } catch (error) {
        console.error('Error generating enhanced feedback:', error);
        return {
            feedback: "Thank you for your response.",
            score: 7,
            strengths: ["Response recorded"],
            improvements: ["Continue to next question"],
            language_feedback: {
                tone: "N/A",
                clarity: "N/A",
                confidence: "N/A"
            }
        };
    }
}

// Update displayFeedback to show enhanced feedback with NLP insights
async function displayEnhancedFeedback(feedbackData, nlpAnalysis) {
    const chatContainer = document.getElementById('chatContainer');
    
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'message bot-message feedback-message';
    feedbackElement.innerHTML = `
        <div class="feedback-header">
            <i class="fas fa-comment-dots"></i>
            <span>Feedback</span>
        </div>
        
        <div class="feedback-content">
            <p>${feedbackData.feedback}</p>
            <div class="feedback-score">Score: ${feedbackData.score}/10</div>
            
            <div class="nlp-insights">
                <h4>Language Analysis:</h4>
                <ul>
                    <li>Tone: ${nlpAnalysis.sentiment}</li>
                    <li>Confidence Level: ${Math.round(nlpAnalysis.confidence_score * 100)}%</li>
                    <li>Clarity: ${Math.round(nlpAnalysis.clarity_score * 100)}%</li>
                </ul>
                
                <h4>Key Topics Covered:</h4>
                <div class="keywords">
                    ${nlpAnalysis.keywords.map(keyword => 
                        `<span class="keyword-tag">${keyword}</span>`
                    ).join('')}
                </div>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(feedbackElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

