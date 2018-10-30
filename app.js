// Import preact component
const {Component, render, h} = preact;

/**
 * Wrapper for font awesome icons
 * @class
 */
class Icon extends Component {
    render({type}) {
        return h('i', { class: `fa fa-${type} mr-2` });
    }
}

/**
 * Main application point
 * @class
 */
class App extends Component {
    constructor(props) {
        super(props);
        this.canvas = null;
        this.ctx = null;
        this.codeOutput = null;
        this.imageOutput = null;

        const gradient = localStorage.getItem('gradient');
        if (gradient) {
            this.state = JSON.parse(gradient);
        }
        else {
            this.state = {
                width: App.DEFAULT_SIZE,
                height: App.DEFAULT_SIZE,
                colors: [
                    {
                        color: "#ffffff",
                        alpha: 1,
                        stop: 0
                    },
                    {
                        color: "#000000",
                        alpha: 1,
                        stop: 1
                    }
                ]
            };
        }
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
        this.ctx = canvas.getContext('2d', {
            antialias: true,
            preserveDrawingBuffer: true
        });
    }

    refCode(codeOutput) {
        this.codeOutput = codeOutput;
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
        localStorage.setItem('gradient', JSON.stringify(this.state));
    }

    /**
     * Re-render the gradient
     */
    redraw() {
        const {width, height, colors} = this.state;
        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        colors.forEach(({stop, color, alpha}) => {
            if (alpha === 1) {
                gradient.addColorStop(stop, color);
            }
            else {
                gradient.addColorStop(stop, this.hex2rgba(color, alpha));
            }
        });
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
        this.imageOutput.innerHTML = this.canvas.toDataURL('image/png');
        this.codeOutput.innerHTML = JSON.stringify(colors, null, '  ');
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
    onColor(i, e) {
        const {value} = e.currentTarget;
        // Ignore invalid colors
        if (!/^#[a-f0-9]{6}$/i.test(value)) {
            return;
        }
        console.log(value);
        this.state.colors[i].color = e.currentTarget.value;
        this.forceUpdate();
    }

    /**
     * Handle changes to alphas
     * @param {number} i 
     * @param {Event} e 
     */
    onAlpha(i, e) {
        this.state.colors[i].alpha = parseFloat(e.currentTarget.value);
        this.forceUpdate();
    }

    /**
     * Handle changes to stops
     * @param {number} i 
     * @param {Event} e 
     */
    onStop(i, e) {
        this.state.colors[i].stop = parseFloat(e.currentTarget.value);
        this.forceUpdate();
    }

    /**
     * Remove a color
     */
    onRemove(i) {
        const colors = this.state.colors;
        colors.splice(i, 1);
        this.setState({ colors });
    }

    /**
     * Add a new color
     */
    onAdd() {
        this.state.colors.push({
            color: "#ffffff",
            alpha: 1,
            stop: 1
        });
        this.forceUpdate();
    }

    /**
     * Reverse the colors
     */
    onReverse() {
        this.state.colors.forEach((item) => {
            item.stop = 1 - item.stop;
        });
        this.redraw();
        this.forceUpdate();
    }

    /**
     * Render
     */
    render(props, { width, height, colors }) {
        return h('main', { class: 'container' },
            h('div', { class: 'row py-4' }, [
                h('div', { class: 'col-sm-8'}, [
                    h('h2', { class: 'mb-2' },  [ h(Icon, {type: 'cog'}), 'Gradient']),
                    h('div', { class: 'd-flex mb-2' }, [
                        h('div', { class: 'input-group d-flex mr-1' }, [
                            h('div', { class: 'input-group-prepend' }, [
                                h('span', { class: 'input-group-text' }, 'Width')
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
                                h('span', { class: 'input-group-text' }, 'Height')
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
                    h('div', { class: 'canvas-container bg-white rounded mb-2' },
                        h('canvas',{ ref: this.refCanvas.bind(this) })
                    )
                ].concat(colors.map((item, i) => {
                    return h('div', { class: 'color-item border bg-white rounded p-3 mb-2'}, [
                        h('div', { class: 'text-right '},
                            h('button', {
                                class: 'btn close mb-2',
                                onClick: this.onRemove.bind(this, i)
                            }, '×')
                        ),
                        h('div', { class: 'input-group d-flex mb-2' }, [
                            h('div', { class: 'input-group-prepend' }, [
                                h('span', { class: 'input-group-text' }, 'Color')
                            ]),
                            h('input', {
                                type: 'color',
                                class: 'form-control colorpicker',
                                value: item.color,
                                onInput: this.onColor.bind(this, i)
                            })
                        ]),
                        h('div', { class: 'input-group d-flex mb-2' }, [
                            h('div', { class: 'input-group-prepend' }, [
                                h('span', { class: 'input-group-text' }, 'Alpha')
                            ]),
                            h('input', {
                                type: 'range',
                                step: 0.01,
                                min: 0,
                                max: 1,
                                class: 'custom-range range bg-white rounded-right border px-2',
                                value: item.alpha,
                                onInput: this.onAlpha.bind(this, i)
                            }),
                            h('div', { class: 'input-group-append' }, [
                                h('span', { class: 'input-group-text' }, item.alpha.toPrecision(2))
                            ])
                        ]),
                        h('div', { class: 'input-group d-flex' }, [
                            h('div', { class: 'input-group-prepend' }, [
                                h('span', { class: 'input-group-text' }, 'Stop')
                            ]),
                            h('input', {
                                type: 'range',
                                step: 0.01,
                                min: 0,
                                max: 1,
                                class: 'custom-range range bg-white rounded-right border px-2',
                                value: item.stop,
                                onInput: this.onStop.bind(this, i)
                            }),
                            h('div', { class: 'input-group-append' }, [
                                h('span', { class: 'input-group-text' }, item.stop.toPrecision(2))
                            ])
                        ])
                    ]);
                })), [
                    h('div', { class: 'text-center mb-4' }, [
                        h('button', {
                            class: 'btn btn-primary mr-2',
                            onClick: this.onAdd.bind(this)
                        }, [h(Icon, { type: 'plus' }), 'Add Color']),
                        h('button', {
                            class: 'btn btn-primary',
                            onClick: this.onReverse.bind(this)
                        }, [h(Icon, { type: 'sort' }), 'Reverse'])
                    ])
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
                    h('hr'),
                    h('button', {
                        class: 'btn btn-sm btn-secondary float-right',
                        onClick: () => {
                            this.copy(this.codeOutput.innerHTML);
                        }
                    }, [h(Icon, { type: 'clipboard' }),'Copy']),
                    h('h2', { class: 'mb-2' }, [ h(Icon, {type: 'code'}), 'Code' ]),
                    h('code', {
                        class: 'code-output d-block border bg-white rounded p-2',
                        ref: this.refCode.bind(this)
                    })
                ])
            ])
        );
    }
}

/**
 * The collection of sizes, using POT
 * @static
 */
App.SIZES = [4,8,16,32,64,128,256,512];

/**
 * The default size applied to width and height
 * @static
 */
App.DEFAULT_SIZE = 128;

render(h(App), document.body);