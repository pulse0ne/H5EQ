(function () {
    const MESSAGE_KEYS = {
        QUERY_STATE: 'query::state',
        UPDATE_STATE: 'update::state',
        SET_GAIN: 'set::gain',
        SET_ENABLED: 'set::enabled',
        SET_PRESET: 'set::preset',
        SAVE_PRESET: 'save::preset',
        DELETE_PRESET: 'delete::preset'
    };

    class H5EQ {
        constructor () {
            this.WebAudioContext = (window.AudioContext || window.webkitAudioContext);
            this.DOMMutationObserver = (window.MutationObserver || window.webkitMutationObserver);
            this.pipelines = new Set();
            this.state = {};
            this.observer = null;
        }

        setEnabled (enabled) {
            this.pipelines.forEach(p => {
                p.source.disconnect();
                p.source.connect(enabled ? p.filters[0] : p.context.destination);
            });
        }

        createPipelineForElement (element) {
            const { gains, enabled } = this.state;
            const context = new this.WebAudioContext();
            const source = context.createMediaElementSource(element);
            const filters = [];
            source.connect(context.destination);
            const numericalFreqs = Object.keys(gains).map(g => parseFloat(g));
            numericalFreqs.sort();
            numericalFreqs.forEach((freq, ix, arr) => {
                const filter = context.createBiquadFilter();
                filter.frequency.value = freq;
                filter.Q.value = 1.0;
                filter.gain.value = gains[freq];
                filter.type = ix === 0 ? 'lowshelf' : ix === arr.length - 1 ? 'highshelf' : 'peaking';
                filters.push(filter);
                if (ix > 0) filters[ix - 1].connect(filter);
                if (ix === arr.length - 1) filter.connect(context.destination);
            });
            this.pipelines.add({ context, source, filters });
            this.setEnabled(enabled);
        };

        updatePipelines () {
            const { gains } = this.state;
            const numericalFreqs = Object.keys(gains).map(g => parseFloat(g));
            numericalFreqs.sort();
            this.pipelines.forEach(({ filters }) => {
                numericalFreqs.forEach((freq, ix) => {
                    const filter = filters[ix];
                    filter.gain.value = gains[freq];
                });
            });
            this.setEnabled(this.state.enabled);
        }

        messageRcv (msg) {
            if (msg.type === MESSAGE_KEYS.UPDATE_STATE) {
                this.state = msg.state;
                this.updatePipelines();
            }
        }

        domMutated () {
            const mediaElements = ([...document.body.querySelectorAll('video')])
                .concat([...document.body.querySelectorAll('audio')]);
            mediaElements
                .filter(el => !el.h5eq)
                .forEach(el => {
                    console.log('H5EQ: New Media Player found');
                    el.h5eq = true;
                    this.createPipelineForElement(el);
                });
        }

        throttle (func, threshold, context) {
            if (!threshold || threshold < 0) threshold = 250;
            let last;
            let deferred;
            return function () {
                const self = context || this;
                const now = +new Date();
                const args = arguments;
                if (last && now < last + threshold) {
                    clearTimeout(deferred);
                    deferred = setTimeout(function () {
                        last = now;
                        func.apply(self, args);
                    }, threshold);
                } else {
                    last = now;
                    func.apply(self, args);
                }
            };
        }

        attach() {
            const port = browser.runtime.connect({ name: 'h5eq' });
            const listener = this.messageRcv.bind(this);
            port.onMessage.addListener(listener);

            browser.runtime.sendMessage({ type: MESSAGE_KEYS.QUERY_STATE }).then(initialState => {
                this.state = initialState;
                const domListener = this.throttle(this.domMutated.bind(this));
                this.observer = new this.DOMMutationObserver(domListener);
                this.observer.observe(document.body, { childList: true, subtree: true });
            });
        }

        detach() {
            this.observer.disconnect();
        }
    }

    const h5eq = new H5EQ();
    h5eq.attach();
})();
