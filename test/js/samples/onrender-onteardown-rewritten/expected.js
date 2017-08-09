import { assign, callAll, dispatchObservers, noop, proto } from "svelte/shared.js";

var template = (function () {
	return {
		// this test should be removed in v2
		oncreate () {},
		ondestroy () {}
	};
}());

function create_main_fragment ( state, component ) {

	return {
		create: noop,

		mount: noop,

		unmount: noop,

		destroy: noop
	};
}

function SvelteComponent ( options ) {
	if ( !options || ( !options.target && !options._root ) ) throw new Error( "'target' is a required option" );
	this._state = options.data || {};

	this._observers = {
		pre: Object.create( null ),
		post: Object.create( null )
	};

	this._handlers = Object.create( null );
	this._handlers.destroy = [template.ondestroy]

	this._root = options._root || this;
	this._yield = options._yield;

	var oncreate = template.oncreate.bind( this );

	if ( !options._root ) {
		this._oncreate = [oncreate];
	} else {
	 	this._root._oncreate.push(oncreate);
	 }

	this._fragment = create_main_fragment( this._state, this );

	if ( options.target ) {
		this._fragment.create();
		this._fragment.mount( options.target, null );
	}

	if ( !options._root ) {
		callAll(this._oncreate);
	}
}

assign( SvelteComponent.prototype, proto );

SvelteComponent.prototype._set = function _set ( newState ) {
	var oldState = this._state;
	this._state = assign( {}, oldState, newState );
	dispatchObservers( this, this._observers.pre, newState, oldState );
	dispatchObservers( this, this._observers.post, newState, oldState );
};

export default SvelteComponent;