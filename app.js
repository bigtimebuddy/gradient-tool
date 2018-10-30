// Import preact component
const {Component, render, h} = preact;

/**
 * Main application point
 * 
 */
class App extends Component {
    constructor(props) {
        super(props);
        this.canvas = null;
        this.ctx = null;
        this.codeOutput = null;
        this.imageOutput = null;
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

    onColor(i, e) {
        const {value} = e.currentTarget;
        if (!/^#[a-f0-9]{6}$/i.test(value)) {
            return;
        }
        console.log(value);
        this.state.colors[i].color = e.currentTarget.value;
        this.forceUpdate();
    }

    onAlpha(i, e) {
        this.state.colors[i].alpha = parseFloat(e.currentTarget.value);
        this.forceUpdate();
    }

    onStop(i, e) {
        this.state.colors[i].stop = parseFloat(e.currentTarget.value);
        this.forceUpdate();
    }

    onRemove(i) {
        const colors = this.state.colors;
        colors.splice(i, 1);
        this.setState({ colors });
    }

    onAdd() {
        this.state.colors.push({
            color: "#ffffff",
            alpha: 1,
            stop: 1
        });
        this.forceUpdate();
    }

    /**
     * Render
     */
    render(props, { width, height, colors }) {
        return h('main', { class: 'container' },
            h('div', { class: 'row py-4' }, [
                h('div', { class: 'col-sm-8'}, [
                    h('h2', { class: 'mb-2' }, 'Preview'),
                    h('div', { class: 'input-group d-flex mb-2' }, [
                        h('div', { class: 'input-group-prepend w-50' }, [
                            h('span', { class: 'input-group-text w-100' }, 'Width')
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
                    h('div', { class: 'input-group d-flex mb-2' }, [
                        h('div', { class: 'input-group-prepend w-50' }, [
                            h('span', { class: 'input-group-text w-100' }, 'Height')
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
                    ]),
                    h('div', { class: 'canvas-container bg-white rounded mb-2' },
                        h('canvas',{ ref: this.refCanvas.bind(this) })
                    )
                ].concat(colors.map((item, i) => {
                    return h('div', { class: 'color-item border bg-white rounded p-3 mb-4'}, [
                        h('div', { class: 'text-right '},
                            h('button', {
                                class: 'btn close mb-2',
                                onClick: this.onRemove.bind(this, i)
                            }, '×')
                        ),
                        h('div', { class: 'input-group d-flex mb-2' }, [
                            h('div', { class: 'input-group-prepend w-50' }, [
                                h('span', { class: 'input-group-text w-100' }, 'Color')
                            ]),
                            h('input', {
                                type: 'color',
                                class: 'form-control',
                                value: item.color,
                                onInput: this.onColor.bind(this, i)
                            })
                        ]),
                        h('div', { class: 'input-group d-flex mb-2' }, [
                            h('div', { class: 'input-group-prepend w-50' }, [
                                h('span', { class: 'input-group-text w-100' }, 'Alpha')
                            ]),
                            h('input', {
                                type: 'range',
                                step: 0.01,
                                min: 0,
                                max: 1,
                                class: 'custom-range w-50 bg-white rounded-right border px-2',
                                value: item.alpha,
                                onInput: this.onAlpha.bind(this, i)
                            })
                        ]),
                        h('div', { class: 'input-group d-flex' }, [
                            h('div', { class: 'input-group-prepend w-50' }, [
                                h('span', { class: 'input-group-text w-100' }, 'Stop')
                            ]),
                            h('input', {
                                type: 'range',
                                step: 0.01,
                                min: 0,
                                max: 1,
                                class: 'custom-range w-50 bg-white rounded-right border px-2',
                                value: item.stop,
                                onInput: this.onStop.bind(this, i)
                            })
                        ])
                    ]);
                })), [
                    h('button', {
                        class: 'btn mx-auto d-block btn-primary',
                        onClick: this.onAdd.bind(this)
                    }, 'Add Color')
                ]),
                h('div', { class: 'col-sm-4'}, [
                    h('button', {
                        class: 'btn btn-sm btn-secondary float-right px-3',
                        onClick: () => {
                            this.copy(this.imageOutput.innerHTML);
                        }
                    }, 'Copy'),
                    h('h2', { class: 'mb-2' }, 'Base64 Image'),
                    h('textarea', {
                        spellcheck: false,
                        class: 'form-control output mb-4',
                        ref: this.refImage.bind(this)
                    }),
                    h('hr'),
                    h('button', {
                        class: 'btn btn-sm btn-secondary float-right px-3',
                        onClick: () => {
                            this.copy(this.codeOutput.innerHTML);
                        }
                    }, 'Copy'),
                    h('h2', { class: 'mb-2' }, 'Gradient Code'),
                    h('code', {
                        class: 'code-output d-block border bg-white rounded p-2',
                        ref: this.refCode.bind(this)
                    })
                ])
            ])
        );
    }
}

App.SIZES = [4,8,16,32,64,128,256];
App.DEFAULT_SIZE = 128;

render(h(App), document.body);