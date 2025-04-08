// DOM Elements - Main UI
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const chatContainer = document.getElementById("chatContainer");
const voiceVisual = document.getElementById("voiceVisual");
const themeToggle = document.getElementById("themeToggle");
const themeSwitch = document.getElementById("themeSwitch");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeModalBtns = document.querySelectorAll(".close");
const saveSettingsBtn = document.getElementById("saveSettings");
const voiceSelect = document.getElementById("voiceSelect");
const languageSelect = document.getElementById("languageSelect");
const responseSpeed = document.getElementById("responseSpeed");
const speedValue = document.getElementById("speedValue");
const ttsSwitch = document.getElementById("ttsSwitch");
const clearHistory = document.getElementById("clearHistory");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const prevCmd = document.getElementById("prevCmd");
const nextCmd = document.getElementById("nextCmd");
const fileUpload = document.getElementById("fileUpload");
const hfApiKeyInput = document.getElementById("hfApiKey");
const geminiApiKeyInput = document.getElementById("geminiApiKey");
const imagePreview = document.getElementById("imagePreview");
const confirmUpload = document.getElementById("confirmUpload");
const settingsTabs = document.querySelectorAll(".settings-tab");
const settingsContents = document.querySelectorAll(".settings-content");
const togglePasswordBtns = document.querySelectorAll(".toggle-password");
const quickActionBtns = document.querySelectorAll(".quick-actions button");

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
let autoTTS = true;
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
    
    // Only speak welcome message if autoTTS is enabled
    if (autoTTS) {
        speak("Ginnie is ready to assist you. How can I help you today?");
    }
    
    addWelcomeMessage();
    
    // Update speed value display
    updateSpeedValueDisplay();
    
    // Set initial theme switch state
    themeSwitch.checked = currentTheme === 'dark';
}

// Add welcome message
function addWelcomeMessage() {
    const welcomeMessage = `
    <div class="space-y-3">
        <div class="flex items-center gap-2">
            <span class="inline-block w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                <i class="fas fa-hand-sparkles"></i>
            </span>
            <h3 class="text-lg font-medium text-primary-500 dark:text-primary-400">Welcome to Ginnie!</h3>
        </div>
        <p>I'm your advanced AI assistant. Here are some things I can help you with:</p>
        <ul class="grid grid-cols-1 md:grid-cols-2 gap-2 my-3">
            <li class="flex items-center gap-2 text-sm">
                <i class="fas fa-circle-question text-primary-400 w-5 text-center"></i>
                <span>Answer general questions</span>
            </li>
            <li class="flex items-center gap-2 text-sm">
                <i class="fas fa-image text-primary-400 w-5 text-center"></i>
                <span>Generate images</span>
            </li>
            <li class="flex items-center gap-2 text-sm">
                <i class="fas fa-calculator text-primary-400 w-5 text-center"></i>
                <span>Solve math problems</span>
            </li>
            <li class="flex items-center gap-2 text-sm">
                <i class="fas fa-chart-line text-primary-400 w-5 text-center"></i>
                <span>Plot graphs of equations</span>
            </li>
            <li class="flex items-center gap-2 text-sm">
                <i class="fas fa-clock text-primary-400 w-5 text-center"></i>
                <span>Tell time and date</span>
            </li>
            <li class="flex items-center gap-2 text-sm">
                <i class="fas fa-language text-primary-400 w-5 text-center"></i>
                <span>Translate languages</span>
            </li>
        </ul>
        <p class="text-sm italic">Try asking me something, or click one of the quick actions in the sidebar.</p>
    </div>`;
    
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

    // Theme toggle - both header button and settings switch
    themeToggle.addEventListener("click", toggleTheme);
    themeSwitch.addEventListener("change", (e) => {
        currentTheme = e.target.checked ? 'dark' : 'light';
        applyTheme();
        saveSettings();
    });

    // Settings modal
    settingsBtn.addEventListener("click", openSettingsModal);
    closeModalBtns.forEach(btn => {
        btn.addEventListener("click", closeSettingsModal);
    });
    
    window.addEventListener("click", (e) => {
        if (e.target === settingsModal) closeSettingsModal();
    });

    // Settings tabs
    settingsTabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            const tabId = e.currentTarget.getAttribute("data-tab");
            switchSettingsTab(tabId);
        });
    });
    
    // Toggle password visibility
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const input = e.currentTarget.previousElementSibling;
            const icon = e.currentTarget.querySelector("i");
            
            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                input.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        });
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
    responseSpeed.addEventListener("input", (e) => {
        updateSpeedValueDisplay();
        saveSettings();
    });
    
    // TTS toggle
    ttsSwitch.addEventListener("change", (e) => {
        autoTTS = e.target.checked;
        saveSettings();
    });

    // Clear history - both button locations
    clearHistory.addEventListener("click", () => {
        confirmClearHistory();
    });
    
    clearHistoryBtn.addEventListener("click", () => {
        confirmClearHistory();
    });

    // Quick action buttons
    if (quickActionBtns) {
        quickActionBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const action = e.currentTarget.textContent.trim();
                userInput.value = action;
                handleSendClick();
            });
        });
    }

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

    // Save settings button
    saveSettingsBtn.addEventListener("click", () => {
        saveSettings();
        closeSettingsModal();
        
        // Show success toast
        showToast("Settings saved successfully", "success");
    });

    // When voices are loaded
    speechSynthesis.onvoiceschanged = loadVoices;
    
    // Add keyboard shortcut for voice toggle (press 'M' key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'm' && document.activeElement !== userInput) {
            toggleVoiceRecognition();
        }
    });
}

