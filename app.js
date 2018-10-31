// Import preact component
const {Component, render, h} = preact;

/**
 * Wrapper for font awesome icons
 * @class
 */
class Icon extends Component {
    render({ type, solo }) {
        return h('i', { class: `fa fa-${type} ${solo ? '': 'mr-2'}` });
    }
}

/**
 * Main application point
 * @class
 */
class App extends Component {
    constructor(props) {
        super(props);
        /**
         * Canvas element
         * @member {HTMLCanvasElement}
         */
        this.canvas = null;

        /**
         * Image preview
         * @member {HTMLImageElement}
         */
        this.preview = null;

        /**
         * Output string
         * @member {string}
         */
        this.stepsRef = null;

        /**
         * Output string
         * @member {string}
         */
        this.imageRef = null;

        /**
         * Output string
         * @member {string}
         */
        this.colorpickerRef = null;

        const gradient = localStorage.getItem(App.SAVE_KEY);
        if (gradient) {
            this.state = JSON.parse(gradient);
            this.state.active = null;
        }
        else {
            this.state = this.defaultState;
        }
    }

    /**
     * Get the default state
     * @member {object}
     */
    get defaultState() {
        return {
            active: null,
            width: App.DEFAULT_SIZE,
            height: App.DEFAULT_SIZE,
            horizontal: true,
            color: [
                {
                    value: "#ffffff",
                    stop: 0
                },
                {
                    value: "#000000",
                    stop: 1
                }
            ],
            alpha: [
                {
                    stop: 0,
                    value: 1,
                },
                {
                    stop: 1,
                    value: 1
                }
            ]
        };
    }

    /**
     * Handle canvas ref, get context
     */
    refCanvas(canvas) {
        if (!canvas) {
            return;
        }
        const {width, height} = this.state;
        this.canvas = canvas;
        canvas.width = width;
        canvas.height = height;
    }

    /**
     * Handle gradient canvas ref, get context
     */  
    refPreview(preview) {
        if (!preview) {
            return;
        }
        const {width, height, horizontal} = this.state;
        this.preview = preview;
        preview.width = horizontal !== false ? width : height;
        preview.height = horizontal !== false ? height : width;
    }

    /**
     * Called first mount
     */
    componentDidMount() {
        this.redraw();
    }

    /**
     * Called after every render update
     */
    componentDidUpdate() {
        this.redraw();
        localStorage.setItem(App.SAVE_KEY, this.toDataString());
    }

    /**
     * Redraw Canvas, this does the magic to compose the alpha and color channels.
     * @param {HTMLCanvasElement} canvas
     * @param {Object[]} color
     * @param {Object[]} alpha
     * @param {boolean} horizontal
     * @return {Canvas2dRenderingContext}
     */
    redrawCanvas(canvas, color, alpha, horizontal) {
        const {width, height} = canvas;
        const ctx = canvas.getContext('2d');
        let colorChannel, alphaChannel;
        if (horizontal !== false) {
            colorChannel = ctx.createLinearGradient(1, 0, width - 2, 0);
            alphaChannel = ctx.createLinearGradient(1, 0, width - 2, 0);
        }
        else {
            colorChannel = ctx.createLinearGradient(0, 1, 0, height - 2);
            alphaChannel = ctx.createLinearGradient(0, 1, 0, height - 2);
        }
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-out';

        alpha.forEach(({stop, value}) => {
            alphaChannel.addColorStop(stop, `rgba(100%,100%,100%,${(1 - value)*100}%)`);
        });
        ctx.fillStyle = alphaChannel;
        ctx.fillRect(0, 0, width, height);

        color.forEach(({stop, value}) => {
            colorChannel.addColorStop(stop, value);
        });
        ctx.fillStyle = colorChannel;
        ctx.fillRect(0, 0, width, height);
        return ctx;
    }


    /**
     * Re-render the gradient
     */
    redraw() {
        if (!this.canvas) {
            return;
        }

        const {width, height, horizontal, color, alpha} = this.state;
        const ctx = this.redrawCanvas(this.canvas, color, alpha, horizontal);
        const src = this.canvas.toDataURL('image/png');
        
        const imageData = horizontal !== false ?
            ctx.getImageData(0, 0, width, 1):
            ctx.getImageData(0, 0, 1, height);

        // Calculate the steps at hex numbers
        const steps = [];
        for (let i = 0; i < imageData.data.length / 4; i++) {
            const r = imageData.data[(i*4)];
            const g = imageData.data[(i*4)+1];
            const b = imageData.data[(i*4)+2];
            const a = imageData.data[(i*4)+3];
            steps.push('0x' + this.num2hex(r) + this.num2hex(g) + this.num2hex(b) + this.num2hex(a));
        }

        this.redrawCanvas(this.preview, color, alpha, true);
        this.imageRef.setState({ value: src });
        this.stepsRef.setState({ value: `[\n  ${steps.join(',\n  ')} \n]` });
    }

