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

        const gradient = localStorage.getItem(App.SAVE_KEY);
        if (gradient) {
            this.state = JSON.parse(gradient);
            this.state.active = null;
        }
        else {
            this.state = this.defaultState;
        }

        if (this.state.format === undefined) {
            this.state.format = App.FORMATS.UINT;
        }
    }

    /**
     * Get the default state
     * @member {object}
     */
    get defaultState() {
        return {
            format: App.FORMATS.UINT,
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
            alphaChannel.addColorStop(stop, `rgba(255,255,255,${(1 - value)})`);
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

        const {width, height, horizontal, color, alpha, format} = this.state;
        const ctx = this.redrawCanvas(this.canvas, color, alpha, horizontal);
        const src = this.canvas.toDataURL();
        
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
            if (format === App.FORMATS.UINT) {
                steps.push('0x' + this.num2hex(r) + this.num2hex(g) + this.num2hex(b) + this.num2hex(a));
            }
            else if (format === App.FORMATS.HEX) {
                steps.push(`'#${this.num2hex(r) + this.num2hex(g) + this.num2hex(b) + this.num2hex(a)}'`);
            }
            else if (format === App.FORMATS.ARRAY) {
                steps.push(`[${r},${g},${b},${a}]`);
            }
            else if (format === App.FORMATS.CSS) {
                steps.push(`'rgba(${r},${g},${b},${a})'`);
            }
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
     * Handle changes to color values and alpha values for active.
     * @param {number} i 
     * @param {Event} e 
     */
    onValue(value) {
        const {index, type} = this.state.active;
        // Ignore invalid colors
        if (type === 'color') {
            if (!/^#[a-f0-9]{6}$/i.test(value)) {
                return;
            }
        }
        else if (type === 'alpha') {
            value = parseFloat(value);
        }
        this.state[type][index].value = value;
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
        const index = this.state[type].length - 1;
        this.setState({ active: { type, index }});
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
     * Update the format for the code output
     * @param {App.FORMATS} format
     */
    onFormat(format) {
        this.setState({ format });
    }

    /**
     * Set the active element
     */
    onSelect(index, type) {
        this.setState({ active: { index, type } });
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
    render(props, { width, height, color, alpha, active, horizontal, format }) {
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
                    h('div', { class: 'gradient-bar mb-2' }, [
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
                    (active && active.type === 'color' && h('div', { class: 'control-color border rounded p-2 bg-white mx-auto' }, [
                        h('button', {
                            class: 'btn btn-sm small close mb-2',
                            onClick: this.onDeselect.bind(this)
                        }, h('small', null, h(Icon, {type: 'close'}))),
                        h(ColorPicker, {
                            id: active.type + active.index,
                            color: color[active.index].value,
                            onUpdate: this.onValue.bind(this)
                        })
                    ])),
                    (active && active.type === 'alpha' && h('div', { class: 'control-alpha border rounded p-2 bg-white'}, [
                        h('button', {
                            class: 'btn btn-sm small close mb-2',
                            onClick: this.onDeselect.bind(this)
                        }, h('small', null, h(Icon, {type: 'close'}))),
                        h('div', { class: ' mx-auto w-50' },
                            h('div', { class: 'input-group d-flex' }, [
                                h('input', {
                                    type: 'range',
                                    step: 0.01,
                                    min: 0,
                                    max: 1,
                                    class: 'custom-range range bg-white rounded-right border px-2',
                                    value: alpha[active.index].value,
                                    onInput: (event) => {
                                        this.onValue(event.target.value);
                                    }
                                }),
                                h('div', { class: 'input-group-append' }, [
                                    h('span', { class: 'input-group-text sm' }, alpha[active.index].value.toPrecision(2))
                                ])
                            ])
                        )
                    ]))
                ])
            ]),
            h('div', { class: 'row'}, [
                h('div', { class: 'col-sm-4 offset-sm-2 mb-4' },
                    h(Output, {
                        icon: 'image',
                        title: 'Image',
                        ref: (ref) => {
                            this.imageRef = ref;
                        }
                    })
                ),
                h('div', { class: 'col-sm-4 mb-4' },
                    h(Output, {
                        icon: 'code',
                        title: 'Steps',
                        badge: horizontal !== false ? width : height,
                        ref: (ref) => {
                            this.stepsRef = ref;
                        }
                    }, [
                        h('div', { class: 'text-center pt-2' },
                            h('div', { class: 'btn-group'}, [
                                h(FormatButton, {
                                    onClick: this.onFormat.bind(this, App.FORMATS.UINT),
                                    active: format === App.FORMATS.UINT
                                }, 'Uint'),
                                h(FormatButton, {
                                    onClick: this.onFormat.bind(this, App.FORMATS.HEX),
                                    active: format === App.FORMATS.HEX
                                }, 'Hex'),
                                h(FormatButton, {
                                    onClick: this.onFormat.bind(this, App.FORMATS.ARRAY),
                                    active: format === App.FORMATS.ARRAY
                                }, 'Array'),
                                h(FormatButton, {
                                    onClick: this.onFormat.bind(this, App.FORMATS.CSS),
                                    active: format === App.FORMATS.CSS
                                }, 'CSS')
                            ])
                        )
                    ])
                )
            ])
        );
    }
}

