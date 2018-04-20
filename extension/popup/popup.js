(function () {
    const MESSAGE_KEYS = {
        QUERY_STATE: 'query::state',
        UPDATE_STATE: 'update::state',
        UPDATE_GAIN: 'update::gain',
        UPDATE_ENABLED: 'update::enabled',
        UPDATE_PRESET: 'update::preset',
        SET_GAIN: 'set::gain',
        SET_ENABLED: 'set::enabled',
        SET_PRESET: 'set::preset',
        SAVE_PRESET: 'save::preset',
        DELETE_PRESET: 'delete::preset'
    };

    const port = browser.runtime.connect();

    const emptyOption = (() => {
        const opt = document.createElement('option');
        opt.value = '';
        return opt;
    })();

    /**
     * @param {String} frequency
     * @param {Number} gain
     */
    const createSlider = (frequency, gain=0.0) => {
        const freq = parseInt(frequency);
        const slider = document.createElement('div');
        slider.className = 'slider-wrapper';
        const label = document.createElement('span');
        label.className = 'band-label';
        label.innerText = freq >= 1000 ? `${Math.trunc(freq / 1000)}k` : String(freq);
        slider.appendChild(label);
        const input = document.createElement('input');
        input.id = `eq-${frequency}hz`;
        input.type = 'range';
        input.min = '-20.0';
        input.max = '20.0';
        input.value = String(gain.toFixed(1));
        input.step = '0.5';
        input.title = `${frequency} hertz`;
        slider.appendChild(input);

        const gainText = document.createElement('div');
        gainText.id = `gain-${frequency}hz`;
        gainText.className = 'eq-gain';
        gainText.innerText = String(gain.toFixed(1));

        input.addEventListener('input', () => {
            const value = parseFloat(input.value);
            gainText.innerText = String(value.toFixed(1));
            port.postMessage({ type: MESSAGE_KEYS.SET_GAIN, frequency: frequency, gain: value });
        });

        return [slider, gainText];
    };

    const clearSliders = () => {
        document.getElementById('eq-bank').innerHTML = '';
        document.getElementById('gain-bank').innerHTML = '';
    };

    const createPreset = (name) => {
        const preset = document.createElement('option');
        preset.innerText = name;
        preset.value = name;
        return preset;
    };

    const clearPresets = () => document.getElementById('preset-select').innerHTML = '';

    const handleNewState = state => {
        const enabledCheckbox = document.getElementById('eq-enabled-checkbox');
        enabledCheckbox.checked = state.enabled;
        enabledCheckbox.parentElement.classList[state.enabled ? 'add' : 'remove']('checked');

        clearSliders();
        const sliderBankFragment = document.createDocumentFragment();
        const gainBankFragment = document.createDocumentFragment();
        Object.keys(state.gains).forEach(freq => {
            const [slider, gainText] = createSlider(freq, state.gains[freq]);
            sliderBankFragment.appendChild(slider);
            gainBankFragment.appendChild(gainText);
        });
        document.getElementById('eq-bank').appendChild(sliderBankFragment);
        document.getElementById('gain-bank').appendChild(gainBankFragment);

        clearPresets();
        const presetFragment = document.createDocumentFragment();
        presetFragment.appendChild(emptyOption);
        Object.keys(state.presets).forEach(preset => presetFragment.appendChild(createPreset(preset)));
        document.getElementById('preset-select').appendChild(presetFragment);
    };

    const swapHidden = (elemToHide, elemToShow) => {
        elemToHide.classList.add('hidden');
        elemToShow.classList.remove('hidden');
    };

    // attach listeners
    const nameContainer = document.getElementById('preset-name-input');
    const selectContainer = document.getElementById('preset-select-container');
    const buttonsWrapper = document.getElementById('preset-buttons-wrapper');
    const saveBtn = document.getElementById('save-button');
    const nameInput = document.getElementById('name-input');
    const presetSelect = document.getElementById('preset-select');
    document.getElementById('load-preset-button').addEventListener('click', () => swapHidden(buttonsWrapper, selectContainer));
    document.getElementById('preset-select-cancel-button').addEventListener('click', () => swapHidden(selectContainer, buttonsWrapper));
    document.getElementById('cancel-button').addEventListener('click', () => swapHidden(nameContainer, buttonsWrapper));
    document.getElementById('save-preset-button').addEventListener('click', () => {
        swapHidden(buttonsWrapper, nameContainer);
        nameInput.focus();
    });
    saveBtn.addEventListener('click', () => {
        browser.runtime.sendMessage({ type: MESSAGE_KEYS.SAVE_PRESET, name: nameInput.value }).then(state => {
            swapHidden(nameContainer, buttonsWrapper);
            handleNewState(state);
        });
    });
    presetSelect.addEventListener('change', () => {
        if (presetSelect.value) {
            browser.runtime.sendMessage({ type: MESSAGE_KEYS.SET_PRESET, preset: presetSelect.value }).then(state => {
                swapHidden(selectContainer, buttonsWrapper);
                handleNewState(state);
            });
        }
    });
    nameInput.addEventListener('input', () => saveBtn.disabled = !nameInput.value);

    // get state and initialize the sliders
    browser.runtime.sendMessage({ type: MESSAGE_KEYS.QUERY_STATE }).then((state) => {
        handleNewState(state);
        setTimeout(() => {
            const enabledCheckbox = document.getElementById('eq-enabled-checkbox');
            enabledCheckbox.addEventListener('click', () => {
                enabledCheckbox.parentElement.classList[enabledCheckbox.checked ? 'add' : 'remove']('checked');
                port.postMessage({ type: MESSAGE_KEYS.SET_ENABLED, enabled: enabledCheckbox.checked });
            });
            enabledCheckbox.nextElementSibling.style.transition = 'all 0.15s ease-in-out';
            document.getElementById('popup-content').style.opacity = '1.0';
        });
    });
})();
