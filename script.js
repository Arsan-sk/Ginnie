// DOM Elements
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const chatContainer = document.getElementById("chatContainer");
const voiceVisual = document.getElementById("voiceVisual");
const themeToggle = document.getElementById("themeToggle");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeModal = document.querySelector(".close");
const voiceSelect = document.getElementById("voiceSelect");
const languageSelect = document.getElementById("languageSelect");
const responseSpeed = document.getElementById("responseSpeed");
const clearHistory = document.getElementById("clearHistory");
const prevCmd = document.getElementById("prevCmd");
const nextCmd = document.getElementById("nextCmd");
const fileUpload = document.getElementById("fileUpload");
const hfApiKeyInput = document.getElementById("hfApiKey");
const geminiApiKeyInput = document.getElementById("geminiApiKey");
const imagePreview = document.getElementById("imagePreview");
const confirmUpload = document.getElementById("confirmUpload");

// Speech recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.maxAlternatives = 1;

// State variables
let commandHistory = [];
let currentHistoryIndex = -1;
let isListening = false;
let isFinalResult = false;
let silenceTimer = null;
let currentTheme = 'dark';
let voices = [];
let selectedVoice = null;
let selectedLanguage = 'en';
let hfApiKey = "";
let geminiApiKey = "";
let hfApiUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
let geminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
let pendingUpload = null;
let isProcessingImage = false;

// Initialize the app
function init() {
    loadSettings();
    setupEventListeners();
    loadVoices();
    speak("Genie is ready to assist you. How can I help you today?");
    addWelcomeMessage();
}

// Add welcome message
function addWelcomeMessage() {
    const welcomeMessage = `Hello! I'm Genie, your advanced virtual assistant. I can help you with:
- Answering questions (powered by Gemini AI)
- Opening websites (Google, YouTube, etc.)
- Telling time, date, and day
- Setting reminders
- Translating languages
- Generating images (try "generate an image of...")
- Solving math problems from images
- Plotting graphs of equations
- And much more!

Try saying "Hello" or ask me anything.`;
    
    const welcomeBox = createChatBox(welcomeMessage, "ai-chat-box");
    chatContainer.appendChild(welcomeBox);
}

// Setup event listeners
function setupEventListeners() {
    // Voice recognition
    voiceBtn.addEventListener("click", toggleVoiceRecognition);
    recognition.onresult = handleVoiceResult;
    recognition.onerror = handleVoiceError;
    recognition.onend = handleVoiceEnd;

    // Text input
    sendBtn.addEventListener("click", handleSendClick);
    userInput.addEventListener("keydown", handleInputKeydown);

    // Theme toggle
    themeToggle.addEventListener("click", toggleTheme);

    // Settings modal
    settingsBtn.addEventListener("click", () => settingsModal.style.display = "flex");
    closeModal.addEventListener("click", () => settingsModal.style.display = "none");
    window.addEventListener("click", (e) => {
        if (e.target === settingsModal) settingsModal.style.display = "none";
    });

    // Voice selection
    voiceSelect.addEventListener("change", (e) => {
        selectedVoice = voices.find(v => v.name === e.target.value);
        saveSettings();
    });

    // Language selection
    languageSelect.addEventListener("change", (e) => {
        selectedLanguage = e.target.value;
        recognition.lang = e.target.value;
        saveSettings();
    });

    // Response speed
    responseSpeed.addEventListener("input", saveSettings);

    // Clear history
    clearHistory.addEventListener("click", () => {
        chatContainer.innerHTML = '';
        commandHistory = [];
        currentHistoryIndex = -1;
        addWelcomeMessage();
        speak("Conversation history cleared.");
        saveSettings();
    });

    // Command history navigation
    prevCmd.addEventListener("click", navigateHistoryUp);
    nextCmd.addEventListener("click", navigateHistoryDown);

    // File upload
    fileUpload.addEventListener("change", handleFileUpload);
    confirmUpload.addEventListener("click", confirmImageUpload);

    // API key inputs
    hfApiKeyInput.addEventListener("change", (e) => {
        hfApiKey = e.target.value;
        saveSettings();
    });

    geminiApiKeyInput.addEventListener("change", (e) => {
        geminiApiKey = e.target.value;
        saveSettings();
    });

    // When voices are loaded
    speechSynthesis.onvoiceschanged = loadVoices;
}