// Update speed value display
function updateSpeedValueDisplay() {
    if (speedValue) {
        speedValue.textContent = parseFloat(responseSpeed.value).toFixed(1);
    }
}

// Show toast message
function showToast(message, type = "info") {
    // Create toast element
    const toast = document.createElement("div");
    
    let bgColor = "bg-primary-500";
    let icon = "fa-info-circle";
    
    if (type === "success") {
        bgColor = "bg-green-500";
        icon = "fa-check-circle";
    } else if (type === "error") {
        bgColor = "bg-red-500";
        icon = "fa-exclamation-circle";
    } else if (type === "warning") {
        bgColor = "bg-yellow-500";
        icon = "fa-exclamation-triangle";
    }
    
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up z-50`;
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Apply current theme
function applyTheme() {
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        if (themeSwitch) {
            themeSwitch.checked = true;
        }
    } else {
        document.documentElement.classList.remove('dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        if (themeSwitch) {
            themeSwitch.checked = false;
        }
    }
}

// Toggle theme
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveSettings();
}

// Switch settings tab
function switchSettingsTab(tabId) {
    // Update tab buttons
    settingsTabs.forEach(tab => {
        if (tab.getAttribute("data-tab") === tabId) {
            tab.classList.add("text-primary-500", "border-primary-500");
            tab.classList.remove("text-lightNeutral-500", "dark:text-darkNeutral-400", "border-transparent");
        } else {
            tab.classList.remove("text-primary-500", "border-primary-500");
            tab.classList.add("text-lightNeutral-500", "dark:text-darkNeutral-400", "border-transparent");
        }
    });
    
    // Update tab contents
    settingsContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.remove("hidden");
            content.classList.add("block");
        } else {
            content.classList.remove("block");
            content.classList.add("hidden");
        }
    });
}

// Confirm clear history
function confirmClearHistory() {
    if (confirm("Are you sure you want to clear your conversation history?")) {
        chatContainer.innerHTML = '';
        commandHistory = [];
        currentHistoryIndex = -1;
        addWelcomeMessage();
        
        if (autoTTS) {
            speak("Conversation history cleared.");
        }
        
        saveSettings();
        showToast("Conversation history cleared", "success");
    }
}

// Open settings modal
function openSettingsModal() {
    settingsModal.style.display = "flex";
    setTimeout(() => {
        const modalContent = settingsModal.querySelector('.modal-content');
        modalContent.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
    }, 10);
}

// Close settings modal
function closeSettingsModal() {
    const modalContent = settingsModal.querySelector('.modal-content');
    modalContent.style.opacity = '0';
    modalContent.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        settingsModal.style.display = "none";
    }, 300);
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
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
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
    // Show typing indicator with animated dots
    const typingIndicator = createChatBox(
        `<div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center">
                <span class="loading-spinner"></span>
            </div>
            <div>
                <div class="flex items-center gap-1">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
                <div class="text-xs text-lightNeutral-500 dark:text-darkNeutral-400 mt-1">Ginnie is thinking...</div>
            </div>
        </div>`, 
        "ai-chat-box"
    );
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
        
        respond(`
            <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-700 dark:text-yellow-400">
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="font-medium">API Key Required</span>
                </div>
                <p>Please enter your Gemini API key in settings to enable advanced AI responses.</p>
                <button id="openApiSettings" class="mt-2 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-sm transition-colors">
                    Open Settings
                </button>
            </div>
        `);
        
        // Add event listener to the button
        setTimeout(() => {
            const openApiBtn = document.getElementById("openApiSettings");
            if (openApiBtn) {
                openApiBtn.addEventListener("click", () => {
                    openSettingsModal();
                    switchSettingsTab("api");
                });
            }
        }, 100);
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
        imgElement.className = "max-w-full rounded-lg mt-3 border border-primary/30";
        
        const container = document.createElement("div");
        container.classList.add("ai-chat-box");
        container.innerHTML = `<p class="mb-2 text-primary font-medium">Generated image for: "${prompt}"</p>`;
        container.appendChild(imgElement);
        
        chatContainer.appendChild(container);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
    } catch (error) {
        respond(`Sorry, I couldn't generate that image. ${error.message}`);
    }
}