    /**
     * Convert a uint (255) to hex (ff)
     * @param {number} num - 0 to 255 
     * @return {string} Hex string
     */
    num2hex(num) {
        var s = num.toString(16);
        return s.length == 1 ? '0' + s : s;
    }

    /**
     * @return {string}
     */
    toDataString() {
        const clone = JSON.parse(JSON.stringify(this.state));
        delete clone.active;
        delete clone.horizontal;
        return JSON.stringify(clone, null, '   ');
    }

    /**
     * On width changes
     * @param {InputEvent} e
     */
    onWidth(e) {
        this.setState({ width: parseInt(e.currentTarget.value) });
    }

    /**
     * On height changes
     * @param {InputEvent} e
     */
    onHeight(e) {
        this.setState({ height: parseInt(e.currentTarget.value) });
    }

    /**
     * Handle changes to color values
     * @param {number} i 
     * @param {Event} e 
     */
    onValue(i, type, e) {
        let {value} = e.currentTarget;
        // Ignore invalid colors
        if (type === 'color') {
            if (!/^#[a-f0-9]{6}$/i.test(value)) {
                return;
            }
        }
        else if (type === 'alpha') {
            value = parseFloat(value);
        }
        this.state[type][i].value = value;
        this.forceUpdate();
    }

    /**
     * Handle changes to stops
     * @param {number} i 
     * @param {Event} e 
     */
    onStop(i, type, value) {
        this.state[type][i].stop = value;
        this.forceUpdate();
    }

    /**
     * Remove a color or alpha
     */
    onRemove(i, type) {
        const arr = this.state[type];
        arr.splice(i, 1);
        this.onDeselect();
    }

    /**
     * Add a new color or alpha
     */
    onAdd(type, event) {
        event.stopPropagation();
        this.state[type].push({
            value: type === 'color' ? "#ffffff" : 1,
            stop: event.layerX / event.currentTarget.clientWidth
        });
        this.forceUpdate();
    }

    /**
     * Reverse the color and alpha
     */
    onReverse() {
        const {color, alpha} = this.state;
        color.forEach((item) => item.stop = 1 - item.stop);
        alpha.forEach((item) => item.stop = 1 - item.stop);
        this.redraw();
        this.forceUpdate();
    }

    /**
     * Set horizontal
     */
    onHorizontal(horizontal) {
        this.setState({ horizontal });
    }

    /**
     * Reset
     */
    onReset() {
        if (confirm('Do you want to reset to default?')) {
            localStorage.removeItem(App.SAVE_KEY);
            this.setState(this.defaultState);
        }
    }

    /**
     * Set the active element
     */
    onSelect(index, type) {
        const {active} = this.state;
        if (active && active.index === index && active.type === type) {
            this.onDeselect();
        }
        else {
            // If we select the color picker
            if (type === 'color') {
                this.colorpickerRef.value = this.state[type][index].value;
                this.colorpickerRef.click();
            }
            this.setState({ active: { index, type } });
        }
    }

    /**
     * Clear the selection
     */
    onDeselect() {
        this.setState({ active: null });
    }

