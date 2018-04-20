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

    const createPresetElement = (name) => {
        const preset = document.createElement('div');
        preset.className = 'preset-entry';

        const presetText = document.createElement('div');
        presetText.innerText = name;
        preset.appendChild(presetText);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerText = 'DELETE';
        deleteButton.addEventListener('click', () => {
            browser.runtime.sendMessage({ type: MESSAGE_KEYS.DELETE_PRESET, preset: name }).then(newStateHandler);
        });
        preset.appendChild(deleteButton);

        return preset;
    };

    const clearPresetElements = () => document.getElementById('presets').innerHTML = '';

    const newStateHandler = (state) => {
        clearPresetElements();
        if (!state.presets) return;

        const presetFragment = document.createDocumentFragment();
        Object.keys(state.presets).forEach(presetName => presetFragment.appendChild(createPresetElement(presetName)));
        document.getElementById('presets').appendChild(presetFragment);
    };

    browser.runtime.sendMessage({ type: MESSAGE_KEYS.QUERY_STATE }).then(newStateHandler);

    port.onMessage.addListener((msg) => {
        if (msg.type === MESSAGE_KEYS.UPDATE_STATE) {
            newStateHandler(msg.state);
        }
    });
})();