// Handle send button click
function handleSendClick() {
    const message = userInput.value.trim();
    if (message) {
        addUserMessage(message);
        processUserInput(message);
        userInput.value = '';
    }
}

// Handle Enter key press
function handleInputKeydown(e) {
    if (e.key === 'Enter') {
        handleSendClick();
    }
}

// Add user message to chat
function addUserMessage(message) {
    const userBox = createChatBox(message, "user-chat-box");
    chatContainer.appendChild(userBox);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Add to command history
    commandHistory.push(message);
    currentHistoryIndex = commandHistory.length;
}

// Process user input and generate response
function processUserInput(input) {
    // Show typing indicator
    const typingIndicator = createChatBox("<span class='loading-spinner'></span>", "ai-chat-box");
    typingIndicator.id = "typingIndicator";
    chatContainer.appendChild(typingIndicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // First check if this is a basic command we can handle locally
    const localResponse = tryLocalResponse(input);
    if (localResponse) {
        // Remove typing indicator
        const indicator = document.getElementById("typingIndicator");
        if (indicator) chatContainer.removeChild(indicator);
        
        // Display local response
        respond(localResponse);
        return;
    }

    // If not a local command, try Gemini API if available
    if (geminiApiKey) {
        getGeminiResponse(input)
            .then(response => {
                // Remove typing indicator
                const indicator = document.getElementById("typingIndicator");
                if (indicator) chatContainer.removeChild(indicator);
                
                // Display Gemini response
                respond(response);
            })
            .catch(error => {
                // Remove typing indicator
                const indicator = document.getElementById("typingIndicator");
                if (indicator) chatContainer.removeChild(indicator);
                
                console.error("Gemini API error:", error);
                respond("I couldn't get a response from Gemini. Please try again or check your API key.");
            });
    } else {
        // Remove typing indicator
        const indicator = document.getElementById("typingIndicator");
        if (indicator) chatContainer.removeChild(indicator);
        
        respond("Please enter your Gemini API key in settings for advanced responses.");
    }
}

// Try to handle the input locally first
function tryLocalResponse(input) {
    input = input.toLowerCase();
    
    // Basic commands
    if (input.includes('hello') || input.includes('hi')) {
        return "Hello there! How can I assist you today?";
    }
    else if (input.includes('time')) {
        return `The current time is ${new Date().toLocaleTimeString()}.`;
    }
    else if (input.includes('date')) {
        return `Today's date is ${new Date().toLocaleDateString()}.`;
    }
    else if (input.includes('thank')) {
        return "You're welcome! Is there anything else I can help with?";
    }
    // Math equations
    else if (input.includes('solve') || input.includes('calculate')) {
        return solveMathEquation(input);
    }
    // Graph plotting
    else if (input.includes('graph') || input.includes('plot')) {
        return plotEquationFromInput(input);
    }
    // Image generation
    else if ((input.includes('generate') || input.includes('image')) && hfApiKey) {
        const prompt = input.replace(/generate|image|picture|/gi, '').trim();
        generateImage(prompt);
        return `Generating an image of: ${prompt}...`;
    }
    
    // Not a local command
    return null;
}

// Get response from Gemini API
async function getGeminiResponse(prompt) {
    try {
        const response = await fetch(`${geminiApiUrl}?key=${geminiApiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Unexpected response format from Gemini API");
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
}

// Solve math equations
function solveMathEquation(input) {
    try {
        // Extract equation from input
        const equation = input.replace(/solve|calculate|what is|/gi, '').trim();
        const cleanEq = cleanEquation(equation);
        const solution = math.evaluate(cleanEq);
        
        return `Solution: ${cleanEq} = ${solution}`;
    } catch (error) {
        return "Sorry, I couldn't solve that equation. Could you try rephrasing it?";
    }
}

// Plot equation from input
function plotEquationFromInput(input) {
    try {
        // Extract equation from input
        const equation = input.replace(/graph|plot|draw|/gi, '').trim();
        const cleanEq = cleanEquation(equation);
        
        if (canPlotGraph(cleanEq)) {
            plotEquationGraph(cleanEq);
            return `Here's the graph of ${cleanEq}:`;
        } else {
            return "I can only graph equations with a single variable (x).";
        }
    } catch (error) {
        return "Sorry, I couldn't plot that equation. Could you try rephrasing it?";
    }
}

// Generate image using Hugging Face API
async function generateImage(prompt) {
    if (!hfApiKey) {
        respond("Please enter your Hugging Face API key in settings to generate images.");
        return;
    }

    try {
        const response = await fetch(hfApiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: prompt })
        });
        
        if (!response.ok) throw new Error("Image generation failed");
        
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        
        const imgElement = document.createElement("img");
        imgElement.src = imageUrl;
        imgElement.style.maxWidth = "100%";
        
        const container = document.createElement("div");
        container.classList.add("ai-chat-box");
        container.innerHTML = `<p>Generated image for: "${prompt}"</p>`;
        container.appendChild(imgElement);
        
        chatContainer.appendChild(container);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
    } catch (error) {
        respond(`Sorry, I couldn't generate that image. ${error.message}`);
    }
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset any previous upload
    resetUploadUI();

    // Show preview
    const imageUrl = URL.createObjectURL(file);
    imagePreview.innerHTML = `<img src="${imageUrl}" alt="Preview">`;
    imagePreview.style.display = 'block';
    
    // Store file for later processing
    pendingUpload = file;
    
    // Show confirm button and update placeholder
    confirmUpload.style.display = 'flex';
    userInput.placeholder = "Add a prompt (optional)...";
}