    /**
     * Render
     */
    render(props, { width, height, color, alpha, active, horizontal }) {
        return h('main', { class: 'container' },
            h('div', { class: 'row py-4' }, [
                h('div', { class: 'col-sm-8 offset-sm-2'}, [
                    h('h2', { class: 'mb-2' },  [ h(Icon, {type: 'cog'}), 'Gradient']),
                    h('div', { class: 'd-flex mb-2' }, [
                        h('div', { class: 'input-group d-flex mr-1' }, [
                            h('div', { class: 'input-group-prepend' }, [
                                h('span', { class: 'input-group-text md' }, 'Width')
                            ]),
                            h('select', {
                                class: 'custom-select',
                                onChange: this.onWidth.bind(this)
                            }, App.SIZES.map((size) => {
                                return h('option', {
                                    value: size,
                                    selected: (size === width)
                                }, size);
                            }))
                        ]),
                        h('div', { class: 'input-group d-flex ml-1' }, [
                            h('div', { class: 'input-group-prepend' }, [
                                h('span', { class: 'input-group-text md' }, 'Height')
                            ]),
                            h('select', {
                                class: 'custom-select',
                                onChange: this.onHeight.bind(this)
                            }, App.SIZES.map((size) => {
                                return h('option', {
                                    value: size,
                                    selected: (size === height)
                                }, size);
                            }))
                        ])
                    ]),
                    h('div', { class: 'canvas-container checked bg-white rounded mb-2' }, [
                        h('div', { class: 'canvas-controls'}, [
                            h('button', {
                                class: `btn btn-sm btn-outline-secondary ${horizontal !== false ? 'active' : ''}`,
                                onClick: this.onHorizontal.bind(this, true)
                            }, h(Icon, {type: 'arrows-h', solo: true })),
                            h('button', {
                                class: `btn btn-sm btn-outline-secondary ${horizontal === false ? 'active' : '' }`,
                                onClick: this.onHorizontal.bind(this, false)
                            }, h(Icon, {type: 'arrows-v', solo: true })),
                            h('button', {
                                    class: 'btn btn-sm btn-outline-secondary',
                                    onClick: this.onReverse.bind(this)
                                },
                                h(Icon, { type: 'exchange', solo: true })
                            ),
                            h('button', {
                                    class: 'btn btn-sm btn-outline-secondary',
                                    onClick: this.onReset.bind(this)
                                },
                                h(Icon, {type: 'undo', solo: true })
                            )
                        ]),
                        h('canvas',{ ref: this.refCanvas.bind(this) })
                    ]),
                    h('div', { class: 'gradient-bar' }, [
                        h('canvas', {
                            ref: this.refPreview.bind(this),
                            class: 'gradient-bar-image checked rounded'
                        }),
                        h('div', {
                            class: 'swatch-container color',
                            onMouseDown: this.onAdd.bind(this, 'color') },
                            color.map((item, index) => h(GradientSwatch, {
                                value: item.value,
                                stop: item.stop,
                                type: 'color',
                                index,
                                onSelect: this.onSelect.bind(this),
                                onUpdate: this.onStop.bind(this),
                                onRemove: this.onRemove.bind(this)
                            }))
                        ),
                        h('div', {
                            class: 'swatch-container alpha',
                            onMouseDown: this.onAdd.bind(this, 'alpha') },
                            alpha.map((item, index) => h(GradientSwatch, {
                                value: item.value,
                                stop: item.stop,
                                type: 'alpha',
                                index,
                                onSelect: this.onSelect.bind(this),
                                onUpdate: this.onStop.bind(this),
                                onRemove: this.onRemove.bind(this)
                            }))
                        )
                    ]),
                    h('input', {
                        ref: (input) => {
                            this.colorpickerRef = input;
                        },
                        type: 'color',
                        class: 'colorpicker invisible',
                        value: active && active.type === 'color' ? color[active.index].value : '#ffffff',
                        onInput: active && active.type === 'color' ? this.onValue.bind(this, active.index, active.type) : null
                    }),
                    (active && active.type === 'alpha' && h('div', { class: 'border rounded p-2 bg-white mx-auto w-50'}, [
                        h('button', {
                            class: 'btn btn-sm small close mb-2',
                            onClick: this.onDeselect.bind(this)
                        }, h('small', null, h(Icon, {type: 'close'}))),
                        h('div', { class: 'input-group d-flex mb-2' }, [
                            h('div', { class: 'input-group-prepend' }, [
                                h('span', { class: 'input-group-text sm' }, 'Alpha')
                            ]),
                            h('input', {
                                type: 'range',
                                step: 0.01,
                                min: 0,
                                max: 1,
                                class: 'custom-range range bg-white rounded-right border px-2',
                                value: alpha[active.index].value,
                                onInput: this.onValue.bind(this, active.index, active.type)
                            }),
                            h('div', { class: 'input-group-append' }, [
                                h('span', { class: 'input-group-text sm' }, alpha[active.index].value.toPrecision(2))
                            ])
                        ])
                    ]))
                ])
            ]),
            h('div', { class: 'row'}, [
                h('div', { class: 'col-sm-4 offset-sm-2' },
                    h(Output, {
                        icon: 'image',
                        title: 'Image',
                        ref: (ref) => {
                            this.imageRef = ref;
                        }
                    })
                ),
                h('div', { class: 'col-sm-4' },
                    h(Output, {
                        icon: 'code',
                        title: 'Steps',
                        ref: (ref) => {
                            this.stepsRef = ref;
                        }
                    })
                )
            ])
        );
    }
}

