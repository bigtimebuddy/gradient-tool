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
         * Render context
         * @member {Context2dRenderingContext}
         */
        this.ctx = null;

        /**
         * Code container output
         * @member {HTMLElement}
         */
        this.codeOutput = null;

        /**
         * Textarea output
         * @member {HTMLElement}
         */
        this.imageOutput = null;

        /**
         * Textarea output
         * @member {HTMLElement}
         */
        this.stepsOutput = null;

        /**
         * Image preview
         * @member {HTMLImageElement}
         */
        this.preview = null;

        const gradient = localStorage.getItem(App.SAVE_KEY);
        if (gradient) {
            this.state = JSON.parse(gradient);
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
        this.canvas = canvas;
        canvas.width = this.state.width;
        canvas.height = this.state.height;
        this.ctx = canvas.getContext('2d');
    }

    refPreview(preview) {
        this.preview = preview;
    }

    refCode(codeOutput) {
        this.codeOutput = codeOutput;
    }

    refSteps(stepsOutput) {
        this.stepsOutput = stepsOutput;
    }

    /**
     * Handle the ref output
     */
    refImage(imageOutput) {
        this.imageOutput = imageOutput;
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
     * Re-render the gradient
     */
    redraw() {
        if (!this.ctx) {
            return;
        }
        const {width, height, color, alpha, horizontal} = this.state;
        let colorChannel, alphaChannel;
        if (horizontal !== false) {
            colorChannel = this.ctx.createLinearGradient(0, 0, width, 0);
            alphaChannel = this.ctx.createLinearGradient(0, 0, width, 0);
        }
        else {
            colorChannel = this.ctx.createLinearGradient(0, 0, 0, height);
            alphaChannel = this.ctx.createLinearGradient(0, 0, 0, height);
        }

        this.ctx.clearRect(0, 0, width, height);
        this.ctx.globalCompositeOperation = 'source-out';

        alpha.forEach(({stop, value}) => {
            alphaChannel.addColorStop(stop, `rgba(100%,100%,100%,${(1 - value)*100}%)`);
        });
        this.ctx.fillStyle = alphaChannel;
        this.ctx.fillRect(0, 0, width, height);

        color.forEach(({stop, value}) => {
            colorChannel.addColorStop(stop, value);
        });
        this.ctx.fillStyle = colorChannel;
        this.ctx.fillRect(0, 0, width, height);

        const src = this.canvas.toDataURL('image/png');
        // this.preview.src = src;

        this.preview.width = width;
        this.preview.height = height;

        const context = this.preview.getContext('2d');
        context.drawImage(this.canvas, 0, 0);

        let imageData;
        if (horizontal !== false) {
            imageData = this.ctx.getImageData(0, 0, width, 1);
        }
        else {
            imageData = this.ctx.getImageData(0, 0, 1, height);
        }
        
        // Calculate the steps at hex numbers
        const steps = [];
        for (let i = 0; i < imageData.data.length / 4; i++) {
            const r = imageData.data[(i*4)];
            const g = imageData.data[(i*4)+1];
            const b = imageData.data[(i*4)+2];
            const a = imageData.data[(i*4)+3];
            steps.push('0x' + this.num2hex(r) + this.num2hex(g) + this.num2hex(b) + this.num2hex(a));
        }

        this.stepsOutput.innerHTML = `[\n  ${steps.join(',\n  ')} \n]`;
        this.imageOutput.innerHTML = src;
        this.codeOutput.innerHTML = this.toDataString();
    }

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
     * Convert color to RGB string
     * @param {string} hex - e.g. #ff00ff
     * @param {number} alpha
     * @return {string} e.g. rgba(255, 0, 255, 0.5)
     */
    hex2rgba(hex, alpha) {
        hex = parseInt(hex.replace('#', ''), 16);
        const r = ((hex >> 16) & 0xFF);
        const g = ((hex >> 8) & 0xFF);
        const b = (hex & 0xFF);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Copy to clipboard
     * @param {string} text - Text to copy
     */
    copy(text) {
        const temp = document.createElement('textarea');
        document.body.appendChild(temp);
        temp.innerHTML = text;
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
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
    onStop(i, type, e) {
        this.state[type][i].stop = parseFloat(e.currentTarget.value);
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
    onAdd(type) {
        this.state[type].push({
            value: type === 'color' ? "#ffffff" : 1,
            stop: 1
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
            this.setState(this.defaultState);
        }
    }

    /**
     * Set the active element
     */
    onSelect(index, type) {
        const active = { index, type };
        this.setState({ active });
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
                h('div', { class: 'col-sm-8'}, [
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
                            // h('button', {
                            //     class: `btn btn-sm btn-outline-secondary ${horizontal !== false ? 'active' : ''}`,
                            //     onClick: this.onHorizontal.bind(this, true)
                            // }, h(Icon, {type: 'arrows-h', solo: true })),
                            // h('button', {
                            //     class: `btn btn-sm btn-outline-secondary ${horizontal === false ? 'active' : '' }`,
                            //     onClick: this.onHorizontal.bind(this, false)
                            // }, h(Icon, {type: 'arrows-v', solo: true })),
                            h('button', { class: 'btn btn-sm btn-outline-secondary', onClick: this.onReset.bind(this) }, h(Icon, {type: 'refresh', solo: true }))
                        ]),
                        h('canvas',{ ref: this.refCanvas.bind(this) })
                    ]),
                    h('div', { class: 'gradient-bar' }, [
                        h('canvas', {
                            ref: this.refPreview.bind(this),
                            class: 'gradient-bar-image checked border border-secondary rounded'
                        }),
                        h('div', null, color.map((item, i) =>
                            h('div', {
                                    onClick: () => {
                                        this.onSelect(i, 'color');
                                    },
                                    class: 'swatch swatch-color rounded',
                                    style: `left:${item.stop*100}%`
                                },
                                h('span', { class: 'swatch-badge', style: `background:${item.value}`})
                            )
                        )),
                        h('div', null, alpha.map((item, i) =>
                            h('div', {
                                    onClick: () => {
                                        this.onSelect(i, 'alpha');
                                    },
                                    class: 'swatch swatch-alpha rounded',
                                    style: `left:${item.stop*100}%`
                                },
                                h('span', { class: 'swatch-badge' })
                            )
                        ))
                    ]),
                    (active && h('div', { class: 'border rounded p-2 my-2 bg-white mx-auto w-50'}, [
                        h('button', {
                            class: 'btn btn-sm small close mb-2',
                            onClick: this.onDeselect.bind(this)
                        }, h('small', null, h(Icon, {type: 'close'}))),
                        (active.type === 'color' && h('div', null, [
                            h('div', { class: 'input-group d-flex mb-2' }, [
                                h('input', {
                                    type: 'color',
                                    class: 'form-control colorpicker',
                                    value: color[active.index].value,
                                    onInput: this.onValue.bind(this, active.index, active.type)
                                })
                            ]),
                            h('div', { class: 'input-group d-flex mb-2' }, [
                                h('input', {
                                    type: 'range',
                                    step: 0.01,
                                    min: 0,
                                    max: 1,
                                    class: 'custom-range range bg-white rounded-right border px-2',
                                    value: color[active.index].stop,
                                    onInput: this.onStop.bind(this, active.index, active.type)
                                }),
                                h('div', { class: 'input-group-append' }, [
                                    h('span', { class: 'input-group-text sm' }, color[active.index].stop.toPrecision(2))
                                ])
                            ])
                        ])),
                        (active.type === 'alpha' && h('div', null, [
                            h('div', { class: 'input-group d-flex mb-2' }, [
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
                            ]),
                            h('div', { class: 'input-group d-flex mb-2' }, [
                                h('input', {
                                    type: 'range',
                                    step: 0.01,
                                    min: 0,
                                    max: 1,
                                    class: 'custom-range range bg-white rounded-right border px-2',
                                    value: alpha[active.index].stop,
                                    onInput: this.onStop.bind(this, active.index, active.type)
                                }),
                                h('div', { class: 'input-group-append' }, [
                                    h('span', { class: 'input-group-text sm' }, alpha[active.index].stop.toPrecision(2))
                                ])
                            ])
                        ])),
                        h('div', { class: 'text-center'},
                            h('button', {
                                class: 'btn btn-outline-danger btn-block btn-sm',
                                onClick: this.onRemove.bind(this, active.index, active.type)
                            }, [h(Icon, {type: 'trash'}), 'Remove'])
                        )
                    ])),
                    h('div', { class: 'text-center mb-4' }, [
                        h('button', {
                            class: 'btn btn-primary mr-2',
                            onClick: this.onAdd.bind(this, 'color')
                        }, [h(Icon, { type: 'plus' }), 'Add Color']),
                        h('button', {
                            class: 'btn btn-primary mr-2',
                            onClick: this.onAdd.bind(this, 'alpha')
                        }, [h(Icon, { type: 'plus' }), 'Add Alpha']),
                        h('button', {
                            class: 'btn btn-primary',
                            onClick: this.onReverse.bind(this)
                        }, [h(Icon, { type: 'sort' }), 'Reverse'])
                    ]),
                ]),
                h('div', { class: 'col-sm-4'}, [
                    h('button', {
                        class: 'btn btn-sm btn-secondary float-right',
                        onClick: () => {
                            this.copy(this.imageOutput.innerHTML);
                        }
                    }, [h(Icon, {type: 'clipboard' }),'Copy']),
                    h('h2', { class: 'mb-2' }, [ h(Icon, {type: 'image'}), 'Image']),
                    h('textarea', {
                        spellcheck: false,
                        class: 'form-control output mb-4',
                        ref: this.refImage.bind(this)
                    }),
                    h('button', {
                        class: 'btn btn-sm btn-secondary float-right',
                        onClick: () => {
                            this.copy(this.codeOutput.innerHTML);
                        }
                    }, [h(Icon, { type: 'clipboard' }),'Copy']),
                    h('h2', { class: 'mb-2' }, [ h(Icon, {type: 'code'}), 'Code' ]),
                    h('textarea', {
                        class: 'form-control code-output mb-4',
                        ref: this.refCode.bind(this)
                    }),
                    h('button', {
                        class: 'btn btn-sm btn-secondary float-right',
                        onClick: () => {
                            this.copy(this.stepsOutput.innerHTML);
                        }
                    }, [h(Icon, { type: 'clipboard' }),'Copy']),
                    h('h2', { class: 'mb-2' }, [ h(Icon, {type: 'code'}), 'Steps' ]),
                    h('textarea', {
                        class: 'form-control code-output',
                        ref: this.refSteps.bind(this)
                    }),
                ])
            ])
        );
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