// Confirm and process image upload
function confirmImageUpload() {
    if (!pendingUpload) return;
    
    // Get optional prompt text
    const promptText = userInput.value.trim();
    
    // Process the upload
    processImageUpload(pendingUpload, promptText);
    
    // Reset UI
    resetUploadUI();
}

// Reset upload UI elements
function resetUploadUI() {
    imagePreview.style.display = 'none';
    imagePreview.innerHTML = '';
    confirmUpload.style.display = 'none';
    userInput.value = '';
    userInput.placeholder = "Ask Something....";
    pendingUpload = null;
    fileUpload.value = '';
}

// Process uploaded image
async function processImageUpload(file, promptText = '') {
    if (isProcessingImage) {
        respond("Please wait while I process the current image.");
        return;
    }

    isProcessingImage = true;
    
    // Show processing indicator
    const processingIndicator = createChatBox("Processing image... <span class='loading-spinner'></span>", "ai-chat-box");
    processingIndicator.id = "processingIndicator";
    chatContainer.appendChild(processingIndicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        // Show the image first
        const imageUrl = URL.createObjectURL(file);
        const imgPreview = document.createElement("img");
        imgPreview.src = imageUrl;
        imgPreview.style.maxWidth = "60%";
        imgPreview.style.borderRadius = "10px";
        
        const previewContainer = document.createElement("div");
        previewContainer.classList.add("ai-chat-box");
        previewContainer.innerHTML = `<div class="image-prompt">Uploaded image${promptText ? ` (${promptText})` : ''}:</div>`;
        previewContainer.appendChild(imgPreview);
        chatContainer.appendChild(previewContainer);

        // Perform OCR
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        const cleanedText = text.trim();

        // Remove processing indicator
        const indicator = document.getElementById("processingIndicator");
        if (indicator) chatContainer.removeChild(indicator);

        // Only process further if text was found
        if (cleanedText) {
            const equations = findMathEquations(cleanedText);
            
            if (equations.length > 0) {
                processExtractedText(cleanedText, file.name);
            } else if (promptText.toLowerCase().includes('equation') || 
                      promptText.toLowerCase().includes('math')) {
                respond("I didn't find any mathematical equations in the image.");
            }
            
            // Show OCR text if user provided a prompt or if equations were found
            if (promptText || equations.length > 0) {
                const resultContainer = document.createElement("div");
                resultContainer.classList.add("ai-chat-box");
                resultContainer.innerHTML = `
                    <div class="image-prompt">Extracted text:</div>
                    <div class="ocr-text">${cleanedText}</div>
                `;
                chatContainer.appendChild(resultContainer);
            }
        } else if (promptText) {
            respond("I couldn't find any text in the image.");
        }
        
    } catch (error) {
        console.error("Error processing file:", error);
        respond(`Sorry, I couldn't process that image. ${error.message}`);
    } finally {
        isProcessingImage = false;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Process text extracted from images with graph support
function processExtractedText(text, filename) {
    // Clean up the extracted text
    const cleanedText = text.trim();
    
    // Check for mathematical equations
    const mathEquations = findMathEquations(cleanedText);
    
    if (mathEquations.length > 0) {
        const mathContainer = document.createElement("div");
        mathContainer.classList.add("ai-chat-box");
        mathContainer.innerHTML = `
            <div class="image-prompt">Found ${mathEquations.length} math equation(s):</div>
            <div class="math-tabs" id="mathTabs"></div>
            <div class="math-content-container" id="mathContent"></div>
        `;
        
        const tabsContainer = mathContainer.querySelector("#mathTabs");
        const contentContainer = mathContainer.querySelector("#mathContent");
        
        mathEquations.forEach((eq, index) => {
            try {
                // Create tab
                const tab = document.createElement("div");
                tab.classList.add("math-tab");
                if (index === 0) tab.classList.add("active");
                tab.textContent = `Eq ${index + 1}`;
                tab.onclick = () => switchMathTab(index);
                tabsContainer.appendChild(tab);
                
                // Create content
                const content = document.createElement("div");
                content.classList.add("math-content");
                if (index === 0) content.classList.add("active");
                content.id = `mathContent-${index}`;
                
                // Clean and prepare equation
                const cleanEq = cleanEquation(eq);
                const solution = math.evaluate(cleanEq);
                
                content.innerHTML = `
                    <div class="equation">${cleanEq} = ${solution}</div>
                    ${canPlotGraph(cleanEq) ? '<div class="graph-container"></div>' : ''}
                `;
                contentContainer.appendChild(content);
                
                // Plot graph if possible
                if (canPlotGraph(cleanEq)) {
                    setTimeout(() => {
                        const graphContainer = content.querySelector('.graph-container');
                        if (graphContainer) {
                            plotGraph(cleanEq, graphContainer);
                        }
                    }, 100);
                }
                
            } catch (error) {
                console.error(`Couldn't solve equation: ${eq}`, error);
                const errorContent = document.createElement("div");
                errorContent.classList.add("math-content");
                errorContent.innerHTML = `
                    <div class="equation">${eq}</div>
                    <div class="error">Could not solve this equation</div>
                `;
                contentContainer.appendChild(errorContent);
            }
        });
        
        chatContainer.appendChild(mathContainer);
    }
}

// Clean equation from OCR artifacts
function cleanEquation(equation) {
    return equation
        .replace(/[^0-9+\-*/^().x=]/g, '') // Remove non-math characters
        .replace(/\s/g, '')                // Remove whitespace
        .replace(/[xX]/g, 'x')             // Standardize variable to lowercase x
        .replace(/\*\*/g, '^')             // Convert ** back to ^ for display
        .replace(/(\d)\(/g, '$1*(')        // Add implicit multiplication
        .replace(/\)(\d)/g, ')*$1')        // Add implicit multiplication
        .replace(/\)x/g, ')*x')            // Add implicit multiplication
        .replace(/x\(/g, 'x*(')            // Add implicit multiplication
        .replace(/×/g, '*')                // Replace × with *
        .replace(/÷/g, '/');               // Replace ÷ with /
}

// Switch between math tabs
function switchMathTab(index) {
    document.querySelectorAll('.math-tab').forEach((tab, i) => {
        if (i === index) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.math-content').forEach((content, i) => {
        if (i === index) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Enhanced equation detection with graphable functions
function findMathEquations(text) {
    // More comprehensive equation detection
    const equationPatterns = [
        // Standard equations: 2x + 3 = 7
        /([-+]?[0-9]*\.?[0-9]+[xX][0-9]*\.?[0-9]*([+\-*/^][0-9]*\.?[0-9]+[xX][0-9]*\.?[0-9]*)*\s*=\s*[-+]?[0-9]*\.?[0-9]+)/,
        // Function definitions: f(x) = x^2 + 3
        /([a-zA-Z]\([xX]\)\s*=\s*[^,]+)/,
        // Expressions: x^2 + sin(x)
        /(([0-9]+[xX](\^[0-9]+)?|sin\([xX]\)|cos\([xX]\)|tan\([xX]\)|log\([xX]\)|sqrt\([xX]\))([+\-*/^]([0-9]+[xX](\^[0-9]+)?|sin\([xX]\)|cos\([xX]\)|tan\([xX]\)|log\([xX]\)|sqrt\([xX]\)))+)/
    ];
    
    const equations = [];
    
    equationPatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        matches.forEach(match => {
            if (match && !equations.includes(match)) {
                equations.push(match);
            }
        });
    });
    
    return equations.map(eq => eq.replace(/[^0-9+\-*/^().xX=sincoqrtanl]/gi, ''));
}

// Check if an equation can be plotted as a graph
function canPlotGraph(equation) {
    // Check if equation contains x and is plottable
    const hasX = /x/i.test(equation);
    if (!hasX) return false;
    
    // Check if equation can be parsed
    try {
        const testEq = equation.replace(/\^/g, '**')
                             .replace(/ /g, '')
                             .replace(/×/g, '*')
                             .replace(/÷/g, '/');
        if (equation.includes('=')) {
            math.evaluate(testEq.split('=')[1].trim());
        } else {
            math.evaluate(testEq);
        }
        return true;
    } catch {
        return false;
    }
}

// Plot a graph for the equation
function plotGraph(equation, container) {
    try {
        // Prepare equation for plotting
        let plotEquation = equation;
        
        // Handle function definitions
        if (plotEquation.includes('=')) {
            plotEquation = plotEquation.split('=')[1].trim();
        }
        
        // Clean the equation
        plotEquation = plotEquation.replace(/\^/g, '**')
                                 .replace(/ /g, '')
                                 .replace(/×/g, '*')
                                 .replace(/÷/g, '/');
        
        // Create unique ID for the container
        const plotId = `plot-${Date.now()}`;
        container.innerHTML = `<div id="${plotId}"></div>`;
        
        // Wait for DOM update
        setTimeout(() => {
            try {
                functionPlot({
                    target: `#${plotId}`,
                    width: container.offsetWidth,
                    height: 250,
                    yAxis: { domain: [-10, 10] },
                    xAxis: { domain: [-10, 10] },
                    grid: true,
                    data: [{
                        fn: plotEquation,
                        derivative: {
                            fn: math.derivative(plotEquation, 'x').toString(),
                            updateOnMouseMove: true
                        }
                    }]
                });
            } catch (plotError) {
                console.error('Function plot error:', plotError);
                container.innerHTML = `
                    <div class="error">Could not plot graph: ${plotError.message}</div>
                    <div>Attempted to plot: ${plotEquation}</div>
                `;
            }
        }, 100);
    } catch (error) {
        console.error('Error plotting graph:', error);
        container.innerHTML = `<div class="error">Graph error: ${error.message}</div>`;
    }
}

// Plot a graph from direct equation input
function plotEquationGraph(equation) {
    try {
        // Create container for graph
        const graphContainer = document.createElement("div");
        graphContainer.classList.add("ai-chat-box");
        graphContainer.innerHTML = `
            <div class="image-prompt">Graph of: ${equation}</div>
            <div class="graph-container" id="graph-${Date.now()}"></div>
        `;
        chatContainer.appendChild(graphContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Get the actual graph container element
        const containerId = graphContainer.querySelector('.graph-container').id;
        
        // Prepare equation for plotting
        let plotEquation = equation;
        
        // Handle function definitions
        if (plotEquation.includes('=')) {
            plotEquation = plotEquation.split('=')[1].trim();
        }
        
        // Clean the equation
        plotEquation = plotEquation.replace(/\^/g, '**')
                                 .replace(/ /g, '')
                                 .replace(/×/g, '*')
                                 .replace(/÷/g, '/');
        
        // Wait for DOM update
        setTimeout(() => {
            try {
                functionPlot({
                    target: `#${containerId}`,
                    width: 500,
                    height: 250,
                    yAxis: { domain: [-10, 10] },
                    xAxis: { domain: [-10, 10] },
                    grid: true,
                    data: [{
                        fn: plotEquation,
                        derivative: {
                            fn: math.derivative(plotEquation, 'x').toString(),
                            updateOnMouseMove: true
                        }
                    }]
                });
            } catch (plotError) {
                console.error('Function plot error:', plotError);
                document.getElementById(containerId).innerHTML = `
                    <div class="error">Could not plot graph: ${plotError.message}</div>
                    <div>Attempted to plot: ${plotEquation}</div>
                `;
            }
        }, 100);
    } catch (error) {
        console.error('Error plotting graph:', error);
        respond(`Sorry, I couldn't plot that equation. ${error.message}`);
    }
}

// Toggle voice recognition
function toggleVoiceRecognition() {
    if (isListening) {
        recognition.stop();
        voiceVisual.style.opacity = '0';
        setTimeout(() => {
            voiceVisual.style.display = 'none';
        }, 300);
    } else {
        recognition.start();
        voiceVisual.style.display = 'flex';
        setTimeout(() => {
            voiceVisual.style.opacity = '1';
        }, 10);
    }
    isListening = !isListening;
    voiceBtn.classList.toggle('active');
}

// Handle voice recognition result
function handleVoiceResult(event) {
    const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
    
    if (event.results[0].isFinal) {
        isFinalResult = true;
        userInput.value = transcript;
        handleSendClick();
    }
}

// Handle voice recognition errors
function handleVoiceError(event) {
    console.error('Voice recognition error', event.error);
    voiceBtn.classList.remove('active');
    voiceVisual.style.opacity = '0';
    setTimeout(() => {
        voiceVisual.style.display = 'none';
    }, 300);
    isListening = false;
    
    respond("Sorry, I couldn't understand you. Could you try typing instead?");
}

// Handle voice recognition end
function handleVoiceEnd() {
    if (!isFinalResult && isListening) {
        recognition.start(); // Restart if we didn't get a final result
    }
    isFinalResult = false;
}

// Create chat box element
function createChatBox(content, className) {
    const box = document.createElement("div");
    box.className = className;
    box.innerHTML = content;
    return box;
}

// Add AI response to chat
function respond(message) {
    const aiBox = createChatBox(message, "ai-chat-box");
    chatContainer.appendChild(aiBox);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    speak(message);
}

// Speak text using speech synthesis
function speak(text) {
    if (!selectedVoice) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = parseFloat(responseSpeed.value);
    speechSynthesis.speak(utterance);
}

// Load available voices
function loadVoices() {
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });
    
    // Set default voice if not already set
    if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices.find(v => v.lang.includes('en')) || voices[0];
        voiceSelect.value = selectedVoice.name;
    }
}

// Navigation through command history
function navigateHistoryUp() {
    if (commandHistory.length === 0) return;
    
    if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        userInput.value = commandHistory[currentHistoryIndex];
    } else if (currentHistoryIndex === -1) {
        currentHistoryIndex = commandHistory.length - 1;
        userInput.value = commandHistory[currentHistoryIndex];
    }
}

