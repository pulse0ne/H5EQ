(function () {
    const CENTER_FREQS = ['40', '64', '125', '250', '500', '1000', '2000', '4000', '8000', '16000'];

    const MESSAGE_KEYS = {
        QUERY_STATE: 'query::state',
        UPDATE_STATE: 'update::state',
        UPDATE_GAIN: 'update::gain',
        UPDATE_ENABLED: 'update::enabled',
        SET_GAIN: 'set::gain',
        SET_ENABLED: 'set::enabled'
    };

    const port = browser.runtime.connect();
    port.onMessage.addListener(msg => {
        if (msg.type === MESSAGE_KEYS.UPDATE_STATE) {
            CENTER_FREQS.forEach(freq => {
                const slider = document.getElementById(`eq-${freq}hz`);
                const textGain = document.getElementById(`gain-${freq}hz`);
                textGain.innerText = String((msg.state.gains[freq] || 0.0).toFixed(1));
                slider.value = msg.state.gains[freq] || 0.0;
                slider.addEventListener('input', () => {
                    const value = slider.value;
                    textGain.innerText = String(parseFloat(value).toFixed(1));
                    port.postMessage({ type: MESSAGE_KEYS.SET_GAIN, frequency: freq, gain: parseFloat(value) });
                });
            });

            const enabledCheckbox = document.getElementById('eq-enabled-checkbox');
            enabledCheckbox.checked = msg.state.enabled;
            enabledCheckbox.addEventListener('click', () => {
                const checked = enabledCheckbox.checked;
                port.postMessage({ type: MESSAGE_KEYS.SET_ENABLED, enabled: checked });
            });
        }
    });

    port.postMessage({ type: MESSAGE_KEYS.QUERY_STATE });
})();
