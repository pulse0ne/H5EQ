(function () {
    // TODO: replace with continuous search for audio/video components
    setTimeout(function () {
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
        const WebAudioContext = (window.AudioContext || window.webkitAudioContext);
        const pipelines = [];

        const setEnabled = (enabled) => {
            pipelines.forEach(cx => {
                cx.source.disconnect();
                cx.source.connect(enabled ? cx.filters[0] : cx.context.destination);
            });
        };

        const createPipelineForElement = (element, gains) => {
            const context = new WebAudioContext();
            const source = context.createMediaElementSource(element);
            const filters = [];
            source.connect(context.destination);
            const numericalFreqs = Object.keys(gains).map(g => parseFloat(g));
            numericalFreqs.sort();
            numericalFreqs.forEach((freq, ix, arr) => {
                const filter = context.createBiquadFilter();
                filter.frequency.value = freq;
                filter.Q.value = 1.0;
                filter.gain.value = gains[String(freq)];
                filter.type = ix === 0 ? 'lowshelf' : ix === arr.length - 1 ? 'highshelf' : 'peaking';
                filters.push(filter);
                if (ix > 0) filters[ix - 1].connect(filter);
                if (ix === arr.length - 1) filter.connect(context.destination);
            });
            pipelines.push({ context, source, filters });
        };

        const applyGainToPipelineEntry = (entry, frequency, gain) => {
            const filter = entry.filters.find(f => String(f.frequency.value) === frequency);
            if (filter) {
                filter.gain.value = gain;
            }
        };

        browser.runtime.sendMessage({ type: MESSAGE_KEYS.QUERY_STATE }).then((state) => {
            let mediaElements = ([...document.querySelectorAll('audio')]).concat([...document.querySelectorAll('video')]);
            mediaElements.forEach(element => createPipelineForElement(element, state.gains));
            setEnabled(state.enabled);

            const port = browser.runtime.connect({ name: 'h5eq' });
            port.onMessage.addListener(msg => {
                switch(msg.type) {
                case MESSAGE_KEYS.UPDATE_GAIN:
                    pipelines.forEach(pipeline => applyGainToPipelineEntry(pipeline, msg.frequency, msg.gain));
                    break;
                case MESSAGE_KEYS.UPDATE_ENABLED:
                    setEnabled(msg.enabled);
                    break;
                }
            });
        });
    }, 250);
})();
