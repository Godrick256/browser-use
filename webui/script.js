document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const modelSelect = document.getElementById('model-select');
    const providerNote = document.getElementById('provider-note');
    const apiKeyInput = document.getElementById('api-key');
    const saveKeyBtn = document.getElementById('save-key');
    const taskInput = document.getElementById('task-input');
    const runTaskBtn = document.getElementById('run-task-btn');
    const outputContainer = document.getElementById('output-container');
    const browserPlaceholder = document.getElementById('browser-placeholder');
    const browserFrame = document.getElementById('browser-frame');
    const historyList = document.getElementById('history-list');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    const resetSettingsBtn = document.getElementById('reset-settings');
    const copyOutputBtn = document.getElementById('copy-output');
    const clearOutputBtn = document.getElementById('clear-output');
    const refreshBtn = document.getElementById('refresh-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const exampleTasks = document.querySelectorAll('.example-task');

    // State
    let isRunning = false;
    let currentTaskId = null;
    let taskHistory = [];
    let settings = {
        maxSteps: 25,
        maxActionsPerStep: 10,
        viewportExpansion: 500,
        enableMemory: true,
        memoryInterval: 10,
        generateGif: false,
        saveConversation: false,
        outputPath: './output'
    };

    // Load settings from localStorage
    function loadSettings() {
        const savedSettings = localStorage.getItem('browserUseSettings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
            
            // Apply settings to form elements
            document.getElementById('max-steps').value = settings.maxSteps;
            document.getElementById('max-actions').value = settings.maxActionsPerStep;
            document.getElementById('viewport-expansion').value = settings.viewportExpansion;
            document.getElementById('enable-memory').checked = settings.enableMemory;
            document.getElementById('memory-interval').value = settings.memoryInterval;
            document.getElementById('generate-gif').checked = settings.generateGif;
            document.getElementById('save-conversation').checked = settings.saveConversation;
            document.getElementById('output-path').value = settings.outputPath;
        }
    }

    // Save settings to localStorage
    function saveSettings() {
        settings.maxSteps = parseInt(document.getElementById('max-steps').value);
        settings.maxActionsPerStep = parseInt(document.getElementById('max-actions').value);
        settings.viewportExpansion = parseInt(document.getElementById('viewport-expansion').value);
        settings.enableMemory = document.getElementById('enable-memory').checked;
        settings.memoryInterval = parseInt(document.getElementById('memory-interval').value);
        settings.generateGif = document.getElementById('generate-gif').checked;
        settings.saveConversation = document.getElementById('save-conversation').checked;
        settings.outputPath = document.getElementById('output-path').value;
        
        localStorage.setItem('browserUseSettings', JSON.stringify(settings));
        settingsModal.style.display = 'none';
        
        addOutputMessage('Settings saved successfully', 'success');
    }

    // Reset settings to defaults
    function resetSettings() {
        settings = {
            maxSteps: 25,
            maxActionsPerStep: 10,
            viewportExpansion: 500,
            enableMemory: true,
            memoryInterval: 10,
            generateGif: false,
            saveConversation: false,
            outputPath: './output'
        };
        
        // Apply settings to form elements
        document.getElementById('max-steps').value = settings.maxSteps;
        document.getElementById('max-actions').value = settings.maxActionsPerStep;
        document.getElementById('viewport-expansion').value = settings.viewportExpansion;
        document.getElementById('enable-memory').checked = settings.enableMemory;
        document.getElementById('memory-interval').value = settings.memoryInterval;
        document.getElementById('generate-gif').checked = settings.generateGif;
        document.getElementById('save-conversation').checked = settings.saveConversation;
        document.getElementById('output-path').value = settings.outputPath;
        
        localStorage.setItem('browserUseSettings', JSON.stringify(settings));
        
        addOutputMessage('Settings reset to defaults', 'info');
    }

    // Load API key from localStorage
    function loadApiKey() {
        const savedApiKey = localStorage.getItem('browserUseApiKey');
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
        }
    }

    // Save API key to localStorage
    function saveApiKey() {
        localStorage.setItem('browserUseApiKey', apiKeyInput.value);
        addOutputMessage('API key saved successfully', 'success');
    }

    // Update provider note based on selected model
    function updateProviderNote() {
        const model = modelSelect.value;
        
        if (model.startsWith('gpt')) {
            providerNote.textContent = 'For OpenAI models';
        } else if (model.startsWith('claude')) {
            providerNote.textContent = 'For Anthropic models';
        } else if (model.startsWith('gemini')) {
            providerNote.textContent = 'For Google models';
        } else if (model.startsWith('deepseek')) {
            providerNote.textContent = 'For DeepSeek models';
        } else if (model.startsWith('qwen')) {
            providerNote.textContent = 'For local Ollama models';
        }
    }

    // Add a message to the output container
    function addOutputMessage(message, type = 'info', action = null) {
        const messageEl = document.createElement('div');
        messageEl.className = `output-message ${type}`;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        const content = document.createElement('div');
        content.className = 'content';
        content.textContent = message;
        
        messageEl.appendChild(timestamp);
        messageEl.appendChild(content);
        
        if (action) {
            const actionEl = document.createElement('div');
            actionEl.className = 'action';
            actionEl.textContent = action;
            messageEl.appendChild(actionEl);
        }
        
        outputContainer.appendChild(messageEl);
        outputContainer.scrollTop = outputContainer.scrollHeight;
    }

    // Add a task to history
    function addTaskToHistory(task) {
        const taskId = Date.now().toString();
        const taskItem = {
            id: taskId,
            task: task,
            timestamp: new Date().toISOString()
        };
        
        taskHistory.unshift(taskItem);
        if (taskHistory.length > 10) {
            taskHistory.pop();
        }
        
        localStorage.setItem('browserUseHistory', JSON.stringify(taskHistory));
        updateHistoryList();
        
        return taskId;
    }

    // Update history list in UI
    function updateHistoryList() {
        historyList.innerHTML = '';
        
        taskHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            if (item.id === currentTaskId) {
                historyItem.classList.add('active');
            }
            
            const taskText = item.task.length > 30 ? item.task.substring(0, 30) + '...' : item.task;
            historyItem.textContent = taskText;
            
            historyItem.addEventListener('click', () => {
                taskInput.value = item.task;
                currentTaskId = item.id;
                updateHistoryList();
            });
            
            historyList.appendChild(historyItem);
        });
    }

    // Load history from localStorage
    function loadHistory() {
        const savedHistory = localStorage.getItem('browserUseHistory');
        if (savedHistory) {
            taskHistory = JSON.parse(savedHistory);
            updateHistoryList();
        }
    }

    // Run a task
    function runTask() {
        if (isRunning) {
            addOutputMessage('A task is already running', 'warning');
            return;
        }
        
        const task = taskInput.value.trim();
        if (!task) {
            addOutputMessage('Please enter a task', 'error');
            return;
        }
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            addOutputMessage('Please enter an API key', 'error');
            return;
        }
        
        // Clear previous output
        outputContainer.innerHTML = '';
        
        // Add task to history
        currentTaskId = addTaskToHistory(task);
        
        // Show loading state
        isRunning = true;
        runTaskBtn.disabled = true;
        runTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
        
        // Show browser frame
        browserPlaceholder.style.display = 'none';
        browserFrame.style.display = 'block';
        
        // In a real implementation, this would connect to a backend server
        // For this demo, we'll simulate the agent running
        addOutputMessage('Starting browser-use agent...', 'info');
        addOutputMessage(`Task: ${task}`, 'info');
        
        // Simulate agent steps
        simulateAgentRun(task);
    }

    // Simulate agent running (in a real implementation, this would connect to a backend)
    function simulateAgentRun(task) {
        const model = modelSelect.value;
        const headless = document.getElementById('headless-mode').checked;
        const disableSecurity = document.getElementById('disable-security').checked;
        const useVision = document.getElementById('use-vision').checked;
        
        addOutputMessage(`Using model: ${model}`, 'info');
        addOutputMessage(`Browser options: ${headless ? 'Headless' : 'Visible'}, ${disableSecurity ? 'Security disabled' : 'Security enabled'}, ${useVision ? 'Vision enabled' : 'Vision disabled'}`, 'info');
        
        // Simulate browser loading
        browserFrame.src = 'https://browser-use.com';
        
        // Simulate agent steps
        let step = 1;
        const totalSteps = Math.floor(Math.random() * 5) + 3; // Random number of steps between 3-7
        
        const simulateStep = () => {
            if (step <= totalSteps) {
                const actions = [
                    'Navigating to website...',
                    'Analyzing page content...',
                    'Clicking on element...',
                    'Filling form field...',
                    'Scrolling down...',
                    'Extracting information...',
                    'Switching to new tab...'
                ];
                
                const randomAction = actions[Math.floor(Math.random() * actions.length)];
                
                addOutputMessage(`Step ${step}/${totalSteps}: ${randomAction}`, 'info', 
                    `Action: ${randomAction.split(':')[0].toLowerCase()}`);
                
                step++;
                setTimeout(simulateStep, 2000);
            } else {
                // Task completed
                addOutputMessage('Task completed successfully!', 'success');
                
                // Reset UI state
                isRunning = false;
                runTaskBtn.disabled = false;
                runTaskBtn.innerHTML = '<i class="fas fa-play"></i> Run Task';
            }
        };
        
        // Start simulation after a delay
        setTimeout(simulateStep, 2000);
    }

    // Copy output to clipboard
    function copyOutput() {
        const outputText = Array.from(outputContainer.querySelectorAll('.output-message'))
            .map(msg => {
                const timestamp = msg.querySelector('.timestamp').textContent;
                const content = msg.querySelector('.content').textContent;
                const action = msg.querySelector('.action')?.textContent || '';
                return `[${timestamp}] ${content} ${action}`;
            })
            .join('\n');
        
        navigator.clipboard.writeText(outputText)
            .then(() => {
                addOutputMessage('Output copied to clipboard', 'success');
            })
            .catch(err => {
                addOutputMessage('Failed to copy output: ' + err, 'error');
            });
    }

    // Clear output
    function clearOutput() {
        outputContainer.innerHTML = '';
        addOutputMessage('Output cleared', 'info');
    }

    // Event Listeners
    modelSelect.addEventListener('change', updateProviderNote);
    saveKeyBtn.addEventListener('click', saveApiKey);
    runTaskBtn.addEventListener('click', runTask);
    settingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
    closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
    saveSettingsBtn.addEventListener('click', saveSettings);
    resetSettingsBtn.addEventListener('click', resetSettings);
    copyOutputBtn.addEventListener('click', copyOutput);
    clearOutputBtn.addEventListener('click', clearOutput);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });
    
    // Example task click handlers
    exampleTasks.forEach(task => {
        task.addEventListener('click', (e) => {
            e.preventDefault();
            taskInput.value = task.textContent;
        });
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        if (browserFrame.src) {
            browserFrame.src = browserFrame.src;
        }
    });
    
    // Fullscreen button
    fullscreenBtn.addEventListener('click', () => {
        if (browserFrame.requestFullscreen) {
            browserFrame.requestFullscreen();
        } else if (browserFrame.webkitRequestFullscreen) {
            browserFrame.webkitRequestFullscreen();
        } else if (browserFrame.msRequestFullscreen) {
            browserFrame.msRequestFullscreen();
        }
    });
    
    // Initialize
    updateProviderNote();
    loadApiKey();
    loadSettings();
    loadHistory();
    
    // Allow task submission with Enter key
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            runTask();
        }
    });
});