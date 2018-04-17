(function () {
    // TODO: replace with continuous search for audio/video components
    setTimeout(function () {
        const MESSAGE_KEYS = {
            QUERY_STATE: 'query::state',
            UPDATE_STATE: 'update::state',
            UPDATE_GAIN: 'update::gain',
            UPDATE_ENABLED: 'update::enabled',
            SET_GAIN: 'set::gain',
            SET_ENABLED: 'set::enabled'
        };
        const AudioCx = (window.AudioContext || window.webkitAudioContext);
        const audioContexts = [];

        const createContextEntry = (mediaElement) => {
            const cx = {};
            cx.context = new AudioCx();
            cx.source = cx.context.createMediaElementSource(mediaElement);
            cx.filters = [];
            cx.source.connect(cx.context.destination);
            [40, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].forEach((freq, ix, arr) => {
                const filter = cx.context.createBiquadFilter();
                filter.frequency.value = freq;
                filter.Q.value = 1.0;
                filter.gain.value = 0.0;
                filter.type = ix === 0 ? 'lowshelf' : ix === arr.length - 1 ? 'highshelf' : 'peaking';
                cx.filters.push(filter);
                if (ix > 0) cx.filters[ix - 1].connect(filter);
                if (ix === arr.length - 1) filter.connect(cx.context.destination);
            });
            audioContexts.push(cx);
        };

        const applyGainToContextEntry = (entry, frequency, gain) => {
            const filter = entry.filters.find(f => String(f.frequency.value) === frequency);
            if (filter) {
                filter.gain.value = gain;
            }
        };

        const setEnabled = (enabled) => {
            audioContexts.forEach(cx => {
                cx.source.disconnect();
                cx.source.connect(enabled ? cx.filters[0] : cx.context.destination);
            });
        };

        let audioElements = document.querySelectorAll('audio') || [];
        let videoElements = document.querySelectorAll('video') || [];
        if (!audioElements.length && !videoElements.length) {
            console.log('no audio/video elements to equalize');
        } else {
            let enabled = false;

            audioElements.forEach(createContextEntry);
            videoElements.forEach(createContextEntry);

            let port = browser.runtime.connect({ name: 'h5eq' });
            port.onMessage.addListener(msg => {
                if (msg.type === MESSAGE_KEYS.UPDATE_STATE) {
                    enabled = msg.state.enabled;
                    Object.keys(msg.state.gains).forEach(freq => {
                        const gain = msg.state.gains[freq];
                        audioContexts.forEach(cx => applyGainToContextEntry(cx, freq, gain));
                    });
                    setEnabled(enabled);
                } else if (msg.type === MESSAGE_KEYS.UPDATE_GAIN) {
                    audioContexts.forEach(cx => applyGainToContextEntry(cx, msg.frequency, msg.gain));
                } else if (msg.type === MESSAGE_KEYS.UPDATE_ENABLED) {
                    setEnabled(msg.enabled);
                }
            });

            browser.runtime.sendMessage({ type: 'TEST' }).then(function (res) {
                console.log(res);
            });

            port.postMessage({ type: MESSAGE_KEYS.QUERY_STATE });
        }
    }, 250);
})();
