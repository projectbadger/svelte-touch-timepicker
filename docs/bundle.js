
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Switcher.svelte generated by Svelte v3.19.2 */
    const file = "src/Switcher.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (152:3) {#each data as item }
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*item*/ ctx[16] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-1w8zh06");
    			add_location(li, file, 152, 5, 3446);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t_value !== (t_value = /*item*/ ctx[16] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(152:3) {#each data as item }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let ul;
    	let dispose;
    	let each_value = /*data*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "touch-date-container svelte-1w8zh06");
    			add_location(ul, file, 150, 2, 3358);
    			attr_dev(div, "class", "touch-date-wrapper svelte-1w8zh06");
    			add_location(div, file, 149, 0, 3249);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			/*ul_binding*/ ctx[15](ul);

    			dispose = [
    				listen_dev(div, "mousedown", /*onMouseDown*/ ctx[2], false, false, false),
    				listen_dev(div, "touchstart", /*onMouseDown*/ ctx[2], false, false, false),
    				listen_dev(div, "wheel", /*onWheel*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 1) {
    				each_value = /*data*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			/*ul_binding*/ ctx[15](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { selected } = $$props;
    	let { data = 0 } = $$props;
    	let { type } = $$props;
    	let position = selected ? -(selected - 1) * 50 : 0;
    	let offset = 0;
    	let dragging = false;
    	let itemWrapper, previousY;

    	onMount(() => {
    		setPosition();
    	});

    	afterUpdate(() => {
    		let selectedPosition = -(selected - 1) * 50;

    		if (!dragging && position !== selectedPosition) {
    			position = selectedPosition;
    			setPosition();
    		}
    	});

    	function onDateChange(type, changedData) {
    		dispatch("dateChange", { type, changedData });
    	}

    	function setPosition() {
    		let itemPosition = `
      will-change: 'transform';
      transition: transform ${Math.abs(offset) / 100 + 0.1}s;
      transform: translateY(${position}px)
    `;

    		$$invalidate(1, itemWrapper.style.cssText = itemPosition, itemWrapper);
    	}

    	let onMouseDown = event => {
    		previousY = event.touches ? event.touches[0].clientY : event.clientY;
    		dragging = true;
    		window.addEventListener("mousemove", onMouseMove);
    		window.addEventListener("mouseup", onMouseUp);
    		window.addEventListener("touchmove", onMouseMove);
    		window.addEventListener("touchend", onMouseUp);
    	};

    	let onMouseMove = event => {
    		let clientY = event.touches ? event.touches[0].clientY : event.clientY;
    		offset = clientY - previousY;
    		let maxPosition = -data.length * 50;
    		let _position = position + offset;
    		position = Math.max(maxPosition, Math.min(50, _position));
    		previousY = event.touches ? event.touches[0].clientY : event.clientY;
    		setPosition();
    	};

    	let onMouseUp = () => {
    		let maxPosition = -(data.length - 1) * 50;
    		let rounderPosition = Math.round((position + offset * 5) / 50) * 50;
    		let finalPosition = Math.max(maxPosition, Math.min(0, rounderPosition));
    		dragging = false;
    		position = finalPosition;
    		window.removeEventListener("mousemove", onMouseMove);
    		window.removeEventListener("mouseup", onMouseUp);
    		window.removeEventListener("touchmove", onMouseMove);
    		window.removeEventListener("touchend", onMouseUp);
    		setPosition();
    		onDateChange(type, -finalPosition / 50);
    	};

    	let onWheel = e => {
    		if (e.deltaY < 0) {
    			position = position - 50;
    		}

    		if (e.deltaY > 0) {
    			position = position + 50;
    		}

    		onMouseUp();
    	};

    	const writable_props = ["selected", "data", "type"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Switcher> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Switcher", $$slots, []);

    	function ul_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, itemWrapper = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("selected" in $$props) $$invalidate(4, selected = $$props.selected);
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("type" in $$props) $$invalidate(5, type = $$props.type);
    	};

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		onMount,
    		createEventDispatcher,
    		dispatch,
    		selected,
    		data,
    		type,
    		position,
    		offset,
    		dragging,
    		itemWrapper,
    		previousY,
    		onDateChange,
    		setPosition,
    		onMouseDown,
    		onMouseMove,
    		onMouseUp,
    		onWheel
    	});

    	$$self.$inject_state = $$props => {
    		if ("selected" in $$props) $$invalidate(4, selected = $$props.selected);
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("type" in $$props) $$invalidate(5, type = $$props.type);
    		if ("position" in $$props) position = $$props.position;
    		if ("offset" in $$props) offset = $$props.offset;
    		if ("dragging" in $$props) dragging = $$props.dragging;
    		if ("itemWrapper" in $$props) $$invalidate(1, itemWrapper = $$props.itemWrapper);
    		if ("previousY" in $$props) previousY = $$props.previousY;
    		if ("onMouseDown" in $$props) $$invalidate(2, onMouseDown = $$props.onMouseDown);
    		if ("onMouseMove" in $$props) onMouseMove = $$props.onMouseMove;
    		if ("onMouseUp" in $$props) onMouseUp = $$props.onMouseUp;
    		if ("onWheel" in $$props) $$invalidate(3, onWheel = $$props.onWheel);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		data,
    		itemWrapper,
    		onMouseDown,
    		onWheel,
    		selected,
    		type,
    		position,
    		offset,
    		dragging,
    		previousY,
    		dispatch,
    		onDateChange,
    		setPosition,
    		onMouseMove,
    		onMouseUp,
    		ul_binding
    	];
    }

    class Switcher extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { selected: 4, data: 0, type: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Switcher",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*selected*/ ctx[4] === undefined && !("selected" in props)) {
    			console.warn("<Switcher> was created without expected prop 'selected'");
    		}

    		if (/*type*/ ctx[5] === undefined && !("type" in props)) {
    			console.warn("<Switcher> was created without expected prop 'type'");
    		}
    	}

    	get selected() {
    		throw new Error("<Switcher>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<Switcher>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Switcher>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Switcher>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Switcher>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Switcher>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/DatePicker.svelte generated by Svelte v3.19.2 */
    const file$1 = "src/DatePicker.svelte";

    // (123:0) {#if visible}
    function create_if_block(ctx) {
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let t0_value = /*date*/ ctx[0].getDate() + "";
    	let t0;
    	let t1;
    	let t2_value = /*MONTHS*/ ctx[6][/*date*/ ctx[0].getMonth()] + "";
    	let t2;
    	let t3;
    	let t4_value = /*date*/ ctx[0].getFullYear() + "";
    	let t4;
    	let t5;
    	let p;
    	let t6_value = /*WEEKDAY*/ ctx[8][/*date*/ ctx[0].getDay()] + "";
    	let t6;
    	let t7;
    	let div1;
    	let t8;
    	let t9;
    	let t10;
    	let div2;
    	let button0;
    	let t12;
    	let button1;
    	let current;
    	let dispose;

    	const switcher0 = new Switcher({
    			props: {
    				type: "day",
    				data: /*DAYS*/ ctx[5],
    				selected: /*date*/ ctx[0].getDate()
    			},
    			$$inline: true
    		});

    	switcher0.$on("dateChange", /*dateChanged*/ ctx[10]);

    	const switcher1 = new Switcher({
    			props: {
    				type: "month",
    				data: /*MONTHS*/ ctx[6],
    				selected: /*date*/ ctx[0].getMonth() + 1
    			},
    			$$inline: true
    		});

    	switcher1.$on("dateChange", /*dateChanged*/ ctx[10]);

    	const switcher2 = new Switcher({
    			props: {
    				type: "year",
    				data: /*YEARS*/ ctx[7],
    				selected: /*date*/ ctx[0].getYear() + 1
    			},
    			$$inline: true
    		});

    	switcher2.$on("dateChange", /*dateChanged*/ ctx[10]);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			p = element("p");
    			t6 = text(t6_value);
    			t7 = space();
    			div1 = element("div");
    			create_component(switcher0.$$.fragment);
    			t8 = space();
    			create_component(switcher1.$$.fragment);
    			t9 = space();
    			create_component(switcher2.$$.fragment);
    			t10 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "Reset";
    			t12 = space();
    			button1 = element("button");
    			button1.textContent = "Ok";
    			attr_dev(div0, "class", "date-line svelte-1gfjl4n");
    			add_location(div0, file$1, 126, 8, 3323);
    			attr_dev(p, "class", "day-line svelte-1gfjl4n");
    			add_location(p, file$1, 127, 8, 3430);
    			attr_dev(div1, "class", "touch-date-picker svelte-1gfjl4n");
    			add_location(div1, file$1, 128, 8, 3489);
    			attr_dev(button0, "class", "svelte-1gfjl4n");
    			add_location(button0, file$1, 134, 10, 3897);
    			attr_dev(button1, "class", "svelte-1gfjl4n");
    			add_location(button1, file$1, 135, 10, 3967);
    			attr_dev(div2, "class", "touch-date-reset svelte-1gfjl4n");
    			add_location(div2, file$1, 133, 8, 3856);
    			attr_dev(div3, "class", "touch-date-wrapper svelte-1gfjl4n");
    			add_location(div3, file$1, 125, 6, 3282);
    			attr_dev(div4, "class", "svelte-1gfjl4n");
    			add_location(div4, file$1, 124, 4, 3270);
    			attr_dev(div5, "class", "touch-date-popup svelte-1gfjl4n");
    			add_location(div5, file$1, 123, 2, 3191);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, t4);
    			append_dev(div3, t5);
    			append_dev(div3, p);
    			append_dev(p, t6);
    			append_dev(div3, t7);
    			append_dev(div3, div1);
    			mount_component(switcher0, div1, null);
    			append_dev(div1, t8);
    			mount_component(switcher1, div1, null);
    			append_dev(div1, t9);
    			mount_component(switcher2, div1, null);
    			append_dev(div3, t10);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t12);
    			append_dev(div2, button1);
    			/*div5_binding*/ ctx[17](div5);
    			current = true;

    			dispose = [
    				listen_dev(button0, "click", stop_propagation(/*resetDate*/ ctx[9]), false, false, true),
    				listen_dev(button1, "click", stop_propagation(/*confirmDate*/ ctx[11]), false, false, true),
    				listen_dev(div5, "click", /*clickedOutside*/ ctx[12], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*date*/ 1) && t0_value !== (t0_value = /*date*/ ctx[0].getDate() + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*date*/ 1) && t2_value !== (t2_value = /*MONTHS*/ ctx[6][/*date*/ ctx[0].getMonth()] + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*date*/ 1) && t4_value !== (t4_value = /*date*/ ctx[0].getFullYear() + "")) set_data_dev(t4, t4_value);
    			if ((!current || dirty & /*date*/ 1) && t6_value !== (t6_value = /*WEEKDAY*/ ctx[8][/*date*/ ctx[0].getDay()] + "")) set_data_dev(t6, t6_value);
    			const switcher0_changes = {};
    			if (dirty & /*DAYS*/ 32) switcher0_changes.data = /*DAYS*/ ctx[5];
    			if (dirty & /*date*/ 1) switcher0_changes.selected = /*date*/ ctx[0].getDate();
    			switcher0.$set(switcher0_changes);
    			const switcher1_changes = {};
    			if (dirty & /*date*/ 1) switcher1_changes.selected = /*date*/ ctx[0].getMonth() + 1;
    			switcher1.$set(switcher1_changes);
    			const switcher2_changes = {};
    			if (dirty & /*date*/ 1) switcher2_changes.selected = /*date*/ ctx[0].getYear() + 1;
    			switcher2.$set(switcher2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(switcher0.$$.fragment, local);
    			transition_in(switcher1.$$.fragment, local);
    			transition_in(switcher2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(switcher0.$$.fragment, local);
    			transition_out(switcher1.$$.fragment, local);
    			transition_out(switcher2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(switcher0);
    			destroy_component(switcher1);
    			destroy_component(switcher2);
    			/*div5_binding*/ ctx[17](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(123:0) {#if visible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let input;
    	let input_class_value;
    	let t;
    	let if_block_anchor;
    	let current;
    	let dispose;
    	let if_block = /*visible*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", input_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-1gfjl4n"));
    			input.readOnly = true;
    			input.value = /*_date*/ ctx[3];
    			add_location(input, file$1, 121, 0, 3076);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    			dispose = listen_dev(input, "focus", /*focus_handler*/ ctx[16], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*classes*/ 4 && input_class_value !== (input_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-1gfjl4n"))) {
    				attr_dev(input, "class", input_class_value);
    			}

    			if (!current || dirty & /*_date*/ 8 && input.value !== /*_date*/ ctx[3]) {
    				prop_dev(input, "value", /*_date*/ ctx[3]);
    			}

    			if (/*visible*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { date = new Date() } = $$props;
    	let { visible = false } = $$props;
    	let { years_map = [1900, 2100] } = $$props;
    	let { classes = "" } = $$props;
    	let years_count = years_map[1] - years_map[0] + 1;

    	const MONTHS = [
    		"Jan",
    		"Feb",
    		"Mar",
    		"Apr",
    		"May",
    		"Jun",
    		"July",
    		"Aug",
    		"Sept",
    		"Oct",
    		"Nov",
    		"Dec"
    	];

    	const YEARS = new Array(years_count).fill(years_map[0]).map((v, i) => v + i);
    	const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    	const dispatch = createEventDispatcher();
    	let _date, popup;

    	let resetDate = () => {
    		$$invalidate(0, date = new Date());
    	};

    	let dateChanged = event => {
    		let { type, changedData } = event.detail;
    		let newDate = new Date();

    		if (type === "day") {
    			newDate = new Date(date.getFullYear(), date.getMonth(), changedData + 1);
    		} else if (type === "month") {
    			let maxDayInSelectedMonth = new Date(date.getFullYear(), changedData + 1, 0).getDate();
    			let day = Math.min(date.getDate(), maxDayInSelectedMonth);
    			newDate = new Date(date.getFullYear(), changedData, day);
    		} else if (type === "year") {
    			let maxDayInSelectedMonth = new Date(years_map[1] + changedData, date.getMonth() + 1, 0).getDate();
    			let day = Math.min(date.getDate(), maxDayInSelectedMonth);
    			newDate = new Date(1900 + changedData, date.getMonth(), day);
    		}

    		$$invalidate(0, date = newDate);
    		dispatch("dateChange", { date });
    	};

    	function confirmDate(event) {
    		$$invalidate(1, visible = !visible);
    		dispatch("confirmDate", { MouseEvent: event, date });
    	}

    	function clickedOutside(event) {
    		if (event.target == popup) {
    			$$invalidate(1, visible = false);
    		}
    	}

    	const writable_props = ["date", "visible", "years_map", "classes"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DatePicker> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("DatePicker", $$slots, []);

    	const focus_handler = () => {
    		$$invalidate(1, visible = !visible);
    	};

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, popup = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    		if ("years_map" in $$props) $$invalidate(13, years_map = $$props.years_map);
    		if ("classes" in $$props) $$invalidate(2, classes = $$props.classes);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Switcher,
    		date,
    		visible,
    		years_map,
    		classes,
    		years_count,
    		MONTHS,
    		YEARS,
    		WEEKDAY,
    		dispatch,
    		_date,
    		popup,
    		resetDate,
    		dateChanged,
    		confirmDate,
    		clickedOutside,
    		DAYS
    	});

    	$$self.$inject_state = $$props => {
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    		if ("years_map" in $$props) $$invalidate(13, years_map = $$props.years_map);
    		if ("classes" in $$props) $$invalidate(2, classes = $$props.classes);
    		if ("years_count" in $$props) years_count = $$props.years_count;
    		if ("_date" in $$props) $$invalidate(3, _date = $$props._date);
    		if ("popup" in $$props) $$invalidate(4, popup = $$props.popup);
    		if ("resetDate" in $$props) $$invalidate(9, resetDate = $$props.resetDate);
    		if ("dateChanged" in $$props) $$invalidate(10, dateChanged = $$props.dateChanged);
    		if ("DAYS" in $$props) $$invalidate(5, DAYS = $$props.DAYS);
    	};

    	let DAYS;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*date*/ 1) {
    			 $$invalidate(5, DAYS = new Array(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()).fill(1).map((v, i) => v + i));
    		}

    		if ($$self.$$.dirty & /*date*/ 1) {
    			 $$invalidate(3, _date = date.toLocaleDateString("en-US"));
    		}
    	};

    	return [
    		date,
    		visible,
    		classes,
    		_date,
    		popup,
    		DAYS,
    		MONTHS,
    		YEARS,
    		WEEKDAY,
    		resetDate,
    		dateChanged,
    		confirmDate,
    		clickedOutside,
    		years_map,
    		years_count,
    		dispatch,
    		focus_handler,
    		div5_binding
    	];
    }

    class DatePicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			date: 0,
    			visible: 1,
    			years_map: 13,
    			classes: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DatePicker",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get date() {
    		throw new Error("<DatePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set date(value) {
    		throw new Error("<DatePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visible() {
    		throw new Error("<DatePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visible(value) {
    		throw new Error("<DatePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get years_map() {
    		throw new Error("<DatePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set years_map(value) {
    		throw new Error("<DatePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classes() {
    		throw new Error("<DatePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classes(value) {
    		throw new Error("<DatePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/TimePicker.svelte generated by Svelte v3.19.2 */

    const { console: console_1 } = globals;
    const file$2 = "src/TimePicker.svelte";

    // (134:0) {#if visible}
    function create_if_block$1(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let div1;
    	let button0;
    	let t5;
    	let button1;
    	let current;
    	let dispose;

    	const switcher0 = new Switcher({
    			props: {
    				type: "hour",
    				data: /*HOURS*/ ctx[6],
    				selected: /*display24*/ ctx[3]
    				? /*date*/ ctx[0].getHours() + 1
    				: /*date*/ ctx[0].getHours() % 12 + 1
    			},
    			$$inline: true
    		});

    	switcher0.$on("dateChange", /*dateChanged*/ ctx[10]);

    	const switcher1 = new Switcher({
    			props: {
    				type: "minute",
    				data: /*MINUTES*/ ctx[7],
    				selected: /*date*/ ctx[0].getMinutes() + 1
    			},
    			$$inline: true
    		});

    	switcher1.$on("dateChange", /*dateChanged*/ ctx[10]);

    	const switcher2 = new Switcher({
    			props: {
    				type: "second",
    				data: /*SECONDS*/ ctx[8],
    				selected: /*date*/ ctx[0].getSeconds() + 1
    			},
    			$$inline: true
    		});

    	switcher2.$on("dateChange", /*dateChanged*/ ctx[10]);
    	let if_block = !/*display24*/ ctx[3] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			create_component(switcher0.$$.fragment);
    			t0 = space();
    			create_component(switcher1.$$.fragment);
    			t1 = space();
    			create_component(switcher2.$$.fragment);
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Reset";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "Ok";
    			attr_dev(div0, "class", "touch-date-picker svelte-1gfjl4n");
    			add_location(div0, file$2, 137, 8, 3978);
    			attr_dev(button0, "class", "svelte-1gfjl4n");
    			add_location(button0, file$2, 146, 10, 4589);
    			attr_dev(button1, "class", "svelte-1gfjl4n");
    			add_location(button1, file$2, 147, 10, 4659);
    			attr_dev(div1, "class", "touch-date-reset svelte-1gfjl4n");
    			add_location(div1, file$2, 145, 8, 4548);
    			attr_dev(div2, "class", "touch-date-wrapper svelte-1gfjl4n");
    			add_location(div2, file$2, 136, 6, 3937);
    			attr_dev(div3, "class", "svelte-1gfjl4n");
    			add_location(div3, file$2, 135, 4, 3925);
    			attr_dev(div4, "class", "touch-date-popup svelte-1gfjl4n");
    			add_location(div4, file$2, 134, 2, 3846);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			mount_component(switcher0, div0, null);
    			append_dev(div0, t0);
    			mount_component(switcher1, div0, null);
    			append_dev(div0, t1);
    			mount_component(switcher2, div0, null);
    			append_dev(div0, t2);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t5);
    			append_dev(div1, button1);
    			/*div4_binding*/ ctx[16](div4);
    			current = true;

    			dispose = [
    				listen_dev(button0, "click", stop_propagation(/*resetDate*/ ctx[9]), false, false, true),
    				listen_dev(button1, "click", stop_propagation(/*confirmDate*/ ctx[11]), false, false, true),
    				listen_dev(div4, "click", /*clickedOutside*/ ctx[12], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			const switcher0_changes = {};

    			if (dirty & /*display24, date*/ 9) switcher0_changes.selected = /*display24*/ ctx[3]
    			? /*date*/ ctx[0].getHours() + 1
    			: /*date*/ ctx[0].getHours() % 12 + 1;

    			switcher0.$set(switcher0_changes);
    			const switcher1_changes = {};
    			if (dirty & /*date*/ 1) switcher1_changes.selected = /*date*/ ctx[0].getMinutes() + 1;
    			switcher1.$set(switcher1_changes);
    			const switcher2_changes = {};
    			if (dirty & /*date*/ 1) switcher2_changes.selected = /*date*/ ctx[0].getSeconds() + 1;
    			switcher2.$set(switcher2_changes);

    			if (!/*display24*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(switcher0.$$.fragment, local);
    			transition_in(switcher1.$$.fragment, local);
    			transition_in(switcher2.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(switcher0.$$.fragment, local);
    			transition_out(switcher1.$$.fragment, local);
    			transition_out(switcher2.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(switcher0);
    			destroy_component(switcher1);
    			destroy_component(switcher2);
    			if (if_block) if_block.d();
    			/*div4_binding*/ ctx[16](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(134:0) {#if visible}",
    		ctx
    	});

    	return block;
    }

    // (142:10) {#if !display24}
    function create_if_block_1(ctx) {
    	let current;

    	const switcher = new Switcher({
    			props: {
    				type: "am/pm",
    				data: ["am", "pm"],
    				selected: /*date*/ ctx[0].getHours() < 12 ? 1 : 2
    			},
    			$$inline: true
    		});

    	switcher.$on("dateChange", /*dateChanged*/ ctx[10]);

    	const block = {
    		c: function create() {
    			create_component(switcher.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(switcher, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switcher_changes = {};
    			if (dirty & /*date*/ 1) switcher_changes.selected = /*date*/ ctx[0].getHours() < 12 ? 1 : 2;
    			switcher.$set(switcher_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(switcher.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(switcher.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(switcher, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(142:10) {#if !display24}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let input;
    	let input_class_value;
    	let t;
    	let if_block_anchor;
    	let current;
    	let dispose;
    	let if_block = /*visible*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", input_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-1gfjl4n"));
    			input.readOnly = true;
    			input.value = /*_date*/ ctx[4];
    			add_location(input, file$2, 132, 0, 3731);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    			dispose = listen_dev(input, "focus", /*focus_handler*/ ctx[15], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*classes*/ 4 && input_class_value !== (input_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-1gfjl4n"))) {
    				attr_dev(input, "class", input_class_value);
    			}

    			if (!current || dirty & /*_date*/ 16 && input.value !== /*_date*/ ctx[4]) {
    				prop_dev(input, "value", /*_date*/ ctx[4]);
    			}

    			if (/*visible*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { date = new Date() } = $$props;
    	let { visible = false } = $$props;
    	let { classes = "" } = $$props;
    	let { display24 = false } = $$props;
    	const HOURS = new Array(display24 ? 24 : 12).fill(0).map((v, i) => v + i);
    	const MINUTES = new Array(60).fill(0).map((v, i) => v + i);
    	const SECONDS = new Array(60).fill(0).map((v, i) => v + i);
    	const dispatch = createEventDispatcher();
    	let _date, popup;

    	let resetDate = () => {
    		$$invalidate(0, date = new Date());
    	};

    	let dateChanged = event => {
    		console.log("changed data:", event.detail);
    		let { type, changedData } = event.detail;
    		let newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());

    		switch (type) {
    			case "hour":
    				if (!display24 && date.getHours() >= 12) {
    					changedData += 12;
    				}
    				newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), changedData, date.getMinutes(), date.getSeconds());
    				break;
    			case "minute":
    				newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), changedData, date.getSeconds());
    				break;
    			case "second":
    				newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), changedData);
    				break;
    			case "am/pm":
    				if (changedData === 0 && date.getHours() >= 12) {
    					newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() - 12, date.getMinutes(), date.getSeconds());
    				} else if (changedData === 1 && date.getHours() < 12) {
    					newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() + 12, date.getMinutes(), date.getSeconds());
    				}
    				break;
    		}

    		$$invalidate(0, date = newDate);
    		dispatch("dateChange", { date });
    	};

    	function confirmDate(event) {
    		$$invalidate(1, visible = !visible);
    		dispatch("confirmDate", { MouseEvent: event, date });
    	}

    	function clickedOutside(event) {
    		if (event.target == popup) {
    			// If the click target contains popup,
    			// the click has been made outside.
    			console.log("click event:", event);

    			// if(event.target.querySelector('.touch-date-popup')) {
    			console.log("setting visibility to false");

    			$$invalidate(1, visible = false);
    		}
    	}

    	const writable_props = ["date", "visible", "classes", "display24"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<TimePicker> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("TimePicker", $$slots, []);

    	const focus_handler = () => {
    		$$invalidate(1, visible = !visible);
    	};

    	function div4_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, popup = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    		if ("classes" in $$props) $$invalidate(2, classes = $$props.classes);
    		if ("display24" in $$props) $$invalidate(3, display24 = $$props.display24);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Switcher,
    		date,
    		visible,
    		classes,
    		display24,
    		HOURS,
    		MINUTES,
    		SECONDS,
    		dispatch,
    		_date,
    		popup,
    		resetDate,
    		dateChanged,
    		confirmDate,
    		clickedOutside,
    		DAYS
    	});

    	$$self.$inject_state = $$props => {
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    		if ("classes" in $$props) $$invalidate(2, classes = $$props.classes);
    		if ("display24" in $$props) $$invalidate(3, display24 = $$props.display24);
    		if ("_date" in $$props) $$invalidate(4, _date = $$props._date);
    		if ("popup" in $$props) $$invalidate(5, popup = $$props.popup);
    		if ("resetDate" in $$props) $$invalidate(9, resetDate = $$props.resetDate);
    		if ("dateChanged" in $$props) $$invalidate(10, dateChanged = $$props.dateChanged);
    		if ("DAYS" in $$props) DAYS = $$props.DAYS;
    	};

    	let DAYS;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*date*/ 1) {
    			 DAYS = new Array(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()).fill(1).map((v, i) => v + i);
    		}

    		if ($$self.$$.dirty & /*date*/ 1) {
    			 $$invalidate(4, _date = date.toLocaleDateString("en-US"));
    		}
    	};

    	return [
    		date,
    		visible,
    		classes,
    		display24,
    		_date,
    		popup,
    		HOURS,
    		MINUTES,
    		SECONDS,
    		resetDate,
    		dateChanged,
    		confirmDate,
    		clickedOutside,
    		DAYS,
    		dispatch,
    		focus_handler,
    		div4_binding
    	];
    }

    class TimePicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			date: 0,
    			visible: 1,
    			classes: 2,
    			display24: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TimePicker",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get date() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set date(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visible() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visible(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classes() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classes(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get display24() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set display24(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* dev/App.svelte generated by Svelte v3.19.2 */

    const { console: console_1$1 } = globals;
    const file$3 = "dev/App.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let updating_date;
    	let t3;
    	let div1;
    	let p1;
    	let t4;
    	let t5;
    	let t6;
    	let updating_date_1;
    	let current;

    	function datepicker_date_binding(value) {
    		/*datepicker_date_binding*/ ctx[2].call(null, value);
    	}

    	let datepicker_props = {};

    	if (/*date*/ ctx[0] !== void 0) {
    		datepicker_props.date = /*date*/ ctx[0];
    	}

    	const datepicker = new DatePicker({ props: datepicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(datepicker, "date", datepicker_date_binding));
    	datepicker.$on("dateChange", dateChanged);
    	datepicker.$on("confirmDate", confirmDate);

    	function timepicker_date_binding(value) {
    		/*timepicker_date_binding*/ ctx[3].call(null, value);
    	}

    	let timepicker_props = {};

    	if (/*date*/ ctx[0] !== void 0) {
    		timepicker_props.date = /*date*/ ctx[0];
    	}

    	const timepicker = new TimePicker({ props: timepicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(timepicker, "date", timepicker_date_binding));
    	timepicker.$on("dateChange", dateChanged);
    	timepicker.$on("confirmDate", confirmDate);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("Date: ");
    			t1 = text(/*_date*/ ctx[1]);
    			t2 = space();
    			create_component(datepicker.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t4 = text("Time: ");
    			t5 = text(/*_date*/ ctx[1]);
    			t6 = space();
    			create_component(timepicker.$$.fragment);
    			add_location(p0, file$3, 17, 4, 338);
    			attr_dev(div0, "class", "center svelte-1lvh7p6");
    			add_location(div0, file$3, 16, 2, 313);
    			add_location(p1, file$3, 25, 4, 503);
    			attr_dev(div1, "class", "center svelte-1lvh7p6");
    			add_location(div1, file$3, 24, 2, 478);
    			attr_dev(div2, "class", "container svelte-1lvh7p6");
    			add_location(div2, file$3, 15, 0, 287);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(div0, t2);
    			mount_component(datepicker, div0, null);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t4);
    			append_dev(p1, t5);
    			append_dev(div1, t6);
    			mount_component(timepicker, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*_date*/ 2) set_data_dev(t1, /*_date*/ ctx[1]);
    			const datepicker_changes = {};

    			if (!updating_date && dirty & /*date*/ 1) {
    				updating_date = true;
    				datepicker_changes.date = /*date*/ ctx[0];
    				add_flush_callback(() => updating_date = false);
    			}

    			datepicker.$set(datepicker_changes);
    			if (!current || dirty & /*_date*/ 2) set_data_dev(t5, /*_date*/ ctx[1]);
    			const timepicker_changes = {};

    			if (!updating_date_1 && dirty & /*date*/ 1) {
    				updating_date_1 = true;
    				timepicker_changes.date = /*date*/ ctx[0];
    				add_flush_callback(() => updating_date_1 = false);
    			}

    			timepicker.$set(timepicker_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(datepicker.$$.fragment, local);
    			transition_in(timepicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(datepicker.$$.fragment, local);
    			transition_out(timepicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(datepicker);
    			destroy_component(timepicker);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function dateChanged(event) {
    	console.log(event.detail);
    }

    function confirmDate(event) {
    	console.log(event.detail);
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let date = new Date();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function datepicker_date_binding(value) {
    		date = value;
    		$$invalidate(0, date);
    	}

    	function timepicker_date_binding(value) {
    		date = value;
    		$$invalidate(0, date);
    	}

    	$$self.$capture_state = () => ({
    		DatePicker,
    		TimePicker,
    		date,
    		dateChanged,
    		confirmDate,
    		_date
    	});

    	$$self.$inject_state = $$props => {
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("_date" in $$props) $$invalidate(1, _date = $$props._date);
    	};

    	let _date;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*date*/ 1) {
    			 $$invalidate(1, _date = date.toLocaleDateString("en-US"));
    		}
    	};

    	return [date, _date, datepicker_date_binding, timepicker_date_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