// Handle file upload with enhanced preview
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset any previous upload
    resetUploadUI();

    // Show preview
    const imageUrl = URL.createObjectURL(file);
    imagePreview.innerHTML = `<img src="${imageUrl}" alt="Preview" class="w-full h-full object-cover">`;
    imagePreview.classList.remove('hidden');
    
    // Store file for later processing
    pendingUpload = file;
    
    // Show confirm button and update placeholder
    confirmUpload.classList.remove('hidden');
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

// Reset upload UI elements with improved styling
function resetUploadUI() {
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    confirmUpload.classList.add('hidden');
    userInput.value = '';
    userInput.placeholder = "Ask Ginnie something...";
    pendingUpload = null;
    fileUpload.value = '';
}

// Process uploaded image with improved UI feedback
async function processImageUpload(file, promptText = '') {
    if (isProcessingImage) {
        respond("Please wait while I process the current image.");
        return;
    }

    isProcessingImage = true;
    
    // Show processing indicator with animated dots
    const processingIndicator = createChatBox(
        `<div class='flex items-center gap-3'>
            <span class='loading-spinner'></span>
            <div>
                <span>Processing image</span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>`, 
        "ai-chat-box"
    );
    processingIndicator.id = "processingIndicator";
    chatContainer.appendChild(processingIndicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        // Show the image first
        const imageUrl = URL.createObjectURL(file);
        const imgPreview = document.createElement("img");
        imgPreview.src = imageUrl;
        imgPreview.className = "max-w-[60%] rounded-lg mt-3 border border-accent/20";
        
        const previewContainer = document.createElement("div");
        previewContainer.classList.add("ai-chat-box");
        previewContainer.innerHTML = `<div class="text-primary font-medium">Uploaded image${promptText ? ` (${promptText})` : ''}:</div>`;
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
                    <div class="text-primary font-medium mb-2">Extracted text:</div>
                    <div class="p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-sm font-mono">${cleanedText}</div>
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
            <div class="text-primary font-medium mb-3">Found ${mathEquations.length} math equation(s):</div>
            <div class="flex gap-2 overflow-x-auto pb-2 mb-2" id="mathTabs"></div>
            <div class="border border-gray-700 rounded-lg p-3 bg-gray-800/30" id="mathContent"></div>
        `;
        
        const tabsContainer = mathContainer.querySelector("#mathTabs");
        const contentContainer = mathContainer.querySelector("#mathContent");
        
        mathEquations.forEach((eq, index) => {
            try {
                // Create tab
                const tab = document.createElement("div");
                tab.classList.add(
                    "math-tab", 
                    "px-3", "py-1", "rounded-full", "text-sm", "cursor-pointer", 
                    "transition-colors", "border", "border-gray-700"
                );
                if (index === 0) {
                    tab.classList.add("bg-primary", "text-dark", "font-medium");
                } else {
                    tab.classList.add("bg-gray-800", "hover:bg-gray-700");
                }
                tab.textContent = `Eq ${index + 1}`;
                tab.onclick = () => switchMathTab(index);
                tabsContainer.appendChild(tab);
                
                // Create content
                const content = document.createElement("div");
                content.classList.add("math-content");
                if (index === 0) content.classList.add("block");
                else content.classList.add("hidden");
                content.id = `mathContent-${index}`;
                
                // Clean and prepare equation
                const cleanEq = cleanEquation(eq);
                const solution = math.evaluate(cleanEq);
                
                content.innerHTML = `
                    <div class="equation mb-3 text-lg"><span class="text-primary">${cleanEq}</span> = <span class="text-secondary">${solution}</span></div>
                    ${canPlotGraph(cleanEq) ? '<div class="graph-container mt-4 rounded-lg overflow-hidden border border-gray-700"></div>' : ''}
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
                    <div class="equation text-lg"><span class="text-primary">${eq}</span></div>
                    <div class="error text-red-500 mt-2">Could not solve this equation</div>
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
            tab.classList.remove('bg-gray-800', 'hover:bg-gray-700');
            tab.classList.add('bg-primary', 'text-dark', 'font-medium');
        } else {
            tab.classList.remove('bg-primary', 'text-dark', 'font-medium');
            tab.classList.add('bg-gray-800', 'hover:bg-gray-700');
        }
    });
    
    document.querySelectorAll('.math-content').forEach((content, i) => {
        if (i === index) {
            content.classList.remove('hidden');
            content.classList.add('block');
        } else {
            content.classList.remove('block');
            content.classList.add('hidden');
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
            <div class="text-primary font-medium mb-2">Graph of: ${equation}</div>
            <div class="graph-container h-64 w-full border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30" id="graph-${Date.now()}"></div>
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
                    <div class="p-3 text-red-500">Could not plot graph: ${plotError.message}</div>
                    <div class="p-3 text-sm font-mono">Attempted to plot: ${plotEquation}</div>
                `;
            }
        }, 100);
    } catch (error) {
        console.error('Error plotting graph:', error);
        respond(`Sorry, I couldn't plot that equation. ${error.message}`);
    }
}

// Toggle voice recognition with improved visualization
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
    
    // Update button style
    if (isListening) {
        voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        voiceBtn.classList.add('text-accent-500');
        voiceBtn.classList.add('animate-pulse');
    } else {
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.classList.remove('text-accent-500');
        voiceBtn.classList.remove('animate-pulse');
    }
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
    voiceBtn.classList.remove('bg-accent');
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

// Create chat box element with enhanced styling
function createChatBox(content, className) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const box = document.createElement("div");
    
    if (className === "user-chat-box") {
        box.className = "flex flex-col items-end animate-slide-left";
        box.innerHTML = `
            <div class="flex items-end gap-2">
                <div class="text-xs text-lightNeutral-500 dark:text-darkNeutral-400">${timestamp}</div>
                <div class="max-w-[80%] p-4 rounded-xl chat-bubble-user text-lightNeutral-900 dark:text-white bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700/50 shadow-sm">
                    ${content}
                </div>
                <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                    <i class="fas fa-user"></i>
                </div>
            </div>
        `;
    } else {
        box.className = "flex flex-col items-start animate-slide-right";
        box.innerHTML = `
            <div class="flex items-end gap-2">
                <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white flex items-center justify-center">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="max-w-[80%] p-4 rounded-xl chat-bubble-ai text-lightNeutral-900 dark:text-white bg-white dark:bg-darkNeutral-800/60 border border-lightNeutral-200 dark:border-darkNeutral-700 shadow-sm">
                    ${content}
                </div>
                <div class="text-xs text-lightNeutral-500 dark:text-darkNeutral-400">${timestamp}</div>
            </div>
        `;
    }
    
    return box;
}

