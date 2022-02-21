
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Question.svelte generated by Svelte v3.46.4 */

    const file$5 = "src/components/Question.svelte";

    function create_fragment$5(ctx) {
    	let main;
    	let h1;
    	let t;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t = text(/*questionText*/ ctx[0]);
    			add_location(h1, file$5, 12, 4, 82);
    			add_location(main, file$5, 10, 0, 70);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*questionText*/ 1) set_data_dev(t, /*questionText*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Question', slots, []);
    	let { questionText } = $$props;
    	const writable_props = ['questionText'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Question> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('questionText' in $$props) $$invalidate(0, questionText = $$props.questionText);
    	};

    	$$self.$capture_state = () => ({ questionText });

    	$$self.$inject_state = $$props => {
    		if ('questionText' in $$props) $$invalidate(0, questionText = $$props.questionText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [questionText];
    }

    class Question extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { questionText: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Question",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*questionText*/ ctx[0] === undefined && !('questionText' in props)) {
    			console.warn("<Question> was created without expected prop 'questionText'");
    		}
    	}

    	get questionText() {
    		throw new Error("<Question>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set questionText(value) {
    		throw new Error("<Question>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Answer.svelte generated by Svelte v3.46.4 */

    const file$4 = "src/components/Answer.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			button = element("button");
    			t = text(/*answerText*/ ctx[0]);
    			attr_dev(button, "class", "svelte-t1jpze");
    			add_location(button, file$4, 25, 4, 327);
    			add_location(main, file$4, 23, 0, 315);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*answerText*/ 1) set_data_dev(t, /*answerText*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Answer', slots, []);
    	let { answerText } = $$props;
    	let { checkAnswerHandler } = $$props;
    	const writable_props = ['answerText', 'checkAnswerHandler'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Answer> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => checkAnswerHandler(answerText);

    	$$self.$$set = $$props => {
    		if ('answerText' in $$props) $$invalidate(0, answerText = $$props.answerText);
    		if ('checkAnswerHandler' in $$props) $$invalidate(1, checkAnswerHandler = $$props.checkAnswerHandler);
    	};

    	$$self.$capture_state = () => ({ answerText, checkAnswerHandler });

    	$$self.$inject_state = $$props => {
    		if ('answerText' in $$props) $$invalidate(0, answerText = $$props.answerText);
    		if ('checkAnswerHandler' in $$props) $$invalidate(1, checkAnswerHandler = $$props.checkAnswerHandler);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [answerText, checkAnswerHandler, click_handler];
    }

    class Answer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { answerText: 0, checkAnswerHandler: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Answer",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*answerText*/ ctx[0] === undefined && !('answerText' in props)) {
    			console.warn("<Answer> was created without expected prop 'answerText'");
    		}

    		if (/*checkAnswerHandler*/ ctx[1] === undefined && !('checkAnswerHandler' in props)) {
    			console.warn("<Answer> was created without expected prop 'checkAnswerHandler'");
    		}
    	}

    	get answerText() {
    		throw new Error("<Answer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set answerText(value) {
    		throw new Error("<Answer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get checkAnswerHandler() {
    		throw new Error("<Answer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checkAnswerHandler(value) {
    		throw new Error("<Answer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Points.svelte generated by Svelte v3.46.4 */

    const file$3 = "src/components/Points.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			t = text(/*points*/ ctx[0]);
    			attr_dev(div, "class", "Points svelte-37s3ct");
    			add_location(div, file$3, 21, 4, 266);
    			add_location(main, file$3, 19, 0, 254);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*points*/ 1) set_data_dev(t, /*points*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Points', slots, []);
    	let { points } = $$props;
    	const writable_props = ['points'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Points> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('points' in $$props) $$invalidate(0, points = $$props.points);
    	};

    	$$self.$capture_state = () => ({ points });

    	$$self.$inject_state = $$props => {
    		if ('points' in $$props) $$invalidate(0, points = $$props.points);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [points];
    }

    class Points extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { points: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Points",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*points*/ ctx[0] === undefined && !('points' in props)) {
    			console.warn("<Points> was created without expected prop 'points'");
    		}
    	}

    	get points() {
    		throw new Error("<Points>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set points(value) {
    		throw new Error("<Points>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/WrongPoints.svelte generated by Svelte v3.46.4 */

    const file$2 = "src/components/WrongPoints.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			t = text(/*wrongpoints*/ ctx[0]);
    			attr_dev(div, "class", "wrongPoints svelte-gc6ifa");
    			add_location(div, file$2, 21, 4, 272);
    			add_location(main, file$2, 19, 0, 260);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*wrongpoints*/ 1) set_data_dev(t, /*wrongpoints*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WrongPoints', slots, []);
    	let { wrongpoints } = $$props;
    	const writable_props = ['wrongpoints'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WrongPoints> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('wrongpoints' in $$props) $$invalidate(0, wrongpoints = $$props.wrongpoints);
    	};

    	$$self.$capture_state = () => ({ wrongpoints });

    	$$self.$inject_state = $$props => {
    		if ('wrongpoints' in $$props) $$invalidate(0, wrongpoints = $$props.wrongpoints);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [wrongpoints];
    }

    class WrongPoints extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { wrongpoints: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WrongPoints",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*wrongpoints*/ ctx[0] === undefined && !('wrongpoints' in props)) {
    			console.warn("<WrongPoints> was created without expected prop 'wrongpoints'");
    		}
    	}

    	get wrongpoints() {
    		throw new Error("<WrongPoints>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wrongpoints(value) {
    		throw new Error("<WrongPoints>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Category.svelte generated by Svelte v3.46.4 */

    const file$1 = "src/components/Category.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let select;
    	let option0;
    	let t0;
    	let option1;
    	let t1;
    	let option2;
    	let t2;

    	const block = {
    		c: function create() {
    			main = element("main");
    			select = element("select");
    			option0 = element("option");
    			t0 = text(/*category*/ ctx[0]);
    			option1 = element("option");
    			t1 = text(/*category*/ ctx[0]);
    			option2 = element("option");
    			t2 = text(/*category*/ ctx[0]);
    			option0.__value = "Astro";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 15, 2, 92);
    			option1.__value = "Food";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 16, 2, 136);
    			option2.__value = "world";
    			option2.value = option2.__value;
    			add_location(option2, file$1, 17, 2, 179);
    			add_location(select, file$1, 14, 5, 81);
    			add_location(main, file$1, 12, 0, 68);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, select);
    			append_dev(select, option0);
    			append_dev(option0, t0);
    			append_dev(select, option1);
    			append_dev(option1, t1);
    			append_dev(select, option2);
    			append_dev(option2, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*category*/ 1) set_data_dev(t0, /*category*/ ctx[0]);
    			if (dirty & /*category*/ 1) set_data_dev(t1, /*category*/ ctx[0]);
    			if (dirty & /*category*/ 1) set_data_dev(t2, /*category*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Category', slots, []);
    	let { category } = $$props;
    	const writable_props = ['category'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Category> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('category' in $$props) $$invalidate(0, category = $$props.category);
    	};

    	$$self.$capture_state = () => ({ category });

    	$$self.$inject_state = $$props => {
    		if ('category' in $$props) $$invalidate(0, category = $$props.category);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [category];
    }

    class Category extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { category: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Category",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*category*/ ctx[0] === undefined && !('category' in props)) {
    			console.warn("<Category> was created without expected prop 'category'");
    		}
    	}

    	get category() {
    		throw new Error("<Category>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set category(value) {
    		throw new Error("<Category>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.4 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let category_1;
    	let t0;
    	let h1;
    	let t2;
    	let p;
    	let t4;
    	let div0;
    	let points_1;
    	let t5;
    	let wrongpoints_1;
    	let t6;
    	let question;
    	let t7;
    	let div1;
    	let answer0;
    	let t8;
    	let answer1;
    	let current;

    	category_1 = new Category({
    			props: {
    				category: /*quiz*/ ctx[3][/*currentQuiz*/ ctx[2]].category
    			},
    			$$inline: true
    		});

    	points_1 = new Points({
    			props: { points: /*points*/ ctx[0] },
    			$$inline: true
    		});

    	wrongpoints_1 = new WrongPoints({
    			props: { wrongpoints: /*wrongpoints*/ ctx[1] },
    			$$inline: true
    		});

    	question = new Question({
    			props: {
    				questionText: /*quiz*/ ctx[3][/*currentQuiz*/ ctx[2]].question
    			},
    			$$inline: true
    		});

    	answer0 = new Answer({
    			props: {
    				answerText: /*quiz*/ ctx[3][/*currentQuiz*/ ctx[2]].answer[0],
    				checkAnswerHandler: /*checkAnswerHandler*/ ctx[4]
    			},
    			$$inline: true
    		});

    	answer1 = new Answer({
    			props: {
    				answerText: /*quiz*/ ctx[3][/*currentQuiz*/ ctx[2]].answer[1],
    				checkAnswerHandler: /*checkAnswerHandler*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(category_1.$$.fragment);
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Trivia Questions";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Answer True or False and test your knowledge. If get more than 5 correct, you are a pro";
    			t4 = space();
    			div0 = element("div");
    			create_component(points_1.$$.fragment);
    			t5 = space();
    			create_component(wrongpoints_1.$$.fragment);
    			t6 = space();
    			create_component(question.$$.fragment);
    			t7 = space();
    			div1 = element("div");
    			create_component(answer0.$$.fragment);
    			t8 = space();
    			create_component(answer1.$$.fragment);
    			attr_dev(h1, "class", "svelte-96gq8g");
    			add_location(h1, file, 123, 1, 1939);
    			add_location(p, file, 124, 1, 1966);
    			attr_dev(div0, "class", "points svelte-96gq8g");
    			add_location(div0, file, 126, 1, 2064);
    			attr_dev(div1, "class", "answers svelte-96gq8g");
    			add_location(div1, file, 132, 2, 2207);
    			attr_dev(main, "class", "svelte-96gq8g");
    			add_location(main, file, 118, 0, 1876);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(category_1, main, null);
    			append_dev(main, t0);
    			append_dev(main, h1);
    			append_dev(main, t2);
    			append_dev(main, p);
    			append_dev(main, t4);
    			append_dev(main, div0);
    			mount_component(points_1, div0, null);
    			append_dev(div0, t5);
    			mount_component(wrongpoints_1, div0, null);
    			append_dev(main, t6);
    			mount_component(question, main, null);
    			append_dev(main, t7);
    			append_dev(main, div1);
    			mount_component(answer0, div1, null);
    			append_dev(div1, t8);
    			mount_component(answer1, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const category_1_changes = {};
    			if (dirty & /*quiz, currentQuiz*/ 12) category_1_changes.category = /*quiz*/ ctx[3][/*currentQuiz*/ ctx[2]].category;
    			category_1.$set(category_1_changes);
    			const points_1_changes = {};
    			if (dirty & /*points*/ 1) points_1_changes.points = /*points*/ ctx[0];
    			points_1.$set(points_1_changes);
    			const wrongpoints_1_changes = {};
    			if (dirty & /*wrongpoints*/ 2) wrongpoints_1_changes.wrongpoints = /*wrongpoints*/ ctx[1];
    			wrongpoints_1.$set(wrongpoints_1_changes);
    			const question_changes = {};
    			if (dirty & /*quiz, currentQuiz*/ 12) question_changes.questionText = /*quiz*/ ctx[3][/*currentQuiz*/ ctx[2]].question;
    			question.$set(question_changes);
    			const answer0_changes = {};
    			if (dirty & /*quiz, currentQuiz*/ 12) answer0_changes.answerText = /*quiz*/ ctx[3][/*currentQuiz*/ ctx[2]].answer[0];
    			answer0.$set(answer0_changes);
    			const answer1_changes = {};
    			if (dirty & /*quiz, currentQuiz*/ 12) answer1_changes.answerText = /*quiz*/ ctx[3][/*currentQuiz*/ ctx[2]].answer[1];
    			answer1.$set(answer1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(category_1.$$.fragment, local);
    			transition_in(points_1.$$.fragment, local);
    			transition_in(wrongpoints_1.$$.fragment, local);
    			transition_in(question.$$.fragment, local);
    			transition_in(answer0.$$.fragment, local);
    			transition_in(answer1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(category_1.$$.fragment, local);
    			transition_out(points_1.$$.fragment, local);
    			transition_out(wrongpoints_1.$$.fragment, local);
    			transition_out(question.$$.fragment, local);
    			transition_out(answer0.$$.fragment, local);
    			transition_out(answer1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(category_1);
    			destroy_component(points_1);
    			destroy_component(wrongpoints_1);
    			destroy_component(question);
    			destroy_component(answer0);
    			destroy_component(answer1);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let points = 0;
    	let wrongpoints = 0;
    	let category = 0;
    	let currentQuiz = 0;

    	const quiz = [
    		{
    			id: 1,
    			category: 'Category 1',
    			question: 'A sneeze is faster than an eye blink?',
    			correctAnswer: 0,
    			answer: ['True', 'False']
    		},
    		{
    			id: 2,
    			category: 'Category 2',
    			question: 'Panda says OINK?',
    			correctAnswer: 1,
    			answer: ['True', 'False']
    		},
    		{
    			id: 3,
    			category: 'Category 3',
    			question: 'A sneeze is faster than cars on the freeway?',
    			correctAnswer: 0,
    			answer: ['True', 'False']
    		},
    		{
    			id: 4,
    			category: 'Category 1',
    			question: 'John F. Kennedy is on the $2 bill?',
    			correctAnswer: 1,
    			answer: ['True', 'False']
    		},
    		{
    			id: 5,
    			category: 'Category 2',
    			question: 'Olympic gold medal is made of silver?',
    			correctAnswer: 0,
    			answer: ['True', 'False']
    		},
    		{
    			id: 6,
    			category: 'Category 3',
    			question: 'Chocolate is lethal to dogs?',
    			correctAnswer: 0,
    			answer: ['Yes', 'No']
    		}
    	];

    	function checkAnswerHandler(answerText) {
    		const isCorrect = quiz[currentQuiz].answer.indexOf(answerText) === quiz[currentQuiz].correctAnswer;

    		if (isCorrect) {
    			$$invalidate(0, points += 1);
    			$$invalidate(3, quiz[currentQuiz].question = 'Correct!', quiz);
    		} else {
    			$$invalidate(1, wrongpoints += 1);
    			$$invalidate(3, quiz[currentQuiz].question = 'incorrect', quiz);
    		}

    		setTimeout(
    			function () {
    				$$invalidate(2, currentQuiz += 1);
    			},
    			1000
    		);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Question,
    		Answer,
    		Points,
    		WrongPoints,
    		Category,
    		points,
    		wrongpoints,
    		category,
    		currentQuiz,
    		quiz,
    		checkAnswerHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ('points' in $$props) $$invalidate(0, points = $$props.points);
    		if ('wrongpoints' in $$props) $$invalidate(1, wrongpoints = $$props.wrongpoints);
    		if ('category' in $$props) category = $$props.category;
    		if ('currentQuiz' in $$props) $$invalidate(2, currentQuiz = $$props.currentQuiz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [points, wrongpoints, currentQuiz, quiz, checkAnswerHandler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