/**
 * Code formats
 *
 */
App.FORMATS = {
    UINT: 0,
    HEX: 1,
    ARRAY: 2,
    CSS: 3
};

class FormatButton extends Component {
    render({ active, onClick, children }) {
        return h('button', {
            onClick,
            class: `btn btn-sm btn${active ? '' : '-outline'}-secondary px-2 py-0`},
            h('small', null, children)
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

    render({ icon, title, badge, children }, { value }) {
        return h('div', null, [
            h('button', {
                class: 'btn btn-sm btn-secondary float-right',
                onClick: this.copy.bind(this)
            }, h(Icon, { type: 'clipboard', solo: true })),
            h('h2', { class: 'mb-2' }, [
                h(Icon, {type: icon }),
                title,
                (badge && h('span', { class: 'badge badge-pill badge-sm badge-secondary ml-2' }, badge))
            ]),
            h('textarea', {
                class: 'form-control code-output',
                spellcheck: false,
                onClick: (event) => {
                    event.target.focus();
                    event.target.select();
                }
            }, value)
        ].concat(children));
    }
}

/**
 * Component for selecting color
 * @class
 */
class ColorPicker extends Component {
    constructor(props){
        super(props);

        /**
         * The target being dragged
         * @member {HTMLElement}
         */
        this.target = null;

        /**
         * Starting color
         */
        this.initColor = props.color;

        /**
         * ID of the original
         */
        this.id = props.id;

        // Reset the state
        this.reset(props.color, false);

        // Bind functions
        this.stopSaturation = this.stopSaturation.bind(this);
        this.updateSaturation = this.updateSaturation.bind(this);
        this.stopHue = this.stopHue.bind(this);
        this.updateHue = this.updateHue.bind(this);
    }

    componentDidUpdate() {
        const {id, color} = this.props;
        if (id !== this.id) {
            this.initColor = color;
            this.id = id;
            this.reset(color, false);
            this.forceUpdate();
        }
    }

    /**
     * Convert hex string #ffffff to hsv values
     * @param {string} hexString
     * @return {number[]}
     */
    hexToHsv(hexString) {
        let hex = parseInt(hexString.substr(1), 16);
        let r = ((hex >> 16) & 0xFF) / 255;
        let g = ((hex >> 8) & 0xFF) / 255;
        let b = (hex & 0xFF) / 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        let d = max - min;
        s = max == 0 ? 0 : d / max;

        if (max == min) {
            h = 0; // achromatic
        }
        else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [ h, s, v ];
    }

    /**
     * Convert HSV values to hex string
     * @param {number[]} hsv
     * @return {string} Color as #ffffff
     */
    hsvToHex(h, s, v){
        let r, g, b;
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        let hex = (((r * 255) << 16) + ((g * 255) << 8) + (b * 255 | 0));
        hex = hex.toString(16);
        hex = '000000'.substr(0, 6 - hex.length) + hex;
        return `#${hex}`;
    }

    /**
     * Update the saturation
     */
    startSaturation(event) {
        this.target = event.currentTarget;
        this.updateSaturation(event);
        window.addEventListener('pointermove', this.updateSaturation);
        window.addEventListener('pointerup', this.stopSaturation);
    }

    /**
     * Stop setting the saturation
     */
    stopSaturation(event) {
        event.stopPropagation();
        window.removeEventListener('pointerup', this.stopSaturation);
        window.removeEventListener('pointermove', this.updateSaturation);
        this.target = null;
    }

    /**
     * Clamp value from 0 to 1
     * @param {number} val
     * @return {number}
     */
    clamp(val) {
        return Math.min(1, Math.max(0, val));
    }

    /**
     * Update the saturation
     * @param {Event} event
     */
    updateSaturation(event) {
        event.stopPropagation();
        const {left, top} = this.target.getBoundingClientRect();
        const saturation = this.clamp((event.clientX - left) / this.target.clientWidth);
        const value = 1 - this.clamp((event.clientY - top) / this.target.clientHeight);
        const { hue } = this.state;
        const hex = this.hsvToHex(hue, saturation, value);
        this.update(hex);
        this.setState({
            hex,
            value,
            saturation
        });
    }

    /**
     * Handle hue changes
     */
    startHue(event) {
        this.target = event.currentTarget;
        this.updateHue(event);
        window.addEventListener('pointerup', this.stopHue);
        window.addEventListener('pointermove', this.updateHue);
    }

    /**
     * Stop setting the saturation
     */
    stopHue(event) {
        event.stopPropagation();
        window.removeEventListener('pointerup', this.stopHue);
        window.removeEventListener('pointermove', this.updateHue);
        this.target = null;
    }

    /**
     * Update the hue
     * @param {Event} event
     */
    updateHue(event) {
        event.stopPropagation();
        const {top} = this.target.getBoundingClientRect();
        const hue = 1 - this.clamp((event.clientY - top) / this.target.clientHeight);
        const { value, saturation } = this.state;
        const hueHex = this.hsvToHex(hue, 1, 1);
        const hex = this.hsvToHex(hue, saturation, value);
        this.update(hex);
        this.setState({
            hex,
            hue,
            hueHex
        });
    }

    /**
     * Internally update the
     */
    update(hex) {
        // Limit the spamming of updates when we are dragging
        if (this.state.hex !== hex) {
            this.props.onUpdate(hex);
        }
    }

    /**
     * Revert to the original color
     */
    reset(hex, update) {
        const [ hue, saturation, value ] = this.hexToHsv(hex);
        const hueHex = this.hsvToHex(hue, 1, 1);
        const state = {
            hex,
            hue,
            hueHex,
            saturation,
            value
        };
        if (update !== false) {
            this.update(hex);
            this.setState(state);
        }
        else {
            this.state = state;
        }
    }

    /**
     * Reset to the original color
     */
    onReset() {
        this.reset(this.initColor);
        this.forceUpdate();
    }

    /**
     * Handle manual text input
     */
    onInput(event) {
        const hex = event.currentTarget.value;
        // don't do anything if not a valid color
        if (!/^#[a-f0-9]{6}$/i.test(hex)) {
            return;
        }
        this.reset(hex);
    }

    render({ color }, { hex, hue, hueHex, saturation, value }) {
        return h('div', { class: 'colorpicker mx-auto rounded' }, [
            h('div', {
                class: 'colorpicker-saturation',
                style: `background-color:${hueHex}`,
                onPointerDown: this.startSaturation.bind(this) },
                h('div', {
                    class: 'colorpicker-saturation-guide',
                    style: `top:${(1 - value) * 100}%;left:${saturation * 100}%`
                })
            ),
            h('div', {
                class: 'colorpicker-hue',
                onPointerDown: this.startHue.bind(this) },
                h('div', {
                    class: 'colorpicker-hue-guide',
                    style: `top:${(1 - hue)*100}%`
                })
            ),
            h('div', {
                class: 'colorpicker-previous',
                style: `background:${this.initColor}`,
                onClick: this.onReset.bind(this)
            }),
            h('div', {
                class: 'colorpicker-current',
                style: `background:${hex}`
            }),
            h('input', {
                class: 'form-control form-control-sm colorpicker-output',
                value: hex,
                onInput: this.onInput.bind(this)
            })
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
        this.select();
    }

    select() {
        const {onSelect, index, type} = this.props;
        onSelect(index, type);
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
            this.select();
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