// Add AI response to chat
function respond(message) {
    const aiBox = createChatBox(message, "ai-chat-box");
    chatContainer.appendChild(aiBox);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Only speak if autoTTS is enabled
    if (autoTTS) {
        // Convert HTML to plain text for speech
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = message;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        speak(plainText);
    }
}

// Speak text using speech synthesis
function speak(text) {
    if (!selectedVoice || !autoTTS) return;
    
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

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('genieSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        currentTheme = settings.theme || 'dark';
        selectedLanguage = settings.language || 'en';
        autoTTS = settings.autoTTS !== undefined ? settings.autoTTS : true;
        responseSpeed.value = settings.responseSpeed || '1';
        hfApiKey = settings.hfApiKey || '';
        geminiApiKey = settings.geminiApiKey || '';
        commandHistory = settings.commandHistory || [];
        
        // Apply settings to UI
        languageSelect.value = selectedLanguage;
        recognition.lang = selectedLanguage;
        hfApiKeyInput.value = hfApiKey;
        geminiApiKeyInput.value = geminiApiKey;
        ttsSwitch.checked = autoTTS;
        
        // Apply theme
        applyTheme();
    }
}

// Save settings to localStorage
function saveSettings() {
    const settings = {
        theme: currentTheme,
        voice: selectedVoice ? selectedVoice.name : null,
        language: selectedLanguage,
        autoTTS: autoTTS,
        responseSpeed: responseSpeed.value,
        hfApiKey: hfApiKey,
        geminiApiKey: geminiApiKey,
        commandHistory: commandHistory
    };
    localStorage.setItem('genieSettings', JSON.stringify(settings));
}

// Initialize the app
window.onload = init;