/**
 * Output textarea with a copy button
 * @class
 */
class Output extends Component {
    constructor(props) {
        super(props);
        this.state = { value: '' };
    }

    /**
     * Copy to clipboard
     * @param {string} text - Text to copy
     */
    copy() {
        const temp = document.createElement('textarea');
        document.body.appendChild(temp);
        temp.innerHTML = this.state.value;
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
    }

    render({ icon, title }, { value }) {
        return h('div', null, [
            h('button', {
                class: 'btn btn-sm btn-secondary float-right',
                onClick: this.copy.bind(this)
            }, h(Icon, { type: 'clipboard', solo: true })),
            h('h2', { class: 'mb-2' }, [ h(Icon, {type: icon }), title ]),
            h('textarea', {
                class: 'form-control code-output',
                spellcheck: false,
                onClick: (event) => {
                    event.target.focus();
                    event.target.select();
                }
            }, value)
        ]);
    }
}

/**
 * Either a gradient color or alpha swatc
 * @class
 */
class GradientSwatch extends Component {
    constructor(props) {
        super(props);
        this.startX = 0;
        this.startTime = 0;
        this.startLeft = 0;
        this.onMove = this.onMove.bind(this);
        this.onRelease = this.onRelease.bind(this);
        this.onDown = this.onDown.bind(this);
    }

    componentWillUnmount() {
        this.stopDrag();
    }

    stopDrag() {
        window.removeEventListener('mousemove', this.onMove);
        window.removeEventListener('mouseup', this.onRelease);
    }

    /**
     * When the mouse is pressed
     * @param {MouseEvent} event
     */
    onDown(event) {
        event.stopPropagation();
        this.startTime = performance.now();
        this.startX = event.clientX;
        this.startLeft = this.base.offsetLeft;
        this.stopDrag();
        window.addEventListener('mousemove', this.onMove);
        window.addEventListener('mouseup', this.onRelease);
    }

    /**
     * When the mouse is released
     * @param {MouseEvent} event
     */
    onRelease(event) {
        event.stopPropagation();
        this.stopDrag();
        // Check for clicks
        if (performance.now() - this.startTime < GradientSwatch.CLICK_TIME) {
            const {onSelect, index, type} = this.props;
            onSelect(index, type);
        }
        else if (this.isRemovable(event.clientY)) {
            const {onRemove, index, type} = this.props;
            onRemove(index, type);
        }
    }

    /**
     * Check to see if a swatch is removable based on the y position
     * @param {number} y - Client X position
     * @return {boolean} `true` if can be removed
     */
    isRemovable(y) {
        const parent = this.base.parentNode;
        const bounds = parent.getBoundingClientRect();
        const buffer = GradientSwatch.DELETE_BUFFER;
        return (this.isColor && y > bounds.bottom + buffer)
            || (!this.isColor && y < bounds.top - buffer);
    }

    /**
     * Drag
     */
    onMove(event) {
        const totalWidth = this.base.parentNode.clientWidth;
        const deltaX = event.clientX - this.startX;
        const value = Math.min(1, Math.max(0, (this.startLeft + deltaX) / totalWidth));
        this.base.style.left = `${value*100}%`;
        const {onUpdate, index, type} = this.props;
        onUpdate(index, type, value);
        this.base.style.opacity = this.isRemovable(event.clientY) ? 0.5 : 1;
    }

    /**
     * @member {boolean}
     * @readonly
     */
    get isColor() {
        return this.props.type === 'color';
    }

    render({ stop, value, type }) {
        const style = this.isColor ? `background:${value}` : `opacity:${value}`;
        return h('div', {
                onMouseDown: this.onDown,
                onMouseUp: this.onRelease,
                class: `swatch swatch-${type} rounded`,
                style: `left:${stop*100}%`
            },
            h('span', { class: 'swatch-badge', style })
        );
    }

    /**
     * The min time consider to be click
     * @static
     */
    static get CLICK_TIME() {
        return 200;
    }

    /**
     * The number of pixels to be considered a delete
     * @static
     */
    static get DELETE_BUFFER() {
        return 10;
    }
}

/**
 * The collection of sizes, using POT
 * @static
 */
App.SIZES = [1,2,4,8,16,32,64,128,256,512];

/**
 * The default size applied to width and height
 * @static
 */
App.DEFAULT_SIZE = 128;

/**
 * LocalStorage key
 */
App.SAVE_KEY = 'gradient-save';

// Render application
render(h(App), document.body);