function navigateHistoryDown() {
    if (commandHistory.length === 0 || currentHistoryIndex === -1) return;
    
    if (currentHistoryIndex < commandHistory.length - 1) {
        currentHistoryIndex++;
        userInput.value = commandHistory[currentHistoryIndex];
    } else {
        currentHistoryIndex = -1;
        userInput.value = '';
    }
}

// Toggle between light/dark theme
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    saveSettings();
}

// Save settings to localStorage
function saveSettings() {
    const settings = {
        theme: currentTheme,
        voice: selectedVoice ? selectedVoice.name : null,
        language: selectedLanguage,
        responseSpeed: responseSpeed.value,
        hfApiKey: hfApiKey,
        geminiApiKey: geminiApiKey,
        commandHistory: commandHistory
    };
    localStorage.setItem('genieSettings', JSON.stringify(settings));
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('genieSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        currentTheme = settings.theme || 'dark';
        selectedLanguage = settings.language || 'en';
        responseSpeed.value = settings.responseSpeed || '1';
        hfApiKey = settings.hfApiKey || '';
        geminiApiKey = settings.geminiApiKey || '';
        commandHistory = settings.commandHistory || [];
        
        // Apply theme
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        
        // Apply language
        languageSelect.value = selectedLanguage;
        recognition.lang = selectedLanguage;
        
        // Apply API keys
        hfApiKeyInput.value = hfApiKey;
        geminiApiKeyInput.value = geminiApiKey;
    }
}

// Initialize the app
window.onload = init;